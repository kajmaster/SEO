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

function isWorkspaceColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /workspace_id|created_by|schema cache|column .* does not exist|PGRST204/i.test(message);
}

async function fetchKnowledgeRows(workspaceId: string): Promise<{
  rows: UnknownRecord[];
  schemaWarning: string;
}> {
  try {
    const rows = await supabaseFetch<UnknownRecord[]>(
      `knowledge_base?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=*&order=created_at.desc&limit=100`,
      { method: "GET", headers: { Prefer: "return=representation" } },
    );
    return { rows: Array.isArray(rows) ? rows : [], schemaWarning: "" };
  } catch (error) {
    if (!isWorkspaceColumnError(error)) throw error;
    const rows = await supabaseFetch<UnknownRecord[]>(
      "knowledge_base?select=*&order=created_at.desc&limit=100",
      { method: "GET", headers: { Prefer: "return=representation" } },
    );
    return {
      rows: Array.isArray(rows) ? rows : [],
      schemaWarning:
        "Kennisbank geladen, maar Supabase mist workspace_id op knowledge_base. Voeg die kolom later toe voor echte multi-tenant scheiding.",
    };
  }
}

async function listKnowledgeItems(workspaceId: string): Promise<{
  items: UnknownRecord[];
  schemaWarning: string;
}> {
  const { rows, schemaWarning } = await fetchKnowledgeRows(workspaceId);
  return {
    items: rows.map(normalizeItem),
    schemaWarning,
  };
}

async function insertKnowledgeRow(payload: UnknownRecord): Promise<UnknownRecord> {
  const attempts = [
    payload,
    Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "created_by")),
    Object.fromEntries(
      Object.entries(payload).filter(([key]) => !["workspace_id", "created_by"].includes(key)),
    ),
    Object.fromEntries(
      Object.entries(payload).filter(([key]) => !["workspace_id", "created_by", "tags"].includes(key)),
    ),
  ];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      const rows = await supabaseFetch<UnknownRecord[]>("knowledge_base", {
        method: "POST",
        body: JSON.stringify(attempt),
      });
      return Array.isArray(rows) ? rows[0] || {} : {};
    } catch (error) {
      lastError = error;
      if (!isWorkspaceColumnError(error)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Kennisitem opslaan mislukt.");
}

async function deleteKnowledgeRow(id: string, workspaceId: string): Promise<void> {
  try {
    await supabaseFetch<UnknownRecord[]>(
      `knowledge_base?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(workspaceId)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    );
  } catch (error) {
    if (!isWorkspaceColumnError(error)) throw error;
    await supabaseFetch<UnknownRecord[]>(
      `knowledge_base?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    );
  }
}

async function listKnowledgePayload(workspaceId: string): Promise<UnknownRecord> {
  const result = await listKnowledgeItems(workspaceId);
  return {
    items: result.items,
    schema_warning: result.schemaWarning,
  };
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

  const row = await insertKnowledgeRow({
    workspace_id: workspaceId,
    created_by: userId,
    type,
    title,
    content,
    tags,
  });

  return normalizeItem(row);
}

async function deleteKnowledgeItem(body: UnknownRecord): Promise<{ deleted: boolean }> {
  const workspaceId = clean(body.workspace_id);
  const id = clean(body.id);

  if (!isUuid(workspaceId) || !isUuid(id)) {
    throw new Error("workspace_id en id moeten geldige UUIDs zijn.");
  }

  await deleteKnowledgeRow(id, workspaceId);

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
      return jsonResponse(await listKnowledgePayload(workspaceId));
    }
    if (action === "create") {
      const item = await createKnowledgeItem(body);
      const list = await listKnowledgePayload(workspaceId);
      return jsonResponse({ item, ...list }, 201);
    }
    if (action === "delete") {
      const result = await deleteKnowledgeItem(body);
      const list = await listKnowledgePayload(workspaceId);
      return jsonResponse({ ...result, ...list });
    }

    return jsonResponse({ error: "Onbekende kennisbankactie." }, 400);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Kennisbankactie mislukt." },
      500,
    );
  }
}
