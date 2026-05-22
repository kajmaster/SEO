import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const hermesApiKey = process.env.HERMES_API_KEY;

type TaskBody = {
  task?: unknown;
  url?: unknown;
  keyword?: unknown;
  workspace_id?: unknown;
  user_id?: unknown;
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
  ].filter(Boolean);

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

  return {
    ok: true,
    type: "seo_audit",
    status: scan ? "scanned" : "fallback",
    url: scan?.finalUrl || normalizedUrl || url,
    keyword,
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
    content_angle: `Maak een pagina rond "${keyword}" die niet alleen uitlegt wat het is, maar de bezoeker helpt kiezen: wanneer is dit relevant, waar let je op, welk bewijs is er, en wat is de volgende stap?`,
    content_brief: [
      `Gebruik de huidige page title als startpunt: ${pageTitle}.`,
      `Verwerk "${keyword}" zichtbaar in de eerste schermsectie.`,
      "Voeg minimaal één bewijsblok toe: klantvoorbeeld, resultaat, review of concreet scenario.",
      "Maak interne links naar verwante diensten of kennisbankartikelen.",
      "Sluit af met één duidelijke CTA.",
    ],
    next_actions: [
      "Kies de belangrijkste zoekintentie voor deze pagina.",
      "Laat ContentFlow een nieuwe pagina of verbeterbrief genereren op basis van deze audit.",
      "Gebruik feedback om woorden, toon en claims aan te scherpen.",
    ],
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
