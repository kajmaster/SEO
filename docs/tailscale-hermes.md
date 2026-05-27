# Tailscale voor Hermes

Tailscale is bedoeld om je laptop, je Hetzner-server en eventueel andere apparaten veilig met elkaar te verbinden in een prive-netwerk.

Voor dit project gebruiken we Tailscale vooral voor Hermes:

```text
jouw laptop -> Tailscale -> Hetzner/Hermes
SEO-tool -> Netlify function -> Hermes
```

## Belangrijk om te snappen

Netlify Functions draaien niet op jouw laptop en zitten niet automatisch in jouw Tailscale-netwerk. Daardoor kan Netlify meestal niet direct naar een prive Tailscale-IP zoals `100.x.x.x`.

Dus dit werkt meestal niet:

```env
HERMES_URL=http://100.x.x.x:3001
```

Tenzij de caller zelf ook in jouw tailnet zit. Netlify zit daar standaard niet in.

## Aanbevolen setup voor nu

Gebruik Tailscale voor:

- veilig SSH'en naar de Hetzner-server
- beheer zonder steeds het publieke IP nodig te hebben
- later eventueel prive interne services

Laat productie voorlopig zo lopen:

```text
contentflow-mvp.html -> Netlify function -> Hermes public endpoint -> Hermes API key check
```

Dat is nog steeds beschermd doordat:

- de browser de Hermes API-key niet ziet
- Netlify de key server-side meestuurt
- Hermes requests zonder `x-hermes-key` weigert

## Optie A: Tailscale voor beheer

Op de Hetzner-server:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --ssh
tailscale ip -4
tailscale status
```

Daarna kun je vanaf je laptop via Tailscale SSH'en, bijvoorbeeld:

```bash
ssh root@<tailscale-ip>
```

Of, als Tailscale SSH goed staat:

```bash
tailscale ssh root@<machine-name>
```

## Optie B: Tailscale Funnel voor Netlify

Als je Hermes niet meer via het kale Hetzner-IP wilt bereiken, kun je Tailscale Funnel gebruiken. Funnel maakt een publieke HTTPS-route naar een service op je Tailscale-machine.

Let op: Funnel is publiek bereikbaar via internet, dus houd `HERMES_API_KEY` actief. Funnel vervangt de Hermes API-key niet.

Op de Hetzner-server:

```bash
tailscale serve --bg http://127.0.0.1:3001
tailscale funnel --bg 443
tailscale funnel status
```

Daarna krijg je meestal een URL zoals:

```text
https://jouw-machine.jouw-tailnet.ts.net
```

In Netlify zet je dan:

```env
HERMES_URL=https://jouw-machine.jouw-tailnet.ts.net
HERMES_API_KEY=dezelfde-key-als-op-Hetzner
```

## Optie C: volledig prive later

Wil je Hermes echt alleen prive bereikbaar maken, dan moeten we de server-side caller ook in Tailscale zetten.

Dat betekent meestal een architectuurwijziging:

```text
Frontend -> jouw eigen backend op Hetzner -> Hermes via localhost/Tailscale
```

Of:

```text
Frontend -> Netlify -> publieke proxy -> prive Hermes
```

Voor nu is dat zwaarder dan nodig. Eerst Tailscale voor beheer en eventueel Funnel voor nette HTTPS is de praktische stap.

## Server script

In deze repo staat een helper:

```bash
scripts/setup-hermes-tailscale.sh
```

Gebruik op de Hetzner-server:

```bash
cd /opt/hermes
curl -fsSL https://raw.githubusercontent.com/kajmaster/SEO/main/scripts/setup-hermes-tailscale.sh -o setup-hermes-tailscale.sh
chmod +x setup-hermes-tailscale.sh
./setup-hermes-tailscale.sh
```

## Snelle check

Na installatie:

```bash
tailscale status
tailscale ip -4
curl http://127.0.0.1:3001/health
```

Als Hermes lokaal gezond is, maar Netlify hem niet bereikt, kijk dan naar:

- staat `HERMES_URL` in Netlify goed?
- gebruikt Netlify een publieke URL of Funnel URL, niet per ongeluk een `100.x` prive-IP?
- staat `HERMES_API_KEY` aan beide kanten hetzelfde?
- draait PM2 nog?

```bash
pm2 status
pm2 logs hermes
```

## Bronnen

- [Tailscale Linux install](https://tailscale.com/docs/install/linux)
- [Tailscale SSH](https://tailscale.com/docs/features/tailscale-ssh)
- [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve)
- [Tailscale Funnel](https://tailscale.com/docs/features/tailscale-funnel)

