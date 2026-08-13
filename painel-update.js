/*
  Compra e Venda de Gado — atualização do Painel
  - Preço médio por kg na compra e venda
  - Preço médio da @ na compra e venda
  - Cotações PA, TO e MA
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

    (list || []).forEach(r => {
      const c = calc(r);

      if (!c.at) return;

      if (tipo === 'buy' && c.qc > 0 && c.pc > 0) {
        valor += (c.pc / c.at) * c.qc;
        qtd += c.qc;
      }

      if (tipo === 'sell' && c.sold > 0 && c.pv > 0) {
        valor += (c.pv / c.at) * c.sold;
        qtd += c.sold;
      }
    });

    return qtd ? valor / qtd : 0;
  }


  /* =========================
     INDICADORES DO PAINEL
  ========================== */

  renderKpis = function () {

    const list = panelRecords();
    const z = totals(list);

    $('kpis').innerHTML = [

      ['Cabeças compradas', num.format(z.qc)],
      ['Cabeças vendidas', num.format(z.qv)],
      ['Cabeças em estoque', num.format(z.est)],

      ['Capital em estoque', money.format(z.cap)],
      ['Total compras', money.format(z.comp)],
      ['Total vendas', money.format(z.vend)],

      ['Custos lançados', money.format(z.cost)],
      ['Lucro realizado', money.format(z.luc)],

      ['Preço médio compra/kg', money.format(avgKg('buy', list))],
      ['Preço médio venda/kg', money.format(avgKg('sell', list))],

      ['Preço médio @ compra', money.format(avgArroba('buy', list))],
      ['Preço médio @ venda', money.format(avgArroba('sell', list))]

    ].map(x => `
      <div class="kpi">
        <span>${x[0]}</span>
        <b>${x[1]}</b>
      </div>
    `).join('');


    const all = totals(records);

    $('stockKpis').innerHTML = [

      ['Cabeças em estoque', num.format(all.est)],

      ['Capital em estoque', money.format(all.cap)],

      ['Lotes abertos',
        records.filter(r => calc(r).saldo > 0).length
      ],

      ['Custo médio/cab estoque',
        all.est
          ? money.format(all.cap / all.est)
          : money.format(0)
      ]

    ].map(x => `
      <div class="kpi">
        <span>${x[0]}</span>
        <b>${x[1]}</b>
      </div>
    `).join('');

  };


  /* =========================
     ESTILO DAS COTAÇÕES
  ========================== */

  function addStyles() {

    if (document.getElementById('quoteStyles')) return;

    const st = document.createElement('style');

    st.id = 'quoteStyles';

    st.textContent = `

      .quote-panel{
        margin:0 0 10px;
      }

      .quote-panel .ph{
        padding:8px 12px;
      }

      .quote-panel .body{
        padding:8px 12px;
      }


      .quote-grid{

        display:grid;

        grid-template-columns:
          repeat(3,minmax(0,1fr));

        gap:8px;

        align-items:stretch;

      }


      .quote-state{

        min-width:0;

        border:1px solid var(--line);

        border-radius:9px;

        padding:8px 10px;

        background:#fff;

      }


      .quote-state.destaque{

        border:1.5px solid var(--g2);

        background:#f3f9f5;

      }


      .quote-state h3{

        margin:0 0 3px;

        font-size:13px;

        line-height:
