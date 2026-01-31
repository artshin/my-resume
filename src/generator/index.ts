/**
 * Resume Generator
 *
 * Generates HTML and PDF resumes from matched data using Handlebars templates and Puppeteer.
 */

export {
  TemplateRenderer,
  getTemplateRenderer,
  renderResume,
  type ResumeTemplateData,
} from './template-renderer.js';

export {
  transformToTemplateData,
  type TransformOptions,
} from './data-transformer.js';

export {
  PdfGenerator,
  getPdfGenerator,
  generatePdf,
  closePdfGenerator,
  type PdfGeneratorOptions,
  type PaperSize,
} from './pdf-generator.js';

export {
  generateTailoredSummary,
  enhanceSummaryWithKeywords,
  type SummaryGeneratorOptions,
} from './summary-generator.js';

export {
  processBullets,
  deduplicateBullets,
  sortByImpact,
  scoreImpact,
  areSimilarBullets,
} from './bullet-deduplicator.js';

export {
  processTechnologies,
  filterTechnologies,
  prioritizeTechnologies,
  type FilterOptions,
} from './technology-filter.js';

export {
  generateLinkedInProfile,
  renderLinkedInMarkdown,
  type LinkedInProfileOutput,
  type LinkedInExperience,
  type LinkedInSkill,
  type LinkedInFeaturedItem,
} from './linkedin-generator.js';

export {
  buildLinkedInContext,
  buildHeadlinesPrompt,
  buildAboutPrompt,
  buildExperiencePrompt,
  type LinkedInContext,
} from './linkedin-prompts.js';
