const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONTENT_MODEL = process.env.OPENAI_CONTENT_MODEL || "gpt-4o-mini";

type UnknownRecord = Record<string, unknown>;

export interface GenerateContentRequest {
  workspace_id: string;
  user_id: string;
  keyword: string;
  content_goal?: string;
  source_content?: string;
  xml_template?: string;
  xml_template_name?: string;
  template_id?: string | null;
  brand_profile_snapshot?: UnknownRecord;
  tone_profile?: UnknownRecord;
  customer_preferences?: UnknownRecord;
}

export interface GeneratedVariant {
  id: string;
  variant_index: number;
  title: string;
  meta_description: string;
  content: string;
  word_count: number;
  seo_score: number;
  quality_score: number;
  quality_notes: string[];
  quality_summary: string;
  combined_score: number;
  is_primary: boolean;
}

export interface ContentPlan {
  searchIntent: string;
  pageAngle: string;
  targetReader: string;
  recommendedStructure: string[];
  keyMessages: string[];
  proofPoints: string[];
  mustInclude: string[];
  mustAvoid: string[];
  ctaDirection: string;
  writingNotes: string[];
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export function handleOptions(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  return null;
}

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} ontbreekt in de environment.`);
  return value;
}

function getBackendEnv() {
  return {
    openAiKey: getRequiredEnv("OPENAI_API_KEY"),
    openAiProjectId: process.env.OPENAI_PROJECT_ID || "",
    openAiOrganization: process.env.OPENAI_ORGANIZATION || "",
    supabaseUrl: getRequiredEnv("SUPABASE_URL").replace(/\/$/, ""),
    supabaseServiceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export async function supabaseFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const env = getBackendEnv();
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.supabaseServiceRoleKey,
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text || null;
  }

  if (!response.ok) {
    const details =
      (parsed as { message?: string; hint?: string; error_description?: string } | null)?.message ||
      (parsed as { hint?: string } | null)?.hint ||
      (parsed as { error_description?: string } | null)?.error_description ||
      `Supabase request mislukt met status ${response.status}`;
    throw new Error(details);
  }

  return parsed as T;
}

async function safeFirstRow(path: string): Promise<UnknownRecord | null> {
  try {
    const rows = await supabaseFetch<UnknownRecord[]>(path, {
      method: "GET",
      headers: { Prefer: "return=representation" },
    });
    return Array.isArray(rows) ? rows[0] || null : null;
  } catch {
    return null;
  }
}

function sanitizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function mergeObjects(...parts: Array<UnknownRecord | null | undefined>): UnknownRecord {
  return parts.reduce<UnknownRecord>((acc, part) => {
    if (!part) return acc;
    for (const [key, value] of Object.entries(part)) {
      if (value === null || value === undefined) continue;
      if (typeof value === "string" && !value.trim()) continue;
      acc[key] = value;
    }
    return acc;
  }, {});
}

function countWords(content: string): number {
  return content
    .replace(/<[^>]*>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function stripMarkdownFence(value: string): string {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function extractJsonObject(value: string): UnknownRecord {
  const cleaned = stripMarkdownFence(value);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("OpenAI gaf geen geldig JSON-object terug.");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as UnknownRecord;
}

function scoreVariant(seoScore: number, qualityScore: number): number {
  return Number((qualityScore * 0.65 + seoScore * 0.35).toFixed(2));
}

function normalizeContentPlan(raw: UnknownRecord): ContentPlan {
  return {
    searchIntent: sanitizeText(raw.searchIntent) || "commercial-investigation",
    pageAngle: sanitizeText(raw.pageAngle) || "consultative-b2b-service-page",
    targetReader:
      sanitizeText(raw.targetReader) || "B2B-beslisser die aanbieders vergelijkt",
    recommendedStructure: normalizeStringArray(raw.recommendedStructure),
    keyMessages: normalizeStringArray(raw.keyMessages),
    proofPoints: normalizeStringArray(raw.proofPoints),
    mustInclude: normalizeStringArray(raw.mustInclude),
    mustAvoid: normalizeStringArray(raw.mustAvoid),
    ctaDirection: sanitizeText(raw.ctaDirection) || "Vraag een gesprek of offerte aan",
    writingNotes: normalizeStringArray(raw.writingNotes),
  };
}

function cloneVariant(base: GeneratedVariant, index: number, lead: string): GeneratedVariant {
  const title =
    index === 2
      ? `${base.title} voor besluitvormers`
      : `${base.title} met aanpak en voordelen`;
  const content = base.content.includes("</h1>")
    ? base.content.replace("</h1>", `</h1><p>${lead}</p>`)
    : `<p>${lead}</p>${base.content}`;
  const seoScore = Math.max(60, base.seo_score - (index - 1) * 2);
  const qualityScore = Math.max(60, base.quality_score - (index - 1));

  return {
    ...base,
    id: `variant-${index}`,
    variant_index: index,
    title,
    meta_description:
      index === 2
        ? `Lees hoe ${base.title.toLowerCase()} beslissers helpt om sneller keuzes te maken.`
        : `Ontdek de aanpak, voordelen en aandachtspunten van ${base.title.toLowerCase()}.`,
    content,
    word_count: countWords(content),
    seo_score: seoScore,
    quality_score: qualityScore,
    quality_notes: base.quality_notes.length ? base.quality_notes : ["Heldere structuur", "Natuurlijke flow"],
    quality_summary: base.quality_summary || "Sterke basisvariant voor verdere review.",
    combined_score: scoreVariant(seoScore, qualityScore),
    is_primary: false,
  };
}

function normalizeVariant(raw: UnknownRecord, index: number): GeneratedVariant {
  const title = sanitizeText(raw.title) || `Variant ${index}`;
  const metaDescription = sanitizeText(raw.meta_description);
  const content = sanitizeText(raw.content);
  const seoScore = Number(raw.seo_score || 78) || 78;
  const qualityScore = Number(raw.quality_score || 82) || 82;
  const qualityNotes = Array.isArray(raw.quality_notes)
    ? raw.quality_notes.map((note) => String(note)).filter(Boolean)
    : [];
  const qualitySummary = sanitizeText(raw.quality_summary);

  return {
    id: `variant-${index}`,
    variant_index: index,
    title,
    meta_description: metaDescription,
    content,
    word_count: Number(raw.word_count || countWords(content)) || countWords(content),
    seo_score: seoScore,
    quality_score: qualityScore,
    quality_notes: qualityNotes,
    quality_summary: qualitySummary,
    combined_score: scoreVariant(seoScore, qualityScore),
    is_primary: false,
  };
}

function ensureThreeVariants(variants: GeneratedVariant[]): GeneratedVariant[] {
  if (!variants.length) {
    return [
      {
        id: "variant-1",
        variant_index: 1,
        title: "Conceptvariant",
        meta_description: "",
        content: "<p>Geen content ontvangen van OpenAI.</p>",
        word_count: 5,
        seo_score: 70,
        quality_score: 70,
        quality_notes: ["Fallbackvariant"],
        quality_summary: "Fallbackvariant omdat de modeloutput leeg was.",
        combined_score: scoreVariant(70, 70),
        is_primary: false,
      },
    ];
  }

  while (variants.length < 3) {
    const base = variants[0];
    const lead =
      variants.length === 1
        ? "Deze variant legt de nadruk op duidelijkheid en besluitvorming voor drukke B2B-teams."
        : "Deze variant kiest een iets meer uitleggerichte invalshoek met nadruk op aanpak en vertrouwen.";
    variants.push(cloneVariant(base, variants.length + 1, lead));
  }

  return variants.slice(0, 3).map((variant, idx) => ({
    ...variant,
    id: `variant-${idx + 1}`,
    variant_index: idx + 1,
    combined_score: scoreVariant(variant.seo_score, variant.quality_score),
    is_primary: false,
  }));
}

function buildGoalInstruction(goal: string): string {
  if (goal === "inform") {
    return "Schrijf een informatieve B2B-pagina die helder uitlegt wat het onderwerp is, hoe het werkt en waarom het relevant is.";
  }
  if (goal === "convert") {
    return "Schrijf een conversiegerichte B2B-pagina voor lezers die klaar zijn om te beslissen. Werk naar een duidelijke CTA toe.";
  }
  return "Schrijf een overtuigende B2B-dienstenpagina voor beslissers die aanbieders vergelijken. Benadruk concrete voordelen en geloofwaardigheid zonder vage claims.";
}

export async function loadGenerationContext(input: GenerateContentRequest): Promise<{
  brandProfile: UnknownRecord;
  toneProfile: UnknownRecord;
  customerPreferences: UnknownRecord;
  template: UnknownRecord | null;
}> {
  const profile = await safeFirstRow(`profiles?id=eq.${encodeURIComponent(input.user_id)}&select=*`);
  const workspace = await safeFirstRow(
    `workspaces?id=eq.${encodeURIComponent(input.workspace_id)}&select=*`,
  );
  const brandProfile = await safeFirstRow(
    `brand_profiles?workspace_id=eq.${encodeURIComponent(input.workspace_id)}&select=*`,
  );
  const toneProfile = await safeFirstRow(
    `tone_profiles?workspace_id=eq.${encodeURIComponent(input.workspace_id)}&select=*`,
  );
  const customerPreferences = await safeFirstRow(
    `customer_preferences?workspace_id=eq.${encodeURIComponent(input.workspace_id)}&select=*`,
  );
  const template = isUuid(input.template_id || null)
    ? await safeFirstRow(`template_library?id=eq.${encodeURIComponent(input.template_id!)}&select=*`)
    : null;

  return {
    brandProfile: mergeObjects(workspace, profile, brandProfile, input.brand_profile_snapshot),
    toneProfile: mergeObjects(profile, toneProfile, input.tone_profile),
    customerPreferences: mergeObjects(profile, customerPreferences, input.customer_preferences),
    template,
  };
}

function buildPlanningPrompt(
  input: GenerateContentRequest,
  context: Awaited<ReturnType<typeof loadGenerationContext>>,
): string {
  const brand = context.brandProfile;
  const tone = context.toneProfile;
  const customer = context.customerPreferences;
  const xmlTemplate =
    sanitizeText(input.xml_template) || sanitizeText(context.template?.xml_template);
  const templateName =
    sanitizeText(input.xml_template_name) || sanitizeText(context.template?.name);
  const sourceContent = sanitizeText(input.source_content).slice(0, 3000);

  const lines = [
    `Maak een contentplan voor een Nederlandse B2B SEO-pagina over het zoekwoord: ${input.keyword}.`,
    "",
    "PAGINADOEL",
    buildGoalInstruction(input.content_goal || "convince"),
    "",
    "BEDRIJFSCONTEXT",
    `Bedrijfsnaam: ${sanitizeText(brand.company_name)}`,
    `Services: ${sanitizeText(brand.services)}`,
    `Doelgroep: ${sanitizeText(brand.target_audience)}`,
    `Buyer persona: ${sanitizeText(brand.buyer_persona)}`,
    "",
    "TONE OF VOICE",
    `Tone label: ${sanitizeText(tone.tone_label || tone.tone_nl)}`,
    `Voice principles: ${sanitizeText(tone.voice_principles || tone.tone_nl)}`,
    `Stijlvoorkeuren: ${sanitizeText(brand.style_preferences || tone.style_preferences)}`,
    `Verboden claims/woorden: ${sanitizeText(brand.prohibited_claims || tone.prohibited_words)}`,
    "",
    "CTA",
    `Gewenste CTA: ${sanitizeText(customer.primary_cta)}`,
  ];

  if (sourceContent) {
    lines.push("", "BRONMATERIAAL", sourceContent);
  }

  if (xmlTemplate) {
    lines.push(
      "",
      `STRUCTUURCONTEXT (${templateName || "template"})`,
      "Gebruik dit als richting voor de opbouw, maar neem geen XML-tags letterlijk over.",
      xmlTemplate,
    );
  }

  lines.push(
    "",
    "Bepaal:",
    "- de waarschijnlijke zoekintentie",
    "- de beste invalshoek voor deze pagina",
    "- voor welk type lezer deze pagina vooral bedoeld is",
    "- een aanbevolen sectiestructuur",
    "- de belangrijkste kernboodschappen",
    "- welke proof points of vertrouwenstriggers belangrijk zijn",
    "- wat absoluut moet worden opgenomen",
    "- wat absoluut vermeden moet worden",
    "- extra schrijfinstructies voor de copywriter",
    "",
    "Retourneer exact geldig JSON in dit formaat:",
    '{"searchIntent":"string","pageAngle":"string","targetReader":"string","recommendedStructure":["string"],"keyMessages":["string"],"proofPoints":["string"],"mustInclude":["string"],"mustAvoid":["string"],"ctaDirection":"string","writingNotes":["string"]}',
  );

  return lines.join("\n");
}

export async function planContent(
  input: GenerateContentRequest,
  context: Awaited<ReturnType<typeof loadGenerationContext>>,
): Promise<ContentPlan> {
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
            "Je bent een senior Nederlandse B2B contentstrateeg. Denk eerst na over zoekintentie, structuur, boodschap en geloofwaardigheid. Retourneer altijd geldig JSON.",
        },
        {
          role: "user",
          content: buildPlanningPrompt(input, context),
        },
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

    const message =
      sanitizeText((parsed?.error as UnknownRecord | undefined)?.message) ||
      sanitizeText(parsed?.message) ||
      payload ||
      `Planning request mislukt met status ${response.status}.`;

    throw new Error(message);
  }

  const parsed = extractJsonObject(payload);
  return normalizeContentPlan(parsed);
}

export function buildPrompt(
  input: GenerateContentRequest,
  context: Awaited<ReturnType<typeof loadGenerationContext>>,
  plan: ContentPlan,
): string {
  const brand = context.brandProfile;
  const tone = context.toneProfile;
  const customer = context.customerPreferences;
  const xmlTemplate = sanitizeText(input.xml_template) || sanitizeText(context.template?.xml_template);
  const templateName = sanitizeText(input.xml_template_name) || sanitizeText(context.template?.name);
  const sourceContent = sanitizeText(input.source_content).slice(0, 5000);

  const lines = [
    `Schrijf 3 verschillende SEO-varianten in het Nederlands voor het zoekwoord: ${input.keyword}.`,
    "",
    "DOEL",
    buildGoalInstruction(input.content_goal || "convince"),
    "",
    "CONTENTPLAN",
    `Zoekintentie: ${plan.searchIntent}`,
    `Pagina-invalshoek: ${plan.pageAngle}`,
    `Primaire lezer: ${plan.targetReader}`,
    `Aanbevolen structuur: ${plan.recommendedStructure.join(" | ")}`,
    `Kernboodschappen: ${plan.keyMessages.join(" | ")}`,
    `Proof points: ${plan.proofPoints.join(" | ")}`,
    `Moet erin: ${plan.mustInclude.join(" | ")}`,
    `Moet vermeden worden: ${plan.mustAvoid.join(" | ")}`,
    `CTA-richting: ${plan.ctaDirection}`,
    `Extra schrijfinstructies: ${plan.writingNotes.join(" | ")}`,
    "",
    "BEDRIJFSCONTEXT",
    `Bedrijfsnaam: ${sanitizeText(brand.company_name)}`,
    `Website: ${sanitizeText(brand.website || brand.company_website)}`,
    `Services: ${sanitizeText(brand.services)}`,
    `Doelgroep: ${sanitizeText(brand.target_audience)}`,
    `Buyer persona: ${sanitizeText(brand.buyer_persona)}`,
    "",
    "SCHRIJFSTIJL",
    `Tone of voice: ${sanitizeText(tone.tone_label || tone.tone_nl)}`,
    `Voice principles: ${sanitizeText(tone.voice_principles || tone.tone_nl)}`,
    `Stijlvoorkeuren: ${sanitizeText(brand.style_preferences || tone.style_preferences)}`,
    `Verboden claims: ${sanitizeText(brand.prohibited_claims || tone.prohibited_words)}`,
    `Gewenste CTA: ${sanitizeText(customer.primary_cta)}`,
    "",
    "KWALITEITSEISEN",
    "- Schrijf natuurlijk, vloeiend en menselijk Nederlands.",
    "- Gebruik concrete alinea-overgangen en vermijd generieke marketingtaal.",
    "- Schrijf voor B2B-beslissers, dus helder, geloofwaardig en praktisch.",
    "- Gebruik HTML in de content met <h1>, <h2>, <h3>, <p> en waar passend <ul>/<li>.",
    "- Geen placeholders, geen meta-uitleg en geen template-tags in de output.",
    "",
    "VARIANTRICHTINGEN",
    "- Variant 1: gebalanceerd en allround.",
    "- Variant 2: directer en commerciëler.",
    "- Variant 3: inhoudelijker en consultatiever.",
  ];

  if (sourceContent) {
    lines.push("", "BRONMATERIAAL", sourceContent);
  }

  if (xmlTemplate) {
    lines.push(
      "",
      `STRUCTUUR (${templateName || "XML-sjabloon"})`,
      "Gebruik deze structuur als gids, maar neem de XML-tags nooit letterlijk over.",
      xmlTemplate,
    );
  }

  lines.push(
    "",
    "Geef exact geldig JSON terug in dit formaat:",
    '{"variants":[{"title":"string","meta_description":"string","content":"string","seo_score":80,"quality_score":85,"quality_notes":["string"],"quality_summary":"string"}]}',
  );

  return lines.join("\n");
}

export async function generateVariants(
  input: GenerateContentRequest,
  context: Awaited<ReturnType<typeof loadGenerationContext>>,
  plan: ContentPlan,
): Promise<GeneratedVariant[]> {
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
            "Je bent een senior Nederlandse B2B SEO-copywriter. Je schrijft klantwaardige pagina's en retourneert altijd geldig JSON.",
        },
        {
          role: "user",
          content: buildPrompt(input, context, plan),
        },
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
    const message =
      sanitizeText((parsed?.error as UnknownRecord | undefined)?.message) ||
      sanitizeText(parsed?.message) ||
      payload ||
      `OpenAI request mislukt met status ${response.status}.`;
    throw new Error(message);
  }

  const parsed = extractJsonObject(payload);
  const rawVariants = Array.isArray(parsed.variants) ? parsed.variants : [];
  const normalized = rawVariants.map((variant, idx) => normalizeVariant(variant as UnknownRecord, idx + 1));
  const variants = ensureThreeVariants(normalized);
  variants.sort((a, b) => b.combined_score - a.combined_score);
  if (variants[0]) variants[0].is_primary = true;
  return variants;
}

export async function createGenerationJob(input: GenerateContentRequest): Promise<UnknownRecord> {
  const rows = await supabaseFetch<UnknownRecord[]>("generation_jobs", {
    method: "POST",
    body: JSON.stringify({
      workspace_id: input.workspace_id,
      user_id: input.user_id,
      keyword: input.keyword,
      content_goal: input.content_goal || "convince",
      status: "pending",
      template_id: isUuid(input.template_id || null) ? input.template_id : null,
      template_name: sanitizeText(input.xml_template_name) || null,
      source_content: sanitizeText(input.source_content),
      brand_profile_snapshot: input.brand_profile_snapshot || {},
      tone_profile: input.tone_profile || {},
      customer_preferences: input.customer_preferences || {},
    }),
  });
  return Array.isArray(rows) ? rows[0] || {} : {};
}

export async function updateGenerationJob(jobId: string, patch: UnknownRecord): Promise<UnknownRecord | null> {
  const rows = await supabaseFetch<UnknownRecord[]>(
    `generation_jobs?id=eq.${encodeURIComponent(jobId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    },
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function saveGeneratedContent(args: {
  input: GenerateContentRequest;
  job: UnknownRecord;
  variants: GeneratedVariant[];
  brandProfile: UnknownRecord;
}): Promise<{
  page: UnknownRecord;
  primaryVariant: GeneratedVariant;
  variants: GeneratedVariant[];
}> {
  const { input, job, variants, brandProfile } = args;
  const primaryVariant = variants.find((variant) => variant.is_primary) || variants[0];
  const pageRows = await supabaseFetch<UnknownRecord[]>("content_pages", {
    method: "POST",
    body: JSON.stringify({
      workspace_id: input.workspace_id,
      generation_job_id: job.id,
      created_by: input.user_id,
      title: primaryVariant.title,
      slug: toSlug(primaryVariant.title || input.keyword),
      primary_keyword: input.keyword,
      content_goal: input.content_goal || "convince",
      status: "review",
      review_status: "needs_review",
      seo_score: primaryVariant.seo_score,
      quality_score: primaryVariant.quality_score,
      brand_profile_snapshot: brandProfile,
    }),
  });

  const page = Array.isArray(pageRows) ? pageRows[0] || null : null;
  if (!page || !isUuid(String(page.id))) {
    throw new Error("Kon content page niet opslaan.");
  }

  const variantRows = variants.map((variant) => ({
    page_id: page.id,
    generation_job_id: job.id,
    variant_index: variant.variant_index,
    title: variant.title,
    meta_description: variant.meta_description,
    content: variant.content,
    word_count: variant.word_count,
    seo_score: variant.seo_score,
    quality_score: variant.quality_score,
    quality_notes: variant.quality_notes,
    quality_summary: variant.quality_summary,
    is_primary: variant.is_primary,
  }));

  const savedVariants = await supabaseFetch<UnknownRecord[]>("content_variants", {
    method: "POST",
    body: JSON.stringify(variantRows),
  });

  const normalizedSavedVariants = (Array.isArray(savedVariants) ? savedVariants : []).map((row) => {
    const variantIndex = Number(row.variant_index || 1);
    const match = variants.find((variant) => variant.variant_index === variantIndex);
    return {
      ...(match || variants[variantIndex - 1]),
      id: String(row.id),
      is_primary: !!row.is_primary,
    };
  });

  const savedPrimary =
    normalizedSavedVariants.find((variant) => variant.is_primary) || normalizedSavedVariants[0] || primaryVariant;

  await supabaseFetch<UnknownRecord[]>(
    `content_pages?id=eq.${encodeURIComponent(String(page.id))}`,
    {
      method: "PATCH",
      body: JSON.stringify({ selected_variant_id: savedPrimary.id }),
    },
  );

  return {
    page: {
      ...page,
      selected_variant_id: savedPrimary.id,
      primary_variant: savedPrimary,
      seo_score: savedPrimary.seo_score,
      quality_score: savedPrimary.quality_score,
      review_status: "needs_review",
      status: "review",
    },
    primaryVariant: savedPrimary,
    variants: normalizedSavedVariants,
  };
}

export function buildGenerationResponse(args: {
  job: UnknownRecord;
  page: UnknownRecord;
  primaryVariant: GeneratedVariant;
  variants: GeneratedVariant[];
  input: GenerateContentRequest;
  plan: ContentPlan;
}) {
  const { job, page, primaryVariant, variants, input, plan } = args;
  const reviewStatus = "needs_review";
  const seoMetadata = {
    primary_keyword: input.keyword,
    locale: "nl-NL",
    content_goal: input.content_goal || "convince",
  };

  return {
    status: "ready_for_review",
    job: {
      id: job.id,
      status: "ready_for_review",
      keyword: input.keyword,
      content_goal: input.content_goal || "convince",
      workspace_id: input.workspace_id,
      user_id: input.user_id,
    },
    page: {
      id: page.id,
      title: page.title,
      primary_keyword: page.primary_keyword || input.keyword,
      status: page.status || "review",
      review_status: reviewStatus,
      seo_score: primaryVariant.seo_score,
      quality_score: primaryVariant.quality_score,
      created_at: page.created_at,
      updated_at: page.updated_at,
      primary_variant: primaryVariant,
    },
    primary_variant: primaryVariant,
    variants,
    strategy_plan: plan,
    seo_metadata: seoMetadata,
    review_status: reviewStatus,
    quality_score: primaryVariant.quality_score,
    result: {
      title: primaryVariant.title,
      content: primaryVariant.content,
      meta_description: primaryVariant.meta_description,
      primary_variant: primaryVariant,
      variants,
      strategy_plan: plan,
      quality_score: primaryVariant.quality_score,
      seo_metadata: seoMetadata,
      review_status: reviewStatus,
      content_page_id: page.id,
      job_lifecycle: ["pending", "drafting", "ready_for_review"],
    },
  };
}
