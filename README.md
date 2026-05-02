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
