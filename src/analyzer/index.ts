/**
 * Job Description Analyzer
 *
 * Analyzes job descriptions using Ollama LLM (qwen2.5:32b) to extract
 * structured requirements for resume matching.
 *
 * Falls back to keyword-based extraction if Ollama is unavailable.
 */

import type { AnalysisResult, JobRequirements } from '../types/index.js';
import { getOllamaClient, type OllamaClientOptions } from './ollama-client.js';
import { buildAnalysisPrompt } from './prompts.js';
import { parseResponse, calculateConfidence } from './parser.js';
import { keywordBasedExtraction } from './fallback.js';

export { OllamaClient, getOllamaClient } from './ollama-client.js';
export { keywordBasedExtraction, extractTechnologies, detectSeniority } from './fallback.js';

export interface AnalyzerOptions {
  /** Use quick extraction mode (fewer tokens, faster) */
  quick?: boolean;
  /** Force fallback mode (skip Ollama) */
  fallback?: boolean;
  /** Ollama client options */
  ollama?: OllamaClientOptions;
}

/**
 * Analyze a job description and extract structured requirements
 */
export async function analyzeJobDescription(
  jobDescription: string,
  options: AnalyzerOptions = {}
): Promise<AnalysisResult> {
  // Validate input
  const trimmedJD = jobDescription.trim();
  if (!trimmedJD) {
    throw new Error('Job description cannot be empty');
  }

  // Force fallback mode if requested
  if (options.fallback) {
    return createFallbackResult(trimmedJD);
  }

  const client = getOllamaClient(options.ollama);

  // Check Ollama availability
  const health = await client.healthCheck();
  if (!health.available || !health.modelLoaded) {
    console.warn(`Ollama unavailable (${health.error}), using keyword fallback`);
    return createFallbackResult(trimmedJD);
  }

  // Build prompt and call Ollama
  try {
    const prompt = buildAnalysisPrompt(trimmedJD, options.quick);
    const response = await client.generateWithRetry(prompt);

    const { requirements, raw } = parseResponse(response);
    const confidence = calculateConfidence(requirements);

    return {
      requirements,
      confidence,
      rawExtraction: JSON.stringify(raw),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`LLM analysis failed (${message}), using keyword fallback`);
    return createFallbackResult(trimmedJD);
  }
}

/**
 * Create result using keyword-based fallback
 */
function createFallbackResult(jobDescription: string): AnalysisResult {
  const requirements = keywordBasedExtraction(jobDescription);

  return {
    requirements,
    confidence: {
      overall: 0.3, // Lower confidence for fallback
      seniority: 0.3,
      technologies: 0.4,
      domain: 0.2,
    },
  };
}

/**
 * Batch analyze multiple job descriptions
 */
export async function analyzeMultiple(
  jobDescriptions: string[],
  options: AnalyzerOptions = {}
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  for (const jd of jobDescriptions) {
    const result = await analyzeJobDescription(jd, options);
    results.push(result);
  }

  return results;
}

/**
 * Quick validation that Ollama is ready for analysis
 */
export async function checkAnalyzerReady(
  options?: OllamaClientOptions
): Promise<{ ready: boolean; message: string }> {
  const client = getOllamaClient(options);
  const health = await client.healthCheck();

  if (!health.available) {
    return {
      ready: false,
      message: `Ollama is not running. Start it with: ollama serve`,
    };
  }

  if (!health.modelLoaded) {
    return {
      ready: false,
      message: `Model not loaded. Run: ollama pull ${client.modelName}`,
    };
  }

  return {
    ready: true,
    message: `Ollama ready with ${client.modelName}`,
  };
}

/**
 * Extract just the key requirements (minimal analysis)
 */
export async function extractKeyRequirements(
  jobDescription: string
): Promise<Pick<JobRequirements, 'title' | 'seniority' | 'requiredTechnologies' | 'keywords'>> {
  const result = await analyzeJobDescription(jobDescription, { quick: true });

  return {
    title: result.requirements.title,
    seniority: result.requirements.seniority,
    requiredTechnologies: result.requirements.requiredTechnologies,
    keywords: result.requirements.keywords,
  };
}
