/**
 * Technology list filtering and cleanup
 * Removes obvious/redundant tools and limits list length
 */

/**
 * Tools that are too obvious to include (everyone uses these)
 */
const OBVIOUS_TOOLS = [
  'Git',
  'VS Code',
  'Visual Studio Code',
  'Xcode',
  'Android Studio',
  'npm',
  'yarn',
  'pnpm',
  'ESLint',
  'Prettier',
  'Slack',
  'Jira',
  'Confluence',
  'Notion',
  'Figma',
  'Postman',
];

/**
 * Redundant pairs - if first exists, remove second
 * [keep, remove]
 */
const REDUNDANT_PAIRS: [string, string][] = [
  ['Self-hosted runners', 'Self-hosted infrastructure'],
  ['Jest', 'Unit Testing'],
  ['Jest', 'Automated testing'],
  ['Detox', 'E2E Testing'],
  ['Cypress', 'E2E Testing'],
  ['React Native', 'Mobile development'],
  ['Expo', 'Expo CLI'],
  ['TypeScript', 'JavaScript'], // TS implies JS knowledge
  ['GitHub Actions', 'CI/CD'],
  ['Fastlane', 'App deployment'],
  ['iOS', 'UIKit'], // iOS implies UIKit unless SwiftUI specified
  ['Android', 'Android SDK'],
  ['PostgreSQL', 'SQL'],
  ['MySQL', 'SQL'],
  ['SQLite', 'SQL'],
  ['AWS', 'Cloud'],
  ['GCP', 'Cloud'],
  ['Azure', 'Cloud'],
  ['React Testing Library', 'Testing'],
  ['XCTest', 'Testing'],
];

/**
 * Generic/vague terms to remove
 */
const VAGUE_TERMS = [
  'Mobile development',
  'Web development',
  'Software development',
  'App development',
  'Programming',
  'Coding',
  'Development',
  'Testing',
  'Cloud',
  'CI/CD',
  'Agile',
  'Scrum',
];

/**
 * Check if a technology should be filtered out
 */
function shouldFilter(
  tech: string,
  allTechs: string[],
  options: FilterOptions
): boolean {
  const techLower = tech.toLowerCase();

  // Filter obvious tools
  if (options.removeObvious) {
    if (OBVIOUS_TOOLS.some(t => t.toLowerCase() === techLower)) {
      return true;
    }
  }

  // Filter vague terms
  if (options.removeVague) {
    if (VAGUE_TERMS.some(t => t.toLowerCase() === techLower)) {
      return true;
    }
  }

  // Filter redundant (if the "keep" version exists, filter the "remove" version)
  if (options.removeRedundant) {
    for (const [keep, remove] of REDUNDANT_PAIRS) {
      if (tech.toLowerCase() === remove.toLowerCase()) {
        if (allTechs.some(t => t.toLowerCase() === keep.toLowerCase())) {
          return true;
        }
      }
    }
  }

  return false;
}

export interface FilterOptions {
  /** Maximum number of technologies to include */
  maxCount?: number;
  /** Remove obvious tools everyone uses */
  removeObvious?: boolean;
  /** Remove vague/generic terms */
  removeVague?: boolean;
  /** Remove redundant technologies when better alternative exists */
  removeRedundant?: boolean;
}

const DEFAULT_OPTIONS: FilterOptions = {
  maxCount: 8,
  removeObvious: true,
  removeVague: true,
  removeRedundant: true,
};

/**
 * Filter and clean up a technology list
 */
export function filterTechnologies(
  technologies: string[],
  options: FilterOptions = {}
): string[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Remove duplicates (case-insensitive)
  const seen = new Set<string>();
  const unique = technologies.filter(tech => {
    const lower = tech.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  // Apply filters
  const filtered = unique.filter(tech => !shouldFilter(tech, unique, opts));

  // Limit count
  return filtered.slice(0, opts.maxCount);
}

/**
 * Prioritize technologies based on relevance
 * Puts more important/specific technologies first
 */
export function prioritizeTechnologies(technologies: string[]): string[] {
  const priority: Record<string, number> = {
    // Frameworks/platforms (highest priority)
    'expo': 10,
    'react native': 10,
    'react': 9,
    'next.js': 9,
    'node.js': 9,
    'swift': 9,
    'kotlin': 9,

    // Languages
    'typescript': 8,
    'javascript': 7,
    'python': 8,
    'rust': 8,
    'go': 8,

    // APIs/Protocols
    'graphql': 7,
    'rest api': 7,
    'grpc': 7,

    // State management
    'redux': 6,
    'redux toolkit': 6,
    'mobx': 6,

    // CI/CD tools
    'github actions': 6,
    'fastlane': 6,
    'bitbucket pipelines': 6,
    'eas build': 6,

    // Databases
    'postgresql': 5,
    'mongodb': 5,
    'firebase': 5,

    // Cloud
    'aws': 5,
    'gcp': 5,

    // Testing
    'jest': 4,
    'detox': 4,

    // Platforms (lower, often implied)
    'ios': 3,
    'android': 3,
  };

  return [...technologies].sort((a, b) => {
    const aPriority = priority[a.toLowerCase()] ?? 0;
    const bPriority = priority[b.toLowerCase()] ?? 0;
    return bPriority - aPriority;
  });
}

/**
 * Full technology processing pipeline
 */
export function processTechnologies(
  technologies: string[],
  options: FilterOptions = {}
): string[] {
  const prioritized = prioritizeTechnologies(technologies);
  return filterTechnologies(prioritized, options);
}
