/**
 * Human-readable output formatters
 */

import chalk from 'chalk';
import type { AnalysisResult, MatchResult } from '../types/index.js';

/**
 * Format analysis result for console display
 */
export function formatAnalysisConsole(analysis: AnalysisResult): void {
  const { requirements, confidence } = analysis;

  console.log(chalk.bold.blue('\n=== Job Analysis ===\n'));

  console.log(chalk.bold('Position:'), requirements.title);
  console.log(chalk.bold('Seniority:'), requirements.seniority);

  if (requirements.companyName) {
    console.log(chalk.bold('Company:'), requirements.companyName);
  }
  if (requirements.domain) {
    console.log(chalk.bold('Domain:'), requirements.domain);
  }
  if (requirements.companyType) {
    console.log(chalk.bold('Company Type:'), requirements.companyType);
  }
  if (requirements.workArrangement) {
    console.log(chalk.bold('Work Arrangement:'), requirements.workArrangement);
  }
  if (requirements.yearsExperience) {
    console.log(chalk.bold('Years Experience:'), `${requirements.yearsExperience}+`);
  }

  console.log(chalk.bold('\nRequired Technologies:'));
  if (requirements.requiredTechnologies.length > 0) {
    requirements.requiredTechnologies.forEach((tech) => {
      console.log(`  ${chalk.green('•')} ${tech}`);
    });
  } else {
    console.log(chalk.gray('  None specified'));
  }

  console.log(chalk.bold('\nPreferred Technologies:'));
  if (requirements.preferredTechnologies.length > 0) {
    requirements.preferredTechnologies.forEach((tech) => {
      console.log(`  ${chalk.yellow('•')} ${tech}`);
    });
  } else {
    console.log(chalk.gray('  None specified'));
  }

  console.log(chalk.bold('\nKey Responsibilities:'));
  if (requirements.keyResponsibilities.length > 0) {
    requirements.keyResponsibilities.slice(0, 5).forEach((resp) => {
      console.log(`  ${chalk.blue('•')} ${resp}`);
    });
    if (requirements.keyResponsibilities.length > 5) {
      console.log(chalk.gray(`  ... and ${requirements.keyResponsibilities.length - 5} more`));
    }
  } else {
    console.log(chalk.gray('  None extracted'));
  }

  if (requirements.leadershipRequired || requirements.mentorshipExpected) {
    console.log(chalk.bold('\nLeadership:'));
    if (requirements.leadershipRequired) {
      console.log(`  ${chalk.cyan('•')} Leadership experience required`);
    }
    if (requirements.mentorshipExpected) {
      console.log(`  ${chalk.cyan('•')} Mentorship expected`);
    }
    if (requirements.teamSize) {
      console.log(`  ${chalk.cyan('•')} Team size: ${requirements.teamSize}`);
    }
  }

  console.log(chalk.bold('\nKeywords:'));
  const topKeywords = requirements.keywords.slice(0, 10);
  console.log(`  ${topKeywords.join(', ')}`);
  if (requirements.keywords.length > 10) {
    console.log(chalk.gray(`  ... and ${requirements.keywords.length - 10} more`));
  }

  console.log(chalk.bold('\nConfidence Scores:'));
  console.log(`  Overall:      ${formatConfidence(confidence.overall)}`);
  console.log(`  Seniority:    ${formatConfidence(confidence.seniority)}`);
  console.log(`  Technologies: ${formatConfidence(confidence.technologies)}`);
  console.log(`  Domain:       ${formatConfidence(confidence.domain)}`);

  console.log();
}

/**
 * Format confidence score with color
 */
function formatConfidence(score: number): string {
  const percent = Math.round(score * 100);
  const bar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));

  if (percent >= 80) {
    return `${chalk.green(bar)} ${percent}%`;
  } else if (percent >= 60) {
    return `${chalk.yellow(bar)} ${percent}%`;
  } else {
    return `${chalk.red(bar)} ${percent}%`;
  }
}

/**
 * Format match result for console display
 */
