/**
 * LLM prompts for job description analysis
 */

/**
 * Main extraction prompt for analyzing job descriptions
 */
export const JOB_ANALYSIS_PROMPT = `You are a job description analyzer. Extract structured information from the job description below.

Return a JSON object with this exact structure:
{
  "title": "the job title",
  "seniority": "junior|mid|senior|staff|principal|lead|manager|director",
  "department": "engineering department or team name if mentioned",
  "companyName": "company name if mentioned",
  "companyType": "startup|scaleup|enterprise|agency|consulting|faang",
  "domain": "fintech|healthcare|ecommerce|gaming|enterprise|consumer|saas|crypto|ai-ml|social|media|education|other",
  "location": "location if mentioned",
  "workArrangement": "remote|hybrid|onsite",
  "requiredTechnologies": ["list of must-have technologies"],
  "preferredTechnologies": ["list of nice-to-have technologies"],
  "yearsExperience": 5,
  "keyResponsibilities": ["main responsibilities"],
  "leadershipRequired": true,
  "teamSize": "team size if mentioned",
  "mentorshipExpected": false,
  "keywords": ["important technical keywords for matching"],
  "buzzwords": ["soft skill and process keywords like agile, cross-functional"]
}

Guidelines:
- For seniority: Use "junior" for 0-2 years, "mid" for 2-5 years, "senior" for 5-8 years, "staff" for 8+ years with technical leadership, "principal" for architects
- For technologies: Normalize names (e.g., "React.js" -> "React", "node" -> "Node.js")
- For keywords: Include all technical terms mentioned for skill matching
- Set leadershipRequired=true if managing people, leading teams, or mentoring is mentioned
- Set mentorshipExpected=true if mentoring junior developers is mentioned
- If a field cannot be determined, use null

Job Description:
---
{JOB_DESCRIPTION}
---

Return ONLY the JSON object, no explanation or markdown.`;

/**
 * Simplified prompt for faster extraction (fewer tokens)
 */
export const QUICK_ANALYSIS_PROMPT = `Extract key info from this job posting as JSON:
{
  "title": "job title",
  "seniority": "junior|mid|senior|staff|principal",
  "requiredTechnologies": ["tech list"],
  "preferredTechnologies": ["nice-to-have tech"],
  "domain": "industry",
  "workArrangement": "remote|hybrid|onsite",
  "keywords": ["matching keywords"]
}

Job:
---
{JOB_DESCRIPTION}
---

JSON only:`;

/**
 * Build the analysis prompt with the job description
 */
export function buildAnalysisPrompt(jobDescription: string, quick = false): string {
  const template = quick ? QUICK_ANALYSIS_PROMPT : JOB_ANALYSIS_PROMPT;
  return template.replace('{JOB_DESCRIPTION}', jobDescription.trim());
}
