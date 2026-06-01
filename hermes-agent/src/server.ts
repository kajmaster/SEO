import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const hermesApiKey = process.env.HERMES_API_KEY;
const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";

type TaskBody = {
  task?: unknown;
  url?: unknown;
  keyword?: unknown;
  workspace_id?: unknown;
  user_id?: unknown;
  company_name?: unknown;
  services?: unknown;
  target_audience?: unknown;
  tone_voice?: unknown;
};

type PageScan = {
  finalUrl: string;
  title: string;
  metaDescription: string;
  h1: string[];
  h2: string[];
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  hasProofSignals: boolean;
  hasCtaSignals: boolean;
  keywordInTitle: boolean;
  keywordInH1: boolean;
  sampleText: string;
};

type StrategyPayload = {
  executive_takeaway?: string;
  opportunities?: Array<{ title: string; reason: string; priority: string }>;
  clusters?: Array<{ name: string; intent: string; angle: string }>;
  page_ideas?: Array<{ title: string; why: string; format: string }>;
  internal_link_plan?: string[];
  topic_map?: TopicMapPayload;
  cluster_plan?: ClusterPlanPayload;
  content_angle?: string;
  content_brief?: string[];
  editor_prompt?: string;
  next_actions?: string[];
};

type TopicMapNode = {
  topic: string;
  intent: string;
  role: string;
  content_type: string;
  why: string;
};

type TopicMapPayload = {
  core_topic?: string;
  authority_goal?: string;
  nodes?: TopicMapNode[];
  authority_gaps?: string[];
  interlink_moves?: string[];
};

type ClusterArticle = {
  title: string;
  intent: string;
  format: string;
  purpose: string;
  links_to: string;
};

type ClusterPlanPayload = {
  pillar_title?: string;
  pillar_promise?: string;
  supporting_articles?: ClusterArticle[];
  publishing_order?: string[];
};

type GrowthPlaybookPayload = {
  board_title?: string;
  narrative_hook?: string;
  positioning?: string;
  audience_insight?: string;
  money_pages?: Array<{ title: string; intent: string; promise: string; why_now: string }>;
  content_machine?: Array<{ pillar: string; support_articles: string[]; conversion_link: string }>;
  topic_map?: TopicMapPayload;
  cluster_plan?: ClusterPlanPayload;
  proof_to_collect?: string[];
  seven_day_sprint?: Array<{ day: string; action: string; outcome: string }>;
  demo_script?: string[];
  editor_prompt?: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string): string {
  return decodeEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function firstMatch(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return decodeEntities(match?.[1] || "");
}

function allTagText(html: string, tag: string, max = 10): string[] {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const output: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) && output.length < max) {
    const text = stripTags(match[1] || "");
    if (text) output.push(text.slice(0, 160));
  }
  return output;
}

function includesLoose(text: string, keyword: string): boolean {
  const cleanText = text.toLowerCase();
  const terms = keyword.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  if (!terms.length) return false;
  return terms.some((term) => cleanText.includes(term));
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreLabel(score: number): string {
  if (score >= 78) return "Sterke basis";
  if (score >= 58) return "Groeikans";
  if (score >= 38) return "Veel potentie";
  return "Onbenutte pagina";
}

function parseJsonObject<T extends Record<string, unknown>>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

function cleanStringArray(value: unknown, max = 8): string[] {
  return Array.isArray(value)
    ? value.map((item) => clean(item)).filter(Boolean).slice(0, max)
    : [];
}

function cleanObjectArray<T extends Record<string, string>>(
  value: unknown,
  keys: Array<keyof T>,
  max = 6,
): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const output: Record<string, string> = {};
      for (const key of keys) output[String(key)] = clean(row[String(key)]);
      return output as T;
    })
    .filter((item): item is T => Boolean(item && keys.every((key) => item[key])))
    .slice(0, max);
}

function cleanContentMachine(value: unknown): Array<{
  pillar: string;
  support_articles: string[];
  conversion_link: string;
}> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const pillar = clean(row.pillar);
      const conversionLink = clean(row.conversion_link);
      const supportArticles = cleanStringArray(row.support_articles, 5);
      if (!pillar || !conversionLink || !supportArticles.length) return null;
      return {
        pillar,
        support_articles: supportArticles,
        conversion_link: conversionLink,
      };
    })
    .filter((item): item is { pillar: string; support_articles: string[]; conversion_link: string } =>
      Boolean(item),
    )
    .slice(0, 4);
}

function cleanTopicMap(value: unknown, fallback: Required<TopicMapPayload>): Required<TopicMapPayload> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const row = value as Record<string, unknown>;
  const rawNodes = Array.isArray(row.nodes) ? row.nodes : [];
  const nodes = rawNodes
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const node = item as Record<string, unknown>;
      const topic = clean(node.topic);
      const intent = clean(node.intent);
      const role = clean(node.role);
      const contentType = clean(node.content_type);
      const why = clean(node.why);
      if (!topic || !intent || !role) return null;
      return {
        topic,
        intent,
        role,
        content_type: contentType || "SEO-pagina",
        why: why || "Ondersteunt topical authority en helpt bezoekers kiezen.",
      };
    })
    .filter((item): item is TopicMapNode => Boolean(item))
    .slice(0, 8);

  return {
    core_topic: clean(row.core_topic) || fallback.core_topic,
    authority_goal: clean(row.authority_goal) || fallback.authority_goal,
    nodes: nodes.length ? nodes : fallback.nodes,
    authority_gaps: cleanStringArray(row.authority_gaps, 6).length
      ? cleanStringArray(row.authority_gaps, 6)
      : fallback.authority_gaps,
    interlink_moves: cleanStringArray(row.interlink_moves, 6).length
      ? cleanStringArray(row.interlink_moves, 6)
      : fallback.interlink_moves,
  };
}

