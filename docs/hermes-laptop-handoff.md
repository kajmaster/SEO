# Hermes laptop handoff

Dit document is bedoeld als snelle overdracht wanneer je op een andere laptop verder werkt.

## Wat er nu staat

Hermes is de aparte agent op de Hetzner-server. De SEO-tool praat niet direct met Hermes vanuit de browser, maar via Netlify:

```text
contentflow-mvp.html -> Netlify function -> Hermes agent op Hetzner -> eventueel OpenAI
```

De huidige versie van Hermes:

- haalt een website live op
- meet SEO-signalen zoals title, H1, H2's, woordaantal, interne links, bewijs en CTA's
- maakt daar een strategy board van
- gebruikt optioneel OpenAI om die audit slimmer en minder generiek te maken
- valt terug op de eigen regel-scan als OpenAI ontbreekt of faalt

## Belangrijke bestanden

- `contentflow-mvp.html`: frontend van de SEO-tool
- `netlify/functions/hermes-task.ts`: veilige Netlify proxy naar Hermes
- `netlify/functions/studio-context.ts`: geeft de frontend tijdelijk toegang tot Hermes zonder geheime key te lekken
- `hermes-agent/src/server.ts`: Hermes servercode die op Hetzner draait
- `hermes-agent/README.md`: server-instructies

## Waar staat de server `.env`

Op de Hetzner-server staat het `.env`-bestand hier:

```bash
/opt/hermes/.env
```

Daar horen deze variabelen in te staan:

```env
HERMES_API_KEY=...
PORT=3001
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
```

Zet echte keys nooit in GitHub, `contentflow-mvp.html`, screenshots of documentatie.

## Server bijwerken na codewijzigingen

Als `hermes-agent/src/server.ts` is gewijzigd en naar GitHub is gepusht, update je de Hetzner-server zo:

```bash
ssh root@178.105.158.211
cd /opt/hermes
curl -fsSL https://raw.githubusercontent.com/kajmaster/SEO/main/hermes-agent/src/server.ts -o /opt/hermes/src/server.ts
pm2 restart hermes --update-env
pm2 save
```

## Lokale laptop setup

Op je laptop:

```bash
git clone https://github.com/kajmaster/SEO.git
cd SEO
npm install
npm run typecheck
```

Als de repo al bestaat:

```bash
cd pad/naar/SEO
git pull origin main
npm install
npm run typecheck
```

## Snel testen

Netlify route testen:

```bash
curl -X POST https://splendid-ganache-01f6c2.netlify.app/.netlify/functions/hermes-task ^
  -H "Content-Type: application/json" ^
  -d "{\"task\":\"seo_audit\",\"url\":\"https://kaas.nl\",\"keyword\":\"kaas\"}"
```

Let op: voor sommige tests is een geldige login, studio-token of interne server-key nodig. Zet die key niet in frontendcode.

Direct op de server testen:

```bash
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -H "x-hermes-key: JOUW_HERMES_API_KEY" \
  -d '{"task":"seo_audit","url":"https://kaas.nl","keyword":"kaas"}'
```

Als OpenAI goed staat ingesteld, bevat de response:

```json
{
  "ai_enriched": true,
  "strategy_source": "openai"
}
```

Als OpenAI niet werkt, hoort Hermes nog steeds te antwoorden met:

```json
{
  "ai_enriched": false,
  "strategy_source": "rules"
}
```

## Mentaal model

Zie Hermes als een slimme medewerker:

- de frontend is het scherm en de knop
- Netlify is de beveiliger aan de deur
- Hermes is de SEO-agent die websites onderzoekt
- OpenAI is de strategist die van de metingen betere adviezen maakt
- Supabase is het geheugen van de SEO-tool

