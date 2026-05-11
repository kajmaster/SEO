import { handleOptions, isUuid, jsonResponse, supabaseFetch } from "./_contentflow-generation";

type UnknownRecord = Record<string, unknown>;

const ALLOWED_TYPES = new Set(["persona", "tone", "topical_map", "source", "guide"]);

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 12);
  }
  return clean(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeItem(row: UnknownRecord): UnknownRecord {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    created_by: row.created_by,
    type: row.type || "source",
    title: row.title || "Kennisitem",
    content: row.content || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    created_at: row.created_at,
  };
}

async function listKnowledgeItems(workspaceId: string): Promise<UnknownRecord[]> {
  const rows = await supabaseFetch<UnknownRecord[]>(
    `knowledge_base?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*&order=created_at.desc&limit=100`,
    { method: "GET", headers: { Prefer: "return=representation" } },
  );
  return Array.isArray(rows) ? rows.map(normalizeItem) : [];
}

async function createKnowledgeItem(body: UnknownRecord): Promise<UnknownRecord> {
  const workspaceId = clean(body.workspace_id);
  const userId = clean(body.user_id);
  const type = clean(body.type) || "source";
  const title = clean(body.title);
  const content = clean(body.content);
  const tags = normalizeTags(body.tags);

  if (!isUuid(workspaceId) || !isUuid(userId)) {
    throw new Error("workspace_id en user_id moeten geldige UUIDs zijn.");
  }
  if (!ALLOWED_TYPES.has(type)) {
    throw new Error("Kies een geldig type: persona, tone, topical_map, source of guide.");
  }
  if (!title || content.length < 10) {
    throw new Error("Titel en inhoud zijn verplicht. Inhoud moet minimaal 10 tekens zijn.");
  }

  const rows = await supabaseFetch<UnknownRecord[]>("knowledge_base", {
    method: "POST",
    body: JSON.stringify({
      workspace_id: workspaceId,
      created_by: userId,
      type,
      title,
      content,
      tags,
    }),
  });

  return normalizeItem(Array.isArray(rows) ? rows[0] || {} : {});
}

async function deleteKnowledgeItem(body: UnknownRecord): Promise<{ deleted: boolean }> {
  const workspaceId = clean(body.workspace_id);
  const id = clean(body.id);

  if (!isUuid(workspaceId) || !isUuid(id)) {
    throw new Error("workspace_id en id moeten geldige UUIDs zijn.");
  }

  await supabaseFetch<UnknownRecord[]>(
    `knowledge_base?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(workspaceId)}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );

  return { deleted: true };
}

export default async function handler(request: Request): Promise<Response> {
  const preflight = handleOptions(request);
  if (preflight) return preflight;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as UnknownRecord;
    const action = clean(body.action) || "list";
    const workspaceId = clean(body.workspace_id);

    if (!isUuid(workspaceId)) {
      return jsonResponse({ error: "workspace_id moet een geldige UUID zijn." }, 400);
    }

    if (action === "list") {
      return jsonResponse({ items: await listKnowledgeItems(workspaceId) });
    }
    if (action === "create") {
      const item = await createKnowledgeItem(body);
      return jsonResponse({ item, items: await listKnowledgeItems(workspaceId) }, 201);
    }
    if (action === "delete") {
      const result = await deleteKnowledgeItem(body);
      return jsonResponse({ ...result, items: await listKnowledgeItems(workspaceId) });
    }

    return jsonResponse({ error: "Onbekende kennisbankactie." }, 400);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Kennisbankactie mislukt." },
      500,
    );
  }
}
