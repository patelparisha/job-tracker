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
function validateJobText(jobText: unknown): { valid: boolean; error?: string; value?: string } {
  if (typeof jobText !== 'string') {
    return { valid: false, error: 'Job description must be a string' };
  }
  const trimmed = jobText.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Job description is required' };
  }
  if (trimmed.length < 50) {
    return { valid: false, error: 'Job description is too short' };
  }
  if (trimmed.length > 50000) {
    return { valid: false, error: 'Job description is too long (max 50,000 characters)' };
  }
  return { valid: true, value: trimmed };
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

    const { jobText } = body as { jobText: unknown };
    const validation = validateJobText(jobText);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
if (!OPENAI_API_KEY) {
  console.error('[CONFIG] OPENAI_API_KEY not configured');
  return new Response(
    JSON.stringify({ error: 'Service temporarily unavailable' }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

    if (!OPENAI_API_KEY) {
      console.error('[CONFIG] API key not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[INFO] Parsing job description with AI...');

    const systemPrompt = `You are a job description parser. Extract structured information from job postings.
    
Always respond with valid JSON in this exact format:
{
  "company": "Company name",
  "role": "Job title",
  "location": "City, State or Remote",
  "salary": "Salary range if mentioned, or null",
  "jobType": "full-time" | "part-time" | "internship" | "contract",
  "industry": "Industry sector",
  "requiredSkills": ["skill1", "skill2", "skill3"],
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Guidelines:
- Extract the exact company name and role title
- For salary, include the full range if available (e.g., "$120,000 - $150,000")
- For jobType, choose the most appropriate: full-time, part-time, internship, or contract
- For requiredSkills, extract technical skills, programming languages, frameworks, and tools
- For keywords, extract soft skills, methodologies, and important job-related terms
- If information is not available, use reasonable defaults or empty strings/arrays`;

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
          { role: 'user', content: `Parse this job description:\n\n${validation.value}` }
        ],
        temperature: 0.3,
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

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      console.log('[INFO] Successfully parsed job description');
      
      return new Response(
        JSON.stringify({ success: true, data: parsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch {
      console.error('[ERROR] Failed to parse AI response as JSON');
      return new Response(
        JSON.stringify({ error: 'Failed to process response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
