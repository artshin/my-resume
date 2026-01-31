/**
 * Keyword-based fallback extraction when Ollama is unavailable
 */

import type {
  JobRequirements,
  KeywordExtractionResult,
  SeniorityLevel,
  JobDomain,
  WorkArrangement,
} from '../types/index.js';

/**
 * Common technology keywords to look for
 */
const TECH_PATTERNS: Record<string, RegExp> = {
  // Languages
  JavaScript: /\bjavascript\b|\bJS\b/gi,
  TypeScript: /\btypescript\b|\bTS\b/gi,
  Swift: /\bswift\b/gi,
  Kotlin: /\bkotlin\b/gi,
  'Objective-C': /\bobjective-c\b|\bobjc\b/gi,
  Java: /\bjava\b(?!script)/gi,
  Python: /\bpython\b/gi,
  Go: /\bgolang\b|\bgo\s+lang\b/gi,
  Rust: /\brust\b/gi,
  Ruby: /\bruby\b/gi,

  // Mobile
  iOS: /\bios\b/gi,
  Android: /\bandroid\b/gi,
  'React Native': /\breact\s*native\b/gi,
  SwiftUI: /\bswiftui\b/gi,
  UIKit: /\buikit\b/gi,
  'Jetpack Compose': /\bjetpack\s*compose\b|\bcompose\b/gi,
  Expo: /\bexpo\b/gi,

  // Frontend
  React: /\breact\b(?!\s*native)/gi,
  'Next.js': /\bnext\.?js\b|\bnext\s+js\b/gi,
  Vue: /\bvue\.?js\b|\bvue\b/gi,
  Angular: /\bangular\b/gi,

  // Backend
  'Node.js': /\bnode\.?js\b|\bnode\s+js\b/gi,
  Express: /\bexpress\.?js\b|\bexpress\b/gi,
  NestJS: /\bnest\.?js\b/gi,
  Fastify: /\bfastify\b/gi,

  // Databases
  PostgreSQL: /\bpostgres\b|\bpostgresql\b/gi,
  MySQL: /\bmysql\b/gi,
  MongoDB: /\bmongodb\b|\bmongo\b/gi,
  Redis: /\bredis\b/gi,
  SQLite: /\bsqlite\b/gi,
  Firebase: /\bfirebase\b/gi,
  Supabase: /\bsupabase\b/gi,

  // Cloud
  AWS: /\baws\b|\bamazon\s+web\s+services\b/gi,
  GCP: /\bgcp\b|\bgoogle\s+cloud\b/gi,
  Azure: /\bazure\b/gi,

  // DevOps
  Docker: /\bdocker\b/gi,
  Kubernetes: /\bkubernetes\b|\bk8s\b/gi,
  'GitHub Actions': /\bgithub\s*actions\b/gi,
  'CI/CD': /\bci\/?cd\b/gi,
  Fastlane: /\bfastlane\b/gi,
  Terraform: /\bterraform\b/gi,

  // Testing
  Jest: /\bjest\b/gi,
  Cypress: /\bcypress\b/gi,
  XCTest: /\bxctest\b/gi,

  // APIs
  REST: /\brest\b|\brestful\b/gi,
  GraphQL: /\bgraphql\b/gi,
  gRPC: /\bgrpc\b/gi,
};

/**
 * Seniority indicators
 */
const SENIORITY_PATTERNS: Record<SeniorityLevel, RegExp[]> = {
  junior: [/\bjunior\b/gi, /\bentry[- ]level\b/gi, /\b0-2\s*years?\b/gi, /\b1-2\s*years?\b/gi],
  mid: [/\bmid[- ]level\b/gi, /\b2-5\s*years?\b/gi, /\b3-5\s*years?\b/gi, /\bintermediate\b/gi],
  senior: [/\bsenior\b/gi, /\bsr\.?\b/gi, /\b5\+?\s*years?\b/gi, /\b5-8\s*years?\b/gi],
  staff: [/\bstaff\b/gi, /\b8\+?\s*years?\b/gi, /\b10\+?\s*years?\b/gi],
  principal: [/\bprincipal\b/gi, /\barchitect\b/gi, /\bdistinguished\b/gi],
  lead: [/\blead\b/gi, /\btech\s*lead\b/gi, /\bteam\s*lead\b/gi],
  manager: [/\bmanager\b/gi, /\bengineering\s*manager\b/gi, /\bem\b/gi],
  director: [/\bdirector\b/gi, /\bvp\b/gi, /\bhead\s+of\b/gi],
};

/**
 * Domain indicators
 */
const DOMAIN_PATTERNS: Record<JobDomain, RegExp[]> = {
  fintech: [/\bfintech\b/gi, /\bfinancial\b/gi, /\bbanking\b/gi, /\bpayments?\b/gi],
  healthcare: [/\bhealthcare\b/gi, /\bmedical\b/gi, /\bhealth\s*tech\b/gi],
  ecommerce: [/\becommerce\b/gi, /\be-commerce\b/gi, /\bretail\b/gi, /\bmarketplace\b/gi],
  gaming: [/\bgaming\b/gi, /\bgames?\b/gi],
  enterprise: [/\benterprise\b/gi, /\bb2b\b/gi],
  consumer: [/\bconsumer\b/gi, /\bb2c\b/gi],
  saas: [/\bsaas\b/gi, /\bsoftware\s*as\s*a\s*service\b/gi],
  crypto: [/\bcrypto\b/gi, /\bblockchain\b/gi, /\bweb3\b/gi, /\bdefi\b/gi],
  'ai-ml': [/\bai\b/gi, /\bmachine\s*learning\b/gi, /\bml\b/gi, /\bllm\b/gi],
  social: [/\bsocial\b/gi, /\bsocial\s*media\b/gi],
  media: [/\bmedia\b/gi, /\bstreaming\b/gi, /\bcontent\b/gi],
  education: [/\beducation\b/gi, /\bedtech\b/gi, /\blearning\b/gi],
  other: [],
};

