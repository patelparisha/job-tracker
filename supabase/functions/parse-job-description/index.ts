import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* -------------------- CORS -------------------- */

const allowedOrigins = [
  "https://job-tracker-eight-omega.vercel.app",
];

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin)
      ? origin
      : "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

/* -------------------- Validation -------------------- */

function validateJobText(jobText: unknown) {
  if (typeof jobText !== "string") {
    return { valid: false, error: "Job description must be a string" };
  }

  const trimmed = jobText.trim();
  if (!trimmed) {
    return { valid: false, error: "Job description is required" };
  }

  if (trimmed.length < 50) {
    return { valid: false, error: "Job description too short" };
  }

  return { valid: true, value: trimmed };
}

/* -------------------- Edge Function -------------------- */

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    /* ---------- Auth ---------- */

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: corsHeaders }
      );
    }

    /* ---------- Body (SAFE PARSE) ---------- */

    let body: unknown;
    try {
      body = await req.json();
      console.log("PAYLOAD KEYS:", Object.keys(payload));
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("jobText" in body)
    ) {
      return new Response(
        JSON.stringify({
          error: "Missing jobText field",
          received: body,
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const validation = validateJobText((body as any).jobText);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: corsHeaders }
      );
    }

    /* ---------- OpenAI ---------- */

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers: corsHeaders }
      );
    }

    const systemPrompt = `
Return ONLY valid JSON:

{
  "company": "",
  "role": "",
  "location": "",
  "salary": null,
  "jobType": "full-time | part-time | internship | contract",
  "industry": "",
  "requiredSkills": [],
  "keywords": []
}
`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: validation.value },
        ],
      }),
    });

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Empty AI response" }),
        { status: 500, headers: corsHeaders }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON", raw: content }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Unexpected server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
