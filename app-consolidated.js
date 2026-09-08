/* inline original */


/* inline original */


/* inline original */

// COMPRA E VENDA DE GADO - V18 LOGIN GATE FIX

const MIGRATED=[];

const LAST_USER_KEY='gado_last_authenticated_user_v78';
function lastAuthenticatedUserId(){
  try{return localStorage.getItem(LAST_USER_KEY)||'';}catch(e){return '';}
}
function rememberAuthenticatedUser(user){
  try{if(user&&user.id)localStorage.setItem(LAST_USER_KEY,user.id);}catch(e){}
}
function userStorageSuffix(){
  try{
    if(cloudUser && cloudUser.id) return '__u_'+cloudUser.id;
  }catch(e){}
  const lastId=lastAuthenticatedUserId();
  if(lastId) return '__u_'+lastId;
  return '__guest';
}

function userKey(base){
  return String(base)+userStorageSuffix();
}

function migrateGenericStorageToUser(){
  try{
    if(!cloudUser || !cloudUser.id) return;

    const bases=[
      KEY,
      COSTKEY,
      DELETED_RECORDS_KEY,
      DELETED_COSTS_KEY,
      'gado_pending_sync_v77'
    ];

    bases.forEach(function(base){
      if(!base) return;
      const scoped=userKey(base);

      if(localStorage.getItem(scoped)==null){
        const old=localStorage.getItem(base);
        if(old!=null){
          localStorage.setItem(scoped,old);
        }
      }
    });
  }catch(e){
    console.warn('Migração de dados por usuário:',e);
  }
}

function loadScopedLocalData(){
  try{
    records=JSON.parse(userGet(KEY)||'[]');
  }catch(e){
    records=[];
  }

  try{
    costs=JSON.parse(userGet(COSTKEY)||'[]');
  }catch(e){
    costs=[];
  }

  try{renderAll();}catch(e){}
}


function userGet(base){
  try{return localStorage.getItem(userKey(base));}
  catch(e){return null;}
}

function userSet(base,value){
  try{localStorage.setItem(userKey(base),value);}
  catch(e){}
}

function userRemove(base){
  try{localStorage.removeItem(userKey(base));}
  catch(e){}
}

const KEY='controle_gado_v2_records', COSTKEY='controle_gado_v2_costs';
let records=[],costs=[]; const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}), num=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
const $=id=>document.getElementById(id), n=x=>Number(x)||0, esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function pesoKg(r){let p=n(r.pesoKg);if(p)return p;let s=String(r.peso||'').trim();if(!s)return 0;let v=parseFloat(s.replace(',','.'));return s.includes('@')?v*30:v} function arroba(r){return pesoKg(r)/30}
function costOf(r){return costs.filter(c=>c.recordId===r.id).reduce((a,c)=>a+n(c.value),0)}
function saleLotCost(r){let lots=Array.isArray(r.animalLotsSold)&&r.animalLotsSold.length?r.animalLotsSold:(Array.isArray(r.sourceLots)?r.sourceLots:[]);if(!lots.length||typeof records==='undefined')return 0;return lots.reduce((sum,x)=>{let lot=records.find(z=>z.id===(x.lotId||x.id));return sum+n(x.quantity||x.quantidade)*n(lot&&lot.precoCompra)},0)}
function calc(r){
  const qc=n(r.quantCompra), qv=n(r.quantVenda), pc=n(r.precoCompra), pv=n(r.precoVenda), kg=pesoKg(r);
  // Lucro realizado: somente animais já vendidos. O saldo em estoque
  // fica separado em capital em estoque e não entra neste resultado.
  const sold=qc>0?Math.min(qc,qv):qv;
  const saldo=qc>0?Math.max(0,qc-qv):0;
  const totalC=qc*pc, totalV=qv*pv, custo=costOf(r);
  const custoCompraRealizado=qc>0?sold*pc:saleLotCost(r);
  const custosRealizados=qc>0?custo*(sold/qc):0;
  const lucro=sold>0?sold*pv-custoCompraRealizado-custosRealizados:0;
  let status=qc>0&&qv>qc?'Conferir':qc>0&&saldo===0?'Vendido':qv>0?'Parcial':'Em estoque';
  // Custos vinculados são rateados entre animais vendidos e animais em estoque.
  const custoEstoque=qc>0?custo*(saldo/qc):0;
  return{qc,qv,pc,pv,kg,at:kg/30,totalC,totalV,pcKg:kg?pc/kg:0,pvKg:kg?pv/kg:0,saldo,capital:saldo*pc+custoEstoque,custo,lucro,status,sold}
}
function load(){try{records=JSON.parse(userGet(KEY)||'null')||MIGRATED.map(x=>({...x,pesoKg:pesoKg(x),pgComprador:x.pgComprador||''}));costs=JSON.parse(userGet(COSTKEY)||'[]')}catch(e){records=MIGRATED.map(x=>({...x,pesoKg:pesoKg(x)}));costs=[]}renderAll()}
function safetySnapshot(reason){
  try{
    const key=userKey('gado_safety_snapshots_v78');
    const list=JSON.parse(localStorage.getItem(key)||'[]');
    list.unshift({at:new Date().toISOString(),reason:reason||'save',records:records,costs:costs});
    localStorage.setItem(key,JSON.stringify(list.slice(0,10)));
  }catch(e){console.warn('Snapshot de segurança:',e)}
}
function persist(){
  safetySnapshot('antes-de-salvar');
  userSet(KEY,JSON.stringify(records));
  userSet(COSTKEY,JSON.stringify(costs));
  markOfflineDirty();
  $('saveStatus').textContent=(!navigator.onLine?'Salvo offline • aguardando sincronização':'Alteração salva • sincronizando')+' • '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  scheduleCloudSave();
  try{if(window.refreshCattleMapV33)window.refreshCattleMapV33()}catch(e){}
}
function renderAll(){renderFilters();renderPanelYear();renderKpis();renderTable();renderStock();renderCosts();renderCostMonths();renderReports();renderPending();renderCharts();renderCostOptions()}
function panelRecords(){
 let y=$('panelYear')?$('panelYear').value:'';
 return y?records.filter(r=>(r.data||'').startsWith(y)):records;
}
function totals(list=records){
 let z={qc:0,qv:0,comp:0,vend:0,est:0,cap:0,cost:0,luc:0};
 list.forEach(r=>{let c=calc(r);z.qc+=c.qc;z.qv+=c.sold;z.comp+=c.totalC;z.vend+=c.totalV;z.est+=c.saldo;z.cap+=c.capital;z.luc+=c.lucro});
 let ids=new Set(list.map(r=>r.id));
 z.cost=costs.filter(c=>!c.recordId||ids.has(c.recordId)).reduce((a,c)=>a+n(c.value),0);
 return z;
}
function renderPanelYear(){
 if(!$('panelYear'))return;
 let cur=$('panelYear').value;
 let years=[...new Set(records.map(r=>(r.data||'').slice(0,4)).filter(Boolean))].sort().reverse();
 $('panelYear').innerHTML='<option value="">Todos os anos</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');
 $('panelYear').value=years.includes(cur)?cur:'';
}
function renderKpis(){
 let list=panelRecords(),z=totals(list);
 $('kpis').innerHTML=[['Cabeças compradas',num.format(z.qc)],['Cabeças vendidas',num.format(z.qv)],['Cabeças em estoque',num.format(z.est)],['Capital em estoque',money.format(z.cap)],['Total compras',money.format(z.comp)],['Total vendas',money.format(z.vend)],['Custos lançados',money.format(z.cost)],['Lucro realizado',money.format(z.luc)],['Preço médio compra/kg',money.format(avgKg('buy',list))],['Preço médio venda/kg',money.format(avgKg('sell',list))]].map(x=>`<div class="kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
 let all=totals(records);
 $('stockKpis').innerHTML=[['Cabeças em estoque',num.format(all.est)],['Capital em estoque',money.format(all.cap)],['Lotes abertos',records.filter(r=>calc(r).saldo>0).length],['Custo médio/cab estoque',all.est?money.format(all.cap/all.est):money.format(0)]].map(x=>`<div class="kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
}
function avgKg(t,list=records){let val=0,q=0;list.forEach(r=>{let c=calc(r);if(t==='buy'&&c.kg&&c.qc){val+=c.pcKg*c.qc;q+=c.qc}if(t==='sell'&&c.kg&&c.sold){val+=c.pvKg*c.sold;q+=c.sold}});return q?val/q:0}
function filtered(){let q=$('search').value.toLowerCase().trim(),y=$('fy').value,cat=$('fc').value,s=$('fs').value;return records.filter(r=>{let c=calc(r),hay=[r.vendedor,r.comprador,r.marca,r.parceiro,r.pagamento,r.observacoes].join(' ').toLowerCase();return(!q||hay.includes(q))&&(!y||String(r.data||'').startsWith(y))&&(!cat||(r.era||'')===cat)&&(!s||c.status===s)}).sort((a,b)=>(b.data||'').localeCompare(a.data||''))}
function badge(x){let k=String(x||'').toLowerCase();return `<span class="badge ${k==='ok'?'':k?'warn':'warn'}">${esc(x||'—')}</span>`}

function fileLink(doc,label){
 if(!doc||!doc.data)return '—';
 window.__pdfDocsV85=window.__pdfDocsV85||{};
 let id='pdfList_'+Math.random().toString(36).slice(2)+Date.now().toString(36);
 window.__pdfDocsV85[id]=doc;
 return `<button type="button" class="mini" onclick="openStoredPdfV85('${id}')">Abrir PDF</button>`;
}
function installmentSummary(r){
 let a=Array.isArray(r.installments)?r.installments:(Array.isArray(r.parcelas)?r.parcelas:[]);
 if(!a.length)return '—';
 let paid=a.filter(x=>x.paid).length,total=a.reduce((s,x)=>s+n(x.value),0),done=a.filter(x=>x.paid).reduce((s,x)=>s+n(x.value),0);
 let dates=a.map((x,i)=>`${i+1}ª ${(x.date||x.vencimento)?fmtDate(x.date||x.vencimento):'sem data'} ${money.format(n(x.value||x.valor))} ${x.paid?'pago':'pendente'}`).join(' | ');
 return `${dates} • ${paid}/${a.length} baixadas • ${money.format(total-done)} pendente`;
}
function renderInstallmentsEditor(list=[]){
 let el=$('installmentEditor'); if(!el)return;
 el.innerHTML=list.map((x,i)=>`<div class="formgrid installmentRow" data-i="${i}" style="border:1px solid #dfe6e0;padding:8px;border-radius:8px;margin-bottom:8px">
  <div class="field"><label>Tipo</label><select class="itype"><option ${x.type==='Pagar'?'selected':''}>Pagar</option><option ${x.type==='Receber'?'selected':''}>Receber</option></select></div>
  <div class="field"><label>Vencimento</label><input class="idate" type="date" value="${esc(x.date||'')}"></div>
  <div class="field"><label>Valor</label><input class="ivalue" type="number" step="0.01" value="${n(x.value)||''}"></div>
  <div class="field"><label>Baixa</label><select class="ipaid"><option value="0" ${!x.paid?'selected':''}>Pendente</option><option value="1" ${x.paid?'selected':''}>Pago/Recebido</option></select></div>
  <div class="field"><label>Data da baixa</label><input class="ipaiddate" type="date" value="${esc(x.paidDate||'')}"></div>
  <div class="field"><label>&nbsp;</label><button type="button" class="mini" onclick="removeInstallmentRow(${i})">Excluir parcela</button></div>
 </div>`).join('');
}
function collectInstallments(){
 return [...document.querySelectorAll('.installmentRow')].map(row=>({
   type:row.querySelector('.itype').value,
   date:row.querySelector('.idate').value,
   value:n(row.querySelector('.ivalue').value),
   paid:row.querySelector('.ipaid').value==='1',
   paidDate:row.querySelector('.ipaiddate').value
 })).filter(x=>x.date||x.value);
}
function addInstallmentRow(){
 let a=collectInstallments(); a.push({type:'Receber',date:'',value:0,paid:false,paidDate:''}); renderInstallmentsEditor(a);
}
function removeInstallmentRow(i){let a=collectInstallments();a.splice(i,1);renderInstallmentsEditor(a)}
async function fileToStoredObject(input,oldDoc){
 let f=input&&input.files&&input.files[0];
 if(!f)return oldDoc||null;
 if(f.type!=='application/pdf')throw new Error('O arquivo precisa ser PDF.');
 if(f.size>8*1024*1024)throw new Error('PDF maior que 8 MB. Reduza o arquivo antes de enviar.');
 let data=await new Promise((resolve,reject)=>{let rd=new FileReader();rd.onload=()=>resolve(rd.result);rd.onerror=reject;rd.readAsDataURL(f)});
 return {name:f.name,type:f.type,size:f.size,data,updatedAt:new Date().toISOString()};
}

function hasOriginMap(r){
  return r && r.originLat!=null && r.originLng!=null &&
    Number.isFinite(Number(r.originLat)) && Number.isFinite(Number(r.originLng));
}
function hasDestMap(r){
  return r && r.destLat!=null && r.destLng!=null &&
    Number.isFinite(Number(r.destLat)) && Number.isFinite(Number(r.destLng));
}
function mapBadge(ok,label){
  if(!ok)return '';
  return ' <span class="map-icon-only" title="'+(label||'Mapa')+' registrado">📍</span>';
}
function mapSummaryBadges(r){
  let a=[];
  if(hasOriginMap(r))a.push('<span class="map-badge origin">📍 Origem</span>');
  if(hasDestMap(r))a.push('<span class="map-badge dest">📍 Destino</span>');
  return a.length?a.join(' '):'<span class="hint">—</span>';
}

function negotiationListView(){return window.__negListView||'seller'}
function setNegotiationListView(view){
  window.__negListView=view||'seller';
  document.querySelectorAll('.neg-list-tab').forEach(b=>b.classList.toggle('active',b.dataset.listview===window.__negListView));
  renderTable();
}
function bindNegotiationListTabs(){
  document.querySelectorAll('.neg-list-tab').forEach(b=>b.onclick=()=>setNegotiationListView(b.dataset.listview));
}
function renderTable(){
 let list=filtered(),view=negotiationListView();
 let lotCodeChanged=false,lotCodeNumber=1;
 records.forEach(function(r){if(Number(r.quantCompra||0)>0){let code='LT-'+String(lotCodeNumber++).padStart(2,'0');if(r.loteCodigo!==code){r.loteCodigo=code;lotCodeChanged=true}}});
 if(lotCodeChanged){try{persist()}catch(e){}}
 $('count').textContent=`${list.length} de ${records.length} registros`;
 let head='',rows='';
 if(view==='seller'){
   $('negListTitle').textContent='Vendedores / Compras';
   head='<tr><th>Data</th><th>ID lote</th><th>Vendedor</th><th>Categoria</th><th class="num">Qtd compra</th><th class="num">Peso kg</th><th class="num">@</th><th class="num">Preço/cab</th><th class="num">Preço/kg</th><th class="num">Total compra</th><th>PG vendedor</th><th class="num" title="Soma somente parcelas Pagar que estão pendentes">Débito vendedor</th><th>Forma pag.</th><th>Mapa</th><th>Intermediário</th><th>Ações</th></tr>';
   rows=list.map(r=>{let c=calc(r);return `<tr><td>${fmtDate(r.data)}</td><td><b>${esc(r.loteCodigo||'—')}</b></td><td>${esc(r.vendedor||'—')}</td><td>${esc(r.era||'—')}</td><td class=num>${num.format(c.qc)}</td><td class=num>${num.format(c.kg)}</td><td class=num>${num.format(c.at)}</td><td class=num>${money.format(c.pc)}</td><td class=num>${money.format(c.pcKg)}</td><td class=num>${money.format(c.totalC)}</td><td>${badge(r.pg)}</td><td class="num">${v73DebtCell(v73SellerOutstanding(r))}</td><td>${esc(r.paymentBuy||'—')}</td><td>${mapBadge(hasOriginMap(r),'Fazenda do vendedor')||'—'}</td><td>${esc(r.parceiro||'—')}</td><td><div class=actions><button class=mini onclick="editRecord('${r.id}')">Editar</button><button class=mini onclick="delRecord('${r.id}')">Excluir</button></div></td></tr>`}).join('');
 }else if(view==='buyer'){
   $('negListTitle').textContent='Compradores / Vendas';
   head='<tr><th>Data</th><th>Comprador</th><th>Marca</th><th>Categoria</th><th class="num">Qtd venda</th><th class="num">Preço/cab</th><th class="num">Preço/kg</th><th class="num">Total venda</th><th>PG comprador</th><th class="num" title="Soma somente parcelas Receber que estão pendentes">Débito comprador</th><th>Forma pag.</th><th>GTA</th><th>Nota</th><th>Mapa</th><th>Ações</th></tr>';
   rows=list.map(r=>{let c=calc(r);return `<tr><td>${fmtDate(r.data)}</td><td>${esc(r.comprador||'—')}</td><td>${esc(r.marca||'—')}</td><td>${esc(r.era||'—')}</td><td class=num>${num.format(c.qv)}</td><td class=num>${money.format(c.pv)}</td><td class=num>${money.format(c.pvKg)}</td><td class=num>${money.format(c.totalV)}</td><td>${badge(r.pgComprador)}</td><td class="num">${v73DebtCell(v73BuyerOutstanding(r))}</td><td>${esc(r.paymentSell||'—')}</td><td>${badge(r.gta)} ${fileLink(r.gtaPdf,'GTA')}</td><td>${badge(r.nota)} ${fileLink(r.notaPdf,'Nota')}</td><td>${mapBadge(hasDestMap(r),'Fazenda do comprador')||'—'}</td><td><div class=actions><button class=mini onclick="editRecord('${r.id}')">Editar</button><button class=mini onclick="delRecord('${r.id}')">Excluir</button></div></td></tr>`}).join('');
 }else{
   $('negListTitle').textContent='Negociações completas';
   head='<tr><th>Data</th><th>Vendedor</th><th>Categoria</th><th class="num">Qtd compra</th><th class="num">Peso kg</th><th class="num">@</th><th class="num">Preço compra/cab</th><th class="num">Preço compra/kg</th><th class="num">Total compra</th><th>Comprador</th><th>Marca</th><th class="num">Qtd venda</th><th class="num">Preço venda/cab</th><th class="num">Preço venda/kg</th><th class="num">Total venda</th><th class="num">Saldo</th><th class="num">Capital estoque</th><th class="num">Custos</th><th class="num">Lucro realizado</th><th>Status</th><th>PG vend.</th><th>PG comp.</th><th>Forma pag.</th><th>GTA</th><th>Nota</th><th>Comprovante</th><th>Parcelas</th><th>Pagamento / observações</th><th>Intermediário</th><th>Ações</th></tr>';
   rows=list.map(r=>{let c=calc(r);return `<tr><td>${fmtDate(r.data)}</td><td>${esc(r.vendedor)}${mapBadge(hasOriginMap(r),'Origem')}</td><td>${esc(r.era||'—')}</td><td class=num>${num.format(c.qc)}</td><td class=num>${num.format(c.kg)}</td><td class=num>${num.format(c.at)}</td><td class=num>${money.format(c.pc)}</td><td class=num>${money.format(c.pcKg)}</td><td class=num>${money.format(c.totalC)}</td><td>${esc(r.comprador||'—')}${mapBadge(hasDestMap(r),'Destino')}</td><td>${esc(r.marca||'—')}</td><td class=num>${num.format(c.qv)}</td><td class=num>${money.format(c.pv)}</td><td class=num>${money.format(c.pvKg)}</td><td class=num>${money.format(c.totalV)}</td><td class=num>${num.format(c.saldo)}</td><td class=num>${money.format(c.capital)}</td><td class=num>${money.format(c.custo)}</td><td class="num profit ${c.lucro<0?'neg':''}">${money.format(c.lucro)}</td><td><span class="badge ${c.status==='Conferir'?'bad':c.status==='Em estoque'?'warn':''}">${c.status}</span></td><td>${badge(r.pg)}</td><td>${badge(r.pgComprador)}</td><td>${esc([r.paymentBuy,r.paymentSell].filter(Boolean).join(' / ')||'—')}</td><td>${badge(r.gta)} ${fileLink(r.gtaPdf,'GTA')}</td><td>${badge(r.nota)} ${fileLink(r.notaPdf,'Nota')}</td><td>${fileLink(r.paymentPdf,'Comprovante')}</td><td>${esc(installmentSummary(r))}</td><td>${esc(r.pagamento||r.observacoes||'—')}</td><td>${esc(r.parceiro||'—')}</td><td><div class=actions><button class=mini onclick="editRecord('${r.id}')">Editar</button><button class=mini onclick="delRecord('${r.id}')">Excluir</button></div></td></tr>`}).join('');
 }
 $('negTableHead').innerHTML=head;$('tbody').innerHTML=rows;
}

function daysInStock(r){
  if(!r.data)return 0;
  let d=new Date(r.data+'T12:00:00');
  if(isNaN(d))return 0;
  return Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));
}

