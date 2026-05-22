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

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function buildSeoAudit(body: TaskBody) {
  const url = clean(body.url) || "onbekende website";
  const keyword = clean(body.keyword) || "belangrijkste dienst";

  return {
    ok: true,
    type: "seo_audit",
    status: "mock",
    url,
    keyword,
    summary:
      "Hermes heeft een eerste audit-schets gemaakt. Dit is nog geen echte crawl, maar wel de vaste response-shape voor de SEO-tool.",
    opportunities: [
      {
        title: `Maak een sterke landingspagina rond ${keyword}`,
        reason:
          "Een duidelijke pagina per zoekintentie helpt Google en bezoekers sneller begrijpen waar de website autoriteit op heeft.",
        priority: "high",
      },
      {
        title: "Voeg interne links toe vanaf bestaande content",
        reason:
          "Interne links verbinden losse pagina's tot topical authority en sturen bezoekers naar conversiepagina's.",
        priority: "medium",
      },
      {
        title: "Maak bewijs concreet zichtbaar",
        reason:
          "Cases, cijfers, screenshots en klanttaal maken AI-content minder generiek en meer verkoopbaar.",
        priority: "medium",
      },
    ],
    next_actions: [
      "Kies de belangrijkste dienst of categorie.",
      "Verzamel 2 tot 3 bewijsstukken of klantvoorbeelden.",
      "Genereer daarna een contentbrief op basis van deze audit.",
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

app.post("/tasks", requireHermesKey, (req, res) => {
  const body = (req.body || {}) as TaskBody;
  const task = clean(body.task);

  if (task === "seo_audit") {
    return res.json(buildSeoAudit(body));
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
