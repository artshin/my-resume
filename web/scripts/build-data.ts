/**
 * Build script to aggregate JSON data and embed into index.html
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');

interface ContactInfo {
  email: string;
  phone?: string;
  location: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

interface Profile {
  name: string;
  contact: ContactInfo;
  summary: {
    default: string;
    templates?: Record<string, string>;
  };
  targetRoles?: string[];
}

interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsUsed: number;
  lastUsed: number;
  wantToUse: boolean;
  keywords?: string[];
}

interface SkillsData {
  categories: Record<string, Skill[]>;
  featured: string[];
  deprecated: string[];
}

interface Education {
  degree: string;
  field: string;
  institution: string;
  location?: string;
  graduationYear: number;
  honors?: string[] | null;
}

interface EducationData {
  education: Education[];
  certifications?: unknown[];
}

interface Duration {
  start: string;
  end?: string;
}

interface BasicJob {
  company: string;
  companyDescription?: string;
  position: string;
  location: string;
  duration: Duration;
  description?: string[];
  technologies?: string[];
  achievements?: string[];
}

interface EnhancedJobCompany {
  name: string;
  description?: string;
  location?: string;
}

interface EnhancedJobRole {
  title: string;
  level?: string;
}

interface EnhancedJob {
  company: EnhancedJobCompany;
  role: EnhancedJobRole;
  duration: Duration;
  responsibilities?: {
    primary?: string[];
    technical?: string[];
    leadership?: string[];
  };
  technologies?: Record<string, string[]>;
  achievements?: Array<{ description: string; impact?: string; metrics?: string }>;
  projects?: Array<{
    name: string;
    description?: string;
    technologies?: string[];
    impact?: string;
  }>;
}

type Job = BasicJob | EnhancedJob;

interface NormalizedJob {
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

function isEnhancedJob(job: Job): job is EnhancedJob {
  return typeof (job as EnhancedJob).company === 'object';
}

function normalizeJob(job: Job, id: string): NormalizedJob {
  if (isEnhancedJob(job)) {
    const techs: string[] = [];
    if (job.technologies) {
      Object.values(job.technologies).forEach((arr) => {
        if (Array.isArray(arr)) techs.push(...arr);
      });
    }

    const responsibilities: string[] = [];
    if (job.responsibilities) {
      const r = job.responsibilities;
      if (r.primary) responsibilities.push(...r.primary);
      if (r.technical) responsibilities.push(...r.technical);
      if (r.leadership) responsibilities.push(...r.leadership);
    }

    const achievements: string[] = [];
    if (job.achievements) {
      job.achievements.forEach((a) => {
        let text = a.description;
        if (a.metrics) text += ` (${a.metrics})`;
        achievements.push(text);
      });
    }

    return {
      id,
      companyName: job.company.name,
      companyDescription: job.company.description,
      title: job.role.title,
      location: job.company.location || '',
      startDate: job.duration.start,
      endDate: job.duration.end,
      technologies: [...new Set(techs)],
      achievements,
      responsibilities,
    };
  }

  return {
    id,
    companyName: job.company,
    companyDescription: job.companyDescription,
    title: job.position,
    location: job.location,
    startDate: job.duration.start,
    endDate: job.duration.end,
    technologies: job.technologies || [],
    achievements: job.achievements || [],
    responsibilities: job.description || [],
  };
}

function parseDate(dateStr: string): Date {
  if (dateStr.toLowerCase() === 'present') {
    return new Date();
  }
  const parts = dateStr.split(' ');
  const month = parts[0];
  const year = parseInt(parts[1], 10);
  const monthIndex = new Date(`${month} 1, 2000`).getMonth();
  return new Date(year, monthIndex);
}

function loadJobs(): NormalizedJob[] {
  const jobsDir = join(rootDir, 'jobs');
  const jobs: NormalizedJob[] = [];

  const entries = readdirSync(jobsDir);
  for (const entry of entries) {
    const entryPath = join(jobsDir, entry);
    if (!statSync(entryPath).isDirectory()) continue;

    // Prefer enhanced-job.json if it exists
    const enhancedPath = join(entryPath, 'enhanced-job.json');
    const basicPath = join(entryPath, 'job.json');

    let jobPath: string | null = null;
    try {
      statSync(enhancedPath);
      jobPath = enhancedPath;
    } catch {
      try {
        statSync(basicPath);
        jobPath = basicPath;
      } catch {
        continue;
      }
    }

    if (jobPath) {
      const content = readFileSync(jobPath, 'utf-8');
      const job = JSON.parse(content) as Job;
      jobs.push(normalizeJob(job, entry));
    }
  }

  // Sort by start date descending (most recent first)
  jobs.sort((a, b) => {
    const dateA = parseDate(a.startDate);
    const dateB = parseDate(b.startDate);
    return dateB.getTime() - dateA.getTime();
  });

  return jobs;
}

function main() {
  console.log('Building resume data...');

  // Load all data
  const profile = JSON.parse(
    readFileSync(join(rootDir, 'profile.json'), 'utf-8')
  ) as Profile;

  const skills = JSON.parse(
    readFileSync(join(rootDir, 'skills.json'), 'utf-8')
  ) as SkillsData;

  const educationData = JSON.parse(
    readFileSync(join(rootDir, 'education.json'), 'utf-8')
  ) as EducationData;

  const jobs = loadJobs();

  // Build aggregated data
  const resumeData = {
    profile: {
      name: profile.name,
      contact: profile.contact,
      summary: profile.summary.default,
      targetRoles: profile.targetRoles,
    },
    skills: {
      categories: skills.categories,
      featured: skills.featured,
    },
    education: educationData.education,
    jobs,
  };

  // Write to a JSON file that will be embedded
  const dataJson = JSON.stringify(resumeData);

  // Read index.html and replace placeholder
  const indexPath = join(__dirname, '../index.html');
  let html = readFileSync(indexPath, 'utf-8');

  html = html.replace(
    /<script id="resume-data" type="application\/json">[\s\S]*?<\/script>/,
    `<script id="resume-data" type="application/json">\n      ${dataJson}\n    </script>`
  );

  writeFileSync(indexPath, html);
  console.log(`Resume data embedded (${(dataJson.length / 1024).toFixed(1)}KB)`);
}

main();
