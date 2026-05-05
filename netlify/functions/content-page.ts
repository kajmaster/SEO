import { handleOptions, jsonResponse, loadPageBundle } from "./_contentflow-backend";

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const pageId = url.searchParams.get("id");
  if (!pageId) {
    return jsonResponse({ error: "Query parameter id ontbreekt." }, 400);
  }

  try {
    const bundle = await loadPageBundle(pageId);
    if (!bundle) return jsonResponse({ error: "Pagina niet gevonden." }, 404);
    return jsonResponse(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kon pagina niet ophalen.";
    return jsonResponse({ error: message }, 500);
  }
}
