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
    const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id : "";
    const pageId = typeof body.page_id === "string" ? body.page_id : "";
    if (!workspaceId || !pageId) {
      return jsonResponse({ error: "workspace_id en page_id zijn verplicht." }, 400);
    }

    const expiresInDays = Number(body.expires_in_days || 0);
    const expiresAt =
      expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
        : null;

    const rows = await supabaseFetch<UnknownRecord | UnknownRecord[]>("review_links", {
      method: "POST",
      body: JSON.stringify({
        workspace_id: workspaceId,
        page_id: pageId,
        reviewer_name: typeof body.reviewer_name === "string" ? body.reviewer_name : null,
        reviewer_email:
          typeof body.reviewer_email === "string" ? body.reviewer_email : null,
        message: typeof body.message === "string" ? body.message : null,
        expires_at: expiresAt,
        created_by: typeof body.created_by === "string" ? body.created_by : null,
      }),
    });

    const link = Array.isArray(rows) ? rows[0] : rows;
    const origin = new URL(request.url).origin;
    return jsonResponse(
      {
        review_link: {
          id: String(link?.id || ""),
          token: String(link?.token || ""),
          expires_at: link?.expires_at || null,
          url: `${origin}/?review=${link?.token || ""}`,
        },
      },
      201,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Kon review link niet aanmaken.";
    return jsonResponse({ error: message }, 500);
  }
}
