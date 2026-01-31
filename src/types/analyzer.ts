/**
 * Job description analyzer types
 */

export type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'staff' | 'principal' | 'lead' | 'manager' | 'director';

export type JobDomain =
  | 'fintech'
  | 'healthcare'
  | 'ecommerce'
  | 'gaming'
  | 'enterprise'
  | 'consumer'
  | 'saas'
  | 'crypto'
  | 'ai-ml'
  | 'social'
  | 'media'
  | 'education'
  | 'other';

export type CompanyType = 'startup' | 'scaleup' | 'enterprise' | 'agency' | 'consulting' | 'faang';

export type WorkArrangement = 'remote' | 'hybrid' | 'onsite';

/**
 * Extracted requirements from a job description
 */
export interface JobRequirements {
  // Role info
  title: string;
  seniority: SeniorityLevel;
  department?: string;

  // Company info
  companyName?: string;
  companyType?: CompanyType;
  domain?: JobDomain;
  location?: string;
  workArrangement?: WorkArrangement;

  // Technical requirements
  requiredTechnologies: string[];
  preferredTechnologies: string[];
  yearsExperience?: number;

  // Responsibilities
  keyResponsibilities: string[];

  // Soft requirements
  leadershipRequired: boolean;
  teamSize?: string;
  mentorshipExpected: boolean;

  // Keywords for matching
  keywords: string[];
  buzzwords: string[];
}

/**
 * Analysis result with confidence scores
 */
export interface AnalysisResult {
  requirements: JobRequirements;
  confidence: {
    overall: number;
    seniority: number;
    technologies: number;
    domain: number;
  };
  rawExtraction?: string;
}

/**
 * Fallback keyword extraction result (when Ollama unavailable)
 */
export interface KeywordExtractionResult {
  technologies: string[];
  seniorityIndicators: string[];
  domainIndicators: string[];
  responsibilities: string[];
}
