/**
 * LinkedIn Profile Generator (AI-Powered)
 *
 * Generates LinkedIn-optimized profile content using Ollama LLM.
 * Requires Ollama to be running - no fallback to templates.
 */

import type { Profile, SkillsData, EducationData, Skill, NormalizedJob } from '../types/index.js';
import { getOllamaClient, type OllamaClient } from '../analyzer/ollama-client.js';
import {
  buildLinkedInContext,
  buildHeadlinesPrompt,
  buildAboutPrompt,
  buildExperiencePrompt,
  type LinkedInContext,
} from './linkedin-prompts.js';

/** LinkedIn character limits */
const LINKEDIN_LIMITS = {
  headline: 220,
  about: 2600,
  experienceDescription: 2000,
};

/** LinkedIn profile output structure */
export interface LinkedInProfileOutput {
  headlines: {
    forRecruiters: string;
    forClients: string;
    forPeers: string;
  };
  about: string;
  experience: LinkedInExperience[];
  skills: {
    pinned: string[];
    technical: LinkedInSkill[];
    domains: LinkedInSkill[];
    soft: LinkedInSkill[];
  };
  featured: {
    projects: LinkedInFeaturedItem[];
    githubRepos: LinkedInFeaturedItem[];
  };
  recommendations: {
    profilePhoto: string[];
    bannerImage: string[];
    customUrl: string;
    hashtags: string[];
  };
}

export interface LinkedInExperience {
  company: string;
  title: string;
  duration: string;
  location?: string;
  description: string;
}

export interface LinkedInSkill {
  name: string;
  level: string;
  years: number;
}

export interface LinkedInFeaturedItem {
  name: string;
  description: string;
  url?: string;
}

interface Headlines {
  forRecruiters: string;
  forClients: string;
  forPeers: string;
}

/**
 * Generate complete LinkedIn profile content using AI
 */
export async function generateLinkedInProfile(
  profile: Profile,
  skills: SkillsData,
  _education: EducationData,
  jobs: NormalizedJob[]
): Promise<LinkedInProfileOutput> {
  const client = getOllamaClient();

  // Check Ollama is available (required, no fallback)
  const health = await client.healthCheck();
  if (!health.available || !health.modelLoaded) {
    throw new Error(
      `Ollama required but unavailable: ${health.error ?? 'Unknown error'}. Start with: ollama serve`
    );
  }

  const context = buildLinkedInContext(profile, skills, jobs);

  // Generate AI content in parallel for speed
  const [headlines, about, experiences] = await Promise.all([
    generateHeadlines(client, context),
    generateAbout(client, context),
    generateAllExperiences(client, jobs),
  ]);

  return {
    headlines,
    about,
    experience: experiences,
    skills: extractSkills(skills), // Keep deterministic
    featured: extractFeatured(profile, jobs), // Keep deterministic
    recommendations: getRecommendations(profile), // Keep static
  };
}

/**
 * Generate headlines using AI
 */
async function generateHeadlines(
  client: OllamaClient,
  context: LinkedInContext
): Promise<LinkedInProfileOutput['headlines']> {
  const prompt = buildHeadlinesPrompt(context);
  const response = await client.generateWithRetry(prompt, {
    options: { temperature: 0.7 },
  });

  const parsed = parseJsonResponse<Headlines>(response);
  return {
    forRecruiters: truncate(parsed.forRecruiters, LINKEDIN_LIMITS.headline),
    forClients: truncate(parsed.forClients, LINKEDIN_LIMITS.headline),
    forPeers: truncate(parsed.forPeers, LINKEDIN_LIMITS.headline),
  };
}

/**
 * Generate About section using AI
 */
async function generateAbout(
  client: OllamaClient,
  context: LinkedInContext
): Promise<string> {
  const prompt = buildAboutPrompt(context);
  const response = await client.generateWithRetry(prompt, {
    format: undefined, // Text response, not JSON
    options: { temperature: 0.7 },
  });

  const cleaned = cleanTextResponse(response);
  return truncate(cleaned, LINKEDIN_LIMITS.about);
}

/**
 * Generate all experience descriptions using AI
 */
async function generateAllExperiences(
  client: OllamaClient,
  jobs: NormalizedJob[]
): Promise<LinkedInExperience[]> {
  // Generate experiences in parallel
  const experiencePromises = jobs.map((job) => generateExperience(client, job));
  return Promise.all(experiencePromises);
}

/**
 * Generate single experience description using AI
 */
async function generateExperience(
  client: OllamaClient,
  job: NormalizedJob
): Promise<LinkedInExperience> {
  const prompt = buildExperiencePrompt(job);
  const response = await client.generateWithRetry(prompt, {
    format: undefined, // Text response, not JSON
    options: { temperature: 0.6 },
  });

  return {
    company: job.companyName,
    title: job.title,
    duration: formatDuration(job.startDate, job.endDate),
    location: job.location,
    description: truncate(cleanTextResponse(response), LINKEDIN_LIMITS.experienceDescription),
  };
}

