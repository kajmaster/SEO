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
    const nextRules = unique([makeRule(verdict, category, event.feedback_text), ...existingRules]);
    const nextResult = {
      ...currentResult,
      feedback_events: [event, ...existingEvents].slice(0, 50),
      learning_rules: nextRules,
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
      job: updated,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Feedback opslaan mislukte." },
      500,
    );
  }
}
