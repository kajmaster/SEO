import {
  extractOpenAiMessageContent,
  getBackendEnv,
  handleOptions,
  isUuid,
  jsonResponse,
  supabaseFetch,
} from "./_contentflow-generation";

type UnknownRecord = Record<string, unknown>;

interface ToneAnalysis {
  website_url: string;
  company_name: string;
  services: string;
  tone_label: string;
  tone_nl: string;
  style_principles: string[];
  writing_rules: string[];
  avoid: string[];
  cta_style: string;
  paragraph_length: string;
  confidence: number;
  source_summary: string;
}

const CONTENT_MODEL = process.env.OPENAI_CONTENT_MODEL || "gpt-4o-mini";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).replace(/\s+/g, " ").trim()).filter(Boolean)
    : [];
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function normalizeUrl(value: string): URL {
  const raw = value.trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Gebruik een normale http(s)-website URL.");
  }
  const host = parsed.hostname.toLowerCase();
  const blocked =
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  if (blocked) throw new Error("Lokale of private URLs kunnen niet worden gescand.");
  parsed.hash = "";
  return parsed;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function pickTagContent(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return decodeEntities(match?.[1] || "").replace(/\s+/g, " ").trim();
}

function extractWebsiteText(html: string): {
  title: string;
  description: string;
  headings: string[];
  bodyText: string;
} {
  const title = pickTagContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = pickTagContent(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  );
  const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => decodeEntities(match[1].replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 30);
  const bodyText = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 14000);

  return { title, description, headings, bodyText };
}

async function fetchWebsite(url: URL): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "ContentFlowToneScanner/1.0 (+https://splendid-ganache-01f6c2.netlify.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) throw new Error(`Website gaf HTTP ${response.status}.`);
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("Deze URL lijkt geen HTML-pagina te zijn.");
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseOpenAiJson(text: string): UnknownRecord {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("OpenAI gaf geen geldige stijlanalyse terug.");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as UnknownRecord;
}

function normalizeAnalysis(raw: UnknownRecord, websiteUrl: string, source: ReturnType<typeof extractWebsiteText>): ToneAnalysis {
  const stylePrinciples = normalizeStringArray(raw.style_principles).slice(0, 8);
  const writingRules = normalizeStringArray(raw.writing_rules).slice(0, 10);
  const avoid = normalizeStringArray(raw.avoid).slice(0, 10);
  const toneLabel = clean(raw.tone_label) || "Professioneel en helder";
  const toneNl =
    clean(raw.tone_nl) ||
    [
      toneLabel,
      ...stylePrinciples.slice(0, 3),
      ...writingRules.slice(0, 2),
    ].join(". ");

  return {
    website_url: websiteUrl,
    company_name: clean(raw.company_name) || source.title,
    services: clean(raw.services),
    tone_label: toneLabel,
    tone_nl: toneNl,
    style_principles: stylePrinciples,
    writing_rules: writingRules,
    avoid,
    cta_style: clean(raw.cta_style),
    paragraph_length: clean(raw.paragraph_length) || "medium",
    confidence: Math.max(0, Math.min(1, Number(raw.confidence || 0.75))),
    source_summary: clean(raw.source_summary) || source.description || source.title,
  };
}

function buildPrompt(url: string, source: ReturnType<typeof extractWebsiteText>): string {
  return [
    "Analyseer de tone of voice en schrijfstijl van deze website voor ContentFlow.",
    "Doel: toekomstige Nederlandse B2B SEO-content moet dezelfde stijl aanhouden, zonder tekst letterlijk te kopieren.",
    "",
    `URL: ${url}`,
    `Titel: ${source.title}`,
    `Meta description: ${source.description}`,
    "",
    "Koppen:",
    source.headings.map((heading) => `- ${heading}`).join("\n") || "- Geen duidelijke koppen gevonden.",
    "",
    "Website tekstfragment:",
    source.bodyText,
    "",
    "Retourneer exact geldig JSON in dit formaat:",
    JSON.stringify({
      company_name: "string",
      services: "korte samenvatting van diensten/producten",
      tone_label: "korte stijlnaam",
      tone_nl: "Nederlandse tone-of-voice samenvatting voor de copywriter",
      style_principles: ["regel over stijl"],
      writing_rules: ["concrete schrijfregel"],
      avoid: ["wat niet doen"],
      cta_style: "hoe call-to-actions klinken",
      paragraph_length: "short|medium|long",
      confidence: 0.85,
      source_summary: "wat je uit de website hebt afgeleid",
    }),
  ].join("\n");
}