/**
 * Work arrangement patterns
 */
const WORK_ARRANGEMENT_PATTERNS: Record<WorkArrangement, RegExp[]> = {
  remote: [/\bremote\b/gi, /\bfully\s*remote\b/gi, /\bwork\s*from\s*home\b/gi, /\bwfh\b/gi],
  hybrid: [/\bhybrid\b/gi, /\bflexible\b/gi],
  onsite: [/\bonsite\b/gi, /\bon-site\b/gi, /\bin[- ]office\b/gi, /\bin[- ]person\b/gi],
};

/**
 * Soft skill and buzzword patterns
 */
const BUZZWORD_PATTERNS = [
  /\bagile\b/gi,
  /\bscrum\b/gi,
  /\bcross[- ]functional\b/gi,
  /\bcollaborat/gi,
  /\bself[- ]starter\b/gi,
  /\bfast[- ]paced\b/gi,
  /\bmentorship\b/gi,
  /\bleadership\b/gi,
  /\bteamwork\b/gi,
  /\bcommunication\b/gi,
  /\bproblem[- ]solving\b/gi,
];

/**
 * Extract technologies from job description
 */
export function extractTechnologies(text: string): string[] {
  const found = new Set<string>();

  for (const [tech, pattern] of Object.entries(TECH_PATTERNS)) {
    if (pattern.test(text)) {
      found.add(tech);
    }
  }

  return Array.from(found);
}

/**
 * Detect seniority level from job description
 */
export function detectSeniority(text: string): SeniorityLevel {
  const scores: Record<SeniorityLevel, number> = {
    junior: 0,
    mid: 0,
    senior: 0,
    staff: 0,
    principal: 0,
    lead: 0,
    manager: 0,
    director: 0,
  };

  for (const [level, patterns] of Object.entries(SENIORITY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[level as SeniorityLevel] += 1;
      }
    }
  }

  // Find highest scoring level
  let maxScore = 0;
  let detectedLevel: SeniorityLevel = 'mid'; // Default

  for (const [level, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLevel = level as SeniorityLevel;
    }
  }

  return detectedLevel;
}

/**
 * Detect domain from job description
 */
export function detectDomain(text: string): JobDomain {
  for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return domain as JobDomain;
      }
    }
  }
  return 'other';
}

/**
 * Detect work arrangement
 */
export function detectWorkArrangement(text: string): WorkArrangement | undefined {
  for (const [arrangement, patterns] of Object.entries(WORK_ARRANGEMENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return arrangement as WorkArrangement;
      }
    }
  }
  return undefined;
}

/**
 * Extract buzzwords
 */
export function extractBuzzwords(text: string): string[] {
  const found = new Set<string>();

  for (const pattern of BUZZWORD_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((m) => found.add(m.toLowerCase()));
    }
  }

  return Array.from(found);
}

/**
 * Extract job title from first lines of job description
 */
export function extractTitle(text: string): string {
  const lines = text.trim().split('\n');
  const firstLine = lines[0]?.trim() ?? '';

  // Check if first line looks like a title (short, no punctuation at end)
  if (firstLine.length < 100 && !firstLine.endsWith('.')) {
    return firstLine;
  }

  // Try to find "Role:", "Position:", "Title:" patterns
  const titleMatch = text.match(/(?:role|position|title|job\s*title)\s*:?\s*([^\n]+)/i);
  if (titleMatch?.[1]) {
    return titleMatch[1].trim();
  }

  return 'Unknown Position';
}

/**
 * Full keyword-based extraction (fallback when Ollama unavailable)
 */
export function keywordBasedExtraction(text: string): JobRequirements {
  const technologies = extractTechnologies(text);
  const seniority = detectSeniority(text);
  const domain = detectDomain(text);
  const workArrangement = detectWorkArrangement(text);
  const buzzwords = extractBuzzwords(text);
  const title = extractTitle(text);

  // Check for leadership/mentorship
  const leadershipRequired =
    /\blead\b|\bleading\b|\bmanag/gi.test(text) || /\bteam\s*lead\b/gi.test(text);
  const mentorshipExpected =
    /\bmentor\b|\bmentoring\b|\bmentorship\b/gi.test(text) ||
    /\bcoach\b|\bcoaching\b/gi.test(text);

  return {
    title,
    seniority,
    department: undefined,
    companyName: undefined,
    companyType: undefined,
    domain: domain !== 'other' ? domain : undefined,
    location: undefined,
    workArrangement,
    requiredTechnologies: technologies,
    preferredTechnologies: [],
    yearsExperience: undefined,
    keyResponsibilities: [],
    leadershipRequired,
    teamSize: undefined,
    mentorshipExpected,
    keywords: technologies,
    buzzwords,
  };
}

/**
 * Quick keyword extraction result
 */
export function quickKeywordExtraction(text: string): KeywordExtractionResult {
  return {
    technologies: extractTechnologies(text),
    seniorityIndicators: [detectSeniority(text)],
    domainIndicators: [detectDomain(text)],
    responsibilities: [],
  };
}
