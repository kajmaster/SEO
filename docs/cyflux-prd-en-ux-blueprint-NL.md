# cyflux x turn.one -Product Requirements Document & UX Blueprint
### Versie 1.0 | Vertrouwelijk -Intern Stakeholderoverleg
**Datum:** April 2026 | **Status:** MVP Definitie

---

## Inhoudsopgave

1. [Executive Summary & Visie](#1-executive-summary--visie)
2. [Gebruikersrollen & Persona's](#2-gebruikersrollen--personas)
3. [Core UX Flows](#3-core-ux-flows)
4. [UI/UX Ontwerpprincipes](#4-uiux-ontwerpprincipes)
5. [Next.js Architectuuroverzicht](#5-nextjs-architectuuroverzicht)
6. [De Cyflux Moat](#6-de-cyflux-moat)

---

## 1. Executive Summary & Visie

### Het Probleem

B2B-marketingteams en groeibureaus verliezen budget aan SEO-content die niet converteert. Generieke AI-schrijftools produceren oppervlakkige teksten zonder strategische diepgang. Legacy SEO-bureaus zijn te traag en te duur. Niemand lost het kernprobleem op: MoFu- en BoFu-pagina's -de pagina's waarop aankoopbeslissingen worden genomen -worden niet systematisch en schaalbaar geproduceerd.

### De Oplossing

**cyflux x turn.one** is een AI-native SEO-contentengine voor B2B-bedrijven. Geen schrijfassistent. Geen contentkalender. Een revenue-infrastructuurtool die via een geautomatiseerde n8n-backend feitgecontroleerde, conversie-geoptimaliseerde MoFu/BoFu-pagina's genereert.

### Visie

> *"cyflux x turn.one maakt het genereren van SEO-content die deals sluit even systematisch en betrouwbaar als een financieel rapport draaien."*

### Commerciële Positie

- **Doelmarkt:** Mid-market en enterprise B2B-bedrijven, groei-SaaS, performance-bureaus
- **Prijsmodel:** Seat-based SaaS met een creditssysteem per gegenereerde pagina; jaarcontracten voor enterprise
- **Positionering:** Premium segment -concurrentie op outputkwaliteit en workflowvertrouwen, niet op prijs

### MVP Succesindicatoren

| Metric | Doel |
|--------|------|
| Tijd van aanmelding tot eerste pagina | < 8 minuten |
| Voltooiingsratio generatie (gestart → gepubliceerd) | > 78% |
| NPS (Editor-rol) | > 52 |
| Pagina's per workspace per maand | > 14 |

---

## 2. Gebruikersrollen & Persona's

### Rolarchitectuur

Drie rollen met strikte, niet-overlappende bevoegdheden op workspaceniveau.

---

**Admin**
Economische beslisser. Beheert facturering, gebruikers en workspaceconfiguratie. Ziet uitkomsten, geen creatieve werkruimte.

- ✓ Facturering & abonnement
- ✓ Gebruikersbeheer (uitnodigen, verwijderen, rollen toewijzen)
- ✓ Workspaceinstellingen, API-sleutels, merkprofiel
- ✓ Volledige toegang tot alle pagina's en auditlogs

---

**Editor**
Dagelijkse gebruiker. Hoge standaarden, sceptisch over AI-output. Vertrouwen moet worden verdiend via outputkwaliteit op de eerste generatie.

- ✓ Volledige toegang tot de Generatieworkspace
- ✓ Structuurconfiguratie (lengte, diepte, invalshoek)
- ✓ Bewerking na generatie en publicatie
- ✓ Deelbare reviewlinks aanmaken
- ✗ Geen facturering of gebruikersbeheer

---

**Reviewer**
Extern. Geen account vereist. Toegang uitsluitend via deelbare link. De reviewervaring is een cyflux x turn.one-brandmoment richting klanten -het moet net zo premium aanvoelen als het kernproduct.

- ✓ Alleen-lezen weergave van de gekoppelde pagina
- ✓ Inline commentaar op elke tekstselectie
- ✓ Formele goedkeuringsactie: "Goedkeuren voor publicatie"
- ✗ Geen toegang tot de kernomgeving

---

### RBAC-matrix

| Functie | Admin | Editor | Reviewer |
|---------|:-----:|:------:|:--------:|
| Facturering | ✓ | -| -|
| Gebruikersbeheer | ✓ | -| -|
| Dashboard KPI's | ✓ | ✓ | -|
| Generatieworkspace | ✓ | ✓ | -|
| Structuurconfiguratie | ✓ | ✓ | -|
| Bewerking na generatie | ✓ | ✓ | -|
| Deellink aanmaken | ✓ | ✓ | -|
| Gedeelde pagina bekijken | -| -| ✓ |
| Inline commentaar | -| -| ✓ |
| Goedkeuren voor publicatie | -| -| ✓ |

---

## 3. Core UX Flows

### 3.1 Onboarding -Merkprofiel Instellen

Een meerstapswizard in een gecentreerd modal. Geen navigatie. Geen afleidingen. Geschatte duur: ~4 minuten.

**Stap 1 -Workspace-identiteit:** Bedrijfsnaam, primair domein, branche, korte bedrijfsomschrijving

**Stap 2 -Doelgroep:** Buyer persona-titel, geografische marktfocus, bedrijfsgrootte van doelaccounts, pijnpuntensamenvatting

**Stap 3 -Merkstem:** Visuele toonkeuze (Autoritair / Consultatief / Technisch / Conversationeel), optionele concurrent-URL's, te vermijden onderwerpen

**Stap 4 -Bevestiging:** Samenvatting merkprofiel + primaire CTA: *"Genereer uw eerste pagina →"*

Regels: inline validatie per stap, automatisch opslaan na elk veld, hervatten na weggaan bij terugkeer.

---

### 3.2 Dashboard

Eén kolom. Persistente linkersidebar. Ruimte ademt. Drie KPI-kaarten bovenaan, paginalijst eronder, prominente CTA voor nieuwe generatie.

**KPI-kaarten:**

| Kaart | Metric |
|-------|--------|
| Gegenereerde pagina's | Aantal voltooide pagina's deze maand |
| Geschat maandelijks verkeer | Geprojecteerde organische sessies |
| Domeinautoriteit | Actuele DA-score primair domein |

Elke kaart toont een trendlijn vs. vorige periode. Geen decoratieve grafieken. Geen carrousels. Lege states tonen uitsluitend een prompt om de eerste pagina te genereren.

---

### 3.3 Generatieworkspace

**Fase 1 -Configuratie (`/workspace/new`)**

Volledig scherm, gecentreerde kolom, geen afleidingen.

- Primair doelzoekwoord (verplicht)
- Paginaintentie: **MoFu** of **BoFu** (segmented control met tooltips)
- Structuurschuifregelaars:
  - Contentlengte: Kort (~1.200 w) → Standaard (~2.200 w) → Uitgebreid (~3.800 w)
  - Technische diepte: Algemeen → Practitioner → Expert
  - Feitenweging: aan/uit (activeert verificatieagent in de backend)
- Optionele werktitel
- CTA: **"Generatie starten →"** + *"Geschatte tijd: 45–90 seconden"*

---

**Fase 2 -Actieve generatie**

De configuratiepagina verdwijnt (200ms fade). Inhoud verschijnt regel voor regel in real-time via SSE-streaming vanuit de n8n-backend.

- Typewriter-animatie: ~35ms per teken voor bodytekst, ~20ms voor koppen
- Blinkende cursor (`|`) volgt het actieve generatiepunt
- Sectiedivider verschijnt na elke voltooide sectie
- Voortgangsindicator rechtsboven: *"Sectie 3 van 7: Concurrentielandschap"*
- Status bij feitencontrole: *"Claims en citaten verifiëren..."* (monospaced, gedempt)

Geen spinners. Geen generieke "AI denkt na..."-teksten. Geen pop-uponderbreking.

Als de gebruiker wegnavigt: generatie loopt door in de backend. Toast bij terugkeer: *"Uw pagina is gereed."*

---

**Fase 3 -Editor na generatie**

- **Links (70%):** Inline rich-text editor -Vet, Cursief, Koppen, Link, "AI Sectie Regenereren" (verschijnt bij hover op sectiekop)
- **Rechts (30%):** SEO-metadatapaneel -titetag, metabeschrijving, woordtelling, zoekwoorddichtheid (alleen informatief, geen verplichte acties)
- **Persistente voettekstbalk:** Concept opslaan | Delen voor review | Publiceren

---

### 3.4 Samenwerking -Deelbare Reviewlinks

**Linkgeneratie (modal):**
- Gegenereerde URL met kopieerknop
- Optioneel bericht voor reviewers
- Verlooptoggle: nooit / 7 dagen
- CTA: "Link kopiëren & sluiten"

**Reviewervaring (openbare route, geen login):**
- Schoon documentweergave met cyflux x turn.one-woordmerk (ingetogen)
- Optioneel redacteurbericht in een calloutblok
- Tekstselectie triggert commentaarpopover → commentaar wordt verankerd aan de selectie in de kantlijn
- Persistente banner bovenaan: paginatitel + commentaarteller + **"Goedkeuren voor publicatie"**
- Na goedkeuring: bevestigingsmodal → notificatie naar Editor → paginastatus: "Goedgekeurd"

---

## 4. UI/UX Ontwerpprincipes

### Esthetische Standaard

cyflux x turn.one zit visueel in hetzelfde register als Linear, Vercel's dashboard en Stripe's documentatie -niet als HubSpot of Semrush. Het product bewijst zichzelf niet via kleur of animatie. Het commandeert via ruimte en precisie.

Toets voor elk ontwerpelement: *"Verdient dit element zijn plek op het scherm?"*

### Kleurensysteem (Tailwind)

| Token | Waarde | Toepassing |
|-------|--------|------------|
| `background` | `#09090B` Zinc 950 | Primaire achtergrond |
| `surface` | `#18181B` Zinc 900 | Kaarten, panels, modals |
| `border` | `#3F3F46` Zinc 700 | Dividers, inputranden |
| `text-primary` | `#FAFAFA` Zinc 50 | Koppen, bodytekst |
| `text-secondary` | `#A1A1AA` Zinc 400 | Ondertitels, metadata |
| `accent` | `#6366F1` Indigo 500 | Primaire CTA's, actieve states |
| `success` | `#22C55E` Green 500 | Positieve deltas, goedkeuring |
| `destructive` | `#EF4444` Red 500 | Uitsluitend onomkeerbare acties |

Accentkleur uitsluitend voor interactieve primaire acties -nooit decoratief. Dark-mode only in MVP.

### Typografie

- **Primair:** Geist Sans (variabel font)
- **Monospace:** Geist Mono -uitsluitend voor generatieanimatie, codeblokken en metadatawaarden

| Rol | Grootte | Gewicht |
|-----|---------|---------|
| Paginatitel | 30px | 600 |
| Sectiekop | 20px | 600 |
| Bodytekst | 14px | 400 |
| KPI-getal | 36px | 700 |

### Componenten (Shadcn/UI)

- **Knoppen primair:** `accent`-achtergrond, `rounded-md`, geen kleurovergang, geen schaduwen
- **Kaarten:** `surface`-achtergrond, `1px border-border`, `rounded-lg`, geen schaduw
- **Inputs:** focus triggert `border-accent` + `ring-2 ring-accent/20`
- **Schuifregelaars:** ingevuld deel in `accent`, stapvastzetting met `ease-out 100ms`
- **Modals:** overlay `bg-black/60 backdrop-blur-sm`, paneel `bg-surface border rounded-xl`
- **Toasts:** rechtsonder, 4 seconden, `bg-surface border`, geen kleurcodering container

### Animatie

| Context | Specificatie |
|---------|-------------|
| Paginatransities | opacity 0→1, 150ms ease-out |
| Modalopening | scale 95%→100% + opacity, 200ms |
| Generatiecursor | knippert 500ms infinite |
| Hover interacties | `transition-colors 150ms` |

Verboden: parallax, scroll-triggers, vieringsanimaties (confetti), shimmer-skeletons voor content die < 500ms laadt.

---

## 5. Next.js Architectuuroverzicht

### Technologiestapel

| Laag | Keuze | Reden |
|------|-------|-------|
| Framework | Next.js 15 (App Router) | RSC + native streaming voor generatie-UX |
| Taal | TypeScript (strict) | Enterprise codebasisintegriteit |
| Styling | Tailwind CSS v4 + Shadcn/UI | Ontwerpsnelheid zonder controleverlies |
| Auth & RBAC | Clerk | Ingebouwde RBAC, enterprise SSO-klaar |
| Database | Supabase (PostgreSQL) | Row Level Security sluit aan op RBAC-model |
| ORM | Prisma | Typeveilig schema met migratiebeheer |
| Backend pipeline | n8n (self-hosted) | Multi-agent orkestratie via webhooks |
| AI Streaming | Vercel AI SDK + SSE | Generatiestreaming direct naar frontend |
| State | Zustand | Lichtgewicht workspacestate |
| Realtime (commentaar) | Supabase Realtime | WebSocket commentaarsync |
| Deployment | Vercel | Edge-geoptimaliseerd, zero-config |

### Directorystructuur (kernonderdelen)

```
cyflux/
├── app/
│   ├── (auth)/              # Aanmelden / Inloggen
│   ├── (app)/
│   │   ├── dashboard/       # KPI-overzicht
│   │   ├── workspace/
│   │   │   ├── new/         # Configuratie vóór generatie
│   │   │   └── [pageId]/    # Editor na generatie
│   │   └── settings/        # Facturering, team, workspace
│   ├── review/[token]/      # Openbare reviewomgeving (geen auth)
│   └── api/
│       ├── generate/        # Triggert n8n, streamt respons
│       ├── share/           # Tokengeneratie deellinks
│       └── webhooks/n8n/    # Ontvangt callbacks van n8n
├── components/
│   ├── dashboard/           # KPICard, RecentPagesTable
│   ├── workspace/           # GenerationConfig, GenerationStream, Editor
│   ├── review/              # ReviewDocument, CommentSidebar
│   └── onboarding/          # OnboardingWizard
├── lib/                     # Auth, DB, n8n helpers
├── hooks/                   # useGenerationStream, useComments
└── middleware.ts             # Routebescherming op basis van rol
```

### Kritieke implementatienotities

- **Streaming:** Generatie is echte SSE-streaming vanuit n8n -geen nep-animatie over vooraf opgehaalde content.
- **RBAC-handhaving op drie lagen:** Clerk-sessietoken → Next.js middleware → Supabase Row Level Security. Geen clientzijdige rolcontrole is leidend.
- **Openbare reviewroute:** `/review/[token]` valt buiten de Clerk middleware-matcher. Token = cryptografisch veilige UUID met optioneel verloopdatum.

---

## 6. De Cyflux Moat

### Onze Strategische Voordelen

**① MoFu/BoFu Specificiteit** -Geen generieke content. Elke gegenereerde pagina is geoptimaliseerd voor een specifieke trechterlaag waar aankoopbeslissingen worden genomen.

**② Feitgecontroleerde Output** -Elke claim passeert een verificatieagent in de n8n-pipeline. Zichtbaar voor de gebruiker tijdens generatie: *"Claims en citaten verifiëren..."* -dit is een vertrouwenssignaal dat concurrenten niet kunnen evenaren zonder onze architectuur.

**③ Lineaire, Bewuste Workflow** -Eén primaire actie per scherm. Geen doodlopende paden. Geen complexe verfijnworkflows. Workflowcomplexiteit is een verborgen kostenpost; onze eenvoud is de USP.

**④ Live Generatieervaring** -Gebruikers zien het systeem werken, niet een zwarte doos. Dit bouwt vertrouwen op dat cruciaal is in enterprise-inkooptrajecten.

**⑤ Closed-Loop Review** -Deelbare links met inline commentaar elimineren e-mailketens en PDF-markeringen. Voor bureaus is dit ook een klantbeheertool.

---

### Concurrentievergelijking

| Functie | Semrush | Jasper | Surfer SEO | Ahrefs | **cyflux x turn.one** |
|---------|:-------:|:------:|:----------:|:------:|:-------------:|
| MoFu/BoFu-focus | ✗ | ✗ | Gedeeltelijk | ✗ | ✅ |
| Feitcontrole in pipeline | ✗ | ✗ | ✗ | ✗ | ✅ |
| Live generatiestreaming | ✗ | ✗ | ✗ | ✗ | ✅ |
| Inline reviewer-commentaar | ✗ | ✗ | ✗ | ✗ | ✅ |
| Formele goedkeuringsstroom | ✗ | ✗ | ✗ | ✗ | ✅ |
| Lineaire, eenvoudige UX | ✗ | Gedeeltelijk | ✗ | ✗ | ✅ |
| RBAC (Admin/Editor/Reviewer) | Gedeeltelijk | ✗ | ✗ | Gedeeltelijk | ✅ |
| Zoekwoordonderzoek | ✅ | ✗ | ✅ | ✅ | ✗ (bewust) |
| Ranktracking | ✅ | ✗ | ✅ | ✅ | ✗ (bewust) |
| CMS-integraties | ✅ | ✅ | ✅ | ✗ | ✗ (post-MVP) |
| Contentkalender | ✅ | ✅ | ✗ | ✗ | ✗ (bewust) |
| Sociale media repurposing | ✗ | ✅ | ✗ | ✗ | ✗ (bewust) |
| Dark mode (enterprise-esthetiek) | ✗ | ✗ | ✗ | ✗ | ✅ |

### Wat We Bewust Weglaten

Onze exclusies zijn strategische productkeuzes -geen MVP-beperkingen.

- **Zoekwoordonderzoek** -Gebruikers brengen hun strategie mee. cyflux x turn.one voert uit.
- **Ranktracking** -Vereist andere infrastructuur en leidt af van onze kernwaarde.
- **Batchgeneratie** -Volume is niet onze propositie. Één precisiegepagineerde pagina converteert meer dan tien middelmatige.
- **Repurposing (social)** -Ander probleemdomein. Erbij halen verdunt de productidentiteit.
- **"Ondetecteerbare AI"-content** -Wij concurreren niet in die markt. Onze output verdient haar positie door autoriteit, niet door verduistering.

### De Eén-Zin Pitch

> *"cyflux x turn.one genereert de SEO-pagina's die deals sluiten -niet de pagina's die woordtelling vullen."*

---

## Bijlage: MVP Prioritering

| Prioriteit | Functie | Revenue-impact |
|------------|---------|---------------|
| P0 | Authenticatie & RBAC | Kritisch |
| P0 | Onboardingwizard | Kritisch |
| P0 | Generatieworkspace + Streaming UX | Kritisch |
| P0 | Dashboard met KPI-kaarten | Hoog |
| P1 | Deelbare reviewlinks + commentaar | Hoog |
| P1 | Inline editor na generatie | Hoog |
| P2 | Facturering & credits (Admin) | Kritisch |
| P2 | Teambeheeer (Admin) | Hoog |
| P3 | Paginalibrary met filter/zoeken | Gemiddeld |

---

*Vertrouwelijk -Uitsluitend voor intern gebruik*
*cyflux x turn.one © 2026 -Alle rechten voorbehouden*
