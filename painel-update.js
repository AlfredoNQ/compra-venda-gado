/*
  Compra e Venda de Gado — Painel
  - Preço médio por kg
  - Preço médio por arroba
  - Cotação boi gordo PA, TO e MA
  - Reposição: bezerro e garrote
  - Pará em destaque
*/

(function () {

  function brl(v) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(v) || 0);
  }


  function avgArroba(tipo, list) {

    let valor = 0;
    let qtd = 0;

    (list || []).forEach(function(r) {

      const c = calc(r);

      if (!c.at) return;

      if (
        tipo === 'buy' &&
        c.qc > 0 &&
        c.pc > 0
      ) {

        valor +=
          (c.pc / c.at) * c.qc;

        qtd += c.qc;
      }

      if (
        tipo === 'sell' &&
        c.sold > 0 &&
        c.pv > 0
      ) {

        valor +=
          (c.pv / c.at) * c.sold;

        qtd += c.sold;
      }

    });

    return qtd
      ? valor / qtd
      : 0;
  }


  /* =========================
     INDICADORES
  ========================= */

  renderKpis = function () {

    const list = panelRecords();
    const z = totals(list);


    $('kpis').innerHTML = [

      [
        'Cabeças compradas',
        num.format(z.qc)
      ],

      [
        'Cabeças vendidas',
        num.format(z.qv)
      ],

      [
        'Cabeças em estoque',
        num.format(z.est)
      ],

      [
        'Capital em estoque',
        money.format(z.cap)
      ],

      [
        'Total compras',
        money.format(z.comp)
      ],

      [
        'Total vendas',
        money.format(z.vend)
      ],

      [
        'Custos lançados',
        money.format(z.cost)
      ],

      [
        'Lucro realizado',
        money.format(z.luc)
      ],

      [
        'Preço médio compra/kg',
        money.format(
          avgKg('buy', list)
        )
      ],

      [
        'Preço médio venda/kg',
        money.format(
          avgKg('sell', list)
        )
      ],

      [
        'Preço médio @ compra',
        money.format(
          avgArroba('buy', list)
        )
      ],

      [
        'Preço médio @ venda',
        money.format(
          avgArroba('sell', list)
        )
      ]

    ].map(function(x) {

      return `
        <div class="kpi">
          <span>${x[0]}</span>
          <b>${x[1]}</b>
        </div>
      `;

    }).join('');


    const all =
      totals(records);


    $('stockKpis').innerHTML = [

      [
        'Cabeças em estoque',
        num.format(all.est)
      ],

      [
        'Capital em estoque',
        money.format(all.cap)
      ],

      [
        'Lotes abertos',
        records.filter(
          function(r) {
            return calc(r).saldo > 0;
          }
        ).length
      ],

      [
        'Custo médio/cab estoque',

        all.est
          ? money.format(
              all.cap / all.est
            )
          : money.format(0)
      ]

    ].map(function(x) {

      return `
        <div class="kpi">
          <span>${x[0]}</span>
          <b>${x[1]}</b>
        </div>
      `;

    }).join('');

  };


  /* =========================
     ESTILO DAS COTAÇÕES
  ========================= */

  function addStyles() {

    if (
      document.getElementById(
        'quoteStyles'
      )
    ) return;


    const st =
      document.createElement('style');


    st.id =
      'quoteStyles';


    st.textContent = `

      .quote-panel {
        margin: 0 0 10px;
      }


      .quote-panel .ph {
        padding: 7px 12px;
      }


      .quote-panel .ph h2 {
        font-size: 14px;
        margin: 0;
      }


      .quote-panel .body {
        padding: 8px 12px;
      }


      .quote-grid {

        display: grid;

        grid-template-columns:
          repeat(
            3,
            minmax(0,1fr)
          );

        gap: 8px;

        align-items: stretch;

      }


      .quote-state {

        min-width: 0;

        border:
          1px solid
          var(--line);

        border-radius:
          9px;

        padding:
          7px 10px;

        background:
          #fff;

      }


      .quote-state.destaque {

        border:
          1.5px solid
          var(--g2);

        background:
          #f3f9f5;

      }


      .quote-state h3 {

        margin:
          0 0 3px;

        font-size:
          13px;

        line-height:
          1.2;

        color:
          #173d27;

      }


      .quote-state.destaque h3:after {

        content:
          " • DESTAQUE";

        font-size:
          8px;

        background:
          var(--g2);

        color:
          white;

        padding:
          2px 5px;

        border-radius:
          999px;

        margin-left:
          5px;

        vertical-align:
          1px;

      }


      .quote-row {

        display:
          grid;

        grid-template-columns:
          minmax(0,1fr) auto;

        gap:
          8px;

        align-items:
          center;

        padding:
          4px 0;

        border-bottom:
          1px solid #edf1ed;

        font-size:
          11px;

      }


      .quote-row:last-child {
        border-bottom: 0;
      }


      .quote-row span {

        min-width: 0;

        white-space:
          nowrap;

        overflow:
          hidden;

        text-overflow:
          ellipsis;

        color:
          #5f6b62;

      }


      .quote-row b {

        white-space:
          nowrap;

        font-size:
          12px;

        color:
          #173d27;

      }


      .quote-meta {

        font-size:
          10px;

        color:
          var(--muted);

        line-height:
          1.3;

      }


      .quote-footer {
        margin-top: 6px;
      }


      .repo-title {

        margin-top:
          10px;

        margin-bottom:
          5px;

        font-size:
          12px;

        font-weight:
          850;

        color:
          #173d27;

      }


      .quote-error {

        padding:
          8px;

        background:
          #fff3d4;

        color:
          #815500;

        border-radius:
          8px;

        font-size:
          11px;

      }


      @media (max-width:900px) {

        .quote-grid {

          grid-template-columns:
            repeat(
              3,
              minmax(0,1fr)
            );

        }


        .quote-state {
          padding: 6px;
        }


        .quote-row {

          gap: 4px;

          font-size:
            10px;

        }


        .quote-row b {
          font-size: 11px;
        }

      }


      @media (max-width:650px) {

        .quote-grid {

          grid-template-columns:
            1fr;

        }

      }

    `;


    document.head.appendChild(st);

  }


  /* =========================
     CRIAR QUADRO
  ========================= */

  function ensureQuotePanel() {

    if (
      document.getElementById(
        'cotacoesPanel'
      )
    ) return;


    const painel =
      document.getElementById(
        'painel'
      );


    if (!painel) return;


    const grid =
      painel.querySelector(
        '.grid2'
      );


    if (!grid) return;


    const box =
      document.createElement(
        'div'
      );


    box.id =
      'cotacoesPanel';


    box.className =
      'panel quote-panel';


    box.innerHTML = `

      <div class="ph">

        <h2>
          Cotação de mercado
        </h2>

        <button
          class="mini"
          type="button"
          id="refreshCotacoes">
          Atualizar
        </button>

      </div>


      <div class="body">

        <div
          id="cotacoesConteudo"
          class="quote-meta">

          Carregando cotações...

        </div>

      </div>

    `;


    painel.insertBefore(
      box,
      grid
    );


    const btn =
      document.getElementById(
        'refreshCotacoes'
      );


    if (btn) {

      btn.onclick =
        loadCotacoes;

    }

  }


  /* =========================
     BOI GORDO
  ========================= */

  function stateBlock(
    title,
    rows,
    destaque
  ) {

    if (
      !rows ||
      !rows.length
    ) {

      return `

        <div
          class="
            quote-state
            ${destaque ? 'destaque' : ''}
          ">

          <h3>
            ${title}
          </h3>

          <div class="quote-row">

            <span>
              Sem cotação
            </span>

            <b>—</b>

          </div>

        </div>

      `;

    }


    return `

      <div
        class="
          quote-state
          ${destaque ? 'destaque' : ''}
        ">

        <h3>
          ${title}
        </h3>


        ${rows.map(function(r) {

          return `

            <div class="quote-row">

              <span>
                ${r.regiao}
              </span>

              <b>
                ${brl(r.avista)}/@
              </b>

            </div>

          `;

        }).join('')}

      </div>

    `;

  }


  /* =========================
     REPOSIÇÃO
  ========================= */

  function repBlock(
    title,
    item,
    destaque
  ) {

    item =
      item || {};


    function valorReposicao(x) {

      if (!x) return '—';


      const cab =
        x.cabeca != null
          ? brl(x.cabeca)
          : '—';


      const kg =
        x.kg != null
          ? brl(x.kg) + '/kg'
          : '—';


      return (
        cab +
        ' • ' +
        kg
      );

    }


    return `

      <div
        class="
          quote-state
          ${destaque ? 'destaque' : ''}
        ">

        <h3>
          ${title}
        </h3>


        <div class="quote-row">

          <span>
            Bezerro
          </span>

          <b>
            ${valorReposicao(
              item.bezerro
            )}
          </b>

        </div>


        <div class="quote-row">

          <span>
            Garrote
          </span>

          <b>
            ${valorReposicao(
              item.garrote
            )}
          </b>

        </div>

      </div>

    `;

  }


  /* =========================
     CARREGAR COTAÇÕES
  ========================= */

  async function loadCotacoes() {

    const el =
      document.getElementById(
        'cotacoesConteudo'
      );


    if (!el) return;


    el.innerHTML =
      'Atualizando cotações...';


    try {


      const res =
        await fetch(
          '/api/cotacoes',
          {
            cache:
              'no-store'
          }
        );


      if (!res.ok) {

        throw new Error(
          'HTTP ' +
          res.status
        );

      }


      const data =
        await res.json();


      if (
        !data.ok ||
        !Array.isArray(
          data.cotacoes
        )
      ) {

        throw new Error(
          data.error ||
          'Resposta inválida'
        );

      }


      const pa =
        data.cotacoes.filter(
          function(x) {
            return x.uf === 'PA';
          }
        );


      const to =
        data.cotacoes.filter(
          function(x) {
            return x.uf === 'TO';
          }
        );


      const ma =
        data.cotacoes.filter(
          function(x) {
            return x.uf === 'MA';
          }
        );


      const reposicao =
        Array.isArray(
          data.reposicao
        )
          ? data.reposicao
          : [];


      const repPA =
        reposicao.find(
          function(x) {
            return x.uf === 'PA';
          }
        ) || {};


      const repTO =
        reposicao.find(
          function(x) {
            return x.uf === 'TO';
          }
        ) || {};


      const repMA =
        reposicao.find(
          function(x) {
            return x.uf === 'MA';
          }
        ) || {};


      el.innerHTML = `

        <div class="repo-title">
          Boi gordo — R$/@
        </div>


        <div class="quote-grid">

          ${stateBlock(
            'Pará',
            pa,
            true
          )}

          ${stateBlock(
            'Tocantins',
            to,
            false
          )}

          ${stateBlock(
            'Maranhão',
            ma,
            false
          )}

        </div>


        <div class="repo-title">
          Reposição — Bezerro e Garrote
        </div>


        <div class="quote-grid">

          ${repBlock(
            'Pará',
            repPA,
            true
          )}

          ${repBlock(
            'Tocantins',
            repTO,
            false
          )}

          ${repBlock(
            'Maranhão',
            repMA,
            false
          )}

        </div>


        <div
          class="
            quote-meta
            quote-footer
          ">

          Boi gordo:
          R$/@ à vista.

          Reposição:
          valor por cabeça
          e R$/kg.

          Fonte:
          Scot Consultoria
          via Notícias Agrícolas.

          ${
            data.dataReferencia

              ? ' Atualizado em: <b>' +
                data.dataReferencia +
                '</b>.'

              : ''
          }

        </div>

      `;


    } catch (e) {


      console.error(
        'Cotação:',
        e
      );


      el.innerHTML = `

        <div class="quote-error">

          Não foi possível carregar
          a cotação agora.

          Tente novamente pelo botão
          Atualizar.

        </div>

      `;

    }

  }


  /* =========================
     INICIALIZAÇÃO
  ========================= */

  function initPainelUpdate() {

    addStyles();

    ensureQuotePanel();


    const py =
      document.getElementById(
        'panelYear'
      );


    if (py) {

      py.onchange =
        renderKpis;

    }


    try {

      renderKpis();

    } catch (e) {

      console.error(
        'Erro nos indicadores:',
        e
      );

    }


    loadCotacoes();

  }


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      initPainelUpdate
    );

  } else {

    initPainelUpdate();

  }

})();
