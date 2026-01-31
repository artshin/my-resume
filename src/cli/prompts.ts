/**
 * Interactive prompts for CLI commands
 */

import prompts from 'prompts';
import chalk from 'chalk';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface GenerateAnswers {
  companyName: string;
  jobDescription: string;
  useAiSummary: boolean;
  paperSize: 'letter' | 'a4';
  maxJobs: number | 'all';
  previewInBrowser: boolean;
}

export interface RegenerateAnswers {
  outputDir: string;
  paperSize: 'letter' | 'a4';
  previewInBrowser: boolean;
}

/**
 * Normalize text by collapsing multiple consecutive blank lines into single ones
 * and trimming leading/trailing whitespace
 */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Collapse 3+ newlines into 2
    .trim();
}

/**
 * Prompt for multiline job description input
 * Uses a timeout-based approach: after paste/input, waits for inactivity to complete
 */
export async function promptJobDescription(): Promise<string | null> {
  console.log(chalk.gray('\nPaste the job description below.'));
  console.log(
    chalk.gray('Input will auto-submit after 1.5s of inactivity, or press Enter 3 times.\n')
  );

  const lines: string[] = [];
  let consecutiveEmptyLines = 0;
  let inactivityTimeout: NodeJS.Timeout | null = null;
  const INACTIVITY_MS = 1500;

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const finish = () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
      }
      rl.close();
      const text = lines.join('\n');
      const normalized = normalizeText(text);
      resolve(normalized || null);
    };

    const resetInactivityTimer = () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
      // Only start timer if we have content
      if (lines.some((line) => line.trim() !== '')) {
        inactivityTimeout = setTimeout(finish, INACTIVITY_MS);
      }
    };

    rl.on('line', (line: string) => {
      lines.push(line);

      // Track consecutive empty lines for manual termination
      if (line === '') {
        consecutiveEmptyLines++;
        if (consecutiveEmptyLines >= 3 && lines.some((l) => l.trim() !== '')) {
          finish();
          return;
        }
      } else {
        consecutiveEmptyLines = 0;
      }

      resetInactivityTimer();
    });

    rl.on('close', () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
      const text = lines.join('\n');
      const normalized = normalizeText(text);
      resolve(normalized || null);
    });

    rl.on('SIGINT', () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
      rl.close();
      resolve(null);
    });
  });
}

/**
 * Prompt for generate command inputs
 */
export async function promptGenerate(): Promise<GenerateAnswers | null> {
  // Company name
  const { companyName } = await prompts({
    type: 'text',
    name: 'companyName',
    message: 'Company name:',
    validate: (value) => (value.trim() ? true : 'Company name is required'),
  });

  if (!companyName) return null;

  // Job description (multiline)
  const jobDescription = await promptJobDescription();
  if (!jobDescription) return null;

  // Use AI-tailored summary
  const { useAiSummary } = await prompts({
    type: 'confirm',
    name: 'useAiSummary',
    message: 'Use AI-tailored summary? (requires Ollama)',
    initial: true,
  });

  if (useAiSummary === undefined) return null;

  // Paper size
  const { paperSize } = await prompts({
    type: 'select',
    name: 'paperSize',
    message: 'Paper size:',
    choices: [
      { title: 'Letter (8.5x11)', value: 'letter' },
      { title: 'A4', value: 'a4' },
    ],
    initial: 0,
  });

  if (!paperSize) return null;

  // Max jobs to include
  const { maxJobsChoice } = await prompts({
    type: 'select',
    name: 'maxJobsChoice',
    message: 'Max jobs to include:',
    choices: [
      { title: 'All relevant jobs', value: 'all' },
      { title: '3 jobs', value: 3 },
      { title: '4 jobs', value: 4 },
      { title: '5 jobs', value: 5 },
      { title: '6 jobs', value: 6 },
    ],
    initial: 0,
  });

  if (maxJobsChoice === undefined) return null;

  // Preview in browser
  const { previewInBrowser } = await prompts({
    type: 'confirm',
    name: 'previewInBrowser',
    message: 'Preview in browser before generating PDF?',
    initial: false,
  });

  if (previewInBrowser === undefined) return null;

  return {
    companyName,
    jobDescription,
    useAiSummary,
    paperSize,
    maxJobs: maxJobsChoice,
    previewInBrowser,
  };
}

/**
 * List existing output directories for regenerate command
 */
export async function listOutputDirs(baseDir: string): Promise<string[]> {
  const outputDir = join(baseDir, 'output');

  if (!existsSync(outputDir)) {
    return [];
  }

  const entries = await readdir(outputDir, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => {
      // Filter to directories that have template-data.json
      const templateDataPath = join(outputDir, name, 'template-data.json');
      return existsSync(templateDataPath);
    })
    .sort()
    .reverse(); // Most recent first

  return dirs;
}

/**
 * Prompt for regenerate command inputs
 */
export async function promptRegenerate(baseDir: string): Promise<RegenerateAnswers | null> {
  const dirs = await listOutputDirs(baseDir);

  if (dirs.length === 0) {
    console.log(chalk.yellow('\nNo output directories with template-data.json found.'));
    console.log(chalk.gray('Run "generate" first to create a resume.\n'));
    return null;
  }

  // Select output directory
  const { outputDir } = await prompts({
    type: 'select',
    name: 'outputDir',
    message: 'Select output directory to regenerate:',
    choices: dirs.map((dir) => ({
      title: dir,
      value: dir,
    })),
  });

  if (!outputDir) return null;

  // Paper size
  const { paperSize } = await prompts({
    type: 'select',
    name: 'paperSize',
    message: 'Paper size:',
    choices: [
      { title: 'Letter (8.5x11)', value: 'letter' },
      { title: 'A4', value: 'a4' },
    ],
    initial: 0,
  });

  if (!paperSize) return null;

  // Preview in browser
  const { previewInBrowser } = await prompts({
    type: 'confirm',
    name: 'previewInBrowser',
    message: 'Preview in browser before generating PDF?',
    initial: false,
  });

  if (previewInBrowser === undefined) return null;

  return {
    outputDir,
    paperSize,
    previewInBrowser,
  };
}

/**
 * Prompt for main command selection
 */
export async function promptMainCommand(): Promise<string | null> {
  const { command } = await prompts({
    type: 'select',
    name: 'command',
    message: 'What would you like to do?',
    choices: [
      {
        title: 'Generate',
        description: 'Create a new tailored resume',
        value: 'generate',
      },
      {
        title: 'Regenerate',
        description: 'Regenerate from existing template data',
        value: 'regenerate',
      },
      {
        title: 'Analyze',
        description: 'Analyze a job description',
        value: 'analyze',
      },
      {
        title: 'Match',
        description: 'Show how your experience matches a job',
        value: 'match',
      },
      {
        title: 'Exit',
        value: 'exit',
      },
    ],
  });

  return command || null;
}

/**
 * Prompt for continue after preview
 */
export async function promptContinueAfterPreview(): Promise<boolean> {
  const { continueGenerate } = await prompts({
    type: 'confirm',
    name: 'continueGenerate',
    message: 'Generate PDF?',
    initial: true,
  });

  return continueGenerate ?? false;
}
