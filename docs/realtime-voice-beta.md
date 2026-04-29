# Realtime Voice Beta

Deze repo bevat nu een aangepaste integratie van [OpenAI's realtime-voice-component](https://github.com/openai/realtime-voice-component/), maar dan passend gemaakt voor de huidige ContentFlow-MVP.

## Wat er is toegevoegd

- Een `Voice beta` launcher in de topbar
- Een voice-paneel met realtime sessiestatus en transcriptlog
- App-owned tools voor:
  - zoekwoord zetten
  - paginadoel kiezen
  - stap wisselen
  - content genereren
  - variant selecteren
  - actieve variant kopieren
- Een Netlify function op `/.netlify/functions/realtime-session`

## Deploy-configuratie

Zet in Netlify deze environment variable:

- `OPENAI_API_KEY`

Daarna gebruikt de frontend standaard dit endpoint:

- `/.netlify/functions/realtime-session`

## Lokale fallback

Als je de MVP rechtstreeks via `file://` opent, probeert de app eerst het session-endpoint te gebruiken. Als dat niet bereikbaar is en er staat lokaal een OpenAI key in Instellingen, dan valt de app terug op een directe browser-call naar OpenAI Realtime. Dat is handig voor demo's, maar minder veilig dan de Netlify route.

## Aanname

De integratie neemt het patroon uit de OpenAI referentierepo over:

- browser UI blijft eigenaar van de state
- tools blijven smal en app-owned
- de assistant mag alleen via die tools de interface bedienen

Dat past beter bij deze statische HTML-MVP dan een volledige React-package transplantatie.
