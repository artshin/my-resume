/**
 * Technology matching with fuzzy search
 */

import type { Skill, SkillsData } from '../types/index.js';

/**
 * Technology aliases for fuzzy matching
 */
const TECH_ALIASES: Record<string, string[]> = {
  JavaScript: ['JS', 'javascript', 'es6', 'ecmascript', 'es2015', 'es2020'],
  TypeScript: ['TS', 'typescript'],
  'React Native': ['react-native', 'RN', 'reactnative'],
  React: ['reactjs', 'react.js'],
  'Node.js': ['nodejs', 'node', 'node.js'],
  'Next.js': ['nextjs', 'next.js', 'next'],
  Swift: ['swift', 'ios'],
  Kotlin: ['kotlin', 'android'],
  'Objective-C': ['objc', 'objective-c', 'obj-c'],
  PostgreSQL: ['postgres', 'postgresql', 'psql', 'pg'],
  MongoDB: ['mongo', 'mongodb'],
  MySQL: ['mysql'],
  Redis: ['redis'],
  Docker: ['docker', 'containers'],
  Kubernetes: ['k8s', 'kubernetes', 'kube'],
  AWS: ['aws', 'amazon web services', 's3', 'ec2', 'lambda'],
  GCP: ['gcp', 'google cloud', 'google cloud platform'],
  Azure: ['azure', 'microsoft azure'],
  'GitHub Actions': ['github actions', 'gha', 'github-actions'],
  'GitLab CI': ['gitlab ci', 'gitlab-ci', 'gitlab pipelines'],
  CircleCI: ['circleci', 'circle ci', 'circle-ci'],
  Fastlane: ['fastlane'],
  Firebase: ['firebase', 'firestore'],
  GraphQL: ['graphql', 'gql'],
  REST: ['rest', 'restful', 'rest api'],
  UIKit: ['uikit', 'ui kit'],
  SwiftUI: ['swiftui', 'swift ui'],
  'Jetpack Compose': ['jetpack compose', 'compose', 'android compose'],
  Jest: ['jest'],
  Cypress: ['cypress'],
  XCTest: ['xctest', 'xcode testing'],
  Expo: ['expo', 'expo-cli', 'eas'],
  NestJS: ['nestjs', 'nest.js', 'nest'],
  Fastify: ['fastify'],
  Express: ['express', 'expressjs', 'express.js'],
  Python: ['python', 'py', 'python3'],
  Go: ['golang', 'go'],
  Rust: ['rust', 'rustlang'],
  Ruby: ['ruby', 'rails', 'ruby on rails'],
  Java: ['java', 'jvm'],
  SQLite: ['sqlite', 'sqlite3'],
  Supabase: ['supabase'],
  Heroku: ['heroku'],
  Dokku: ['dokku'],
  Ansible: ['ansible'],
  Terraform: ['terraform', 'tf'],
};

/**
 * Normalize a technology name for comparison
 */
export function normalizeTechName(tech: string): string {
  const lower = tech.toLowerCase().trim();

  // Check aliases
  for (const [canonical, aliases] of Object.entries(TECH_ALIASES)) {
    if (aliases.includes(lower) || canonical.toLowerCase() === lower) {
      return canonical;
    }
  }

  // Return with first letter capitalized
  return tech.charAt(0).toUpperCase() + tech.slice(1);
}

/**
 * Check if two technology names match (fuzzy)
 */
export function techMatches(tech1: string, tech2: string): boolean {
  const norm1 = normalizeTechName(tech1).toLowerCase();
  const norm2 = normalizeTechName(tech2).toLowerCase();

  if (norm1 === norm2) return true;

  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Check for common variations
  const clean1 = norm1.replace(/[.\-_\s]/g, '');
  const clean2 = norm2.replace(/[.\-_\s]/g, '');
  return clean1 === clean2;
}

/**
 * Find matching technologies between two lists
 */
export function findMatchingTechs(
  candidateTechs: string[],
  requiredTechs: string[]
): { matched: string[]; missing: string[] } {
  const matched: string[] = [];
  const missing: string[] = [];

  for (const required of requiredTechs) {
    const found = candidateTechs.some((c) => techMatches(c, required));
    if (found) {
      matched.push(normalizeTechName(required));
    } else {
      missing.push(normalizeTechName(required));
    }
  }

  return { matched, missing };
}

/**
 * Find skills that match required technologies
 */
export function findMatchingSkills(
  skills: SkillsData,
  requiredTechs: string[],
  preferredTechs: string[]
): { required: Skill[]; preferred: Skill[]; other: Skill[] } {
  const allSkills = getAllSkills(skills);
  const required: Skill[] = [];
  const preferred: Skill[] = [];
  const other: Skill[] = [];

  for (const skill of allSkills) {
    const matchesRequired = requiredTechs.some(
      (t) => techMatches(skill.name, t) || skill.keywords?.some((k) => techMatches(k, t))
    );
    const matchesPreferred = preferredTechs.some(
      (t) => techMatches(skill.name, t) || skill.keywords?.some((k) => techMatches(k, t))
    );

    if (matchesRequired) {
      required.push(skill);
    } else if (matchesPreferred) {
      preferred.push(skill);
    } else {
      other.push(skill);
    }
  }

  return { required, preferred, other };
}

/**
 * Get all skills from skills data as a flat array
 */
export function getAllSkills(skills: SkillsData): Skill[] {
  const all: Skill[] = [];
  const categories = skills.categories;

  for (const category of Object.values(categories)) {
    if (Array.isArray(category)) {
      all.push(...category);
    }
  }

  return all;
}

/**
 * Calculate technology coverage score
 */
export function calculateTechCoverage(
  candidateTechs: string[],
  requiredTechs: string[],
  preferredTechs: string[]
): {
  requiredCoverage: number;
  preferredCoverage: number;
  overallCoverage: number;
  matchedRequired: string[];
  matchedPreferred: string[];
} {
  const reqResult = findMatchingTechs(candidateTechs, requiredTechs);
  const prefResult = findMatchingTechs(candidateTechs, preferredTechs);

  const requiredCoverage = requiredTechs.length > 0 ? reqResult.matched.length / requiredTechs.length : 1;
  const preferredCoverage = preferredTechs.length > 0 ? prefResult.matched.length / preferredTechs.length : 1;

  // Weight required more heavily
  const overallCoverage = requiredCoverage * 0.7 + preferredCoverage * 0.3;

  return {
    requiredCoverage,
    preferredCoverage,
    overallCoverage,
    matchedRequired: reqResult.matched,
    matchedPreferred: prefResult.matched,
  };
}

/**
 * Check if a technology is deprecated based on skills data
 */
export function isDeprecated(tech: string, skills: SkillsData): boolean {
  return skills.deprecated.some((d) => techMatches(d, tech));
}

/**
 * Check if a technology is featured based on skills data
 */
export function isFeatured(tech: string, skills: SkillsData): boolean {
  return skills.featured.some((f) => techMatches(f, tech));
}
