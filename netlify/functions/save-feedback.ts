import {
  handleOptions,
  isUuid,
  jsonResponse,
  supabaseFetch,
  updateGenerationJob,
} from "./_contentflow-generation";

type UnknownRecord = Record<string, unknown>;

const ALLOWED_VERDICTS = new Set(["approved", "improve", "rejected"]);

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function makeRule(verdict: string, category: string, text: string): string {
  const compact = text.replace(/\s+/g, " ").trim().slice(0, 220);
  if (!compact) return "";
  if (verdict === "approved") return `Herhaal wat werkte${category ? ` rond ${category}` : ""}: ${compact}`;
  if (verdict === "rejected") return `Vermijd dit voortaan${category ? ` rond ${category}` : ""}: ${compact}`;
  return `Verbeter voortaan${category ? ` rond ${category}` : ""}: ${compact}`;
}

function extractForbiddenWords(text: string): string[] {
  const compact = text.toLowerCase().replace(/[“”"']/g, " ").replace(/\s+/g, " ").trim();
  const patterns = [
    /gebruik\s+nooit\s+(?:het\s+woord\s+)?([a-z0-9à-ÿ-]{3,})/gi,
    /gebruik\s+(?:het\s+woord\s+)?([a-z0-9à-ÿ-]{3,})\s+niet/gi,
    /vermijd\s+(?:het\s+woord\s+)?([a-z0-9à-ÿ-]{3,})/gi,
    /nooit\s+(?:het\s+woord\s+)?([a-z0-9à-ÿ-]{3,})/gi,
  ];
  const words = new Set<string>();
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(compact))) {
      const word = match[1]?.replace(/[^a-z0-9à-ÿ-]/gi, "").trim();
      if (word && !["woord", "woorden", "meer", "nooit", "niet"].includes(word)) words.add(word);
    }
  }
  return [...words].slice(0, 20);
}

function unique(values: string[], max = 20): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
    if (output.length >= max) break;
  }
  return output;
}

function pickSafeReplacement(forbiddenWords: string[]): string {
  const forbidden = new Set(forbiddenWords.map((word) => word.toLowerCase()));
  const candidates = ["gericht", "helder", "specifiek", "toepasbaar", "zorgvuldig", "passend"];
  return candidates.find((candidate) => !forbidden.has(candidate)) || "";
}

function replaceForbiddenWords(text: unknown, forbiddenWords: string[]): string {
  let output = typeof text === "string" ? text : "";
  const replacement = pickSafeReplacement(forbiddenWords);
  for (const word of forbiddenWords.map((item) => item.trim()).filter(Boolean)) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output.replace(new RegExp(`\\b${escaped}\\b`, "gi"), replacement);
  }
  return output.replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
}

function cleanVariant(variant: unknown, forbiddenWords: string[]): unknown {
  if (!variant || typeof variant !== "object" || Array.isArray(variant)) return variant;
  const row = variant as UnknownRecord;
  return {
    ...row,
    title: replaceForbiddenWords(row.title, forbiddenWords),
    meta_description: replaceForbiddenWords(row.meta_description, forbiddenWords),
    content: replaceForbiddenWords(row.content, forbiddenWords),
  };
}

function cleanGeneratedResult(result: UnknownRecord, forbiddenWords: string[]): UnknownRecord {
  if (!forbiddenWords.length) return result;
  const page = result.page && typeof result.page === "object" && !Array.isArray(result.page)
    ? (result.page as UnknownRecord)
    : null;
  return {
    ...result,
    title: replaceForbiddenWords(result.title, forbiddenWords),
    meta_description: replaceForbiddenWords(result.meta_description, forbiddenWords),
    content: replaceForbiddenWords(result.content, forbiddenWords),
    primary_variant: cleanVariant(result.primary_variant, forbiddenWords),
    variants: Array.isArray(result.variants)
      ? result.variants.map((variant) => cleanVariant(variant, forbiddenWords))
      : result.variants,
    page: page
      ? {
          ...page,
          title: replaceForbiddenWords(page.title, forbiddenWords),
          primary_variant: cleanVariant(page.primary_variant, forbiddenWords),
        }
      : result.page,
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
    const workspaceId = clean(body.workspace_id);
    const userId = clean(body.user_id);
    const jobId = clean(body.job_id);
    const verdict = clean(body.verdict);
    const category = clean(body.category) || "algemeen";
    const feedbackText = clean(body.feedback_text);
    const variantId = clean(body.variant_id);

    if (!isUuid(workspaceId) || !isUuid(userId) || !isUuid(jobId)) {
      return jsonResponse({ error: "workspace_id, user_id en job_id moeten geldige UUIDs zijn." }, 400);
    }
    if (!ALLOWED_VERDICTS.has(verdict)) {
      return jsonResponse({ error: "verdict moet approved, improve of rejected zijn." }, 400);
    }
    if (verdict !== "approved" && feedbackText.length < 3) {
      return jsonResponse({ error: "Feedbacktekst is verplicht bij verbeteren of afkeuren." }, 400);
    }

    const rows = await supabaseFetch<UnknownRecord[]>(
      `generation_jobs?id=eq.${encodeURIComponent(jobId)}&workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*`,
      { method: "GET", headers: { Prefer: "return=representation" } },
    );
    const job = Array.isArray(rows) ? rows[0] || null : null;
    if (!job) {
      return jsonResponse({ error: "Generation job niet gevonden." }, 404);
    }

    const currentResult = (job.result && typeof job.result === "object" ? job.result : {}) as UnknownRecord;
    const existingEvents = Array.isArray(currentResult.feedback_events)
      ? (currentResult.feedback_events as UnknownRecord[])
      : [];
    const existingRules = Array.isArray(currentResult.learning_rules)
      ? (currentResult.learning_rules as string[])
      : [];
    const existingForbiddenWords = Array.isArray(currentResult.forbidden_words)
      ? (currentResult.forbidden_words as string[])
      : [];
    const event = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      user_id: userId,
      job_id: jobId,
      variant_id: variantId || null,
      verdict,
      category,
      feedback_text: feedbackText || (verdict === "approved" ? "Goedgekeurd zonder extra opmerkingen." : ""),
      created_at: new Date().toISOString(),
    };
    const forbiddenWords = unique([...extractForbiddenWords(event.feedback_text), ...existingForbiddenWords], 30);
    const hardRules = forbiddenWords.map((word) => `Gebruik nooit het woord "${word}".`);
    const nextRules = unique([...hardRules, makeRule(verdict, category, event.feedback_text), ...existingRules]);
    const cleanedResult = cleanGeneratedResult(currentResult, forbiddenWords);
    const nextResult = {
      ...cleanedResult,
      feedback_events: [event, ...existingEvents].slice(0, 50),
      learning_rules: nextRules,
      forbidden_words: forbiddenWords,
      learning_summary: nextRules.slice(0, 8).join("\n"),
    };

    const updated = await updateGenerationJob(jobId, {
      result: nextResult,
      quality_summary: {
        ...((job.quality_summary && typeof job.quality_summary === "object" ? job.quality_summary : {}) as UnknownRecord),
        latest_feedback: event,
        learning_rule_count: nextRules.length,
      },
    });

    return jsonResponse({
      ok: true,
      event,
      learning_rules: nextRules,
      forbidden_words: forbiddenWords,
      job: updated,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Feedback opslaan mislukte." },
      500,
    );
  }
}
