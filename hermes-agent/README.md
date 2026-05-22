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
```

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
