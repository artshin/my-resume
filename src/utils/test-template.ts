/**
 * Test the resume template rendering
 * Run with: npm run test-template
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { renderResume, type ResumeTemplateData } from '../generator/index.js';

const OUTPUT_DIR = process.cwd();

// Sample resume data for testing
const sampleData: ResumeTemplateData = {
  profile: {
    name: 'Arthur Shinkevich',
    email: 'ashnkvch@gmail.com',
    phone: '+1 236 867 8993',
    location: 'Vancouver, BC, Canada',
    linkedin: 'https://www.linkedin.com/in/arthur-shinkevich-2946271ab/',
    github: 'https://github.com/artshin',
  },

  summary:
    'Senior Mobile Engineer with 14 years of experience building high-performance iOS and Android applications. Specialized in fintech and crypto wallet development, with proven expertise in CI/CD automation and performance optimization. Achieved 30% app performance improvements and led successful migrations preserving user access to critical financial data.',

  skills: {
    highlighted: ['Swift', 'TypeScript', 'React Native', 'UIKit', 'SwiftUI', 'GitHub Actions', 'Fastlane'],
    additional: ['Kotlin', 'Jetpack Compose', 'Firebase', 'PostgreSQL', 'AWS', 'Docker'],
    grouped: false,
  },

  experience: [
    {
      company: 'FinTech Startup',
      title: 'Senior Mobile Engineer',
      location: 'Remote',
      dates: 'Jan 2022 - Present',
      bullets: [
        'Improved app performance by 30% through networking optimization and background thread offloading',
        'Led migration of 500K users to new crypto wallet system with zero data loss',
        'Built cross-platform payments SDK reducing partner integration time by 60%',
        'Mentored 3 junior developers who were promoted within a year',
      ],
    },
    {
      company: 'TechCorp',
      title: 'Staff iOS Engineer',
      location: 'San Francisco, CA',
      dates: 'Jun 2019 - Dec 2021',
      bullets: [
        'Architected modular codebase adopted across 5 mobile teams serving 10M+ users',
        'Reduced crash rate from 2% to 0.1% through systematic debugging and testing',
        'Led technical interviews and grew iOS team from 4 to 12 engineers',
      ],
    },
    {
      company: 'Mobile Agency',
      title: 'iOS Developer',
      location: 'Toronto, Canada',
      dates: 'Mar 2016 - May 2019',
      bullets: [
        'Developed 15+ iOS applications for enterprise clients in finance and healthcare',
        'Implemented CI/CD pipeline reducing release cycle from 2 weeks to 2 days',
        'Created reusable component library used across all agency projects',
      ],
    },
  ],

  education: [
    {
      degree: "Bachelor's",
      field: 'Computer Science',
      institution: 'Seneca Polytechnic',
      year: 2012,
    },
  ],

  options: {
    twoPage: false,
    compact: false,
    showProjects: false,
  },
};

async function main() {
  console.log('='.repeat(60));
  console.log('Resume Template Test');
  console.log('='.repeat(60));
  console.log();

  try {
    // Render the resume
    console.log('Rendering resume HTML...');
    const html = renderResume(sampleData);

    // Write to file
    const outputPath = join(OUTPUT_DIR, 'test-resume.html');
    writeFileSync(outputPath, html, 'utf-8');

    console.log(`\nSuccess! Resume written to: ${outputPath}`);
    console.log(`\nOpen in browser to preview:`);
    console.log(`  file://${outputPath}`);

    // Also test grouped skills variant
    console.log('\nRendering grouped skills variant...');
    const groupedData: ResumeTemplateData = {
      ...sampleData,
      skills: {
        highlighted: [],
        grouped: true,
        categories: [
          { label: 'Languages', items: 'Swift, TypeScript, Kotlin, Python' },
          { label: 'Mobile', items: 'React Native, UIKit, SwiftUI, Jetpack Compose, Expo' },
          { label: 'DevOps', items: 'GitHub Actions, Fastlane, Docker, CI/CD' },
          { label: 'Cloud', items: 'AWS, Firebase, Supabase' },
        ],
      },
    };

    const groupedHtml = renderResume(groupedData);
    const groupedPath = join(OUTPUT_DIR, 'test-resume-grouped.html');
    writeFileSync(groupedPath, groupedHtml, 'utf-8');
    console.log(`Grouped variant written to: ${groupedPath}`);

    // Test compact variant
    console.log('\nRendering compact variant...');
    const compactData: ResumeTemplateData = {
      ...sampleData,
      options: { compact: true },
    };

    const compactHtml = renderResume(compactData);
    const compactPath = join(OUTPUT_DIR, 'test-resume-compact.html');
    writeFileSync(compactPath, compactHtml, 'utf-8');
    console.log(`Compact variant written to: ${compactPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('Test complete');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
