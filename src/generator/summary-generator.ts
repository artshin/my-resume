/**
 * Tailored Summary Generator
 *
 * Uses Ollama LLM to generate a professional summary tailored to the
 * specific job requirements and the candidate's experience.
 */

import type { Profile, MatchResult } from '../types/index.js';
import { getOllamaClient } from '../analyzer/ollama-client.js';

export interface SummaryGeneratorOptions {
  /** Maximum length in words */
  maxWords?: number;
  /** Tone: professional, confident, or conversational */
  tone?: 'professional' | 'confident' | 'conversational';
  /** Focus areas to emphasize */
  focus?: ('technical' | 'leadership' | 'impact' | 'growth')[];
  /** Skip LLM and use template fallback */
  fallback?: boolean;
}

/**
 * "Less is more" strategy: shorter, focused summaries perform better.
 * Research shows recruiters scan quickly - punchy beats comprehensive.
 */
const DEFAULT_OPTIONS: SummaryGeneratorOptions = {
  maxWords: 45,
  tone: 'professional',
  focus: ['technical', 'impact'],
};

/**
 * Build the prompt for summary generation
 *
 * Implements "less is more" strategy:
 * - Focus on role title + 2-3 core skills (not 8+)
 * - One key achievement with numbers
 * - Short and punchy beats comprehensive
 */
function buildSummaryPrompt(
  profile: Profile,
  matchResult: MatchResult,
  options: SummaryGeneratorOptions
): string {
  const req = matchResult.requirements;
  const topJobs = matchResult.rankedJobs.slice(0, 2);

  // "Less is more": only top 3 skills that match the role
  const coreSkills = matchResult.selectedSkills
    .filter((s) => s.isRequired)
    .slice(0, 3)
    .map((s) => s.name);

  // If no required skills matched, take top 3 by score
  const topSkills = coreSkills.length > 0
    ? coreSkills
    : matchResult.selectedSkills.slice(0, 3).map((s) => s.name);

  const focusAreas = options.focus?.join(', ') ?? 'technical skills and impact';
  const toneDescription = {
    professional: 'professional and polished',
    confident: 'confident and achievement-focused',
    conversational: 'approachable yet professional',
  }[options.tone ?? 'professional'];

  return `Generate a focused, punchy resume summary for ${profile.name}.

TARGET POSITION:
- Title: ${req.title}
- Seniority: ${req.seniority}
- Core Technologies: ${req.requiredTechnologies.slice(0, 3).join(', ')}
${req.leadershipRequired ? '- Leadership role: Yes' : ''}

CANDIDATE (focus on these):
- Core Matching Skills: ${topSkills.join(', ')}
- Top Experience: ${topJobs.map((j) => `${j.title} at ${j.companyName}`).join(', ')}

CRITICAL RULES:
- Maximum ${options.maxWords} words (shorter is better)
- Start with: "${req.title} with X+ years..."
- Mention ONLY 2-3 technologies (not 5+)
- Include ONE specific achievement with numbers
- Do NOT use first person ("I am")
- Tone: ${toneDescription}
- Focus: ${focusAreas}

STRATEGY: "Less is more" - appear as a SPECIALIST, not a generalist.
Listing many skills signals junior. Focusing on few signals expert.

GOOD EXAMPLES (notice the focus):
"Senior React Native Developer with 14+ years shipping mobile apps. 500K+ users across fintech apps. Expert in React Native and Expo."

"Staff iOS Engineer with 10+ years building high-performance apps. Led McDonald's Canada mobile team. Deep expertise in Swift and UIKit."

BAD EXAMPLE (too many skills, too long):
"Senior Mobile Engineer with experience in Swift, Kotlin, React Native, TypeScript, JavaScript, UIKit, SwiftUI, Jetpack Compose..."

Generate ONLY the summary text, no quotes or explanation:`;
}

/**
 * Generate a tailored professional summary using LLM
 */
