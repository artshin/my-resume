/**
 * Job-related type definitions
 * Based on jobs/job-schema.json
 */

export type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

export type CompanyStage =
  | 'seed'
  | 'series-a'
  | 'series-b'
  | 'series-c'
  | 'public'
  | 'established';

export type RoleLevel =
  | 'junior'
  | 'mid'
  | 'senior'
  | 'staff'
  | 'principal'
  | 'lead'
  | 'manager'
  | 'director';

export type RoleType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';

export type Methodology = 'agile' | 'scrum' | 'kanban' | 'waterfall' | 'hybrid';

export type WorkStyle = 'remote' | 'hybrid' | 'onsite';

export type AchievementCategory =
  | 'performance'
  | 'quality'
  | 'cost'
  | 'time'
  | 'user'
  | 'business'
  | 'team';

export interface Company {
  name: string;
  industry?: string;
  size?: CompanySize;
  stage?: CompanyStage;
  description?: string;
  website?: string;
  location?: string;
}

export interface Role {
  title: string;
  level?: RoleLevel;
  type?: RoleType;
  department?: string;
  reportingTo?: string;
  teamSize?: number;
  directReports?: number;
}

export interface Duration {
  start: string;
  end?: string;
  totalMonths?: number;
}

export interface Responsibilities {
  primary?: string[];
  secondary?: string[];
  leadership?: string[];
  technical?: string[];
  business?: string[];
}

export interface Project {
  name: string;
  description?: string;
  role?: string;
  duration?: string;
  technologies?: string[];
  impact?: string;
  teamSize?: number;
  challenges?: string[];
  solutions?: string[];
}

export interface Technologies {
  languages?: string[];
  frameworks?: string[];
  databases?: string[];
  cloud?: string[];
  devops?: string[];
  tools?: string[];
  mobile?: string[];
  testing?: string[];
}

export interface Achievement {
  description: string;
  impact?: string;
  metrics?: string;
  category?: AchievementCategory;
  quantifiable?: boolean;
}

export interface JobSkills {
  developed?: string[];
  strengthened?: string[];
  applied?: string[];
}

export interface JobContext {
  businessContext?: string;
  challenges?: string[];
  constraints?: string[];
  stakeholders?: string[];
  methodology?: Methodology;
  workStyle?: WorkStyle;
}

export interface Keywords {
  jobTitles?: string[];
  domains?: string[];
  buzzwords?: string[];
  certifications?: string[];
}

export interface RelevanceWeights {
  mobile?: number;
  web?: number;
  backend?: number;
  frontend?: number;
  fullstack?: number;
  leadership?: number;
  startup?: number;
  enterprise?: number;
}

/**
 * Enhanced job format - full schema
 */
export interface EnhancedJob {
  company: Company;
  role: Role;
  duration: Duration;
  responsibilities?: Responsibilities;
  projects?: Project[];
  technologies?: Technologies;
  achievements?: Achievement[];
  skills?: JobSkills;
  context?: JobContext;
  keywords?: Keywords;
  relevanceWeights?: RelevanceWeights;
}

/**
 * Basic job format - simple structure used in older job files
 */
export interface BasicJob {
  company: string;
  companyDescription?: string;
  position: string;
  location: string;
  startDate: string;
  endDate?: string;
  technologies?: string[];
  clients?: string[];
  achievements?: string[];
}

/**
 * Union type for any job format
 */
export type Job = EnhancedJob | BasicJob;

/**
 * Type guard to check if a job is in enhanced format
 */
export function isEnhancedJob(job: Job): job is EnhancedJob {
  return typeof (job as EnhancedJob).company === 'object';
}

/**
 * Type guard to check if a job is in basic format
 */
export function isBasicJob(job: Job): job is BasicJob {
  return typeof (job as BasicJob).company === 'string';
}

/**
 * Normalized job format for internal processing
 * Converts both basic and enhanced jobs to a common structure
 */
export interface NormalizedJob {
  companyName: string;
  companyDescription?: string;
  companyInfo?: Company;
  title: string;
  level?: RoleLevel;
  location: string;
  startDate: string;
  endDate?: string;
  durationMonths?: number;
  technologies: string[];
  projects: Project[];
  achievements: Achievement[];
  responsibilities: string[];
  relevanceWeights?: RelevanceWeights;
  keywords?: Keywords;
  workStyle?: WorkStyle;
}
