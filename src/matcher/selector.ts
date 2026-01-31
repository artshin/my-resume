/**
 * Content selection logic
 * Selects best projects, achievements, and skills for resume
 */

import type {
  NormalizedJob,
  JobRequirements,
  MatchConfig,
  ScoredProject,
  ScoredAchievement,
  ScoredSkill,
  SkillsData,
  Skill,
} from '../types/index.js';
import { DEFAULT_MATCH_CONFIG } from '../types/index.js';
import { scoreProject, scoreAchievement } from './scorers.js';
import { findMatchingSkills, isFeatured, isDeprecated, techMatches } from './technology-matcher.js';

/**
 * Select best projects from all jobs
 */
export function selectProjects(
  jobs: NormalizedJob[],
  requirements: JobRequirements,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): ScoredProject[] {
  const allProjects: ScoredProject[] = [];

  for (const job of jobs) {
    for (const project of job.projects) {
      const scored = scoreProject(project, requirements);
      allProjects.push(scored);
    }
  }

  // Sort by score descending
  allProjects.sort((a, b) => b.score - a.score);

  // Return within limits
  const count = Math.min(
    Math.max(config.minProjectsToShow, allProjects.filter((p) => p.score > 0.5).length),
    config.maxProjectsToShow
  );

  return allProjects.slice(0, count);
}

/**
 * Select best achievements from all jobs
 */
export function selectAchievements(
  jobs: NormalizedJob[],
  requirements: JobRequirements,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): ScoredAchievement[] {
  const allAchievements: ScoredAchievement[] = [];

  for (const job of jobs) {
    for (const achievement of job.achievements) {
      const scored = scoreAchievement(achievement, requirements);
      allAchievements.push(scored);
    }
  }

  // Sort by score descending
  allAchievements.sort((a, b) => b.score - a.score);

  // Return within limits
  const count = Math.min(
    Math.max(config.minAchievementsToShow, allAchievements.filter((a) => a.score > 0.5).length),
    config.maxAchievementsToShow
  );

  return allAchievements.slice(0, count);
}

/**
 * Select and prioritize skills based on requirements
 */
export function selectSkills(
  skills: SkillsData,
  requirements: JobRequirements,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): ScoredSkill[] {
  const { required, preferred, other } = findMatchingSkills(
    skills,
    requirements.requiredTechnologies,
    requirements.preferredTechnologies
  );

  const scoredSkills: ScoredSkill[] = [];

  // Score required skills (highest priority)
  for (const skill of required) {
    scoredSkills.push({
      ...skill,
      score: calculateSkillScore(skill, skills, true, false),
      isRequired: true,
      isPreferred: false,
    });
  }

  // Score preferred skills
  for (const skill of preferred) {
    scoredSkills.push({
      ...skill,
      score: calculateSkillScore(skill, skills, false, true),
      isRequired: false,
      isPreferred: true,
    });
  }

  // Score other relevant skills (featured, high level, want to use)
  for (const skill of other) {
    // Skip deprecated skills
    if (isDeprecated(skill.name, skills)) continue;

    // Only include if featured, expert level, or want to use
    if (isFeatured(skill.name, skills) || skill.level === 'expert' || skill.wantToUse) {
      scoredSkills.push({
        ...skill,
        score: calculateSkillScore(skill, skills, false, false),
        isRequired: false,
        isPreferred: false,
      });
    }
  }

  // Sort by score (required first, then by score)
  scoredSkills.sort((a, b) => {
    // Required always first
    if (a.isRequired && !b.isRequired) return -1;
    if (!a.isRequired && b.isRequired) return 1;

    // Then preferred
    if (a.isPreferred && !b.isPreferred) return -1;
    if (!a.isPreferred && b.isPreferred) return 1;

    // Then by score
    return b.score - a.score;
  });

  // Return within limits
  const count = Math.min(
    Math.max(config.minSkillsToShow, scoredSkills.filter((s) => s.isRequired || s.isPreferred).length),
    config.maxSkillsToShow
  );

  return scoredSkills.slice(0, count);
}

/**
 * Calculate individual skill score
 */
function calculateSkillScore(
  skill: Skill,
  skills: SkillsData,
  isRequired: boolean,
  isPreferred: boolean
): number {
  let score = 0;

  // Base score from requirement match
  if (isRequired) score += 0.4;
  else if (isPreferred) score += 0.25;

  // Level bonus
  const levelScores: Record<string, number> = {
    expert: 0.25,
    advanced: 0.15,
    intermediate: 0.1,
    beginner: 0.05,
  };
  score += levelScores[skill.level] ?? 0;

  // Recency bonus
  const currentYear = new Date().getFullYear();
  const yearsAgo = currentYear - skill.lastUsed;
  if (yearsAgo === 0) score += 0.15;
  else if (yearsAgo <= 2) score += 0.1;
  else if (yearsAgo <= 5) score += 0.05;

  // Featured bonus
  if (isFeatured(skill.name, skills)) score += 0.1;

  // Want to use bonus (shows enthusiasm)
  if (skill.wantToUse) score += 0.05;

  // Experience bonus
  if (skill.yearsUsed >= 5) score += 0.1;
  else if (skill.yearsUsed >= 3) score += 0.05;

  return Math.min(1, score);
}

