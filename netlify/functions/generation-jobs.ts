import { handleOptions, jsonResponse, supabaseFetch } from "./_contentflow-backend";

type UnknownRecord = Record<string, unknown>;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await request.json()) as UnknownRecord;
    const payload = {
      workspace_id: typeof body.workspace_id === "string" ? body.workspace_id : "",
      user_id: typeof body.user_id === "string" ? body.user_id : "",
      keyword: typeof body.keyword === "string" ? body.keyword.trim() : "",
      content_goal: typeof body.content_goal === "string" ? body.content_goal : "convince",
      status: typeof body.status === "string" ? body.status : "pending",
      template_id: isUuid(body.template_id) ? body.template_id : null,
      template_name: typeof body.template_name === "string" ? body.template_name : null,
      source_content: typeof body.source_content === "string" ? body.source_content : "",
      brand_profile_snapshot:
        body.brand_profile_snapshot && typeof body.brand_profile_snapshot === "object"
          ? body.brand_profile_snapshot
          : {},
      tone_profile:
        body.tone_profile && typeof body.tone_profile === "object" ? body.tone_profile : {},
      customer_preferences:
        body.customer_preferences && typeof body.customer_preferences === "object"
          ? body.customer_preferences
          : {},
    };

    if (!payload.workspace_id || !payload.user_id || !payload.keyword) {
      return jsonResponse({ error: "workspace_id, user_id en keyword zijn verplicht." }, 400);
    }

    const rows = await supabaseFetch<UnknownRecord | UnknownRecord[]>("generation_jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return jsonResponse({ job: Array.isArray(rows) ? rows[0] : rows }, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Kon generation job niet aanmaken.";
    return jsonResponse({ error: message }, 500);
  }
}
