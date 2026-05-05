import { handleOptions, jsonResponse, supabaseFetch } from "./_contentflow-backend";

type UnknownRecord = Record<string, unknown>;

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  const url = new URL(request.url);
  const jobId = url.searchParams.get("id");
  if (!jobId) {
    return jsonResponse({ error: "Query parameter id ontbreekt." }, 400);
  }

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const rows = await supabaseFetch<UnknownRecord[]>(
      `generation_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`,
      { method: "GET", headers: { Prefer: "return=representation" } },
    );
    const job = Array.isArray(rows) ? rows[0] || null : null;
    if (!job) return jsonResponse({ error: "Generation job niet gevonden." }, 404);
    return jsonResponse({ job });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Kon generation job niet ophalen.";
    return jsonResponse({ error: message }, 500);
  }
}
