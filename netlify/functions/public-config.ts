const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const FALLBACK_SUPABASE_URL = ["https://bnwvxjwykzjelclqzbvt", ".supabase.co"].join("");
const FALLBACK_SUPABASE_ANON_KEY = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.",
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJud3Z4and5a3pqZWxjbHF6YnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTk0ODEsImV4cCI6MjA5MTk5NTQ4MX0.",
  "LxGbca43nOJIDKD0yEQTkI-EAje15OB0hbSwEGO2mw8",
].join("");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = process.env.SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  return jsonResponse({
    supabaseUrl,
    supabaseAnonKey,
  });
}