function renderStock(){$('stockBody').innerHTML=records.filter(r=>calc(r).saldo>0).sort((a,b)=>(b.data||'').localeCompare(a.data||'')).map(r=>{let c=calc(r);return `<tr><td>${fmtDate(r.data)}</td><td><b>${esc(r.loteCodigo||'—')}</b></td><td>${esc(r.vendedor)}</td><td>${esc(r.era||'—')}</td><td class=num>${num.format(c.qc)}</td><td class=num>${num.format(c.qv)}</td><td class=num><b>${num.format(c.saldo)}</b></td><td class=num>${num.format(daysInStock(r))}</td><td class=num>${num.format(c.kg)}</td><td class=num>${money.format(c.pc)}</td><td class=num>${money.format(c.pcKg)}</td><td class=num>${money.format(c.capital)}</td><td><span class="badge warn">${c.status}</span></td><td>${esc(r.parceiro||'—')}</td></tr>`}).join('')}
function costDate(c){return c.date||(c.month?c.month+'-01':'')}function costMonth(c){let d=costDate(c);return d?d.slice(0,7):'Sem mês'}function renderCosts(){
  let t=costs.reduce((a,c)=>a+n(c.value),0);
  $('costTotal').textContent='Total: '+money.format(t);

  $('costBody').innerHTML=costs.slice()
    .sort((a,b)=>(costDate(b)||'').localeCompare(costDate(a)||''))
    .map(c=>{
      let r=records.find(x=>x.id===c.recordId);
      return `<tr>
        <td>${fmtDate(costDate(c))}</td>
        <td>${esc(c.type)}</td>
        <td>${esc(c.desc||'—')}</td>
        <td>${r?esc(r.vendedor)+' — '+fmtDate(r.data):'Geral'}</td>
        <td class=num>${money.format(n(c.value))}</td>
        <td>
          <div class="actions">
            <button class="mini" type="button" onclick="editCost('${c.id}')">Editar</button>
            <button class="mini" type="button" onclick="delCost('${c.id}')">Excluir</button>
          </div>
        </td>
      </tr>`;
    }).join('');
}

function renderCostMonths(){
  let by={};
  costs.forEach(c=>{
    let m=costMonth(c);
    let x=by[m]||={count:0,total:0};
    x.count++;
    x.total+=n(c.value);
  });
  let rows=Object.entries(by).sort((a,b)=>b[0].localeCompare(a[0]));
  $('costMonthBody').innerHTML=rows.length?rows.map(([m,x])=>`<tr><td>${esc(m)}</td><td class=num>${num.format(x.count)}</td><td class=num><b>${money.format(x.total)}</b></td></tr>`).join(''):`<tr><td colspan="3" class="hint">Nenhum custo lançado ainda.</td></tr>`;
}

