export async function onRequestGet() {
  try {
    const url = 'https://www.noticiasagricolas.com.br/cotacoes/boi-gordo';

    const resposta = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!resposta.ok) throw new Error('Erro ao consultar fonte');

    const html = await resposta.text();

    function pegar(nome) {
      const pos = html.indexOf(nome);
      if (pos === -1) return null;

      const trecho = html.substring(pos, pos + 1200);
      const valores = [...trecho.matchAll(/(\d{3}[,.]\d{2})/g)]
        .map(x => Number(x[1].replace(',', '.')));

      return valores.length ? valores[0] : null;
    }

    const cotacoes = [
      { uf:'PA', regiao:'Marabá', avista:pegar('PA Marabá') },
      { uf:'PA', regiao:'Redenção', avista:pegar('PA Redenção') },
      { uf:'PA', regiao:'Paragominas', avista:pegar('PA Paragominas') },
      { uf:'TO', regiao:'Sul', avista:pegar('TO Sul') },
      { uf:'TO', regiao:'Norte', avista:pegar('TO Norte') },
      { uf:'MA', regiao:'Oeste', avista:pegar('MA Oeste') }
    ].filter(x => x.avista !== null);

    return Response.json({
      ok: true,
      fonte: 'Scot Consultoria via Notícias Agrícolas',
      dataReferencia: new Date().toLocaleDateString('pt-BR'),
      cotacoes
    }, {
      headers: { 'Cache-Control':'public, max-age=1800' }
    });

  } catch (erro) {
    return Response.json({
      ok:false,
      error:erro.message
    }, { status:500 });
  }
}
