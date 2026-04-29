const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        error:
          "OPENAI_API_KEY ontbreekt in de Netlify environment. Voeg deze toe voordat je realtime voice gebruikt.",
      },
      500,
    );
  }

  let incomingFormData;
  try {
    incomingFormData = await request.formData();
  } catch (error) {
    return jsonResponse(
      { error: "Kon multipart form-data niet uitlezen.", details: error.message },
      400,
    );
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
    },
    body: upstreamFormData,
  });

  return new Response(await realtimeResponse.text(), {
    status: realtimeResponse.status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": realtimeResponse.headers.get("content-type") || "application/sdp",
    },
  });
}
