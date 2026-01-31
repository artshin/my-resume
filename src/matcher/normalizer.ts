/**
 * Job normalization utilities
 * Converts various job formats to a common NormalizedJob structure
 */

import type {
  Job,
  EnhancedJob,
  BasicJob,
  NormalizedJob,
  Achievement,
} from '../types/index.js';
import { isEnhancedJob, isBasicJob } from '../types/index.js';

/**
 * Normalize a job to the common format
 */
export function normalizeJob(job: Job): NormalizedJob {
  if (isEnhancedJob(job)) {
    return normalizeEnhancedJob(job);
  }
  if (isBasicJob(job)) {
    return normalizeBasicJob(job);
  }
  throw new Error('Unknown job format');
}

/**
 * Normalize an enhanced job format
 */
function normalizeEnhancedJob(job: EnhancedJob): NormalizedJob {
  const technologies = collectTechnologies(job);
  const achievements = normalizeAchievements(job.achievements);
  const responsibilities = collectResponsibilities(job.responsibilities);

  return {
    companyName: job.company.name,
    companyDescription: job.company.description,
    companyInfo: job.company,
    title: job.role.title,
    level: job.role.level,
    location: job.company.location ?? 'Remote',
    startDate: job.duration.start,
    endDate: job.duration.end,
    durationMonths: job.duration.totalMonths ?? calculateMonths(job.duration.start, job.duration.end),
    technologies,
    projects: job.projects ?? [],
    achievements,
    responsibilities,
    relevanceWeights: job.relevanceWeights,
    keywords: job.keywords,
    workStyle: job.context?.workStyle,
  };
}

/**
 * Normalize a basic job format
 */
function normalizeBasicJob(job: BasicJob): NormalizedJob {
  const achievements: Achievement[] = (job.achievements ?? []).map((desc) => ({
    description: desc,
    quantifiable: /\d+%?/.test(desc),
  }));

  // Handle both flat startDate/endDate and nested duration object
  const jobAny = job as BasicJob & { duration?: { start: string; end?: string }; companyDescription?: string };
  const startDate = job.startDate ?? jobAny.duration?.start ?? '';
  const endDate = job.endDate ?? jobAny.duration?.end;

  return {
    companyName: job.company,
    companyDescription: job.companyDescription ?? jobAny.companyDescription,
    title: job.position,
    location: job.location ?? '',
    startDate: normalizeDate(startDate),
    endDate: endDate ? normalizeDate(endDate) : undefined,
    durationMonths: calculateMonths(startDate, endDate),
    technologies: job.technologies ?? [],
    projects: [],
    achievements,
    responsibilities: (jobAny as { description?: string[] }).description ?? [],
  };
}

/**
 * Collect all technologies from an enhanced job
 */
function collectTechnologies(job: EnhancedJob): string[] {
  const techs = new Set<string>();

  if (job.technologies) {
    const { languages, frameworks, databases, cloud, devops, tools, mobile, testing } = job.technologies;
    [languages, frameworks, databases, cloud, devops, tools, mobile, testing]
      .filter((arr): arr is string[] => Array.isArray(arr))
      .flat()
      .forEach((t) => techs.add(t));
  }

  // Also collect from projects
  job.projects?.forEach((p) => {
    p.technologies?.forEach((t) => techs.add(t));
  });

  return Array.from(techs);
}

/**
 * Normalize achievements to common format
 */
function normalizeAchievements(achievements?: Achievement[]): Achievement[] {
  if (!achievements) return [];
  return achievements.map((a) => ({
    ...a,
    quantifiable: a.quantifiable ?? /\d+%?/.test(a.description),
  }));
}

/**
 * Collect all responsibilities into a flat list
 */
function collectResponsibilities(resp?: {
  primary?: string[];
  secondary?: string[];
  leadership?: string[];
  technical?: string[];
  business?: string[];
}): string[] {
  if (!resp) return [];
  return [
    ...(resp.primary ?? []),
    ...(resp.secondary ?? []),
    ...(resp.leadership ?? []),
    ...(resp.technical ?? []),
    ...(resp.business ?? []),
  ];
}

/**
 * Calculate months between two dates
 */
function calculateMonths(start: string, end?: string): number {
  const startDate = parseDate(start);
  const endDate = end ? parseDate(end) : new Date();

  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());

  return Math.max(1, months);
}

/**
 * Normalize a date string to YYYY-MM format
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';

  // Already in YYYY-MM format
  if (/^\d{4}-\d{2}/.test(dateStr)) {
    return dateStr.slice(0, 7);
  }

  // Parse "Month Year" format (e.g., "May 2017")
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04',
    jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  const parts = dateStr.toLowerCase().split(/\s+/);
  if (parts.length === 2) {
    const monthNum = months[parts[0] ?? ''];
    const year = parts[1];
    if (monthNum && year && /^\d{4}$/.test(year)) {
      return `${year}-${monthNum}`;
    }
  }

  // Try to extract year at least
  const yearMatch = dateStr.match(/\d{4}/);
  if (yearMatch) {
    return `${yearMatch[0]}-01`;
  }

  return dateStr;
}

/**
 * Parse a date string to Date object
 * Handles both YYYY-MM and "Month Year" formats
 */
function parseDate(dateStr: string): Date {
  const normalized = normalizeDate(dateStr);
  const parts = normalized.split('-').map(Number);
  return new Date(parts[0] ?? 2020, (parts[1] ?? 1) - 1, parts[2] ?? 1);
}

/**
 * Get the end year of a job (current year if ongoing)
 */
export function getJobEndYear(job: NormalizedJob): number {
  if (!job.endDate) return new Date().getFullYear();
  return parseInt(job.endDate.split('-')[0] ?? String(new Date().getFullYear()), 10);
}

/**
 * Get all unique technologies from multiple jobs
 */
export function getAllTechnologies(jobs: NormalizedJob[]): string[] {
  const techs = new Set<string>();
  jobs.forEach((job) => {
    job.technologies.forEach((t) => techs.add(t));
  });
  return Array.from(techs);
}
