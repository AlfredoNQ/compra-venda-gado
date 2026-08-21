// Vercel Serverless Function — Scot/Notícias Agrícolas
// v83: restaura /api/cotacoes após a rota ter sido removida do main.

function numeroBR(txt) {
  if (txt == null) return null;
  const s = String(txt).trim().replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function limparHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function linhaEstado(texto, uf) {
  // R$ / cabeça, R$ / kg e troca
  const re = new RegExp(
    '(?:^|\\s)' + uf + '\\s+' +
    '(\\d{1,2}(?:\\.\\d{3})*,\\d{2}|\\d{3,4},\\d{2})\\s+' +
    '(\\d{1,2},\\d{2})\\s+' +
    '(\\d{1,2},\\d{2})(?:\\s|$)',
    'i'
  );
  const m = texto.match(re);
  if (!m) return null;
  return {
    cabeca: numeroBR(m[1]),
    kg: numeroBR(m[2]),
    troca: numeroBR(m[3])
  };
}

function trechoSecao(texto, titulo, proximosTitulos) {
  const ini = texto.indexOf(titulo);
  if (ini < 0) return '';
  let fim = texto.length;
  for (const prox of proximosTitulos || []) {
    const p = texto.indexOf(prox, ini + titulo.length);
    if (p >= 0 && p < fim) fim = p;
  }
  return texto.slice(ini, fim);
}

function pegarAvista(texto, nome) {
  // Scot Mercado Físico: nome + à vista + prazo + vaca
  const pos = texto.indexOf(nome);
  if (pos < 0) return null;
  const trecho = texto.slice(pos, pos + 260);
  const m = trecho.match(/(\d{2,3},\d{2})/);
  return m ? numeroBR(m[1]) : null;
}

function dataAtualizacao(secao) {
  const m = secao.match(/Atualizado em:\s*(\d{2}\/\d{2}\/\d{4})/i)
        || secao.match(/Fechamento:\s*(\d{2}\/\d{2}\/\d{4})/i);
  return m ? m[1] : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const fontes = [
      'https://beta.noticiasagricolas.com.br/cotacoes/boi-gordo',
      'https://www.noticiasagricolas.com.br/cotacoes/boi-gordo'
    ];

    let html = '';
    let fonteUsada = '';

    for (const url of fontes) {
      try {
        const r = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7'
          },
          signal: AbortSignal.timeout(12000)
        });
        if (r.ok) {
          const t = await r.text();
          if (t && t.length > 5000) {
            html = t;
            fonteUsada = url;
            break;
          }
        }
      } catch (_) {}
    }

    if (!html) throw new Error('Fonte Scot indisponível no momento');

    const txt = limparHtml(html);

    const titBoi = 'Macho Nelore Reposição - Boi Magro';
    const titGar = 'Macho Nelore Reposição - Garrote';
    const titBez = 'Macho Nelore Reposição - Bezerro';
    const titDes = 'Macho Nelore Reposição - Desmama';

    const secBoi = trechoSecao(txt, titBoi, [titGar, titBez, titDes]);
    const secGar = trechoSecao(txt, titGar, [titBez, titDes]);
    const secBez = trechoSecao(txt, titBez, [titDes]);
    const secDes = trechoSecao(txt, titDes, ['Fêmea Nelore', 'Femea Nelore', 'Reposição Nelore - Fêmea']);

    const estados = ['PA','TO','MA'];
    const reposicao = estados.map(uf => ({
      uf,
      boiMagro: linhaEstado(secBoi, uf),
      garrote: linhaEstado(secGar, uf),
      bezerro: linhaEstado(secBez, uf),
      desmama: linhaEstado(secDes, uf)
    }));

    // Mercado físico Scot — boi gordo à vista.
    const fisicoIni = txt.indexOf('Mercado Físico - Scot Consultoria');
    const fisicoFim = txt.indexOf(titBoi, Math.max(0, fisicoIni));
    const fisico = fisicoIni >= 0
      ? txt.slice(fisicoIni, fisicoFim > fisicoIni ? fisicoFim : fisicoIni + 12000)
      : txt;

    const defs = [
      ['PA','Marabá','PA Marabá'],
      ['PA','Redenção','PA Redenção'],
      ['PA','Paragominas','PA Paragominas'],
      ['TO','Sul','TO Sul'],
      ['TO','Norte','TO Norte'],
      ['MA','Oeste','MA Oeste']
    ];

    const cotacoes = defs.map(([uf, regiao, busca]) => ({
      uf, regiao, avista: pegarAvista(fisico, busca)
    })).filter(x => Number.isFinite(x.avista));

    // Data mais recente encontrada nas seções Scot.
    const datas = [secBoi,secGar,secBez,secDes]
      .map(dataAtualizacao)
      .filter(Boolean);

    const dataReferencia = datas[0] ||
      new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo'
      }).format(new Date());

    if (!cotacoes.length && !reposicao.some(r =>
      r.boiMagro || r.garrote || r.bezerro || r.desmama
    )) {
      throw new Error('A fonte respondeu, mas o formato da cotação mudou');
    }

    // O painel já sabe lidar com ausência do dia anterior.
    const indicadorScotAtual = {
      data: dataReferencia,
      cotacoes
    };

    return res.status(200).json({
      ok: true,
      fonte: 'Scot Consultoria via Notícias Agrícolas',
      fonteUrl: fonteUsada,
      dataReferencia,
      cotacoes,
      reposicao,
      indicadorScotAtual,
      indicadorScotOntem: {
        data: null,
        cotacoes: []
      }
    });

  } catch (e) {
    return res.status(502).json({
      ok: false,
      error: e && e.message ? e.message : 'Falha ao consultar cotação'
    });
  }
};
