import os,json,base64,urllib.request,urllib.error,zipfile,io
from http.server import BaseHTTPRequestHandler,HTTPServer
from urllib.parse import quote

PORT=int(os.environ.get("PORT","10000"))
TOKEN=os.environ.get("GITHUB_TOKEN","")
REPO=os.environ.get("GITHUB_REPO","AlfredoNQ/compra-venda-gado")
SECRET=os.environ.get("BRIDGE_SECRET","")

HTML="""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ponte Render</title><style>body{font-family:system-ui;background:#eef3ef;margin:0;padding:18px;color:#183526}.card{max-width:680px;margin:24px auto;background:#fff;padding:24px;border-radius:16px;box-shadow:0 10px 35px #0001}h1{color:#17633f;margin-top:0}input,select,button{box-sizing:border-box;width:100%;padding:12px;margin:8px 0;border:1px solid #ccd8cf;border-radius:9px;font:inherit}button{background:#17633f;color:#fff;font-weight:800;border:0}.ok{color:#17633f;font-weight:800}.err{color:#b42318;font-weight:800}</style></head>
<body><div class="card"><h1>Compra e Venda de Gado</h1><p><b>Ponte Render → GitHub</b></p>
<label>Senha da ponte</label><input id="s" type="password">
<label>Branch</label><select id="b"><option>main</option><option>android-apk</option></select>
<label>Arquivo ZIP</label><input id="z" type="file" accept=".zip,application/zip">
<button onclick="pub()">Publicar ZIP no GitHub</button><div id="st"></div></div>
<script>
async function pub(){let st=document.getElementById('st'),f=z.files[0];if(!f){st.textContent='Escolha o ZIP.';st.className='err';return}
st.textContent='Lendo ZIP...';st.className='';let a=new Uint8Array(await f.arrayBuffer()),chunk=0x8000,s64='';
for(let i=0;i<a.length;i+=chunk)s64+=String.fromCharCode.apply(null,a.subarray(i,Math.min(i+chunk,a.length)));
let zip_b64=btoa(s64);st.textContent='Publicando...';
try{let r=await fetch('/publish-zip',{method:'POST',headers:{'Content-Type':'application/json','X-Bridge-Secret':s.value},
body:JSON.stringify({branch:b.value,zip_b64:zip_b64})});let j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'Falha');
st.textContent='Publicado com sucesso: '+j.files+' arquivos. Commit '+j.commit;st.className='ok'}
catch(e){st.textContent='Erro: '+e.message;st.className='err'}}
</script></body></html>"""

def gh(path,method="GET",body=None):
    headers={"Authorization":f"Bearer {TOKEN}","Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json","User-Agent":"render-gado-bridge"}
    req=urllib.request.Request(f"https://api.github.com/repos/{REPO}{path}",data=None if body is None else json.dumps(body).encode(),headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=60) as r:return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:raise Exception(f"GitHub {e.code}: {e.read().decode(errors='ignore')[:250]}")

def put(branch,path,data,msg):
    sha=None
    try:sha=gh(f"/contents/{quote(path)}?ref={quote(branch)}").get("sha")
    except:pass
    body={"message":msg,"content":base64.b64encode(data).decode(),"branch":branch}
    if sha:body["sha"]=sha
    return gh(f"/contents/{quote(path)}","PUT",body)

class H(BaseHTTPRequestHandler):
    def json(self,c,o):
        x=json.dumps(o,ensure_ascii=False).encode();self.send_response(c);self.send_header("Content-Type","application/json; charset=utf-8");self.send_header("Content-Length",str(len(x)));self.end_headers();self.wfile.write(x)
    def do_HEAD(self):
        self.send_response(200);self.end_headers()
    def do_GET(self):
        if self.path.split("?",1)[0]=="/":
            x=HTML.encode();self.send_response(200);self.send_header("Content-Type","text/html; charset=utf-8");self.send_header("Content-Length",str(len(x)));self.end_headers();self.wfile.write(x)
        elif self.path.split("?",1)[0]=="/health":self.json(200,{"ok":True,"service":"Render ZIP Bridge"})
        else:self.json(404,{"ok":False,"error":"não encontrado"})
    def do_POST(self):
        if self.path.split("?",1)[0]!="/publish-zip":return self.json(404,{"ok":False,"error":"não encontrado"})
        if not SECRET or self.headers.get("X-Bridge-Secret","")!=SECRET:return self.json(401,{"ok":False,"error":"Senha da ponte incorreta"})
        try:
            n=int(self.headers.get("Content-Length","0"))
            if n>30*1024*1024:return self.json(413,{"ok":False,"error":"Envio muito grande"})
            p=json.loads(self.rfile.read(n).decode());branch=p.get("branch","main");raw=base64.b64decode(p["zip_b64"])
            zf=zipfile.ZipFile(io.BytesIO(raw));names=[]
            for n in zf.namelist():
                clean=n.replace("\\","/").lstrip("/")
                if clean.endswith("/") or clean.startswith("__MACOSX/") or ".." in clean.split("/"):continue
                names.append(clean)
            if not names:raise Exception("ZIP vazio")
            last=""
            for i,n in enumerate(names,1):
                r=put(branch,n,zf.read(n),f"Publica v76 via Render ({i}/{len(names)}): {n}");last=r["commit"]["sha"]
            self.json(200,{"ok":True,"files":len(names),"commit":last,"branch":branch})
        except Exception as e:self.json(500,{"ok":False,"error":str(e)})

HTTPServer(("0.0.0.0",PORT),H).serve_forever()