export function formatMatchConsole(match: MatchResult): void {
  console.log(chalk.bold.blue('\n=== Match Results ===\n'));

  // Overall fit
  const fitColor = {
    excellent: chalk.green,
    good: chalk.green,
    moderate: chalk.yellow,
    weak: chalk.red,
  }[match.summary.overallFit];

  console.log(chalk.bold('Overall Fit:'), fitColor(match.summary.overallFit.toUpperCase()));
  console.log(chalk.bold('Technology Coverage:'), `${match.technologyCoverage.coveragePercent}%`);

  // Technology coverage
  console.log(chalk.bold('\nRequired Technologies:'));
  match.technologyCoverage.required.forEach(({ tech, covered, source }) => {
    if (covered) {
      console.log(`  ${chalk.green('✓')} ${tech}${source ? chalk.gray(` (${source})`) : ''}`);
    } else {
      console.log(`  ${chalk.red('✗')} ${tech}`);
    }
  });

  console.log(chalk.bold('\nPreferred Technologies:'));
  match.technologyCoverage.preferred.forEach(({ tech, covered, source }) => {
    if (covered) {
      console.log(`  ${chalk.green('✓')} ${tech}${source ? chalk.gray(` (${source})`) : ''}`);
    } else {
      console.log(`  ${chalk.gray('○')} ${tech}`);
    }
  });

  // Top jobs
  console.log(chalk.bold('\nTop Matching Positions:'));
  match.rankedJobs.slice(0, 5).forEach((job, i) => {
    const score = Math.round(job.totalScore * 100);
    console.log(`  ${i + 1}. ${job.title} at ${job.companyName} ${chalk.gray(`(${score}%)`)}`);
  });

  // Selected skills
  console.log(chalk.bold('\nTop Skills:'));
  match.selectedSkills.slice(0, 10).forEach((skill) => {
    const marker = skill.isRequired ? chalk.green('●') : skill.isPreferred ? chalk.yellow('●') : chalk.gray('○');
    console.log(`  ${marker} ${skill.name}`);
  });

  // Strengths and gaps
  if (match.summary.strengths.length > 0) {
    console.log(chalk.bold.green('\nStrengths:'));
    match.summary.strengths.forEach((s) => {
      console.log(`  ${chalk.green('+')} ${s}`);
    });
  }

  if (match.summary.gaps.length > 0) {
    console.log(chalk.bold.yellow('\nGaps:'));
    match.summary.gaps.forEach((g) => {
      console.log(`  ${chalk.yellow('-')} ${g}`);
    });
  }

  if (match.summary.recommendations.length > 0) {
    console.log(chalk.bold.cyan('\nRecommendations:'));
    match.summary.recommendations.forEach((r) => {
      console.log(`  ${chalk.cyan('→')} ${r}`);
    });
  }

  console.log();
}

/**
 * Format analysis result as human-readable text file
 */
export function formatAnalysisText(analysis: AnalysisResult): string {
  const { requirements, confidence } = analysis;
  const lines: string[] = [];

  lines.push('JOB ANALYSIS');
  lines.push('============');
  lines.push('');

  lines.push(`Position: ${requirements.title}`);
  lines.push(`Seniority: ${requirements.seniority}`);

  if (requirements.companyName) {
    lines.push(`Company: ${requirements.companyName}`);
  }
  if (requirements.domain) {
    lines.push(`Domain: ${requirements.domain}`);
  }
  if (requirements.companyType) {
    lines.push(`Company Type: ${requirements.companyType}`);
  }
  if (requirements.workArrangement) {
    lines.push(`Work Arrangement: ${requirements.workArrangement}`);
  }
  if (requirements.yearsExperience) {
    lines.push(`Years Experience: ${requirements.yearsExperience}+`);
  }

  lines.push('');
  lines.push('REQUIRED TECHNOLOGIES');
  lines.push('---------------------');
  if (requirements.requiredTechnologies.length > 0) {
    requirements.requiredTechnologies.forEach((tech) => {
      lines.push(`  • ${tech}`);
    });
  } else {
    lines.push('  (none specified)');
  }

  lines.push('');
  lines.push('PREFERRED TECHNOLOGIES');
  lines.push('----------------------');
  if (requirements.preferredTechnologies.length > 0) {
    requirements.preferredTechnologies.forEach((tech) => {
      lines.push(`  • ${tech}`);
    });
  } else {
    lines.push('  (none specified)');
  }

  lines.push('');
  lines.push('KEY RESPONSIBILITIES');
  lines.push('--------------------');
  if (requirements.keyResponsibilities.length > 0) {
    requirements.keyResponsibilities.forEach((resp) => {
      lines.push(`  • ${resp}`);
    });
  } else {
    lines.push('  (none extracted)');
  }

  if (requirements.leadershipRequired || requirements.mentorshipExpected) {
    lines.push('');
    lines.push('LEADERSHIP REQUIREMENTS');
    lines.push('-----------------------');
    if (requirements.leadershipRequired) {
      lines.push('  • Leadership experience required');
    }
    if (requirements.mentorshipExpected) {
      lines.push('  • Mentorship expected');
    }
    if (requirements.teamSize) {
      lines.push(`  • Team size: ${requirements.teamSize}`);
    }
  }

  lines.push('');
  lines.push('KEYWORDS');
  lines.push('--------');
  lines.push(`  ${requirements.keywords.join(', ')}`);

  lines.push('');
  lines.push('CONFIDENCE SCORES');
  lines.push('-----------------');
  lines.push(`  Overall:      ${Math.round(confidence.overall * 100)}%`);
  lines.push(`  Seniority:    ${Math.round(confidence.seniority * 100)}%`);
  lines.push(`  Technologies: ${Math.round(confidence.technologies * 100)}%`);
  lines.push(`  Domain:       ${Math.round(confidence.domain * 100)}%`);

  return lines.join('\n');
}

