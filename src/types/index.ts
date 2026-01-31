/**
 * Central type exports
 */

// Job types
export type {
  CompanySize,
  CompanyStage,
  RoleLevel,
  RoleType,
  Methodology,
  WorkStyle,
  AchievementCategory,
  Company,
  Role,
  Duration,
  Responsibilities,
  Project,
  Technologies,
  Achievement,
  JobSkills,
  JobContext,
  Keywords,
  RelevanceWeights,
  EnhancedJob,
  BasicJob,
  Job,
  NormalizedJob,
} from './job.js';

export { isEnhancedJob, isBasicJob } from './job.js';

// Profile types
export type {
  ContactInfo,
  Profile,
  SummaryTemplates,
  ProfilePreferences,
  DegreeType,
  Education,
  Certification,
  EducationData,
  SkillLevel,
  Skill,
  SkillCategory,
  SkillsData,
  FullProfile,
} from './profile.js';

// Analyzer types
export type {
  SeniorityLevel,
  JobDomain,
  CompanyType,
  WorkArrangement,
  JobRequirements,
  AnalysisResult,
  KeywordExtractionResult,
} from './analyzer.js';

// Matcher types
export type {
  JobScore,
  ScoredProject,
  ScoredAchievement,
  ScoredSkill,
  MatchResult,
  MatchConfig,
} from './matcher.js';

export { DEFAULT_MATCH_CONFIG } from './matcher.js';

// Generator types
export type {
  ResumeData,
  ResumeExperience,
  ResumeBullet,
  ResumeSkillSection,
  ResumeEducation,
  ResumeCertification,
  GenerateOptions,
  GenerateResult,
  PdfOptions,
} from './generator.js';

export { DEFAULT_PDF_OPTIONS } from './generator.js';

// Ollama types
export type {
  OllamaGenerateRequest,
  OllamaOptions,
  OllamaGenerateResponse,
  OllamaError,
  OllamaModel,
  OllamaTagsResponse,
  OllamaConfig,
} from './ollama.js';

export { DEFAULT_OLLAMA_CONFIG } from './ollama.js';
