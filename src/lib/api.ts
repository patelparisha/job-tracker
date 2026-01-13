import { supabase } from '@/integrations/supabase/client';
import type { MasterResume, JobDescription } from '@/types/resume';

interface ParsedJobDescription {
  company: string;
  role: string;
  location: string;
  salary: string | null;
  jobType: 'full-time' | 'part-time' | 'internship' | 'contract';
  industry: string;
  requiredSkills: string[];
  keywords: string[];
}

interface GeneratedContent {
  resume: string;
  coverLetter: string;
  whyRole: string;
  whyCompany: string;
}

interface GenerationSettings {
  resumeLength: number;
  emphasis: string;
  atsLevel: string;
  includeCoverLetter: boolean;
  coverLetterTone: string;
  generateWhyQuestions: boolean;
}

export async function parseJobDescription(jobText: string): Promise<ParsedJobDescription> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase.functions.invoke(
    'parse-job-description',
    {
      body: { jobText },
    }
  );

  if (error) {
    console.error('Error parsing job description:', error);
    throw new Error(error.message || 'Failed to parse job description');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to parse job description');
  }

  return data.data;
}

export async function generateApplication(
  masterResume: MasterResume,
  jobDescription: JobDescription,
  settings: GenerationSettings
): Promise<GeneratedContent> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase.functions.invoke(
    'generate-application',
    {
      body: { masterResume, jobDescription, settings },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (error) {
    console.error('Error generating application:', error);
    throw new Error(error.message || 'Failed to generate application');
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to generate application');
  }

  return data.data;
}