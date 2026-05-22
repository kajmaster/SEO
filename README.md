# SEO Workspace

Deze repository bevat de huidige ContentFlow MVP als hoofdentrypoint, plus ondersteunende prototypes, documentatie en assets.

## Structuur

- `contentflow-mvp.html`: primaire HTML-entrypoint voor de MVP
- `_redirects`: redirect-configuratie naar de hoofdentrypoint
- `assets/`: mockups en beeldmateriaal
- `db/`: database- en schema-bestanden
- `docs/`: PRD's, samenvattingen en overige projectdocumentatie
- `netlify/functions/`: serverless functies voor deploys, waaronder de realtime voice session proxy
- `prototypes/`: losse UI-prototypes en experimenten
- `scripts/`: hulpscripts voor lokaal testen

## Opmerking

`contentflow-mvp.html` is bewust de hoofdversie. De eerdere dubbele `index.html` is verwijderd om de repo eenduidig te houden.

## Content generatie

De contentgeneratie loopt nu direct via een TypeScript Netlify function:

- frontend: `contentflow-mvp.html`
- endpoint: `/.netlify/functions/generate-content`
- backendlogica: `netlify/functions/generate-content.ts`
- gedeelde generatiehelpers: `netlify/functions/_contentflow-generation.ts`

Er is dus geen n8n-runtime meer nodig voor de hoofdflow.

## Hermes agent

Hermes draait als aparte agent op de Hetzner-server. De frontend praat niet direct met Hermes, omdat de geheime API-key dan zichtbaar zou worden in de browser. De veilige route is:

```text
contentflow-mvp.html -> Netlify function -> Hermes op Hetzner
```

Endpoint in deze repo:

- `/.netlify/functions/hermes-task`
- backendlogica: `netlify/functions/hermes-task.ts`
- agent source: `hermes-agent/`

Benodigde Netlify environment variables:

```env
HERMES_URL=http://jouw-hermes-server:3001
HERMES_API_KEY=dezelfde-key-als-op-de-Hetzner-server
CONTENTFLOW_INTERNAL_KEY=optionele-key-voor-server-side-tests
```

`HERMES_API_KEY` en `CONTENTFLOW_INTERNAL_KEY` horen nooit in `contentflow-mvp.html` of andere frontendcode te staan. De Hermes proxy accepteert normale app-requests alleen met een geldige Supabase login en workspace-toegang. Voor terminaltests kun je server-side `x-contentflow-key` gebruiken.

## Turn.One design system

De frontend gebruikt nu lokaal geïmporteerde Turn.One design-system assets:

- `assets/turnone/theme-turnone/`: gedeelde tokens, componenten en patronen
- `assets/turnone/theme-seo-tool/`: SEO Tool productlaag bovenop Turn.One
- `contentflow-mvp.html`: nieuwe Turn.One Studio-frontend met chat rail, artifact workspace en context rail
- `netlify/functions/studio-context.ts`: beta-context endpoint zodat de nieuwe studio zonder apart login-scherm een bestaande workspace kan koppelen

Bron: `kajmaster/turnone-design-system`, geforkt van het Turn.One design-system. De Netlify Functions en Supabase/OpenAI-backend zijn bewust niet vervangen.

## Realtime voice beta

De MVP bevat nu ook een voice beta, gebaseerd op [OpenAI's realtime-voice-component](https://github.com/openai/realtime-voice-component/), maar aangepast naar deze statische ContentFlow-opzet. Installatie- en deploynotities staan in [docs/realtime-voice-beta.md](docs/realtime-voice-beta.md).

## GStack in dit project

Dit project kan repo-lokaal met GStack werken in Codex.

Snelle setup:

```powershell
npm run gstack:setup
```

Dat script:

- zoekt een bestaande GStack checkout op je machine
- maakt `.agents/skills/gstack` aan als lokale koppeling
- draait de officiële Codex setup van GStack voor deze repo

Handig om te weten:

- `.agents/` is gegenereerde lokale machine-state en staat in `.gitignore`
- open na setup een nieuwe Codex sessie zodat de repo-local GStack skills worden geladen
- als GStack op een andere plek staat, zet eerst `GSTACK_SOURCE` of pas het pad mee aan in het PowerShell-script