/**
 * Analyze technology coverage
 */
export function analyzeTechnologyCoverage(
  skills: SkillsData,
  jobs: NormalizedJob[],
  requirements: JobRequirements
): {
  required: { tech: string; covered: boolean; source?: string }[];
  preferred: { tech: string; covered: boolean; source?: string }[];
  coveragePercent: number;
} {
  const { required: reqSkills, preferred: prefSkills } = findMatchingSkills(
    skills,
    requirements.requiredTechnologies,
    requirements.preferredTechnologies
  );

  // Build coverage for required
  const requiredCoverage = requirements.requiredTechnologies.map((tech) => {
    const skillMatch = reqSkills.find((s) => techMatches(s.name, tech));
    if (skillMatch) {
      return { tech, covered: true, source: `skill: ${skillMatch.name}` };
    }

    // Check jobs
    for (const job of jobs) {
      if (job.technologies.some((t) => techMatches(t, tech))) {
        return { tech, covered: true, source: `job: ${job.companyName}` };
      }
    }

    return { tech, covered: false };
  });

  // Build coverage for preferred
  const preferredCoverage = requirements.preferredTechnologies.map((tech) => {
    const skillMatch = prefSkills.find((s) => techMatches(s.name, tech));
    if (skillMatch) {
      return { tech, covered: true, source: `skill: ${skillMatch.name}` };
    }

    for (const job of jobs) {
      if (job.technologies.some((t) => techMatches(t, tech))) {
        return { tech, covered: true, source: `job: ${job.companyName}` };
      }
    }

    return { tech, covered: false };
  });

  // Calculate overall coverage (weighted toward required)
  const reqCovered = requiredCoverage.filter((c) => c.covered).length;
  const prefCovered = preferredCoverage.filter((c) => c.covered).length;
  const reqTotal = requiredCoverage.length || 1;
  const prefTotal = preferredCoverage.length || 1;

  const coveragePercent = Math.round(
    ((reqCovered / reqTotal) * 0.7 + (prefCovered / prefTotal) * 0.3) * 100
  );

  return {
    required: requiredCoverage,
    preferred: preferredCoverage,
    coveragePercent,
  };
}

/**
 * Generate match summary
 */
export function generateMatchSummary(
  coveragePercent: number,
  scoredJobs: { totalScore: number; matchedTechnologies: string[]; missingTechnologies: string[] }[],
  requirements: JobRequirements
): {
  overallFit: 'excellent' | 'good' | 'moderate' | 'weak';
  strengths: string[];
  gaps: string[];
  recommendations: string[];
} {
  // Determine overall fit
  let overallFit: 'excellent' | 'good' | 'moderate' | 'weak';
  if (coveragePercent >= 85) overallFit = 'excellent';
  else if (coveragePercent >= 70) overallFit = 'good';
  else if (coveragePercent >= 50) overallFit = 'moderate';
  else overallFit = 'weak';

  // Collect strengths
  const strengths: string[] = [];
  const allMatched = new Set<string>();
  scoredJobs.forEach((j) => j.matchedTechnologies.forEach((t) => allMatched.add(t)));

  if (allMatched.size >= 5) {
    strengths.push(`Strong technology match (${allMatched.size} skills aligned)`);
  }

  if (scoredJobs.some((j) => j.totalScore > 0.8)) {
    strengths.push('Highly relevant work experience');
  }

  if (requirements.leadershipRequired) {
    // This would need job data to verify, simplified here
    strengths.push('Leadership experience available');
  }

  // Collect gaps
  const gaps: string[] = [];
  const allMissing = new Set<string>();
  scoredJobs.forEach((j) => j.missingTechnologies.forEach((t) => allMissing.add(t)));

  if (allMissing.size > 0) {
    gaps.push(`Missing technologies: ${Array.from(allMissing).slice(0, 3).join(', ')}`);
  }

  // Recommendations
  const recommendations: string[] = [];
  if (coveragePercent < 70) {
    recommendations.push('Highlight transferable skills and learning agility');
  }
  if (allMissing.size > 3) {
    recommendations.push('Consider addressing gaps in cover letter');
  }
  if (overallFit === 'excellent') {
    recommendations.push('Strong fit - emphasize achievements and impact');
  }

  return { overallFit, strengths, gaps, recommendations };
}
