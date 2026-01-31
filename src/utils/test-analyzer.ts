/**
 * Test the job description analyzer
 * Run with: pnpm test-analyzer [--fallback]
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { analyzeJobDescription, checkAnalyzerReady, type AnalyzerOptions } from '../analyzer/index.js';

const SAMPLES_DIR = join(process.cwd(), 'samples');

async function main() {
  const useFallback = process.argv.includes('--fallback');

  console.log('='.repeat(60));
  console.log('Job Description Analyzer Test');
  console.log('='.repeat(60));
  console.log();

  // Check analyzer readiness
  const ready = await checkAnalyzerReady();
  console.log(`Analyzer status: ${ready.message}`);

  if (!ready.ready && !useFallback) {
    console.log('\nTip: Run with --fallback to test keyword-based extraction');
    console.log('Or start Ollama and pull the model:');
    console.log('  ollama serve');
    console.log('  ollama pull qwen2.5:32b');
    process.exit(1);
  }

  console.log();

  const options: AnalyzerOptions = { fallback: useFallback };

  // Find sample files
  let sampleFiles: string[];
  try {
    sampleFiles = readdirSync(SAMPLES_DIR).filter((f) => f.endsWith('.txt'));
  } catch {
    console.log('No samples directory found. Creating test with inline sample.');
    sampleFiles = [];
  }

  if (sampleFiles.length === 0) {
    // Use inline sample
    const inlineSample = `
Senior iOS Developer

We're looking for a Senior iOS Developer with 5+ years experience.
Required: Swift, UIKit, SwiftUI, REST APIs
Nice to have: React Native, GraphQL, AWS
Remote position at a fintech startup.
    `.trim();

    console.log('Testing with inline sample...\n');
    await analyzeSample('Inline Sample', inlineSample, options);
  } else {
    // Analyze each sample file
    for (const file of sampleFiles) {
      const filePath = join(SAMPLES_DIR, file);
      const content = readFileSync(filePath, 'utf-8');
      await analyzeSample(file, content, options);
    }
  }

  console.log('='.repeat(60));
  console.log('Test complete');
}

async function analyzeSample(name: string, content: string, options: AnalyzerOptions) {
  console.log('-'.repeat(60));
  console.log(`Analyzing: ${name}`);
  console.log('-'.repeat(60));

  const startTime = Date.now();

  try {
    const result = await analyzeJobDescription(content, options);
    const elapsed = Date.now() - startTime;

    console.log(`\nTime: ${elapsed}ms`);
    console.log(`Mode: ${options.fallback ? 'Fallback (keyword)' : 'LLM'}`);
    console.log(`\nResults:`);
    console.log(`  Title: ${result.requirements.title}`);
    console.log(`  Seniority: ${result.requirements.seniority}`);
    console.log(`  Domain: ${result.requirements.domain ?? 'Not detected'}`);
    console.log(`  Work: ${result.requirements.workArrangement ?? 'Not specified'}`);
    console.log(`  Leadership: ${result.requirements.leadershipRequired}`);
    console.log(`  Mentorship: ${result.requirements.mentorshipExpected}`);
    console.log(`\nRequired Technologies:`);
    result.requirements.requiredTechnologies.forEach((t) => console.log(`    - ${t}`));
    console.log(`\nPreferred Technologies:`);
    result.requirements.preferredTechnologies.forEach((t) => console.log(`    - ${t}`));
    console.log(`\nKeywords: ${result.requirements.keywords.slice(0, 10).join(', ')}`);
    console.log(`\nConfidence:`);
    console.log(`  Overall: ${(result.confidence.overall * 100).toFixed(0)}%`);
    console.log(`  Seniority: ${(result.confidence.seniority * 100).toFixed(0)}%`);
    console.log(`  Technologies: ${(result.confidence.technologies * 100).toFixed(0)}%`);
    console.log(`  Domain: ${(result.confidence.domain * 100).toFixed(0)}%`);
  } catch (error) {
    console.log(`\nError: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  console.log();
}

main().catch(console.error);
