/**
 * Test the matching and scoring engine
 * Run with: npm run test-matcher
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { analyzeJobDescription } from '../analyzer/index.js';
import { matchAgainstRequirements, printMatchSummary } from '../matcher/index.js';
import type { SkillsData, Job, EnhancedJob } from '../types/index.js';

const DATA_DIR = process.cwd();
const SAMPLES_DIR = join(DATA_DIR, 'samples');

// Sample job data for testing (since jobs/*.json may not exist yet)
const SAMPLE_JOBS: Job[] = [
  {
    company: {
      name: 'FinTech Startup',
      industry: 'fintech',
      size: 'startup',
      stage: 'series-b',
    },
    role: {
      title: 'Senior Mobile Engineer',
      level: 'senior',
      type: 'full-time',
      teamSize: 5,
    },
    duration: {
      start: '2022-01',
      end: '2024-01',
      totalMonths: 24,
    },
    technologies: {
      languages: ['Swift', 'TypeScript', 'Kotlin'],
      frameworks: ['React Native', 'Expo'],
      mobile: ['UIKit', 'SwiftUI', 'Combine'],
      databases: ['PostgreSQL', 'SQLite'],
      devops: ['GitHub Actions', 'Fastlane'],
      cloud: ['AWS', 'Firebase'],
    },
    projects: [
      {
        name: 'Mobile Payments SDK',
        description: 'Built cross-platform payments SDK',
        technologies: ['Swift', 'Kotlin', 'React Native'],
        impact: 'Reduced integration time by 60%',
        teamSize: 3,
      },
      {
        name: 'CI/CD Pipeline',
        description: 'Automated mobile release pipeline',
        technologies: ['GitHub Actions', 'Fastlane'],
        impact: 'Released weekly instead of monthly',
        teamSize: 2,
      },
    ],
    achievements: [
      {
        description: 'Improved app performance by 30% through networking optimization',
        category: 'performance',
        quantifiable: true,
        metrics: '30% faster load times',
      },
      {
        description: 'Led migration of 500K users to new crypto wallet system',
        category: 'business',
        quantifiable: true,
      },
      {
        description: 'Mentored 3 junior developers who were promoted within a year',
        category: 'team',
        quantifiable: true,
      },
    ],
    relevanceWeights: {
      mobile: 0.9,
      startup: 0.8,
      leadership: 0.6,
    },
  } as EnhancedJob,
  {
    company: {
      name: 'TechCorp',
      industry: 'enterprise',
      size: 'large',
      stage: 'public',
    },
    role: {
      title: 'Staff iOS Engineer',
      level: 'staff',
      type: 'full-time',
      teamSize: 12,
      directReports: 3,
    },
    duration: {
      start: '2019-06',
      end: '2021-12',
      totalMonths: 30,
    },
    technologies: {
      languages: ['Swift', 'Objective-C'],
      mobile: ['UIKit', 'Core Data', 'Combine'],
      testing: ['XCTest'],
      devops: ['Jenkins', 'Fastlane'],
    },
    projects: [
      {
        name: 'Enterprise Mobile App',
        description: 'Led development of B2B mobile application',
        technologies: ['Swift', 'UIKit', 'Core Data'],
        impact: 'Serving 10M+ enterprise users',
        teamSize: 8,
      },
    ],
    achievements: [
      {
        description: 'Architected modular codebase adopted across 5 mobile teams',
        category: 'quality',
        quantifiable: true,
      },
      {
        description: 'Reduced crash rate from 2% to 0.1% through systematic debugging',
        category: 'quality',
        quantifiable: true,
        metrics: '95% reduction in crashes',
      },
    ],
    relevanceWeights: {
      mobile: 0.95,
      enterprise: 0.9,
      leadership: 0.8,
    },
  } as EnhancedJob,
];

async function main() {
  console.log('='.repeat(60));
  console.log('Matching Engine Test');
  console.log('='.repeat(60));
  console.log();

  // Load skills data
  let skills: SkillsData;
  try {
    const skillsPath = join(DATA_DIR, 'skills.json');
    skills = JSON.parse(readFileSync(skillsPath, 'utf-8'));
    console.log(`Loaded skills.json with ${Object.keys(skills.categories).length} categories`);
  } catch {
    console.log('skills.json not found, using minimal test data');
    skills = {
      categories: {
        languages: [
          { name: 'Swift', level: 'expert', yearsUsed: 10, lastUsed: 2024, wantToUse: true },
          { name: 'TypeScript', level: 'expert', yearsUsed: 6, lastUsed: 2024, wantToUse: true },
        ],
        mobile: [
          { name: 'React Native', level: 'expert', yearsUsed: 6, lastUsed: 2024, wantToUse: true },
          { name: 'UIKit', level: 'expert', yearsUsed: 10, lastUsed: 2024, wantToUse: true },
        ],
        frameworks: [],
        databases: [],
        cloud: [],
        devops: [],
        testing: [],
        tools: [],
        domains: [],
        soft: [],
      },
      featured: ['Swift', 'React Native'],
      deprecated: [],
    };
  }

  // Test with sample job descriptions
  const sampleJD = readFileSync(join(SAMPLES_DIR, 'senior-mobile-startup.txt'), 'utf-8');

  console.log('\n--- Analyzing Job Description ---\n');

  // Use fallback mode for faster testing
  const analysis = await analyzeJobDescription(sampleJD, { fallback: true });

  console.log(`Title: ${analysis.requirements.title}`);
  console.log(`Seniority: ${analysis.requirements.seniority}`);
  console.log(`Required: ${analysis.requirements.requiredTechnologies.join(', ')}`);
  console.log(`Domain: ${analysis.requirements.domain ?? 'not detected'}`);

  console.log('\n--- Running Matcher ---\n');

  const result = matchAgainstRequirements(SAMPLE_JOBS, skills, analysis.requirements);

  printMatchSummary(result);

  console.log('\n--- Job Score Breakdown ---');
  for (const job of result.rankedJobs) {
    console.log(`\n${job.companyName} - ${job.title}`);
    console.log(`  Total: ${(job.totalScore * 100).toFixed(0)}%`);
    console.log(`  Technology: ${(job.scores.technologyMatch * 100).toFixed(0)}%`);
    console.log(`  Domain: ${(job.scores.domainMatch * 100).toFixed(0)}%`);
    console.log(`  Seniority: ${(job.scores.seniorityMatch * 100).toFixed(0)}%`);
    console.log(`  Recency: ${(job.scores.recency * 100).toFixed(0)}%`);
    console.log(`  Matched: ${job.matchedTechnologies.join(', ') || 'none'}`);
    console.log(`  Missing: ${job.missingTechnologies.join(', ') || 'none'}`);
  }

  console.log('\n--- Technology Coverage ---');
  console.log(`Overall: ${result.technologyCoverage.coveragePercent}%`);
  console.log('\nRequired:');
  for (const tech of result.technologyCoverage.required) {
    console.log(`  ${tech.covered ? '✓' : '✗'} ${tech.tech}${tech.source ? ` (${tech.source})` : ''}`);
  }
  console.log('\nPreferred:');
  for (const tech of result.technologyCoverage.preferred) {
    console.log(`  ${tech.covered ? '✓' : '✗'} ${tech.tech}${tech.source ? ` (${tech.source})` : ''}`);
  }

  console.log('\n--- Selected Projects ---');
  for (const project of result.selectedProjects.slice(0, 3)) {
    console.log(`  ${project.name} (${(project.score * 100).toFixed(0)}%): ${project.relevanceReason}`);
  }

  console.log('\n--- Selected Achievements ---');
  for (const achievement of result.selectedAchievements.slice(0, 3)) {
    console.log(`  ${achievement.description.slice(0, 50)}... (${(achievement.score * 100).toFixed(0)}%)`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete');
}

main().catch(console.error);