function cleanClusterPlan(value: unknown, fallback: Required<ClusterPlanPayload>): Required<ClusterPlanPayload> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const row = value as Record<string, unknown>;
  const rawArticles = Array.isArray(row.supporting_articles) ? row.supporting_articles : [];
  const supportingArticles = rawArticles
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const article = item as Record<string, unknown>;
      const title = clean(article.title);
      const intent = clean(article.intent);
      const format = clean(article.format);
      const purpose = clean(article.purpose);
      const linksTo = clean(article.links_to);
      if (!title || !intent || !purpose) return null;
      return {
        title,
        intent,
        format: format || "Artikel",
        purpose,
        links_to: linksTo || fallback.pillar_title,
      };
    })
    .filter((item): item is ClusterArticle => Boolean(item))
    .slice(0, 8);

  return {
    pillar_title: clean(row.pillar_title) || fallback.pillar_title,
    pillar_promise: clean(row.pillar_promise) || fallback.pillar_promise,
    supporting_articles: supportingArticles.length ? supportingArticles : fallback.supporting_articles,
    publishing_order: cleanStringArray(row.publishing_order, 8).length
      ? cleanStringArray(row.publishing_order, 8)
      : fallback.publishing_order,
  };
}

function buildRuleTopicMap(args: {
  keyword: string;
  scan: PageScan | null;
  clusters: Array<{ name: string; intent: string; angle: string }>;
  pageIdeas: Array<{ title: string; why: string; format: string }>;
  internalLinkPlan: string[];
}): Required<TopicMapPayload> {
  const { keyword, scan, clusters, pageIdeas, internalLinkPlan } = args;
  const nodes: TopicMapNode[] = [
    {
      topic: keyword,
      intent: "Hoofdzoekintentie",
      role: "pillar",
      content_type: "Pillar / money page",
      why: "Dit is het centrum van de topical authority en moet de bezoeker van orientatie naar actie brengen.",
    },
    ...clusters.slice(0, 5).map((cluster, index) => ({
      topic: cluster.name,
      intent: cluster.intent,
      role: index === clusters.length - 1 ? "conversion support" : "supporting cluster",
      content_type: pageIdeas[index]?.format || "Ondersteunende pagina",
      why: cluster.angle,
    })),
  ];
  const authorityGaps = [
    scan && scan.wordCount < 650
      ? `Verdiep "${keyword}" met meer situaties, keuzecriteria, bewijs en FAQ's.`
      : "",
    scan && scan.h2.length < 4
      ? "Voeg meer subtopics toe zodat Google en bezoekers de expertise beter kunnen lezen."
      : "",
    scan && !scan.hasProofSignals
      ? "Voeg E-E-A-T bewijs toe: cases, reviews, cijfers, auteur of concreet voorbeeld."
      : "",
    scan && scan.internalLinks < 5
      ? "Maak interne links van informatieve pagina's naar de belangrijkste conversiepagina."
      : "",
  ].filter(Boolean);

  return {
    core_topic: keyword,
    authority_goal: `Bouw rond "${keyword}" een herkenbare topical hub die informeert, vergelijkt, vertrouwen geeft en converteert.`,
    nodes,
    authority_gaps: authorityGaps.length
      ? authorityGaps
      : ["Maak van losse content een zichtbaar systeem met pillar, supporting pages en bewijs."],
    interlink_moves: internalLinkPlan.slice(0, 6),
  };
}

function buildRuleClusterPlan(args: {
  keyword: string;
  topicMap: Required<TopicMapPayload>;
  pageIdeas: Array<{ title: string; why: string; format: string }>;
}): Required<ClusterPlanPayload> {
  const { keyword, topicMap, pageIdeas } = args;
  const pillarTitle = `${keyword}: complete gids`;
  const supportingArticles = topicMap.nodes
    .filter((node) => node.role !== "pillar")
    .slice(0, 6)
    .map((node, index) => ({
      title: pageIdeas[index]?.title || node.topic,
      intent: node.intent || "Support",
      format: pageIdeas[index]?.format || node.content_type || "Artikel",
      purpose: pageIdeas[index]?.why || node.why || "Ondersteunt de pillar met extra context en bewijs.",
      links_to: pillarTitle,
    }));

  return {
    pillar_title: pillarTitle,
    pillar_promise: `De centrale pagina die alle zoekintenties rond "${keyword}" samenbrengt en bezoekers richting de juiste actie stuurt.`,
    supporting_articles: supportingArticles.length
      ? supportingArticles
      : [
          {
            title: `Wanneer is ${keyword} relevant?`,
            intent: "Informeren",
            format: "Artikel",
            purpose: "Legt herkenbare situaties uit en bouwt eerste vertrouwen op.",
            links_to: pillarTitle,
          },
          {
            title: `${keyword}: opties en valkuilen`,
            intent: "Overwegen",
            format: "Keuzehulp",
            purpose: "Helpt bezoekers vergelijken voordat ze contact opnemen.",
            links_to: pillarTitle,
          },
        ],
    publishing_order: [
      `Publiceer eerst de pillar: ${pillarTitle}.`,
      "Publiceer daarna twee ondersteunende artikelen met informerende en vergelijkende intent.",
      "Voeg vervolgens bewijscontent toe: case, review, cijfers of praktijkvoorbeeld.",
      "Sluit de cluster met interne links richting de conversiepagina.",
    ],
  };
}

