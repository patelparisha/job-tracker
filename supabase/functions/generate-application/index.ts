import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   CORS
========================= */

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

/* =========================
   ENTRY
========================= */

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    /* =========================
       AUTH
    ========================= */

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (!user || error) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* =========================
       INPUT
    ========================= */

    const body = await req.json();
    const { masterResume, jobDescription, settings } = body;

    if (!masterResume || !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Missing input data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* =========================
       OPENAI
    ========================= */

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `
MASTER RESUME:
${JSON.stringify(masterResume)}

JOB DESCRIPTION:
${JSON.stringify(jobDescription)}

SETTINGS:
${JSON.stringify(settings)}

Return VALID JSON ONLY with keys:
resume, coverLetter, whyRole, whyCompany
`;

    const aiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
        }),
      }
    );

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.error("[OPENAI ERROR]", err);
      throw new Error("AI request failed");
    }

    const result = await aiResponse.json();
    let content = result.choices?.[0]?.message?.content;

    if (!content) throw new Error("Empty AI response");

    // Remove markdown wrappers if present
    content = content.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(content);

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ERROR]", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
