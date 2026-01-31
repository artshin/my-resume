/**
 * Transform match results and profile data into template-ready format
 */

import type { ResumeTemplateData } from './template-renderer.js';
import type {
  MatchResult,
  Profile,
  EducationData,
  NormalizedJob,
  ScoredSkill,
} from '../types/index.js';
import { processBullets } from './bullet-deduplicator.js';
import { processTechnologies } from './technology-filter.js';

export interface TransformOptions {
  /** Maximum bullets per job */
  maxBulletsPerJob?: number;
  /** Show projects section */
  showProjects?: boolean;
  /** Use two-page layout */
  twoPage?: boolean;
  /** Use compact layout */
  compact?: boolean;
  /** Group skills by category */
  groupSkills?: boolean;
  /** Custom summary override */
  customSummary?: string;
  /** Maximum highlighted skills (default: 5) - "less is more" strategy */
  maxHighlightedSkills?: number;
}

/** Maximum highlighted skills - "less is more" for specialist appearance */
const MAX_HIGHLIGHTED_SKILLS = 5;

const DEFAULT_OPTIONS: TransformOptions = {
  maxBulletsPerJob: 4,
  showProjects: false,
  twoPage: false,
  compact: false,
  groupSkills: false,
  maxHighlightedSkills: MAX_HIGHLIGHTED_SKILLS,
};

/**
 * Transform profile, education, and match result into template data
 */
export function transformToTemplateData(
  profile: Profile,
  education: EducationData,
  matchResult: MatchResult,
  jobs: NormalizedJob[],
  options: TransformOptions = {}
): ResumeTemplateData {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Build profile section
  const profileData = {
    name: profile.name,
    email: profile.contact.email,
    phone: profile.contact.phone,
    location: profile.contact.location,
    linkedin: profile.contact.linkedin,
    github: profile.contact.github,
    website: profile.contact.website,
    websiteLabel: profile.contact.website ? extractDomain(profile.contact.website) : undefined,
  };

  // Get summary (use custom or generate based on match)
  const summary = opts.customSummary ?? selectSummary(profile, matchResult);

  // Transform skills (with "less is more" limit)
  const skills = transformSkills(
    matchResult.selectedSkills,
    opts.groupSkills ?? false,
    opts.maxHighlightedSkills ?? MAX_HIGHLIGHTED_SKILLS
  );

  // Transform experience
  const experience = transformExperience(jobs, matchResult, opts.maxBulletsPerJob ?? 4);

  // Transform education
  const educationData = transformEducation(education);

  // Transform projects if showing
  const projects = opts.showProjects
    ? matchResult.selectedProjects.slice(0, 3).map((p) => ({
        name: p.name,
        description: p.description,
        technologies: p.matchedTechnologies.join(', '),
        impact: p.impact,
      }))
    : undefined;

  return {
    profile: profileData,
    summary,
    skills,
    experience,
    projects,
    education: educationData,
    options: {
      twoPage: opts.twoPage,
      compact: opts.compact,
      showProjects: opts.showProjects,
    },
  };
}

/**
 * Select appropriate summary based on match
 */
function selectSummary(profile: Profile, matchResult: MatchResult): string {
  // Check if we have template summaries
  const templates = (profile as { summary?: { templates?: Record<string, string> } }).summary?.templates;
  if (!templates) {
    return profile.summary;
  }

  // Select based on requirements
  const req = matchResult.requirements;

  if (req.leadershipRequired || req.seniority === 'lead' || req.seniority === 'manager') {
    return templates.leadership ?? profile.summary;
  }

  // Check for mobile focus
  const mobileTechs = ['Swift', 'Kotlin', 'iOS', 'Android', 'React Native'];
  if (req.requiredTechnologies.some((t) => mobileTechs.includes(t))) {
    return templates.mobile ?? profile.summary;
  }

  // Check company type
  if (req.companyType === 'startup' || req.companyType === 'scaleup') {
    return templates.startup ?? profile.summary;
  }

  if (req.companyType === 'enterprise' || req.companyType === 'faang') {
    return templates.enterprise ?? profile.summary;
  }

  return profile.summary;
}

/**
 * Transform skills for template
 *
 * Implements "less is more" strategy: limit highlighted skills to appear
 * as a specialist rather than a generalist. Research shows that listing
 * 2-5 core skills is more effective than 8+ skills.
 */
