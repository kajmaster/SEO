const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

interface OpenAiRealtimeErrorShape {
  error?: {
    message?: string;
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const projectId = process.env.OPENAI_PROJECT_ID;
  const organizationId = process.env.OPENAI_ORGANIZATION;
  if (!apiKey) {
    return jsonResponse(
      {
        error:
          "OPENAI_API_KEY ontbreekt in de Netlify environment. Voeg deze toe voordat je realtime voice gebruikt.",
      },
      500,
    );
  }

  let incomingFormData: FormData;
  try {
    incomingFormData = await request.formData();
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Onbekende multipart form-data fout.";
    return jsonResponse({ error: "Kon multipart form-data niet uitlezen.", details }, 400);
  }

  const sdp = incomingFormData.get("sdp");
  const session = incomingFormData.get("session");

  if (typeof sdp !== "string" || !sdp.trim()) {
    return jsonResponse({ error: "Veld 'sdp' ontbreekt in de request." }, 400);
  }

  const upstreamFormData = new FormData();
  upstreamFormData.set("sdp", sdp);
  if (typeof session === "string" && session.trim()) {
    upstreamFormData.set("session", session);
  }

  const realtimeResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(projectId ? { "OpenAI-Project": projectId } : {}),
      ...(organizationId ? { "OpenAI-Organization": organizationId } : {}),
    },
    body: upstreamFormData,
  });

  const responseText = await realtimeResponse.text();

  if (!realtimeResponse.ok) {
    let parsed: OpenAiRealtimeErrorShape | null = null;
    try {
      parsed = JSON.parse(responseText) as OpenAiRealtimeErrorShape;
    } catch {
      parsed = null;
    }

    return jsonResponse(
      {
        error:
          parsed?.error?.message ||
          responseText ||
          `OpenAI Realtime request failed with status ${realtimeResponse.status}.`,
        upstream_status: realtimeResponse.status,
        upstream_type: realtimeResponse.headers.get("content-type") || null,
      },
      realtimeResponse.status,
    );
  }

  return new Response(responseText, {
    status: realtimeResponse.status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": realtimeResponse.headers.get("content-type") || "application/sdp",
    },
  });
}
