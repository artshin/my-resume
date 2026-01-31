/**
 * Matching and scoring types
 */

import type { Project, Achievement } from './job.js';
import type { JobRequirements } from './analyzer.js';
import type { Skill } from './profile.js';

/**
 * Score breakdown for a single job
 */
export interface JobScore {
  jobId: string;
  companyName: string;
  title: string;

  // Individual scores (0-1)
  scores: {
    technologyMatch: number;
    domainMatch: number;
    seniorityMatch: number;
    recency: number;
    relevanceWeight: number;
  };

  // Weighted total (0-1)
  totalScore: number;

  // Matching details
  matchedTechnologies: string[];
  missingTechnologies: string[];
  matchedKeywords: string[];
}

/**
 * Project scored for relevance
 */
export interface ScoredProject extends Project {
  score: number;
  matchedTechnologies: string[];
  relevanceReason: string;
}

/**
 * Achievement scored for relevance
 */
export interface ScoredAchievement extends Achievement {
  score: number;
  relevanceReason: string;
}

/**
 * Skill scored for relevance
 */
export interface ScoredSkill extends Skill {
  score: number;
  isRequired: boolean;
  isPreferred: boolean;
}

/**
 * Full matching result
 */
export interface MatchResult {
  requirements: JobRequirements;

  // Ranked jobs by relevance
  rankedJobs: JobScore[];

  // Selected content for resume
  selectedProjects: ScoredProject[];
  selectedAchievements: ScoredAchievement[];
  selectedSkills: ScoredSkill[];

  // Technology analysis
  technologyCoverage: {
    required: { tech: string; covered: boolean; source?: string }[];
    preferred: { tech: string; covered: boolean; source?: string }[];
    coveragePercent: number;
  };

  // Summary of match quality
  summary: {
    overallFit: 'excellent' | 'good' | 'moderate' | 'weak';
    strengths: string[];
    gaps: string[];
    recommendations: string[];
  };
}

/**
 * Configuration for the matching algorithm
 */
export interface MatchConfig {
  weights: {
    technology: number;
    domain: number;
    seniority: number;
    recency: number;
    relevance: number;
  };
  recencyDecay: number; // How much to penalize older jobs (per year)
  minProjectsToShow: number;
  maxProjectsToShow: number;
  minAchievementsToShow: number;
  maxAchievementsToShow: number;
  minSkillsToShow: number;
  maxSkillsToShow: number;
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  weights: {
    technology: 0.35,
    domain: 0.20,
    seniority: 0.15,
    recency: 0.15,
    relevance: 0.15,
  },
  recencyDecay: 0.1,
  minProjectsToShow: 2,
  maxProjectsToShow: 5,
  minAchievementsToShow: 3,
  maxAchievementsToShow: 8,
  minSkillsToShow: 8,
  maxSkillsToShow: 15,
};
