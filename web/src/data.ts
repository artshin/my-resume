/**
 * Type-safe data access for embedded resume data
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
  targetRoles?: string[];
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

export interface SkillsData {
  categories: Record<string, Skill[]>;
  featured: string[];
}

export interface Education {
  degree: string;
  field: string;
  institution: string;
  location?: string;
  graduationYear: number;
  honors?: string[] | null;
}

export interface NormalizedJob {
  id: string;
  companyName: string;
  companyDescription?: string;
  title: string;
  location: string;
  startDate: string;
  endDate?: string;
  technologies: string[];
  achievements: string[];
  responsibilities: string[];
}

export interface ResumeData {
  profile: Profile;
  skills: SkillsData;
  education: Education[];
  jobs: NormalizedJob[];
}

let cachedData: ResumeData | null = null;

export function getData(): ResumeData {
  if (cachedData) return cachedData;

  const script = document.getElementById('resume-data');
  if (!script) {
    throw new Error('Resume data not found');
  }

  cachedData = JSON.parse(script.textContent || '{}') as ResumeData;
  return cachedData;
}

export function getProfile(): Profile {
  return getData().profile;
}

export function getSkills(): SkillsData {
  return getData().skills;
}

export function getEducation(): Education[] {
  return getData().education;
}

export function getJobs(): NormalizedJob[] {
  return getData().jobs;
}

export function getAllTechnologies(): string[] {
  const techs = new Set<string>();
  getJobs().forEach((job) => {
    job.technologies.forEach((t) => techs.add(t));
  });
  return Array.from(techs).sort();
}

export function getAllSkillNames(): string[] {
  const names = new Set<string>();
  const skills = getSkills();
  Object.values(skills.categories).forEach((category) => {
    category.forEach((skill) => names.add(skill.name));
  });
  return Array.from(names);
}

export function getSkillByName(name: string): Skill | undefined {
  const skills = getSkills();
  for (const category of Object.values(skills.categories)) {
    const skill = category.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (skill) return skill;
  }
  return undefined;
}

export function skillLevelToPercent(level: SkillLevel): number {
  const map: Record<SkillLevel, number> = {
    beginner: 25,
    intermediate: 50,
    advanced: 75,
    expert: 100,
  };
  return map[level];
}
