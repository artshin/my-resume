/**
 * Response parsing and validation for LLM output
 */

import type {
  JobRequirements,
  SeniorityLevel,
  JobDomain,
  CompanyType,
  WorkArrangement,
  AnalysisResult,
} from '../types/index.js';

/**
 * Raw extraction from LLM (before validation)
 */
interface RawExtraction {
  title?: string;
  seniority?: string;
  department?: string;
  companyName?: string;
  companyType?: string;
  domain?: string;
  location?: string;
  workArrangement?: string;
  requiredTechnologies?: string[];
  preferredTechnologies?: string[];
  yearsExperience?: number;
  keyResponsibilities?: string[];
  leadershipRequired?: boolean;
  teamSize?: string;
  mentorshipExpected?: boolean;
  keywords?: string[];
  buzzwords?: string[];
}

const VALID_SENIORITY: SeniorityLevel[] = [
  'junior',
  'mid',
  'senior',
  'staff',
  'principal',
  'lead',
  'manager',
  'director',
];

const VALID_DOMAINS: JobDomain[] = [
  'fintech',
  'healthcare',
  'ecommerce',
  'gaming',
  'enterprise',
  'consumer',
  'saas',
  'crypto',
  'ai-ml',
  'social',
  'media',
  'education',
  'other',
];

const VALID_COMPANY_TYPES: CompanyType[] = [
  'startup',
  'scaleup',
  'enterprise',
  'agency',
  'consulting',
  'faang',
];

const VALID_WORK_ARRANGEMENTS: WorkArrangement[] = ['remote', 'hybrid', 'onsite'];

/**
 * Extract JSON from LLM response (handles markdown code blocks)
 */
export function extractJson(response: string): string {
  // Try to extract from markdown code block first
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object directly
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  throw new Error('No JSON found in response');
}

/**
 * Parse and validate LLM response into JobRequirements
 */
export function parseResponse(response: string): { requirements: JobRequirements; raw: RawExtraction } {
  const jsonStr = extractJson(response);
  const raw = JSON.parse(jsonStr) as RawExtraction;

  const requirements = validateAndNormalize(raw);
  return { requirements, raw };
}

/**
 * Validate and normalize raw extraction into JobRequirements
 */
export function validateAndNormalize(raw: RawExtraction): JobRequirements {
  return {
    title: raw.title ?? 'Unknown Position',
    seniority: normalizeSeniority(raw.seniority),
    department: raw.department ?? undefined,
    companyName: raw.companyName ?? undefined,
    companyType: normalizeCompanyType(raw.companyType),
    domain: normalizeDomain(raw.domain),
    location: raw.location ?? undefined,
    workArrangement: normalizeWorkArrangement(raw.workArrangement),
    requiredTechnologies: normalizeArray(raw.requiredTechnologies),
    preferredTechnologies: normalizeArray(raw.preferredTechnologies),
    yearsExperience: raw.yearsExperience ?? undefined,
    keyResponsibilities: normalizeArray(raw.keyResponsibilities),
    leadershipRequired: raw.leadershipRequired ?? false,
    teamSize: raw.teamSize ?? undefined,
    mentorshipExpected: raw.mentorshipExpected ?? false,
    keywords: normalizeArray(raw.keywords).map(normalizeKeyword),
    buzzwords: normalizeArray(raw.buzzwords).map((s) => s.toLowerCase()),
  };
}

function normalizeSeniority(value: string | undefined): SeniorityLevel {
  if (!value) return 'mid';
  const normalized = value.toLowerCase().trim();
  if (VALID_SENIORITY.includes(normalized as SeniorityLevel)) {
    return normalized as SeniorityLevel;
  }
  // Try to infer from common variations
  if (normalized.includes('sr') || normalized.includes('senior')) return 'senior';
  if (normalized.includes('jr') || normalized.includes('junior')) return 'junior';
  if (normalized.includes('staff')) return 'staff';
  if (normalized.includes('principal') || normalized.includes('architect')) return 'principal';
  if (normalized.includes('lead')) return 'lead';
  if (normalized.includes('manager')) return 'manager';
  if (normalized.includes('director')) return 'director';
  return 'mid';
}

