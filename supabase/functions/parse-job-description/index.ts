import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
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

// Input validation
function validateJobText(jobText: unknown) {
  if (typeof jobText !== "string") {
    return { valid: false, error: "Job description must be a string" };
  }
  const trimmed = jobText.trim();
  if (!trimmed) return { valid: false, error: "Job description is required" };
  if (trimmed.length < 50)
    return { valid: false, error: "Job description is too short" };
  if (trimmed.length > 50000)
    return {
      valid: false,
      error: "Job description is too long (max 50,000 characters)",
    };
  return { valid: true, value: trimmed };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 🔐 AUTH HEADER
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // ✅ CREATE SUPABASE CLIENT **CORRECTLY**
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // ✅ VALIDATE USER
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[AUTH] Invalid JWT", userError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // 📥 BODY
    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const validation = validateJobText(body.jobText);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 🔑 OPENAI KEY (FROM SUPABASE SECRETS)
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("[CONFIG] OPENAI_API_KEY missing");
      return new Response(
        JSON.stringify({ error: "Service unavailable" }),
        { status: 503, headers: corsHeaders }
      );
    }

    const systemPrompt = `You are a job description parser.
Always respond with valid JSON in this format:
{
  "company": "",
  "role": "",
  "location": "",
  "salary": null,
  "jobType": "full-time",
  "industry": "",
  "requiredSkills": [],
  "keywords": []
}`;

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Parse this job description:\n\n${validation.value}`,
            },
          ],
          temperature: 0.3,
        }),
      }
    );

    if (!aiRes.ok) {
      console.error("[AI ERROR]", aiRes.status);
      return new Response(
        JSON.stringify({ error: "AI request failed" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const aiJson = await aiRes.json();
    let content = aiJson.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Empty AI response" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) content = match[1];

    const parsed = JSON.parse(content);

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[FATAL]", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
