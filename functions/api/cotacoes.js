export async function onRequestGet() {
  try {
    const url = 'https://www.noticiasagricolas.com.br/cotacoes/boi-gordo';

    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!resposta.ok) {
      throw new Error('Erro ao consultar fonte');
    }

    const html = await resposta.text();

    function pegar(nome) {
      const pos = html.indexOf(nome);
      if (pos === -1) return null;

      const trecho = html.substring(pos, pos + 800);

      const valores = [...trecho.matchAll(/(\d{3}[,.]\d{2})/g)]
        .map(x => Number(x[1].replace(',', '.')));

      return valores.length ? valores[0] : null;
    }

    const dados = [
      { estado: 'PA', regiao: 'Marabá', valor: pegar('PA Marabá') },
      { estado: 'PA', regiao: 'Redenção', valor: pegar('PA Redenção') },
      { estado: 'PA', regiao: 'Paragominas', valor: pegar('PA Paragominas') },
      { estado: 'TO', regiao: 'Sul', valor: pegar('TO Sul') },
      { estado: 'TO', regiao: 'Norte', valor
