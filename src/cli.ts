#!/usr/bin/env node
/**
 * Resume Generator CLI
 * Generate tailored PDF resumes from job descriptions
 */

import { Command } from 'commander';
import { config } from 'dotenv';
import chalk from 'chalk';
import { readFile, readdir, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

import { analyzeJobDescription, checkAnalyzerReady } from './analyzer/index.js';
import { matchAgainstRequirements, normalizeJob } from './matcher/index.js';
import {
  renderResume,
  transformToTemplateData,
  generatePdf,
  closePdfGenerator,
  generateTailoredSummary,
  generateLinkedInProfile,
  renderLinkedInMarkdown,
} from './generator/index.js';
import type { Job, Profile, SkillsData, EducationData, NormalizedJob } from './types/index.js';
import type { ResumeTemplateData } from './generator/template-renderer.js';
import {
  promptMainCommand,
  promptGenerate,
  promptRegenerate,
  promptJobDescription,
  promptContinueAfterPreview,
  formatAnalysisConsole,
  formatMatchConsole,
  createOutputDir,
  writeJobDescription,
  writeAnalysisFiles,
  writeMatchResultsFiles,
  writeTemplateData,
  readTemplateData,
  getOutputFilesFromDir,
  writeHtmlResume,
  openInBrowser,
} from './cli/index.js';

// Load environment variables
config();

const DATA_DIR = process.cwd();

/**
 * Load profile data from JSON file
 */
async function loadProfile(): Promise<Profile> {
  const profilePath = join(DATA_DIR, 'profile.json');
  const content = await readFile(profilePath, 'utf-8');
  const data = JSON.parse(content);

  // Handle summary structure (can be string or object with templates)
  let summary = data.summary;
  if (typeof summary === 'object' && summary.default) {
    summary = summary.default;
  }

  return {
    ...data,
    summary,
  };
}

/**
 * Load skills data from JSON file
 */
async function loadSkills(): Promise<SkillsData> {
  const skillsPath = join(DATA_DIR, 'skills.json');
  const content = await readFile(skillsPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Load education data from JSON file
 */
async function loadEducation(): Promise<EducationData> {
  const educationPath = join(DATA_DIR, 'education.json');
  const content = await readFile(educationPath, 'utf-8');
  const data = JSON.parse(content);

  // Handle both 'degrees' and 'education' property names
  return {
    education: data.education ?? data.degrees ?? [],
    certifications: data.certifications ?? [],
  };
}

/**
 * Load all jobs from jobs/ directory
 */
async function loadJobs(): Promise<Job[]> {
  const jobsDir = join(DATA_DIR, 'jobs');
  const jobs: Job[] = [];

  if (!existsSync(jobsDir)) {
    return jobs;
  }

  const entries = await readdir(jobsDir, { withFileTypes: true });
  const companies = entries.filter((e) => e.isDirectory());

  for (const company of companies) {
    const companyPath = join(jobsDir, company.name);

    try {
      const files = await readdir(companyPath);

      // Prefer enhanced-job.json, fallback to job.json
      const jobFile = files.find((f) => f === 'enhanced-job.json') ?? files.find((f) => f === 'job.json');

      if (jobFile) {
        const content = await readFile(join(companyPath, jobFile), 'utf-8');
        const job = JSON.parse(content);
        jobs.push(job);
      }
    } catch {
      // Skip invalid directories
    }
  }

  return jobs;
}

/**
 * Interactive analyze command
 */
async function runAnalyzeInteractive(): Promise<void> {
  console.log(chalk.blue('\n📋 Job Description Analyzer\n'));

  const jobDescription = await promptJobDescription();
  if (!jobDescription) {
    console.log(chalk.yellow('\nNo job description provided.\n'));
    return;
  }

  console.log(chalk.gray('\nAnalyzing...'));

  try {
    const ready = await checkAnalyzerReady();
    if (!ready.ready) {
      console.log(chalk.yellow(`⚠ ${ready.message}`));
      console.log(chalk.gray('Using keyword-based fallback\n'));
    }

    const analysis = await analyzeJobDescription(jobDescription, {
      fallback: !ready.ready,
    });

    formatAnalysisConsole(analysis);
  } catch (error) {
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
  }
}

/**
 * Interactive match command
 */
async function runMatchInteractive(): Promise<void> {
  console.log(chalk.blue('\n🎯 Experience Matcher\n'));

  const jobDescription = await promptJobDescription();
  if (!jobDescription) {
    console.log(chalk.yellow('\nNo job description provided.\n'));
    return;
  }

  console.log(chalk.gray('\nAnalyzing job description...'));

  try {
    const ready = await checkAnalyzerReady();
    if (!ready.ready) {
      console.log(chalk.yellow(`⚠ ${ready.message}`));
      console.log(chalk.gray('Using keyword-based fallback'));
    }

    const analysis = await analyzeJobDescription(jobDescription, {
      fallback: !ready.ready,
    });

    console.log(chalk.gray('Loading profile data...'));
    const [skills, jobs] = await Promise.all([loadSkills(), loadJobs()]);

    console.log(chalk.gray('Matching...\n'));
    const matchResult = matchAgainstRequirements(jobs, skills, analysis.requirements);

    formatMatchConsole(matchResult);
  } catch (error) {
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
  }
}

/**
 * Interactive generate command
 */
async function runGenerateInteractive(): Promise<void> {
  console.log(chalk.blue('\n📄 Resume Generator\n'));

  const answers = await promptGenerate();
  if (!answers) {
    console.log(chalk.yellow('\nGeneration cancelled.\n'));
    return;
  }

  try {
    // Step 1: Check Ollama availability
    const ready = await checkAnalyzerReady();
    if (!ready.ready) {
      console.log(chalk.yellow(`\n⚠ ${ready.message}`));
      console.log(chalk.gray('Using keyword-based fallback'));
    }

    // Step 2: Analyze job description
    console.log(chalk.gray('\nAnalyzing job description...'));
    const analysis = await analyzeJobDescription(answers.jobDescription, {
      fallback: !ready.ready,
    });

    console.log(chalk.green(`✓ Analyzed: ${analysis.requirements.title}`));
    console.log(chalk.gray(`  Seniority: ${analysis.requirements.seniority}`));
    console.log(
      chalk.gray(
        `  Required: ${analysis.requirements.requiredTechnologies.slice(0, 5).join(', ')}${
          analysis.requirements.requiredTechnologies.length > 5 ? '...' : ''
        }`
      )
    );

    // Step 3: Load data files
    console.log(chalk.gray('\nLoading profile data...'));
    const [profile, skills, education, jobs] = await Promise.all([
      loadProfile(),
      loadSkills(),
      loadEducation(),
      loadJobs(),
    ]);

    console.log(chalk.green(`✓ Profile: ${profile.name}`));
    console.log(chalk.green(`✓ Jobs: ${jobs.length} positions loaded`));

    // Step 4: Create output directory
    const outputInfo = await createOutputDir(DATA_DIR, answers.companyName, analysis.requirements.title, profile.name);
    console.log(chalk.green(`✓ Output directory: ${outputInfo.dirPath}`));

    // Step 5: Match and score
    console.log(chalk.gray('\nMatching against requirements...'));

    // Apply max jobs filter
    const jobsToMatch = answers.maxJobs === 'all' ? jobs : jobs.slice(0, answers.maxJobs);
    const matchResult = matchAgainstRequirements(jobsToMatch, skills, analysis.requirements);

    console.log(chalk.green(`✓ Overall fit: ${matchResult.summary.overallFit.toUpperCase()}`));
    console.log(chalk.gray(`  Coverage: ${matchResult.technologyCoverage.coveragePercent}%`));

    // Step 6: Generate tailored summary if requested
    let customSummary: string | undefined;

    if (answers.useAiSummary && ready.ready) {
      console.log(chalk.gray('\nGenerating tailored summary...'));
      const summaryResult = await generateTailoredSummary(profile, matchResult, {
        fallback: false,
      });

      if (summaryResult.generated) {
        console.log(chalk.green('✓ AI-generated summary created'));
        customSummary = summaryResult.summary;
      } else {
        console.log(chalk.yellow('⚠ Using template summary (LLM unavailable)'));
        customSummary = summaryResult.summary;
      }
    }

    // Step 7: Transform data
    console.log(chalk.gray('\nTransforming resume data...'));

    const normalizedJobs: NormalizedJob[] = jobs.map(normalizeJob);

    const templateData = transformToTemplateData(profile, education, matchResult, normalizedJobs, {
      customSummary,
    });

    // Step 8: Write all output files
    console.log(chalk.gray('\nWriting output files...'));

    await writeJobDescription(outputInfo.files.jobDescription, answers.jobDescription);
    await writeAnalysisFiles(outputInfo.files, analysis);
    await writeMatchResultsFiles(outputInfo.files, matchResult);
    await writeTemplateData(outputInfo.files.templateDataJson, templateData);

    console.log(chalk.green('✓ Job description saved'));
    console.log(chalk.green('✓ Analysis files saved'));
    console.log(chalk.green('✓ Match results saved'));
    console.log(chalk.green('✓ Template data saved'));

    // Step 9: Generate HTML
    console.log(chalk.gray('\nGenerating resume...'));
    const html = renderResume(templateData);
    await writeHtmlResume(outputInfo.files.resumeHtml, html);
    console.log(chalk.green('✓ HTML resume generated'));

    // Step 10: Preview in browser if requested
    if (answers.previewInBrowser) {
      console.log(chalk.gray('\nOpening preview in browser...'));
      await openInBrowser(outputInfo.files.resumeHtml);

      const shouldContinue = await promptContinueAfterPreview();
      if (!shouldContinue) {
        console.log(chalk.yellow('\nPDF generation skipped.'));
        console.log(chalk.blue(`\nOutput saved to: ${outputInfo.dirPath}\n`));
        return;
      }
    }

    // Step 11: Generate PDF
    console.log(chalk.gray('\nGenerating PDF...'));
    await generatePdf(html, outputInfo.files.resumePdf, {
      paperSize: answers.paperSize,
    });

    console.log(chalk.green(`✓ PDF resume generated`));

    // Summary
    console.log(chalk.blue('\n--- Summary ---'));
    console.log(`  Position: ${analysis.requirements.title}`);
    console.log(`  Company: ${answers.companyName}`);
    console.log(`  Match: ${matchResult.summary.overallFit}`);
    console.log(`  Output: ${outputInfo.dirPath}`);
    console.log();
  } catch (error) {
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
  } finally {
    await closePdfGenerator();
  }
}

/**
 * Interactive regenerate command
 */
async function runRegenerateInteractive(): Promise<void> {
  console.log(chalk.blue('\n🔄 Regenerate Resume\n'));

  // Load profile for filename
  let profile: Profile;
  try {
    profile = await loadProfile();
  } catch {
    console.error(chalk.red('Error: Could not load profile.json'));
    return;
  }

  const answers = await promptRegenerate(DATA_DIR);
  if (!answers) {
    console.log(chalk.yellow('\nRegeneration cancelled.\n'));
    return;
  }

  try {
    // Load template data from existing output
    console.log(chalk.gray('\nLoading template data...'));
    const templateData: ResumeTemplateData = await readTemplateData(DATA_DIR, answers.outputDir);
    console.log(chalk.green('✓ Template data loaded'));

    // Get output file paths
    const files = getOutputFilesFromDir(DATA_DIR, answers.outputDir, profile.name);

    // Generate HTML
    console.log(chalk.gray('\nGenerating resume...'));
    const html = renderResume(templateData);
    await writeHtmlResume(files.resumeHtml, html);
    console.log(chalk.green('✓ HTML resume generated'));

    // Preview in browser if requested
    if (answers.previewInBrowser) {
      console.log(chalk.gray('\nOpening preview in browser...'));
      await openInBrowser(files.resumeHtml);

      const shouldContinue = await promptContinueAfterPreview();
      if (!shouldContinue) {
        console.log(chalk.yellow('\nPDF generation skipped.'));
        console.log(chalk.blue(`\nOutput saved to: output/${answers.outputDir}\n`));
        return;
      }
    }

    // Generate PDF
    console.log(chalk.gray('\nGenerating PDF...'));
    await generatePdf(html, files.resumePdf, {
      paperSize: answers.paperSize,
    });

    console.log(chalk.green(`✓ PDF resume regenerated`));
    console.log(chalk.blue(`\nOutput saved to: output/${answers.outputDir}\n`));
  } catch (error) {
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
  } finally {
    await closePdfGenerator();
  }
}

/**
 * Interactive mode - main menu
 */
async function runInteractiveMode(): Promise<void> {
  console.log(chalk.blue.bold('\n📄 Resume Generator\n'));
  console.log(chalk.gray('Generate tailored resumes from job descriptions\n'));

  while (true) {
    const command = await promptMainCommand();

    if (!command || command === 'exit') {
      console.log(chalk.gray('\nGoodbye!\n'));
      break;
    }

    switch (command) {
      case 'analyze':
        await runAnalyzeInteractive();
        break;
      case 'match':
        await runMatchInteractive();
        break;
      case 'generate':
        await runGenerateInteractive();
        break;
      case 'regenerate':
        await runRegenerateInteractive();
        break;
    }
  }

  await closePdfGenerator();
}

// CLI setup with Commander
const program = new Command();

program
  .name('resume-gen')
  .description('Generate tailored resumes from job descriptions using local Ollama LLM')
  .version('1.0.0');

// Default action - run interactive mode
program.action(async () => {
  await runInteractiveMode();
});

// Non-interactive commands for automation
program
  .command('generate')
  .description('Generate a tailored resume (non-interactive)')
  .option('-j, --jd <path>', 'Path to job description file')
  .option('-c, --company <name>', 'Company name for output directory')
  .option('-o, --output <path>', 'Output directory path')
  .option('-f, --format <type>', 'Output format: pdf, html', 'pdf')
  .option('--paper-size <size>', 'Paper size: letter, a4', 'letter')
  .option('--tailor-summary', 'Generate AI-tailored professional summary')
  .option('--fallback', 'Use keyword-based analysis (skip Ollama)')
  .option('--max-jobs <n>', 'Maximum number of jobs to include')
  .action(async (options) => {
    console.log(chalk.blue('\n📄 Resume Generator (Non-Interactive)\n'));

    try {
      if (!options.jd) {
        console.error(chalk.red('Error: Job description file is required (--jd)'));
        process.exit(1);
      }

      if (!options.company) {
        console.error(chalk.red('Error: Company name is required (--company)'));
        process.exit(1);
      }

      const jdPath = join(DATA_DIR, options.jd);
      if (!existsSync(jdPath)) {
        console.error(chalk.red(`Error: File not found: ${jdPath}`));
        process.exit(1);
      }

      const jobDescription = await readFile(jdPath, 'utf-8');
      if (!jobDescription.trim()) {
        console.error(chalk.red('Error: Job description file is empty'));
        process.exit(1);
      }

      // Check Ollama
      if (!options.fallback) {
        const ready = await checkAnalyzerReady();
        if (!ready.ready) {
          console.log(chalk.yellow(`⚠ ${ready.message}`));
          console.log(chalk.gray('Using keyword-based fallback'));
          options.fallback = true;
        }
      }

      // Analyze
      console.log(chalk.gray('Analyzing job description...'));
      const analysis = await analyzeJobDescription(jobDescription, {
        fallback: options.fallback,
      });
      console.log(chalk.green(`✓ Analyzed: ${analysis.requirements.title}`));

      // Load data
      console.log(chalk.gray('Loading profile data...'));
      const [profile, skills, education, jobs] = await Promise.all([
        loadProfile(),
        loadSkills(),
        loadEducation(),
        loadJobs(),
      ]);

      // Create output directory
      const outputInfo = await createOutputDir(DATA_DIR, options.company, analysis.requirements.title, profile.name);

      // Match
      console.log(chalk.gray('Matching against requirements...'));
      const maxJobs = options.maxJobs ? parseInt(options.maxJobs, 10) : undefined;
      const jobsToMatch = maxJobs ? jobs.slice(0, maxJobs) : jobs;
      const matchResult = matchAgainstRequirements(jobsToMatch, skills, analysis.requirements);

      console.log(chalk.green(`✓ Overall fit: ${matchResult.summary.overallFit.toUpperCase()}`));

      // Generate summary if requested
      let customSummary: string | undefined;
      if (options.tailorSummary) {
        console.log(chalk.gray('Generating tailored summary...'));
        const summaryResult = await generateTailoredSummary(profile, matchResult, {
          fallback: options.fallback,
        });
        customSummary = summaryResult.summary;
      }

      // Transform
      console.log(chalk.gray('Transforming resume data...'));
      const normalizedJobs: NormalizedJob[] = jobs.map(normalizeJob);
      const templateData = transformToTemplateData(profile, education, matchResult, normalizedJobs, {
        customSummary,
      });

      // Write files
      console.log(chalk.gray('Writing output files...'));
      await writeJobDescription(outputInfo.files.jobDescription, jobDescription);
      await writeAnalysisFiles(outputInfo.files, analysis);
      await writeMatchResultsFiles(outputInfo.files, matchResult);
      await writeTemplateData(outputInfo.files.templateDataJson, templateData);

      // Generate output
      const html = renderResume(templateData);
      await writeHtmlResume(outputInfo.files.resumeHtml, html);

      if (options.format === 'pdf') {
        console.log(chalk.gray('Generating PDF...'));
        await generatePdf(html, outputInfo.files.resumePdf, {
          paperSize: options.paperSize as 'letter' | 'a4',
        });
      }

      console.log(chalk.green(`\n✓ Resume generated: ${outputInfo.dirPath}\n`));
    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await closePdfGenerator();
    }
  });

program
  .command('analyze')
  .description('Analyze a job description (non-interactive)')
  .argument('<path>', 'Path to job description file')
  .option('--fallback', 'Use keyword-based analysis (skip Ollama)')
  .option('--json', 'Output as JSON')
  .action(async (path, options) => {
    try {
      const jdPath = join(DATA_DIR, path);
      if (!existsSync(jdPath)) {
        console.error(chalk.red(`Error: File not found: ${jdPath}`));
        process.exit(1);
      }

      const jobDescription = await readFile(jdPath, 'utf-8');
      const analysis = await analyzeJobDescription(jobDescription, {
        fallback: options.fallback,
      });

      if (options.json) {
        console.log(JSON.stringify(analysis, null, 2));
      } else {
        formatAnalysisConsole(analysis);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('match')
  .description('Show experience match (non-interactive)')
  .argument('<path>', 'Path to job description file')
  .option('--fallback', 'Use keyword-based analysis (skip Ollama)')
  .option('--json', 'Output as JSON')
  .action(async (path, options) => {
    try {
      const jdPath = join(DATA_DIR, path);
      if (!existsSync(jdPath)) {
        console.error(chalk.red(`Error: File not found: ${jdPath}`));
        process.exit(1);
      }

      const jobDescription = await readFile(jdPath, 'utf-8');
      const analysis = await analyzeJobDescription(jobDescription, {
        fallback: options.fallback,
      });

      const [skills, jobs] = await Promise.all([loadSkills(), loadJobs()]);
      const matchResult = matchAgainstRequirements(jobs, skills, analysis.requirements);

      if (options.json) {
        console.log(JSON.stringify(matchResult, null, 2));
      } else {
        formatMatchConsole(matchResult);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('check-ollama')
  .description('Check if Ollama is running and model is available')
  .action(async () => {
    console.log(chalk.blue('\n🔍 Checking Ollama...\n'));

    const result = await checkAnalyzerReady();

    if (result.ready) {
      console.log(chalk.green(`✓ ${result.message}`));
    } else {
      console.log(chalk.red(`✗ ${result.message}`));
    }
    console.log();
  });

program
  .command('validate')
  .description('Validate all JSON data files')
  .action(async () => {
    console.log(chalk.blue('\n✅ Validating data files...\n'));

    const files = [
      { name: 'profile.json', loader: loadProfile },
      { name: 'skills.json', loader: loadSkills },
      { name: 'education.json', loader: loadEducation },
    ];

    let allValid = true;

    for (const file of files) {
      try {
        await file.loader();
        console.log(chalk.green(`  ✓ ${file.name}`));
      } catch (error) {
        allValid = false;
        console.log(chalk.red(`  ✗ ${file.name}: ${error instanceof Error ? error.message : 'Invalid'}`));
      }
    }

    try {
      const jobs = await loadJobs();
      console.log(chalk.green(`  ✓ jobs/ (${jobs.length} jobs found)`));
    } catch (error) {
      allValid = false;
      console.log(chalk.red(`  ✗ jobs/: ${error instanceof Error ? error.message : 'Invalid'}`));
    }

    console.log();
    if (allValid) {
      console.log(chalk.green('All data files are valid!'));
    } else {
      console.log(chalk.red('Some files have errors. Please fix them before generating.'));
      process.exit(1);
    }
    console.log();
  });

program
  .command('list-jobs')
  .description('List all jobs in the data directory')
  .action(async () => {
    console.log(chalk.blue('\n📋 Jobs in data directory:\n'));

    try {
      const jobs = await loadJobs();

      if (jobs.length === 0) {
        console.log(chalk.gray('  No jobs found in jobs/ directory'));
        console.log();
        return;
      }

      for (const job of jobs) {
        const isEnhanced = typeof job.company === 'object';
        let companyName: string;
        let title: string;
        let start: string;
        let end: string;

        if (isEnhanced) {
          const enhanced = job as { company: { name: string }; role: { title: string }; duration: { start: string; end?: string } };
          companyName = enhanced.company.name;
          title = enhanced.role.title;
          start = enhanced.duration.start;
          end = enhanced.duration.end ?? 'Present';
        } else {
          // Basic jobs also use duration object in actual data
          const basic = job as { company: string; position: string; duration?: { start: string; end?: string } };
          companyName = basic.company;
          title = basic.position;
          start = basic.duration?.start ?? 'Unknown';
          end = basic.duration?.end ?? 'Present';
        }

        const format = isEnhanced ? chalk.green('enhanced') : chalk.yellow('basic');

        console.log(`  ${chalk.bold(companyName)}`);
        console.log(`    ${title} (${start} - ${end})`);
        console.log(`    Format: ${format}\n`);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    }
  });

program
  .command('linkedin')
  .description('Generate AI-powered LinkedIn profile content')
  .option('-o, --output <path>', 'Output file path', 'output/linkedin-profile.md')
  .option('--json', 'Output as JSON instead of markdown')
  .action(async (options) => {
    console.log(chalk.blue('\n🔗 LinkedIn Profile Generator (AI)\n'));

    try {
      // Check Ollama first (required, no fallback)
      const ready = await checkAnalyzerReady();
      if (!ready.ready) {
        console.error(chalk.red(`✗ ${ready.message}`));
        console.error(chalk.gray('This command requires Ollama to be running.'));
        console.error(chalk.gray('Start with: ollama serve'));
        process.exit(1);
      }
      console.log(chalk.green(`✓ ${ready.message}`));

      // Load all data files
      console.log(chalk.gray('\nLoading profile data...'));
      const [profile, skills, education, jobs] = await Promise.all([
        loadProfile(),
        loadSkills(),
        loadEducation(),
        loadJobs(),
      ]);

      console.log(chalk.green(`✓ Profile: ${profile.name}`));
      console.log(chalk.green(`✓ Skills: ${Object.values(skills.categories).flat().length} skills loaded`));
      console.log(chalk.green(`✓ Jobs: ${jobs.length} positions loaded`));

      // Normalize jobs for the generator
      console.log(chalk.gray('\nGenerating LinkedIn content with AI...'));
      const normalizedJobs: NormalizedJob[] = jobs.map(normalizeJob);

      // Generate LinkedIn profile content (async, AI-powered)
      const linkedInData = await generateLinkedInProfile(profile, skills, education, normalizedJobs);

      if (options.json) {
        // Output as JSON
        console.log(chalk.gray('\nJSON output:\n'));
        console.log(JSON.stringify(linkedInData, null, 2));
      } else {
        // Generate markdown
        const markdown = renderLinkedInMarkdown(linkedInData);

        // Ensure output directory exists
        const outputPath = join(DATA_DIR, options.output);
        const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
        if (outputDir && !existsSync(outputDir)) {
          await mkdir(outputDir, { recursive: true });
        }

        // Write to file
        await writeFile(outputPath, markdown, 'utf-8');
        console.log(chalk.green(`\n✓ LinkedIn content generated with AI`));
        console.log(chalk.blue(`\nOutput saved to: ${options.output}\n`));

        // Show preview of headlines
        console.log(chalk.gray('Headlines preview:'));
        console.log(chalk.white(`  For Recruiters: ${linkedInData.headlines.forRecruiters}`));
        console.log(chalk.white(`  For Clients: ${linkedInData.headlines.forClients}`));
        console.log(chalk.white(`  For Peers: ${linkedInData.headlines.forPeers}`));
        console.log();
      }
    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
