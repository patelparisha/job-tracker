import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - restrict to trusted domains
const allowedOrigins = [
  'https://lovable.dev',
  'https://www.lovable.dev',
];

// In development/preview, allow lovableproject.com subdomains
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  // Allow lovableproject.com subdomains for preview builds
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/)) return true;
  // Allow localhost for development
  if (origin.startsWith('http://localhost:')) return true;
  return false;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Input validation
const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 100;
const MAX_BULLETS = 50;

interface Bullet {
  id: string;
  text: string;
  enabled: boolean;
}

interface MasterResume {
  header: {
    name: string;
    email: string;
    phone: string;
    linkedin: string;
    location: string;
    website?: string;
  };
  summaries: Array<{ id: string; name: string; text: string; isDefault: boolean }>;
  education: Array<{
    id: string;
    school: string;
    degree: string;
    field: string;
    location: string;
    graduationDate: string;
    gpa?: string;
    bullets: Bullet[];
  }>;
  experience: Array<{
    id: string;
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: Bullet[];
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string[];
    link?: string;
    bullets: Bullet[];
  }>;
  skills: {
    technical: string[];
    languages: string[];
    tools: string[];
    certifications: string[];
  };
  leadership: Bullet[];
}

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

interface Settings {
  resumeLength: number;
  emphasis: string;
  atsLevel: string;
  includeCoverLetter: boolean;
  coverLetterTone: string;
  generateWhyQuestions: boolean;
}

function validateString(value: unknown, fieldName: string, maxLength = MAX_STRING_LENGTH): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().substring(0, maxLength);
  return trimmed;
}

function validateArray(value: unknown, maxLength = MAX_ARRAY_LENGTH): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxLength);
}

function validateBullets(bullets: unknown): Bullet[] {
  if (!Array.isArray(bullets)) return [];
  return bullets.slice(0, MAX_BULLETS).map(b => {
    if (typeof b !== 'object' || b === null) return { id: '', text: '', enabled: false };
    const bullet = b as Record<string, unknown>;
    return {
      id: validateString(bullet.id, 'id', 100),
      text: validateString(bullet.text, 'text', 2000),
      enabled: typeof bullet.enabled === 'boolean' ? bullet.enabled : false,
    };
  });
}

function validateMasterResume(data: unknown): MasterResume | null {
  if (typeof data !== 'object' || data === null) return null;
  const resume = data as Record<string, unknown>;

  const header = resume.header as Record<string, unknown> | undefined;
  if (!header || typeof header !== 'object') return null;

  return {
    header: {
      name: validateString(header.name, 'name', 200),
      email: validateString(header.email, 'email', 254),
      phone: validateString(header.phone, 'phone', 50),
      linkedin: validateString(header.linkedin, 'linkedin', 500),
      location: validateString(header.location, 'location', 200),
      website: header.website ? validateString(header.website, 'website', 500) : undefined,
    },
    summaries: validateArray(resume.summaries, 20).map(s => {
      const summary = s as Record<string, unknown>;
      return {
        id: validateString(summary?.id, 'id', 100),
        name: validateString(summary?.name, 'name', 200),
        text: validateString(summary?.text, 'text', 2000),
        isDefault: typeof summary?.isDefault === 'boolean' ? summary.isDefault : false,
      };
    }),
    education: validateArray(resume.education, 20).map(e => {
      const edu = e as Record<string, unknown>;
      return {
        id: validateString(edu?.id, 'id', 100),
        school: validateString(edu?.school, 'school', 500),
        degree: validateString(edu?.degree, 'degree', 200),
        field: validateString(edu?.field, 'field', 200),
        location: validateString(edu?.location, 'location', 200),
        graduationDate: validateString(edu?.graduationDate, 'graduationDate', 50),
        gpa: edu?.gpa ? validateString(edu.gpa, 'gpa', 20) : undefined,
        bullets: validateBullets(edu?.bullets),
      };
    }),
    experience: validateArray(resume.experience, 30).map(e => {
      const exp = e as Record<string, unknown>;
      return {
        id: validateString(exp?.id, 'id', 100),
        company: validateString(exp?.company, 'company', 500),
        title: validateString(exp?.title, 'title', 200),
        location: validateString(exp?.location, 'location', 200),
        startDate: validateString(exp?.startDate, 'startDate', 50),
        endDate: validateString(exp?.endDate, 'endDate', 50),
        bullets: validateBullets(exp?.bullets),
      };
    }),
    projects: validateArray(resume.projects, 30).map(p => {
      const proj = p as Record<string, unknown>;
      return {
        id: validateString(proj?.id, 'id', 100),
        name: validateString(proj?.name, 'name', 500),
        description: validateString(proj?.description, 'description', 2000),
        technologies: validateArray(proj?.technologies, 50).map(t => validateString(t, 'tech', 100)),
        link: proj?.link ? validateString(proj.link, 'link', 500) : undefined,
        bullets: validateBullets(proj?.bullets),
      };
    }),
    skills: {
      technical: validateArray((resume.skills as Record<string, unknown>)?.technical, 100).map(s => validateString(s, 'skill', 100)),
      languages: validateArray((resume.skills as Record<string, unknown>)?.languages, 50).map(s => validateString(s, 'language', 100)),
      tools: validateArray((resume.skills as Record<string, unknown>)?.tools, 100).map(s => validateString(s, 'tool', 100)),
      certifications: validateArray((resume.skills as Record<string, unknown>)?.certifications, 50).map(s => validateString(s, 'cert', 200)),
    },
    leadership: validateBullets(resume.leadership),
  };
}

