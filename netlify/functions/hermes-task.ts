import { createHmac, timingSafeEqual } from "crypto";
import { getBackendEnv, handleOptions, jsonResponse, supabaseFetch } from "./_contentflow-backend";

type UnknownRecord = Record<string, unknown>;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getHermesEnv(): { hermesUrl: string; hermesApiKey: string } {
  const hermesUrl = process.env.HERMES_URL;
  const hermesApiKey = process.env.HERMES_API_KEY;

  if (!hermesUrl || !hermesApiKey) {
    throw new Error("HERMES_URL of HERMES_API_KEY ontbreekt in Netlify environment variables.");
  }

  return {
    hermesUrl: hermesUrl.replace(/\/$/, ""),
    hermesApiKey,
  };
}

function verifyHermesStudioToken(token: string, body: UnknownRecord): boolean {
  const secret = process.env.CONTENTFLOW_INTERNAL_KEY;
  if (!secret || !token.includes(".")) return false;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const expected = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return false;
  }

  let payload: UnknownRecord;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as UnknownRecord;
  } catch {
    return false;
  }

  const exp = Number(payload.exp || 0);
  const workspaceId = clean(payload.workspace_id);
  const userId = clean(payload.user_id);
  return (
    clean(payload.scope) === "hermes_studio_demo" &&
    exp > Math.floor(Date.now() / 1000) &&
    workspaceId === clean(body.workspace_id) &&
    userId === clean(body.user_id)
  );
}

async function getAuthenticatedUser(request: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
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
    return null;
  }

  return {
    id: String(data.id),
    email: typeof data.email === "string" ? data.email : "",
  };
}

async function isAllowedRequest(request: Request, body: UnknownRecord): Promise<boolean> {
  const internalKey = process.env.CONTENTFLOW_INTERNAL_KEY;
  const incomingInternalKey = request.headers.get("x-contentflow-key");
  if (internalKey && incomingInternalKey === internalKey) {
    return true;
  }

  const studioToken = request.headers.get("x-hermes-studio-token") || "";
  if (verifyHermesStudioToken(studioToken, body)) {
    return true;
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return false;
  }

  const workspaceId = clean(body.workspace_id);
  if (!workspaceId) {
    return false;
  }

  const ownedRows = await supabaseFetch<UnknownRecord[]>(
    `workspaces?id=eq.${encodeURIComponent(workspaceId)}&owner_user_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  );
  if (Array.isArray(ownedRows) && ownedRows.length > 0) {
    return true;
  }

  const memberRows = await supabaseFetch<UnknownRecord[]>(
    `workspace_members?workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(user.id)}&select=workspace_id&limit=1`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  );

  return Array.isArray(memberRows) && memberRows.length > 0;
}

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as UnknownRecord;
    const task = clean(body.task);

    if (!task) {
      return jsonResponse({ error: "task is verplicht." }, 400);
    }

    const allowed = await isAllowedRequest(request, body);
    if (!allowed) {
      return jsonResponse(
        {
          error:
            "Niet toegestaan. Hermes vereist een geldige login of een server-side internal key.",
        },
        401,
      );
    }

    const { hermesUrl, hermesApiKey } = getHermesEnv();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    let hermesResponse: Response;
    try {
      hermesResponse = await fetch(`${hermesUrl}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hermes-key": hermesApiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const text = await hermesResponse.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text || null;
    }

    if (!hermesResponse.ok) {
      return jsonResponse(
        {
          error: "Hermes request mislukte.",
          hermes_status: hermesResponse.status,
          hermes_response: parsed,
        },
        502,
      );
    }

    return jsonResponse({
      ok: true,
      hermes: parsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hermes koppeling mislukte.";
    const status = message.includes("ontbreekt") ? 500 : 502;
    return jsonResponse({ error: message }, status);
  }
}
