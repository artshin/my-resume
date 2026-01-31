/**
 * CLI module exports
 */

export {
  promptJobDescription,
  promptGenerate,
  promptRegenerate,
  promptMainCommand,
  promptContinueAfterPreview,
  listOutputDirs,
  type GenerateAnswers,
  type RegenerateAnswers,
} from './prompts.js';

export {
  formatAnalysisConsole,
  formatMatchConsole,
  formatAnalysisText,
  formatMatchText,
} from './formatters.js';

export {
  sanitizeForFilename,
  generateOutputDirName,
  generateResumeFilename,
  createOutputDir,
  writeJobDescription,
  writeAnalysisFiles,
  writeMatchResultsFiles,
  writeTemplateData,
  readTemplateData,
  getOutputFilesFromDir,
  writeHtmlResume,
  openInBrowser,
  type OutputFiles,
  type OutputDirInfo,
} from './output-manager.js';
