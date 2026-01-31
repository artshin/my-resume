/**
 * Profile, education, and skills type definitions
 */

export interface ContactInfo {
  email: string;
  phone?: string;
  location: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface Profile {
  name: string;
  contact: ContactInfo;
  summary: string;
  summaryTemplates?: SummaryTemplates;
  targetRoles?: string[];
  preferences?: ProfilePreferences;
}

export interface SummaryTemplates {
  default: string;
  mobile?: string;
  fullstack?: string;
  leadership?: string;
  startup?: string;
  enterprise?: string;
}

export interface ProfilePreferences {
  remoteOnly?: boolean;
  locations?: string[];
  industries?: string[];
  companySize?: string[];
  minSalary?: number;
}

export type DegreeType = 'high-school' | 'associate' | 'bachelor' | 'master' | 'doctorate' | 'bootcamp' | 'certificate';

export interface Education {
  institution: string;
  degree: string;
  degreeType?: DegreeType;
  field: string;
  location?: string;
  graduationYear: number;
  gpa?: number;
  honors?: string[];
  relevantCourses?: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface EducationData {
  education: Education[];
  certifications?: Certification[];
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Skill {
  name: string;
  level: SkillLevel;
  yearsUsed: number;
  lastUsed: number;
  wantToUse: boolean;
  keywords?: string[];
}

export interface SkillCategory {
  languages: Skill[];
  frameworks: Skill[];
  mobile: Skill[];
  databases: Skill[];
  cloud: Skill[];
  devops: Skill[];
  testing: Skill[];
  tools: Skill[];
  domains: Skill[];
  soft: Skill[];
}

export interface SkillsData {
  categories: SkillCategory;
  featured: string[];
  deprecated: string[];
}

/**
 * Combined profile data for resume generation
 */
export interface FullProfile {
  profile: Profile;
  education: EducationData;
  skills: SkillsData;
}
