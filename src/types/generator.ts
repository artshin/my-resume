/**
 * Resume generator types
 */

import type { MatchResult } from './matcher.js';

/**
 * Data structure passed to the template engine
 */
export interface ResumeData {
  // Header
  name: string;
  contact: {
    email: string;
    phone?: string;
    location: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };

  // Tailored summary (generated or template-based)
  summary: string;

  // Work experience (ordered by relevance, then recency)
  experience: ResumeExperience[];

  // Skills (ordered by relevance to JD)
  skills: ResumeSkillSection;

  // Education
  education: ResumeEducation[];
  certifications?: ResumeCertification[];

  // Metadata for template
  meta: {
    generatedAt: string;
    targetRole: string;
    targetCompany?: string;
    templateName: string;
    matchScore: number;
  };
}

export interface ResumeExperience {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;

  // Bullet points (achievements, responsibilities, projects combined)
  bullets: ResumeBullet[];

  // Technologies used (for ATS)
  technologies: string[];

  // Match score for this job (used for ordering)
  relevanceScore: number;
}

export interface ResumeBullet {
  text: string;
  type: 'achievement' | 'responsibility' | 'project';
  score: number;
  highlighted: boolean; // Whether to emphasize (matches JD keywords)
}

export interface ResumeSkillSection {
  // Grouped by category
  technical: string[];
  frameworks: string[];
  tools: string[];
  other?: string[];

  // Or flat list
  all: string[];
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  field: string;
  year: number;
  location?: string;
}

export interface ResumeCertification {
  name: string;
  issuer: string;
  year?: number;
}

/**
 * Options for resume generation
 */
export interface GenerateOptions {
  // Input
  jobDescription: string;
  jobDescriptionPath?: string;

  // Output
  outputPath: string;
  format: 'pdf' | 'html';
  template: string;

  // Customization
  maxPages?: number;
  includeProjects?: boolean;
  includeEducation?: boolean;
  includeCertifications?: boolean;

  // Debug
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Result of generation
 */
export interface GenerateResult {
  success: boolean;
  outputPath?: string;
  error?: string;

  // Stats
  stats: {
    matchScore: number;
    jobsIncluded: number;
    projectsIncluded: number;
    achievementsIncluded: number;
    skillsIncluded: number;
    generationTimeMs: number;
  };

  // For verbose mode
  matchDetails?: MatchResult;
}

/**
 * PDF generation options
 */
export interface PdfOptions {
  format: 'letter' | 'a4';
  margin: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  printBackground: boolean;
  preferCSSPageSize: boolean;
}

export const DEFAULT_PDF_OPTIONS: PdfOptions = {
  format: 'letter',
  margin: {
    top: '0.5in',
    right: '0.5in',
    bottom: '0.5in',
    left: '0.5in',
  },
  printBackground: true,
  preferCSSPageSize: false,
};