export async function generateTailoredSummary(
  profile: Profile,
  matchResult: MatchResult,
  options: SummaryGeneratorOptions = {}
): Promise<{ summary: string; generated: boolean }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Fallback mode
  if (opts.fallback) {
    return {
      summary: selectTemplateSummary(profile, matchResult),
      generated: false,
    };
  }

  const client = getOllamaClient();
  const health = await client.healthCheck();

  if (!health.available || !health.modelLoaded) {
    console.warn('Ollama unavailable for summary generation, using template fallback');
    return {
      summary: selectTemplateSummary(profile, matchResult),
      generated: false,
    };
  }

  try {
    const prompt = buildSummaryPrompt(profile, matchResult, opts);
    const response = await client.generateWithRetry(prompt);

    // Clean up the response
    let summary = response.trim();

    // Handle JSON-wrapped response
    if (summary.startsWith('{') && summary.includes('"summary"')) {
      try {
        const parsed = JSON.parse(summary);
        summary = parsed.summary ?? summary;
      } catch {
        // Try to extract summary from malformed JSON
        const match = summary.match(/"summary"\s*:\s*"([^"]+)"/);
        if (match) {
          summary = match[1] ?? summary;
        }
      }
    }

    summary = summary
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/^Summary:\s*/i, '') // Remove "Summary:" prefix
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    // Validate length
    const wordCount = summary.split(/\s+/).length;
    if (wordCount > (opts.maxWords ?? 60) * 1.5) {
      // Truncate if too long
      const words = summary.split(/\s+/).slice(0, opts.maxWords);
      summary = words.join(' ');
      // End at a sentence if possible
      const lastPeriod = summary.lastIndexOf('.');
      if (lastPeriod > summary.length * 0.7) {
        summary = summary.slice(0, lastPeriod + 1);
      }
    }

    // Validate it's not empty or too short
    if (summary.length < 50) {
      console.warn('Generated summary too short, using template fallback');
      return {
        summary: selectTemplateSummary(profile, matchResult),
        generated: false,
      };
    }

    return {
      summary,
      generated: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Summary generation failed (${message}), using template fallback`);
    return {
      summary: selectTemplateSummary(profile, matchResult),
      generated: false,
    };
  }
}

/**
 * Select appropriate template summary based on match
 */
function selectTemplateSummary(profile: Profile, matchResult: MatchResult): string {
  // Check if we have template summaries in profile
  const profileAny = profile as Profile & {
    summary?: string | { default?: string; templates?: Record<string, string> };
  };

  const summaryObj = profileAny.summary;

  // If summary is a string, return it directly
  if (typeof summaryObj === 'string') {
    return summaryObj;
  }

  // If summary is undefined, return empty string
  if (!summaryObj) {
    return '';
  }

  // Get templates
  const summaryWithTemplates = summaryObj as { default?: string; templates?: Record<string, string> };
  const templates = summaryWithTemplates.templates;
  const defaultSummary = summaryWithTemplates.default ?? '';

  if (!templates) {
    return defaultSummary;
  }

  const req = matchResult.requirements;

  // Leadership roles
  if (req.leadershipRequired || req.seniority === 'lead' || req.seniority === 'manager' || req.seniority === 'director') {
    return templates.leadership ?? defaultSummary;
  }

  // Mobile focus
  const mobileTechs = ['Swift', 'Kotlin', 'iOS', 'Android', 'React Native', 'Flutter', 'UIKit', 'SwiftUI'];
  if (req.requiredTechnologies.some((t) => mobileTechs.includes(t))) {
    return templates.mobile ?? defaultSummary;
  }

  // Company type
  if (req.companyType === 'startup' || req.companyType === 'scaleup') {
    return templates.startup ?? defaultSummary;
  }

  if (req.companyType === 'enterprise' || req.companyType === 'faang') {
    return templates.enterprise ?? defaultSummary;
  }

  // Architect roles
  if (req.title.toLowerCase().includes('architect') || req.seniority === 'principal') {
    return templates.architect ?? defaultSummary;
  }

  return defaultSummary;
}

/**
 * Enhance an existing summary with job-specific keywords
 */
export function enhanceSummaryWithKeywords(
  summary: string,
  matchResult: MatchResult
): string {
  const topSkills = matchResult.selectedSkills
    .filter((s) => s.isRequired)
    .slice(0, 4)
    .map((s) => s.name);

  // Check if skills are already mentioned
  const missingSkills = topSkills.filter(
    (skill) => !summary.toLowerCase().includes(skill.toLowerCase())
  );

  if (missingSkills.length === 0) {
    return summary;
  }

  // Add expertise mention if skills are missing
  const skillsPhrase = `Expertise in ${missingSkills.join(', ')}.`;

  // Find a good insertion point (after first sentence)
  const firstPeriod = summary.indexOf('.');
  if (firstPeriod > 0 && firstPeriod < summary.length - 10) {
    return summary.slice(0, firstPeriod + 1) + ' ' + skillsPhrase + summary.slice(firstPeriod + 1);
  }

  return summary + ' ' + skillsPhrase;
}
