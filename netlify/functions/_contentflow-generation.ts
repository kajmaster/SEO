const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONTENT_MODEL = process.env.OPENAI_CONTENT_MODEL || "gpt-4o";

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

export function getBackendEnv() {
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

async function safeRows(path: string): Promise<UnknownRecord[]> {
  try {
    const rows = await supabaseFetch<UnknownRecord[]>(path, {
      method: "GET",
      headers: { Prefer: "return=representation" },
    });
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
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

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function compactRule(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 220);
}

function feedbackEventToRule(event: UnknownRecord): string {
  const verdict = sanitizeText(event.verdict);
  const category = sanitizeText(event.category);
  const text = compactRule(sanitizeText(event.feedback_text));
  if (!text) return "";
  if (verdict === "approved") return `Herhaal wat werkte${category ? ` rond ${category}` : ""}: ${text}`;
  if (verdict === "rejected") return `Vermijd dit voortaan${category ? ` rond ${category}` : ""}: ${text}`;
  return `Verbeter voortaan${category ? ` rond ${category}` : ""}: ${text}`;
}

function extractForbiddenWordsFromRule(rule: string): string[] {
  const words = new Set<string>();
  const quoted = [...rule.matchAll(/"([^"]{3,})"/g)].map((match) => match[1]);
  for (const word of quoted) words.add(word.toLowerCase().trim());
  const plain = [...rule.toLowerCase().matchAll(/gebruik\s+nooit\s+(?:het\s+woord\s+)?([a-z0-9à-ÿ-]{3,})/gi)];
  for (const match of plain) {
    const word = match[1]?.replace(/[^a-z0-9à-ÿ-]/gi, "").trim();
    if (word) words.add(word);
  }
  return [...words].filter(Boolean);
}

function uniqueRules(rules: string[], max = 12): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const rule of rules.map(compactRule).filter(Boolean)) {
    const key = rule.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(rule);
    if (output.length >= max) break;
  }
  return output;
}

function pickSafeReplacement(forbiddenWords: string[]): string {
  const forbidden = new Set(forbiddenWords.map((word) => word.toLowerCase()));
  const candidates = ["gericht", "helder", "specifiek", "toepasbaar", "zorgvuldig", "passend"];
  return candidates.find((candidate) => !forbidden.has(candidate)) || "";
}

function replaceForbiddenWords(text: string, forbiddenWords: string[]): string {
  let output = text;
  const replacement = pickSafeReplacement(forbiddenWords);
  for (const word of forbiddenWords.map((item) => item.trim()).filter(Boolean)) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output.replace(new RegExp(`\\b${escaped}\\b`, "gi"), replacement);
  }
  return output.replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
}

