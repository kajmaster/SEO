const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

type UnknownRecord = Record<string, unknown>;

interface SupabaseErrorShape {
  message?: string;
  hint?: string;
  error_description?: string;
}

export interface ReviewComment {
  id: string;
  category: string;
  quote_text: string;
  anchor_text: string;
  comment: string;
  commenter_name: string;
  commenter_email: string;
  created_at: string;
}

export interface ContentVariant {
  id: string;
  title: string;
  meta_description: string;
  content: string;
  word_count: number;
  seo_score: number;
  quality_score: number;
  quality_notes: unknown[];
  quality_summary: string;
  is_primary: boolean;
  variant_index: number;
}

export interface ContentPageBundle {
  page: {
    id: string;
    title: string;
    slug: string;
    primary_keyword: string;
    status: string;
    review_status: string;
    seo_score: number;
    quality_score: number;
    created_at: string;
    updated_at: string;
    primary_variant: ContentVariant | null;
  };
  variants: ContentVariant[];
  comments: ReviewComment[];
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

export function getBackendEnv(): { supabaseUrl: string; serviceRoleKey: string } {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt.");
  }
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ""), serviceRoleKey };
}

export async function supabaseFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { supabaseUrl, serviceRoleKey } = getBackendEnv();
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
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
    const errorBody = parsed as SupabaseErrorShape | null;
    throw new Error(
      errorBody?.message ||
        errorBody?.error_description ||
        errorBody?.hint ||
        `Supabase request mislukt met status ${response.status}`,
    );
  }

  return parsed as T;
}

export function normalizeReviewComment(row: UnknownRecord): ReviewComment {
  return {
    id: String(row.id || ""),
    category: String(row.category || ""),
    quote_text: typeof row.quote_text === "string" ? row.quote_text : "",
    anchor_text: typeof row.anchor_text === "string" ? row.anchor_text : "",
    comment: String(row.comment || ""),
    commenter_name:
      typeof row.commenter_name === "string" && row.commenter_name
        ? row.commenter_name
        : "Reviewer",
    commenter_email: typeof row.commenter_email === "string" ? row.commenter_email : "",
    created_at: String(row.created_at || ""),
  };
}

export function mapVariant(row: UnknownRecord): ContentVariant {
  return {
    id: String(row.id || ""),
    title: String(row.title || ""),
    meta_description: typeof row.meta_description === "string" ? row.meta_description : "",
    content: typeof row.content === "string" ? row.content : "",
    word_count: Number(row.word_count || 0),
    seo_score: Number(row.seo_score || 0),
    quality_score: Number(row.quality_score || 0),
    quality_notes: Array.isArray(row.quality_notes) ? row.quality_notes : [],
    quality_summary: typeof row.quality_summary === "string" ? row.quality_summary : "",
    is_primary: Boolean(row.is_primary),
    variant_index: Number(row.variant_index || 0),
  };
}

export function buildPrimaryVariant(
  page: UnknownRecord | null | undefined,
  variants: ContentVariant[],
): ContentVariant | null {
  if (!Array.isArray(variants) || !variants.length) return null;

  const selectedVariantId = typeof page?.selected_variant_id === "string" ? page.selected_variant_id : "";
  if (selectedVariantId) {
    const selected = variants.find((variant) => variant.id === selectedVariantId);
    if (selected) return selected;
  }

  return [...variants].sort((a, b) => {
    const aScore = Number(a.quality_score || 0) * 0.65 + Number(a.seo_score || 0) * 0.35;
    const bScore = Number(b.quality_score || 0) * 0.65 + Number(b.seo_score || 0) * 0.35;
    return bScore - aScore;
  })[0] || null;
}

export async function loadPageBundle(pageId: string): Promise<ContentPageBundle | null> {
  const pageRows = await supabaseFetch<UnknownRecord[]>(
    `content_pages?id=eq.${encodeURIComponent(pageId)}&select=*`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  );
  const page = Array.isArray(pageRows) ? pageRows[0] || null : null;
  if (!page) return null;

  const variantRows = await supabaseFetch<UnknownRecord[]>(
    `content_variants?page_id=eq.${encodeURIComponent(pageId)}&select=*&order=variant_index.asc`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  );
  const commentRows = await supabaseFetch<UnknownRecord[]>(
    `review_comments?page_id=eq.${encodeURIComponent(pageId)}&select=*&order=created_at.asc`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  );

  const variants = (variantRows || []).map(mapVariant);
  return {
    page: {
      id: String(page.id || ""),
      title: String(page.title || ""),
      slug: typeof page.slug === "string" ? page.slug : "",
      primary_keyword: typeof page.primary_keyword === "string" ? page.primary_keyword : "",
      status: String(page.status || ""),
      review_status: String(page.review_status || ""),
      seo_score: Number(page.seo_score || 0),
      quality_score: Number(page.quality_score || 0),
      created_at: String(page.created_at || ""),
      updated_at: String(page.updated_at || ""),
      primary_variant: buildPrimaryVariant(page, variants),
    },
    variants,
    comments: (commentRows || []).map(normalizeReviewComment),
  };
}