/**
 * Parse JSON response from LLM with error handling
 */
function parseJsonResponse<T>(response: string): T {
  // Try to extract JSON from the response (LLM might include extra text)
  let jsonStr = response.trim();

  // Find JSON object boundaries
  const startIdx = jsonStr.indexOf('{');
  const endIdx = jsonStr.lastIndexOf('}');

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    jsonStr = jsonStr.slice(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    // If parsing fails, return defaults for headlines
    console.warn('Failed to parse JSON response, using defaults');
    return {
      forRecruiters: 'Senior Mobile Engineer | iOS & Android | Building scalable apps',
      forClients: 'Mobile Apps That Scale | React Native, Swift, Kotlin',
      forPeers: 'Mobile Architect | CI/CD & Clean Code',
    } as T;
  }
}

/**
 * Clean text response from LLM (remove quotes, extra whitespace)
 */
function cleanTextResponse(response: string): string {
  let cleaned = response.trim();

  // Remove surrounding quotes if present
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }

  // Remove markdown code blocks if present
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    // Remove first and last lines if they're code block markers
    if (lines[0]?.startsWith('```')) {
      lines.shift();
    }
    if (lines[lines.length - 1]?.startsWith('```')) {
      lines.pop();
    }
    cleaned = lines.join('\n');
  }

  // Normalize whitespace but preserve intentional line breaks
  cleaned = cleaned
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines

  return cleaned.trim();
}

/**
 * Extract skills in structured format (deterministic, no AI)
 */
function extractSkills(skills: SkillsData): LinkedInProfileOutput['skills'] {
  const allSkills: Skill[] = [];

  // Collect all skills from categories
  for (const category of Object.values(skills.categories)) {
    allSkills.push(...category);
  }

  // Sort by level and years
  const sortedSkills = allSkills
    .filter((s) => s.wantToUse)
    .sort((a, b) => {
      const levelOrder = { expert: 4, advanced: 3, intermediate: 2, beginner: 1 };
      const levelDiff = (levelOrder[b.level] || 0) - (levelOrder[a.level] || 0);
      if (levelDiff !== 0) return levelDiff;
      return b.yearsUsed - a.yearsUsed;
    });

  // Get pinned (top 3 from featured)
  const pinned = skills.featured.slice(0, 3);

  // Technical skills (languages, frameworks, mobile, databases, cloud, devops)
  const technicalCategories = [
    'languages',
    'mobile',
    'frameworks',
    'databases',
    'cloud',
    'devops',
    'testing',
    'tools',
  ] as const;

  const technical = sortedSkills
    .filter((s) => {
      for (const cat of technicalCategories) {
        if (
          skills.categories[cat as keyof typeof skills.categories]?.some(
            (cs: Skill) => cs.name === s.name
          )
        ) {
          return true;
        }
      }
      return false;
    })
    .slice(0, 20)
    .map(toLinkedInSkill);

  // Domain expertise
  const domains = (skills.categories.domains || []).filter((s) => s.wantToUse).map(toLinkedInSkill);

  // Soft skills
  const soft = (skills.categories.soft || []).filter((s) => s.wantToUse).map(toLinkedInSkill);

  return { pinned, technical, domains, soft };
}

/**
 * Extract featured items (deterministic, no AI)
 */
function extractFeatured(
  profile: Profile,
  jobs: NormalizedJob[]
): LinkedInProfileOutput['featured'] {
  const projects: LinkedInFeaturedItem[] = [];

  // Extract notable projects from jobs
  for (const job of jobs) {
    for (const project of job.projects) {
      if (project.impact) {
        projects.push({
          name: project.name,
          description: project.impact,
        });
      }
    }
  }

  // If no formal projects, create from achievements
  if (projects.length === 0) {
    for (const job of jobs.slice(0, 3)) {
      for (const achievement of job.achievements.slice(0, 1)) {
        projects.push({
          name: `${job.companyName} - ${job.title}`,
          description: achievement.description,
        });
      }
    }
  }

  // GitHub repos suggestion
  const githubRepos: LinkedInFeaturedItem[] = [];
  if (profile.contact.github) {
    githubRepos.push({
      name: 'Personal Projects',
      description: 'Showcase your best open source work',
      url: profile.contact.github,
    });
  }

  return {
    projects: projects.slice(0, 3),
    githubRepos,
  };
}

/**
 * Get profile optimization recommendations (static)
 */
function getRecommendations(profile: Profile): LinkedInProfileOutput['recommendations'] {
  const name = profile.name.toLowerCase().replace(/\s+/g, '');

  return {
    profilePhoto: [
      'Use a professional headshot with good lighting',
      'Face should take up 60-70% of the frame',
      'Wear what you would to a client meeting',
      'Use a simple, non-distracting background',
    ],
    bannerImage: [
      'Include relevant tech imagery or workspace',
      'Add subtle text with your specialty (e.g., "Mobile Development")',
      'Use your company/project branding if applicable',
      'Dimensions: 1584 x 396 pixels',
    ],
    customUrl: `linkedin.com/in/${name}`,
    hashtags: [
      '#MobileDevelopment',
      '#iOS',
      '#Android',
      '#ReactNative',
      '#DevOps',
      '#Fintech',
      '#SoftwareEngineering',
      '#TechLeadership',
    ],
  };
}

