import { handleOptions, jsonResponse, supabaseFetch } from "./_contentflow-backend";

type UnknownRecord = Record<string, unknown>;

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await request.json()) as UnknownRecord;
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) return jsonResponse({ error: "token is verplicht." }, 400);

    const links = await supabaseFetch<UnknownRecord[]>(
      `review_links?token=eq.${encodeURIComponent(token)}&select=*`,
      { method: "GET", headers: { Prefer: "return=representation" } },
    );
    const reviewLink = Array.isArray(links) ? links[0] || null : null;
    if (!reviewLink) return jsonResponse({ error: "Review link niet gevonden." }, 404);

    const approvedAt = new Date().toISOString();
    await supabaseFetch(
      `review_links?id=eq.${encodeURIComponent(String(reviewLink.id || ""))}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          approved_at: approvedAt,
          approved_note:
            typeof body.approved_note === "string" ? body.approved_note : null,
        }),
        headers: { Prefer: "return=minimal" },
      },
    );

    await supabaseFetch(
      `content_pages?id=eq.${encodeURIComponent(String(reviewLink.page_id || ""))}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          review_status: "approved",
          status: "approved",
          updated_at: approvedAt,
        }),
        headers: { Prefer: "return=minimal" },
      },
    );

    return jsonResponse({
      ok: true,
      approved_at: approvedAt,
      page_id: String(reviewLink.page_id || ""),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Goedkeuren mislukt.";
    return jsonResponse({ error: message }, 500);
  }
}
