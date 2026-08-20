import os
import json
import base64
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("PORT", "10000"))
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "AlfredoNQ/compra-venda-gado")
BRIDGE_SECRET = os.environ.get("BRIDGE_SECRET", "")

def github_request(path, method="GET", body=None):
    url = f"https://api.github.com/repos/{GITHUB_REPO}{path}"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "compra-venda-gado-render-bridge",
    }
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

class Handler(BaseHTTPRequestHandler):
    def send_json(self, code, payload):
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/":
            self.send_json(200, {"ok": True, "service": "Render GitHub Bridge"})
        else:
            self.send_json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if self.path != "/publish":
            return self.send_json(404, {"ok": False, "error": "not found"})

        secret = self.headers.get("X-Bridge-Secret", "")
        if not BRIDGE_SECRET or secret != BRIDGE_SECRET:
            return self.send_json(401, {"ok": False, "error": "unauthorized"})

        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length).decode("utf-8"))

        path = payload.get("path")
        content = payload.get("content")
        branch = payload.get("branch", "main")
        message = payload.get("message", "Atualização via Render")

        if not path or content is None:
            return self.send_json(400, {"ok": False, "error": "path/content required"})

        current_sha = None
        try:
            current = github_request(f"/contents/{path}?ref={branch}")
            current_sha = current.get("sha")
        except Exception:
            pass

        body = {
            "message": message,
            "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
            "branch": branch,
        }
        if current_sha:
            body["sha"] = current_sha

        try:
            result = github_request(f"/contents/{path}", "PUT", body)
            self.send_json(200, {
                "ok": True,
                "commit": result["commit"]["sha"],
                "path": path,
                "branch": branch,
            })
        except Exception as e:
            self.send_json(500, {"ok": False, "error": str(e)})

HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
