/**
 * Individual scoring functions for job matching
 */

import type {
  NormalizedJob,
  JobRequirements,
  JobScore,
  Project,
  Achievement,
  ScoredProject,
  ScoredAchievement,
  MatchConfig,
  RoleLevel,
  SeniorityLevel,
} from '../types/index.js';
import { DEFAULT_MATCH_CONFIG } from '../types/index.js';
import { findMatchingTechs, techMatches } from './technology-matcher.js';
import { getJobEndYear } from './normalizer.js';

/**
 * Score technology match between job and requirements
 */
export function scoreTechnologyMatch(job: NormalizedJob, requirements: JobRequirements): number {
  const allRequired = [
    ...requirements.requiredTechnologies,
    ...requirements.keywords.filter((k) => !requirements.buzzwords.includes(k)),
  ];

  const { matched } = findMatchingTechs(job.technologies, allRequired);

  if (allRequired.length === 0) return 0.5; // Neutral if no requirements

  // Base score from coverage
  let score = matched.length / allRequired.length;

  // Bonus for preferred technologies
  const { matched: prefMatched } = findMatchingTechs(job.technologies, requirements.preferredTechnologies);
  if (requirements.preferredTechnologies.length > 0) {
    score += (prefMatched.length / requirements.preferredTechnologies.length) * 0.2;
  }

  return Math.min(1, score);
}

/**
 * Score domain/industry match
 */
export function scoreDomainMatch(job: NormalizedJob, requirements: JobRequirements): number {
  let score = 0.5; // Neutral default

  // Check company industry match
  if (job.companyInfo?.industry && requirements.domain) {
    const jobIndustry = job.companyInfo.industry.toLowerCase();
    const reqDomain = requirements.domain.toLowerCase();

    if (jobIndustry.includes(reqDomain) || reqDomain.includes(jobIndustry)) {
      score += 0.3;
    }
  }

  // Check relevance weights
  if (job.relevanceWeights) {
    const weights = job.relevanceWeights;
    const domain = requirements.domain;
    const companyType = requirements.companyType;

    // Map requirements to weights
    if (domain === 'fintech' || domain === 'crypto') {
      score += (weights.mobile ?? 0) * 0.1;
    }
    if (companyType === 'startup' || companyType === 'scaleup') {
      score += (weights.startup ?? 0) * 0.15;
    }
    if (companyType === 'enterprise' || companyType === 'faang') {
      score += (weights.enterprise ?? 0) * 0.15;
    }
    if (requirements.leadershipRequired) {
      score += (weights.leadership ?? 0) * 0.1;
    }
  }

  // Check keywords match
  if (job.keywords?.domains && requirements.domain) {
    if (job.keywords.domains.some((d) => d.toLowerCase().includes(requirements.domain!.toLowerCase()))) {
      score += 0.2;
    }
  }

  return Math.min(1, score);
}

/**
 * Score seniority alignment
 */
export function scoreSeniorityMatch(job: NormalizedJob, requirements: JobRequirements): number {
  const levelOrder: (RoleLevel | SeniorityLevel)[] = [
    'junior',
    'mid',
    'senior',
    'staff',
    'lead',
    'principal',
    'manager',
    'director',
  ];

  const jobLevel = job.level ?? 'mid';
  const reqLevel = requirements.seniority;

  const jobIndex = levelOrder.indexOf(jobLevel);
  const reqIndex = levelOrder.indexOf(reqLevel);

  if (jobIndex === -1 || reqIndex === -1) return 0.5;

  // Perfect match
  if (jobIndex === reqIndex) return 1.0;

  // Slightly above target level is good
  if (jobIndex === reqIndex + 1) return 0.9;

  // One level below is acceptable
  if (jobIndex === reqIndex - 1) return 0.7;

  // More than one level below
  if (jobIndex < reqIndex - 1) {
    return Math.max(0.3, 0.7 - (reqIndex - jobIndex - 1) * 0.15);
  }

  // Much higher level is still good
  return 0.8;
}

/**
 * Score job recency
 */
export function scoreRecency(job: NormalizedJob, config: MatchConfig = DEFAULT_MATCH_CONFIG): number {
  const currentYear = new Date().getFullYear();
  const jobEndYear = getJobEndYear(job);
  const yearsAgo = currentYear - jobEndYear;

  // Current or recent jobs get full score
  if (yearsAgo <= 2) return 1.0;

  // Apply decay
  const decay = config.recencyDecay * (yearsAgo - 2);
  return Math.max(0.2, 1 - decay);
}

/**
 * Score based on relevance weights in job data
 */
export function scoreRelevanceWeights(job: NormalizedJob, requirements: JobRequirements): number {
  if (!job.relevanceWeights) return 0.5;

  let score = 0;
  let factors = 0;

  const weights = job.relevanceWeights;

  // Mobile-focused roles
  if (requirements.requiredTechnologies.some((t) => ['Swift', 'Kotlin', 'iOS', 'Android', 'React Native'].includes(t))) {
    if (weights.mobile) {
      score += weights.mobile;
      factors++;
    }
  }

  // Leadership roles
  if (requirements.leadershipRequired || requirements.seniority === 'lead' || requirements.seniority === 'manager') {
    if (weights.leadership) {
      score += weights.leadership;
      factors++;
    }
  }

  // Startup vs enterprise
  if (requirements.companyType === 'startup' || requirements.companyType === 'scaleup') {
    if (weights.startup) {
      score += weights.startup;
      factors++;
    }
  } else if (requirements.companyType === 'enterprise' || requirements.companyType === 'faang') {
    if (weights.enterprise) {
      score += weights.enterprise;
      factors++;
    }
  }

  if (factors === 0) return 0.5;
  return score / factors;
}

