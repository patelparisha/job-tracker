/* =========================
   TYPES
========================= */

interface JobDescription {
  company: string;
  role: string;
  location: string;
  salary?: string;
  jobType: string;
  industry: string;
  requiredSkills: string[];
  keywords: string[];
  rawText: string;
}

/* =========================
   CONSTANTS
========================= */

const MAX_STRING_LENGTH = 5000;
const MAX_ARRAY_LENGTH = 100;

/* =========================
   VALIDATION FUNCTIONS
========================= */

function validateString(value: unknown, maxLength = MAX_STRING_LENGTH): string {
  if (typeof value !== "string") return "";
  return value.trim().substring(0, maxLength);
}

function validateArray(value: unknown, maxLength = MAX_ARRAY_LENGTH): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxLength)
    .map((v) => (typeof v === "string" ? v.trim().substring(0, MAX_STRING_LENGTH) : ""))
    .filter(Boolean); // remove empty strings
}

/* =========================
   PARSE FUNCTION
========================= */

export function parseJobDescription(data: unknown): JobDescription | null {
  if (typeof data !== "object" || data === null) return null;
  const job = data as Record<string, unknown>;

  return {
    company: validateString(job.company, 500),
    role: validateString(job.role, 500),
    location: validateString(job.location, 200),
    salary: job.salary ? validateString(job.salary, 100) : undefined,
    jobType: validateString(job.jobType, 50),
    industry: validateString(job.industry, 200),
    requiredSkills: validateArray(job.requiredSkills, 100),
    keywords: validateArray(job.keywords, 100),
    rawText: validateString(job.rawText, 50000),
  };
}
