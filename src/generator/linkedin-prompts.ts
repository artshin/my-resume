/**
 * LinkedIn Profile Generation Prompts
 *
 * Research-informed prompts for generating LinkedIn content using Ollama LLM.
 * Based on 2025-2026 LinkedIn best practices and recruiter insights.
 */

import type { Profile, SkillsData, NormalizedJob } from '../types/index.js';

/**
 * Context extracted from profile data for LLM prompts
 */
export interface LinkedInContext {
  name: string;
  yearsExperience: number;
  currentRole: string;
  currentCompany: string;
  targetRole: string;
  topTech: string[];
  topSkills: string[];
  domains: string[];
  notableCompanies: string[];
  achievements: string[];
  topAchievement: string;
  targetRoles: string[];
  location: string;
}

/**
 * Build context from profile data for prompt generation
 */
export function buildLinkedInContext(
  profile: Profile,
  skills: SkillsData,
  jobs: NormalizedJob[]
): LinkedInContext {
  // Calculate years of experience
  const yearsExperience = calculateYearsExperience(jobs);

  // Get current role info
  const currentJob = jobs[0];
  const currentRole = currentJob?.title ?? 'Senior Mobile Engineer';
  const currentCompany = currentJob?.companyName ?? '';

  // Extract top technologies from job history (most frequently used)
  const topTech = extractTopTechnologies(jobs, 5);

  // Get featured skills
  const topSkills = skills.featured.slice(0, 6);

  // Get domain expertise
  const domains = skills.categories.domains
    .filter((d) => d.level === 'expert' || d.level === 'advanced')
    .map((d) => d.name);

  // Extract notable companies
  const notableCompanies = jobs
    .filter((j) => j.companyDescription)
    .slice(0, 4)
    .map((j) => j.companyName);

  // Collect best achievements (with metrics)
  const achievements = jobs
    .flatMap((j) => j.achievements)
    .filter((a) => a.metrics || a.quantifiable)
    .slice(0, 5)
    .map((a) => a.description);

  // Get top achievement for headline
  const topAchievement = achievements[0] ?? 'Building scalable mobile apps';

  // Target roles
  const targetRoles = profile.targetRoles ?? ['Senior Mobile Engineer'];
  const targetRole = targetRoles[0] ?? 'Senior Mobile Engineer';

  // Location
  const location = profile.contact.location.split(',')[0] ?? '';

  return {
    name: profile.name,
    yearsExperience,
    currentRole,
    currentCompany,
    targetRole,
    topTech,
    topSkills,
    domains,
    notableCompanies,
    achievements,
    topAchievement,
    targetRoles,
    location,
  };
}

/**
 * Build prompt for generating LinkedIn headlines
 */
export function buildHeadlinesPrompt(context: LinkedInContext): string {
  return `Generate 3 LinkedIn headlines for a ${context.targetRole}.

CANDIDATE:
- Years Experience: ${context.yearsExperience}
- Current Role: ${context.currentRole}${context.currentCompany ? ` at ${context.currentCompany}` : ''}
- Top Technologies: ${context.topTech.join(', ')}
- Domain Expertise: ${context.domains.join(', ') || 'Mobile Development'}
- Notable Companies: ${context.notableCompanies.join(', ') || 'Various startups and enterprises'}
- Key Achievement: ${context.topAchievement}

RULES:
- Maximum 120 characters each (optimized for visibility - first 100 chars most important)
- Formula: [Role] | [2-3 technologies] | [Impact/value statement]
- NEVER use: "passionate", "guru", "ninja", "rockstar", "dedicated", "expert", "driven"
- Include specific numbers when possible (years, users, scale)
- Each headline targets a different audience
- Be specific, not generic
- Depth > breadth (2-3 technologies, not 10)

GOOD EXAMPLES:
- "Senior Mobile Engineer | 10+ Years iOS & Android | Shipped apps to 500K+ users"
- "React Native Developer | Fintech & Crypto | Ex-Wave Financial"
- "Mobile Architect | CI/CD Obsessed | Building wallet infrastructure"

Return ONLY valid JSON in this exact format:
{
  "forRecruiters": "focus on role, years, searchable skills",
  "forClients": "focus on value delivered, outcomes, industries",
  "forPeers": "focus on technical depth, craft, what you build"
}`;
}

/**
 * Build prompt for generating About section
 */
