(function(){

  function brl(v){
    return new Intl.NumberFormat('pt-BR',{
      style:'currency',
      currency:'BRL'
    }).format(Number(v)||0);
  }

  function avgArroba(tipo,list){
    let valor=0,qtd=0;

    (list||[]).forEach(r=>{
      const c=calc(r);
      if(!c.at)return;

      if(tipo==='buy' && c.qc>0 && c.pc>0){
        valor+=(c.pc/c.at)*c.qc;
        qtd+=c.qc;
      }

      if(tipo==='sell' && c.sold>0 && c.pv>0){
        valor+=(c.pv/c.at)*c.sold;
        qtd+=c.sold;
      }
    });

    return qtd?valor/qtd:0;
  }

  renderKpis=function(){
    const list=panelRecords();
    const z=totals(list);

    $('kpis').innerHTML=[
      ['Cabeças compradas',num.format(z.qc)],
      ['Cabeças vendidas',num.format(z.qv)],
      ['Cabeças em estoque',num.format(z.est)],
      ['Capital em estoque',money.format(z.cap)],
      ['Total compras',money.format(z.comp)],
      ['Total vendas',money.format(z.vend)],
      ['Custos lançados',money.format(z.cost)],
      ['Lucro realizado',money.format(z.luc)],
      ['Preço médio compra/kg',money.format(avgKg('buy',list))],
      ['Preço médio venda/kg',money.format(avgKg('sell',list))],
      ['Preço médio @ compra',money.format(avgArroba('buy',list))],
      ['Preço médio @ venda',money.format(avgArroba('sell',list))]
    ].map(x=>`
      <div class="kpi">
        <span>${x[0]}</span>
        <b>${x[1]}</b>
      </div>
    `).join('');

    const all=totals(records);

    $('stockKpis').innerHTML=[
      ['Cabeças em estoque',num.format(all.est)],
      ['Capital em estoque',money.format(all.cap)],
      ['Lotes abertos',records.filter(r=>calc(r).saldo>0).length],
      ['Custo médio/cab estoque',all.est?money.format(all.cap/all.est):money.format(0)]
    ].map(x=>`
      <div class="kpi">
        <span>${x[0]}</span>
        <b>${x[1]}</b>
      </div>
    `).join('');
  };

  function addStyles(){
    if(document.getElementById('quoteStyles'))return;

    const st=document.createElement('style');
    st.id='quoteStyles';

    st.textContent=`
      .quote-panel{margin:0 0 10px}
      .quote-panel .ph{padding:8px 12px}
      .quote-panel .body{padding:8px 12px}

      .quote-grid{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
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
        margin:0 0 4px;
        font-size:13px;
        color:#173d27;
      }

      .quote-state.destaque h3:after{
        content:" DESTAQUE";
        font-size:7px;
        background:var(--g2);
        color:#fff;
        padding:2px 5px;
        border-radius:999px;
        margin-left:5px;
      }

      .quote-row{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        padding:4px 0;
        border-bottom:1px solid #edf1ed;
        font-size:11px;
      }

      .quote-row:last-child{border-bottom:0}

      .quote-row span{
        min-width:0;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        color:#5f6b62;
      }

      .quote-row b{
        flex-shrink:0;
        white-space:nowrap;
        font-size:12px;
        color:#173d27;
      }

      .quote-meta{
        font-size:10px;
        color:var(--muted);
        line-height:1.3;
      }

      .quote-footer{margin-top:6px}

      .quote-error{
        padding:8px;
        background:#fff3d4;
        color
