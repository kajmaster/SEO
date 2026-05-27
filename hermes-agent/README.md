# Hermes Agent

Hermes is de lange-werk-agent voor de SEO-tool. Netlify blijft de veilige tussenlaag:

```text
SEO-tool -> Netlify function -> Hermes agent
```

## Environment

Maak op de server `/opt/hermes/.env`:

```env
HERMES_API_KEY=een-lange-geheime-key
PORT=3001
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_API_KEY` is optioneel. Zonder key gebruikt Hermes de eigen regel-scan. Met key verrijkt Hermes de gemeten website-signalen met een slimme strategie-output.

## Lokaal draaien op de server

```bash
cd /opt/hermes
npm install
npm run typecheck
npm run dev
```

## PM2

```bash
pm2 start npx --name hermes -- tsx /opt/hermes/src/server.ts
pm2 save
```

## Tailscale

Voor veilig serverbeheer kun je Tailscale op de Hetzner-server installeren:

```bash
curl -fsSL https://raw.githubusercontent.com/kajmaster/SEO/main/scripts/setup-hermes-tailscale.sh -o setup-hermes-tailscale.sh
chmod +x setup-hermes-tailscale.sh
./setup-hermes-tailscale.sh
```

Lees ook: `docs/tailscale-hermes.md`.

Belangrijk: Netlify kan standaard niet naar een prive Tailscale-IP (`100.x.x.x`) verbinden. Gebruik voor productie het huidige publieke Hermes endpoint met `HERMES_API_KEY`, of gebruik Tailscale Funnel met een publieke HTTPS-url.

## Taken

### Health

```bash
curl http://localhost:3001/health
```

### Mock SEO audit

```bash
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -H "x-hermes-key: $HERMES_API_KEY" \
  -d '{"task":"seo_audit","url":"https://voorbeeld.nl","keyword":"technische seo"}'
```

### Growth playbook

```bash
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -H "x-hermes-key: $HERMES_API_KEY" \
  -d '{"task":"growth_playbook","url":"https://voorbeeld.nl","keyword":"technische seo","company_name":"Voorbeeld BV"}'
```

Het growth playbook maakt een demo-waardig plan met positionering, money pages, contentmachine, bewijs, 7-dagen sprint en een korte pitch.