/**
 * Calculate composite job score
 */
export function scoreJob(
  job: NormalizedJob,
  requirements: JobRequirements,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): JobScore {
  const techScore = scoreTechnologyMatch(job, requirements);
  const domainScore = scoreDomainMatch(job, requirements);
  const seniorityScore = scoreSeniorityMatch(job, requirements);
  const recencyScore = scoreRecency(job, config);
  const relevanceScore = scoreRelevanceWeights(job, requirements);

  // Calculate weighted total
  const totalScore =
    techScore * config.weights.technology +
    domainScore * config.weights.domain +
    seniorityScore * config.weights.seniority +
    recencyScore * config.weights.recency +
    relevanceScore * config.weights.relevance;

  // Find matched technologies
  const allRequired = [...requirements.requiredTechnologies, ...requirements.preferredTechnologies];
  const { matched, missing } = findMatchingTechs(job.technologies, allRequired);

  // Find matched keywords
  const matchedKeywords = requirements.keywords.filter((k) =>
    job.technologies.some((t) => techMatches(t, k)) ||
    job.responsibilities.some((r) => r.toLowerCase().includes(k.toLowerCase()))
  );

  return {
    jobId: `${job.companyName}-${job.startDate}`,
    companyName: job.companyName,
    title: job.title,
    scores: {
      technologyMatch: techScore,
      domainMatch: domainScore,
      seniorityMatch: seniorityScore,
      recency: recencyScore,
      relevanceWeight: relevanceScore,
    },
    totalScore,
    matchedTechnologies: matched,
    missingTechnologies: missing,
    matchedKeywords,
  };
}

/**
 * Score a project for relevance
 */
export function scoreProject(project: Project, requirements: JobRequirements): ScoredProject {
  let score = 0.5;
  const matchedTechnologies: string[] = [];
  const reasons: string[] = [];

  // Technology match
  if (project.technologies) {
    const { matched } = findMatchingTechs(project.technologies, [
      ...requirements.requiredTechnologies,
      ...requirements.preferredTechnologies,
    ]);
    matchedTechnologies.push(...matched);

    if (matched.length > 0) {
      score += matched.length * 0.1;
      reasons.push(`Uses ${matched.join(', ')}`);
    }
  }

  // Impact keywords
  if (project.impact) {
    const impactLower = project.impact.toLowerCase();
    if (requirements.keywords.some((k) => impactLower.includes(k.toLowerCase()))) {
      score += 0.15;
      reasons.push('Relevant impact');
    }
    if (/\d+%/.test(project.impact)) {
      score += 0.1;
      reasons.push('Quantified impact');
    }
  }

  // Leadership match
  if (requirements.leadershipRequired && project.teamSize && project.teamSize > 1) {
    score += 0.1;
    reasons.push(`Led team of ${project.teamSize}`);
  }

  return {
    ...project,
    score: Math.min(1, score),
    matchedTechnologies,
    relevanceReason: reasons.join('; ') || 'General relevance',
  };
}

/**
 * Score an achievement for relevance
 */
export function scoreAchievement(achievement: Achievement, requirements: JobRequirements): ScoredAchievement {
  let score = 0.5;
  const reasons: string[] = [];

  const descLower = achievement.description.toLowerCase();

  // Keyword match
  const matchedKeywords = requirements.keywords.filter((k) => descLower.includes(k.toLowerCase()));
  if (matchedKeywords.length > 0) {
    score += matchedKeywords.length * 0.1;
    reasons.push(`Mentions ${matchedKeywords.join(', ')}`);
  }

  // Quantifiable achievements are valuable
  if (achievement.quantifiable || /\d+%?/.test(achievement.description)) {
    score += 0.2;
    reasons.push('Quantified result');
  }

  // Category alignment
  if (achievement.category) {
    if (requirements.leadershipRequired && achievement.category === 'team') {
      score += 0.15;
      reasons.push('Team achievement');
    }
    if (['performance', 'quality', 'business'].includes(achievement.category)) {
      score += 0.1;
      reasons.push(`${achievement.category} achievement`);
    }
  }

  // Leadership keywords
  if (requirements.leadershipRequired) {
    if (/\b(led|managed|mentored|coached|hired|built team)\b/i.test(achievement.description)) {
      score += 0.15;
      reasons.push('Leadership demonstrated');
    }
  }

  // Impact mention
  if (achievement.impact) {
    score += 0.1;
    reasons.push('Has impact statement');
  }

  return {
    ...achievement,
    score: Math.min(1, score),
    relevanceReason: reasons.join('; ') || 'General achievement',
  };
}