function validateJobDescription(data: unknown): JobDescription | null {
  if (typeof data !== 'object' || data === null) return null;
  const job = data as Record<string, unknown>;

  return {
    company: validateString(job.company, 'company', 500),
    role: validateString(job.role, 'role', 500),
    location: validateString(job.location, 'location', 200),
    salary: job.salary ? validateString(job.salary, 'salary', 100) : undefined,
    jobType: validateString(job.jobType, 'jobType', 50),
    industry: validateString(job.industry, 'industry', 200),
    requiredSkills: validateArray(job.requiredSkills, 100).map(s => validateString(s, 'skill', 100)),
    keywords: validateArray(job.keywords, 100).map(k => validateString(k, 'keyword', 100)),
    rawText: validateString(job.rawText, 'rawText', 50000),
  };
}

function validateSettings(data: unknown): Settings {
  if (typeof data !== 'object' || data === null) {
    return {
      resumeLength: 1,
      emphasis: 'balanced',
      atsLevel: 'medium',
      includeCoverLetter: true,
      coverLetterTone: 'professional',
      generateWhyQuestions: true,
    };
  }
  const settings = data as Record<string, unknown>;
  return {
    resumeLength: typeof settings.resumeLength === 'number' ? Math.min(Math.max(settings.resumeLength, 1), 3) : 1,
    emphasis: ['technical', 'leadership', 'business', 'balanced'].includes(settings.emphasis as string) ? settings.emphasis as string : 'balanced',
    atsLevel: ['low', 'medium', 'high'].includes(settings.atsLevel as string) ? settings.atsLevel as string : 'medium',
    includeCoverLetter: typeof settings.includeCoverLetter === 'boolean' ? settings.includeCoverLetter : true,
    coverLetterTone: validateString(settings.coverLetterTone, 'tone', 50) || 'professional',
    generateWhyQuestions: typeof settings.generateWhyQuestions === 'boolean' ? settings.generateWhyQuestions : true,
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[AUTH] JWT validation failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[INFO] Request from user: ${user.id?.substring(0, 8)}...`);

    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { masterResume: rawResume, jobDescription: rawJob, settings: rawSettings } = body as Record<string, unknown>;

    const masterResume = validateMasterResume(rawResume);
    const jobDescription = validateJobDescription(rawJob);
    const settings = validateSettings(rawSettings);

    if (!masterResume || !jobDescription) {
      return new Response(
        JSON.stringify({ error: 'Resume and job description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!masterResume.header.name || !jobDescription.company) {
      return new Response(
        JSON.stringify({ error: 'Resume name and job company are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('[CONFIG] API key not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[INFO] Generating application materials...');

    // Build resume context ONLY from master resume data
    const enabledExperience = masterResume.experience.map(exp => ({
      ...exp,
      bullets: exp.bullets.filter(b => b.enabled)
    }));

    const enabledEducation = masterResume.education.map(edu => ({
      ...edu,
      bullets: edu.bullets.filter(b => b.enabled)
    }));

    const enabledProjects = masterResume.projects.map(proj => ({
      ...proj,
      bullets: proj.bullets.filter(b => b.enabled)
    }));

    const enabledLeadership = masterResume.leadership.filter(l => l.enabled);

    const resumeContext = `
=== MASTER RESUME DATA (USE THIS EXACTLY) ===

HEADER:
Name: ${masterResume.header.name}
Email: ${masterResume.header.email}
Phone: ${masterResume.header.phone}
Location: ${masterResume.header.location}
LinkedIn: ${masterResume.header.linkedin}
${masterResume.header.website ? `Website: ${masterResume.header.website}` : ''}

EDUCATION:
${enabledEducation.map(edu => `
${edu.degree} in ${edu.field} | ${edu.graduationDate}
${edu.school}, ${edu.location}
${edu.gpa ? `GPA: ${edu.gpa}` : ''}
${edu.bullets.map(b => `• ${b.text}`).join('\n')}
`).join('\n')}

WORK EXPERIENCE:
${enabledExperience.map(exp => `
${exp.title} | ${exp.startDate} to ${exp.endDate}
${exp.company}, ${exp.location}
${exp.bullets.map(b => `• ${b.text}`).join('\n')}
`).join('\n')}

LEADERSHIP EXPERIENCE:
${enabledLeadership.map(l => `• ${l.text}`).join('\n')}

ACADEMIC PROJECTS:
${enabledProjects.map(proj => `
${proj.name}
${proj.description}
Technologies: ${proj.technologies.join(', ')}
${proj.bullets.map(b => `• ${b.text}`).join('\n')}
`).join('\n')}

SKILLS:
${masterResume.skills.technical.join(', ')}

LANGUAGES:
${masterResume.skills.languages.join(', ')}

=== END MASTER RESUME ===
`;

    const jobContext = `
=== TARGET JOB (FOR TAILORING ONLY) ===
Company: ${jobDescription.company}
Role: ${jobDescription.role}
Location: ${jobDescription.location}
${jobDescription.salary ? `Salary: ${jobDescription.salary}` : ''}
Type: ${jobDescription.jobType}
Industry: ${jobDescription.industry}

Required Skills: ${jobDescription.requiredSkills.join(', ')}
Keywords: ${jobDescription.keywords.join(', ')}

Job Description:
${jobDescription.rawText}
=== END JOB DESCRIPTION ===
`;

    const systemPrompt = `You are an expert resume writer. Your task is to create a tailored resume using ONLY the information from the master resume.

CRITICAL RULES:
1. DO NOT invent, add, or fabricate any information not in the master resume
2. DO NOT add companies, roles, skills, or achievements that aren't in the master resume
3. ONLY reword, reorganize, and emphasize existing content to match the job
4. Keep all dates, company names, titles, and facts exactly as provided
5. You may reorder bullets or sections to prioritize relevant experience
6. You may slightly rephrase bullets to incorporate job keywords naturally

SETTINGS:
- Resume Length: ${settings.resumeLength} page(s) - select most relevant content if needed
- Emphasis: ${settings.emphasis} (prioritize ${settings.emphasis === 'technical' ? 'technical skills and projects' : settings.emphasis === 'leadership' ? 'leadership experience and team achievements' : settings.emphasis === 'business' ? 'business impact and measurable results' : 'a balanced mix'})
- ATS Level: ${settings.atsLevel} (${settings.atsLevel === 'high' ? 'naturally incorporate job keywords' : settings.atsLevel === 'medium' ? 'moderate keyword integration' : 'focus on readability'})
- Cover Letter Tone: ${settings.coverLetterTone}

OUTPUT FORMAT - Return valid JSON:
{
  "resume": "Full formatted resume text using ONLY master resume data. Format with clear sections: header at top, then EDUCATION, WORK EXPERIENCE, LEADERSHIP EXPERIENCE, ACADEMIC PROJECTS, SKILLS, LANGUAGES. Use bullet points (•) for achievements.",
  "coverLetter": "3-4 paragraph cover letter connecting master resume experience to the job. Reference specific achievements from the resume.${settings.includeCoverLetter ? '' : ' Return empty string if cover letter not requested.'}",
  "whyRole": "2-3 sentences answering 'Why this role?' using relevant experience from master resume",
  "whyCompany": "2-3 sentences answering 'Why this company?' connecting your background to their needs"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${resumeContext}\n\n${jobContext}\n\nGenerate the tailored application materials using ONLY the master resume information.` }
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      console.error(`[ERROR] AI service returned status ${response.status}`);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service quota exceeded. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to process request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[ERROR] Empty AI response');
      return new Response(
        JSON.stringify({ error: 'Failed to process request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JSON from the response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      console.log('[INFO] Successfully generated application materials');
      
      return new Response(
        JSON.stringify({ success: true, data: parsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch {
      console.error('[ERROR] Failed to parse AI response as JSON');
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            resume: content,
            coverLetter: '',
            whyRole: '',
            whyCompany: ''
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[ERROR] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
