import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* -------------------- CORS -------------------- */

const allowedOrigins = [
  "https://job-tracker-eight-omega.vercel.app",
  "http://localhost:5173",
];

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin":
      origin && allowedOrigins.includes(origin) ? origin : "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

/* -------------------- Validation -------------------- */

function validateJobText(value: unknown) {
  if (typeof value !== "string") {
    return { valid: false, error: "Job description must be a string" };
  }

  const text = value.trim();
  if (!text) {
    return { valid: false, error: "Job description is required" };
  }

  if (text.length < 50) {
    return { valid: false, error: "Job description too short" };
  }

  return { valid: true, value: text };
}

/* -------------------- Edge Function -------------------- */

serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    /* ---------- AUTH ---------- */

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers }
      );
    }

    /* ---------- BODY ---------- */

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers }
      );
    }

    if (!body?.jobText) {
      return new Response(
        JSON.stringify({ error: "Missing jobText field" }),
        { status: 400, headers }
      );
    }

    const validation = validateJobText(body.jobText);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers }
      );
    }

    /* ---------- OPENAI ---------- */

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers }
      );
    }

    const prompt = `
Extract structured job data.
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

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          { role: "system", content: prompt },
          { role: "user", content: validation.value },
        ],
        temperature: 0.2,
      }),
    });

    const aiJson = await aiRes.json();
    const text = aiJson?.output?.[0]?.content?.[0]?.text;

    if (typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "AI returned no text", raw: aiJson }),
        { status: 500, headers }
      );
    }


    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON", raw: text }),
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers }
    );
  } catch (err) {
    console.error("EDGE ERROR:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected server error" }),
      { status: 500, headers }
    );
  }
});
