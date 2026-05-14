import {
  buildDefaultPlan,
  buildGenerationResponse,
  createGenerationJob,
  generateVariants,
  handleOptions,
  isUuid,
  jsonResponse,
  loadGenerationContext,
  saveGeneratedContent,
  type GeneratedDraft,
  type GenerateContentRequest,
  updateGenerationJob,
} from "./_contentflow-generation";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function validateRequest(body: unknown): GenerateContentRequest {
  const payload = (body || {}) as Record<string, unknown>;
  const keyword = String(payload.keyword || "").replace(/\s+/g, " ").trim();
  const request: GenerateContentRequest = {
    workspace_id: String(payload.workspace_id || ""),
    user_id: String(payload.user_id || ""),
    keyword,
    content_goal: String(payload.content_goal || "convince"),
    source_content: String(payload.source_content || ""),
    xml_template: String(payload.xml_template || ""),
    xml_template_name: String(payload.xml_template_name || ""),
    template_id: typeof payload.template_id === "string" ? payload.template_id : null,
    brand_profile_snapshot:
      payload.brand_profile_snapshot && typeof payload.brand_profile_snapshot === "object"
        ? (payload.brand_profile_snapshot as Record<string, unknown>)
        : {},
    tone_profile:
      payload.tone_profile && typeof payload.tone_profile === "object"
        ? (payload.tone_profile as Record<string, unknown>)
        : {},
    customer_preferences:
      payload.customer_preferences && typeof payload.customer_preferences === "object"
        ? (payload.customer_preferences as Record<string, unknown>)
        : {},
  };

  if (!isUuid(request.workspace_id) || !isUuid(request.user_id) || !request.keyword) {
    throw new Error("workspace_id, user_id en keyword zijn verplicht en moeten geldig zijn.");
  }

  const keywordWordCount = request.keyword.split(/\s+/).filter(Boolean).length;
  if (request.keyword.length > 90 || keywordWordCount > 10 || (/[.!?]/.test(request.keyword) && keywordWordCount > 5)) {
    throw new Error("Zoekwoord is te lang. Gebruik alleen een kort onderwerp, geen hele zin of foutmelding.");
  }

  return request;
}

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let jobId = "";
  let stage = "request";

  try {
    stage = "payload_lezen";
    const body = await request.json();
    stage = "payload_valideren";
    const input = validateRequest(body);

    stage = "job_aanmaken";
    const job = await createGenerationJob(input);
    jobId = String(job.id || "");
    if (!jobId) throw new Error("Generation job kon niet worden aangemaakt.");

    stage = "context_laden";
    await updateGenerationJob(jobId, { status: "drafting" });
    const context = await loadGenerationContext(input);
    const plan = buildDefaultPlan(input, context);

    stage = "tekst_genereren";
    await updateGenerationJob(jobId, { status: "drafting" });
    const draft: GeneratedDraft = await withTimeout(
      generateVariants(input, context, plan),
      21000,
      "OpenAI duurde te lang. Er is geen templatecopy opgeslagen omdat de kwaliteit dan te laag zou zijn.",
    );
    const variants = draft.variants;
    stage = "resultaat_opslaan";
    const saved = await saveGeneratedContent({
      input,
      job,
      variants,
      brandProfile: context.brandProfile,
    });

    stage = "response_bouwen";
    const responsePayload = buildGenerationResponse({
      job,
      page: saved.page,
      primaryVariant: saved.primaryVariant,
      variants: saved.variants,
      input,
      plan,
      qualityControl: draft.qualityControl,
    });

    stage = "job_afronden";
    await updateGenerationJob(jobId, {
      status: "ready_for_review",
      quality_summary: {
        selected_variant_combined_score: saved.primaryVariant.combined_score,
        variant_count: saved.variants.length,
        fallback_reason: null,
        planning_fallback_reason: "Strategie lokaal opgebouwd om Netlify timeouts te voorkomen.",
        quality_control: draft.qualityControl,
      },
      result: responsePayload.result,
    });

    return jsonResponse(responsePayload, 200);
  } catch (error) {
    if (jobId) {
      try {
        await updateGenerationJob(jobId, {
          status: "failed",
          error_message: error instanceof Error ? error.message : "Onbekende fout",
        });
      } catch {
        // Tweede fout willen we hier niet bovenop gooien.
      }
    }

    const message = error instanceof Error ? error.message : "Kon content niet genereren.";
    const status = /verplicht|geldig/i.test(message) ? 400 : 500;
    return jsonResponse({ error: message, stage, job_id: jobId || null }, status);
  }
}
