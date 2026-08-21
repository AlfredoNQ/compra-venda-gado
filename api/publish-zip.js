const AdmZip = require("adm-zip");

const TOKEN = process.env.GITHUB_TOKEN || "";
const REPO =
  process.env.GITHUB_REPO ||
  "AlfredoNQ/compra-venda-gado";

const SECRET =
  process.env.BRIDGE_SECRET || "";

async function gh(path, method = "GET", body = null) {
  const r = await fetch(
    `https://api.github.com/repos/${REPO}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "vercel-gado-bridge"
      },
      body: body ? JSON.stringify(body) : undefined
    }
  );

  const txt = await r.text();

  let data = {};

  try {
    data = txt ? JSON.parse(txt) : {};
  } catch {
    data = { message: txt };
  }

  if (!r.ok) {
    throw new Error(
      `GitHub ${r.status}: ${data.message || txt}`
    );
  }

  return data;
}

async function putFile(
  branch,
  path,
  buf,
  message
) {
  let sha;

  try {
    const cur = await gh(
      `/contents/${
        path
          .split("/")
          .map(encodeURIComponent)
          .join("/")
      }?ref=${encodeURIComponent(branch)}`
    );

    sha = cur.sha;

  } catch (e) {

    if (!String(e.message).includes("404")) {
      throw e;
    }
  }

  const body = {
    message,
    content: buf.toString("base64"),
    branch
  };

  if (sha) {
    body.sha = sha;
  }

  return gh(
    `/contents/${
      path
        .split("/")
        .map(encodeURIComponent)
        .join("/")
    }`,
    "PUT",
    body
  );
}

module.exports = async (req, res) => {

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "Vercel Bridge GitHub"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método não permitido"
    });
  }

  if (
    !SECRET ||
    req.headers["x-bridge-secret"] !== SECRET
  ) {
    return res.status(401).json({
      ok: false,
      error: "Senha da ponte incorreta"
    });
  }

  if (!TOKEN) {
    return res.status(500).json({
      ok: false,
      error: "GITHUB_TOKEN não configurado"
    });
  }

  try {

    const {
      branch = "main",
      zip_b64
    } = req.body || {};

    if (
      !["main", "android-apk"].includes(branch)
    ) {
      throw new Error("Branch inválida");
    }

    if (!zip_b64) {
      throw new Error("ZIP não enviado");
    }

    const raw =
      Buffer.from(zip_b64, "base64");

    if (raw.length > 20 * 1024 * 1024) {
      throw new Error(
        "ZIP maior que 20 MB"
      );
    }

    const zip = new AdmZip(raw);

    const entries =
      zip.getEntries().filter(e => {

        const n =
          e.entryName
            .replace(/\\/g, "/")
            .replace(/^\/+/, "");

        return (
          !e.isDirectory &&
          !n.startsWith("__MACOSX/") &&
          !n.split("/").includes("..")
        );
      });

    if (!entries.length) {
      throw new Error("ZIP vazio");
    }

    let last = "";

    for (
      let i = 0;
      i < entries.length;
      i++
    ) {

      const e = entries[i];

      const path =
        e.entryName
          .replace(/\\/g, "/")
          .replace(/^\/+/, "");

      const out =
        await putFile(
          branch,
          path,
          e.getData(),
          `Publica via ponte Vercel (${i + 1}/${entries.length}): ${path}`
        );

      last =
        out.commit?.sha || last;
    }

    return res.status(200).json({
      ok: true,
      files: entries.length,
      commit: last,
      branch
    });

  } catch (e) {

    return res.status(500).json({
      ok: false,
      error: String(
        e.message || e
      )
    });
  }
};
