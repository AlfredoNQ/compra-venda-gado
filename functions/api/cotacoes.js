export async function onRequestGet() {
  try {

    const urlBoi =
      'https://www.noticiasagricolas.com.br/cotacoes/boi-gordo';

    const urlBezerro =
      'https://www.noticiasagricolas.com.br/cotacoes/boi-gordo/macho-nelore-bezerro-12-meses';


    async function buscar(url) {

      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!r.ok) {
        throw new Error('Erro ao consultar fonte');
      }

      return await r.text();
    }


    function numero(txt) {

      if (!txt) return null;

      return Number(
        txt
          .replace(/\./g, '')
          .replace(',', '.')
      );
    }


    function limpar(txt) {

      return String(txt || '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }


    function pegarBoi(html, nome) {

      const pos =
        html.indexOf(nome);

      if (pos === -1) return null;

      const trecho =
        limpar(
          html.substring(
            pos,
            pos + 1200
          )
        );

      const valores =
        trecho.match(
          /\d{3}[,.]\d{2}/g
        );

      if (!valores) return null;

      return numero(valores[0]);
    }


    function pegarReposicao(
      html,
      uf
    ) {

      const texto =
        limpar(html);

      const padrao =
        new RegExp(
          '\\b' + uf +
          '\\s+' +
          '(\\d{1,2}\\.\\d{3},\\d{2}|\\d{3,4},\\d{2})' +
          '\\s+' +
          '(\\d{1,2},\\d{2})',
          'i'
        );

      const m =
        texto.match(padrao);

      if (!m) return null;

      return {
        cabeca: numero(m[1]),
        kg: numero(m[2])
      };
    }


    function secaoGarrote(
      html,
      uf
    ) {

      const titulo =
        'Macho Nelore Reposição - Garrote';

      const ini =
        html.indexOf(titulo);

      if (ini === -1) return null;

      const trecho =
        html.substring(
          ini,
          ini + 9000
        );

      return pegarReposicao(
        trecho,
        uf
      );
    }


    const [
      htmlBoi,
      htmlBezerro
    ] = await Promise.all([
      buscar(urlBoi),
      buscar(urlBezerro)
    ]);


    const cotacoes = [

      {
        uf:'PA',
        regiao:'Marabá',
        avista:pegarBoi(
          htmlBoi,
          'PA Marabá'
        )
      },

      {
        uf:'PA',
        regiao:'Redenção',
        avista:pegarBoi(
          htmlBoi,
          'PA Redenção'
        )
      },

      {
        uf:'PA',
        regiao:'Paragominas',
        avista:pegarBoi(
          htmlBoi,
          'PA Paragominas'
        )
      },

      {
        uf:'TO',
        regiao:'Sul',
        avista:pegarBoi(
          htmlBoi,
          'TO Sul'
        )
      },

      {
        uf:'TO',
        regiao:'Norte',
        avista:pegarBoi(
          htmlBoi,
          'TO Norte'
        )
      },

      {
        uf:'MA',
        regiao:'Oeste',
        avista:pegarBoi(
          htmlBoi,
          'MA Oeste'
        )
      }

    ].filter(
      x => x.avista !== null
    );


    const reposicao = [

      {
        uf:'PA',
        bezerro:
          pegarReposicao(
            htmlBezerro,
            'PA'
          ),
        garrote:
          secaoGarrote(
            htmlBoi,
            'PA'
          )
      },

      {
        uf:'TO',
        bezerro:
          pegarReposicao(
            htmlBezerro,
            'TO'
          ),
        garrote:
          secaoGarrote(
            htmlBoi,
            'TO'
          )
      },

      {
        uf:'MA',
        bezerro:
          pegarReposicao(
            htmlBezerro,
            'MA'
          ),
        garrote:
          secaoGarrote(
            htmlBoi,
            'MA'
          )
      }

    ];


    return Response.json({

      ok:true,

      fonte:
        'Scot Consultoria via Notícias Agrícolas',

      dataReferencia:
        new Date()
          .toLocaleDateString('pt-BR'),

      cotacoes,

      reposicao

    }, {

      headers:{
        'Cache-Control':
          'public, max-age=1800'
      }

    });


  } catch (erro) {

    return Response.json({

      ok:false,

      error:
        erro.message

    }, {
      status:500
    });

  }
}
