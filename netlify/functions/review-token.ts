import {
  buildPrimaryVariant,
  handleOptions,
  jsonResponse,
  mapVariant,
  normalizeReviewComment,
  supabaseFetch,
} from "./_contentflow-backend";

type UnknownRecord = Record<string, unknown>;

async function loadByToken(token: string) {
  const links = await supabaseFetch<UnknownRecord[]>(
    `review_links?token=eq.${encodeURIComponent(token)}&select=*`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  );
  const reviewLink = Array.isArray(links) ? links[0] || null : null;
  if (!reviewLink) return null;
  if (
    typeof reviewLink.expires_at === "string" &&
    new Date(reviewLink.expires_at).getTime() < Date.now()
  ) {
    throw new Error("Deze review link is verlopen.");
  }

  const pageId = String(reviewLink.page_id || "");
  const pages = await supabaseFetch<UnknownRecord[]>(
    `content_pages?id=eq.${encodeURIComponent(pageId)}&select=*`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  );
  const page = Array.isArray(pages) ? pages[0] || null : null;
  if (!page) throw new Error("Gekoppelde pagina niet gevonden.");

  const variantRows = await supabaseFetch<UnknownRecord[]>(
    `content_variants?page_id=eq.${encodeURIComponent(pageId)}&select=*&order=variant_index.asc`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  );
  const commentRows = await supabaseFetch<UnknownRecord[]>(
    `review_comments?review_link_id=eq.${encodeURIComponent(String(reviewLink.id || ""))}&select=*&order=created_at.asc`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  );

  const variants = (variantRows || []).map(mapVariant);
  return {
    review_link: {
      id: String(reviewLink.id || ""),
      token: String(reviewLink.token || ""),
      message: typeof reviewLink.message === "string" ? reviewLink.message : "",
      approved_at:
        typeof reviewLink.approved_at === "string" ? reviewLink.approved_at : null,
      expires_at:
        typeof reviewLink.expires_at === "string" ? reviewLink.expires_at : null,
    },
    page: {
      id: String(page.id || ""),
      title: String(page.title || ""),
      primary_keyword:
        typeof page.primary_keyword === "string" ? page.primary_keyword : "",
      status: String(page.status || ""),
      review_status: String(page.review_status || ""),
      seo_score: Number(page.seo_score || 0),
      quality_score: Number(page.quality_score || 0),
      primary_variant: buildPrimaryVariant(page, variants),
    },
    variants,
    comments: (commentRows || []).map(normalizeReviewComment),
  };
}

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return jsonResponse({ error: "Query parameter token ontbreekt." }, 400);

  try {
    if (request.method === "GET") {
      const bundle = await loadByToken(token);
      if (!bundle) return jsonResponse({ error: "Review link niet gevonden." }, 404);
      return jsonResponse(bundle);
    }

    if (request.method === "POST") {
      const linkBundle = await loadByToken(token);
      if (!linkBundle) return jsonResponse({ error: "Review link niet gevonden." }, 404);

      const body = (await request.json()) as UnknownRecord;
      const comment = typeof body.comment === "string" ? body.comment : "";
      const category = typeof body.category === "string" ? body.category : "";
      if (!comment || !category) {
        return jsonResponse({ error: "comment en category zijn verplicht." }, 400);
      }

      const rows = await supabaseFetch<UnknownRecord | UnknownRecord[]>("review_comments", {
        method: "POST",
        body: JSON.stringify({
          review_link_id: linkBundle.review_link.id,
          page_id: linkBundle.page.id,
          variant_id:
            typeof body.variant_id === "string"
              ? body.variant_id
              : linkBundle.page.primary_variant?.id || null,
          category,
          quote_text: typeof body.quote_text === "string" ? body.quote_text : null,
          anchor_text: typeof body.anchor_text === "string" ? body.anchor_text : null,
          comment,
          commenter_name:
            typeof body.commenter_name === "string" && body.commenter_name
              ? body.commenter_name
              : "Reviewer",
          commenter_email:
            typeof body.commenter_email === "string" ? body.commenter_email : null,
        }),
      });

      const created = Array.isArray(rows) ? rows[0] : rows;
      return jsonResponse({ comment: normalizeReviewComment(created || {}) }, 201);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review request mislukt.";
    const status = /verlopen/i.test(message) ? 410 : 500;
    return jsonResponse({ error: message }, status);
  }
}
