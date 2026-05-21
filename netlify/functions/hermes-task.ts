import { handleOptions, jsonResponse } from "./_contentflow-backend";

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

    const { hermesUrl, hermesApiKey } = getHermesEnv();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

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
