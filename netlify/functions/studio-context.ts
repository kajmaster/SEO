import { handleOptions, jsonResponse, supabaseFetch } from "./_contentflow-backend";

type UnknownRecord = Record<string, unknown>;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(request.url);
    const workspaceParam = clean(url.searchParams.get("workspace_id"));
    const body =
      request.method === "POST"
        ? (((await request.json().catch(() => ({}))) || {}) as UnknownRecord)
        : {};
    const requestedWorkspaceId = clean(body.workspace_id) || workspaceParam;

    const workspacePath = requestedWorkspaceId
      ? `workspaces?id=eq.${encodeURIComponent(requestedWorkspaceId)}&select=*&limit=1`
      : "workspaces?select=*&order=created_at.asc&limit=1";
    const workspaceRows = await supabaseFetch<UnknownRecord[]>(workspacePath, {
      method: "GET",
      headers: { Prefer: "return=representation" },
    });
    const workspace = Array.isArray(workspaceRows) ? workspaceRows[0] || null : null;

    if (!workspace?.id || !workspace?.owner_user_id) {
      return jsonResponse(
        {
          error:
            "Geen bestaande workspace gevonden. Maak eerst een workspace aan of vul handmatig workspace_id en user_id in.",
        },
        404,
      );
    }

    const profileRows = await supabaseFetch<UnknownRecord[]>(
      `profiles?id=eq.${encodeURIComponent(String(workspace.owner_user_id))}&select=*&limit=1`,
      { method: "GET", headers: { Prefer: "return=representation" } },
    );
    const profile = Array.isArray(profileRows) ? profileRows[0] || null : null;

    return jsonResponse({
      ok: true,
      workspace_id: workspace.id,
      user_id: workspace.owner_user_id,
      workspace,
      profile,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Studio-context laden mislukte." },
      500,
    );
  }
}
