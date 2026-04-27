#!/usr/bin/env python3
"""
Simple CORS proxy for SEO Suite Kanban prototype.
Forwards requests from localhost to production.turnone.cloud
so the browser doesn't block them.

Usage:
  python3 scripts/cors-proxy.py

Then in the Kanban prototype, change:
  Base URL → http://localhost:8787
  (keep the path and token the same)
"""

import http.server
import urllib.request
import urllib.parse
import json
import ssl

N8N_BASE = "https://production.turnone.cloud"
PORT = 8787

class CORSProxyHandler(http.server.BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        print(f"[proxy] {self.address_string()} - {fmt % args}")

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_POST(self):
        """Forward POST to N8N"""
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b""

        target_url = N8N_BASE + self.path
        print(f"[proxy] Forwarding to: {target_url}")
        print(f"[proxy] Body: {body.decode()[:200]}")

        try:
            ctx = ssl.create_default_context()
            req = urllib.request.Request(
                target_url,
                data=body,
                method="POST",
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                status = resp.status
                response_body = resp.read()

            self.send_response(status)
            self.send_cors_headers()
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(response_body)
            print(f"[proxy] ✅ N8N responded {status}: {response_body[:80]}")

        except urllib.error.HTTPError as e:
            err_body = e.read()
            self.send_response(e.code)
            self.send_cors_headers()
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(err_body)
            print(f"[proxy] ❌ N8N error {e.code}: {err_body[:80]}")

        except Exception as e:
            msg = str(e).encode()
            self.send_response(502)
            self.send_cors_headers()
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(msg)
            print(f"[proxy] ❌ Proxy error: {e}")

    def do_GET(self):
        self.send_response(200)
        self.send_cors_headers()
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"SEO Suite CORS Proxy is running. Use POST to forward to N8N.")


if __name__ == "__main__":
    server = http.server.HTTPServer(("localhost", PORT), CORSProxyHandler)
    print(f"""
╔══════════════════════════════════════════════════════════╗
║   SEO Suite CORS Proxy — running on localhost:{PORT}     ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  In the Kanban prototype:                                ║
║  • Click "Webhook" in the top nav                        ║
║  • Change Base URL to:  http://localhost:{PORT}          ║
║  • Keep path + token the same                            ║
║                                                          ║
║  Press Ctrl+C to stop the proxy                          ║
╚══════════════════════════════════════════════════════════╝
Forwarding to: {N8N_BASE}
""")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nProxy stopped.")
