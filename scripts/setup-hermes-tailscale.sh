#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run dit script als root op de Hermes/Hetzner-server."
  echo "Voorbeeld: sudo ./setup-hermes-tailscale.sh"
  exit 1
fi

echo "== Hermes Tailscale setup =="
echo "Dit installeert Tailscale en start de login-flow voor deze server."
echo

if ! command -v tailscale >/dev/null 2>&1; then
  echo "Tailscale installeren..."
  curl -fsSL https://tailscale.com/install.sh | sh
else
  echo "Tailscale is al geinstalleerd."
fi

echo
echo "Tailscale starten met SSH-ondersteuning..."
echo "Als er een login-link verschijnt, open die link in je browser en keur de server goed."
tailscale up --ssh

echo
echo "Tailscale status:"
tailscale status || true

echo
echo "Tailscale IPv4:"
tailscale ip -4 || true

echo
echo "Hermes lokale health check:"
if curl -fsS http://127.0.0.1:3001/health; then
  echo
  echo "Hermes draait lokaal goed."
else
  echo
  echo "Hermes health check faalde. Controleer: pm2 status && pm2 logs hermes"
fi

cat <<'NEXT_STEPS'

Volgende stap:

1. Gebruik Tailscale voor veilige beheer-SSH:
   ssh root@<tailscale-ip>

2. Laat Netlify NIET zomaar naar http://100.x.x.x:3001 wijzen.
   Netlify zit standaard niet in jouw tailnet.

3. Wil je Hermes via Tailscale Funnel aan Netlify koppelen, draai dan apart:
   tailscale serve --bg http://127.0.0.1:3001
   tailscale funnel --bg 443
   tailscale funnel status

   Zet daarna de Funnel HTTPS-url als HERMES_URL in Netlify.

NEXT_STEPS