export function buildAboutPrompt(context: LinkedInContext): string {
  return `Write a LinkedIn About section for a mobile engineer.

CANDIDATE:
- Name: ${context.name}
- Years: ${context.yearsExperience}
- Current Role: ${context.currentRole}${context.currentCompany ? ` at ${context.currentCompany}` : ''}
- Top Skills: ${context.topSkills.join(', ')}
- Notable Companies: ${context.notableCompanies.join(', ') || 'Various tech companies'}
- Key Achievements:
${context.achievements.map((a) => `- ${a}`).join('\n') || '- Building scalable mobile applications'}
- Domains: ${context.domains.join(', ') || 'Mobile Development'}
- Target Roles: ${context.targetRoles.join(', ')}
- Location: ${context.location}

STRUCTURE (follow exactly):
1. HOOK (first 3 lines, ~150 chars) - Compelling opening that makes reader want to click "see more"
2. JOURNEY - Brief career arc, what drives you (2-3 sentences)
3. EXPERTISE - Specific skills with quantified achievements (2-3 sentences)
4. IMPACT - Scale of what you've built (users, apps, companies) (1-2 sentences)
5. CTA - End with: "Building something interesting? Let's connect."

RULES:
- Write in FIRST PERSON ("I", not "they" or third person)
- Maximum 2,000 characters
- Use whitespace/line breaks between sections for readability
- Quantify everything possible (users, %, scale, years)
- NO buzzwords ("passionate", "driven", "results-oriented", "dedicated")
- Be authentic and human, not corporate
- End with skills list on new line for SEO: "Skills: [skill1], [skill2], ..."

GOOD HOOK EXAMPLES:
- "${context.yearsExperience} years ago I shipped my first app. It crashed constantly. Since then, I've learned a few things."
- "500K+ users trust apps I've built. Here's how I got here."
- "I build mobile apps that people actually use—and keep using."

Return ONLY the about text, no quotes, no explanation, no markdown formatting.`;
}

/**
 * Build prompt for generating experience description
 */
export function buildExperiencePrompt(job: NormalizedJob): string {
  const responsibilitiesText = job.responsibilities.slice(0, 5).join('; ');
  const achievementsText = job.achievements
    .slice(0, 3)
    .map((a) => a.description)
    .join('; ');
  const techText = job.technologies.join(', ');

  return `Write a LinkedIn experience description for this role.

JOB:
- Company: ${job.companyName}
- Title: ${job.title}
- Duration: ${job.startDate} - ${job.endDate || 'Present'}
- Location: ${job.location || 'Remote'}
- Responsibilities: ${responsibilitiesText || 'Mobile app development'}
- Achievements: ${achievementsText || 'Delivered high-quality mobile applications'}
- Technologies: ${techText || 'Mobile development stack'}

FORMAT (use this exact structure):
• [Bullet 1: Key responsibility with outcome - what you did and what resulted]
• [Bullet 2: Key responsibility with outcome]

✓ [Achievement with metric - quantified impact]
✓ [Achievement with metric]

Tech: [tech · separated · by · dots]

RULES:
- Maximum 1,500 characters total
- Lead with OUTCOMES not duties (not "Responsible for...")
- Quantify everything possible (%, users, time saved, scale)
- Use strong action verbs: Led, Architected, Shipped, Reduced, Built, Migrated
- NEVER start bullets with "Responsible for" or "Worked on"
- Tech section: use middot (·) to separate technologies
- 2-3 bullets max, 2 achievements max

Return ONLY the description text, no quotes, no explanation.`;
}

// Helper functions

function calculateYearsExperience(jobs: NormalizedJob[]): number {
  if (jobs.length === 0) return 0;

  const startDates = jobs.map((job) => {
    const parts = job.startDate.split(' ');
    const yearStr = parts[parts.length - 1] ?? '';
    const year = parseInt(yearStr, 10);
    return isNaN(year) ? new Date().getFullYear() : year;
  });

  const earliestYear = Math.min(...startDates);
  const currentYear = new Date().getFullYear();

  return currentYear - earliestYear;
}

function extractTopTechnologies(jobs: NormalizedJob[], limit = 5): string[] {
  const techCounts = new Map<string, number>();

  for (const job of jobs) {
    for (const tech of job.technologies) {
      techCounts.set(tech, (techCounts.get(tech) || 0) + 1);
    }
  }

  return Array.from(techCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tech]) => tech);
}
