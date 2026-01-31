/**
 * Job Matching and Scoring Engine
 *
 * Matches job history and skills against parsed job descriptions
 * to select and prioritize relevant content for resume generation.
 */

import type {
  Job,
  SkillsData,
  JobRequirements,
  MatchResult,
  MatchConfig,
  JobScore,
} from '../types/index.js';
import { DEFAULT_MATCH_CONFIG } from '../types/index.js';
import { normalizeJob, getAllTechnologies } from './normalizer.js';
import { scoreJob } from './scorers.js';
import {
  selectProjects,
  selectAchievements,
  selectSkills,
  analyzeTechnologyCoverage,
  generateMatchSummary,
} from './selector.js';

export { normalizeJob, getAllTechnologies } from './normalizer.js';
export { scoreJob, scoreTechnologyMatch, scoreDomainMatch, scoreSeniorityMatch, scoreRecency } from './scorers.js';
export { findMatchingTechs, normalizeTechName, techMatches, getAllSkills } from './technology-matcher.js';
export { selectProjects, selectAchievements, selectSkills } from './selector.js';

export interface MatchOptions {
  /** Custom matching configuration */
  config?: Partial<MatchConfig>;
  /** Filter jobs by minimum score threshold */
  minJobScore?: number;
  /** Include detailed scoring breakdown */
  includeBreakdown?: boolean;
}

/**
 * Match jobs and skills against job requirements
 */
export function matchAgainstRequirements(
  jobs: Job[],
  skills: SkillsData,
  requirements: JobRequirements,
  options: MatchOptions = {}
): MatchResult {
  const config: MatchConfig = {
    ...DEFAULT_MATCH_CONFIG,
    ...options.config,
  };

  // Normalize all jobs
  const normalizedJobs = jobs.map(normalizeJob);

  // Score each job
  const scoredJobs = normalizedJobs
    .map((job) => ({
      job,
      score: scoreJob(job, requirements, config),
    }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore);

  // Filter by minimum score if specified
  const filteredJobs = options.minJobScore
    ? scoredJobs.filter((j) => j.score.totalScore >= options.minJobScore!)
    : scoredJobs;

  // Get ranked job scores
  const rankedJobs: JobScore[] = filteredJobs.map((j) => j.score);

  // Get normalized jobs for content selection
  const relevantNormalizedJobs = filteredJobs.map((j) => j.job);

  // Select best content
  const selectedProjects = selectProjects(relevantNormalizedJobs, requirements, config);
  const selectedAchievements = selectAchievements(relevantNormalizedJobs, requirements, config);
  const selectedSkills = selectSkills(skills, requirements, config);

  // Analyze technology coverage
  const technologyCoverage = analyzeTechnologyCoverage(skills, normalizedJobs, requirements);

  // Generate summary
  const summary = generateMatchSummary(
    technologyCoverage.coveragePercent,
    rankedJobs,
    requirements
  );

  return {
    requirements,
    rankedJobs,
    selectedProjects,
    selectedAchievements,
    selectedSkills,
    technologyCoverage,
    summary,
  };
}

/**
 * Quick match to get job relevance scores only
 */
export function quickMatch(
  jobs: Job[],
  requirements: JobRequirements,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): JobScore[] {
  return jobs
    .map((job) => scoreJob(normalizeJob(job), requirements, config))
    .sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Check if jobs meet minimum requirements for a position
 */
export function meetsMinimumRequirements(
  jobs: Job[],
  requirements: JobRequirements,
  minCoveragePercent = 50
): { meets: boolean; coveragePercent: number; gaps: string[] } {
  const normalizedJobs = jobs.map(normalizeJob);
  const allTechs = getAllTechnologies(normalizedJobs);

  let coveredCount = 0;
  const gaps: string[] = [];

  for (const reqTech of requirements.requiredTechnologies) {
    const found = allTechs.some(
      (t) => t.toLowerCase().includes(reqTech.toLowerCase()) || reqTech.toLowerCase().includes(t.toLowerCase())
    );
    if (found) {
      coveredCount++;
    } else {
      gaps.push(reqTech);
    }
  }

  const coveragePercent = requirements.requiredTechnologies.length > 0
    ? Math.round((coveredCount / requirements.requiredTechnologies.length) * 100)
    : 100;

  return {
    meets: coveragePercent >= minCoveragePercent,
    coveragePercent,
    gaps,
  };
}

/**
 * Get recommended summary template based on match
 */
export function recommendSummaryTemplate(
  requirements: JobRequirements
): 'mobile' | 'leadership' | 'startup' | 'enterprise' | 'fullstack' | 'default' {
  // Check for leadership roles
  if (
    requirements.leadershipRequired ||
    requirements.seniority === 'lead' ||
    requirements.seniority === 'manager' ||
    requirements.seniority === 'director'
  ) {
    return 'leadership';
  }

  // Check for mobile focus
  const mobileTechs = ['Swift', 'Kotlin', 'iOS', 'Android', 'React Native', 'Flutter', 'UIKit', 'SwiftUI'];
  if (requirements.requiredTechnologies.some((t) => mobileTechs.includes(t))) {
    return 'mobile';
  }

  // Check for company type
  if (requirements.companyType === 'startup' || requirements.companyType === 'scaleup') {
    return 'startup';
  }
  if (requirements.companyType === 'enterprise' || requirements.companyType === 'faang') {
    return 'enterprise';
  }

  // Check for fullstack indicators
  const frontendTechs = ['React', 'Vue', 'Angular', 'Next.js'];
  const backendTechs = ['Node.js', 'Python', 'Go', 'PostgreSQL', 'MongoDB'];
  const hasFrontend = requirements.requiredTechnologies.some((t) => frontendTechs.includes(t));
  const hasBackend = requirements.requiredTechnologies.some((t) => backendTechs.includes(t));
  if (hasFrontend && hasBackend) {
    return 'fullstack';
  }

  return 'default';
}

/**
 * Print match result summary to console
 */
export function printMatchSummary(result: MatchResult): void {
  console.log('\n=== Match Summary ===\n');
  console.log(`Overall Fit: ${result.summary.overallFit.toUpperCase()}`);
  console.log(`Technology Coverage: ${result.technologyCoverage.coveragePercent}%`);

  console.log('\n--- Strengths ---');
  result.summary.strengths.forEach((s) => console.log(`  + ${s}`));

  console.log('\n--- Gaps ---');
  result.summary.gaps.forEach((g) => console.log(`  - ${g}`));

  console.log('\n--- Recommendations ---');
  result.summary.recommendations.forEach((r) => console.log(`  * ${r}`));

  console.log('\n--- Top Jobs ---');
  result.rankedJobs.slice(0, 3).forEach((job) => {
    console.log(`  ${job.companyName} - ${job.title}: ${(job.totalScore * 100).toFixed(0)}%`);
  });

  console.log('\n--- Selected Skills ---');
  console.log(`  ${result.selectedSkills.map((s) => s.name).join(', ')}`);
}
