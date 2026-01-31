/**
 * Output directory and file management
 */

import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { AnalysisResult, MatchResult } from '../types/index.js';
import type { ResumeTemplateData } from '../generator/template-renderer.js';
import { formatAnalysisText, formatMatchText } from './formatters.js';

export interface OutputFiles {
  jobDescription: string;
  analysisJson: string;
  analysisTxt: string;
  matchResultsJson: string;
  matchResultsTxt: string;
  templateDataJson: string;
  resumeHtml: string;
  resumePdf: string;
}

export interface OutputDirInfo {
  dirPath: string;
  files: OutputFiles;
  profileName: string;
}

/**
 * Sanitize a string for use in directory/file names
 */
export function sanitizeForFilename(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Generate output directory name: YYYY-MM-DD-company-title
 */
export function generateOutputDirName(companyName: string, jobTitle: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const company = sanitizeForFilename(companyName);
  const title = sanitizeForFilename(jobTitle);

  return `${date}-${company}-${title}`;
}

/**
 * Generate resume filename from profile name
 */
export function generateResumeFilename(profileName: string): string {
  const sanitized = profileName
    .toLowerCase()
    .replace(/[^a-z]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${sanitized}-resume`;
}

/**
 * Create output directory and return paths for all files
 */
export async function createOutputDir(
  baseDir: string,
  companyName: string,
  jobTitle: string,
  profileName: string
): Promise<OutputDirInfo> {
  const dirName = generateOutputDirName(companyName, jobTitle);
  const dirPath = join(baseDir, 'output', dirName);

  // Create directory
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }

  const resumeBasename = generateResumeFilename(profileName);

  const files: OutputFiles = {
    jobDescription: join(dirPath, 'job-description.txt'),
    analysisJson: join(dirPath, 'analysis.json'),
    analysisTxt: join(dirPath, 'analysis.txt'),
    matchResultsJson: join(dirPath, 'match-results.json'),
    matchResultsTxt: join(dirPath, 'match-results.txt'),
    templateDataJson: join(dirPath, 'template-data.json'),
    resumeHtml: join(dirPath, `${resumeBasename}.html`),
    resumePdf: join(dirPath, `${resumeBasename}.pdf`),
  };

  return {
    dirPath,
    files,
    profileName,
  };
}

/**
 * Write job description file
 */
export async function writeJobDescription(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Write analysis files (JSON and TXT)
 */
export async function writeAnalysisFiles(
  files: OutputFiles,
  analysis: AnalysisResult
): Promise<void> {
  // JSON format
  await writeFile(files.analysisJson, JSON.stringify(analysis, null, 2), 'utf-8');

  // Human-readable format
  const textContent = formatAnalysisText(analysis);
  await writeFile(files.analysisTxt, textContent, 'utf-8');
}

/**
 * Write match results files (JSON and TXT)
 */
export async function writeMatchResultsFiles(
  files: OutputFiles,
  matchResult: MatchResult
): Promise<void> {
  // JSON format
  await writeFile(files.matchResultsJson, JSON.stringify(matchResult, null, 2), 'utf-8');

  // Human-readable format
  const textContent = formatMatchText(matchResult);
  await writeFile(files.matchResultsTxt, textContent, 'utf-8');
}

/**
 * Write template data file
 */
export async function writeTemplateData(filePath: string, data: ResumeTemplateData): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Read template data from existing output directory
 */
export async function readTemplateData(baseDir: string, outputDirName: string): Promise<ResumeTemplateData> {
  const templateDataPath = join(baseDir, 'output', outputDirName, 'template-data.json');

  if (!existsSync(templateDataPath)) {
    throw new Error(`Template data not found: ${templateDataPath}`);
  }

  const content = await readFile(templateDataPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Get output file paths for an existing output directory
 */
export function getOutputFilesFromDir(baseDir: string, outputDirName: string, profileName: string): OutputFiles {
  const dirPath = join(baseDir, 'output', outputDirName);
  const resumeBasename = generateResumeFilename(profileName);

  return {
    jobDescription: join(dirPath, 'job-description.txt'),
    analysisJson: join(dirPath, 'analysis.json'),
    analysisTxt: join(dirPath, 'analysis.txt'),
    matchResultsJson: join(dirPath, 'match-results.json'),
    matchResultsTxt: join(dirPath, 'match-results.txt'),
    templateDataJson: join(dirPath, 'template-data.json'),
    resumeHtml: join(dirPath, `${resumeBasename}.html`),
    resumePdf: join(dirPath, `${resumeBasename}.pdf`),
  };
}

/**
 * Write HTML resume file
 */
export async function writeHtmlResume(filePath: string, html: string): Promise<void> {
  await writeFile(filePath, html, 'utf-8');
}

/**
 * Open HTML file in default browser
 */
export async function openInBrowser(filePath: string): Promise<void> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      await execAsync(`open "${filePath}"`);
    } else if (platform === 'linux') {
      await execAsync(`xdg-open "${filePath}"`);
    } else if (platform === 'win32') {
      await execAsync(`start "" "${filePath}"`);
    }
  } catch {
    // Ignore errors - browser may still have opened
  }
}
