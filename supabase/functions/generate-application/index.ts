import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   CORS CONFIG
========================= */

const allowedOrigins = [
  "https://lovable.dev",
  "https://www.lovable.dev",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/)) return true;
  if (origin.match(/^https:\/\/.*\.vercel\.app$/)) return true;
  if (origin.startsWith("http://localhost:")) return true;
  return false;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

/* =========================
   TYPES & VALIDATION
========================= */

interface Bullet { id: string; text: string; enabled: boolean; }

interface MasterResume {
  header: { name: string; email: string; phone: string; linkedin: string; location: string; website?: string; };
  summaries: Array<{ id: string; name: string; text: string; isDefault: boolean }>;
  education: Array<{ id: string; school: string; degree: string; field: string; location: string; graduationDate: string; gpa?: string; bullets: Bullet[] }>;
  experience: Array<{ id: string; company: string; title: string; location: string; startDate: string; endDate: string; bullets: Bullet[] }>;
  projects: Array<{ id: string; name: string; description: string; technologies: string[]; link?: string; bullets: Bullet[] }>;
  skills: { technical: string[]; languages: string[]; tools: string[]; certifications: string[] };
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

const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 100;
const MAX_BULLETS = 50;

function validateString(value: unknown, maxLength = MAX_STRING_LENGTH): string {
  if (typeof value !== "string") return "";
  return value.trim().substring(0, maxLength);
}

function validateArray(value: unknown, maxLength = MAX_ARRAY_LENGTH): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxLength);
}

function validateBullets(bullets: unknown): Bullet[] {
  if (!Array.isArray(bullets)) return [];
  return bullets.slice(0, MAX_BULLETS).map(b => {
    if (typeof b !== "object" || b === null) return { id: "", text: "", enabled: false };
    const bullet = b as Record<string, unknown>;
    return {
      id: validateString(bullet.id, 100),
      text: validateString(bullet.text, 2000),
      enabled: typeof bullet.enabled === "boolean" ? bullet.enabled : false,
    };
  });
}

function validateMasterResume(data: unknown): MasterResume | null {
  if (typeof data !== "object" || data === null) return null;
  const r = data as Record<string, unknown>;
  const h = r.header as Record<string, unknown> | undefined;
  if (!h) return null;

  return {
    header: {
      name: validateString(h.name, 200),
      email: validateString(h.email, 254),
      phone: validateString(h.phone, 50),
      linkedin: validateString(h.linkedin, 500),
      location: validateString(h.location, 200),
      website: h.website ? validateString(h.website, 500) : undefined,
    },
    summaries: validateArray(r.summaries, 20).map(s => {
      const sObj = s as Record<string, unknown>;
      return { id: validateString(sObj.id, 100), name: validateString(sObj.name, 200), text: validateString(sObj.text, 2000), isDefault: !!sObj.isDefault };
    }),
    education: validateArray(r.education, 20).map(e => {
      const eObj = e as Record<string, unknown>;
      return { id: validateString(eObj.id, 100), school: validateString(eObj.school, 500), degree: validateString(eObj.degree, 200), field: validateString(eObj.field, 200), location: validateString(eObj.location, 200), graduationDate: validateString(eObj.graduationDate, 50), gpa: eObj.gpa ? validateString(eObj.gpa, 20) : undefined, bullets: validateBullets(eObj.bullets) };
    }),
    experience: validateArray(r.experience, 30).map(e => {
      const eObj = e as Record<string, unknown>;
      return { id: validateString(eObj.id, 100), company: validateString(eObj.company, 500), title: validateString(eObj.title, 200), location: validateString(eObj.location, 200), startDate: validateString(eObj.startDate, 50), endDate: validateString(eObj.endDate, 50), bullets: validateBullets(eObj.bullets) };
    }),
    projects: validateArray(r.projects, 30).map(p => {
      const pObj = p as Record<string, unknown>;
      return { id: validateString(pObj.id, 100), name: validateString(pObj.name, 500), description: validateString(pObj.description, 2000), technologies: validateArray(pObj.technologies, 50).map(t => validateString(t, 100)), link: pObj.link ? validateString(pObj.link, 500) : undefined, bullets: validateBullets(pObj.bullets) };
    }),
    skills: {
      technical: validateArray((r.skills as Record<string, unknown>)?.technical, 100).map(s => validateString(s, 100)),
      languages: validateArray((r.skills as Record<string, unknown>)?.languages, 50).map(s => validateString(s, 100)),
      tools: validateArray((r.skills as Record<string, unknown>)?.tools, 100).map(s => validateString(s, 100)),
      certifications: validateArray((r.skills as Record<string, unknown>)?.certifications, 50).map(s => validateString(s, 200)),
    },
    leadership: validateBullets(r.leadership),
  };
}