function transformSkills(
  skills: ScoredSkill[],
  grouped: boolean,
  maxHighlighted: number
): ResumeTemplateData['skills'] {
  if (grouped) {
    // Group skills by category
    const categories: Record<string, string[]> = {};

    for (const skill of skills) {
      const category = getSkillCategory(skill);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(skill.name);
    }

    return {
      highlighted: [],
      grouped: true,
      categories: Object.entries(categories).map(([label, items]) => ({
        label,
        items: items.join(', '),
      })),
    };
  }

  // Inline layout with "less is more" strategy
  // Sort by relevance score (required first, then by match score)
  const sortedSkills = [...skills].sort((a, b) => {
    // Required skills first
    if (a.isRequired && !b.isRequired) return -1;
    if (!a.isRequired && b.isRequired) return 1;
    // Then preferred
    if (a.isPreferred && !b.isPreferred) return -1;
    if (!a.isPreferred && b.isPreferred) return 1;
    // Then by score
    return b.score - a.score;
  });

  // Take only top N skills for highlighted (specialist appearance)
  const requiredOrPreferred = sortedSkills.filter((s) => s.isRequired || s.isPreferred);
  const highlighted = requiredOrPreferred.slice(0, maxHighlighted).map((s) => s.name);

  // Remaining required/preferred go to additional, plus other high-scoring skills
  const highlightedSet = new Set(highlighted);
  const additional = sortedSkills
    .filter((s) => !highlightedSet.has(s.name))
    .slice(0, 8) // Limit additional skills too
    .map((s) => s.name);

  return {
    highlighted,
    additional,
    grouped: false,
  };
}

/**
 * Get category label for a skill
 */
function getSkillCategory(skill: ScoredSkill): string {
  // This would ideally use the category from skills.json
  // For now, make educated guesses based on skill name
  const languages = ['JavaScript', 'TypeScript', 'Swift', 'Kotlin', 'Python', 'Go', 'Rust', 'Java', 'Ruby'];
  const mobile = ['React Native', 'UIKit', 'SwiftUI', 'Jetpack Compose', 'Expo', 'iOS', 'Android'];
  const cloud = ['AWS', 'GCP', 'Azure', 'Firebase', 'Supabase'];
  const devops = ['Docker', 'Kubernetes', 'GitHub Actions', 'GitLab CI', 'Fastlane', 'CI/CD'];

  if (languages.includes(skill.name)) return 'Languages';
  if (mobile.includes(skill.name)) return 'Mobile';
  if (cloud.includes(skill.name)) return 'Cloud';
  if (devops.includes(skill.name)) return 'DevOps';
  return 'Tools';
}

/**
 * Transform experience for template
 */
function transformExperience(
  jobs: NormalizedJob[],
  matchResult: MatchResult,
  maxBullets: number
): ResumeTemplateData['experience'] {
  return jobs
    .sort((a, b) => {
      // Current job (no end date or "Present") ALWAYS first
      const aIsCurrent = !a.endDate || a.endDate.toLowerCase() === 'present';
      const bIsCurrent = !b.endDate || b.endDate.toLowerCase() === 'present';
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;

      // Then sort by relevance rank (lower is better)
      const aRank = matchResult.rankedJobs.findIndex((j) => j.companyName === a.companyName);
      const bRank = matchResult.rankedJobs.findIndex((j) => j.companyName === b.companyName);
      if (aRank !== bRank) return aRank - bRank;

      // Then by date (most recent first)
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    })
    .slice(0, 4) // Max 4 jobs
    .map((job) => {
      // Get bullets from achievements and responsibilities
      const bullets = generateBullets(job, matchResult, maxBullets);

      // Filter and prioritize technologies
      const technologies = processTechnologies(job.technologies, { maxCount: 8 });

      return {
        company: job.companyName,
        title: job.title,
        location: job.location,
        dates: formatDateRange(job.startDate, job.endDate),
        companyDescription: job.companyDescription,
        technologies,
        bullets,
      };
    });
}

/**
 * Generate bullet points for a job
 */
function generateBullets(
  job: NormalizedJob,
  _matchResult: MatchResult,
  maxBullets: number
): string[] {
  const allBullets: string[] = [];

  // Collect achievements (prioritized)
  for (const achievement of job.achievements) {
    allBullets.push(achievement.description);
  }

  // Collect responsibilities
  for (const resp of job.responsibilities) {
    allBullets.push(resp);
  }

  // Process: deduplicate and sort by impact, then limit
  return processBullets(allBullets, maxBullets);
}

/**
 * Transform education for template
 */
function transformEducation(education: EducationData): ResumeTemplateData['education'] {
  return (education.education ?? []).map((edu) => ({
    degree: edu.degree ?? 'Degree',
    field: edu.field,
    institution: edu.institution,
    year: edu.graduationYear,
  }));
}

/**
 * Format date range for display
 */
function formatDateRange(start: string, end?: string): string {
  const formatDate = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month ?? '1', 10) - 1]} ${year}`;
  };

  const startFormatted = formatDate(start);
  const endFormatted = end ? formatDate(end) : 'Present';

  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Extract domain from URL for display
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}
