import { useState, useEffect, useRef } from "react";

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75} strokeLinecap="round"
    strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

const Icons = {
  grid:       "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  zap:        "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
  eye:        "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  settings:   "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 0v3m0-12V3m9 9h-3M6 12H3m15.36-6.36-2.12 2.12M8.76 15.24l-2.12 2.12M20.49 16.49l-2.12-2.12M5.63 7.63 3.51 5.51",
  users:      "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m16-14a4 4 0 0 1 0 8m5 6v-2a4 4 0 0 0-3-3.87",
  credit:     "M1 4h22v16H1zM1 10h22",
  chevronR:   "M9 18l6-6-6-6",
  chevronD:   "M6 9l6 6 6-6",
  plus:       "M12 5v14M5 12h14",
  check:      "M20 6 9 17l-5-5",
  arrowR:     "M5 12h14M12 5l7 7-7 7",
  sparkle:    "M12 3l1.88 5.78L20 10l-5.78 1.88L13 18l-1.88-5.78L6 10l5.78-1.88z",
  send:       "M22 2 11 13M22 2 15 22 11 13 2 9l20-7z",
  messageC:   "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  link:       "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  globe:      "M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  trending:   "M23 6l-9.5 9.5-5-5L1 18",
  file:       "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  x:          "M18 6 6 18M6 6l12 12",
  thumbUp:    "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const VIEWS = { DASHBOARD: "dashboard", WORKSPACE: "workspace", REVIEW: "review" };

const PAGES = [
  { id: 1, title: "Beste CRM-software voor MKB in 2026", keyword: "crm software mkb", date: "5 apr", status: "published", words: 2340 },
  { id: 2, title: "HubSpot vs Salesforce: Eerlijke vergelijking", keyword: "hubspot vs salesforce", date: "3 apr", status: "review", words: 1980 },
  { id: 3, title: "Kosten van ERP-implementatie: Complete gids", keyword: "erp implementatie kosten", date: "1 apr", status: "draft", words: 3120 },
  { id: 4, title: "Top 10 SEO-tools voor B2B-bedrijven", keyword: "b2b seo tools", date: "28 mrt", status: "published", words: 2680 },
];

const GENERATED_CONTENT = [
  { section: "Introductie", text: "In een markt vol met generieke CRM-oplossingen is de keuze voor het juiste systeem een strategische beslissing die direct impact heeft op uw omzetgroei. Dit artikel vergelijkt de tien toonaangevende CRM-platforms op basis van functionaliteit, TCO en schaalbaarheid." },
  { section: "Wat maakt een CRM geschikt voor MKB?", text: "Voor middelgrote B2B-bedrijven draait een effectieve CRM niet om het aantal features, maar om adoptiegraad en integratiemogelijkheden met uw bestaande salesstack. De drie bepalende factoren: onboardingsnelheid, API-flexibiliteit en rapportage op dealnivaeu." },
  { section: "Vergelijkingsmatrix", text: "Op basis van een analyse van 847 MKB-implementaties in 2025 scoort HubSpot Sales Hub gemiddeld 4,3/5 voor gebruiksgemak, terwijl Salesforce Sales Cloud 4,1 scoort maar significant beter presteert op enterprise-integraties." },
  { section: "Kostenvergelijking & ROI", text: "De gemiddelde TCO over drie jaar bedraagt €18.400 voor HubSpot Professional versus €31.200 voor Salesforce Essentials bij een team van 15 gebruikers. Echter: organisaties die naar Enterprise opschalen zien bij Salesforce een betere kostenontwikkeling." },
  { section: "Conclusie & Aanbeveling", text: "Voor MKB-bedrijven met een team tot 50 gebruikers en een outbound salesmotion is HubSpot Sales Hub de meest kostenefficiënte keuze. Bedrijven die internationaal schalen of complexe multi-cloud architecturen hanteren, profiteren van Salesforce's ecosysteem." },
];

const COMMENTS = [
  { id: 1, author: "M. de Vries", text: "Kunnen we de TCO-berekening nog specificeren voor de Nederlandse markt?", section: "Kostenvergelijking & ROI", time: "14:22", resolved: false },
  { id: 2, author: "T. Bakker", text: "Goed punt over de adoptiegraad. Misschien een concrete case toevoegen?", section: "Wat maakt een CRM geschikt voor MKB?", time: "14:35", resolved: true },
  { id: 3, author: "S. Jansen", text: "De bronvermelding voor de 847 implementaties ontbreekt nog.", section: "Vergelijkingsmatrix", time: "15:01", resolved: false },
];

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    published: { label: "Gepubliceerd", bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
    review:    { label: "In review",    bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400" },
    draft:     { label: "Concept",      bg: "bg-zinc-700/60",    text: "text-zinc-400",     dot: "bg-zinc-500" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const Sidebar = ({ view, setView }) => {
  const nav = [
    { id: VIEWS.DASHBOARD, label: "Dashboard",    icon: Icons.grid },
    { id: VIEWS.WORKSPACE, label: "Genereren",    icon: Icons.zap },
    { id: VIEWS.REVIEW,    label: "Review",       icon: Icons.eye },
  ];
  const bottom = [
    { label: "Team",        icon: Icons.users },
    { label: "Facturering", icon: Icons.credit },
    { label: "Instellingen",icon: Icons.settings },
  ];

  return (
    <aside className="w-56 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Icon d={Icons.sparkle} size={14} className="text-white" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white leading-none">cyflux</div>
            <div className="text-xs text-zinc-500 leading-none mt-0.5">x turn.one</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all ${
              view === item.id
                ? "bg-indigo-600/20 text-indigo-400 font-medium"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <Icon d={item.icon} size={15} />
            {item.label}
            {view === item.id && <span className="ml-auto w-1 h-4 rounded-full bg-indigo-500" />}
          </button>
        ))}

        <div className="pt-4 pb-1 px-3">
          <div className="text-xs text-zinc-600 font-medium uppercase tracking-wider">Beheer</div>
        </div>
        {bottom.map(item => (
          <button key={item.label}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all">
            <Icon d={item.icon} size={15} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Credits */}
      <div className="mx-3 mb-3 p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-zinc-400">Credits</span>
          <span className="text-xs text-zinc-300 font-medium">142 / 200</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-700">
          <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: "71%" }} />
        </div>
        <p className="text-xs text-zinc-600 mt-1.5">58 credits resterend</p>
      </div>
    </aside>
  );
};

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
const TopBar = ({ title, subtitle, action }) => (
  <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-800 flex-shrink-0">
    <div>
      <h1 className="text-sm font-semibold text-white">{title}</h1>
      {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = ({ setView }) => {
  const kpis = [
    { label: "Gegenereerde pagina's", value: "14", delta: "+4 vs vorige maand", icon: Icons.file, up: true },
    { label: "Geschat maandverkeer", value: "8.240", delta: "+12% vs vorige maand", icon: Icons.trending, up: true },
    { label: "Domein Autoriteit", value: "38", delta: "-1 vs vorige meting", icon: Icons.globe, up: false },
  ];

  return (
    <div className="flex-1 overflow-auto bg-zinc-950">
      <TopBar
        title="Dashboard"
        subtitle="Werkruimte overzicht - April 2026"
        action={
          <button
            onClick={() => setView(VIEWS.WORKSPACE)}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all">
            <Icon d={Icons.plus} size={14} />
            Nieuwe pagina
          </button>
        }
      />
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zinc-500 font-medium">{k.label}</span>
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Icon d={k.icon} size={14} className="text-zinc-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{k.value}</div>
              <div className={`text-xs font-medium ${k.up ? "text-emerald-400" : "text-red-400"}`}>{k.delta}</div>
            </div>
          ))}
        </div>

        {/* Pages Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white">Recente pagina's</h2>
            <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Alles bekijken →</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Paginatitel", "Zoekwoord", "Woorden", "Datum", "Status", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PAGES.map((p, i) => (
                <tr key={p.id}
                  className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer ${i === PAGES.length - 1 ? "border-0" : ""}`}>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-zinc-200 font-medium">{p.title}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-zinc-500 font-mono bg-zinc-800 px-2 py-0.5 rounded">{p.keyword}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-400 font-mono">{p.words.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">{p.date}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-3.5">
                    <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                      Openen <Icon d={Icons.chevronR} size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── GENERATION WORKSPACE ─────────────────────────────────────────────────────
const GenerationWorkspace = ({ setView }) => {
  const [phase, setPhase] = useState("config"); // config | generating | editor
  const [keyword, setKeyword] = useState("");
  const [intent, setIntent] = useState("mofu");
  const [length, setLength] = useState(1);
  const [depth, setDepth] = useState(1);
  const [facts, setFacts] = useState(true);
  const [streamedContent, setStreamedContent] = useState([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [charIndex, setCharIndex] = useState(0);
  const [status, setStatus] = useState("");
  const streamRef = useRef(null);

  const lengthLabels = ["Kort (~1.200 w)", "Standaard (~2.200 w)", "Uitgebreid (~3.800 w)"];
  const depthLabels  = ["Algemeen publiek", "Industry Practitioner", "Technisch Expert"];

  // Cursor blink
  useEffect(() => {
    if (phase !== "generating") return;
    const t = setInterval(() => setCursorVisible(v => !v), 500);
    return () => clearInterval(t);
  }, [phase]);

  // Stream simulation
  useEffect(() => {
    if (phase !== "generating") return;
    const sections = GENERATED_CONTENT;
    if (currentSection >= sections.length) {
      setTimeout(() => setPhase("editor"), 600);
      return;
    }
    const sec = sections[currentSection];
    setStatus(facts && currentSection === 2 ? "Claims en citaten verifiëren..." : "");
    const fullText = sec.text;
    if (charIndex < fullText.length) {
      streamRef.current = setTimeout(() => {
        setStreamedContent(prev => {
          const next = [...prev];
          if (!next[currentSection]) next[currentSection] = { section: sec.section, text: "" };
          next[currentSection] = { ...next[currentSection], text: fullText.slice(0, charIndex + 1) };
          return next;
        });
        setCharIndex(i => i + 1);
      }, 18);
    } else {
      streamRef.current = setTimeout(() => {
        setCurrentSection(s => s + 1);
        setCharIndex(0);
        setStatus("");
      }, 400);
    }
    return () => clearTimeout(streamRef.current);
  }, [phase, currentSection, charIndex, facts]);

  const handleGenerate = () => {
    if (!keyword.trim()) return;
    setPhase("generating");
    setStreamedContent([]);
    setCurrentSection(0);
    setCharIndex(0);
  };

  const handleReset = () => {
    clearTimeout(streamRef.current);
    setPhase("config");
    setStreamedContent([]);
    setCurrentSection(0);
    setCharIndex(0);
    setKeyword("");
  };

  if (phase === "config") return (
    <div className="flex-1 overflow-auto bg-zinc-950">
      <TopBar title="Nieuwe pagina genereren" subtitle="Configureer uw SEO-pagina" />
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Keyword */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Primair zoekwoord *</label>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="bijv. crm software mkb"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        {/* Intent */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Paginaintentie</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "mofu", label: "MoFu", sub: "Vergelijking, Educatief, How-To" },
              { id: "bofu", label: "BoFu", sub: "Conversiegericht, ROI-focus, Demo" },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setIntent(opt.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  intent === opt.id
                    ? "border-indigo-500 bg-indigo-600/10"
                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                }`}
              >
                <div className={`text-sm font-semibold ${intent === opt.id ? "text-indigo-400" : "text-zinc-300"}`}>{opt.label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-5">
          <label className="text-sm font-medium text-zinc-300">Structuurconfiguratie</label>
          {[
            { label: "Contentlengte", value: length, set: setLength, labels: lengthLabels },
            { label: "Technische diepte", value: depth, set: setDepth, labels: depthLabels },
          ].map(sl => (
            <div key={sl.label} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">{sl.label}</span>
                <span className="text-xs text-indigo-400 font-medium">{sl.labels[sl.value]}</span>
              </div>
              <input type="range" min={0} max={2} step={1} value={sl.value}
                onChange={e => sl.set(Number(e.target.value))}
                className="w-full h-1.5 appearance-none rounded-full cursor-pointer accent-indigo-500"
                style={{ background: `linear-gradient(to right, #6366f1 ${sl.value * 50}%, #27272a ${sl.value * 50}%)` }}
              />
              <div className="flex justify-between text-xs text-zinc-600">
                {sl.labels.map(l => <span key={l}>{l.split(" ")[0]}</span>)}
              </div>
            </div>
          ))}

          {/* Facts toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900 border border-zinc-800">
            <div>
              <div className="text-xs font-medium text-zinc-300">Feitencontrole inschakelen</div>
              <div className="text-xs text-zinc-600 mt-0.5">Activeert verificatieagent in de pipeline</div>
            </div>
            <button
              onClick={() => setFacts(f => !f)}
              className={`relative w-10 h-5 rounded-full transition-all ${facts ? "bg-indigo-600" : "bg-zinc-700"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${facts ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <button
            onClick={handleGenerate}
            disabled={!keyword.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium transition-all">
            <Icon d={Icons.zap} size={15} />
            Generatie starten
            <Icon d={Icons.arrowR} size={14} />
          </button>
          <p className="text-center text-xs text-zinc-600">Geschatte tijd: 45–90 seconden</p>
        </div>
      </div>
    </div>
  );

  if (phase === "generating") return (
    <div className="flex-1 overflow-auto bg-zinc-950">
      <TopBar
        title={keyword || "Genereren..."}
        subtitle={`Sectie ${Math.min(currentSection + 1, GENERATED_CONTENT.length)} van ${GENERATED_CONTENT.length}`}
        action={
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs text-indigo-400 font-medium">Bezig met genereren</span>
          </div>
        }
      />
      {status && (
        <div className="mx-6 mt-4 px-4 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-amber-400 font-mono">{status}</p>
        </div>
      )}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Progress bar */}
        <div className="h-0.5 rounded-full bg-zinc-800">
          <div className="h-0.5 rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${(currentSection / GENERATED_CONTENT.length) * 100}%` }} />
        </div>

        {streamedContent.map((block, i) => (
          <div key={i} className="space-y-2">
            <h2 className="text-base font-semibold text-indigo-400">{block.section}</h2>
            <div className="h-px bg-zinc-800" />
            <p className="text-sm text-zinc-300 leading-relaxed">
              {block.text}
              {i === streamedContent.length - 1 && (
                <span className={`inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 align-middle transition-opacity ${cursorVisible ? "opacity-100" : "opacity-0"}`} />
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  // Editor
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
      <TopBar
        title={keyword}
        subtitle={`Generatie voltooid - ${(2200 + length * 600).toLocaleString()} woorden`}
        action={
          <div className="flex items-center gap-2">
            <button onClick={handleReset}
              className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-all">
              Concept opslaan
            </button>
            <button
              onClick={() => setView(VIEWS.REVIEW)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 transition-all">
              <Icon d={Icons.link} size={12} />
              Delen voor review
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition-all">
              <Icon d={Icons.send} size={12} />
              Publiceren
            </button>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Generatie voltooid</span>
              {facts && <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded font-mono">Feitgecontroleerd</span>}
            </div>
            {GENERATED_CONTENT.map((block, i) => (
              <div key={i} className="group space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-white">{block.section}</h2>
                  <button className="opacity-0 group-hover:opacity-100 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-all">
                    <Icon d={Icons.sparkle} size={11} /> Regenereer sectie
                  </button>
                </div>
                <div className="h-px bg-zinc-800" />
                <p className="text-sm text-zinc-300 leading-relaxed">{block.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SEO Panel */}
        <div className="w-64 flex-shrink-0 border-l border-zinc-800 bg-zinc-900 overflow-auto p-4 space-y-4">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">SEO Metadata</h3>
          {[
            { label: "Titel tag", value: `Beste CRM-software voor MKB 2026 | Vergelijking & Kosten` },
            { label: "Meta description", value: "Vergelijk de 10 beste CRM-tools voor het MKB. Eerlijke analyse van HubSpot, Salesforce en meer op kosten, functies en implementatie." },
          ].map(m => (
            <div key={m.label} className="space-y-1">
              <div className="text-xs text-zinc-500">{m.label}</div>
              <div className="text-xs text-zinc-300 bg-zinc-800 rounded p-2 leading-relaxed">{m.value}</div>
            </div>
          ))}
          <div className="h-px bg-zinc-800" />
          {[
            { label: "Woordtelling", value: (2200 + length * 600).toLocaleString() },
            { label: "Zoekwoorddichtheid", value: "1.8%" },
            { label: "Leesbaarheid", value: "B2B Practitioner" },
          ].map(s => (
            <div key={s.label} className="flex justify-between items-center">
              <span className="text-xs text-zinc-500">{s.label}</span>
              <span className="text-xs text-zinc-300 font-mono">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── REVIEW VIEW ──────────────────────────────────────────────────────────────
const ReviewView = () => {
  const [selected, setSelected] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(COMMENTS);
  const [approved, setApproved] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

  const addComment = () => {
    if (!newComment.trim() || !selected) return;
    setComments(prev => [...prev, {
      id: Date.now(), author: "Jij", text: newComment,
      section: selected, time: new Date().toLocaleTimeString("nl", { hour: "2-digit", minute: "2-digit" }), resolved: false
    }]);
    setNewComment("");
  };

  const openCount = comments.filter(c => !c.resolved).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
      {/* Approval banner */}
      {!approved ? (
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-2.5 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Icon d={Icons.eye} size={14} className="text-zinc-500" />
            <span className="text-xs text-zinc-400 font-medium">Beste CRM-software voor MKB in 2026</span>
            <span className="text-xs text-zinc-600">|</span>
            <span className="text-xs text-zinc-500">{openCount} open opmerking{openCount !== 1 ? "en" : ""}</span>
          </div>
          <button
            onClick={() => setShowApproveModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-all">
            <Icon d={Icons.thumbUp} size={12} />
            Goedkeuren voor publicatie
          </button>
        </div>
      ) : (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600/10 border-b border-emerald-500/20">
          <Icon d={Icons.check} size={14} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">Goedgekeurd - Editor is op de hoogte gesteld</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Document */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-2xl space-y-6">
            <div className="space-y-1">
              <div className="text-xs text-zinc-600 font-mono">cyflux x turn.one - Reviewomgeving</div>
              <h1 className="text-2xl font-bold text-white">Beste CRM-software voor MKB in 2026</h1>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>2.340 woorden</span>
                <span>·</span>
                <span>MoFu</span>
                <span>·</span>
                <span>Feitgecontroleerd</span>
              </div>
            </div>
            <div className="h-px bg-zinc-800" />
            {GENERATED_CONTENT.map((block, i) => {
              const blockComments = comments.filter(c => c.section === block.section && !c.resolved);
              return (
                <div key={i}
                  onClick={() => setSelected(block.section)}
                  className={`group space-y-2 cursor-pointer p-3 rounded-lg -mx-3 transition-all ${
                    selected === block.section ? "bg-indigo-600/5 border border-indigo-500/20" : "hover:bg-zinc-900/50 border border-transparent"
                  }`}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">{block.section}</h2>
                    {blockComments.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <Icon d={Icons.messageC} size={10} />
                        {blockComments.length}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{block.text}</p>
                  {selected === block.section && (
                    <div className="pt-2 flex gap-2">
                      <input value={newComment} onChange={e => setNewComment(e.target.value)}
                        placeholder="Voeg opmerking toe..."
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                        onKeyDown={e => e.key === "Enter" && addComment()}
                      />
                      <button onClick={addComment}
                        className="px-3 py-1.5 rounded-md text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all">
                        Plaatsen
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Comments Panel */}
        <div className="w-72 flex-shrink-0 border-l border-zinc-800 bg-zinc-900 overflow-auto flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-xs font-semibold text-zinc-300">Opmerkingen ({comments.length})</h3>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {comments.map(c => (
              <div key={c.id}
                onClick={() => setSelected(c.section)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  c.resolved
                    ? "bg-zinc-800/30 border-zinc-800 opacity-50"
                    : selected === c.section
                    ? "bg-indigo-600/5 border-indigo-500/30"
                    : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-300">{c.author}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-600 font-mono">{c.time}</span>
                    {c.resolved && <span className="text-xs text-emerald-400">✓</span>}
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{c.text}</p>
                <div className="mt-1.5 text-xs text-zinc-600 truncate">{c.section}</div>
                {!c.resolved && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setComments(prev => prev.map(x => x.id === c.id ? {...x, resolved: true} : x)); }}
                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    Markeer als opgelost
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Icon d={Icons.check} size={18} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Goedkeuren voor publicatie</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              Door te bevestigen geeft u aan dat deze content gereed is voor publicatie. De editor ontvangt direct een melding.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowApproveModal(false)}
                className="flex-1 py-2 rounded-md text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-200 transition-all">
                Annuleren
              </button>
              <button onClick={() => { setApproved(true); setShowApproveModal(false); }}
                className="flex-1 py-2 rounded-md text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-all">
                Bevestigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function CyfluxPrototype() {
  const [view, setView] = useState(VIEWS.DASHBOARD);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden relative">
      <Sidebar view={view} setView={setView} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {view === VIEWS.DASHBOARD  && <Dashboard setView={setView} />}
        {view === VIEWS.WORKSPACE  && <GenerationWorkspace setView={setView} />}
        {view === VIEWS.REVIEW     && <ReviewView />}
      </main>
    </div>
  );
}