function validateJobDescription(data: unknown): JobDescription | null {
  if (typeof data !== "object" || data === null) return null;
  const j = data as Record<string, unknown>;
  return {
    company: validateString(j.company, 500),
    role: validateString(j.role, 500),
    location: validateString(j.location, 200),
    salary: j.salary ? validateString(j.salary, 100) : undefined,
    jobType: validateString(j.jobType, 50),
    industry: validateString(j.industry, 200),
    requiredSkills: validateArray(j.requiredSkills, 100).map(s => validateString(s, 100)),
    keywords: validateArray(j.keywords, 100).map(k => validateString(k, 100)),
    rawText: validateString(j.rawText, 50000),
  };
}

function validateSettings(data: unknown): Settings {
  if (typeof data !== "object" || data === null) return {
    resumeLength: 1,
    emphasis: "balanced",
    atsLevel: "medium",
    includeCoverLetter: true,
    coverLetterTone: "professional",
    generateWhyQuestions: true
  };
  const s = data as Record<string, unknown>;
  return {
    resumeLength: typeof s.resumeLength === "number" ? Math.min(Math.max(s.resumeLength, 1), 3) : 1,
    emphasis: ["technical","leadership","business","balanced"].includes(s.emphasis as string) ? s.emphasis as string : "balanced",
    atsLevel: ["low","medium","high"].includes(s.atsLevel as string) ? s.atsLevel as string : "medium",
    includeCoverLetter: typeof s.includeCoverLetter === "boolean" ? s.includeCoverLetter : true,
    coverLetterTone: validateString(s.coverLetterTone, 50) || "professional",
    generateWhyQuestions: typeof s.generateWhyQuestions === "boolean" ? s.generateWhyQuestions : true,
  };
}

/* =========================
   SERVER
========================= */

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return new Response(
      JSON.stringify({ error: "Invalid authentication" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    // Parse body
    let body: unknown;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { masterResume: rawResume, jobDescription: rawJob, settings: rawSettings } = body as Record<string, unknown>;
    const masterResume = validateMasterResume(rawResume);
    const jobDescription = validateJobDescription(rawJob);
    const settings = validateSettings(rawSettings);

    if (!masterResume || !jobDescription) return new Response(JSON.stringify({ error: "Resume and job description required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Debug logging
    console.log("[DEBUG] Resume experience count:", masterResume.experience.length);
    console.log("[DEBUG] Resume projects count:", masterResume.projects.length);
    console.log("[DEBUG] Job description length:", jobDescription.rawText.length);

    // Call AI
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return new Response(JSON.stringify({ error: "Service unavailable" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert resume writer. Use ONLY master resume data." },
          { role: "user", content: JSON.stringify({ masterResume, jobDescription, settings }) }
        ],
        temperature: 0.5,
      }),
    });

    const aiJson = await aiResponse.json();
    const content = aiJson.choices?.[0]?.message?.content || "";

    let parsed = { resume: content, coverLetter: "", whyRole: "", whyCompany: "" };
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[1].trim());
    } catch {}

    return new Response(JSON.stringify({ success: true, data: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Unexpected error occurred" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
