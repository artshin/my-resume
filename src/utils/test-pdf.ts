/**
 * Test PDF generation
 * Run with: npm run test-pdf
 */

import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { renderResume, generatePdf, closePdfGenerator, type ResumeTemplateData } from '../generator/index.js';

const OUTPUT_DIR = process.cwd();

// Sample resume data
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
};

async function main() {
  console.log('='.repeat(60));
  console.log('PDF Generation Test');
  console.log('='.repeat(60));
  console.log();

  try {
    // Generate HTML first
    console.log('Rendering HTML...');
    const html = renderResume(sampleData);

    // Generate PDF - Letter size
    console.log('Generating PDF (Letter size)...');
    const letterPath = join(OUTPUT_DIR, 'test-resume.pdf');
    await generatePdf(html, letterPath, { paperSize: 'letter' });
    console.log(`  Created: ${letterPath}`);

    // Generate PDF - A4 size
    console.log('Generating PDF (A4 size)...');
    const a4Path = join(OUTPUT_DIR, 'test-resume-a4.pdf');
    await generatePdf(html, a4Path, { paperSize: 'a4' });
    console.log(`  Created: ${a4Path}`);

    // Generate compact version
    console.log('Generating compact PDF...');
    const compactData: ResumeTemplateData = {
      ...sampleData,
      options: { compact: true },
    };
    const compactHtml = renderResume(compactData);
    const compactPath = join(OUTPUT_DIR, 'test-resume-compact.pdf');
    await generatePdf(compactHtml, compactPath, { paperSize: 'letter' });
    console.log(`  Created: ${compactPath}`);

    // Verify files exist
    console.log('\nVerifying output files...');
    const files = [letterPath, a4Path, compactPath];
    for (const file of files) {
      if (existsSync(file)) {
        const stats = readFileSync(file);
        console.log(`  ✓ ${file.split('/').pop()} (${(stats.length / 1024).toFixed(1)} KB)`);
      } else {
        console.log(`  ✗ ${file.split('/').pop()} - NOT FOUND`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('PDF generation complete!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    // Cleanup
    await closePdfGenerator();
  }
}

main();