async function analyzeWithOpenAi(url: string, source: ReturnType<typeof extractWebsiteText>): Promise<ToneAnalysis> {
  const env = getBackendEnv();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openAiKey}`,
      "Content-Type": "application/json",
      ...(env.openAiProjectId ? { "OpenAI-Project": env.openAiProjectId } : {}),
      ...(env.openAiOrganization ? { "OpenAI-Organization": env.openAiOrganization } : {}),
    },
    body: JSON.stringify({
      model: CONTENT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Je bent een senior brand strategist en Nederlandse B2B copy chief. Analyseer stijl scherp, praktisch en bruikbaar voor toekomstige generatie. Retourneer alleen geldig JSON.",
        },
        { role: "user", content: buildPrompt(url, source) },
      ],
    }),
  });
  const payload = await response.text();
  if (!response.ok) {
    let parsed: UnknownRecord | null = null;
    try {
      parsed = JSON.parse(payload) as UnknownRecord;
    } catch {
      parsed = null;
    }
    const message = clean(asRecord(parsed?.error)?.message) || payload || `OpenAI gaf HTTP ${response.status}.`;
    throw new Error(message);
  }
  const parsed = parseOpenAiJson(extractOpenAiMessageContent(payload));
  return normalizeAnalysis(parsed, url, source);
}

async function saveAnalysis(userId: string, analysis: ToneAnalysis): Promise<UnknownRecord> {
  const existingRows = await supabaseFetch<UnknownRecord[]>(
    `profiles?id=eq.${encodeURIComponent(userId)}&select=*`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  );
  const existing = Array.isArray(existingRows) ? existingRows[0] || null : null;
  const existingAlgo = asRecord(existing?.algo_settings) || {};
  const nextAlgo = {
    ...existingAlgo,
    website_tone_analysis: {
      ...analysis,
      analyzed_at: new Date().toISOString(),
    },
  };
  const payload = {
    id: userId,
    website: analysis.website_url,
    services: analysis.services || clean(existing?.services),
    tone_nl: analysis.tone_nl,
    paragraph_length: analysis.paragraph_length,
    algo_settings: nextAlgo,
    updated_at: new Date().toISOString(),
  };
  const rows = await supabaseFetch<UnknownRecord[]>("profiles", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  });
  return Array.isArray(rows) ? rows[0] || payload : payload;
}

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as UnknownRecord;
    const websiteUrl = clean(body.website_url);
    const userId = clean(body.user_id);
    const workspaceId = clean(body.workspace_id);
    if (!websiteUrl) return jsonResponse({ error: "website_url is verplicht." }, 400);
    if (!isUuid(userId) || !isUuid(workspaceId)) {
      return jsonResponse({ error: "user_id en workspace_id moeten geldige UUIDs zijn." }, 400);
    }

    const normalizedUrl = normalizeUrl(websiteUrl);
    const html = await fetchWebsite(normalizedUrl);
    const source = extractWebsiteText(html);
    if (!source.bodyText || source.bodyText.length < 200) {
      return jsonResponse({ error: "Te weinig tekst gevonden op deze website om stijl te analyseren." }, 400);
    }

    const analysis = await analyzeWithOpenAi(normalizedUrl.toString(), source);
    const profile = await saveAnalysis(userId, analysis);

    return jsonResponse({
      ok: true,
      website_url: normalizedUrl.toString(),
      analysis,
      profile,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Websitestijl analyseren mislukte." },
      500,
    );
  }
}