/**
 * Render LinkedIn profile as markdown
 */
export function renderLinkedInMarkdown(output: LinkedInProfileOutput): string {
  const lines: string[] = [];

  lines.push('# LinkedIn Profile Content');
  lines.push('');
  lines.push('> Generated with AI for LinkedIn profile optimization. Copy sections as needed.');
  lines.push('');

  // Headlines
  lines.push('## Headlines (choose one)');
  lines.push('');
  lines.push('### For Recruiters');
  lines.push(`> ${output.headlines.forRecruiters}`);
  lines.push(`> *${output.headlines.forRecruiters.length}/${LINKEDIN_LIMITS.headline} chars*`);
  lines.push('');
  lines.push('### For Clients');
  lines.push(`> ${output.headlines.forClients}`);
  lines.push(`> *${output.headlines.forClients.length}/${LINKEDIN_LIMITS.headline} chars*`);
  lines.push('');
  lines.push('### For Peers');
  lines.push(`> ${output.headlines.forPeers}`);
  lines.push(`> *${output.headlines.forPeers.length}/${LINKEDIN_LIMITS.headline} chars*`);
  lines.push('');

  // About
  lines.push('---');
  lines.push('');
  lines.push('## About');
  lines.push('');
  lines.push('```');
  lines.push(output.about);
  lines.push('```');
  lines.push('');
  lines.push(`*${output.about.length}/${LINKEDIN_LIMITS.about} chars*`);
  lines.push('');

  // Experience
  lines.push('---');
  lines.push('');
  lines.push('## Experience');
  lines.push('');

  for (const exp of output.experience) {
    lines.push(`### ${exp.company}`);
    lines.push(`**${exp.title}** | ${exp.duration}${exp.location ? ` | ${exp.location}` : ''}`);
    lines.push('');
    lines.push('```');
    lines.push(exp.description);
    lines.push('```');
    lines.push('');
  }

  // Skills
  lines.push('---');
  lines.push('');
  lines.push('## Skills (Priority Order)');
  lines.push('');
  lines.push('### Pin These (Top 3)');
  for (let i = 0; i < output.skills.pinned.length; i++) {
    lines.push(`${i + 1}. **${output.skills.pinned[i]}**`);
  }
  lines.push('');

  lines.push('### Technical Skills');
  for (const skill of output.skills.technical) {
    lines.push(`- ${skill.name} (${capitalize(skill.level)}, ${skill.years} years)`);
  }
  lines.push('');

  if (output.skills.domains.length > 0) {
    lines.push('### Domain Expertise');
    for (const skill of output.skills.domains) {
      lines.push(`- ${skill.name} (${capitalize(skill.level)}, ${skill.years} years)`);
    }
    lines.push('');
  }

  if (output.skills.soft.length > 0) {
    lines.push('### Soft Skills');
    for (const skill of output.skills.soft) {
      lines.push(`- ${skill.name}`);
    }
    lines.push('');
  }

  // Featured
  lines.push('---');
  lines.push('');
  lines.push('## Featured Section Suggestions');
  lines.push('');

  if (output.featured.projects.length > 0) {
    lines.push('### Projects to Showcase');
    for (const project of output.featured.projects) {
      lines.push(`- **${project.name}**: ${project.description}`);
    }
    lines.push('');
  }

  if (output.featured.githubRepos.length > 0) {
    lines.push('### GitHub Repos');
    for (const repo of output.featured.githubRepos) {
      lines.push(`- **${repo.name}**: ${repo.description}`);
      if (repo.url) {
        lines.push(`  - ${repo.url}`);
      }
    }
    lines.push('');
  }

  // Recommendations
  lines.push('---');
  lines.push('');
  lines.push('## Profile Optimization');
  lines.push('');

  lines.push('### Profile Photo Guidelines');
  for (const tip of output.recommendations.profilePhoto) {
    lines.push(`- ${tip}`);
  }
  lines.push('');

  lines.push('### Banner Image');
  for (const tip of output.recommendations.bannerImage) {
    lines.push(`- ${tip}`);
  }
  lines.push('');

  lines.push('### Custom URL');
  lines.push(`Claim: \`${output.recommendations.customUrl}\``);
  lines.push('');

  lines.push('### Hashtags to Follow');
  lines.push(output.recommendations.hashtags.join(' '));
  lines.push('');

  return lines.join('\n');
}

// Utility functions

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 3) + '...';
}

function formatDuration(start: string, end?: string): string {
  const endText = end || 'Present';
  return `${start} - ${endText}`;
}

function toLinkedInSkill(skill: Skill): LinkedInSkill {
  return {
    name: skill.name,
    level: skill.level,
    years: skill.yearsUsed,
  };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
