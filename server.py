import os
import json
import base64
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("PORT", "10000"))
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "AlfredoNQ/compra-venda-gado")
BRIDGE_SECRET = os.environ.get("BRIDGE_SECRET", "")

HTML = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ponte Render</title>
<style>
body{
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
  background:#eef3ef;
  margin:0;
  padding:20px;
  color:#183526
}
.card{
  max-width:650px;
  margin:30px auto;
  background:#fff;
  padding:24px;
  border-radius:16px;
  box-shadow:0 10px 35px #0001
}
h1{color:#17633f;margin-top:0}
input,textarea,select,button{
  box-sizing:border-box;
  width:100%;
  padding:12px;
  margin:7px 0;
  border:1px solid #ccd8cf;
  border-radius:9px;
  font:inherit
}
button{
  background:#17633f;
  color:white;
  font-weight:800;
  border:0;
  cursor:pointer
}
.ok{color:#17633f;font-weight:700;margin-top:12px}
.err{color:#b42318;font-weight:700;margin-top:12px}
.small{font-size:13px;color:#667}
</style>
</head>
<body>
<div class="card">
  <h1>Compra e Venda de Gado</h1>
  <p>Ponte reserva Render → GitHub</p>

  <label>Senha da ponte</label>
  <input id="secret" type="password">

  <label>Branch</label>
  <select id="branch">
    <option value="main">main</option>
    <option value="android-apk">android-apk</option>
  </select>

  <label>Caminho do arquivo no GitHub</label>
  <input id="path" placeholder="ex.: render-bridge-test.txt">

  <label>Conteúdo do arquivo</label>
  <textarea id="content" rows="10"></textarea>

  <button onclick="pub()">Publicar no GitHub</button>

  <div id="status"></div>
  <p class="small">Use esta tela apenas para arquivos e atualizações do projeto.</p>
</div>

<script>
async function pub(){
  const status = document.getElementById('status');
  status.textContent = 'Publicando...';
  status.className = '';

  try{
    const r = await fetch('/publish',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Bridge-Secret':document.getElementById('secret').value
      },
      body:JSON.stringify({
        path:document.getElementById('path').value,
        content:document.getElementById('content').value,
        branch:document.getElementById('branch').value,
        message:'Atualização via ponte Render'
      })
    });

    const j = await r.json();

    if(!r.ok || !j.ok){
      throw new Error(j.error || 'Falha na publicação');
    }

    status.textContent = 'Publicado com sucesso. Commit: ' + j.commit;
    status.className = 'ok';

  }catch(e){
    status.textContent = 'Erro: ' + e.message;
    status.className = 'err';
  }
}
</script>
</body>
</html>
"""

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

    req = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method=method
    )

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
            raw = HTML.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        elif self.path == "/health":
            self.send_json(200, {
                "ok": True,
                "service": "Render GitHub Bridge"
            })

        else:
            self.send_json(404, {
                "ok": False,
                "error": "não encontrado"
            })

    def do_POST(self):

        if self.path != "/publish":
            return self.send_json(404, {
                "ok": False,
                "error": "não encontrado"
            })

        secret = self.headers.get("X-Bridge-Secret", "")

        if not BRIDGE_SECRET or secret != BRIDGE_SECRET:
            return self.send_json(401, {
                "ok": False,
                "error": "Senha da ponte incorreta"
            })

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(
                self.rfile.read(length).decode("utf-8")
            )

            path = payload.get("path")
            content = payload.get("content")
            branch = payload.get("branch", "main")
            message = payload.get(
                "message",
                "Atualização via Render"
            )

            if not path or content is None:
                return self.send_json(400, {
                    "ok": False,
                    "error": "Informe caminho e conteúdo"
                })

            current_sha = None

            try:
                current = github_request(
                    f"/contents/{path}?ref={branch}"
                )
                current_sha = current.get("sha")
            except Exception:
                pass

            body = {
                "message": message,
                "content": base64.b64encode(
                    content.encode("utf-8")
                ).decode("utf-8"),
                "branch": branch,
            }

            if current_sha:
                body["sha"] = current_sha

            result = github_request(
                f"/contents/{path}",
                "PUT",
                body
            )

            self.send_json(200, {
                "ok": True,
                "commit": result["commit"]["sha"],
                "path": path,
                "branch": branch,
            })

        except Exception as e:
            self.send_json(500, {
                "ok": False,
                "error": str(e)
            })

HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
