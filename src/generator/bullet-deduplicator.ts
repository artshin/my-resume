/**
 * Bullet point deduplication and impact scoring
 * Prevents repetitive bullets and prioritizes impactful statements
 */

/**
 * Extract key elements from a bullet for comparison
 */
function extractKeyElements(bullet: string): {
  metrics: string[];
  numbers: string[];
  keywords: string[];
} {
  const text = bullet.toLowerCase();

  // Extract metrics (percentages, dollar amounts, multipliers)
  const metrics = text.match(/\d+%|\$[\d.]+[kmb]?|\d+x|\d+\+/gi) ?? [];

  // Extract significant numbers
  const numbers = text.match(/\b\d+\b/g) ?? [];

  // Extract key action/outcome words
  const keywordPatterns = [
    'deployed', 'delivered', 'launched', 'shipped', 'released',
    'reduced', 'increased', 'improved', 'optimized', 'automated',
    'led', 'managed', 'built', 'created', 'developed', 'implemented',
    'migrated', 'integrated', 'designed', 'architected',
    'ci/cd', 'pipeline', 'deployment', 'testing', 'migration',
  ];
  const keywords = keywordPatterns.filter(kw => text.includes(kw));

  return { metrics, numbers, keywords };
}

/**
 * Calculate similarity between two bullets
 * Returns a score from 0 (completely different) to 1 (identical meaning)
 */
function calculateSimilarity(a: string, b: string): number {
  const elemA = extractKeyElements(a);
  const elemB = extractKeyElements(b);

  let similarity = 0;

  // Shared metrics are a strong indicator of duplication
  const sharedMetrics = elemA.metrics.filter(m =>
    elemB.metrics.some(n => m.toLowerCase() === n.toLowerCase())
  );
  if (sharedMetrics.length > 0) {
    similarity += 0.5;
  }

  // Shared significant numbers (like "2 months", "260")
  const significantNumbers = elemA.numbers.filter(n =>
    parseInt(n) > 1 && elemB.numbers.includes(n)
  );
  if (significantNumbers.length > 0) {
    similarity += 0.3;
  }

  // Shared keywords
  const sharedKeywords = elemA.keywords.filter(k => elemB.keywords.includes(k));
  const totalKeywords = new Set([...elemA.keywords, ...elemB.keywords]).size;
  if (totalKeywords > 0) {
    similarity += (sharedKeywords.length / totalKeywords) * 0.2;
  }

  return Math.min(1, similarity);
}

/**
 * Check if two bullets are similar enough to be considered duplicates
 */
export function areSimilarBullets(a: string, b: string, threshold = 0.5): boolean {
  return calculateSimilarity(a, b) >= threshold;
}

/**
 * Remove duplicate/similar bullets from a list
 * Keeps the first occurrence (or the one with higher impact score)
 */
export function deduplicateBullets(bullets: string[]): string[] {
  const unique: string[] = [];

  for (const bullet of bullets) {
    const isDuplicate = unique.some(existing => areSimilarBullets(existing, bullet));
    if (!isDuplicate) {
      unique.push(bullet);
    }
  }

  return unique;
}

/**
 * Score a bullet's impact/quality
 * Higher scores = more impactful, resume-worthy bullets
 */
export function scoreImpact(bullet: string): number {
  const text = bullet.toLowerCase();
  let score = 0.5; // Base score

  // POSITIVE: Has quantified metric (+0.3)
  if (/\d+%|\$[\d.]+[kmb]?|\d+x|\d+\+|\d+k\+/.test(text)) {
    score += 0.3;
  }

  // POSITIVE: Has outcome/result keywords (+0.2)
  const outcomeWords = [
    'reduced', 'increased', 'improved', 'delivered', 'achieved',
    'enabled', 'saved', 'launched', 'shipped', 'completed',
    'optimized', 'accelerated', 'eliminated', 'resolved',
  ];
  if (outcomeWords.some(w => text.includes(w))) {
    score += 0.2;
  }

  // POSITIVE: Has user/business impact (+0.15)
  const impactWords = [
    'users', 'customers', 'revenue', 'cost', 'time', 'team',
    'production', 'performance', 'efficiency', 'quality',
  ];
  if (impactWords.some(w => text.includes(w))) {
    score += 0.15;
  }

  // POSITIVE: Strong action verb at start (+0.1)
  const strongVerbs = [
    'led', 'built', 'designed', 'architected', 'drove', 'spearheaded',
    'delivered', 'launched', 'established', 'transformed', 'pioneered',
  ];
  if (strongVerbs.some(v => text.startsWith(v))) {
    score += 0.1;
  }

  // NEGATIVE: Vague/weak language (-0.2)
  const weakWords = [
    'worked on', 'helped with', 'assisted', 'involved in',
    'responsible for', 'participated', 'contributed to',
  ];
  if (weakWords.some(w => text.includes(w))) {
    score -= 0.2;
  }

  // NEGATIVE: Task description without outcome (-0.15)
  const taskOnlyStarts = ['building', 'implementing', 'developing', 'creating', 'working'];
  const hasOutcome = /\d|result|improv|reduc|increas|enabl/.test(text);
  if (taskOnlyStarts.some(t => text.startsWith(t)) && !hasOutcome) {
    score -= 0.15;
  }

  // NEGATIVE: Too short (likely not detailed enough) (-0.1)
  if (bullet.length < 30) {
    score -= 0.1;
  }

  // NEGATIVE: Too long (hard to scan) (-0.05)
  if (bullet.length > 150) {
    score -= 0.05;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Sort bullets by impact score (highest first)
 */
export function sortByImpact(bullets: string[]): string[] {
  return [...bullets].sort((a, b) => scoreImpact(b) - scoreImpact(a));
}

/**
 * Process bullets: deduplicate and sort by impact
 */
export function processBullets(bullets: string[], maxBullets: number): string[] {
  // First deduplicate
  const unique = deduplicateBullets(bullets);

  // Then sort by impact
  const sorted = sortByImpact(unique);

  // Return top N
  return sorted.slice(0, maxBullets);
}
