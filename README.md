# SEO Workspace

Deze repository bevat de huidige ContentFlow MVP als hoofdentrypoint, plus ondersteunende prototypes, documentatie en assets.

## Structuur

- `contentflow-mvp.html`: primaire HTML-entrypoint voor de MVP
- `contentflow-n8n-workflow.json`: n8n-workflow voor ContentFlow
- `_redirects`: redirect-configuratie naar de hoofdentrypoint
- `assets/`: mockups en beeldmateriaal
- `db/`: database- en schema-bestanden
- `docs/`: PRD's, samenvattingen en overige projectdocumentatie
- `netlify/functions/`: serverless functies voor deploys, waaronder de realtime voice session proxy
- `prototypes/`: losse UI-prototypes en experimenten
- `scripts/`: hulpscripts voor lokaal testen

## Opmerking

`contentflow-mvp.html` is bewust de hoofdversie. De eerdere dubbele `index.html` is verwijderd om de repo eenduidig te houden.

## Realtime voice beta

De MVP bevat nu ook een voice beta, gebaseerd op [OpenAI's realtime-voice-component](https://github.com/openai/realtime-voice-component/), maar aangepast naar deze statische ContentFlow-opzet. Installatie- en deploynotities staan in [docs/realtime-voice-beta.md](docs/realtime-voice-beta.md).