async function buildAiStrategy(input: {
  url: string;
  keyword: string;
  strategicScore: number;
  scoreLabel: string;
  scan: PageScan | null;
  opportunities: Array<{ title: string; reason: string; priority: string }>;
  contentAngle: string;
  contentBrief: string[];
  nextActions: string[];
}): Promise<StrategyPayload | null> {
  if (!openAiApiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 11_000);
  const scan = input.scan;
  const prompt = {
    url: input.url,
    keyword: input.keyword,
    current_score: input.strategicScore,
    score_label: input.scoreLabel,
    measured_signals: scan
      ? {
          title: scan.title,
          meta_description: scan.metaDescription,
          h1: scan.h1,
          h2: scan.h2,
          word_count: scan.wordCount,
          internal_links: scan.internalLinks,
          external_links: scan.externalLinks,
          proof_signals: scan.hasProofSignals,
          cta_signals: scan.hasCtaSignals,
          keyword_in_title: scan.keywordInTitle,
          keyword_in_h1: scan.keywordInH1,
          visible_text_sample: scan.sampleText,
        }
      : null,
    rule_based_opportunities: input.opportunities,
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAiModel,
        temperature: 0.25,
        max_completion_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Je bent Hermes, een senior SEO strategist voor B2B en contentteams. Gebruik alleen de gemeten website-signalen en redelijke SEO-logica. Wees concreet, verkoopbaar en niet generiek. Antwoord uitsluitend als geldig JSON-object.",
          },
          {
            role: "user",
            content:
              `Maak een premium SEO-strategie in het Nederlands op basis van deze gemeten data.\n\n` +
              `${JSON.stringify(prompt, null, 2)}\n\n` +
              "Geef exact deze JSON-velden terug: executive_takeaway, opportunities, clusters, page_ideas, internal_link_plan, topic_map, cluster_plan, content_angle, content_brief, editor_prompt, next_actions. " +
              "opportunities bevat objecten met title, reason, priority. clusters bevat name, intent, angle. page_ideas bevat title, why, format. topic_map bevat core_topic, authority_goal, nodes, authority_gaps en interlink_moves. nodes bevat topic, intent, role, content_type en why. cluster_plan bevat pillar_title, pillar_promise, supporting_articles en publishing_order. supporting_articles bevat title, intent, format, purpose en links_to. Maak editor_prompt direct bruikbaar als briefing voor een SEO-pagina.",
          },
        ],
      }),
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
      | null;

    if (!response.ok) {
      throw new Error(data?.error?.message || `OpenAI request mislukt met status ${response.status}.`);
    }

    const content = data?.choices?.[0]?.message?.content || "";
    const parsed = parseJsonObject<StrategyPayload>(content);
    if (!parsed) return null;

    return {
      executive_takeaway: clean(parsed.executive_takeaway),
      opportunities: cleanObjectArray(parsed.opportunities, ["title", "reason", "priority"], 6),
      clusters: cleanObjectArray(parsed.clusters, ["name", "intent", "angle"], 6),
      page_ideas: cleanObjectArray(parsed.page_ideas, ["title", "why", "format"], 6),
      internal_link_plan: cleanStringArray(parsed.internal_link_plan, 8),
      topic_map: parsed.topic_map,
      cluster_plan: parsed.cluster_plan,
      content_angle: clean(parsed.content_angle),
      content_brief: cleanStringArray(parsed.content_brief, 10),
      editor_prompt: clean(parsed.editor_prompt),
      next_actions: cleanStringArray(parsed.next_actions, 8),
    };
  } catch (error) {
    console.error("OpenAI strategy enrichment failed", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function buildAiGrowthPlaybook(input: {
  url: string;
  keyword: string;
  companyName: string;
  services: string;
  targetAudience: string;
  toneVoice: string;
  scan: PageScan | null;
  scanError: string;
}): Promise<GrowthPlaybookPayload | null> {
  if (!openAiApiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 11_000);
  const scan = input.scan;
  const prompt = {
    website: input.url,
    keyword: input.keyword,
    company_name: input.companyName || "Onbekend bedrijf",
    services: input.services,
    target_audience: input.targetAudience,
    tone_of_voice: input.toneVoice,
    scan: scan
      ? {
          title: scan.title,
          meta_description: scan.metaDescription,
          h1: scan.h1,
          h2: scan.h2,
          word_count: scan.wordCount,
          internal_links: scan.internalLinks,
          external_links: scan.externalLinks,
          proof_signals: scan.hasProofSignals,
          cta_signals: scan.hasCtaSignals,
          visible_text_sample: scan.sampleText,
        }
      : { error: input.scanError },
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAiModel,
        temperature: 0.35,
        max_completion_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Je bent Hermes, een scherpe SEO growth strategist. Je maakt geen gewone audit, maar een klantwaardig groeiplan met wow-factor. Denk als een strategist: positionering, topical authority, conversie, contentmachine en concrete sprint. Antwoord uitsluitend als geldig JSON-object.",
          },
          {
            role: "user",
            content:
              `Maak een premium Hermes Growth Playbook in het Nederlands op basis van deze context:\n\n` +
              `${JSON.stringify(prompt, null, 2)}\n\n` +
              "Geef exact deze JSON-velden terug: board_title, narrative_hook, positioning, audience_insight, money_pages, content_machine, topic_map, cluster_plan, proof_to_collect, seven_day_sprint, demo_script, editor_prompt. " +
              "money_pages bevat objecten met title, intent, promise, why_now. content_machine bevat pillar, support_articles en conversion_link. topic_map bevat core_topic, authority_goal, nodes, authority_gaps en interlink_moves. nodes bevat topic, intent, role, content_type en why. cluster_plan bevat pillar_title, pillar_promise, supporting_articles en publishing_order. supporting_articles bevat title, intent, format, purpose en links_to. seven_day_sprint bevat day, action, outcome. Maak het specifiek, verkoopbaar en direct bruikbaar in een gesprek met een partner of klant.",
          },
        ],
      }),
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
      | null;

    if (!response.ok) {
      throw new Error(data?.error?.message || `OpenAI request mislukt met status ${response.status}.`);
    }

    const content = data?.choices?.[0]?.message?.content || "";
    const parsed = parseJsonObject<GrowthPlaybookPayload>(content);
    if (!parsed) return null;

    return {
      board_title: clean(parsed.board_title),
      narrative_hook: clean(parsed.narrative_hook),
      positioning: clean(parsed.positioning),
      audience_insight: clean(parsed.audience_insight),
      money_pages: cleanObjectArray(parsed.money_pages, ["title", "intent", "promise", "why_now"], 5),
      content_machine: cleanContentMachine(parsed.content_machine),
      topic_map: parsed.topic_map,
      cluster_plan: parsed.cluster_plan,
      proof_to_collect: cleanStringArray(parsed.proof_to_collect, 8),
      seven_day_sprint: cleanObjectArray(parsed.seven_day_sprint, ["day", "action", "outcome"], 7),
      demo_script: cleanStringArray(parsed.demo_script, 7),
      editor_prompt: clean(parsed.editor_prompt),
    };
  } catch (error) {
    console.error("OpenAI growth playbook failed", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function scanPage(url: string, keyword: string): Promise<PageScan> {
  const finalUrl = normalizeUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);

  try {
    const response = await fetch(finalUrl, {
      headers: {
        "User-Agent":
          "HermesAgent/0.2 (+https://splendid-ganache-01f6c2.netlify.app; SEO audit preview)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Website gaf HTTP ${response.status}.`);
    }

    const html = await response.text();
    const pageUrl = response.url || finalUrl;
    const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescription = firstMatch(
      html,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
    ) || firstMatch(
      html,
      /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
    );
    const h1 = allTagText(html, "h1", 5);
    const h2 = allTagText(html, "h2", 12);
    const text = stripTags(html);
    const words = text.split(/\s+/).filter((word) => /[a-z0-9à-ÿ]/i.test(word));
    const origin = new URL(pageUrl).origin;
    const linkMatches = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)]
      .map((match) => match[1] || "")
      .filter(Boolean);
    const absoluteLinks = linkMatches
      .map((href) => {
        try {
          return new URL(href, origin).href;
        } catch {
          return "";
        }
      })
      .filter(Boolean);
    const internalLinks = absoluteLinks.filter((href) => href.startsWith(origin)).length;
    const externalLinks = absoluteLinks.filter((href) => !href.startsWith(origin)).length;
    const proofPattern = /\b(case|cases|klant|klanten|review|reviews|resultaat|resultaten|cijfers|bewijs|certificaat|ervaring|portfolio|voorbeeld)\b/i;
    const ctaPattern = /\b(contact|offerte|bel|mail|plan|afspraak|demo|kennismaking|bestel|aanvragen|winkelwagen)\b/i;

    return {
      finalUrl: pageUrl,
      title,
      metaDescription,
      h1,
      h2,
      wordCount: words.length,
      internalLinks,
      externalLinks,
      hasProofSignals: proofPattern.test(text),
      hasCtaSignals: ctaPattern.test(text),
      keywordInTitle: includesLoose(title, keyword),
      keywordInH1: h1.some((heading) => includesLoose(heading, keyword)),
      sampleText: text.slice(0, 420),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function requireHermesKey(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const incomingKey = req.header("x-hermes-key");

  if (!hermesApiKey) {
    return res.status(500).json({
      ok: false,
      error: "Hermes API key ontbreekt op de server.",
    });
  }

  if (incomingKey !== hermesApiKey) {
    return res.status(401).json({
      ok: false,
      error: "Niet toegestaan: verkeerde Hermes API key.",
    });
  }

  next();
}

async function buildSeoAudit(body: TaskBody) {
  const url = clean(body.url) || "onbekende website";
  const keyword = clean(body.keyword) || "belangrijkste dienst";
  const normalizedUrl = normalizeUrl(url);

  let scan: PageScan | null = null;
  let scanError = "";
  try {
    scan = normalizedUrl ? await scanPage(normalizedUrl, keyword) : null;
  } catch (error) {
    scanError = error instanceof Error ? error.message : "Website kon niet worden opgehaald.";
  }

  const pageTitle = scan?.title || "Geen title gevonden";
  const h1Label = scan?.h1[0] || "Geen H1 gevonden";
  const wordCount = scan?.wordCount || 0;
  const strategicScore = scan
    ? clampScore(
        18 +
          (scan.keywordInTitle ? 14 : 0) +
          (scan.keywordInH1 ? 14 : 0) +
          Math.min(18, scan.wordCount / 55) +
          Math.min(12, scan.h2.length * 3) +
          Math.min(10, scan.internalLinks * 1.2) +
          (scan.hasProofSignals ? 12 : 0) +
          (scan.hasCtaSignals ? 10 : 0),
      )
    : 32;
  const opportunities = [
    !scan?.keywordInTitle || !scan?.keywordInH1
      ? {
          title: `Maak "${keyword}" zichtbaar in title en H1`,
          reason: `Nu leest Hermes als title: "${pageTitle}" en als H1: "${h1Label}". Als de zoekintentie daar niet scherp in staat, voelt de pagina voor Google en bezoekers minder duidelijk.`,
          priority: "high",
        }
      : null,
    wordCount < 650
      ? {
          title: "Verdiep de pagina met echte koopargumenten",
          reason: `Hermes telt ongeveer ${wordCount} woorden. Voor een verkoopbare SEO-pagina is dat vaak te dun; voeg situaties, bezwaren, voordelen, bewijs en veelgestelde vragen toe.`,
          priority: "high",
        }
      : null,
    (scan?.h2.length || 0) < 4
      ? {
          title: "Bouw een duidelijke topical structuur",
          reason: `Hermes ziet ${scan?.h2.length || 0} H2-koppen. Maak secties voor probleem, oplossing, vergelijking, bewijs, kosten/keuzecriteria en vervolgstap.`,
          priority: "medium",
        }
      : null,
    !scan?.hasProofSignals
      ? {
          title: "Voeg bewijs toe dat vertrouwen geeft",
          reason:
            "Hermes ziet weinig signalen zoals cases, klantvoorbeelden, reviews, cijfers of concrete resultaten. Zonder bewijs blijft de pagina snel generiek.",
          priority: "high",
        }
      : null,
    !scan?.hasCtaSignals
      ? {
          title: "Maak de volgende stap expliciet",
          reason:
            "Hermes vindt geen sterke CTA-signalen. Voeg een duidelijke actie toe zoals offerte aanvragen, afspraak plannen of contact opnemen.",
          priority: "medium",
        }
      : null,
    (scan?.internalLinks || 0) < 5
      ? {
          title: "Gebruik interne links als autoriteitsroute",
          reason: `Hermes ziet ongeveer ${scan?.internalLinks || 0} interne links. Link naar relevante categorieën, diensten, kennisbankartikelen en conversiepagina's.`,
          priority: "medium",
        }
      : null,
  ].filter(
    (item): item is { title: string; reason: string; priority: string } => Boolean(item),
  );

  const visibleSignals = scan
    ? [
        `Title: ${pageTitle}`,
        `H1: ${h1Label}`,
        `Woorden: ${wordCount}`,
        `H2-koppen: ${scan.h2.length}`,
        `Interne links: ${scan.internalLinks}`,
        `Bewijs-signalen: ${scan.hasProofSignals ? "ja" : "nee"}`,
        `CTA-signalen: ${scan.hasCtaSignals ? "ja" : "nee"}`,
      ]
    : [`Scan mislukt: ${scanError}`];
  const clusters = [
    {
      name: `${keyword} voor beginners`,
      intent: "Informeren",
      angle: "Leg uit wat iemand moet weten voordat hij koopt of contact opneemt.",
    },
    {
      name: `${keyword} vergelijken`,
      intent: "Overwegen",
      angle: "Vergelijk opties, valkuilen, kosten, kwaliteit en wanneer welke keuze logisch is.",
    },
    {
      name: `${keyword} bewijs en cases`,
      intent: "Vertrouwen",
      angle: "Gebruik klantvoorbeelden, reviews, resultaten en concrete situaties als bewijs.",
    },
    {
      name: `${keyword} aanvragen`,
      intent: "Converteren",
      angle: "Maak de stap naar contact of aankoop kort, duidelijk en zonder ruis.",
    },
  ];
  const pageIdeas = [
    {
      title: `${keyword}: complete keuzehulp`,
      why: "Een pillar page die de hoofdzoekintentie pakt en doorlinkt naar verdieping.",
      format: "Pillar page",
    },
    {
      title: `Wanneer is ${keyword} de juiste keuze?`,
      why: "Een beslissingspagina voor bezoekers die twijfelen en bewijs zoeken.",
      format: "BOFU pagina",
    },
    {
      title: `${keyword}: veelgemaakte fouten`,
      why: "Een artikel dat risico's wegneemt en autoriteit opbouwt.",
      format: "Kennisbank",
    },
  ];
  const internalLinkPlan = [
    `Link vanaf de homepage of hoofdcategorie naar de belangrijkste ${keyword}-pagina.`,
    `Link vanuit informatieve artikelen door naar de conversiepagina rond ${keyword}.`,
    "Voeg onderaan de pagina 3 verwante artikelen of diensten toe.",
  ];
  const topicMap = buildRuleTopicMap({
    keyword,
    scan,
    clusters,
    pageIdeas,
    internalLinkPlan,
  });
  const clusterPlan = buildRuleClusterPlan({
    keyword,
    topicMap,
    pageIdeas,
  });
  const contentAngle = `Maak een pagina rond "${keyword}" die niet alleen uitlegt wat het is, maar de bezoeker helpt kiezen: wanneer is dit relevant, waar let je op, welk bewijs is er, en wat is de volgende stap?`;
  const contentBrief = [
    `Gebruik de huidige page title als startpunt: ${pageTitle}.`,
    `Verwerk "${keyword}" zichtbaar in de eerste schermsectie.`,
    "Voeg minimaal een bewijsblok toe: klantvoorbeeld, resultaat, review of concreet scenario.",
    "Maak interne links naar verwante diensten of kennisbankartikelen.",
    "Sluit af met een duidelijke CTA.",
  ];
  const nextActions = [
    "Kies de belangrijkste zoekintentie voor deze pagina.",
    "Laat ContentFlow een nieuwe pagina of verbeterbrief genereren op basis van deze audit.",
    "Gebruik feedback om woorden, toon en claims aan te scherpen.",
  ];

  const baseAudit = {
    ok: true,
    type: "seo_audit",
    status: scan ? "scanned" : "fallback",
    url: scan?.finalUrl || normalizedUrl || url,
    keyword,
    strategic_score: strategicScore,
    score_label: scoreLabel(strategicScore),
    executive_takeaway: scan
      ? `Hermes ziet een ${scoreLabel(strategicScore).toLowerCase()} voor "${keyword}". De pagina heeft ${wordCount} woorden, ${scan.h2.length} H2-koppen en ${scan.internalLinks} interne links. De snelste winst zit in scherpere zoekintentie, bewijs en een duidelijkere route naar conversie.`
      : `Hermes kon de pagina niet live lezen, maar kan al wel een strategie starten rond "${keyword}".`,
    summary: scan
      ? `Hermes heeft de pagina echt opgehaald en ziet: ${visibleSignals.join(" · ")}. De grootste kans is om van losse pagina-informatie een scherpere zoekintentie- en conversiepagina te maken.`
      : `Hermes kon de pagina nog niet ophalen (${scanError}), maar heeft wel een audit-shape gemaakt op basis van de opgegeven URL en het onderwerp.`,
    metrics: scan
      ? {
          title: scan.title,
          meta_description: scan.metaDescription,
          h1: scan.h1,
          h2: scan.h2.slice(0, 8),
          word_count: scan.wordCount,
          internal_links: scan.internalLinks,
          external_links: scan.externalLinks,
          proof_signals: scan.hasProofSignals,
          cta_signals: scan.hasCtaSignals,
          keyword_in_title: scan.keywordInTitle,
          keyword_in_h1: scan.keywordInH1,
        }
      : null,
    opportunities: opportunities.slice(0, 5),
    clusters,
    page_ideas: pageIdeas,
    internal_link_plan: internalLinkPlan,
    topic_map: topicMap,
    cluster_plan: clusterPlan,
    content_angle: contentAngle,
    content_brief: contentBrief,
    editor_prompt: [
      `Maak een hoogwaardige SEO-pagina over "${keyword}" voor ${scan?.finalUrl || normalizedUrl || "deze website"}.`,
      `Gebruik deze Hermes-diagnose: ${visibleSignals.join(" | ")}.`,
      "Schrijf niet generiek. Maak de pagina verkoopbaar met situaties, keuzecriteria, bewijs, interne links en een duidelijke CTA.",
      `Contenthoek: maak een pagina die bezoekers helpt kiezen wanneer ${keyword} relevant is, waar ze op moeten letten en welke volgende stap logisch is.`,
      "Aanbevolen structuur: probleem, voor wie, keuzecriteria, bewijs, aanpak, veelgestelde vragen, CTA.",
    ].join("\n"),
    next_actions: nextActions,
  };

  const aiStrategy = await buildAiStrategy({
    url: baseAudit.url,
    keyword,
    strategicScore,
    scoreLabel: baseAudit.score_label,
    scan,
    opportunities: baseAudit.opportunities,
    contentAngle,
    contentBrief,
    nextActions,
  });

  if (!aiStrategy) {
    return {
      ...baseAudit,
      ai_enriched: false,
      model: null,
      strategy_source: "rules",
    };
  }

  return {
    ...baseAudit,
    executive_takeaway: aiStrategy.executive_takeaway || baseAudit.executive_takeaway,
    opportunities: aiStrategy.opportunities?.length
      ? aiStrategy.opportunities
      : baseAudit.opportunities,
    clusters: aiStrategy.clusters?.length ? aiStrategy.clusters : baseAudit.clusters,
    page_ideas: aiStrategy.page_ideas?.length ? aiStrategy.page_ideas : baseAudit.page_ideas,
    internal_link_plan: aiStrategy.internal_link_plan?.length
      ? aiStrategy.internal_link_plan
      : baseAudit.internal_link_plan,
    topic_map: cleanTopicMap(aiStrategy.topic_map, topicMap),
    cluster_plan: cleanClusterPlan(aiStrategy.cluster_plan, clusterPlan),
    content_angle: aiStrategy.content_angle || baseAudit.content_angle,
    content_brief: aiStrategy.content_brief?.length
      ? aiStrategy.content_brief
      : baseAudit.content_brief,
    editor_prompt: aiStrategy.editor_prompt || baseAudit.editor_prompt,
    next_actions: aiStrategy.next_actions?.length
      ? aiStrategy.next_actions
      : baseAudit.next_actions,
    ai_enriched: true,
    model: openAiModel,
    strategy_source: "openai",
  };
}

async function buildGrowthPlaybook(body: TaskBody) {
  const url = clean(body.url) || "onbekende website";
  const keyword = clean(body.keyword) || "belangrijkste dienst";
  const companyName = clean(body.company_name);
  const services = clean(body.services);
  const targetAudience = clean(body.target_audience);
  const toneVoice = clean(body.tone_voice);
  const normalizedUrl = normalizeUrl(url);

  let scan: PageScan | null = null;
  let scanError = "";
  try {
    scan = normalizedUrl ? await scanPage(normalizedUrl, keyword) : null;
  } catch (error) {
    scanError = error instanceof Error ? error.message : "Website kon niet worden opgehaald.";
  }

  const brandName = companyName || (scan?.title ? scan.title.split(/[|-]/)[0].trim() : "dit merk");
  const boardTitle = `Growth playbook voor ${brandName}`;
  const moneyPages = [
    {
      title: `${keyword}: keuzehulp`,
      intent: "Overwegen",
      promise: "Helpt bezoekers kiezen en geeft Google een duidelijke topical hub.",
      why_now: "Dit is de pagina waar informatieve interesse naar commerciele actie kan bewegen.",
    },
    {
      title: `${keyword} kosten, opties en valkuilen`,
      intent: "Vergelijken",
      promise: "Maakt bezwaren zichtbaar voordat een bezoeker afhaakt.",
      why_now: "Prijs-, keuze- en risicozoekopdrachten zitten vaak dicht op conversie.",
    },
    {
      title: `${keyword} aanvragen of starten`,
      intent: "Converteren",
      promise: "Eindigt met een rustige, duidelijke vervolgstap.",
      why_now: "Zonder conversiepagina blijft autoriteit los zand.",
    },
  ];
  const contentMachine = [
    {
      pillar: `${keyword}: complete gids`,
      support_articles: [
        `Wanneer is ${keyword} slim?`,
        `${keyword}: veelgemaakte fouten`,
        `Checklist voor ${keyword}`,
      ],
      conversion_link: `${keyword} aanvragen of gesprek plannen`,
    },
  ];
  const topicMap = buildRuleTopicMap({
    keyword,
    scan,
    clusters: [
      {
        name: `${keyword}: complete gids`,
        intent: "Topical hub",
        angle: "Bundelt de belangrijkste vragen en stuurt door naar ondersteunende pagina's.",
      },
      {
        name: `${keyword} vergelijken`,
        intent: "Overwegen",
        angle: "Helpt bezoekers opties, risico's en criteria naast elkaar leggen.",
      },
      {
        name: `${keyword} bewijs`,
        intent: "Vertrouwen",
        angle: "Laat cases, reviews, cijfers en praktijkvoorbeelden zien.",
      },
      {
        name: `${keyword} aanvragen`,
        intent: "Converteren",
        angle: "Maakt de volgende stap logisch en laagdrempelig.",
      },
    ],
    pageIdeas: moneyPages.map((page) => ({
      title: page.title,
      why: page.why_now,
      format: page.intent,
    })),
    internalLinkPlan: [
      `Laat alle ondersteunende artikelen naar "${keyword}: complete gids" linken.`,
      `Link vanuit de gids naar "${keyword} aanvragen of gesprek plannen".`,
      "Gebruik bewijsblokken als brug tussen informatieve content en conversiepagina.",
    ],
  });
  const clusterPlan = buildRuleClusterPlan({
    keyword,
    topicMap,
    pageIdeas: moneyPages.map((page) => ({
      title: page.title,
      why: page.why_now,
      format: page.intent,
    })),
  });
  const proofToCollect = [
    "Een klantvoorbeeld met beginsituatie, aanpak en resultaat.",
    "Drie concrete vragen die klanten vaak stellen voor ze kopen.",
    "Een screenshot, cijfer, review of voorbeeld dat vertrouwen geeft.",
  ];
  const sevenDaySprint = [
    { day: "Dag 1", action: "Kies de hoofdzoekintentie en belofte.", outcome: "Een scherpe paginahoek." },
    { day: "Dag 2", action: "Verzamel bewijs en klanttaal.", outcome: "Minder generieke content." },
    { day: "Dag 3", action: "Maak de money page structuur.", outcome: "Een publiceerbare briefing." },
    { day: "Dag 4", action: "Schrijf de eerste versie.", outcome: "Een pagina die kan worden gereviewd." },
    { day: "Dag 5", action: "Voeg interne links toe.", outcome: "Meer topical authority." },
    { day: "Dag 6", action: "Maak CTA en bewijsblokken sterker.", outcome: "Meer vertrouwen en conversie." },
    { day: "Dag 7", action: "Publiceer en plan twee ondersteunende artikelen.", outcome: "Een contentmachine in plaats van een losse pagina." },
  ];
  const basePlaybook = {
    ok: true,
    type: "growth_playbook",
    status: scan ? "scanned" : "fallback",
    url: scan?.finalUrl || normalizedUrl || url,
    keyword,
    board_title: boardTitle,
    narrative_hook: `Hermes kijkt niet alleen naar "${keyword}", maar naar het systeem eromheen: welke pagina verkoopt, welke artikelen autoriteit bouwen en welk bewijs het vertrouwen geeft.`,
    positioning: `${brandName} kan rond "${keyword}" sterker worden door niet meer losse content te maken, maar een duidelijke route van vraag naar vertrouwen naar actie.`,
    audience_insight:
      targetAudience ||
      "De bezoeker wil niet alleen uitleg, maar vooral zekerheid: is dit voor mij, waarom nu, wat zijn de risico's en wat is de logische volgende stap?",
    source_signals: scan
      ? {
          title: scan.title,
          h1: scan.h1,
          h2: scan.h2.slice(0, 8),
          word_count: scan.wordCount,
          internal_links: scan.internalLinks,
          proof_signals: scan.hasProofSignals,
          cta_signals: scan.hasCtaSignals,
        }
      : { error: scanError },
    money_pages: moneyPages,
    content_machine: contentMachine,
    topic_map: topicMap,
    cluster_plan: clusterPlan,
    proof_to_collect: proofToCollect,
    seven_day_sprint: sevenDaySprint,
    demo_script: [
      `Hermes heeft ${scan ? "de website gelezen" : "de input gebruikt"} en maakt hier geen losse audit van, maar een groeiplan.`,
      `De kern is: maak van "${keyword}" een route van orientatie naar vertrouwen naar conversie.`,
      "Daarom zie je money pages, ondersteunende artikelen, bewijs dat mist en een sprint voor de eerste week.",
    ],
    editor_prompt: [
      `Maak een premium SEO-money-page over "${keyword}" voor ${brandName}.`,
      services ? `Aanbod/context: ${services}.` : "",
      targetAudience ? `Doelgroep: ${targetAudience}.` : "",
      toneVoice ? `Tone of voice: ${toneVoice}.` : "",
      "Gebruik het Hermes groeiplan: positionering, bewijs, keuzecriteria, interne links en duidelijke CTA.",
    ].filter(Boolean).join("\n"),
  };

  const aiPlaybook = await buildAiGrowthPlaybook({
    url: basePlaybook.url,
    keyword,
    companyName,
    services,
    targetAudience,
    toneVoice,
    scan,
    scanError,
  });

  if (!aiPlaybook) {
    return {
      ...basePlaybook,
      ai_enriched: false,
      model: null,
      strategy_source: "rules",
    };
  }

  return {
    ...basePlaybook,
    board_title: aiPlaybook.board_title || basePlaybook.board_title,
    narrative_hook: aiPlaybook.narrative_hook || basePlaybook.narrative_hook,
    positioning: aiPlaybook.positioning || basePlaybook.positioning,
    audience_insight: aiPlaybook.audience_insight || basePlaybook.audience_insight,
    money_pages: aiPlaybook.money_pages?.length ? aiPlaybook.money_pages : basePlaybook.money_pages,
    content_machine: aiPlaybook.content_machine?.length
      ? aiPlaybook.content_machine
      : basePlaybook.content_machine,
    topic_map: cleanTopicMap(aiPlaybook.topic_map, topicMap),
    cluster_plan: cleanClusterPlan(aiPlaybook.cluster_plan, clusterPlan),
    proof_to_collect: aiPlaybook.proof_to_collect?.length
      ? aiPlaybook.proof_to_collect
      : basePlaybook.proof_to_collect,
    seven_day_sprint: aiPlaybook.seven_day_sprint?.length
      ? aiPlaybook.seven_day_sprint
      : basePlaybook.seven_day_sprint,
    demo_script: aiPlaybook.demo_script?.length ? aiPlaybook.demo_script : basePlaybook.demo_script,
    editor_prompt: aiPlaybook.editor_prompt || basePlaybook.editor_prompt,
    ai_enriched: true,
    model: openAiModel,
    strategy_source: "openai",
  };
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "hermes-agent",
    message: "Hermes leeft",
    time: new Date().toISOString(),
  });
});

app.post("/tasks", requireHermesKey, async (req, res) => {
  const body = (req.body || {}) as TaskBody;
  const task = clean(body.task);

  if (task === "seo_audit") {
    return res.json(await buildSeoAudit(body));
  }

  if (task === "growth_playbook") {
    return res.json(await buildGrowthPlaybook(body));
  }

  return res.json({
    ok: true,
    type: "echo",
    received: body,
    message: "Taak ontvangen door Hermes",
  });
});

app.listen(port, () => {
  console.log(`Hermes draait op poort ${port}`);
});