function normalizeDomain(value: string | undefined): JobDomain | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  if (VALID_DOMAINS.includes(normalized as JobDomain)) {
    return normalized as JobDomain;
  }
  // Try to infer from common variations
  if (normalized.includes('finance') || normalized.includes('banking') || normalized.includes('payment')) {
    return 'fintech';
  }
  if (normalized.includes('health') || normalized.includes('medical')) return 'healthcare';
  if (normalized.includes('game') || normalized.includes('gaming')) return 'gaming';
  if (normalized.includes('crypto') || normalized.includes('blockchain') || normalized.includes('web3')) {
    return 'crypto';
  }
  if (normalized.includes('ai') || normalized.includes('ml') || normalized.includes('machine learning')) {
    return 'ai-ml';
  }
  return 'other';
}

function normalizeCompanyType(value: string | undefined): CompanyType | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  if (VALID_COMPANY_TYPES.includes(normalized as CompanyType)) {
    return normalized as CompanyType;
  }
  // Common variations
  if (normalized.includes('startup') || normalized.includes('early stage')) return 'startup';
  if (normalized.includes('scale') || normalized.includes('growth')) return 'scaleup';
  if (normalized.includes('enterprise') || normalized.includes('corporate')) return 'enterprise';
  if (normalized.includes('faang') || normalized.includes('big tech')) return 'faang';
  return undefined;
}

function normalizeWorkArrangement(value: string | undefined): WorkArrangement | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  if (VALID_WORK_ARRANGEMENTS.includes(normalized as WorkArrangement)) {
    return normalized as WorkArrangement;
  }
  if (normalized.includes('remote')) return 'remote';
  if (normalized.includes('hybrid')) return 'hybrid';
  if (normalized.includes('onsite') || normalized.includes('office') || normalized.includes('in-person')) {
    return 'onsite';
  }
  return undefined;
}

function normalizeArray(arr: string[] | undefined): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((item) => typeof item === 'string' && item.trim().length > 0);
}

/**
 * Normalize technology/keyword names for consistent matching
 */
function normalizeKeyword(keyword: string): string {
  const normalized = keyword.trim();
  // Common normalizations
  const mappings: Record<string, string> = {
    'react.js': 'React',
    'reactjs': 'React',
    'react native': 'React Native',
    'node.js': 'Node.js',
    'nodejs': 'Node.js',
    'typescript': 'TypeScript',
    'javascript': 'JavaScript',
    'ios': 'iOS',
    'android': 'Android',
    'swift': 'Swift',
    'kotlin': 'Kotlin',
    'aws': 'AWS',
    'gcp': 'GCP',
    'postgres': 'PostgreSQL',
    'postgresql': 'PostgreSQL',
    'mongodb': 'MongoDB',
    'redis': 'Redis',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'k8s': 'Kubernetes',
  };

  const lower = normalized.toLowerCase();
  return mappings[lower] ?? normalized;
}

/**
 * Calculate confidence scores for the extraction
 */
export function calculateConfidence(requirements: JobRequirements): AnalysisResult['confidence'] {
  let overall = 0.5; // Base confidence
  let seniorityConfidence = 0.5;
  let technologiesConfidence = 0.5;
  let domainConfidence = 0.5;

  // Title presence boosts confidence
  if (requirements.title && requirements.title !== 'Unknown Position') {
    overall += 0.1;
  }

  // Years experience helps confirm seniority
  if (requirements.yearsExperience) {
    seniorityConfidence += 0.2;
    overall += 0.05;
  }

  // More technologies = higher confidence
  const techCount = requirements.requiredTechnologies.length + requirements.preferredTechnologies.length;
  if (techCount >= 5) {
    technologiesConfidence += 0.3;
    overall += 0.1;
  } else if (techCount >= 3) {
    technologiesConfidence += 0.2;
    overall += 0.05;
  }

  // Domain detection
  if (requirements.domain && requirements.domain !== 'other') {
    domainConfidence += 0.3;
    overall += 0.05;
  }

  // Company info
  if (requirements.companyName) {
    overall += 0.05;
  }

  // Keywords presence
  if (requirements.keywords.length >= 5) {
    overall += 0.1;
  }

  return {
    overall: Math.min(overall, 1),
    seniority: Math.min(seniorityConfidence, 1),
    technologies: Math.min(technologiesConfidence, 1),
    domain: Math.min(domainConfidence, 1),
  };
}