function enforceForbiddenWords(variant: GeneratedVariant, forbiddenWords: string[]): GeneratedVariant {
  if (!forbiddenWords.length) return variant;
  const title = replaceForbiddenWords(variant.title, forbiddenWords);
  const meta = replaceForbiddenWords(variant.meta_description, forbiddenWords);
  const content = replaceForbiddenWords(variant.content, forbiddenWords);
  return {
    ...variant,
    title,
    meta_description: meta,
    content,
    word_count: countWords(content),
  };
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

export function buildDefaultPlan(
  input: GenerateContentRequest,
  context: Awaited<ReturnType<typeof loadGenerationContext>>,
): ContentPlan {
  const brand = context.brandProfile;
  const customer = context.customerPreferences;
  const services = sanitizeText(brand.services);
  const audience = sanitizeText(brand.target_audience || brand.buyer_persona);
  const cta = sanitizeText(customer.primary_cta) || "Vraag een gesprek of offerte aan";

  return {
    searchIntent: input.content_goal === "inform" ? "informatief" : "commercieel onderzoekend",
    pageAngle: `${input.keyword} uitgelegd vanuit aanpak, risicoverlaging en concrete waarde`,
    targetReader: audience || "B2B-beslisser die aanbieders vergelijkt",
    recommendedStructure: [
      `Wat ${input.keyword} betekent`,
      "Wanneer dit belangrijk is",
      "Onze aanpak",
      "Voordelen voor besluitvorming",
      "Veelgestelde vragen",
      "Volgende stap",
    ],
    keyMessages: [
      `${input.keyword} vraagt om een duidelijke, betrouwbare aanpak.`,
      services || "De dienst moet concreet aansluiten op de situatie van de klant.",
      "Goede content maakt risico's, keuzes en vervolgstappen helder.",
    ],
    proofPoints: ["Heldere methode", "Concrete uitleg", "Duidelijke vervolgstap"],
    mustInclude: [input.keyword, cta],
    mustAvoid: ["Absolute claims zonder bewijs", "Vage marketingtaal", "Nietszeggende buzzwords"],
    ctaDirection: cta,
    writingNotes: [
      "Schrijf helder Nederlands",
      "Maak de tekst menselijk en zakelijk",
      "Gebruik concrete tussenkoppen",
      ...context.learningMemory,
    ],
  };
}

export function buildFallbackVariants(
  input: GenerateContentRequest,
  context: Awaited<ReturnType<typeof loadGenerationContext>>,
  plan: ContentPlan,
  reason = "OpenAI gaf niet op tijd een bruikbaar antwoord.",
): GeneratedVariant[] {
  const brand = context.brandProfile;
  const companyName = sanitizeText(brand.company_name) || "uw organisatie";
  const services = sanitizeText(brand.services);
  const audience = sanitizeText(brand.target_audience || brand.buyer_persona) || "B2B-beslissers";
  const cta = plan.ctaDirection || "Vraag een gesprek of offerte aan";
  const keyword = input.keyword;
  const baseSections = [
    `<h1>${keyword}</h1>`,
    `<p>${keyword} is voor ${audience.toLowerCase()} vooral belangrijk wanneer keuzes betrouwbaar, uitlegbaar en concreet uitvoerbaar moeten zijn. ${companyName} helpt om die afweging helder te maken met een aanpak die past bij de context van de klant.</p>`,
    `<h2>Waarom ${keyword} belangrijk is</h2>`,
    `<p>Een goede pagina over ${keyword} moet niet alleen uitleg geven, maar ook laten zien wanneer de dienst relevant is, welke risico's ermee worden verlaagd en welke vervolgstap logisch is.</p>`,
    services ? `<h2>Relevante expertise</h2><p>De belangrijkste context vanuit de organisatie: ${services}.</p>` : "",
    `<h2>Aanpak</h2>`,
    `<p>De aanpak begint met het scherp krijgen van de situatie, de doelgroep en het gewenste resultaat. Daarna wordt de inhoud opgebouwd rond concrete vragen, heldere argumentatie en een duidelijke call-to-action.</p>`,
    `<h2>Volgende stap</h2>`,
    `<p>${cta}.</p>`,
  ].filter(Boolean);

  const variants: GeneratedVariant[] = [
    {
      id: "variant-1",
      variant_index: 1,
      title: `${keyword}: aanpak, voordelen en vervolgstap`,
      meta_description: `Lees wat ${keyword} inhoudt, wanneer het relevant is en welke vervolgstap logisch is.`,
      content: baseSections.join("\n"),
      word_count: countWords(baseSections.join(" ")),
      seo_score: 76,
      quality_score: 74,
      quality_notes: ["Fallback door backend-timeout", reason],
      quality_summary: "Werkbare fallbackvariant zodat de flow niet vastloopt.",
      combined_score: scoreVariant(76, 74),
      is_primary: true,
    },
    {
      id: "variant-2",
      variant_index: 2,
      title: `${keyword} voor zakelijke besluitvorming`,
      meta_description: `Ontdek hoe ${keyword} zakelijke beslissers helpt om sneller en beter te kiezen.`,
      content: baseSections
        .join("\n")
        .replace("vooral belangrijk", "met name waardevol")
        .replace("Volgende stap", "Plan een gerichte vervolgstap"),
      word_count: countWords(baseSections.join(" ")),
      seo_score: 74,
      quality_score: 73,
      quality_notes: ["Fallback door backend-timeout", "Commercielere variant"],
      quality_summary: "Alternatieve invalshoek met meer nadruk op besluitvorming.",
      combined_score: scoreVariant(74, 73),
      is_primary: false,
    },
    {
      id: "variant-3",
      variant_index: 3,
      title: `${keyword}: concrete uitleg voor ${audience}`,
      meta_description: `Concrete uitleg over ${keyword}, inclusief aanpak, aandachtspunten en CTA.`,
      content: baseSections
        .join("\n")
        .replace("Een goede pagina", "Een sterke, inhoudelijke pagina")
        .replace("De aanpak begint", "Een consultatieve aanpak begint"),
      word_count: countWords(baseSections.join(" ")),
      seo_score: 73,
      quality_score: 75,
      quality_notes: ["Fallback door backend-timeout", "Inhoudelijkere variant"],
      quality_summary: "Consultatieve fallbackvariant voor verdere review.",
      combined_score: scoreVariant(73, 75),
      is_primary: false,
    },
  ];

  return variants.map((variant) => enforceForbiddenWords(variant, context.forbiddenWords));
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

function looksLikePublishableArticle(variant: GeneratedVariant): boolean {
  const content = sanitizeText(variant.content);
  const wordCount = countWords(content);
  const headingCount = (content.match(/<h2[\s>]/gi) || []).length;
  const paragraphCount = (content.match(/<p[\s>]/gi) || []).length;
  return (
    wordCount >= 420 &&
    headingCount >= 3 &&
    paragraphCount >= 4 &&
    !/geen content ontvangen|fallback|placeholder|lorem ipsum/i.test(content)
  );
}

function looksUsableForReview(variant: GeneratedVariant): boolean {
  const content = sanitizeText(variant.content);
  const wordCount = countWords(content);
  return (
    wordCount >= 120 &&
    /<(h1|h2|p)[\s>]/i.test(content) &&
    !/geen content ontvangen|fallback|placeholder|lorem ipsum/i.test(content)
  );
}

function markVariantQuality(variants: GeneratedVariant[]): GeneratedVariant[] {
  if (!variants.some(looksUsableForReview)) {
    throw new Error("OpenAI gaf geen tekstinhoud terug. Probeer opnieuw of voeg bronmateriaal toe.");
  }
  return variants.map((variant) => ({
    ...variant,
    seo_score: looksLikePublishableArticle(variant) ? variant.seo_score : Math.min(variant.seo_score, 62),
    quality_score: looksLikePublishableArticle(variant)
      ? variant.quality_score
      : Math.min(variant.quality_score, 58),
    combined_score: looksLikePublishableArticle(variant)
      ? variant.combined_score
      : scoreVariant(Math.min(variant.seo_score, 62), Math.min(variant.quality_score, 58)),
    quality_notes: looksLikePublishableArticle(variant)
      ? variant.quality_notes
      : [
          ...variant.quality_notes,
          "Kwaliteitswaarschuwing: bruikbaar voor review, maar nog niet sterk genoeg als eindversie.",
        ],
  }));
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
  learningMemory: string[];
  forbiddenWords: string[];
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
  const previousJobs = await safeRows(
    `generation_jobs?workspace_id=eq.${encodeURIComponent(input.workspace_id)}&select=result,quality_summary,keyword,updated_at&order=updated_at.desc&limit=15`,
  );
  const profileAlgoSettings = asRecord(profile?.algo_settings);
  const websiteToneAnalysis = asRecord(profileAlgoSettings?.website_tone_analysis);
  const websiteToneRules = websiteToneAnalysis
    ? uniqueRules(
        [
          ...normalizeStringArray(websiteToneAnalysis.style_principles).map(
            (rule) => `Volg websitestijl: ${rule}`,
          ),
          ...normalizeStringArray(websiteToneAnalysis.writing_rules).map(
            (rule) => `Schrijfregel uit websitescan: ${rule}`,
          ),
          ...normalizeStringArray(websiteToneAnalysis.avoid).map(
            (rule) => `Vermijd volgens websitescan: ${rule}`,
          ),
        ],
        12,
      )
    : [];
  const learningMemory = uniqueRules(
    [
      ...websiteToneRules,
      ...previousJobs.flatMap((job) => {
        const result = (job.result && typeof job.result === "object" ? job.result : {}) as UnknownRecord;
        const events = Array.isArray(result.feedback_events) ? (result.feedback_events as UnknownRecord[]) : [];
        const storedRules = normalizeStringArray(result.learning_rules);
        return [...events.map(feedbackEventToRule), ...storedRules];
      }),
    ],
  );
  const forbiddenWords = uniqueRules(
    previousJobs.flatMap((job) => {
      const result = (job.result && typeof job.result === "object" ? job.result : {}) as UnknownRecord;
      const storedForbiddenWords = normalizeStringArray(result.forbidden_words);
      const storedRules = normalizeStringArray(result.learning_rules);
      return [...storedForbiddenWords, ...storedRules.flatMap(extractForbiddenWordsFromRule)];
    }),
    30,
  );

  return {
    brandProfile: mergeObjects(
      workspace,
      profile,
      brandProfile,
      websiteToneAnalysis
        ? {
            services: websiteToneAnalysis.services,
            style_preferences: [
              sanitizeText(profile?.style_preferences),
              ...normalizeStringArray(websiteToneAnalysis.style_principles),
            ]
              .filter(Boolean)
              .join("\n"),
            prohibited_claims: [
              sanitizeText(profile?.prohibited_claims),
              ...normalizeStringArray(websiteToneAnalysis.avoid),
            ]
              .filter(Boolean)
              .join("\n"),
          }
        : null,
      input.brand_profile_snapshot,
    ),
    toneProfile: mergeObjects(
      profile,
      toneProfile,
      websiteToneAnalysis
        ? {
            tone_label: websiteToneAnalysis.tone_label,
            tone_nl: websiteToneAnalysis.tone_nl,
            voice_principles: normalizeStringArray(websiteToneAnalysis.writing_rules).join("\n"),
            style_preferences: normalizeStringArray(websiteToneAnalysis.style_principles).join("\n"),
          }
        : null,
      input.tone_profile,
    ),
    customerPreferences: mergeObjects(profile, customerPreferences, input.customer_preferences),
    template,
    learningMemory,
    forbiddenWords,
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

  if (context.learningMemory.length) {
    lines.push(
      "",
      "GELEERDE FEEDBACKREGELS",
      "Deze regels komen uit eerdere feedback en zijn belangrijker dan generieke voorkeuren:",
      ...context.learningMemory.map((rule) => `- ${rule}`),
    );
  }

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
      temperature: 0.35,
      max_tokens: 1800,
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
    "- Schrijf als een ervaren menselijke copywriter, niet als een standaard AI-assistent.",
    "- Lever per variant een volledige, publiceerbare pagina op van ongeveer 600-900 woorden.",
    "- Schrijf specifiek op basis van de opgegeven website, diensten, tone-of-voice scan, feedbackregels en bronmateriaal.",
    "- Vermijd generieke B2B-zinnen zoals 'in een wereld waarin', 'het draait om' en lege containerwoorden.",
    "- Maak elke alinea inhoudelijk nuttig: uitleg, keuzehulp, nuance, bewijs, risicoverlaging of vervolgstap.",
    "- Gebruik HTML in de content met exact een <h1>, meerdere <h2>/<h3>, <p> en waar passend <ul>/<li>.",
    "- Schrijf geen placeholders, geen meta-uitleg, geen template-tags en geen opmerkingen over AI.",
    "- Gebruik geen verzonnen certificeringen, cijfers, klanten of garanties. Als bewijs ontbreekt, formuleer zorgvuldig.",
    "- Laat de CTA natuurlijk voelen en passend bij het bedrijf, niet als agressieve salescopy.",
    "",
    "VARIANTRICHTINGEN",
    "- Variant 1: beste publicatievariant, gebalanceerd, geloofwaardig en compleet.",
    "- Variant 2: directer en commerciëler, zonder schreeuwerige claims.",
    "- Variant 3: inhoudelijker en consultatiever, met meer uitleg en nuance.",
  ];

  if (context.learningMemory.length) {
    lines.push(
      "",
      "GELEERDE FEEDBACKREGELS VAN DEZE WORKSPACE",
      "Pas deze feedback verplicht toe op deze generatie:",
      ...context.learningMemory.map((rule) => `- ${rule}`),
    );
  }

  if (context.forbiddenWords.length) {
    lines.push(
      "",
      "HARDE VERBODEN WOORDEN",
      "Gebruik deze woorden nergens in titel, meta description of content. Ook niet als voorbeeld, synoniemlabel of tussenkop:",
      ...context.forbiddenWords.map((word) => `- ${word}`),
    );
  }

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
    "Laat elke variant echt anders voelen in invalshoek en ritme, maar houd dezelfde bedrijfsstijl aan.",
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 40000);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.openAiKey}`,
        "Content-Type": "application/json",
        ...(env.openAiProjectId ? { "OpenAI-Project": env.openAiProjectId } : {}),
        ...(env.openAiOrganization ? { "OpenAI-Organization": env.openAiOrganization } : {}),
      },
      body: JSON.stringify({
        model: CONTENT_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.72,
        max_tokens: 7000,
        messages: [
          {
            role: "system",
            content:
              "Je bent een senior Nederlandse B2B SEO-copywriter en eindredacteur. Je levert publiceerbare, merkvaste, niet-generieke webpagina's. Je weigert middelmatige filler en retourneert altijd geldig JSON.",
          },
          {
            role: "user",
            content: buildPrompt(input, context, plan),
          },
        ],
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenAI duurde te lang. Er is geen fallbacktekst opgeslagen.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

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
  const variants = markVariantQuality(ensureThreeVariants(normalized));
  const cleanedVariants = variants.map((variant) => enforceForbiddenWords(variant, context.forbiddenWords));
  cleanedVariants.sort((a, b) => b.combined_score - a.combined_score);
  if (cleanedVariants[0]) cleanedVariants[0].is_primary = true;
  return cleanedVariants;
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

  try {
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
  } catch (error) {
    const now = new Date().toISOString();
    const pageId = `job-${String(job.id || Date.now())}`;
    const memoryVariants = variants.map((variant) => ({
      ...variant,
      id: `${pageId}-variant-${variant.variant_index}`,
    }));
    const memoryPrimary =
      memoryVariants.find((variant) => variant.is_primary) || memoryVariants[0] || primaryVariant;

    console.warn(
      "Content page opslag overgeslagen; resultaat wordt alleen in generation_jobs.result bewaard.",
      error instanceof Error ? error.message : error,
    );

    return {
      page: {
        id: pageId,
        workspace_id: input.workspace_id,
        generation_job_id: job.id,
        created_by: input.user_id,
        title: memoryPrimary.title,
        slug: toSlug(memoryPrimary.title || input.keyword),
        primary_keyword: input.keyword,
        content_goal: input.content_goal || "convince",
        selected_variant_id: memoryPrimary.id,
        primary_variant: memoryPrimary,
        seo_score: memoryPrimary.seo_score,
        quality_score: memoryPrimary.quality_score,
        review_status: "needs_review",
        status: "review",
        created_at: now,
        updated_at: now,
        storage_mode: "generation_job_result_only",
      },
      primaryVariant: memoryPrimary,
      variants: memoryVariants,
    };
  }
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
