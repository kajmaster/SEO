import {
  getBackendEnv,
  handleOptions,
  jsonResponse,
  supabaseFetch,
} from "./_contentflow-backend";

type UnknownRecord = Record<string, unknown>;

async function getAuthenticatedUser(request: Request): Promise<{ id: string; email: string }> {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Geen geldige Authorization header ontvangen.");
  }

  const env = getBackendEnv();
  const response = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: env.serviceRoleKey,
      Authorization: authHeader,
    },
  });

  const data = (await response.json().catch(() => null)) as UnknownRecord | null;
  if (!response.ok || !data?.id) {
    throw new Error(
      String(
        (data?.message as string) ||
          (data?.error_description as string) ||
          "Kon ingelogde gebruiker niet valideren.",
      ),
    );
  }

  return {
    id: String(data.id),
    email: typeof data.email === "string" ? data.email : "",
  };
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const user = await getAuthenticatedUser(request);
    const body = ((await request.json().catch(() => ({}))) || {}) as UnknownRecord;
    const now = new Date().toISOString();

    let profileRows = await supabaseFetch<UnknownRecord[]>(
      `profiles?id=eq.${encodeURIComponent(user.id)}&select=*`,
      { method: "GET", headers: { Prefer: "return=representation" } },
    );
    let profile = Array.isArray(profileRows) ? profileRows[0] || null : null;

    if (!profile) {
      const createdProfiles = await supabaseFetch<UnknownRecord[]>("profiles", {
        method: "POST",
        body: JSON.stringify({
          id: user.id,
          company_name:
            (typeof body.company_name === "string" && body.company_name) || "ContentFlow B.V.",
          updated_at: now,
        }),
      });
      profile = Array.isArray(createdProfiles) ? createdProfiles[0] || null : null;
    }

    let workspaceId =
      profile && isUuid(profile.default_workspace_id) ? String(profile.default_workspace_id) : "";

    let workspace: UnknownRecord | null = null;

    if (workspaceId) {
      const workspaceRows = await supabaseFetch<UnknownRecord[]>(
        `workspaces?id=eq.${encodeURIComponent(workspaceId)}&select=*`,
        { method: "GET", headers: { Prefer: "return=representation" } },
      );
      workspace = Array.isArray(workspaceRows) ? workspaceRows[0] || null : null;
    }

    if (!workspace) {
      const workspaceRows = await supabaseFetch<UnknownRecord[]>(
        `workspaces?owner_user_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.asc&limit=1`,
        { method: "GET", headers: { Prefer: "return=representation" } },
      );
      workspace = Array.isArray(workspaceRows) ? workspaceRows[0] || null : null;
    }

    if (!workspace) {
      const createdWorkspaces = await supabaseFetch<UnknownRecord[]>("workspaces", {
        method: "POST",
        body: JSON.stringify({
          owner_user_id: user.id,
          name:
            (typeof body.workspace_name === "string" && body.workspace_name) ||
            (typeof body.company_name === "string" && body.company_name) ||
            "Nieuwe workspace",
          company_name:
            (typeof body.company_name === "string" && body.company_name) || null,
          launch_mode: "concierge_beta",
          updated_at: now,
        }),
      });
      workspace = Array.isArray(createdWorkspaces) ? createdWorkspaces[0] || null : null;
    }

    if (!workspace?.id) {
      throw new Error("Kon geen workspace ophalen of aanmaken.");
    }

    workspaceId = String(workspace.id);

    const membershipRows = await supabaseFetch<UnknownRecord[]>(
      `workspace_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(user.id)}&select=*`,
      { method: "GET", headers: { Prefer: "return=representation" } },
    );

    if (!Array.isArray(membershipRows) || membershipRows.length === 0) {
      await supabaseFetch("workspace_members", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspaceId,
          user_id: user.id,
          role: "admin",
        }),
      });
    }

    const updatedProfiles = await supabaseFetch<UnknownRecord[]>(
      `profiles?id=eq.${encodeURIComponent(user.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          default_workspace_id: workspaceId,
          updated_at: now,
        }),
        headers: { Prefer: "return=representation" },
      },
    );
    profile = Array.isArray(updatedProfiles) ? updatedProfiles[0] || profile : profile;

    return jsonResponse({
      ok: true,
      user_id: user.id,
      workspace_id: workspaceId,
      profile,
      workspace,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Kon user-context niet opbouwen." },
      500,
    );
  }
}