/**
 * Format match result as human-readable text file
 */
export function formatMatchText(match: MatchResult): string {
  const lines: string[] = [];

  lines.push('MATCH RESULTS');
  lines.push('=============');
  lines.push('');

  lines.push(`Overall Fit: ${match.summary.overallFit.toUpperCase()}`);
  lines.push(`Technology Coverage: ${match.technologyCoverage.coveragePercent}%`);

  lines.push('');
  lines.push('REQUIRED TECHNOLOGIES');
  lines.push('---------------------');
  match.technologyCoverage.required.forEach(({ tech, covered, source }) => {
    if (covered) {
      lines.push(`  [✓] ${tech}${source ? ` (via ${source})` : ''}`);
    } else {
      lines.push(`  [✗] ${tech}`);
    }
  });

  lines.push('');
  lines.push('PREFERRED TECHNOLOGIES');
  lines.push('----------------------');
  match.technologyCoverage.preferred.forEach(({ tech, covered, source }) => {
    if (covered) {
      lines.push(`  [✓] ${tech}${source ? ` (via ${source})` : ''}`);
    } else {
      lines.push(`  [ ] ${tech}`);
    }
  });

  lines.push('');
  lines.push('TOP MATCHING POSITIONS');
  lines.push('----------------------');
  match.rankedJobs.slice(0, 5).forEach((job, i) => {
    const score = Math.round(job.totalScore * 100);
    lines.push(`  ${i + 1}. ${job.title} at ${job.companyName} (${score}%)`);
    if (job.matchedTechnologies.length > 0) {
      lines.push(`     Technologies: ${job.matchedTechnologies.join(', ')}`);
    }
  });

  lines.push('');
  lines.push('SELECTED SKILLS');
  lines.push('---------------');
  match.selectedSkills.forEach((skill) => {
    const marker = skill.isRequired ? '[REQ]' : skill.isPreferred ? '[PRE]' : '[   ]';
    lines.push(`  ${marker} ${skill.name}`);
  });

  if (match.summary.strengths.length > 0) {
    lines.push('');
    lines.push('STRENGTHS');
    lines.push('---------');
    match.summary.strengths.forEach((s) => {
      lines.push(`  + ${s}`);
    });
  }

  if (match.summary.gaps.length > 0) {
    lines.push('');
    lines.push('GAPS');
    lines.push('----');
    match.summary.gaps.forEach((g) => {
      lines.push(`  - ${g}`);
    });
  }

  if (match.summary.recommendations.length > 0) {
    lines.push('');
    lines.push('RECOMMENDATIONS');
    lines.push('---------------');
    match.summary.recommendations.forEach((r) => {
      lines.push(`  → ${r}`);
    });
  }

  return lines.join('\n');
}