function reportFilteredRecords(){
  let dateFrom=$('reportDateFrom')?$('reportDateFrom').value:'';
  let dateTo=$('reportDateTo')?$('reportDateTo').value:'';
  let year=$('reportYearFilter')?$('reportYearFilter').value:'';
  let category=$('reportCategoryFilter')?$('reportCategoryFilter').value:'';
  let client=($('reportClientFilter')?$('reportClientFilter').value:'').toLowerCase().trim();
  let brand=($('reportBrandFilter')?$('reportBrandFilter').value:'').toLowerCase().trim();
  let partner=($('reportPartnerFilter')?$('reportPartnerFilter').value:'').toLowerCase().trim();
  let status=$('reportStatusFilter')?$('reportStatusFilter').value:'';
  let pgSeller=$('reportPgSellerFilter')?$('reportPgSellerFilter').value:'';
  let pgBuyer=$('reportPgBuyerFilter')?$('reportPgBuyerFilter').value:'';
  let stock=$('reportStockFilter')?$('reportStockFilter').value:'';
  let type=$('reportTypeFilter')?$('reportTypeFilter').value:'';

  let list=records.filter(r=>{
    let c=calc(r);
    let data=r.data||'';
    let buyerName=String(r.comprador||'').toLowerCase();
    let brandName=String(r.marca||'').toLowerCase();
    let sellerName=String(r.vendedor||'').toLowerCase();
    let partnerName=String(r.parceiro||'').toLowerCase();
    let rpg=String(r.pg||'').toLowerCase();
    let rpgc=String(r.pgComprador||'').toLowerCase();

    return (!type||(type==='compra'?c.qc>0:c.qv>0)) &&
           (!dateFrom||data>=dateFrom) &&
           (!dateTo||data<=dateTo) &&
           (!year||data.startsWith(year)) &&
           (!category||(r.era||'')===category) &&
           (!client||(buyerName.includes(client)||sellerName.includes(client))) &&
           (!brand||brandName.includes(brand)) &&
           (!partner||partnerName.includes(partner)) &&
           (!status||c.status===status) &&
           (!pgSeller||rpg===pgSeller) &&
           (!pgBuyer||rpgc===pgBuyer) &&
           (!stock||(stock==='yes'?c.saldo>0:c.saldo===0));
  });

  let count=$('reportFilterCount');
  if(count)count.textContent=list.length+' negociação(ões) encontradas';

  let k=$('reportFilterKpis');
  if(k){
    let z=totals(list);
    k.innerHTML=[
      ['Cabeças compradas',num.format(z.qc)],
      ['Cabeças vendidas',num.format(z.qv)],
      ['Estoque',num.format(z.est)],
      ['Total compras',money.format(z.comp)],
      ['Total vendas',money.format(z.vend)],
      ['Lucro realizado',money.format(z.luc)]
    ].map(x=>`<div class="kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
  }

  return list;
}

function renderReports(){
  let reportList=reportFilteredRecords();

  let yrs={};
  reportList.forEach(r=>{
    let y=(r.data||'').slice(0,4)||'Sem data',c=calc(r);
    let x=yrs[y]||={qc:0,qv:0,comp:0,vend:0,luc:0};
    x.qc+=c.qc;x.qv+=c.sold;x.comp+=c.totalC;x.vend+=c.totalV;x.luc+=c.lucro
  });
  $('yearReport').innerHTML=Object.entries(yrs).sort((a,b)=>b[0].localeCompare(a[0])).map(([y,x])=>`<tr><td>${y}</td><td class=num>${num.format(x.qc)}</td><td class=num>${num.format(x.qv)}</td><td class=num>${money.format(x.comp)}</td><td class=num>${money.format(x.vend)}</td><td class="num profit ${x.luc<0?'neg':''}">${money.format(x.luc)}</td></tr>`).join('') || `<tr><td colspan="6" class="hint">Nenhum resultado para os filtros selecionados.</td></tr>`;

  let cs={};
  reportList.forEach(r=>{
    let k=(r.era||'Sem categoria').trim()||'Sem categoria',c=calc(r),
        x=cs[k]||={qc:0,qv:0,est:0,bv:0,bq:0,sv:0,sq:0,l:0};
    x.qc+=c.qc;x.qv+=c.sold;x.est+=c.saldo;
    if(c.kg){x.bv+=c.pcKg*c.qc;x.bq+=c.qc;x.sv+=c.pvKg*c.sold;x.sq+=c.sold}
    x.l+=c.lucro
  });
  $('catReport').innerHTML=Object.entries(cs).sort((a,b)=>b[1].qv-a[1].qv).map(([k,x])=>`<tr><td>${esc(k)}</td><td class=num>${num.format(x.qc)}</td><td class=num>${num.format(x.qv)}</td><td class=num>${num.format(x.est)}</td><td class=num>${money.format(x.bq?x.bv/x.bq:0)}</td><td class=num>${money.format(x.sq?x.sv/x.sq:0)}</td><td class="num profit ${x.l<0?'neg':''}">${money.format(x.l)}</td></tr>`).join('') || `<tr><td colspan="7" class="hint">Nenhum resultado para os filtros selecionados.</td></tr>`;

  renderPendingFiltered(reportList);
}

function renderPendingFiltered(reportList){
 let pagar=0,receber=0,items=[];
 reportList.forEach(r=>{
   let c=calc(r),inst=Array.isArray(r.installments)?r.installments.filter(x=>!x.paid):[];
   if(inst.length){
     inst.forEach(x=>{
       let tipo=x.type==='Pagar'?'A pagar':'A receber',v=n(x.value);
       if(tipo==='A pagar')pagar+=v;else receber+=v;
       items.push({data:x.date||r.data,tipo,nome:tipo==='A pagar'?(r.vendedor||'Vendedor não informado'):(r.comprador||'Comprador não informado'),q:'—',valor:v,status:'Parcela pendente'});
     });
   }else{
     if(c.qc>0 && String(r.pg||'').toLowerCase()!=='ok'){
       pagar+=c.totalC;
       items.push({data:r.data,tipo:'A pagar',nome:r.vendedor||'Vendedor não informado',q:c.qc,valor:c.totalC,status:r.pg||'Pendente'});
     }
     if(c.qv>0 && String(r.pgComprador||'').toLowerCase()!=='ok'){
       receber+=c.totalV;
       items.push({data:r.data,tipo:'A receber',nome:r.comprador||'Comprador não informado',q:c.qv,valor:c.totalV,status:r.pgComprador||'Pendente'});
     }
   }
 });
 let saldo=receber-pagar;
 $('pendingKpis').innerHTML=[['Total a pagar',money.format(pagar)],['Total a receber',money.format(receber)],['Saldo a receber − pagar',money.format(saldo)]].map(x=>`<div class="kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
 items.sort((a,b)=>(b.data||'').localeCompare(a.data||''));
 $('pendingBody').innerHTML=items.length?items.map(x=>`<tr><td>${fmtDate(x.data)}</td><td><span class="badge ${x.tipo==='A pagar'?'warn':''}">${x.tipo}</span></td><td>${esc(x.nome)}</td><td class=num>${typeof x.q==='number'?num.format(x.q):x.q}</td><td class=num><b>${money.format(x.valor)}</b></td><td>${esc(x.status)}</td></tr>`).join(''):`<tr><td colspan="6" class="hint">Nenhum pagamento ou recebimento pendente para os filtros selecionados.</td></tr>`;
}

function renderPartner(){let p={};records.forEach(r=>{let k=r.parceiro||'Sem intermediário',c=calc(r),x=p[k]||={q:0,v:0,l:0};x.q+=c.sold;x.v+=c.totalV;x.l+=c.lucro});$('partnerSummary').innerHTML=Object.entries(p).sort((a,b)=>b[1].v-a[1].v).map(([k,x])=>`<tr><td>${esc(k)}</td><td class=num>${num.format(x.q)}</td><td class=num>${money.format(x.v)}</td><td class="num profit ${x.l<0?'neg':''}">${money.format(x.l)}</td></tr>`).join('')}

function renderPartnerReport(){
  let p={};
  records.forEach(r=>{
    let k=(r.parceiro||'Sem intermediário').trim()||'Sem intermediário';
    let c=calc(r);
    let x=p[k]||={q:0,comp:0,vend:0,cost:0,luc:0};
    x.q+=c.sold;
    x.comp+=c.sold*c.pc;
    x.vend+=c.totalV;
    x.cost+=c.qc?c.custo*(c.sold/c.qc):0;
    x.luc+=c.lucro;
  });
  let rows=Object.entries(p).sort((a,b)=>b[1].luc-a[1].luc);
  $('partnerReport').innerHTML=rows.map(([k,x])=>{
    let margem=x.vend?x.luc/x.vend:0;
    return `<tr><td>${esc(k)}</td><td class=num>${num.format(x.q)}</td><td class=num>${money.format(x.comp)}</td><td class=num>${money.format(x.vend)}</td><td class=num>${money.format(x.cost)}</td><td class="num profit ${x.luc<0?'neg':''}"><b>${money.format(x.luc)}</b></td><td class=num>${(margem*100).toFixed(1)}%</td></tr>`;
  }).join('');
}

function renderFilters(){let years=[...new Set(records.map(r=>(r.data||'').slice(0,4)).filter(Boolean))].sort().reverse(),cats=[...new Set(records.map(r=>(r.era||'').trim()).filter(Boolean))].sort();let vy=$('fy').value,vc=$('fc').value;$('fy').innerHTML='<option value="">Todos anos</option>'+years.map(y=>`<option>${y}</option>`).join('');$('fc').innerHTML='<option value="">Todas categorias</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join('');$('fy').value=vy;$('fc').value=vc;let cy=$('chartYear').value;$('chartYear').innerHTML=years.map(y=>`<option>${y}</option>`).join('');$('chartYear').value=years.includes(cy)?cy:(years[0]||'')}

function renderPending(){
 let pagar=0,receber=0,items=[];
 records.forEach(r=>{
   let c=calc(r),inst=Array.isArray(r.installments)?r.installments.filter(x=>!x.paid):[];
   if(inst.length){
     inst.forEach(x=>{
       let tipo=x.type==='Pagar'?'A pagar':'A receber',v=n(x.value);
       if(tipo==='A pagar')pagar+=v;else receber+=v;
       items.push({data:x.date||r.data,tipo,nome:tipo==='A pagar'?(r.vendedor||'Vendedor não informado'):(r.comprador||'Comprador não informado'),q:'—',valor:v,status:'Parcela pendente'});
     });
   }else{
     if(c.qc>0 && String(r.pg||'').toLowerCase()!=='ok'){pagar+=c.totalC;items.push({data:r.data,tipo:'A pagar',nome:r.vendedor||'Vendedor não informado',q:c.qc,valor:c.totalC,status:r.pg||'Pendente'});}
     if(c.qv>0 && String(r.pgComprador||'').toLowerCase()!=='ok'){receber+=c.totalV;items.push({data:r.data,tipo:'A receber',nome:r.comprador||'Comprador não informado',q:c.qv,valor:c.totalV,status:r.pgComprador||'Pendente'});}
   }
 });
 let saldo=receber-pagar;
 $('pendingKpis').innerHTML=[['Total a pagar',money.format(pagar)],['Total a receber',money.format(receber)],['Saldo a receber − pagar',money.format(saldo)]].map(x=>`<div class="kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
 items.sort((a,b)=>(b.data||'').localeCompare(a.data||''));
 $('pendingBody').innerHTML=items.length?items.map(x=>`<tr><td>${fmtDate(x.data)}</td><td><span class="badge ${x.tipo==='A pagar'?'warn':''}">${x.tipo}</span></td><td>${esc(x.nome)}</td><td class=num>${typeof x.q==='number'?num.format(x.q):x.q}</td><td class=num><b>${money.format(x.valor)}</b></td><td>${esc(x.status)}</td></tr>`).join(''):`<tr><td colspan="6" class="hint">Nenhum pagamento ou recebimento pendente.</td></tr>`;
}

function renderCharts(){let by={};records.forEach(r=>{let y=(r.data||'').slice(0,4);if(!y)return;let c=calc(r),x=by[y]||={q:0,v:0};x.q+=c.sold;x.v+=c.totalV});let years=Object.keys(by).sort();barChart($('chartQtd'),years,years.map(y=>by[y].q),'cabeças');barChart($('chartValor'),years,years.map(y=>by[y].v),'R$');let y=$('chartYear').value,ms=Array(12).fill(0);records.filter(r=>(r.data||'').startsWith(y)).forEach(r=>{let d=new Date((r.data||'')+'T12:00:00');if(!isNaN(d))ms[d.getMonth()]+=calc(r).totalV});barChart($('chartMes'),['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],ms,'R$')}
function barChart(canvas,labels,values,unit){let dpr=devicePixelRatio||1,rect=canvas.getBoundingClientRect(),w=Math.max(300,rect.width),h=Math.max(200,rect.height);canvas.width=w*dpr;canvas.height=h*dpr;let ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);let pad={l:52,r:12,t:15,b:38},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b,max=Math.max(...values,1);ctx.strokeStyle='#dfe6e0';ctx.fillStyle='#657067';ctx.font='11px system-ui';for(let i=0;i<=4;i++){let y=pad.t+ch*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();let v=max*(1-i/4);ctx.fillText(unit==='R$'?'R$ '+compact(v):Math.round(v),2,y+4)}let bw=cw/Math.max(labels.length,1)*.62;labels.forEach((lab,i)=>{let x=pad.l+cw*(i+.5)/labels.length,bh=ch*(values[i]/max),y=pad.t+ch-bh;ctx.fillStyle='#2f7a4f';ctx.fillRect(x-bw/2,y,bw,bh);ctx.fillStyle='#4d5c52';ctx.textAlign='center';ctx.fillText(lab,x,h-14);ctx.save();ctx.translate(x,y-4);ctx.fillStyle='#1e3d2a';ctx.fillText(unit==='R$'?'R$ '+compact(values[i]):num.format(values[i]),0,0);ctx.restore()});ctx.textAlign='left'}
function compact(v){if(v>=1e6)return (v/1e6).toFixed(1)+' mi';if(v>=1e3)return (v/1e3).toFixed(0)+' mil';return Math.round(v)}
function renderCostOptions(){var el=$('crecord');if(!el)return;el.innerHTML='<option value="">Custo geral</option>'+records.filter(function(r){return Number(r.quantCompra||0)>0}).slice().sort(function(a,b){return String(a.loteCodigo||'').localeCompare(String(b.loteCodigo||''),undefined,{numeric:true})}).map(function(r){return '<option value="'+r.id+'">'+esc(r.loteCodigo||'—')+' — '+fmtDate(r.data)+' — '+esc(r.vendedor||'Sem vendedor')+'</option>';}).join('')}

function v72InstallmentsOf(r){
  if(Array.isArray(r.installments)) return r.installments;
  if(Array.isArray(r.parcelas)) return r.parcelas;
  return [];
}

function v72IsPaidParcel(p){
  const st=String(p.status||'').toLowerCase();
  return p.paid===true || p.baixada===true || p.pago===true ||
         st==='ok' || st==='pago' || st==='baixada' || st==='recebido';
}

function v72ParcelValue(p){
  return Number(p.value ?? p.valor ?? p.amount ?? 0) || 0;
}

function v72ParcelSide(p){
  return String(p.side ?? p.tipo ?? p.type ?? p.operacao ?? '').toLowerCase();
}

function v73SellerOutstanding(r){
  const list=Array.isArray(r.installments) ? r.installments : [];

  // Vendedor = somente parcelas "Pagar" ainda pendentes.
  const pending=list.filter(p=>{
    const type=String(p.type||'').trim().toLowerCase();
    const isSeller=
      type==='pagar' ||
      type.includes('pagar') ||
      type.includes('compra') ||
      type.includes('vendedor');

    const paid=
      p.paid===true ||
      p.baixada===true ||
      p.pago===true ||
      String(p.status||'').toLowerCase()==='ok' ||
      String(p.status||'').toLowerCase()==='pago' ||
      String(p.status||'').toLowerCase()==='baixada';

    return isSeller && !paid;
  });

  return pending.reduce((sum,p)=>{
    return sum + (Number(p.value ?? p.valor ?? 0) || 0);
  },0);
}

function v73BuyerOutstanding(r){
  const list=Array.isArray(r.installments) ? r.installments : [];

  // Comprador = somente parcelas "Receber" ainda pendentes.
  const pending=list.filter(p=>{
    const type=String(p.type||'').trim().toLowerCase();
    const isBuyer=
      type==='receber' ||
      type.includes('receber') ||
      type.includes('venda') ||
      type.includes('comprador');

    const paid=
      p.paid===true ||
      p.baixada===true ||
      p.pago===true ||
      String(p.status||'').toLowerCase()==='ok' ||
      String(p.status||'').toLowerCase()==='pago' ||
      String(p.status||'').toLowerCase()==='recebido' ||
      String(p.status||'').toLowerCase()==='baixada';

    return isBuyer && !paid;
  });

  return pending.reduce((sum,p)=>{
    return sum + (Number(p.value ?? p.valor ?? 0) || 0);
  },0);
}

function v73DebtCell(value){
  const n=Number(value)||0;
  return n<=0
    ? '<span class="debt-ok-v71">ok</span>'
    : '<span class="debt-pending-v71">'+money.format(n)+'</span>';
}

function fmtDate(s){if(!s)return '—';let [y,m,d]=s.split('-');return d&&m&&y?`${d}/${m}/${y}`:s}
function openModal(id){$(id).classList.add('show');if(id==='recordModal')setTimeout(()=>{try{window.showNegV66&&window.showNegV66('compra')}catch(e){}},60)} function closeModal(id){$(id).classList.remove('show')}
function editRecord(id){let r=records.find(x=>x.id===id);['rgtaFile','rnotaFile','rpayFile'].forEach(function(fid){var input=$(fid);if(input)input.value=''});['rgtaFileStatus','rnotaFileStatus','rpayFileStatus'].forEach(function(sid){var status=$(sid);if(status)status.innerHTML=''});$('modalTitle').textContent='Editar negociação';$('rid').value=r.id;$('rdata').value=r.data||'';$('rvendedor').value=r.vendedor||'';$('rcategoria').value=(r.era||'').trim();$('rqcomp').value=r.quantCompra||'';$('rpeso').value=pesoKg(r)||'';$('rpc').value=r.precoCompra||'';$('rpg').value=r.pg||'';$('rpayBuy').value=r.paymentBuy||'';$('raccountBuy').value=r.accountBuy||'';$('roriginFarm').value=r.originFarm||'';$('roriginCity').value=r.originCity||'';$('roriginState').value=r.originState||'';$('roriginLat').value=r.originLat??'';$('roriginLng').value=r.originLng??'';$('rcomprador').value=r.comprador||'';$('rmarca').value=r.marca||'';$('rqv').value=r.quantVenda||'';$('rpv').value=r.precoVenda||'';$('rpgc').value=r.pgComprador||'';$('rpaySell').value=r.paymentSell||'';$('raccountSell').value=r.accountSell||'';$('rdestFarm').value=r.destFarm||'';$('rdestCity').value=r.destCity||'';$('rdestState').value=r.destState||'';$('rdestLat').value=r.destLat??'';$('rdestLng').value=r.destLng??'';$('rgta').value=r.gta||'';$('rnota').value=r.nota||'';$('robs').value=r.pagamento||r.observacoes||'';$('rparceiro').value=r.parceiro||'';$('rorigem').value=r.origem||'';$('rgtaFileStatus').innerHTML=r.gtaPdf?fileLink(r.gtaPdf,'GTA'):'';$('rnotaFileStatus').innerHTML=r.notaPdf?fileLink(r.notaPdf,'Nota'):'';$('rpayFileStatus').innerHTML=r.paymentPdf?fileLink(r.paymentPdf,'Comprovante'):'';renderInstallmentsEditor(r.installments||[]);preview();openModal('recordModal')}
function newRecord(){$('recordForm').reset();$('rid').value='';$('rorigem').value='Cadastrado no programa';$('modalTitle').textContent='Nova negociação';$('rgtaFileStatus').innerHTML='';$('rnotaFileStatus').innerHTML='';$('rpayFileStatus').innerHTML='';renderInstallmentsEditor([]);preview();openModal('recordModal')}
function preview(){let kg=n($('rpeso').value),qc=n($('rqcomp').value),qv=n($('rqv').value),pc=n($('rpc').value),pv=n($('rpv').value);$('calcPreview').innerHTML=`<b>Cálculos:</b> ${kg?num.format(kg/30):0} @ • compra ${kg?money.format(pc/kg):money.format(0)}/kg • venda ${kg?money.format(pv/kg):money.format(0)}/kg • saldo ${Math.max(0,qc-qv)} cabeças • compra total ${money.format(qc*pc)} • venda total ${money.format(qv*pv)}`}
$('recordForm').addEventListener('submit',async e=>{
 e.preventDefault();
 let saveBtn=e.submitter; if(saveBtn)saveBtn.disabled=true;
 try{
  let id=$('rid').value||'n-'+Date.now(),old=records.find(x=>x.id===id)||{};
  // Em edição, preservar cada PDF existente. Só apagar com exclusão explícita.
  const pdfValue=async(id,previous)=>{
    const input=$(id),remove=input&&input.dataset&&input.dataset.deletePdf==='1';
    if(remove)return null;
    const chosen=input&&input.files&&input.files[0];
    if(!chosen)return previous||null;
    const saved=await fileToStoredObject(input,previous);
    return saved||previous||null;
  };
  let gtaPdf=await pdfValue('rgtaFile',old.gtaPdf);
  let notaPdf=await pdfValue('rnotaFile',old.notaPdf);
  let paymentPdf=await pdfValue('rpayFile',old.paymentPdf);
  let r={...old,id,data:$('rdata').value,vendedor:$('rvendedor').value.trim(),era:$('rcategoria').value,quantCompra:n($('rqcomp').value),pesoKg:n($('rpeso').value),peso:String(n($('rpeso').value)),pesoTipo:'kg',precoCompra:n($('rpc').value),pg:$('rpg').value,
    paymentBuy:$('rpayBuy').value,accountBuy:$('raccountBuy').value.trim(),originFarm:$('roriginFarm').value.trim(),originCity:$('roriginCity').value.trim(),originState:$('roriginState').value.trim().toUpperCase(),originLat:$('roriginLat').value?Number($('roriginLat').value):null,originLng:$('roriginLng').value?Number($('roriginLng').value):null,
    comprador:$('rcomprador').value.trim(),marca:$('rmarca').value.trim(),quantVenda:n($('rqv').value),precoVenda:n($('rpv').value),pgComprador:$('rpgc').value,
    paymentSell:$('rpaySell').value,accountSell:$('raccountSell').value.trim(),destFarm:$('rdestFarm').value.trim(),destCity:$('rdestCity').value.trim(),destState:$('rdestState').value.trim().toUpperCase(),destLat:$('rdestLat').value?Number($('rdestLat').value):null,destLng:$('rdestLng').value?Number($('rdestLng').value):null,
    gta:$('rgta').value,nota:$('rnota').value,gtaPdf,notaPdf,paymentPdf,installments:collectInstallments(),
    pagamento:$('robs').value.trim(),observacoes:$('robs').value.trim(),parceiro:$('rparceiro').value.trim(),origem:old.origem||'Cadastrado no programa',updatedAt:new Date().toISOString()};
  let i=records.findIndex(x=>x.id===id);if(i>=0)records[i]=r;else records.push(r);

  // IMPORTANT: use the single offline/sync pipeline.
  // At runtime persist() is the function that writes localStorage AND
  // refreshes the pending sync snapshot with the latest full record,
  // including map coordinates.
  persist();
  ['rgtaFile','rnotaFile','rpayFile'].forEach(function(fid){var input=$(fid);if(input){input.value='';input.dataset.deletePdf='0';}});

  renderAll();
  try{if(window.refreshCattleMapV33)window.refreshCattleMapV33()}catch(e){}

  closeModal('recordModal');
  autoExcelBackup();
 }catch(err){alert('Não foi possível salvar: '+(err.message||err))}
 finally{if(saveBtn)saveBtn.disabled=false}
})
function delRecord(id){if(confirm('Excluir esta negociação?')){addDeletedId(DELETED_RECORDS_KEY,id);costs.filter(c=>c.recordId===id).forEach(c=>addDeletedId(DELETED_COSTS_KEY,c.id));records=records.filter(x=>x.id!==id);costs=costs.filter(c=>c.recordId!==id);persist();renderAll();autoExcelBackup()}}
$('costForm').addEventListener('submit',e=>{
  e.preventDefault();

  let d=$('cdate').value;
  let id=$('costEditId').value;

  let obj={
    id:id||('c-'+Date.now()),
    date:d,
    month:d?d.slice(0,7):'',
    type:$('ctype').value,
    desc:$('cdesc').value.trim(),
    recordId:$('crecord').value,
    value:n($('cvalue').value),
    updatedAt:new Date().toISOString()
  };

  if(id){
    let i=costs.findIndex(x=>x.id===id);
    if(i>=0)costs[i]=obj;
    else costs.push(obj);
  }else{
    costs.push(obj);
  }

  markOfflineDirty();
  persist();
  closeModal('costModal');
  $('costForm').reset();
  $('costEditId').value='';
  renderAll();
  autoExcelBackup();
})
function editCost(id){
  let c=costs.find(x=>x.id===id);
  if(!c)return;
  $('costEditId').value=c.id;
  $('cdate').value=costDate(c);
  $('ctype').value=c.type||'';
  $('cdesc').value=c.desc||'';
  $('crecord').value=c.recordId||'';
  $('cvalue').value=n(c.value)||'';
  openModal('costModal');
}
function delCost(id){if(confirm('Excluir este custo?')){addDeletedId(DELETED_COSTS_KEY,id);costs=costs.filter(x=>x.id!==id);persist();renderAll();autoExcelBackup()}}
function download(name,text,type){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
function csvCell(v){return '"'+String(v??'').replace(/"/g,'""')+'"'} function exportCSV(){let h=['Data','Vendedor','Categoria','Qtd compra','Peso kg/cab','Arrobas','Preço compra/cab','Preço compra/kg','Total compra','Comprador','Marca','Qtd venda','Preço venda/cab','Preço venda/kg','Total venda','Saldo','Capital estoque','Custos','Lucro','Status','PG vendedor','PG comprador','GTA','Nota','Pagamento/Observações','Intermediário'];let lines=[h.map(csvCell).join(';')];records.forEach(r=>{let c=calc(r);lines.push([r.data,r.vendedor,r.era,c.qc,c.kg,c.at,c.pc,c.pcKg,c.totalC,r.comprador,r.marca,c.qv,c.pv,c.pvKg,c.totalV,c.saldo,c.capital,c.custo,c.lucro,c.status,r.pg,r.pgComprador,r.gta,r.nota,r.pagamento||r.observacoes,r.parceiro].map(csvCell).join(';'))});download('backup_excel_gado_'+new Date().toISOString().slice(0,10)+'.csv','\ufeff'+lines.join('\n'),'text/csv;charset=utf-8')}
function backup(){download('backup_gado_v2_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({records,costs},null,2),'application/json')}
function autoExcelBackup(){if($('autoExcel')&&$('autoExcel').checked){exportCSV()}}
function rememberAutoExcel(){if($('autoExcel'))localStorage.setItem('gado_auto_excel_v1',$('autoExcel').checked?'1':'0')}
function loadAutoExcel(){if($('autoExcel'))$('autoExcel').checked=localStorage.getItem('gado_auto_excel_v1')==='1'}
$('restore').addEventListener('change',e=>{let f=e.target.files[0];if(!f)return;let rd=new FileReader();rd.onload=()=>{try{let x=JSON.parse(rd.result);if(Array.isArray(x)){records=x}else{records=x.records||[];costs=x.costs||[]}persist();renderAll();alert('Backup restaurado.')}catch{alert('Backup inválido.')}};rd.readAsText(f);e.target.value=''})
$('newBtn').onclick=newRecord;$('newCost').onclick=()=>{
  $('costForm').reset();
  $('costEditId').value='';
  openModal('costModal');
};$('csvBtn').onclick=exportCSV;$('backupBtn').onclick=backup;$('autoExcel').addEventListener('change',rememberAutoExcel);loadAutoExcel();['search','fy','fc','fs'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',renderTable));$('chartYear').addEventListener('change',renderCharts);['rqcomp','rpeso','rpc','rqv','rpv'].forEach(id=>$(id).addEventListener('input',preview));document.querySelectorAll('.tabbtn').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabbtn').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active');setTimeout(renderCharts,20)});window.addEventListener('resize',()=>setTimeout(renderCharts,100));$('panelYear').onchange=renderKpis;
$('addInstallmentBtn').onclick=addInstallmentRow;
load();setTimeout(function(){initCloud();},0);
setTimeout(function(){
 var b=$('loginBtn');
 if(b && b.textContent.trim()==='Entrar'){
   b.onclick=function(e){
     e.preventDefault();
     var m=$('authModal');
     if(m) m.classList.add('show');
   };
 }
},800);


function setAuthenticatedUI(isAuth){
  var app=document.getElementById('appShell');
  var gate=document.getElementById('loginGate');
  if(app) app.style.display=isAuth?'':'none';
  if(gate) gate.style.display=isAuth?'none':'block';
  var login=document.getElementById('loginBtn');
  var logout=document.getElementById('logoutBtn');
  if(login) login.style.display=isAuth?'none':'';
  if(logout) logout.style.display=isAuth?'':'none';
}
function openLoginModal(){
  var m=document.getElementById('authModal');
  if(m)m.classList.add('show');
}
async function forgotPassword(){
  if(!sb){
    var c=cloudCfg();
    if(window.supabase) sb=window.supabase.createClient(c.url,c.key);
  }
  var email=(document.getElementById('authEmail')||{}).value||'';
  email=email.trim();
  var msg=document.getElementById('authMsg');
  if(!email){ if(msg)msg.textContent='Informe seu e-mail para recuperar a senha.'; return; }
  if(msg)msg.textContent='Enviando e-mail de recuperação...';
  try{
    var redirectTo=window.location.origin + window.location.pathname;
    var res=await sb.auth.resetPasswordForEmail(email,{redirectTo:redirectTo});
    if(res.error)throw res.error;
    if(msg)msg.textContent='E-mail de recuperação enviado. Abra o e-mail mais recente e siga o link.';
  }catch(e){
    if(msg)msg.textContent='Erro ao recuperar senha: '+(e.message||e);
  }
}
async function saveNewPassword(){
  var p1=(document.getElementById('newPassword')||{}).value||'';
  var p2=(document.getElementById('newPassword2')||{}).value||'';
  var msg=document.getElementById('resetMsg');
  if(p1.length<6){if(msg)msg.textContent='A senha precisa ter pelo menos 6 caracteres.';return}
  if(p1!==p2){if(msg)msg.textContent='As duas senhas não conferem.';return}
  try{
    var res=await sb.auth.updateUser({password:p1});
    if(res.error)throw res.error;
    if(msg)msg.textContent='Senha alterada com sucesso.';
    setTimeout(function(){closeModal('resetPasswordModal');location.href=window.location.origin+window.location.pathname;},700);
  }catch(e){
    if(msg)msg.textContent='Erro ao alterar senha: '+(e.message||e);
  }
}

/* ===== NUVEM / SUPABASE ===== */
let sb=null, cloudUser=null, cloudTimer=null, cloudBusy=false;
let bootLoginApproved=false; // v84: exige login explícito a cada abertura online
    migrateGenericStorageToUser();
    loadScopedLocalData();
const CLOUD_TABLE='gado_state';

function cloudCfg(){
  return {
    url:'https://bvqttwnxszsduhwiblmv.supabase.co',
    key:'sb_publishable_OdI3OcT80ETvC82PnzA68Q_nrLXqS_X'
  };
}
function saveCloudSetup(){
 const url=$('setupUrl').value.trim().replace(/\/+$/,'');
 const key=$('setupKey').value.trim();
 if(!url.startsWith('https://')||!url.includes('.supabase.co')){$('setupMsg').textContent='Confira a URL.';return;}
 if(!key.startsWith('sb_publishable_')){$('setupMsg').textContent='Confira a Publishable key.';return;}
 localStorage.setItem('gado_supabase_url',url);
 localStorage.setItem('gado_supabase_key',key);
 location.reload();
}

function setCloudStatus(text,kind=''){
  const e=$('cloudStatus'); if(!e)return;
  e.textContent=text; e.className='cloudpill'+(kind?' '+kind:'');
}
function cloudConfigured(){
  const c=cloudCfg(); return !!(c.url&&c.key);
}
async function initCloud(){
  
  if(!cloudConfigured()){
    setCloudStatus('Nuvem: desconectado','warn');
    $('loginBtn').textContent='Configurar nuvem';
    $('loginBtn').onclick=function(){ $('cloudSetupModal').classList.add('show'); };
    $('closeSetup').onclick=function(){ $('cloudSetupModal').classList.remove('show'); };
    $('saveSetup').onclick=saveCloudSetup;
    return;
  }
  const c=cloudCfg();
  sb=window.supabase.createClient(c.url,c.key);
  $('loginBtn').onclick=()=>openModal('authModal');
  $('logoutBtn').onclick=cloudLogout;
  $('signInBtn').onclick=cloudLogin;
  $('signUpBtn').onclick=cloudSignup;
  $('resendBtn').onclick=cloudResendConfirmation;
  const {data:{session}}=await sb.auth.getSession();

  // v81: a sessão persistida não libera a tela automaticamente.
  cloudUser=session?.user||null;
  if(cloudUser) rememberAuthenticatedUser(cloudUser);
  if(session && session.user){ bootLoginApproved=true; }
  await onCloudSession(session);

  sb.auth.onAuthStateChange(async (event,session)=>{
    if(event==='PASSWORD_RECOVERY'){
      setAuthenticatedUI(false);
      openModal('resetPasswordModal');
      return;
    }
    if(session && session.user){ bootLoginApproved=true; cloudUser=session.user; }

    await onCloudSession(session);
  });
}
async function onCloudSession(session){
  cloudUser=session?.user||null;
  if(cloudUser) rememberAuthenticatedUser(cloudUser);
  if(!cloudUser){
    setAuthenticatedUI(false);
    setCloudStatus('Acesso protegido','warn');
    $('loginBtn').style.display='';
    $('loginBtn').textContent='Entrar';
    $('logoutBtn').style.display='none';
    return;
  }
  $('loginBtn').style.display='none';
  $('logoutBtn').style.display='';
  setAuthenticatedUI(true);
  var gate=document.getElementById('loginGate');
  var app=document.getElementById('appShell');
  if(gate) gate.style.display='none';
  if(app) app.style.display='';
  setCloudStatus('Sincronizando…','warn');
  $('loginBtn').style.display='none';
  $('logoutBtn').style.display='';
  // V74: after login, migrate any legacy/local data and load the correct user-scoped copy
  // BEFORE reading cloud data. This prevents deploy/rollback from making recent local data disappear.
  migrateGenericStorageToUser();
  loadScopedLocalData();
  await cloudLoad();
}
async function cloudLogin(){
  if(!sb)return;
  const email=$('authEmail').value.trim(), password=$('authPassword').value;
  $('authMsg').textContent='Entrando…';
  bootLoginApproved=true;
  const {error}=await sb.auth.signInWithPassword({email,password});
  if(error){
    bootLoginApproved=false;
    $('authMsg').textContent='Erro: '+error.message;
    return;
  }
  $('authMsg').textContent='Login realizado.';
  closeModal('authModal');
}
async function cloudSignup(){
  if(!sb)return;
  const email=$('authEmail').value.trim(), password=$('authPassword').value;
  if(!email||password.length<6){$('authMsg').textContent='Informe e-mail e uma senha com pelo menos 6 caracteres.';return}
  $('authMsg').textContent='Criando conta…';
  const redirectTo=window.location.origin + window.location.pathname;
  const {error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}});
  if(error){$('authMsg').textContent='Erro: '+error.message;return}
  $('authMsg').textContent='Conta criada. Se o serviço pedir confirmação, confirme o e-mail e depois entre.';
}

async function cloudResendConfirmation(){
  if(!sb)return;
  const email=$('authEmail').value.trim();
  if(!email){$('authMsg').textContent='Informe o mesmo e-mail usado no cadastro.';return}
  $('authMsg').textContent='Reenviando confirmação…';
  try{
    const redirectTo=window.location.origin + window.location.pathname;
    const {error}=await sb.auth.resend({
      type:'signup',
      email,
      options:{emailRedirectTo:redirectTo}
    });
    if(error)throw error;
    $('authMsg').textContent='Novo e-mail de confirmação enviado. Abra somente este e-mail mais recente.';
  }catch(e){
    $('authMsg').textContent='Erro ao reenviar: '+(e.message||e);
  }
}

async function cloudLogout(){
  if(sb)await sb.auth.signOut();
  cloudUser=null;
  records=[];
  costs=[];
  try{renderAll();}catch(e){}
  setCloudStatus('Nuvem: desconectado','warn');
}

const OFFLINE_DIRTY_KEY='gado_offline_dirty_v2';
const DELETED_RECORDS_KEY='gado_deleted_records_v2';
const DELETED_COSTS_KEY='gado_deleted_costs_v2';

function markOfflineDirty(){
  try{userSet(OFFLINE_DIRTY_KEY,'1')}catch(e){}
}
function isOfflineDirty(){
  try{return userGet(OFFLINE_DIRTY_KEY)==='1'}catch(e){return false}
}
function getDeletedIds(key){
  try{return JSON.parse(userGet(key)||'[]')||[]}catch(e){return []}
}
function addDeletedId(key,id){
  let a=getDeletedIds(key);
  if(!a.includes(id))a.push(id);
  try{userSet(key,JSON.stringify(a))}catch(e){}
  markOfflineDirty();
}
function clearOfflineSyncFlags(){
  try{
    userRemove(OFFLINE_DIRTY_KEY);
    userRemove(DELETED_RECORDS_KEY);
    userRemove(DELETED_COSTS_KEY);
  }catch(e){}
}
function mergeById(cloudList,localList,deletedIds){
  const deleted=new Set(deletedIds||[]);
  const map=new Map();

  function stamp(x){
    const t=Date.parse(x&&x.updatedAt||'');
    return Number.isFinite(t)?t:0;
  }

  function put(x,source){
    if(!x||!x.id||deleted.has(x.id))return;
    const old=map.get(x.id);
    if(!old){
      map.set(x.id,{...x,__mergeSource:source});
      return;
    }

    const a=stamp(old), b=stamp(x);

    // If one version has an updatedAt, the newest wins.
    if(b>a){
      var merged={...x};
      ['gtaPdf','notaPdf','paymentPdf'].forEach(function(field){
        if(!merged[field] && old[field])merged[field]=old[field];
      });
      map.set(x.id,{...merged,__mergeSource:source});
      return;
    }
    if(a>b)return;

    // Same/no timestamp: preserve fields from both versions.
    // Local values have priority for newly-added fields such as map coordinates.
    if(source==='local'){
      map.set(x.id,{...old,...x,__mergeSource:'local'});
    }else{
      map.set(x.id,{...x,...old,__mergeSource:old.__mergeSource||'cloud'});
    }
  }

  (cloudList||[]).forEach(x=>put(x,'cloud'));
  (localList||[]).forEach(x=>put(x,'local'));

  return Array.from(map.values()).map(x=>{
    const y={...x};
    delete y.__mergeSource;
    return y;
  });
}

async function cloudLoad(){
  if(!sb||!cloudUser||cloudBusy)return;
  cloudBusy=true;
  try{
    const {data,error}=await sb.from(CLOUD_TABLE).select('records,costs,updated_at').eq('user_id',cloudUser.id).maybeSingle();
    if(error)throw error;

    if(data){
      safetySnapshot('antes-de-mesclar-nuvem');
      const cloudRecords=Array.isArray(data.records)?data.records:[];
      const cloudCosts=Array.isArray(data.costs)?data.costs:[];

      // Never replace the whole local base with the cloud base.
      // Merge record by record and keep the newest edition.
      const beforeRecords=JSON.stringify(records);
      const beforeCosts=JSON.stringify(costs);

      records=mergeById(cloudRecords,records,getDeletedIds(DELETED_RECORDS_KEY));
      costs=mergeById(cloudCosts,costs,getDeletedIds(DELETED_COSTS_KEY));

      userSet(KEY,JSON.stringify(records));
      userSet(COSTKEY,JSON.stringify(costs));
      renderAll();
      try{if(window.refreshReportOptionsV31)window.refreshReportOptionsV31()}catch(e){}
      try{if(window.refreshCattleMapV33)window.refreshCattleMapV33()}catch(e){}

      const mergedChanged =
        beforeRecords!==JSON.stringify(records) ||
        beforeCosts!==JSON.stringify(costs) ||
        isOfflineDirty();

      if(mergedChanged){
        cloudBusy=false;
        await cloudSaveNow();
        return;
      }

      setCloudStatus('Salvo na nuvem ✓','ok');
      $('saveStatus').textContent='Dados sincronizados • '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    }else{
      cloudBusy=false;
      await cloudSaveNow();
      return;
    }
  }catch(e){
    console.error(e);
    setCloudStatus('Erro na nuvem','warn');
  }finally{
    cloudBusy=false;
  }
}
function scheduleCloudSave(){
  if(!sb||!cloudUser)return;
  clearTimeout(cloudTimer);
  setCloudStatus('Salvando na nuvem…','warn');
  cloudTimer=setTimeout(cloudSaveNow,700);
}
async function cloudSaveNow(){
  if(!sb||!cloudUser)return;
  if(cloudBusy){
    clearTimeout(cloudTimer);
    cloudTimer=setTimeout(cloudSaveNow,900);
    return;
  }
  if(!navigator.onLine){
    markOfflineDirty();
    setCloudStatus('Offline • pendente','warn');
    return;
  }
  cloudBusy=true;
  try{
    let savedClients=[];try{savedClients=JSON.parse(userGet('gado_cadastros_v120')||'[]');if(!Array.isArray(savedClients))savedClients=[];}catch(e){}
    const payload={user_id:cloudUser.id,records,costs,clients:savedClients,updated_at:new Date().toISOString()};
    const {error}=await sb.from(CLOUD_TABLE).upsert(payload,{onConflict:'user_id'});
    if(error)throw error;
    clearOfflineSyncFlags();
    setCloudStatus('Salvo na nuvem ✓','ok');
    $('saveStatus').textContent='Dados sincronizados • '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  }catch(e){
    markOfflineDirty();
    console.error(e);
    setCloudStatus('Pendente de sincronização','warn');
  }finally{
    cloudBusy=false;
  }
}


// : handlers de autenticação independentes do fluxo de inicialização
(function(){
  function authMessage(t){ var el=document.getElementById('authMsg'); if(el) el.textContent=t||''; }
  async function doSignupFixed(){
    var email=(document.getElementById('authEmail')||{}).value||'';
    var password=(document.getElementById('authPassword')||{}).value||'';
    email=email.trim();
    if(!email || password.length<6){ authMessage('Informe um e-mail válido e uma senha com pelo menos 6 caracteres.'); return; }
    if(!cloudConfigured()){ authMessage('A nuvem ainda não está configurada.'); return; }
    authMessage('Criando conta...');
    try{
      var cloudUrl='https://bvqttwnxszsduhwiblmv.supabase.co';
      var cloudKey='sb_publishable_OdI3OcT80ETvC82PnzA68Q_nrLXqS_X';
      var r=await fetch(cloudUrl+'/auth/v1/signup',{
        method:'POST',
        headers:{'apikey':cloudKey,'Authorization':'Bearer '+cloudKey,'Content-Type':'application/json'},
        body:JSON.stringify({email:email,password:password})
      });
      var j=await r.json().catch(function(){return {};});
      if(!r.ok) throw new Error(j.msg||j.message||j.error_description||('Erro '+r.status));
      if(j.access_token){
        localStorage.setItem('gado_access_token',j.access_token);
        if(j.refresh_token) localStorage.setItem('gado_refresh_token',j.refresh_token);
        authMessage('Conta criada com sucesso. Entrando...');
        setTimeout(function(){location.reload();},700);
      }else{
        authMessage('Conta criada. Confira seu e-mail para confirmar o cadastro e depois toque em Entrar.');
      }
    }catch(e){ authMessage('Não foi possível criar a conta: '+e.message); }
  }
  function bindFixedAuth(){
    var s=document.getElementById('signUpBtn');
    if(s){ s.onclick=function(e){e.preventDefault();doSignupFixed();}; }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bindFixedAuth);
  else bindFixedAuth();
  setTimeout(bindFixedAuth,1000);
})();


// : login oficial via Supabase, com sessão persistente
(function(){
  async function doLoginFixed(){
    var email=(document.getElementById('authEmail')||{}).value||'';
    var password=(document.getElementById('authPassword')||{}).value||'';
    email=email.trim();
    var msg=document.getElementById('authMsg');
    function say(t){ if(msg) msg.textContent=t; }

    if(!email || password.length<6){
      say('Informe seu e-mail e senha.');
      return;
    }

    var cloudUrl='https://bvqttwnxszsduhwiblmv.supabase.co';
    var cloudKey='sb_publishable_OdI3OcT80ETvC82PnzA68Q_nrLXqS_X';

    try{
      if(!window.supabase) throw new Error('Biblioteca da nuvem não carregou.');
      if(!sb) sb=window.supabase.createClient(cloudUrl,cloudKey);

      say('Entrando...');
      bootLoginApproved=true;
      var result=await sb.auth.signInWithPassword({email:email,password:password});
      if(result.error){
        bootLoginApproved=false;
        throw result.error;
      }

      if(result.data && result.data.session){
        cloudUser=result.data.user||result.data.session.user||null;
        setAuthenticatedUI(true);
        var gate=document.getElementById('loginGate');
        var app=document.getElementById('appShell');
        if(gate) gate.style.display='none';
        if(app) app.style.display='';
        say('Login realizado com sucesso.');
        closeModal('authModal');
        setCloudStatus('Conectado • verificando nuvem…','warn');
        var ssLogin=document.getElementById('saveStatus'); if(ssLogin)ssLogin.textContent='Login confirmado • verificando sincronização';
        if(document.getElementById('loginBtn')) document.getElementById('loginBtn').style.display='none';
        if(document.getElementById('logoutBtn')) document.getElementById('logoutBtn').style.display='';
        await cloudLoad();
      }else{
        say('Login realizado, mas a sessão não foi criada.');
      }
    }catch(e){
      say('Erro ao entrar: '+(e.message||e));
    }
  }

  function bindLoginFixed(){
    var b=document.getElementById('signInBtn');
    if(b){
      b.onclick=function(e){
        e.preventDefault();
        doLoginFixed();
      };
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bindLoginFixed);
  }else{
    bindLoginFixed();
  }
  setTimeout(bindLoginFixed,500);
  setTimeout(bindLoginFixed,1500);
})();



/* inline original */

document.addEventListener('DOMContentLoaded',function(){
  setTimeout(function(){
    var b=document.getElementById('loginBtn');
    if(b){
      b.textContent='Entrar';
      b.onclick=function(){
        var m=document.getElementById('authModal');
        if(m)m.classList.add('show');
      };
    }
  },1200);
});


/* inline original */


/* inline original */

(function(){
  const PENDING='gado_pending_sync_v78';
  const DIRTY='gado_offline_dirty_v2';
  const DELR='gado_deleted_records_v2';
  const DELC='gado_deleted_costs_v2';
  const RETRY='gado_sync_retry_v78';
  const CLIENTS='gado_cadastros_v120';
  let timer=null, busy=false;

  // Migra qualquer fila da v76 e neutraliza a rotina antiga.
  try{
    const oldRaw=userGet('gado_pending_sync_v77')||userGet('gado_pending_sync_v2');
    if(oldRaw && !userGet(PENDING)) userSet(PENDING,oldRaw);
    userRemove('gado_pending_sync_v77');
    userRemove('gado_pending_sync_v2');
  }catch(e){}

  function now(){return new Date().toISOString()}
  function clone(x){return JSON.parse(JSON.stringify(x))}
  function get(base,def=null){try{const v=userGet(base);return v==null?def:JSON.parse(v)}catch(e){return def}}
  function set(base,v){userSet(base,JSON.stringify(v))}
  function del(base){userRemove(base)}
  function deleted(base){const a=get(base,[]);return Array.isArray(a)?a:[]}
  function pending(){return get(PENDING,null)}
  function clients(){return get(CLIENTS,[])}

  function ensureUI(){
    const row=document.querySelector('header .head > div:last-child');
    if(!row)return;
    let s=document.getElementById('offlineStatus');
    if(!s){s=document.createElement('span');s.id='offlineStatus';s.className='cloudpill';row.insertBefore(s,row.firstChild)}
    let b=document.getElementById('syncNowBtn');
    if(!b){b=document.createElement('button');b.id='syncNowBtn';b.type='button';b.className='cloudbtn';b.textContent='Sincronizar agora';b.onclick=()=>sync(true);row.insertBefore(b,s.nextSibling)}
  }
  function ui(text,kind='warn',showButton=false){
    ensureUI();
    const s=document.getElementById('offlineStatus'),b=document.getElementById('syncNowBtn');
    if(s){s.textContent=text;s.className='cloudpill '+kind}
    if(b)b.style.display=showButton?'':'none';
  }
  function localStatus(text){
    const s=document.getElementById('saveStatus');if(s)s.textContent=text;
  }
  function queue(){
    safetySnapshot('v77-antes-de-fila');
    const old=pending();
    set(PENDING,{
      records:clone(Array.isArray(records)?records:[]),
      costs:clone(Array.isArray(costs)?costs:[]),
      clients:clone(clients()),
      queued_at:now(),
      operations:(old&&Number(old.operations)||0)+1
    });
    userSet(DIRTY,'1');
    if(!navigator.onLine)ui('Offline • alteração protegida','warn',true);
    else ui('Salvo no aparelho • enviando…','warn',false);
  }

  function stamp(x){const t=Date.parse(x&&x.updatedAt||'');return Number.isFinite(t)?t:0}
  function merge(cloudList,localList,deletedIds,preferLocal=false){
    const deletedSet=new Set(deletedIds||[]), m=new Map();
    for(const x of (cloudList||[])){if(x&&x.id&&!deletedSet.has(x.id))m.set(x.id,clone(x))}
    for(const x of (localList||[])){
      if(!x||!x.id||deletedSet.has(x.id))continue;
      const old=m.get(x.id);
      if(!old){m.set(x.id,clone(x));continue}
      const a=stamp(old),b=stamp(x);
      if(b>a)m.set(x.id,clone(x));
      else if(b===a && preferLocal)m.set(x.id,{...old,...clone(x)});
    }
    return [...m.values()];
  }

  function verify(localList,remoteList,deletedIds){
    const d=new Set(deletedIds||[]), r=new Map((remoteList||[]).map(x=>[x.id,x]));
    for(const x of (localList||[])){
      if(!x||!x.id||d.has(x.id))continue;
      const y=r.get(x.id); if(!y)return false;
      const lx=stamp(x),ry=stamp(y);
      if(lx && ry<lx)return false;
    }
    for(const id of d){if(r.has(id))return false}
    return true;
  }

  async function authReady(){
    if(!sb||!cloudUser)return false;
    const {data,error}=await sb.auth.getSession();
    if(error)throw error;
    if(!data||!data.session||!data.session.user)return false;
    cloudUser=data.session.user;
    rememberAuthenticatedUser(cloudUser);
    return true;
  }

  async function push(){
    const p=pending();
    if(!p)return true;
    if(!navigator.onLine)return false;
    if(!(await authReady()))throw new Error('Sessão da nuvem indisponível');

    const delR=deleted(DELR),delC=deleted(DELC);
    const {data:current,error:readErr}=await sb.from(CLOUD_TABLE)
      .select('records,costs,clients,updated_at').eq('user_id',cloudUser.id).maybeSingle();
    if(readErr)throw readErr;

    const mergedRecords=merge(current&&Array.isArray(current.records)?current.records:[],p.records||records,delR,true);
    const mergedCosts=merge(current&&Array.isArray(current.costs)?current.costs:[],p.costs||costs,delC,true);
    const mergedClients=merge(current&&Array.isArray(current.clients)?current.clients:[],p.clients||clients(),[],true);
    const sentAt=now();

    const {data:saved,error:saveErr}=await sb.from(CLOUD_TABLE)
      .upsert({user_id:cloudUser.id,records:mergedRecords,costs:mergedCosts,clients:mergedClients,updated_at:sentAt},{onConflict:'user_id'})
      .select('user_id,records,costs,clients,updated_at').single();
    if(saveErr)throw saveErr;
    if(!saved||saved.user_id!==cloudUser.id)throw new Error('Supabase não confirmou o usuário');
    if(!verify(p.records||records,saved.records||[],delR))throw new Error('Supabase não confirmou todos os registros');
    if(!verify(p.costs||costs,saved.costs||[],delC))throw new Error('Supabase não confirmou todos os custos');

    records=merge(saved.records||[],records,delR,false);
    costs=merge(saved.costs||[],costs,delC,false);
    userSet(CLIENTS,JSON.stringify(merge(saved.clients||[],clients(),[],false)));
    userSet(KEY,JSON.stringify(records));
    userSet(COSTKEY,JSON.stringify(costs));
    del(PENDING); userRemove(DIRTY); userRemove(DELR); userRemove(DELC); localStorage.removeItem(RETRY);
    renderAll();
    setCloudStatus('Salvo na nuvem ✓','ok');
    localStatus('Nuvem confirmou • '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
    ui('Online • sincronizado'+(cloudUser&&cloudUser.email?' • '+cloudUser.email:''),'ok',false);
    return true;
  }

  async function pull(){
    if(!navigator.onLine||!(await authReady()))return false;
    const {data,error}=await sb.from(CLOUD_TABLE).select('records,costs,clients,updated_at').eq('user_id',cloudUser.id).maybeSingle();
    if(error)throw error;
    if(!data)return true;

    safetySnapshot('v77-antes-de-ler-nuvem');
    const delR=deleted(DELR),delC=deleted(DELC);
    const mergedR=merge(data.records||[],records,delR,false);
    const mergedC=merge(data.costs||[],costs,delC,false);
    const mergedClients=merge(data.clients||[],clients(),[],false);

    const localHadNewer=JSON.stringify(mergedR)!==JSON.stringify(data.records||[]) ||
                        JSON.stringify(mergedC)!==JSON.stringify(data.costs||[]) ||
                        JSON.stringify(mergedClients)!==JSON.stringify(data.clients||[]);
    records=mergedR; costs=mergedC;
    userSet(CLIENTS,JSON.stringify(mergedClients));
    userSet(KEY,JSON.stringify(records)); userSet(COSTKEY,JSON.stringify(costs)); renderAll();

    if(localHadNewer){
      queue();
      await push();
    }else{
      setCloudStatus('Salvo na nuvem ✓','ok');
      localStatus('Dados sincronizados • '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
      ui('Online • sincronizado'+(cloudUser&&cloudUser.email?' • '+cloudUser.email:''),'ok',false);
    }
    return true;
  }

  async function sync(manual=false){
    if(busy)return;
    if(!navigator.onLine){ui('Offline • dados protegidos','warn',true);return}
    if(!sb||!cloudUser){ui('Online • aguardando login','warn',true);return}
    busy=true; ui('Sincronizando e conferindo…','warn',false);
    try{
      if(pending())await push();
      else await pull();
    }catch(e){
      console.error('SYNC V77',e);
      setCloudStatus('Pendente de sincronização','warn');
      localStatus('Salvo no aparelho • nuvem ainda não confirmou');
      ui('Pendente • dados protegidos','warn',true);
      scheduleRetry();
      if(manual)alert('A nuvem ainda não confirmou. A alteração continua protegida neste aparelho.');
    }finally{busy=false}
  }

  function scheduleRetry(){
    if(timer||!navigator.onLine||!pending())return;
    let n=Number(localStorage.getItem(RETRY)||0)+1;localStorage.setItem(RETRY,String(n));
    const ms=Math.min(30000,[1000,2500,5000,10000,20000,30000][Math.min(n-1,5)]);
    timer=setTimeout(()=>{timer=null;sync(false)},ms);
  }

  // Único ponto de persistência: primeiro aparelho, depois nuvem confirmada.
  persist=function(){
    safetySnapshot('v77-antes-de-salvar');
    userSet(KEY,JSON.stringify(records));
    userSet(COSTKEY,JSON.stringify(costs));
    queue();
    localStatus('Salvo no aparelho • aguardando confirmação da nuvem');
    clearTimeout(cloudTimer);
    cloudTimer=setTimeout(()=>sync(false),250);
    try{if(window.refreshCattleMapV33)window.refreshCattleMapV33()}catch(e){}
  };
  scheduleCloudSave=function(){clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>sync(false),250)};
  cloudSaveNow=async function(){if(!pending())queue();await sync(false)};
  cloudLoad=async function(){
    if(pending())await sync(false);
    else await pull();
  };

  function flush(){
    // Fechar o app NAO cria uma nova fila. A fila ja e criada no persist() quando existe mudanca real.
    // Isso evita que um aparelho com copia antiga envie estado velho antes de puxar a nuvem.
    try{
      userSet(KEY,JSON.stringify(records));
      userSet(COSTKEY,JSON.stringify(costs));
    }catch(e){}
  }
  window.addEventListener('pagehide',flush);
  window.addEventListener('beforeunload',flush);
  window.addEventListener('online',()=>setTimeout(()=>sync(false),200));
  window.addEventListener('focus',()=>{if(navigator.onLine)setTimeout(()=>sync(false),150)});
  window.addEventListener('offline',()=>ui('Offline • dados protegidos','warn',true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine)sync(false)});
  // v78: mesmo sem alteracao local, consulta a nuvem periodicamente para receber mudancas de outro aparelho.
  /* v96: polling legado desativado; sincronização fica por alteração/reconexão */
  ensureUI();
  if(navigator.onLine)ui(pending()?'Online • pendente':'Online','warn',!!pending());
  else ui('Offline • dados protegidos','warn',true);
  window.syncPendingNow=sync;
})();


/* inline original */

(function(){
  function abrirLogin(){
    var m = document.getElementById('authModal');
    if (m) m.classList.add('show');
  }

  function bind(){
    var centro = document.getElementById('gateLoginBtn');
    var topo = document.getElementById('loginBtn');

    if (centro) {
      centro.onclick = function(e){
        if (e) e.preventDefault();
        abrirLogin();
      };
    }

    if (topo && topo.textContent.trim() === 'Entrar') {
      topo.onclick = function(e){
        if (e) e.preventDefault();
        abrirLogin();
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  setTimeout(bind, 300);
  setTimeout(bind, 1000);
})();


/* inline original */

(function(){
  const OFFLINE_AUTH_KEY = 'gado_offline_auth_v1';

  function markOfflineAuthorized(user){
    try{
      localStorage.setItem(OFFLINE_AUTH_KEY, JSON.stringify({
        ok:true,
        userId:user && user.id ? user.id : '',
        at:new Date().toISOString()
      }));
    }catch(e){}
  }

  function hasOfflineAuthorization(){
    try{
      const x = JSON.parse(localStorage.getItem(OFFLINE_AUTH_KEY) || 'null');
      return !!(x && x.ok);
    }catch(e){
      return false;
    }
  }

  function showOfflineApp(){
    if(!hasOfflineAuthorization()) return false;

    try{
      const a=JSON.parse(localStorage.getItem(OFFLINE_AUTH_KEY)||'null');
      if(a&&a.userId){
        localStorage.setItem(LAST_USER_KEY,a.userId);
      }
      if(typeof loadScopedLocalData==='function') loadScopedLocalData();
      if(typeof setAuthenticatedUI === 'function') setAuthenticatedUI(true);
    }catch(e){}

    var gate = document.getElementById('loginGate');
    var app = document.getElementById('appShell');
    var login = document.getElementById('loginBtn');
    var logout = document.getElementById('logoutBtn');

    if(gate) gate.style.display='none';
    if(app) app.style.display='';
    if(login) login.style.display='none';
    if(logout) logout.style.display='';

    try{
      if(typeof setCloudStatus === 'function'){
        setCloudStatus('Offline • dados locais','warn');
      }
    }catch(e){}

    var s = document.getElementById('saveStatus');
    if(s) s.textContent='Modo offline • alterações serão sincronizadas depois';

    return true;
  }

  // Intercepta sessões válidas para autorizar acesso offline futuro.
  const waitForAuth = setInterval(function(){
    try{
      if(window.sb && window.sb.auth){
        clearInterval(waitForAuth);

        window.sb.auth.getSession().then(function(res){
          var session = res && res.data && res.data.session;
          if(session && session.user){ rememberAuthenticatedUser(session.user); markOfflineAuthorized(session.user); }
          else if(!navigator.onLine) showOfflineApp();
        }).catch(function(){
          if(!navigator.onLine) showOfflineApp();
        });

        window.sb.auth.onAuthStateChange(function(event, session){
          if(session && session.user){
            markOfflineAuthorized(session.user);
          }
        });
      }
    }catch(e){}
  },300);

  // Ao abrir sem internet, libera o app se esse aparelho já teve login válido.
  function bootOffline(){
    if(!navigator.onLine){
      showOfflineApp();
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bootOffline);
  }else{
    bootOffline();
  }

  // Quando cair a conexão durante o uso, mantém o app aberto.
  window.addEventListener('offline', function(){
    if(hasOfflineAuthorization()) showOfflineApp();
  });

  // Quando voltar internet, tenta retomar a sincronização.
  window.addEventListener('online', function(){
    try{
      if(typeof initCloud === 'function') initCloud();
    }catch(e){}
    try{
      if(typeof cloudLoad === 'function') setTimeout(cloudLoad, 900);
    }catch(e){}
  });
})();


/* inline original */

(function(){
  const OFFLINE_AUTH_KEY='gado_offline_auth_v1';

  function saveOfflineOk(userId){
    try{
      localStorage.setItem(OFFLINE_AUTH_KEY, JSON.stringify({
        ok:true,
        userId:userId||'',
        at:new Date().toISOString()
      }));
    }catch(e){}
  }

  function hasSupabaseSavedSession(){
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i)||'';
        if(k.indexOf('sb-')===0 && k.indexOf('-auth-token')>0){
          const raw=localStorage.getItem(k);
          if(raw && raw.length>20) return true;
        }
      }
    }catch(e){}
    return false;
  }

  function offlineAllowed(){
    try{
      const x=JSON.parse(localStorage.getItem(OFFLINE_AUTH_KEY)||'null');
      if(x && x.ok) return true;
    }catch(e){}
    return hasSupabaseSavedSession();
  }

  function openAppOffline(){
    if(!offlineAllowed()) return false;

    saveOfflineOk('');

    var gate=document.getElementById('loginGate');
    var app=document.getElementById('appShell');
    var login=document.getElementById('loginBtn');
    var logout=document.getElementById('logoutBtn');

    if(gate) gate.style.display='none';
    if(app) app.style.display='';
    if(login) login.style.display='none';
    if(logout) logout.style.display='';

    try{
      if(typeof setCloudStatus==='function'){
        setCloudStatus('Offline • dados locais','warn');
      }
    }catch(e){}

    var st=document.getElementById('saveStatus');
    if(st) st.textContent='Modo offline • sincroniza quando a internet voltar';

    return true;
  }

  function showLoginMessage(text){
    var el=document.getElementById('authMsg');
    if(el) el.textContent=text;
  }

  // Se o aparelho já tinha sessão válida de versões anteriores, autoriza offline.
  if(hasSupabaseSavedSession()) saveOfflineOk('');

  // Sem internet: abre diretamente, sem tentar falar com a nuvem.
  function offlineBoot(){
    if(!navigator.onLine){
      if(!openAppOffline()){
        showLoginMessage('Este aparelho precisa fazer o primeiro login com internet antes de usar offline.');
      }
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',offlineBoot);
  }else{
    offlineBoot();
  }

  // Reforça o botão central.
  function bindGate(){
    var btn=document.getElementById('gateLoginBtn');
    if(!btn) return;
    btn.onclick=function(e){
      if(e)e.preventDefault();

      if(!navigator.onLine){
        if(openAppOffline()) return;
        var m=document.getElementById('authModal');
        if(m)m.classList.add('show');
        showLoginMessage('Sem internet. Faça o primeiro login online neste aparelho; depois o acesso offline ficará liberado.');
        return;
      }

      var m=document.getElementById('authModal');
      if(m)m.classList.add('show');
    };
  }

  // Após login online bem-sucedido, detecta o app aberto e grava a autorização local.
  const authWatcher=setInterval(function(){
    try{
      var app=document.getElementById('appShell');
      if(app && app.style.display!=='none'){
        if(navigator.onLine){
          saveOfflineOk(window.cloudUser && window.cloudUser.id ? window.cloudUser.id : '');
        }
      }
    }catch(e){}
  },700);

  window.addEventListener('offline',function(){
    openAppOffline();
  });

  window.addEventListener('online',function(){
    try{
      setCloudStatus('Reconectando…','warn');
      if(sb && sb.auth){
        setTimeout(async function(){
          try{
            var result=await sb.auth.getSession();
            var session=result&&result.data&&result.data.session;
            if(session&&session.user){
              cloudUser=session.user;
              bootLoginApproved=true;
              rememberAuthenticatedUser(session.user);
              setAuthenticatedUI(true);
              await cloudLoad();
              return;
            }
            var refreshed=await sb.auth.refreshSession();
            session=refreshed&&refreshed.data&&refreshed.data.session;
            if(session&&session.user){
              cloudUser=session.user;
              bootLoginApproved=true;
              rememberAuthenticatedUser(session.user);
              setAuthenticatedUI(true);
              await cloudLoad();
            }
          }catch(e){
            console.warn('v102 web reconnect',e);
          }
        },300);
      }
    }catch(e){}
  });

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bindGate);
  }else{
    bindGate();
  }
  setTimeout(bindGate,500);
  setTimeout(bindGate,1500);
})();


/* inline original */

(function(){
  function getRecords(){
    try{
      if(typeof records !== 'undefined' && Array.isArray(records)) return records;
    }catch(e){}
    try{
      var r = JSON.parse(localStorage.getItem('controle_gado_v2_records') || '[]');
      return Array.isArray(r) ? r : [];
    }catch(e){}
    return [];
  }

  function uniq(arr){
    return [...new Set(
      arr.map(function(v){ return String(v || '').trim(); }).filter(Boolean)
    )].sort(function(a,b){ return a.localeCompare(b,'pt-BR'); });
  }

  function fillSelect(id, values, label){
    var el = document.getElementById(id);
    if(!el) return;

    var current = el.value;
    var html = '<option value="">' + label + '</option>';

    values.forEach(function(v){
      var safe = String(v)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/"/g,'&quot;');
      html += '<option value="' + safe + '">' + safe + '</option>';
    });

    el.innerHTML = html;

    if(values.indexOf(current) >= 0){
      el.value = current;
    }
  }

  function refreshOptions(){
    var r = getRecords();

    fillSelect(
      'reportYearFilter',
      uniq(r.map(function(x){ return String(x.data || '').slice(0,4); })),
      'Todos os anos'
    );

    fillSelect(
      'reportCategoryFilter',
      uniq(r.map(function(x){ return x.era || ''; })),
      'Todas as categorias'
    );

    fillSelect('reportClientFilter', uniq(r.flatMap(function(x){ return [x.comprador || '', x.vendedor || '']; })), 'Todos os clientes');

    fillSelect(
      'reportBrandFilter',
      uniq(r.map(function(x){ return x.marca || ''; })),
      'Todas as marcas'
    );


    fillSelect(
      'reportPartnerFilter',
      uniq(r.map(function(x){ return x.parceiro || ''; })),
      'Todos os intermediários'
    );
  }

  window.refreshReportOptionsV31 = refreshOptions;

  function apply(){
    refreshOptions();
    try{
      if(typeof renderReports === 'function') renderReports();
    }catch(e){}
  }

  function bind(){
    var ids = [
      'reportDateFrom','reportDateTo','reportYearFilter','reportCategoryFilter',
      'reportClientFilter','reportBrandFilter','reportPartnerFilter',
      'reportStatusFilter','reportPgSellerFilter','reportPgBuyerFilter','reportStockFilter','reportTypeFilter'
    ];

    ids.forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.onchange = apply;
    });

    var clear = document.getElementById('clearReportFilters');
    if(clear){
      clear.onclick = function(){
        ids.forEach(function(id){
          var el = document.getElementById(id);
          if(el) el.value = '';
        });
        apply();
      };
    }

    document.querySelectorAll('.tabbtn').forEach(function(btn){
      if(btn.dataset && btn.dataset.tab === 'relatorios'){
        btn.addEventListener('click', function(){
          setTimeout(apply, 120);
        });
      }
    });

    refreshOptions();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bind);
  }else{
    bind();
  }

  // Mantém as listas sincronizadas enquanto nuvem/local terminam de carregar.
  var lastSignature = '';
  var attempts = 0;
  var timer = setInterval(function(){
    attempts++;
    var r = getRecords();
    var signature = r.length + '|' +
      r.map(function(x){
        return [x.data,x.comprador,x.marca,x.vendedor,x.parceiro,x.era].join('~');
      }).join('|');

    if(signature !== lastSignature){
      lastSignature = signature;
      refreshOptions();
    }

    if(attempts >= 30){
      clearInterval(timer);
    }
  }, 1000);
})();


/* inline original */

(function(){
  function clean(v){
    return String(v==null?'':v)
      .replace(/[–—]/g,'-')
      .replace(/\r?\n/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function latin1(s){
    s=clean(s);
    var out='';
    for(var i=0;i<s.length;i++){
      var c=s.charCodeAt(i);
      if(c<=255) out+=String.fromCharCode(c);
      else out+='?';
    }
    return out;
  }

  function pdfEscape(s){
    return latin1(s)
      .replace(/\\/g,'\\\\')
      .replace(/\(/g,'\\(')
      .replace(/\)/g,'\\)');
  }

  function cut(s,n){
    s=clean(s);
    return s.length>n?s.slice(0,n-1)+'…':s;
  }

  function selectedFilters(){
    var pairs=[
      ['Ano','reportYearFilter'],
      ['Categoria','reportCategoryFilter'],
      ['Cliente','reportClientFilter'],
      ['Marca','reportBrandFilter'],
      ['Intermediario','reportPartnerFilter'],
      ['Status','reportStatusFilter']
    ];
    var arr=[];
    pairs.forEach(function(p){
      var el=document.getElementById(p[1]);
      if(el && el.value){
        var txt=el.tagName==='SELECT' ? el.options[el.selectedIndex].text : el.value;
        arr.push(p[0]+': '+txt);
      }
    });
    var di=document.getElementById('reportDateFrom')?.value||'';
    var df=document.getElementById('reportDateTo')?.value||'';
    if(di)arr.unshift('De: '+fmtDate(di));
    if(df)arr.unshift('Ate: '+fmtDate(df));
    return arr.length?arr.join(' | '):'Todos os registros';
  }

  function makePdf(){
    if(typeof reportFilteredRecords!=='function'){
      alert('Não foi possível acessar os dados filtrados.');
      return;
    }

    var list=reportFilteredRecords();
    var z=totals(list);

    // Landscape A4 in points.
    var W=842, H=595;
    var margin=26;
    var rowH=26;
    var rowsPerPage=25;

    var pages=[];
    /* Most sales can draw from several purchase lots. Keep one PDF row per
       source lot so the report identifies every lot without duplicating totals
       in the summary. */
    var expanded=[];
    list.forEach(function(r){
      var lots=(Array.isArray(r.animalLotsSold)&&r.animalLotsSold.length)?r.animalLotsSold:(Array.isArray(r.sourceLots)?r.sourceLots:[]);
      if(!lots.length){ expanded.push(r); return; }
      var allNums=Array.isArray(r.animalNumbersSold)?r.animalNumbersSold:(Array.isArray(r.numerosAnimaisVendidos)?r.numerosAnimaisVendidos:[]),numberCursor=0;
      lots.forEach(function(x){
        var qty=Number(x.quantity||x.quantidade||0);
        var lot=(records||[]).find(function(z){return z.id===(x.lotId||x.id)})||{};
        expanded.push({...r,quantCompra:qty,precoCompra:Number(lot.precoCompra||r.precoCompra||0),quantVenda:qty,totalLotSale:qty*Number(r.precoVenda||0),animalNumbersSold:allNums.slice(numberCursor,numberCursor+qty).filter(function(n){return /^\d+$/.test(String(n))}),vendedor:lot.vendedor||r.vendedor, data:lot.data||r.data, era:lot.era||r.era, pesoKg:lot.pesoKg||r.pesoKg});
        numberCursor+=qty;
      });
    });
    z=totals(expanded);
    var sorted=expanded.sort(function(a,b){
      return String(b.data||'').localeCompare(String(a.data||''));
    });

    if(!sorted.length) sorted=[null];

    for(var start=0; start<sorted.length; start+=rowsPerPage){
      var chunk=sorted.slice(start,start+rowsPerPage);
      var cmds=[];

      function text(x,y,size,str,bold){
        cmds.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+x+' '+y+' Td ('+pdfEscape(str)+') Tj ET');
      }

      function line(x1,y1,x2,y2){
        cmds.push('0.82 G 0.5 w '+x1+' '+y1+' m '+x2+' '+y2+' l S');
      }

      text(margin,H-34,18,'Compra e Venda de Gado',true);
      text(margin,H-50,9,'Relatorio filtrado - '+new Date().toLocaleDateString('pt-BR'),false);
      text(margin,H-66,8,cut(selectedFilters(),150),false);

      // Summary
      var sy=H-90;
      text(margin,sy,9,'Compradas: '+num.format(z.qc),true);
      text(150,sy,9,'Vendidas: '+num.format(z.qv),true);
      text(270,sy,9,'Estoque: '+num.format(z.est),true);
      text(375,sy,9,'Compras: '+money.format(z.comp),true);
      text(540,sy,9,'Vendas: '+money.format(z.vend),true);
      text(690,sy,9,'Lucro: '+money.format(z.luc),true);

      var y=H-120;
      line(margin,y+8,W-margin,y+8);

      var cols=[
        [margin,44,'Data'],[74,72,'Vendedor'],[149,46,'Categoria'],[199,62,'Cliente'],[264,42,'Marca'],[309,34,'Comp.'],[344,34,'Vend.'],[379,42,'Peso kg'],[424,30,'@'],[459,70,'Total venda'],[534,64,'Lucro'],[603,112,'Nº animais'],[719,70,'Status']
      ];

      cols.forEach(function(c){text(c[0],y,7,c[2],true)});
      y-=rowH;

      chunk.forEach(function(r){
        if(!r){
          text(margin,y,9,'Nenhum resultado para os filtros selecionados.',false);
          y-=rowH;
          return;
        }
        var c=calc(r);
        var vals=[
          cut(fmtDate(r.data),10),
          cut(String((r.vendedor||'-')+(r.totalLotSale!=null?' • lote':'')).replace(/\?/g,''),18),
          cut(r.era||'-',12),
          cut(String(r.comprador||'-').replace(/\?/g,''),19),
          cut(String(r.marca||'-').replace(/\?/g,''),13),
          cut(num.format(c.qc),8),
          cut(num.format(c.sold),8),
          cut(num.format(c.kg),8),
          cut(num.format(c.at),7),
          cut(money.format(r.totalLotSale!=null?r.totalLotSale:c.totalV),13),
          cut(money.format(c.lucro),15),
          cut((Array.isArray(r.animalNumbersSold)?r.animalNumbersSold:(Array.isArray(r.numerosAnimaisVendidos)?r.numerosAnimaisVendidos:[])).filter(function(n){return /^\d+$/.test(String(n))}).join(', ')||'-',16),
          cut(c.status||'-',10)
        ];
        vals.forEach(function(v,i){text(cols[i][0],y,7,v,false)});
        var pay=String(r.paymentSell||r.formaPagamentoVenda||'').trim()||'Não informado';
        var inst=Array.isArray(r.installments)?r.installments:(Array.isArray(r.parcelas)?r.parcelas:[]);
        var parts=inst.map(function(x,i){return (i+1)+'ª '+((x.date||x.vencimento)?fmtDate(x.date||x.vencimento):'sem data')+' '+money.format(n(x.value||x.valor))+' '+(x.paid?'pago':'em aberto')}).join(' | ')||'Sem parcelas';
        text(margin,y-9,6,'Compra/cab: '+money.format(c.pc)+' | Venda/cab: '+money.format(c.pv)+' | Lucro: '+money.format(c.lucro)+' | '+pay+' | Parcelas: '+parts,false);
        line(margin,y-14,W-margin,y-14);
        y-=rowH;
      });

      text(W-130,20,7,'Pagina '+(pages.length+1),false);
      pages.push(cmds.join('\n'));
    }

    // PDF object builder
    var objects=[null];
    function add(obj){objects.push(obj);return objects.length-1}

    var font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    var font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

    var pageIds=[];
    var contentIds=[];

    pages.forEach(function(stream){
      var content='<< /Length '+latin1(stream).length+' >>\nstream\n'+stream+'\nendstream';
      contentIds.push(add(content));
      pageIds.push(add('PLACEHOLDER'));
    });

    var pagesId=add('PLACEHOLDER_PAGES');
    var catalogId=add('<< /Type /Catalog /Pages '+pagesId+' 0 R >>');

    pageIds.forEach(function(pid,i){
      objects[pid]='<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 '+font1+' 0 R /F2 '+font2+' 0 R >> >> /Contents '+contentIds[i]+' 0 R >>';
    });

    objects[pagesId]='<< /Type /Pages /Kids ['+pageIds.map(function(id){return id+' 0 R'}).join(' ')+'] /Count '+pageIds.length+' >>';

    var pdf='%PDF-1.4\n%âãÏÓ\n';
    var offsets=[0];

    for(var i=1;i<objects.length;i++){
      offsets[i]=pdf.length;
      pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n';
    }

    var xref=pdf.length;
    pdf+='xref\n0 '+objects.length+'\n';
    pdf+='0000000000 65535 f \n';
    for(var j=1;j<objects.length;j++){
      pdf+=String(offsets[j]).padStart(10,'0')+' 00000 n \n';
    }
    pdf+='trailer\n<< /Size '+objects.length+' /Root '+catalogId+' 0 R >>\nstartxref\n'+xref+'\n%%EOF';

    var bytes=new Uint8Array(pdf.length);
    for(var k=0;k<pdf.length;k++) bytes[k]=pdf.charCodeAt(k)&255;

    var encoded='';
    for(var bi=0;bi<bytes.length;bi++) encoded+=String.fromCharCode(bytes[bi]);
    var doc={name:'relatorio_compra_venda_gado_'+new Date().toISOString().slice(0,10)+'.pdf',data:'data:application/pdf;base64,'+btoa(encoded)};
    window.__pdfDocsV85=window.__pdfDocsV85||{};
    var pdfId='report-'+Date.now();
    window.__pdfDocsV85[pdfId]=doc;
    if(typeof window.openStoredPdfV85==='function') window.openStoredPdfV85(pdfId);
    else { var blob=new Blob([bytes],{type:'application/pdf'}); window.open(URL.createObjectURL(blob),'_blank'); }
  }

  function bind(){
    var b=document.getElementById('generateReportPdf');
    if(b){
      b.textContent='Gerar PDF';
      b.onclick=makePdf;
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bind);
  }else{
    bind();
  }
  setTimeout(bind,700);
})();


/* inline original */

(function(){
let map,group,osm,sat,marks=[];
const R=()=>{try{return Array.isArray(records)?records:[]}catch(e){return[]}};
const uniq=a=>[...new Set(a.map(v=>String(v||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
function fill(id,vals,label){let e=document.getElementById(id);if(!e)return;let cur=e.value;e.innerHTML='<option value="">'+label+'</option>'+vals.map(v=>'<option>'+v+'</option>').join('');if(vals.includes(cur))e.value=cur}
function filters(){let r=R();fill('mapYearFilter',uniq(r.map(x=>String(x.data||'').slice(0,4))),'Todos os anos');fill('mapSellerFilter',uniq(r.map(x=>x.vendedor)),'Todos os vendedores');fill('mapBuyerFilter',uniq(r.map(x=>x.comprador)),'Todos os compradores');fill('mapCategoryFilter',uniq(r.map(x=>x.era)),'Todas as categorias')}
function list(){let y=mapYearFilter.value,s=mapSellerFilter.value,b=mapBuyerFilter.value,c=mapCategoryFilter.value;return R().filter(r=>(!y||String(r.data||'').startsWith(y))&&(!s||r.vendedor===s)&&(!b||r.comprador===b)&&(!c||r.era===c))}
function popup(r,t){
  let c=calc(r);

  let farm=t==='origem'
    ? (r.originFarm||'Fazenda de origem não informada')
    : (r.destFarm||'Fazenda de destino não informada');

  let city=t==='origem'
    ? [r.originCity,r.originState].filter(Boolean).join(' - ')
    : [r.destCity,r.destState].filter(Boolean).join(' - ');

  let person=t==='origem'
    ? (r.vendedor||'Vendedor não informado')
    : (r.comprador||'Comprador não informado');

  let role=t==='origem'?'Vendedor':'Comprador';
  let typeLabel=t==='origem'?'Origem / Compra':'Destino / Venda';
  let qty=t==='origem'?c.qc:c.sold;
  let value=t==='origem'?c.totalC:c.totalV;

  return '<div class="map-popup">'+
    '<div class="map-popup-title">'+farm+'</div>'+
    '<div class="map-popup-type '+(t==='origem'?'origin':'dest')+'">📍 '+typeLabel+'</div>'+
    '<div class="map-popup-grid">'+
      '<b>'+role+'</b><span>'+person+'</span>'+
      '<b>Marca</b><span>'+(r.marca||'—')+'</span>'+
      '<b>Município/UF</b><span>'+(city||'—')+'</span>'+
      '<b>Data</b><span>'+fmtDate(r.data)+'</span>'+
      '<b>Categoria</b><span>'+(r.era||'—')+'</span>'+
      '<b>Cabeças</b><span>'+num.format(qty)+'</span>'+
      '<b>Valor</b><span>'+money.format(value)+'</span>'+
      '<b>Intermediário</b><span>'+(r.parceiro||'—')+'</span>'+
    '</div>'+
  '</div>';
}
function init(){if(map||!window.L)return;map=L.map('cattleMap').setView([-7.19,-48.2],6);osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19});group=L.layerGroup().addTo(map)}
function draw(){if(!map)return;group.clearLayers();marks=[];var cadastros=[];try{cadastros=JSON.parse((window.userGet?userGet('gado_cadastros_v120'):localStorage.getItem('gado_cadastros_v120'))||'[]')}catch(e){}cadastros.forEach(function(x){var la=Number(x.lat),lo=Number(x.lng);if(!Number.isFinite(la)||!Number.isFinite(lo))return;var nome=String(x.nome||'Cliente').trim(),rel=(typeof records!=='undefined'?records:[]).map(function(r){var vendedor=String(r.vendedor||'').trim(),comprador=String(r.comprador||'').trim(),tipo=vendedor===nome?'Compra':comprador===nome?'Venda':'';if(!tipo)return null;var c=calc(r),q=tipo==='Compra'?c.qc:c.qv,total=tipo==='Compra'?c.totalC:c.totalV;return q>0?{r:r,c:c,tipo:tipo,q:q,total:total}:null;}).filter(Boolean);var rows=rel.map(function(item){return '<tr><td>'+fmtDate(item.r.data)+'</td><td>'+item.tipo+'</td><td>'+esc(item.r.era||'—')+'</td><td>'+num.format(item.q)+'</td><td>'+money.format(item.total)+'</td></tr>';}).join('');var html='<b>Cliente cadastrado</b><br>'+esc(nome)+'<br><br><b>Histórico de compras e vendas</b><table class="smalltbl" style="margin-top:6px"><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Qtd</th><th>Valor</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5">Nenhuma negociação encontrada.</td></tr>')+'</tbody></table>';var cm=L.circleMarker([la,lo],{radius:10,color:'#7a4a16',fillColor:'#e3a23b',fillOpacity:.95,weight:3}).bindTooltip('📍 '+nome,{direction:'top',sticky:true,opacity:1}).bindPopup(html,{autoPan:true,keepInView:true,maxWidth:520,className:'cattle-popup'}).addTo(group);marks.push(cm);});mapKpis.innerHTML=[['Clientes no mapa',marks.length],['Negociações',typeof records!=='undefined'?records.length:0],['Pontos',marks.length]].map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>'}).join('');if(marks.length)map.fitBounds(L.featureGroup(marks).getBounds().pad(.15),{maxZoom:12});if(mapOfflineNotice)mapOfflineNotice.style.display=navigator.onLine?'none':'block'}
function loc(a,b){navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{document.getElementById(a).value=p.coords.latitude.toFixed(6);document.getElementById(b).value=p.coords.longitude.toFixed(6)},()=>alert('Não foi possível obter sua localização.')):alert('Localização não disponível.')}
function bind(){var ol=document.getElementById('originLocationBtn'),dl=document.getElementById('destLocationBtn'),mn=document.getElementById('mapNormalBtn'),ms=document.getElementById('mapSatelliteBtn');if(ol)ol.onclick=()=>loc('roriginLat','roriginLng');if(dl)dl.onclick=()=>loc('rdestLat','rdestLng');['mapYearFilter','mapTypeFilter','mapSellerFilter','mapBuyerFilter','mapCategoryFilter'].forEach(id=>{var e=document.getElementById(id);if(e)e.onchange=draw});if(mn)mn.onclick=()=>{if(map){if(map.hasLayer(sat))map.removeLayer(sat);if(!map.hasLayer(osm))osm.addTo(map)}};if(ms)ms.onclick=()=>{if(map){if(map.hasLayer(osm))map.removeLayer(osm);if(!map.hasLayer(sat))sat.addTo(map)}};document.querySelectorAll('.tabbtn').forEach(b=>{if(b.dataset.tab==='mapa')b.addEventListener('click',()=>setTimeout(()=>{init();if(map)map.invalidateSize();draw()},120))});filters()}
window.refreshCattleMapV33=()=>{try{if(!map)init();setTimeout(function(){if(map&&map.invalidateSize)map.invalidateSize(true);draw()},60)}catch(e){}};
 document.addEventListener('clientesAtualizados',function(){setTimeout(function(){try{if(map){if(map.invalidateSize)map.invalidateSize(true);draw()}}catch(e){}},150)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();


/* inline original */

(function(){
  let pickMap=null, marker=null, osm=null, sat=null;
  let target='origem', lat=null, lng=null;

  function el(id){ return document.getElementById(id); }

  function openPickerModal(){
    var m=el('mapPickModal');
    if(m)m.classList.add('show');

    // Keep the negotiation editor open underneath.
    var editor=el('recordModal');
    if(target!=='cliente' && editor && !editor.classList.contains('show')){
      editor.classList.add('show');
    }
  }

  function closePickerModal(){
    var m=el('mapPickModal');
    if(m)m.classList.remove('show');

    // Explicitly keep record edit modal open after closing map.
    var editor=el('recordModal');
    if(target!=='cliente' && editor)editor.classList.add('show');
  }

  function showCoords(){
    var c=el('pickCoords');
    if(!c)return;
    if(lat==null||lng==null){
      c.textContent='Toque no mapa para marcar a fazenda.';
    }else{
      c.textContent='Ponto marcado • Latitude: '+lat.toFixed(6)+' • Longitude: '+lng.toFixed(6);
    }
  }

  function setPoint(a,b,zoom){
    a=Number(a); b=Number(b);
    if(!Number.isFinite(a)||!Number.isFinite(b))return;

    lat=a; lng=b;

    if(!marker){
      marker=L.marker([lat,lng],{draggable:true}).addTo(pickMap);
      marker.on('dragend',function(){
        var p=marker.getLatLng();
        lat=p.lat; lng=p.lng;
        showCoords();
      });
    }else{
      marker.setLatLng([lat,lng]);
    }

    if(zoom)pickMap.setView([lat,lng],zoom);
    showCoords();
  }

  function initMap(){
    if(pickMap||!window.L)return;

    pickMap=L.map('farmPickMap',{
      tap:true,
      touchZoom:true,
      doubleClickZoom:true,
      zoomControl:true
    }).setView([-7.19,-48.20],6);

    osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'© OpenStreetMap'
    });

    sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
      maxZoom:19,
      attribution:'Tiles © Esri'
    });

    osm.addTo(pickMap);

    pickMap.on('click',function(e){
      setPoint(e.latlng.lat,e.latlng.lng,false);
    });
  }

  function start(type){
    target=type;

    var title=el('mapPickTitle');
    if(title){
      title.textContent=
        type==='cliente'
        ? 'Marcar localização do cliente'
        : (type==='origem' ? 'Marcar fazenda de origem / compra' : 'Marcar fazenda de destino / comprador');
    }

    openPickerModal();

    setTimeout(function(){
      initMap();
      if(!pickMap)return;

      pickMap.invalidateSize(true);
      setTimeout(function(){if(pickMap){pickMap.invalidateSize(true);pickMap.eachLayer(function(layer){if(layer&&layer.redraw)layer.redraw()});}},600);

      var latField=el(type==='origem'?'roriginLat':'rdestLat');
      var lngField=el(type==='origem'?'roriginLng':'rdestLng');

      var a=latField?Number(latField.value):NaN;
      var b=lngField?Number(lngField.value):NaN;

      if(latField && lngField && latField.value!=='' && lngField.value!=='' && Number.isFinite(a) && Number.isFinite(b)){
        setPoint(a,b,15);
      }else{
        lat=null; lng=null;
        if(marker){
          pickMap.removeLayer(marker);
          marker=null;
        }
        showCoords();
      }
    },250);
  }

  function confirmPoint(){
    if(lat==null||lng==null){
      alert('Toque no mapa para marcar a fazenda antes de confirmar.');
      return;
    }

    if(target==='cliente'){try{var list=JSON.parse((window.userGet?userGet('gado_cadastros_v120'):localStorage.getItem('gado_cadastros_v120'))||'[]');var item=list.find(function(x){return x.id===window.__clientMapId});if(item){item.lat=lat.toFixed(6);item.lng=lng.toFixed(6);if(window.userSet)userSet('gado_cadastros_v120',JSON.stringify(list));else localStorage.setItem('gado_cadastros_v120',JSON.stringify(list));document.dispatchEvent(new CustomEvent('clientesAtualizados'));}}catch(e){} closePickerModal();var cb=document.querySelector('.tabbtn[data-tab="cadastrosV120"]');var cs=document.getElementById('cadastrosV120');if(cb&&cs){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});cb.classList.add('active');cs.classList.add('active');}return;}
    var latField=el(target==='origem'?'roriginLat':'rdestLat');
    var lngField=el(target==='origem'?'roriginLng':'rdestLng');

    if(latField)latField.value=lat.toFixed(6);
    if(lngField)lngField.value=lng.toFixed(6);

    if(latField){
      latField.dispatchEvent(new Event('input',{bubbles:true}));
      latField.dispatchEvent(new Event('change',{bubbles:true}));
    }
    if(lngField){
      lngField.dispatchEvent(new Event('input',{bubbles:true}));
      lngField.dispatchEvent(new Event('change',{bubbles:true}));
    }

    closePickerModal();

    // Return focus to the same negotiation editor.
    setTimeout(function(){
      var editor=el('recordModal');
      if(editor)editor.classList.add('show');
    },50);
  }

  window.openClientMapPicker=function(item){window.__clientMapId=item&&item.id;var rm=el('recordModal');if(rm)rm.classList.remove('show');var cb=document.querySelector('.tabbtn[data-tab="cadastrosV120"]'),cs=el('cadastrosV120');if(cb&&cs){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});cb.classList.add('active');cs.classList.add('active');}start('cliente');};

  function useMyLocation(){
    if(!navigator.geolocation){
      alert('Localização não disponível neste aparelho.');
      return;
    }

    var c=el('pickCoords');
    if(c)c.textContent='Buscando sua localização...';

    navigator.geolocation.getCurrentPosition(
      function(pos){
        setPoint(pos.coords.latitude,pos.coords.longitude,16);
      },
      function(){
        if(c)c.textContent='Não foi possível obter sua localização.';
        alert('Confira a permissão de localização do navegador.');
      },
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
  }

  function bind(){
    var o=el('originMapPickBtn');
    var d=el('destMapPickBtn');

    if(o)o.onclick=function(e){e.preventDefault();start('origem');};
    if(d)d.onclick=function(e){e.preventDefault();start('destino');};

    if(el('mapPickClose'))el('mapPickClose').onclick=closePickerModal;
    if(el('mapPickCancel'))el('mapPickCancel').onclick=closePickerModal;
    if(el('mapPickConfirm'))el('mapPickConfirm').onclick=confirmPoint;
    if(el('pickMyLocationBtn'))el('pickMyLocationBtn').onclick=useMyLocation;

    if(el('pickNormalBtn'))el('pickNormalBtn').onclick=function(){
      if(!pickMap)return;
      if(pickMap.hasLayer(sat))pickMap.removeLayer(sat);
      if(!pickMap.hasLayer(osm))osm.addTo(pickMap);
    };

    if(el('pickSatelliteBtn'))el('pickSatelliteBtn').onclick=function(){
      if(!pickMap)return;
      if(pickMap.hasLayer(osm))pickMap.removeLayer(osm);
      if(!pickMap.hasLayer(sat))sat.addTo(pickMap);
    };
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bind);
  }else{
    bind();
  }

  setTimeout(bind,800);
})();


/* inline original */

(function(){
  function refresh(){
    try{
      if(window.refreshCattleMapV33)window.refreshCattleMapV33();
    }catch(e){}
  }

  window.addEventListener('online',function(){setTimeout(refresh,700)});
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden)setTimeout(refresh,250);
  });

  [500,1200,2500,4500].forEach(function(ms){
    setTimeout(refresh,ms);
  });
})();


/* inline original */

(function(){
  function fixMap(){
    try{
      var box=document.getElementById('cattleMap');
      if(box){
        box.style.width='100%';
        box.style.overflow='hidden';
      }
      if(typeof map!=='undefined' && map && map.invalidateSize){
        map.invalidateSize(true);
      }
    }catch(e){}
  }

  document.querySelectorAll('.tabbtn').forEach(function(btn){
    if(btn.dataset && btn.dataset.tab==='mapa'){
      btn.addEventListener('click',function(){
        setTimeout(function(){fixMap();if(window.refreshCattleMapV33)window.refreshCattleMapV33()},100);
        setTimeout(function(){fixMap();if(window.refreshCattleMapV33)window.refreshCattleMapV33()},350);
      });
    }
  });

  window.addEventListener('resize',function(){
    setTimeout(fixMap,120);
  });

  window.addEventListener('orientationchange',function(){
    setTimeout(fixMap,300);
  });
})();


/* inline original */

(function(){
 function e(id){return document.getElementById(id)}
 function n(id){const x=Number(e(id)?.value);return Number.isFinite(x)?x:0}
 function m(v){return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
 function update(){
   if(e('neg66Seller'))e('neg66Seller').textContent=e('rvendedor')?.value||'—';
   if(e('neg66Buyer'))e('neg66Buyer').textContent=e('rcomprador')?.value||'—';
   const qb=n('rqcomp'), qv=n('rqv'), pc=n('rpc'), pv=n('rpv');
   const tc=qb*pc, tv=qv*pv;
   if(e('neg66Buy'))e('neg66Buy').textContent=qb?qb.toLocaleString('pt-BR')+' cab • '+m(tc):'—';
   if(e('neg66Sell'))e('neg66Sell').textContent=qv?qv.toLocaleString('pt-BR')+' cab • '+m(tv):'—';
   if(e('neg66Result'))e('neg66Result').textContent=(tc||tv)?m(tv-tc):'—';
   const pgV=e('rpg')?.value==='ok'?'Vendedor pago':'Vendedor pendente';
   const pgC=e('rpgc')?.value==='ok'?'Comprador pago':'Comprador pendente';
   if(e('neg66Payment'))e('neg66Payment').textContent=pgV+' • '+pgC;
 }
 function show(page){
   document.querySelectorAll('.neg-v66-tab').forEach(b=>b.classList.toggle('active',b.dataset.negv66===page));
   ['compra','venda','resumo'].forEach(x=>{
     const el=e('negV66'+x.charAt(0).toUpperCase()+x.slice(1));
     if(el)el.classList.toggle('active',x===page);
   });
   if(page==='resumo')update();
   const card=e('recordModal')?.querySelector('.modalcard');
   if(card)card.scrollTop=0;
 }
 function bind(){
   document.querySelectorAll('.neg-v66-tab').forEach(b=>b.onclick=()=>show(b.dataset.negv66));
   document.querySelectorAll('[data-negv66-go]').forEach(b=>b.onclick=()=>show(b.dataset.negv66Go));
   const f=e('recordForm');
   if(f&&!f.dataset.v66bound){
     f.dataset.v66bound='1';
     f.addEventListener('input',update);
     f.addEventListener('change',update);
   }
 }
 window.showNegV66=show;
 window.updateNegV66=update;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
 setTimeout(bind,500);
})();


/* inline original */

(function(){
  function lockNow(){
    if(!navigator.onLine) return;
    var gate=document.getElementById('loginGate');
    var app=document.getElementById('appShell');
    var login=document.getElementById('loginBtn');
    var logout=document.getElementById('logoutBtn');
    if(app) app.style.display='none';
    if(gate) gate.style.display='block';
    if(login){ login.style.display=''; login.textContent='Entrar'; }
    if(logout) logout.style.display='none';
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',lockNow,{once:true});
  }else{
    lockNow();
  }
})();


/* inline original */


/* inline original */


/* inline original */


/* inline original */


/* inline original */


/* inline original */


/* inline original */


/* inline original */


/* inline original */


/* inline original */


/* inline original */
