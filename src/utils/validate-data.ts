/**
 * Data validation utility
 * Validates all JSON files against their schemas
 * Run with: pnpm validate
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

async function validateJobFile(filePath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Check for basic vs enhanced format
    const isEnhanced = typeof data.company === 'object';

    if (isEnhanced) {
      // Validate enhanced format
      if (!data.company?.name) {
        result.errors.push('Missing company.name');
        result.valid = false;
      }
      if (!data.role?.title) {
        result.errors.push('Missing role.title');
        result.valid = false;
      }
      if (!data.duration?.start) {
        result.errors.push('Missing duration.start');
        result.valid = false;
      }

      // Warnings for incomplete data
      if (!data.achievements || data.achievements.length === 0) {
        result.warnings.push('No achievements defined');
      }
      if (!data.projects || data.projects.length === 0) {
        result.warnings.push('No projects defined');
      }
      if (!data.relevanceWeights) {
        result.warnings.push('No relevance weights defined');
      }
    } else {
      // Validate basic format
      if (!data.company) {
        result.errors.push('Missing company');
        result.valid = false;
      }
      if (!data.position) {
        result.errors.push('Missing position');
        result.valid = false;
      }
      if (!data.startDate) {
        result.errors.push('Missing startDate');
        result.valid = false;
      }

      result.warnings.push('Using basic format - consider upgrading to enhanced format');
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return result;
}

async function validateProfileFile(filePath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (!data.name) {
      result.errors.push('Missing name');
      result.valid = false;
    }
    if (!data.contact?.email) {
      result.errors.push('Missing contact.email');
      result.valid = false;
    }
    if (!data.summary) {
      result.warnings.push('Missing summary');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      result.errors.push('File does not exist');
      result.valid = false;
    } else {
      result.errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown'}`);
      result.valid = false;
    }
  }

  return result;
}

async function main() {
  console.log('Validating resume data files...\n');

  const results: ValidationResult[] = [];

  // Validate profile.json
  console.log('Checking profile.json...');
  results.push(await validateProfileFile(join(ROOT_DIR, 'profile.json')));

  // Validate education.json
  console.log('Checking education.json...');
  results.push(await validateProfileFile(join(ROOT_DIR, 'education.json')));

  // Validate skills.json
  console.log('Checking skills.json...');
  results.push(await validateProfileFile(join(ROOT_DIR, 'skills.json')));

  // Validate all job files
  console.log('Checking job files...');
  const jobsDir = join(ROOT_DIR, 'jobs');
  const companies = await readdir(jobsDir);

  for (const company of companies) {
    const companyPath = join(jobsDir, company);
    const stat = await readFile(companyPath).catch(() => null);

    if (stat === null) {
      // It's a directory
      const files = await readdir(companyPath);
      for (const file of files) {
        if (file.endsWith('.json') && file !== 'job-schema.json') {
          results.push(await validateJobFile(join(companyPath, file)));
        }
      }
    }
  }

  // Print results
  console.log('\n' + '='.repeat(60) + '\n');

  let hasErrors = false;
  let hasWarnings = false;

  for (const result of results) {
    const relativePath = result.file.replace(ROOT_DIR, '.');

    if (!result.valid) {
      console.log(`✗ ${relativePath}`);
      result.errors.forEach((e) => console.log(`    ERROR: ${e}`));
      result.warnings.forEach((w) => console.log(`    WARN: ${w}`));
      hasErrors = true;
    } else if (result.warnings.length > 0) {
      console.log(`⚠ ${relativePath}`);
      result.warnings.forEach((w) => console.log(`    WARN: ${w}`));
      hasWarnings = true;
    } else {
      console.log(`✓ ${relativePath}`);
    }
  }

  console.log('\n' + '='.repeat(60));

  if (hasErrors) {
    console.log('\n✗ Validation failed with errors');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('\n⚠ Validation passed with warnings');
    process.exit(0);
  } else {
    console.log('\n✓ All files valid');
    process.exit(0);
  }
}

main().catch(console.error);
