
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



/* consolidated external routines */

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


/* consolidated external routines */

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


/* consolidated external routines */

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


/* consolidated external routines */

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


/* consolidated external routines */

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


/* consolidated external routines */

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


/* consolidated external routines */

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


/* consolidated external routines */

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


/* consolidated external routines */

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


/* consolidated external routines */

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


/* consolidated external routines */

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


/* consolidated external routines */

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


/* consolidated external routines */

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


/* CONSOLIDATED: painel-update-v63.js */
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


  let latestQuoteDataV60 = null;

  function fmtScot(v,dec=2){
    const n=Number(v);
    if(!Number.isFinite(n))return '—';
    return n.toLocaleString('pt-BR',{minimumFractionDigits:dec,maximumFractionDigits:dec});
  }

  function renderScotMarketTable(data){
    if(data)latestQuoteDataV60=data;
    const d=data||latestQuoteDataV60;
    const body=document.getElementById('scotRepoTableBody');
    const grid=document.getElementById('scotIndicatorsGrid');
    const date=document.getElementById('scotRepoDate');

    if(!body||!grid)return;

    if(!d){
      body.innerHTML='<tr><td colspan="13">Carregando Scot...</td></tr>';
      grid.innerHTML='<div class="quote-meta">Carregando indicadores...</div>';
      return;
    }

    if(date)date.textContent='Macho Nelore • '+(d.dataReferencia||'data atual');

    const byUf={};
    (d.reposicao||[]).forEach(x=>{if(x&&x.uf)byUf[x.uf]=x});

    function trio(obj){
      if(!obj)return ['—','—','—'];
      return [fmtScot(obj.cabeca),fmtScot(obj.kg),fmtScot(obj.troca)];
    }

    body.innerHTML=['PA','TO','MA'].map(uf=>{
      const r=byUf[uf]||{};
      const vals=[...trio(r.boiMagro),...trio(r.garrote),...trio(r.bezerro),...trio(r.desmama)];
      return '<tr><td>'+uf+'</td>'+vals.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
    }).join('');

    const atual=
      d.indicadorScotAtual &&
      Array.isArray(d.indicadorScotAtual.cotacoes)
        ? d.indicadorScotAtual.cotacoes
        : (d.cotacoes||[]);

    const ontem=
      d.indicadorScotOntem &&
      Array.isArray(d.indicadorScotOntem.cotacoes)
        ? d.indicadorScotOntem.cotacoes
        : [];

    const key=x=>String(x.uf||'')+'|'+String(x.regiao||'');
    const fisico=Array.isArray(d.cotacoes)?d.cotacoes:[];
    if(!fisico.some(x=>x.prazo30!=null)){ grid.innerHTML='<div class="quote-meta">Mercado Físico da Scot indisponível nesta atualização.</div>'; return; }
    if(fisico.some(x=>x.prazo30!=null)){
      grid.innerHTML='<div class="quote-meta"><b>Mercado Físico Scot</b> • preços brutos</div><div class="scot-indicator-table-wrap"><table class="scot-indicator-table"><thead><tr><th>UF</th><th>Região</th><th>À vista</th><th>30 dias</th><th>Variação</th></tr></thead><tbody>'+fisico.map(function(x){var raw=x.variacao;var v=(raw!==null&&raw!==undefined&&raw!==''&&Number.isFinite(Number(raw)))?Number(raw):NaN;if(!Number.isFinite(v)&&Number.isFinite(Number(x.prazo30))&&Number.isFinite(Number(x.avista)))v=Number(x.prazo30)-Number(x.avista);return '<tr><td>'+String(x.uf||'—')+'</td><td>'+String(x.regiao||'—')+'</td><td><b>'+brl(x.avista)+'/@</b></td><td>'+brl(x.prazo30)+'/@</td><td class="'+(v<0?'scot-var-down':v>0?'scot-var-up':'scot-var-flat')+'">'+(Number.isFinite(v)?(v>0?'+':'')+brl(v).replace('R$ ','R$ '):'—')+'</td></tr>';}).join('')+'</tbody></table></div>';
      return;
    }
    const prevMap=new Map(ontem.map(x=>[key(x),x]));

    function variation(now,prev){
      const a=Number(now),b=Number(prev);
      if(!Number.isFinite(a)||!Number.isFinite(b)||b===0){
        return {diff:null,pct:null,cls:'scot-var-flat',arrow:'→'};
      }
      const diff=a-b;
      const pct=(diff/b)*100;
      return {
        diff,
        pct,
        cls:diff>0.005?'scot-var-up':diff<-0.005?'scot-var-down':'scot-var-flat',
        arrow:diff>0.005?'↑':diff<-0.005?'↓':'→'
      };
    }

    const rows=atual.map(x=>{
      const prev=prevMap.get(key(x));
      const v=variation(x.avista,prev&&prev.avista);

      return '<tr>'+
        '<td>'+String(x.uf||'—')+'</td>'+
        '<td>'+String(x.regiao||'—')+'</td>'+
        '<td><b>'+brl(x.avista)+'/@</b></td>'+
        '<td>'+(prev?brl(prev.avista)+'/@':'—')+'</td>'+
        '<td class="'+v.cls+'">'+
          (v.diff==null?'—':(v.diff>0?'+':'')+brl(v.diff).replace('R$ ','R$ '))+
        '</td>'+
        '<td class="'+v.cls+'">'+
          (v.pct==null?'—':v.arrow+' '+(v.pct>0?'+':'')+v.pct.toFixed(2).replace('.',',')+'%')+
        '</td>'+
      '</tr>';
    }).join('');

    const atualData=
      d.indicadorScotAtual && d.indicadorScotAtual.data
        ? d.indicadorScotAtual.data
        : (d.dataReferencia||'—');

    const ontemData=
      d.indicadorScotOntem && d.indicadorScotOntem.data
        ? d.indicadorScotOntem.data
        : 'não disponível';

    grid.innerHTML=
      '<div class="quote-meta"><b>Hoje:</b> '+atualData+
      ' &nbsp; • &nbsp; <b>Anterior:</b> '+ontemData+'</div>'+
      '<div class="scot-indicator-table-wrap">'+
        '<table class="scot-indicator-table">'+
          '<thead><tr>'+
            '<th>UF</th><th>Região</th><th>Hoje</th><th>Ontem</th><th>Diferença</th><th>Variação</th>'+
          '</tr></thead>'+
          '<tbody>'+(
            rows ||
            '<tr><td colspan="6" style="text-align:center">Sem indicadores disponíveis</td></tr>'
          )+'</tbody>'+
        '</table>'+
      '</div>';
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

    ].map(function(x, i) {

      const icons = ['🐂','💰','📦','🏦','🛒','💵','🧾','📈','⚖️','🏷️','⚖️','🏷️'];
      return `
        <div class="kpi">
          <span class="kpi-icon" aria-hidden="true">${icons[i] || '•'}</span>
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


      .quote-history {
        margin-top: 16px;
        border-top: 1px solid #e1e9e3;
        padding-top: 14px;
      }

      .quote-history-head {
        display: flex;
        gap: 10px;
        align-items: end;
        justify-content: space-between;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }

      .quote-history-title {
        font-size: 13px;
        font-weight: 850;
        color: #173d27;
      }

      .quote-history-controls {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .quote-history-controls label {
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        color: #6a776e;
      }

      .quote-history-controls select {
        min-width: 120px;
        padding: 7px 9px;
        border: 1px solid #d7e2da;
        border-radius: 9px;
        background: #fff;
        color: #20372a;
        font: inherit;
      }

      .quote-history-chart {
        height: 260px;
        position: relative;
        border: 1px solid #e0e8e2;
        border-radius: 12px;
        background: #fbfdfb;
        padding: 8px;
      }

      .quote-history-chart svg {
        width: 100%;
        height: 100%;
        display: block;
        overflow: visible;
        background: transparent;
      }

      .quote-history-legend {
        display:flex;
        gap:12px;
        flex-wrap:wrap;
        margin-top:8px;
        font-size:10px;
        font-weight:800;
        color:#445249;
      }

      .quote-history-legend span {
        display:inline-flex;
        align-items:center;
        gap:5px;
      }

      .quote-history-legend i {
        width:18px;
        height:3px;
        border-radius:99px;
        display:inline-block;
      }

      .quote-history-tooltip {
        position:absolute;
        z-index:5;
        pointer-events:none;
        min-width:120px;
        padding:7px 9px;
        border-radius:8px;
        background:#173d29;
        color:white;
        font-size:10px;
        line-height:1.35;
        box-shadow:0 8px 22px rgba(0,0,0,.22);
        transform:translate(-50%,-115%);
        white-space:nowrap;
      }

      .quote-history-kpis {
        display: grid;
        grid-template-columns: repeat(4,minmax(0,1fr));
        gap: 8px;
        margin-top: 10px;
      }

      .quote-history-kpi {
        border: 1px solid #e0e8e2;
        border-radius: 10px;
        padding: 8px 10px;
        background: #fff;
      }

      .quote-history-kpi span {
        display: block;
        font-size: 9px;
        color: #718078;
        text-transform: uppercase;
        font-weight: 800;
      }

      .quote-history-kpi b {
        display: block;
        margin-top: 3px;
        font-size: 13px;
        color: #183d29;
      }

      .quote-history-note {
        margin-top: 8px;
        font-size: 10px;
        color: #6b786f;
      }

      @media (max-width:650px) {
        .quote-history-kpis {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }
        .quote-history-chart {
          height: 230px;
        }
        .quote-history-controls {
          width: 100%;
        }
        .quote-history-controls label {
          flex: 1;
        }
        .quote-history-controls select {
          width: 100%;
          min-width: 0;
        }
      }

      .quote-history-dashboard {
        display:grid;
        grid-template-columns:minmax(0,2.25fr) minmax(310px,.95fr);
        gap:12px;
        align-items:stretch;
      }

      .quote-history-main,
      .quote-history-side {
        border:1px solid #dfe8e1;
        border-radius:12px;
        background:#fff;
        overflow:hidden;
      }

      .quote-history-chart-title,
      .quote-history-side-title {
        padding:10px 12px;
        font-size:11px;
        font-weight:850;
        color:#284b35;
        background:#f5f9f6;
        border-bottom:1px solid #e2e9e4;
      }

      .quote-history-chart {
        height:320px;
        border:0!important;
        border-radius:0!important;
        background:#fff!important;
        padding:4px 6px 0!important;
      }

      .quote-history-chart svg {
        width:100%;
        height:100%;
        display:block;
        overflow:hidden;
        background:#fff;
      }

      .quote-history-side {
        display:flex;
        flex-direction:column;
        min-height:320px;
      }

      .quote-history-table-wrap {
        overflow:auto;
        max-height:320px;
        flex:1;
      }

      .quote-history-table {
        width:100%;
        border-collapse:collapse;
        font-size:10px;
      }

      .quote-history-table th {
        position:sticky;
        top:0;
        z-index:2;
        text-align:left;
        padding:7px 6px;
        background:#eaf4ed;
        color:#466052;
        font-size:8px;
        text-transform:uppercase;
        border-bottom:1px solid #d9e5dc;
        white-space:nowrap;
      }

      .quote-history-table td {
        padding:7px 6px;
        border-bottom:1px solid #eef2ef;
        white-space:nowrap;
        color:#39483f;
      }

      .quote-history-table tr:hover td {
        background:#f7faf8;
      }

      .trend-up {color:#18814d;font-weight:850}
      .trend-down {color:#bd4338;font-weight:850}
      .trend-flat {color:#9a7a25;font-weight:850}

      .quote-history-legend {
        padding:8px 12px 10px;
        border-top:1px solid #eef2ef;
        margin:0!important;
      }

      .quote-history-kpis {
        margin-top:10px!important;
      }

      @media(max-width:900px) {
        .quote-history-dashboard {
          grid-template-columns:1fr;
        }
        .quote-history-side {
          min-height:230px;
        }
        .quote-history-table-wrap {
          max-height:260px;
        }
      }

      /* v54 — gráfico amplo + histórico abaixo */
      .quote-history-dashboard {
        grid-template-columns:1fr!important;
        gap:12px!important;
      }

      .quote-history-main {
        width:100%;
      }

      .quote-history-chart {
        height:390px!important;
      }

      .quote-history-side {
        width:100%;
        min-height:0!important;
      }

      .quote-history-table-wrap {
        max-height:300px!important;
      }

      .quote-history-table {
        font-size:11px!important;
      }

      .quote-history-table th,
      .quote-history-table td {
        padding:9px 10px!important;
      }

      @media(max-width:900px) {
        .quote-history-chart {
          height:340px!important;
        }
      }

      /* v55 — estrutura física: gráfico em cima, histórico abaixo */
      .quote-history-main-full{
        display:block!important;
        width:100%!important;
        max-width:none!important;
        margin:0!important;
      }

      .quote-history-main-full .quote-history-chart{
        width:100%!important;
        height:430px!important;
        min-height:430px!important;
      }

      .quote-history-side-below{
        display:block!important;
        position:relative!important;
        width:100%!important;
        max-width:none!important;
        min-height:0!important;
        margin-top:14px!important;
        clear:both!important;
      }

      .quote-history-side-below .quote-history-table-wrap{
        width:100%!important;
        max-height:320px!important;
        overflow:auto!important;
      }

      .quote-history-side-below .quote-history-table{
        width:100%!important;
        min-width:700px!important;
      }

      .quote-history-side-below .quote-history-table th,
      .quote-history-side-below .quote-history-table td{
        padding:10px 14px!important;
        font-size:11px!important;
      }

      @media(max-width:900px){
        .quote-history-main-full .quote-history-chart{
          height:360px!important;
          min-height:360px!important;
        }
        .quote-history-side-below .quote-history-table{
          min-width:620px!important;
        }
      }

      .scot-market-area{margin-top:16px;padding-top:14px;border-top:1px solid #e1e9e3}
      .scot-section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
      .scot-table-wrap{overflow:auto;border:1px solid #d9e4dc;border-radius:12px;background:#fff}
      .scot-market-table{width:100%;min-width:1040px;border-collapse:collapse;font-size:11px}
      .scot-market-table th,.scot-market-table td{padding:9px 8px;border-right:1px solid #e1e8e3;border-bottom:1px solid #e5ebe7;text-align:right;white-space:nowrap}
      .scot-market-table th:first-child,.scot-market-table td:first-child{text-align:center;font-weight:900;position:sticky;left:0;z-index:3}
      .scot-market-table tbody td:first-child{background:#f7faf8}
      .scot-market-table thead th{background:#90aa32;color:#fff;font-weight:850}
      .scot-market-table thead .scot-group-head th{background:#0c6c46;font-size:12px;text-align:center}
      .scot-market-table tbody tr:nth-child(even) td{background:#f6f7f6}
      .scot-market-table tbody tr:nth-child(even) td:first-child{background:#eef2ef}
      .scot-indicators-card{margin-top:14px;border:1px solid #dfe8e1;border-radius:12px;padding:12px;background:#fff}
      .scot-indicators-grid{margin-top:10px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .scot-indicator-box{border:1px solid #dfe8e1;border-radius:10px;padding:10px 12px;background:#f9fbf9}
      .scot-indicator-box b{display:block;font-size:13px;color:#173d29;margin-bottom:5px}
      .scot-indicator-row{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px solid #edf2ee;font-size:11px}
      .scot-indicator-row:last-child{border-bottom:0}
      @media(max-width:800px){.scot-indicators-grid{grid-template-columns:1fr}}

      /* v61 — contraste Scot e indicadores comparativos */
      .scot-market-table thead th{
        background:#7f9d22!important;
        color:#142718!important;
        text-shadow:none!important;
        font-weight:900!important;
      }

      .scot-market-table thead .scot-group-head th{
        background:#075c3c!important;
        color:#ffffff!important;
        font-weight:900!important;
        font-size:13px!important;
      }

      .scot-market-table thead tr:nth-child(2) th{
        background:#dce7b2!important;
        color:#213522!important;
        font-size:10px!important;
        text-transform:uppercase;
        letter-spacing:.2px;
      }

      .scot-indicators-grid{
        grid-template-columns:1fr!important;
      }

      .scot-indicator-table-wrap{
        overflow:auto;
        border:1px solid #dfe8e1;
        border-radius:10px;
        margin-top:10px;
      }

      .scot-indicator-table{
        width:100%;
        min-width:760px;
        border-collapse:collapse;
        font-size:11px;
      }

      .scot-indicator-table th{
        padding:8px 10px;
        text-align:right;
        background:#eef5ef;
        color:#496052;
        border-bottom:1px solid #dce6df;
        font-size:9px;
        text-transform:uppercase;
        white-space:nowrap;
      }

      .scot-indicator-table th:first-child,
      .scot-indicator-table th:nth-child(2),
      .scot-indicator-table td:first-child,
      .scot-indicator-table td:nth-child(2){
        text-align:left;
      }

      .scot-indicator-table td{
        padding:9px 10px;
        border-bottom:1px solid #edf2ee;
        text-align:right;
        white-space:nowrap;
      }

      .scot-indicator-table tr:last-child td{
        border-bottom:0;
      }

      .scot-var-up{color:#18814d;font-weight:900}
      .scot-var-down{color:#b83d34;font-weight:900}
      .scot-var-flat{color:#8b7625;font-weight:900}

      #cotacoesConteudo{display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}

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
          Cotações Scot <span style="font-size:9px;font-weight:700;opacity:.55">v63</span>
        </h2>

        <button
          class="mini"
          type="button"
          id="refreshCotacoes">
          Atualizar
        </button>

      </div>


      <div class="body">

        <div id="cotacoesConteudo" style="display:none!important"></div>

        <div class="quote-history scot-market-area">

          <div class="scot-section-head">
            <div>
              <div class="quote-history-title">Scot Consultoria — Macho Nelore</div>
              <div class="quote-meta" id="scotRepoDate">Cotação atual de reposição</div>
            </div>
          </div>

          <div class="scot-table-wrap">
            <table class="scot-market-table">
              <thead>
                <tr class="scot-group-head">
                  <th rowspan="2">UF</th>
                  <th colspan="3">Boi Magro</th>
                  <th colspan="3">Garrote</th>
                  <th colspan="3">Bezerro</th>
                  <th colspan="3">Desmama</th>
                </tr>
                <tr>
                  <th>R$/cab</th><th>R$/kg</th><th>Troca</th>
                  <th>R$/cab</th><th>R$/kg</th><th>Troca</th>
                  <th>R$/cab</th><th>R$/kg</th><th>Troca</th>
                  <th>R$/cab</th><th>R$/kg</th><th>Troca</th>
                </tr>
              </thead>
              <tbody id="scotRepoTableBody">
                <tr><td colspan="13">Carregando Scot...</td></tr>
              </tbody>
            </table>
          </div>

          <div class="scot-indicators-card">
            <div class="quote-history-title">Cotação — Indicadores Scot</div>
            <div class="quote-meta">Hoje x ontem • diferença e variação percentual</div>
            <div id="scotIndicatorsGrid" class="scot-indicators-grid">
              <div class="quote-meta">Carregando indicadores...</div>
            </div>
          </div>

        </div>

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

    renderScotMarketTable();

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
     GRÁFICO HISTÓRICO INTERATIVO
  ========================= */

  const HISTORY_CACHE_KEY =
    'gado_historico_v53';

  let historyRaw = [];
  let historyLoadingToken = 0;


  function hEl(id) {
    return document.getElementById(id);
  }


  function ensureHistoryYears() {
    const el=hEl('quoteHistoryYear');
    if (!el) return;

    const now=new Date().getFullYear();
    const years=[];

    for(let y=now;y>=2020;y--) {
      years.push(String(y));
    }

    const old=el.value;

    el.innerHTML=years
      .map(y=>'<option value="'+y+'">'+y+'</option>')
      .join('');

    el.value=
      old && years.includes(old)
        ? old
        : String(now);
  }


  function historyStateName(uf) {
    return {
      PA:'Pará',
      TO:'Tocantins',
      MA:'Maranhão'
    }[uf] || uf;
  }


  function historyTypeName(type) {
    return {
      boi:'Boi gordo',
      bezerro:'Bezerro',
      garrote:'Garrote',
      all:'Todos'
    }[type] || type;
  }


  function historyFormat(type,v) {
    if (!Number.isFinite(Number(v))) return '—';
    return type==='boi'
      ? brl(v) + '/@'
      : brl(v) + '/kg';
  }

  function historyHeadEquivalent(type,v) {
    if (!Number.isFinite(Number(v))) return '';
    if (type==='bezerro') return brl(Number(v)*240) + '/un';
    if (type==='garrote') return brl(Number(v)*300) + '/un';
    return '';
  }

  function historyPriceBoth(type,v) {
    const main=historyFormat(type,v);
    const head=historyHeadEquivalent(type,v);
    return head ? main+' • '+head : main;
  }


  function cacheAllRead() {
    try {
      return JSON.parse(
        localStorage.getItem(
          HISTORY_CACHE_KEY
        ) || '{}'
      ) || {};
    } catch (_) {
      return {};
    }
  }


  function cacheMonthRead(key) {
    const all=cacheAllRead();
    return all[key] || null;
  }


  function cacheMonthWrite(key,data) {
    try {
      const all=cacheAllRead();
      all[key]={
        savedAt:new Date().toISOString(),
        data
      };
      localStorage.setItem(
        HISTORY_CACHE_KEY,
        JSON.stringify(all)
      );
    } catch (_) {}
  }


  async function loadHistoryMonth(year,month,uf) {
    const key=[year,month,uf].join('|');
    const cached=cacheMonthRead(key);

    // Historical closed months may use cache indefinitely.
    const now=new Date();
    const closed =
      year<now.getFullYear() ||
      (year===now.getFullYear() && month<now.getMonth()+1);

    if (
      cached &&
      cached.data &&
      Array.isArray(cached.data.points) &&
      closed
    ) {
      return cached.data.points;
    }

    try {
      const r=await fetch(
        '/api/cotacoes-historico-mes?year='+
        encodeURIComponent(year)+
        '&month='+
        encodeURIComponent(month)+
        '&uf='+
        encodeURIComponent(uf),
        {cache:'no-store'}
      );

      if (!r.ok) throw new Error('HTTP '+r.status);

      const data=await r.json();

      if (!data.ok || !Array.isArray(data.points)) {
        throw new Error(data.error||'Histórico inválido');
      }

      cacheMonthWrite(key,data);
      return data.points;

    } catch (e) {
      if (
        cached &&
        cached.data &&
        Array.isArray(cached.data.points)
      ) {
        return cached.data.points;
      }
      return [];
    }
  }


  async function loadQuoteHistoryInteractive() {
    ensureHistoryYears();

    const token=++historyLoadingToken;
    const year=Number(hEl('quoteHistoryYear').value);
    const uf=hEl('quoteHistoryState').value;
    const note=hEl('quoteHistoryNote');

    historyRaw=[];
    renderQuoteHistoryInteractive();

    if (uf==='MA') {
      historyRaw=[];
      renderQuoteHistoryInteractive(true);
      if (note) {
        note.innerHTML=
          '<b>Maranhão:</b> a fonte histórica contínua usada neste gráfico não publica série estadual de MA. '+
          'A cotação atual de MA continua disponível acima.';
      }
      return;
    }

    if (note) {
      note.innerHTML=
        'Carregando histórico de <b>'+
        historyStateName(uf)+
        '</b> em <b>'+
        year+
        '</b>...';
    }

    const currentYear=new Date().getFullYear();
    const maxMonth=
      year===currentYear
        ? new Date().getMonth()+1
        : 12;

    for(let month=1;month<=maxMonth;month++) {
      if (token!==historyLoadingToken) return;

      const points=
        await loadHistoryMonth(
          year,month,uf
        );

      if (token!==historyLoadingToken) return;

      historyRaw=historyRaw
        .concat(points||[]);

      const byDate=new Map();

      historyRaw.forEach(
        p=>byDate.set(p.date,p)
      );

      historyRaw=
        Array.from(byDate.values())
          .sort((a,b)=>a.date.localeCompare(b.date));

      renderQuoteHistoryInteractive();

      if (note) {
        note.innerHTML=
          'Carregando '+month+
          '/'+maxMonth+
          ' • '+historyRaw.length+
          ' ponto(s) históricos encontrados...';
      }
    }

    renderQuoteHistoryInteractive(true);
  }


  function aggregateRows(rows,mode,key) {
    const values=(rows||[])
      .filter(x=>Number.isFinite(Number(x[key])))
      .map(x=>({
        date:x.date,
        value:Number(x[key])
      }));

    if (mode==='daily') return values;

    const groups=new Map();

    values.forEach(function(r){
      const d=new Date(r.date+'T12:00:00');
      if (isNaN(d)) return;

      // Mensal e Anual: um ponto por mês.
      const gkey=r.date.slice(0,7)+'-01';

      if (!groups.has(gkey))groups.set(gkey,[]);
      groups.get(gkey).push(r.value);
    });

    return Array.from(groups.entries())
      .map(([date,vals])=>({
        date,
        value:vals.reduce((a,b)=>a+b,0)/vals.length
      }))
      .sort((a,b)=>a.date.localeCompare(b.date));
  }


  function svgNode(name,attrs,text) {
    const n=document.createElementNS(
      'http://www.w3.org/2000/svg',
      name
    );
    Object.entries(attrs||{}).forEach(
      ([k,v])=>n.setAttribute(k,String(v))
    );
    if (text!=null)n.textContent=text;
    return n;
  }


  function renderQuoteHistoryInteractive(done) {
    const svg=hEl('quoteHistorySvg');
    const tip=hEl('quoteHistoryTooltip');
    const legend=hEl('quoteHistoryLegend');
    const kpis=hEl('quoteHistoryKpis');
    const note=hEl('quoteHistoryNote');
    const tbody=hEl('quoteHistoryTableBody');
    const title=hEl('quoteHistoryChartTitle');

    if(!svg||!legend||!kpis||!tbody)return;

    const type=hEl('quoteHistoryType').value;
    const mode=hEl('quoteHistoryGranularity').value;
    const uf=hEl('quoteHistoryState').value;
    const year=hEl('quoteHistoryYear').value;

    svg.innerHTML='';
    tip.style.display='none';
    tbody.innerHTML='';

    const colors={
      boi:'#23734b',
      bezerro:'#3b7899',
      garrote:'#b48a32'
    };

    const keys=type==='all'
      ? ['boi','bezerro','garrote']
      : [type];

    let series=keys.map(key=>({
      key,
      label:historyTypeName(key),
      rows:aggregateRows(historyRaw,mode,key)
    })).filter(s=>s.rows.length);

    if(title) {
      title.textContent=
        (type==='all'?'Evolução comparativa':'Preço por data')+
        ' — '+historyStateName(uf)+' — '+year;
    }

    if(!series.length) {
      svg.appendChild(svgNode('text',{
        x:500,y:190,'text-anchor':'middle',
        fill:'#768179','font-size':18
      },'Sem histórico disponível para esta seleção.'));
      legend.innerHTML='';
      kpis.innerHTML='';
      tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:#7c887f;padding:18px">Sem dados históricos</td></tr>';
      return;
    }

    const indexed=type==='all';

    if(indexed) {
      series=series.map(s=>{
        const base=s.rows[0].value;
        return {
          ...s,
          rows:s.rows.map(r=>({
            ...r,
            actual:r.value,
            value:base?(r.value/base)*100:100
          }))
        };
      });
    }

    const allRows=series.flatMap(s=>s.rows);
    let ymin=Math.min(...allRows.map(r=>r.value));
    let ymax=Math.max(...allRows.map(r=>r.value));

    if(ymin===ymax){ymin-=1;ymax+=1}
    else{
      const gap=(ymax-ymin)*.11;
      ymin-=gap;ymax+=gap;
    }

    const W=1000,H=390;
    const pad={l:82,r:24,t:20,b:52};
    const cw=W-pad.l-pad.r;
    const ch=H-pad.t-pad.b;

    const dates=allRows.map(r=>new Date(r.date+'T12:00:00'));
    let dmin=Math.min(...dates);
    let dmax=Math.max(...dates);

    if (mode==='annual') {
      dmin=+new Date(Number(year),0,1,12);
      dmax=+new Date(Number(year),11,31,12);
    }

    const dspan=Math.max(86400000,dmax-dmin);

    function xy(r){
      const d=new Date(r.date+'T12:00:00');
      return {
        x:pad.l+cw*((d-dmin)/dspan),
        y:pad.t+ch*(1-(r.value-ymin)/(ymax-ymin))
      };
    }

    svg.appendChild(svgNode('rect',{x:0,y:0,width:W,height:H,fill:'#fff'}));

    for(let i=0;i<=5;i++){
      const y=pad.t+ch*i/5;
      svg.appendChild(svgNode('line',{
        x1:pad.l,y1:y,x2:W-pad.r,y2:y,
        stroke:'#e5ece7','stroke-width':1
      }));

      const v=ymax-(ymax-ymin)*i/5;
      let label=indexed?v.toFixed(1):
        (type==='boi'
          ? 'R$ '+Math.round(v)
          : 'R$ '+v.toFixed(1).replace('.',','));

      svg.appendChild(svgNode('text',{
        x:pad.l-10,y:y+4,'text-anchor':'end',
        fill:'#66736a','font-size':12
      },label));
    }

    // Vertical month markers
    const monthNames=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    for(let m=0;m<12;m++){
      const d=new Date(Number(year),m,1,12);
      if(d<dmin||d>dmax)continue;
      const x=pad.l+cw*((d-dmin)/dspan);

      svg.appendChild(svgNode('line',{
        x1:x,y1:pad.t,x2:x,y2:pad.t+ch,
        stroke:'#f0f3f1','stroke-width':1
      }));

      svg.appendChild(svgNode('text',{
        x,y:H-18,'text-anchor':'middle',
        fill:'#66736a','font-size':12
      },monthNames[m]));
    }

    series.forEach(function(s){
      const pathPoints=s.rows.map(r=>xy(r));
      if(!pathPoints.length)return;

      // soft area only for one selected series
      if(series.length===1 && pathPoints.length>1){
        const area=[
          'M',pathPoints[0].x,pathPoints[0].y,
          ...pathPoints.slice(1).flatMap(p=>['L',p.x,p.y]),
          'L',pathPoints[pathPoints.length-1].x,pad.t+ch,
          'L',pathPoints[0].x,pad.t+ch,'Z'
        ].join(' ');

        const gradId='histGrad'+s.key;
        const defs=svgNode('defs');
        const grad=svgNode('linearGradient',{id:gradId,x1:'0%',y1:'0%',x2:'0%',y2:'100%'});
        grad.appendChild(svgNode('stop',{offset:'0%','stop-color':colors[s.key],'stop-opacity':'.18'}));
        grad.appendChild(svgNode('stop',{offset:'100%','stop-color':colors[s.key],'stop-opacity':'0'}));
        defs.appendChild(grad);
        svg.appendChild(defs);
        svg.appendChild(svgNode('path',{d:area,fill:'url(#'+gradId+')'}));
      }

      const path=[
        'M',pathPoints[0].x,pathPoints[0].y,
        ...pathPoints.slice(1).flatMap(p=>['L',p.x,p.y])
      ].join(' ');

      svg.appendChild(svgNode('path',{
        d:path,fill:'none',stroke:colors[s.key],
        'stroke-width':2.3,'stroke-linejoin':'round',
        'stroke-linecap':'round'
      }));

      s.rows.forEach(function(r){
        const p=xy(r);
        const circle=svgNode('circle',{
          cx:p.x,cy:p.y,r:mode==='daily'?3.1:4.2,
          fill:'#fff',stroke:colors[s.key],
          'stroke-width':2.2,style:'cursor:pointer'
        });

        function show(){
          const rect=svg.getBoundingClientRect();
          const px=(p.x/W)*rect.width;
          const py=(p.y/H)*rect.height;
          const actual=indexed?(r.actual!=null?r.actual:r.value):r.value;

          tip.innerHTML=
            '<b>'+historyTypeName(s.key)+'</b><br>'+
            historyFullDateV47(r.date)+'<br>'+
            historyPriceBoth(s.key,actual)+
            (indexed?'<br>Índice: '+r.value.toFixed(1):'');

          tip.style.left=px+'px';
          tip.style.top=py+'px';
          tip.style.display='block';
        }

        circle.addEventListener('mouseenter',show);
        circle.addEventListener('click',show);
        circle.addEventListener('mouseleave',()=>tip.style.display='none');
        svg.appendChild(circle);
      });
    });

    legend.innerHTML=series.map(s=>
      '<span><i style="background:'+colors[s.key]+'"></i>'+historyTypeName(s.key)+'</span>'
    ).join('');

    // Side table uses primary selected series; for all, list each category's most recent trend.
    let tableRows=[];
    if(type==='all'){
      series.forEach(s=>{
        const rows=s.rows;
        for(let i=Math.max(0,rows.length-8);i<rows.length;i++){
          tableRows.push({...rows[i],key:s.key});
        }
      });
      tableRows.sort((a,b)=>b.date.localeCompare(a.date));
    }else{
      tableRows=series[0].rows.slice().reverse().slice(0,18).map(r=>({...r,key:type}));
    }

    tbody.innerHTML=tableRows.map(function(r,i){
      const arr=series.find(s=>s.key===r.key)?.rows||[];
      const idx=arr.findIndex(x=>x.date===r.date);
      const prev=idx>0?arr[idx-1]:null;
      const actual=indexed?(r.actual!=null?r.actual:r.value):r.value;
      const prevActual=prev?(indexed?(prev.actual!=null?prev.actual:prev.value):prev.value):null;
      const variation=prevActual!=null && prevActual!==0
        ? ((actual-prevActual)/prevActual)*100
        : 0;

      const cls=variation>.05?'trend-up':variation<-.05?'trend-down':'trend-flat';
      const arrow=variation>.05?'↑':variation<-.05?'↓':'→';
      const trend=variation>.05?'ALTA':variation<-.05?'BAIXA':'ESTÁVEL';

      return '<tr>'+
        '<td>'+historyFullDateV47(r.date).slice(0,5)+'</td>'+
        '<td><b>'+historyPriceBoth(r.key,actual)+'</b></td>'+
        '<td class="'+cls+'">'+(variation>0?'+':'')+variation.toFixed(2).replace('.',',')+'%</td>'+
        '<td class="'+cls+'">'+arrow+' '+trend+'</td>'+
      '</tr>';
    }).join('');

    // KPI cards
    if(indexed){
      kpis.innerHTML=series.map(s=>{
        const first=s.rows[0],last=s.rows[s.rows.length-1];
        const change=last.value-first.value;
        return '<div class="quote-history-kpi"><span>'+s.label+
          '</span><b>'+(change>=0?'+':'')+change.toFixed(1).replace('.',',')+'%</b></div>';
      }).join('');
    }else{
      const rows=series[0].rows;
      const first=rows[0],last=rows[rows.length-1];
      const min=rows.reduce((a,b)=>b.value<a.value?b:a);
      const max=rows.reduce((a,b)=>b.value>a.value?b:a);
      kpis.innerHTML=[
        ['Primeiro',historyPriceBoth(type,first.value)],
        ['Último',historyPriceBoth(type,last.value)],
        ['Mínimo',historyPriceBoth(type,min.value)],
        ['Máximo',historyPriceBoth(type,max.value)]
      ].map(x=>'<div class="quote-history-kpi"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('');
    }

    if(note&&done){
      const total=historyRaw.filter(x=>x && x.date).length;
      note.innerHTML=
        '<b>Fonte do histórico: Scot Consultoria.</b> '+
        total+' fechamento(s) carregado(s). '+
        (mode==='annual'
          ? 'Visualização anual com eixo completo de janeiro a dezembro. '
          : '')+
        'O gráfico exibe somente datas realmente retornadas pela fonte.';
    }
  }

  function historyFullDateV47(iso){
    const p=String(iso||'').split('-');
    return p.length===3
      ? p[2]+'/'+p[1]+'/'+p[0]
      : iso;
  }


  function setupHistoryControlsV47() {
    ensureHistoryYears();

    ['quoteHistoryYear','quoteHistoryState'].forEach(id=>{
      const el=hEl(id);
      if(el)el.onchange=loadQuoteHistoryInteractive;
    });

    ['quoteHistoryType','quoteHistoryGranularity'].forEach(id=>{
      const el=hEl(id);
      if(el)el.onchange=()=>renderQuoteHistoryInteractive(true);
    });

    loadQuoteHistoryInteractive();
  }


  /* =========================
     CARREGAR COTAÇÕES
  ========================= */

  function completarCotacaoAnterior(data){
    if(!data || !Array.isArray(data.cotacoes)) return data;
    var atual=(data.indicadorScotAtual&&data.indicadorScotAtual.data)||data.dataReferencia||'';
    var anterior=data.indicadorScotOntem;
    try{
      var raw=localStorage.getItem('gado_cotacoes_historico_v2');
      var hist=raw?JSON.parse(raw):[];
      if(!Array.isArray(hist))hist=[];
      if(!anterior||!Array.isArray(anterior.cotacoes)||!anterior.cotacoes.length){
        var prev=hist.find(function(x){return x&&x.data&&x.data!==atual&&Array.isArray(x.cotacoes)&&x.cotacoes.length});
        if(prev)data.indicadorScotOntem={data:prev.data,cotacoes:prev.cotacoes};
      }
      if(atual&&data.cotacoes.length){
        hist=[{data:atual,cotacoes:data.cotacoes}].concat(hist.filter(function(x){return x&&x.data!==atual})).slice(0,30);
        localStorage.setItem('gado_cotacoes_historico_v2',JSON.stringify(hist));
      }
    }catch(_){ }
    return data;
  }

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


      let data =
        await res.json();

      data=completarCotacaoAnterior(data);

      try {
        localStorage.setItem('gado_cotacoes_cache_v1', JSON.stringify({
          savedAt: new Date().toISOString(),
          data: data
        }));
      } catch (_) {}

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


      renderScotMarketTable(data);


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


      el.innerHTML = '';
} catch (e) {


      console.error(
        'Cotação:',
        e
      );


      let cached = null;
      try {
        const raw = localStorage.getItem('gado_cotacoes_cache_v1');
        cached = raw ? JSON.parse(raw) : null;
      } catch (_) {}

      if (cached && cached.data && cached.data.ok && Array.isArray(cached.data.cotacoes)) {
        const data = completarCotacaoAnterior(cached.data);
        renderScotMarketTable(data);
        const pa = data.cotacoes.filter(x => x.uf === 'PA');
        const to = data.cotacoes.filter(x => x.uf === 'TO');
        const ma = data.cotacoes.filter(x => x.uf === 'MA');
        const reposicao = Array.isArray(data.reposicao) ? data.reposicao : [];
        const repPA = reposicao.find(x => x.uf === 'PA') || {};
        const repTO = reposicao.find(x => x.uf === 'TO') || {};
        const repMA = reposicao.find(x => x.uf === 'MA') || {};
        const salvo = cached.savedAt ? new Date(cached.savedAt).toLocaleString('pt-BR') : '';
        el.innerHTML = '';
} else {
        el.innerHTML = `
          <div class="quote-error">
            Não foi possível carregar a cotação agora. Quando houver uma atualização online bem-sucedida, a última cotação ficará disponível também offline.
          </div>`;
      }

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


/* CONSOLIDATED: v85-fixes.js */
/* Compra e Venda de Gado — v183 fixes */
(function(){
  window.APP_WEB_VERSION='183';
  function dataUrlToBlob(dataUrl){var p=String(dataUrl||'').split(',');if(p.length<2)throw new Error('PDF sem conteúdo válido');var meta=p[0]||'';var mime=(meta.match(/data:([^;]+)/)||[])[1]||'application/pdf';var bin=meta.indexOf(';base64')>=0?atob(p.slice(1).join(',')):decodeURIComponent(p.slice(1).join(','));var bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i)&255;return new Blob([bytes],{type:mime});}
  window.__pdfDocsV85=window.__pdfDocsV85||{};
  window.openStoredPdfV85=function(id){try{var doc=window.__pdfDocsV85[id];if(!doc||!doc.data)throw new Error('Documento não encontrado');var name=doc.name||'documento.pdf';if(window.AndroidPdf&&typeof window.AndroidPdf.openPdf==='function'){window.AndroidPdf.openPdf(doc.data,name);return;}var blob=dataUrlToBlob(doc.data);var url=URL.createObjectURL(blob);var w=window.open(url,'_blank');if(!w){var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();}setTimeout(function(){try{URL.revokeObjectURL(url)}catch(e){}},60000);}catch(e){alert('Não foi possível abrir o PDF: '+(e.message||e));}};
  window.fileLink=function(doc,label){if(!doc||!doc.data)return '—';var id='pdf96_'+Math.random().toString(36).slice(2)+Date.now().toString(36);window.__pdfDocsV85[id]=doc;return '<button type="button" class="mini" onclick="openStoredPdfV85(\''+id+'\')">Abrir PDF</button>';};

  window.deleteNegotiationPdfV91=function(kind){try{var id=(document.getElementById('rid')||{}).value||'';if(!id){alert('Salve a negociação antes de excluir um PDF.');return;}var map={gta:{field:'gtaPdf',status:'rgtaFileStatus',input:'rgtaFile',label:'GTA'},nota:{field:'notaPdf',status:'rnotaFileStatus',input:'rnotaFile',label:'Nota'},pagamento:{field:'paymentPdf',status:'rpayFileStatus',input:'rpayFile',label:'Comprovante'}};var cfg=map[kind];if(!cfg)return;var r=records.find(function(x){return x.id===id;});if(!r)return;if(!r[cfg.field]){var st=document.getElementById(cfg.status);if(st)st.innerHTML='';return;}if(!confirm('Excluir somente o PDF de '+cfg.label+'?'))return;r[cfg.field]=null;r.updatedAt=new Date().toISOString();var inp=document.getElementById(cfg.input);if(inp)inp.value='';var st=document.getElementById(cfg.status);if(st)st.innerHTML='<span style="color:#6d786f">PDF excluído</span>';persist();renderAll();if(typeof window.syncPendingNow==='function')setTimeout(function(){window.syncPendingNow(false);},100);}catch(e){alert('Não foi possível excluir o PDF: '+(e.message||e));}};
  function deleteBtn(kind){return ' <button type="button" class="mini" style="background:#fff0ee;color:#b42318" onclick="deleteNegotiationPdfV91(\''+kind+'\')">Excluir PDF</button>';}
  var originalEditRecord=window.editRecord;if(typeof originalEditRecord==='function'){window.editRecord=function(id){originalEditRecord(id);setTimeout(function(){try{var r=records.find(function(x){return x.id===id;});if(!r)return;if(r.gtaPdf){var a=document.getElementById('rgtaFileStatus');if(a)a.innerHTML=fileLink(r.gtaPdf,'GTA')+deleteBtn('gta');}if(r.notaPdf){var b=document.getElementById('rnotaFileStatus');if(b)b.innerHTML=fileLink(r.notaPdf,'Nota')+deleteBtn('nota');}if(r.paymentPdf){var c=document.getElementById('rpayFileStatus');if(c)c.innerHTML=fileLink(r.paymentPdf,'Comprovante')+deleteBtn('pagamento');}}catch(e){}},80);};}

  var TOMBSTONE_KEY='gado_deleted_records_permanent_v95';
  var LEGACY_PENDING='gado_pending_sync_v78';
  var LEGACY_RETRY='gado_sync_retry_v78';
  var CLIENTS_KEY='gado_cadastros_v120';
  var ANIMALS_KEY='gado_animais_v121';
  var LOTS_KEY='gado_lotes_v121';
  var sync96Busy=false;
  var sync96Timer=null;
  var lastPullAt=0;

  function tombstones(){try{return JSON.parse(userGet(TOMBSTONE_KEY)||'[]')||[];}catch(e){return [];}}
  function saveTombstones(a){try{userSet(TOMBSTONE_KEY,JSON.stringify(Array.from(new Set(a||[]))));}catch(e){}}
  function mergeDeleted(remote){var all=Array.from(new Set(tombstones().concat(Array.isArray(remote)?remote:[])));saveTombstones(all);return all;}
  function addTombstone(id){if(!id)return;var a=tombstones();if(a.indexOf(id)<0)a.push(id);saveTombstones(a);}
  function applyDeleted(remote){var all=mergeDeleted(remote);var d=new Set(all);if(typeof records==='undefined'||!Array.isArray(records))return all;records=records.filter(function(r){return !d.has(r&&r.id);});try{userSet(KEY,JSON.stringify(records));}catch(e){}return all;}
  function stable(v){try{return JSON.stringify(v||[]);}catch(e){return '[]';}}
  function localClients(){try{var list=JSON.parse(userGet(CLIENTS_KEY)||'[]')||[];return Array.isArray(list)?list.map(function(x){if(!x||x.id)return x;return Object.assign({},x,{id:'cad-'+String(x.documento||x.nome||'cliente').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')});}):[];}catch(e){return [];}}
  function localObject(key){try{return JSON.parse(userGet(key)||'{}')||{};}catch(e){return {};}}
  function mergeObject(remote,local){var out={};Object.keys(remote||{}).forEach(function(k){out[k]=remote[k];});Object.keys(local||{}).forEach(function(k){out[k]=local[k];});return out;}
  function clearConfirmedFlags(){try{userRemove(OFFLINE_DIRTY_KEY);userRemove(DELETED_RECORDS_KEY);userRemove(DELETED_COSTS_KEY);userRemove(LEGACY_PENDING);localStorage.removeItem(LEGACY_RETRY);}catch(e){}}
  function markSynced(){setCloudStatus('Sincronizado ✓','ok');var s=document.getElementById('saveStatus');if(s)s.textContent='Dados sincronizados • '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});var o=document.getElementById('offlineStatus');if(o){o.textContent='Online • sincronizado';o.className='cloudpill ok';}var b=document.getElementById('syncNowBtn');if(b)b.style.display='none';}
  function hasPending(){try{return isOfflineDirty()||!!userGet(LEGACY_PENDING)||getDeletedIds(DELETED_RECORDS_KEY).length>0||getDeletedIds(DELETED_COSTS_KEY).length>0;}catch(e){return false;}}

  window.delRecord=function(id){
    if(!confirm('Excluir esta negociação?'))return;
    addTombstone(id);
    try{addDeletedId(DELETED_RECORDS_KEY,id);}catch(e){}
    try{costs.filter(function(c){return c.recordId===id;}).forEach(function(c){addDeletedId(DELETED_COSTS_KEY,c.id);});}catch(e){}
    records=records.filter(function(x){return x.id!==id;});
    costs=costs.filter(function(c){return c.recordId!==id;});
    try{markOfflineDirty();}catch(e){}
    persist();renderAll();try{autoExcelBackup();}catch(e){}
    if(navigator.onLine)setTimeout(function(){window.syncPendingNow(true);},100);
  };

  async function syncSeparatedPdfs(list){
    if(!sb||!cloudUser)return;
    var cache={};try{cache=JSON.parse(userGet('gado_pdf_sync_index_v1')||'{}')||{};}catch(e){cache={};}
    var jobs=[],next={};
    (Array.isArray(list)?list:[]).forEach(function(r){
      if(!r||!r.id)return;
      [['gta',r.gtaPdf],['nota',r.notaPdf],['payment',r.paymentPdf]].forEach(function(pair){
        var doc=pair[1],key=String(r.id)+'|'+pair[0];
        if(!doc||!doc.data)return;
        var sig=String(doc.name||'')+'|'+String(doc.type||'')+'|'+String(doc.data);
        next[key]=sig;
        if(cache[key]===sig)return;
        jobs.push(sb.from('gado_pdfs').upsert({user_id:cloudUser.id,record_id:String(r.id),kind:pair[0],document:doc,updated_at:r.updatedAt||new Date().toISOString()},{onConflict:'user_id,record_id,kind'}));
      });
    });
    var results=await Promise.all(jobs);
    for(var i=0;i<results.length;i++)if(results[i]&&results[i].error)throw results[i].error;
    try{userSet('gado_pdf_sync_index_v1',JSON.stringify(next));}catch(e){}
  }
  function recordsWithoutPdfs(list){
    return (Array.isArray(list)?list:[]).map(function(r){
      if(!r)return r;
      var x=Object.assign({},r);delete x.gtaPdf;delete x.notaPdf;delete x.paymentPdf;return x;
    });
  }
  async function loadSeparatedPdfs(list){
    if(!sb||!cloudUser)return [];
    var res=await sb.from('gado_pdfs').select('record_id,kind,document,updated_at').eq('user_id',cloudUser.id);
    if(res.error)throw res.error;
    var map={};(res.data||[]).forEach(function(x){map[String(x.record_id)+'|'+x.kind]=x.document;});
    return (Array.isArray(list)?list:[]).map(function(r){
      if(!r||!r.id)return r;
      var x=Object.assign({},r);
      if(map[String(r.id)+'|gta'])x.gtaPdf=map[String(r.id)+'|gta'];
      if(map[String(r.id)+'|nota'])x.notaPdf=map[String(r.id)+'|nota'];
      if(map[String(r.id)+'|payment'])x.paymentPdf=map[String(r.id)+'|payment'];
      return x;
    });
  }

  async function save96(){
    if(!sb||!cloudUser)return false;
    if(!navigator.onLine){try{markOfflineDirty();}catch(e){}setCloudStatus('Offline • pendente','warn');return false;}
    if(sync96Busy)return false;
    sync96Busy=true;
    try{
      var dels=applyDeleted();
      await syncSeparatedPdfs(records);
      var payload={user_id:cloudUser.id,records:recordsWithoutPdfs(records),costs:costs,clients:localClients(),animals:localObject(ANIMALS_KEY),lots:localObject(LOTS_KEY),deleted_records:dels,updated_at:new Date().toISOString()};
      var res=await sb.from(CLOUD_TABLE).upsert(payload,{onConflict:'user_id'});
      if(res.error)throw res.error;
      // Confirma o upsert sem devolver records/PDFs: reduz muito o tráfego no APK.

      clearConfirmedFlags();
      markSynced();
      return true;
    }catch(e){try{markOfflineDirty();}catch(_){}setCloudStatus('Pendente de sincronização','warn');console.error('SYNC96 SAVE',e);return false;}
    finally{sync96Busy=false;}
  }

  async function load96(force){
    if(!sb||!cloudUser||!navigator.onLine)return false;
    if(sync96Busy)return false;
    if(!force && Date.now()-lastPullAt<5000)return true;
    sync96Busy=true;lastPullAt=Date.now();
    try{
      var localBefore=stable(records), costsBefore=stable(costs), clientsBefore=stable(localClients()), pendingBefore=hasPending();
      var res=await sb.from(CLOUD_TABLE).select('records,costs,clients,animals,lots,deleted_records,updated_at').eq('user_id',cloudUser.id).maybeSingle();
      if(res.error)throw res.error;
      if(!res.data){sync96Busy=false;return await save96();}
      var deleted=applyDeleted(Array.isArray(res.data.deleted_records)?res.data.deleted_records:[]);
      var cloudRecords=Array.isArray(res.data.records)?res.data.records:[];
      cloudRecords=await loadSeparatedPdfs(cloudRecords);
      var cloudCosts=Array.isArray(res.data.costs)?res.data.costs:[];
      var cloudClients=Array.isArray(res.data.clients)?res.data.clients:[];
      cloudClients=cloudClients.map(function(x){if(!x||x.id)return x;return Object.assign({},x,{id:'cad-'+String(x.documento||x.nome||'cliente').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')});});
      var cloudAnimals=res.data.animals&&typeof res.data.animals==='object'?res.data.animals:{};
      var cloudLots=res.data.lots&&typeof res.data.lots==='object'?res.data.lots:{};
      records=mergeById(cloudRecords,records,deleted).filter(function(r){return deleted.indexOf(r&&r.id)<0;});
      costs=mergeById(cloudCosts,costs,getDeletedIds(DELETED_COSTS_KEY));
      var mergedClients=mergeById(cloudClients,localClients(),[]);
      var mergedAnimals=mergeObject(cloudAnimals,localObject(ANIMALS_KEY));
      var mergedLots=mergeObject(cloudLots,localObject(LOTS_KEY));
      userSet(CLIENTS_KEY,JSON.stringify(mergedClients));
      userSet(ANIMALS_KEY,JSON.stringify(mergedAnimals));
      userSet(LOTS_KEY,JSON.stringify(mergedLots));
      document.dispatchEvent(new CustomEvent('clientesAtualizados',{detail:{source:'cloud'}}));
      userSet(KEY,JSON.stringify(records));userSet(COSTKEY,JSON.stringify(costs));renderAll();
      var cloudDeleted=Array.isArray(res.data.deleted_records)?res.data.deleted_records:[];
      var needsPush=pendingBefore || stable(records)!==stable(cloudRecords.filter(function(r){return deleted.indexOf(r&&r.id)<0;})) || stable(costs)!==stable(cloudCosts) || stable(mergedClients)!==stable(cloudClients) || stable(mergedAnimals)!==stable(cloudAnimals) || stable(mergedLots)!==stable(cloudLots) || stable(deleted)!==stable(cloudDeleted);
      sync96Busy=false;
      if(needsPush)return await save96();
      clearConfirmedFlags();markSynced();return true;
    }catch(e){console.error('SYNC96 LOAD',e);setCloudStatus('Pendente de sincronização','warn');return false;}
    finally{sync96Busy=false;}
  }

  cloudSaveNow=save96;
  cloudLoad=function(){return load96(true);};
  scheduleCloudSave=function(){clearTimeout(sync96Timer);setCloudStatus('Salvando na nuvem…','warn');sync96Timer=setTimeout(function(){save96();},350);};
  window.syncPendingNow=async function(manual){if(!navigator.onLine){setCloudStatus('Offline • pendente','warn');return false;}if(hasPending())return save96();return load96(!!manual);};

  var originalInitCloud=window.initCloud;var reconnectUntil=0;
  function keepUi(){try{if(typeof cloudUser!=='undefined'&&cloudUser&&typeof setAuthenticatedUI==='function')setAuthenticatedUI(true);}catch(e){}}
  async function recoverSession(tryNo){try{bootLoginApproved=true;}catch(e){}keepUi();try{if(typeof sb!=='undefined'&&sb&&navigator.onLine){var r=await sb.auth.getSession();var s=r&&r.data&&r.data.session;if(s&&s.user){try{cloudUser=s.user;}catch(e){}try{bootLoginApproved=true;}catch(e){}keepUi();await window.syncPendingNow(true);return true;}}}catch(e){}if(Date.now()<reconnectUntil&&(tryNo||0)<8)setTimeout(function(){recoverSession((tryNo||0)+1);},800);return false;}
  window.initCloud=async function(){if(Date.now()<reconnectUntil){try{bootLoginApproved=true;}catch(e){}keepUi();recoverSession(0);return;}if(typeof originalInitCloud==='function')return originalInitCloud();};
  window.addEventListener('online',function(ev){reconnectUntil=Date.now()+10000;try{bootLoginApproved=true;}catch(e){}try{ev.stopImmediatePropagation();}catch(e){}keepUi();setTimeout(function(){recoverSession(0);},250);},true);
  window.addEventListener('pageshow',function(){applyDeleted();try{if(typeof cloudUser!=='undefined'&&cloudUser){bootLoginApproved=true;keepUi();}}catch(e){}},true);

  function forceVersion(){try{document.body.setAttribute('data-app-version','183');document.title='Compra e Venda de Gado — v183';var h=document.querySelector('header h1');if(h){var spans=h.querySelectorAll('span');var found=false;spans.forEach(function(s){if(/^v\d+$/i.test((s.textContent||'').trim())){s.textContent='v183';found=true;}});if(!found){var b=document.createElement('span');b.textContent='v183';b.style.cssText='font-size:12px;font-weight:800;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.16);vertical-align:middle;white-space:nowrap;margin-left:6px';h.appendChild(b);}}}catch(e){}}
  function refresh(){forceVersion();applyDeleted();try{if(typeof renderTable==='function')renderTable();}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();setTimeout(refresh,500);setTimeout(refresh,1500);
})();


/* CONSOLIDATED: v103-pdf-open.js */
/* Compra e Venda de Gado — v183 PDF mobile direto + restauração segura */
(function(){
  function dataUrlToBlob(dataUrl){
    var parts=String(dataUrl||'').split(',');
    if(parts.length<2) throw new Error('PDF sem conteúdo válido');
    var meta=parts[0]||'';
    var mime=(meta.match(/data:([^;]+)/)||[])[1]||'application/pdf';
    var payload=parts.slice(1).join(',');
    var bin=meta.indexOf(';base64')>=0 ? atob(payload) : decodeURIComponent(payload);
    var bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i)&255;
    return new Blob([bytes],{type:mime});
  }
  function safeName(name){
    var n=String(name||'documento.pdf').replace(/[\\/:*?"<>|]+/g,'_').trim();
    if(!/\.pdf$/i.test(n)) n+='.pdf';
    return n||'documento.pdf';
  }
  function isMobileWeb(){
    return !window.AndroidPdf && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'') || window.innerWidth<=700);
  }
  function downloadPdf(doc){
    var blob=dataUrlToBlob(doc.data),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=safeName(doc.name);a.rel='noopener';a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}},120000);
  }
  function openPdfDirect(doc){
    var target='gadoPdf_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    var popup=null;
    try{popup=window.open('about:blank',target);}catch(e){}
    try{
      if(popup){
        popup.document.open();
        popup.document.write('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo PDF...</title><body style="font-family:system-ui;padding:24px">Abrindo PDF...</body>');
        popup.document.close();
      }
    }catch(e){}
    var form=document.createElement('form');
    form.method='POST';
    form.action='/api/pdf-open';
    form.target=popup?target:'_self';
    form.enctype='multipart/form-data';
    form.style.display='none';
    var d=document.createElement('input');d.type='hidden';d.name='pdf';d.value=doc.data;
    var n=document.createElement('input');n.type='hidden';n.name='name';n.value=safeName(doc.name);
    form.appendChild(d);form.appendChild(n);document.body.appendChild(form);
    form.submit();
    setTimeout(function(){try{form.remove();}catch(e){}},1000);
  }
  function openPdfDesktop(doc){
    var blob=dataUrlToBlob(doc.data),url=URL.createObjectURL(blob),w=null;
    try{w=window.open(url,'_blank','noopener,noreferrer');}catch(e){}
    if(!w){try{window.location.href=url;}catch(e){downloadPdf(doc);}}
    setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}},300000);
  }
  window.openStoredPdfV85=function(id){
    try{
      var doc=(window.__pdfDocsV85||{})[id];
      if(!doc||!doc.data) throw new Error('Documento não encontrado');
      var name=safeName(doc.name);
      if(window.AndroidPdf && typeof window.AndroidPdf.openPdf==='function'){
        window.AndroidPdf.openPdf(doc.data,name);return;
      }
      if(isMobileWeb()) openPdfDirect(doc); else openPdfDesktop(doc);
    }catch(e){
      try{var d=(window.__pdfDocsV85||{})[id];if(d&&d.data){downloadPdf(d);return;}}catch(_){}
      alert('Não foi possível abrir o PDF: '+(e&&e.message?e.message:e));
    }
  };

  var cfg={gta:{input:'rgtaFile',status:'rgtaFileStatus',field:'gtaPdf',label:'GTA'},nota:{input:'rnotaFile',status:'rnotaFileStatus',field:'notaPdf',label:'Nota'},pay:{input:'rpayFile',status:'rpayFileStatus',field:'paymentPdf',label:'Comprovante'}};
  function currentRecord(){try{var id=(document.getElementById('rid')||{}).value||'';return (typeof records!=='undefined'&&Array.isArray(records))?records.find(function(x){return x.id===id;}):null;}catch(e){return null;}}
  function registerDoc(doc){if(!doc||!doc.data)return null;window.__pdfDocsV85=window.__pdfDocsV85||{};var id='pdf-'+Math.random().toString(36).slice(2)+Date.now().toString(36);window.__pdfDocsV85[id]=doc;return id;}
  function htmlEsc(s){return String(s||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function renderOne(key,doc){
    var c=cfg[key],st=document.getElementById(c.status),inp=document.getElementById(c.input);if(!st||!inp)return;inp.dataset.deletePdf='0';
    if(!doc||!doc.data){st.innerHTML='';return;}
    var id=registerDoc(doc),nm=doc.name||c.label+'.pdf';
    st.innerHTML='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:6px"><span class="hint" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+htmlEsc(nm)+'">'+htmlEsc(nm)+'</span><button type="button" class="mini" onclick="openStoredPdfV85(\''+id+'\')">Abrir PDF</button><button type="button" class="mini" style="background:#fff0ee;color:#b42318" onclick="markPdfDeleteV106(\''+key+'\')">Excluir PDF</button></div>';
  }
  window.markPdfDeleteV106=function(key){var c=cfg[key];if(!c)return;var inp=document.getElementById(c.input),st=document.getElementById(c.status);if(!inp||!st)return;inp.dataset.deletePdf='1';inp.value='';st.innerHTML='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:6px"><span class="hint" style="color:#b42318;font-weight:700">PDF será excluído ao salvar</span><button type="button" class="mini" onclick="cancelPdfDeleteV106(\''+key+'\')">Cancelar exclusão</button></div>';};
  window.cancelPdfDeleteV106=function(key){var r=currentRecord();if(r)renderOne(key,r[cfg[key].field]);};
  function renderCurrentDocs(){var r=currentRecord();Object.keys(cfg).forEach(function(k){renderOne(k,r?r[cfg[k].field]:null);});}
  var oldFileToStoredObject=window.fileToStoredObject;
  if(typeof oldFileToStoredObject==='function')window.fileToStoredObject=async function(input,oldDoc){if(input&&input.dataset&&input.dataset.deletePdf==='1')return null;return oldFileToStoredObject(input,oldDoc);};
  var oldEdit=window.editRecord;if(typeof oldEdit==='function')window.editRecord=function(id){var r=oldEdit(id);setTimeout(renderCurrentDocs,0);return r;};
  var oldNew=window.newRecord;if(typeof oldNew==='function')window.newRecord=function(){var r=oldNew();setTimeout(function(){Object.keys(cfg).forEach(function(k){renderOne(k,null);});},0);return r;};
  Object.keys(cfg).forEach(function(k){var inp=document.getElementById(cfg[k].input);if(!inp)return;inp.addEventListener('change',function(){inp.dataset.deletePdf='0';var f=inp.files&&inp.files[0],st=document.getElementById(cfg[k].status);if(f&&st)st.innerHTML='<div class="hint" style="margin-top:6px">Novo arquivo: <b>'+htmlEsc(f.name)+'</b> — será salvo ao confirmar a negociação.</div>';});});

  function itemKey(x){if(x&&x.id!=null)return 'id:'+String(x.id);try{return 'sig:'+JSON.stringify(x);}catch(e){return 'sig:'+String(x);}}
  function ts(x){var t=Date.parse(x&&x.updatedAt||'');return isNaN(t)?0:t;}
  function mergeSafe(current,incoming){var map=new Map(),order=[];(Array.isArray(current)?current:[]).forEach(function(x){var k=itemKey(x);if(!map.has(k))order.push(k);map.set(k,x);});(Array.isArray(incoming)?incoming:[]).forEach(function(x){var k=itemKey(x);if(!map.has(k)){order.push(k);map.set(k,x);return;}var old=map.get(k);if(ts(x)>ts(old))map.set(k,x);});return order.map(function(k){return map.get(k);});}
  function safetyBackup(){try{if(typeof download!=='function')return false;var now=new Date().toISOString().replace(/[:.]/g,'-');download('backup_antes_restaurar_'+now+'.json',JSON.stringify({records:records,costs:costs},null,2),'application/json');return true;}catch(e){return false;}}
  function installSafeRestore(){
    var inp=document.getElementById('restore');if(!inp||inp.dataset.safeRestoreV109==='1')return;inp.dataset.safeRestoreV109='1';
    inp.addEventListener('change',function(e){e.stopImmediatePropagation();var f=inp.files&&inp.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){try{var x=JSON.parse(rd.result),incRecords,incCosts;if(Array.isArray(x)){incRecords=x;incCosts=[];}else{incRecords=x&&x.records;incCosts=x&&x.costs;}if(!Array.isArray(incRecords))throw new Error('Arquivo não contém uma lista válida de negociações.');if(incCosts!=null&&!Array.isArray(incCosts))throw new Error('Lista de custos inválida.');incCosts=Array.isArray(incCosts)?incCosts:[];safetyBackup();var mode=prompt('RESTAURAÇÃO SEGURA\n\nDigite MESCLAR para recuperar o backup sem apagar dados mais novos.\nDigite SUBSTITUIR para trocar toda a base atual pelo arquivo.\n\nRecomendado: MESCLAR','MESCLAR');if(!mode){inp.value='';return;}mode=String(mode).trim().toUpperCase();if(mode==='MESCLAR'){records=mergeSafe(records,incRecords);costs=mergeSafe(costs,incCosts);}else if(mode==='SUBSTITUIR'){if(!confirm('ATENÇÃO: SUBSTITUIR remove da base atual tudo que não estiver neste backup. Confirma?')){inp.value='';return;}records=incRecords;costs=incCosts;}else{alert('Opção inválida. Nada foi alterado.');inp.value='';return;}persist();renderAll();alert(mode==='MESCLAR'?'Backup mesclado com segurança. Os dados mais novos foram preservados.':'Backup substituído. Um backup preventivo foi gerado antes da restauração.');}catch(err){alert('Backup inválido: '+(err&&err.message?err.message:err));}inp.value='';};rd.onerror=function(){alert('Não foi possível ler o arquivo de backup.');inp.value='';};rd.readAsText(f);},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installSafeRestore);else installSafeRestore();

  function forceWebVersion112(){try{document.title='Compra e Venda de Gado — v183';var h=document.querySelector('header h1')||document.querySelector('h1');if(h){var spans=h.querySelectorAll('span');for(var i=0;i<spans.length;i++){if(/^v\d+$/i.test((spans[i].textContent||'').trim()))spans[i].textContent='v183';}}}catch(e){}}
  forceWebVersion112();setTimeout(forceWebVersion112,800);setTimeout(forceWebVersion112,2000);setInterval(forceWebVersion112,10000);window.APP_WEB_VERSION='183';
})();


/* CONSOLIDATED: v116-pdf-mobile.js */
/* Compra e Venda de Gado — v183 PDF Android interno + Safari iPhone */
(function(){
  function isIOS(){
    var ua=navigator.userAgent||'';
    return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  }
  function isMobile(){return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'') || window.innerWidth<=800;}
  function openIOS(doc){
    var tab=null;
    try{tab=window.open('about:blank','_blank');}catch(e){}
    try{
      var bytes=bytesFromDataUrl(doc.data);
      var blob=new Blob([bytes],{type:'application/pdf'});
      var url=URL.createObjectURL(blob);
      if(tab){
        try{tab.opener=null;}catch(e){}
        tab.location.replace(url);
      }else{
        var a=document.createElement('a');
        a.href=url;a.target='_blank';a.rel='noopener';a.style.display='none';
        document.body.appendChild(a);a.click();a.remove();
      }
      setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}},600000);
    }catch(e){
      try{if(tab)tab.close();}catch(_){}
      throw e;
    }
  }
  function bytesFromDataUrl(dataUrl){
    var parts=String(dataUrl||'').split(',');
    if(parts.length<2) throw new Error('PDF sem conteúdo válido');
    var meta=parts[0]||'', payload=parts.slice(1).join(',');
    var bin=meta.indexOf(';base64')>=0 ? atob(payload) : decodeURIComponent(payload);
    var bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i)&255;
    return bytes;
  }
  function safeName(name){
    var n=String(name||'documento.pdf').replace(/[\\/:*?"<>|]+/g,'_').trim();
    if(!/\.pdf$/i.test(n)) n+='.pdf';
    return n||'documento.pdf';
  }
  function loadPdfJs(){
    if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
    return new Promise(function(resolve,reject){
      var s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload=function(){
        try{
          window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        }catch(e){reject(e);}
      };
      s.onerror=function(){reject(new Error('Não foi possível carregar o leitor de PDF.'));};
      document.head.appendChild(s);
    });
  }
  function closeViewer(){var m=document.getElementById('cvPdf116');if(m)m.remove();}
  window.closePdf116=closeViewer;
  async function showMobile(doc){
    closeViewer();
    var m=document.createElement('div');
    m.id='cvPdf116';
    m.style.cssText='position:fixed;inset:0;z-index:100000;background:#181818;display:flex;flex-direction:column';
    var bar=document.createElement('div');
    bar.style.cssText='display:flex;align-items:center;gap:8px;padding:10px;background:#173b28;color:#fff;min-height:54px';
    var title=document.createElement('div');
    title.textContent=safeName(doc.name);title.style.cssText='flex:1;font-weight:800;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    var dl=document.createElement('button');
    dl.type='button';dl.textContent='Baixar';dl.style.cssText='border:0;border-radius:8px;padding:8px 12px;font-weight:800';
    dl.onclick=function(){
      try{var b=new Blob([bytesFromDataUrl(doc.data)],{type:'application/pdf'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=safeName(doc.name);a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},60000);}catch(e){alert('Falha ao baixar PDF: '+e.message);}
    };
    var x=document.createElement('button');x.type='button';x.textContent='Fechar';x.onclick=closeViewer;x.style.cssText='border:0;border-radius:8px;padding:8px 12px;font-weight:800';
    bar.appendChild(title);bar.appendChild(dl);bar.appendChild(x);
    var body=document.createElement('div');body.style.cssText='flex:1;overflow:auto;padding:10px;background:#2b2b2b;text-align:center';body.innerHTML='<div style="color:white;padding:30px;font-weight:700">Carregando PDF...</div>';
    m.appendChild(bar);m.appendChild(body);document.body.appendChild(m);
    try{
      var pdfjs=await loadPdfJs();
      var bytes=bytesFromDataUrl(doc.data);
      var pdf=await pdfjs.getDocument({data:bytes,disableWorker:false}).promise;
      body.innerHTML='';
      for(var p=1;p<=pdf.numPages;p++){
        var page=await pdf.getPage(p);
        var base=page.getViewport({scale:1});
        var max=Math.min(Math.max(window.innerWidth-20,280),1000);
        var scale=max/base.width;
        var viewport=page.getViewport({scale:scale});
        var c=document.createElement('canvas');
        c.width=Math.floor(viewport.width);c.height=Math.floor(viewport.height);
        c.style.cssText='display:block;max-width:100%;height:auto;margin:0 auto 12px;background:white;box-shadow:0 2px 12px #0008';
        body.appendChild(c);
        await page.render({canvasContext:c.getContext('2d'),viewport:viewport}).promise;
      }
    }catch(e){
      body.innerHTML='<div style="color:white;padding:30px;font-weight:700">Falha ao visualizar PDF.<br><small>'+String(e&&e.message?e.message:e)+'</small></div>';
    }
  }
  function openDesktop(doc){
    try{
      var b=new Blob([bytesFromDataUrl(doc.data)],{type:'application/pdf'}),u=URL.createObjectURL(b),w=window.open(u,'_blank','noopener,noreferrer');
      if(!w)window.location.href=u;
      setTimeout(function(){try{URL.revokeObjectURL(u);}catch(e){}},300000);
    }catch(e){alert('Não foi possível abrir o PDF: '+e.message);}
  }
  window.openStoredPdfV85=function(id){
    try{
      var doc=(window.__pdfDocsV85||{})[id];
      if(!doc||!doc.data)throw new Error('Documento não encontrado');
      if(isIOS()){openIOS(doc);return;}
      if(isMobile()){showMobile(doc);return;}
      if(window.AndroidPdf&&typeof window.AndroidPdf.openPdf==='function'){window.AndroidPdf.openPdf(doc.data,safeName(doc.name));return;}
      openDesktop(doc);
    }catch(e){alert('Não foi possível abrir o PDF: '+(e&&e.message?e.message:e));}
  };
  function forceVersion(){
    try{
      document.title='Compra e Venda de Gado — v183';
      var h=document.querySelector('header h1')||document.querySelector('h1');
      if(h)h.querySelectorAll('span').forEach(function(s){if(/^v\d+$/i.test((s.textContent||'').trim()))s.textContent='v183';});
    }catch(e){}
  }
  forceVersion();setTimeout(forceVersion,300);setTimeout(forceVersion,1000);window.APP_WEB_VERSION='183';
})();


/* CONSOLIDATED: v112-payments.js */
/* Compra e Venda de Gado — v112 parcelas e pagamentos consistentes */
(function(){
  'use strict';

  function el(id){return document.getElementById(id);}
  function numberValue(v){var x=Number(v);return Number.isFinite(x)?x:0;}
  function isoToday(){return new Date().toISOString().slice(0,10);}
  function escapeHtml(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function cash(v){try{return money.format(numberValue(v));}catch(e){return 'R$ '+numberValue(v).toFixed(2).replace('.',',');}}
  function sideOf(p){
    var raw=String((p&&(p.type||p.tipo||p.side||p.operacao))||'').trim().toLowerCase();
    return raw.indexOf('pagar')>=0||raw.indexOf('compra')>=0||raw.indexOf('vendedor')>=0?'Pagar':'Receber';
  }
  function isPaid(p){
    var status=String((p&&p.status)||'').trim().toLowerCase();
    return !!(p&&(p.paid===true||p.baixada===true||p.pago===true||status==='ok'||status==='pago'||status==='recebido'||status==='baixada'));
  }
  function valueOf(p){return numberValue(p&&(p.value!=null?p.value:(p.valor!=null?p.valor:p.amount)));}
  function dateOf(p){return String((p&&(p.date||p.vencimento||p.dueDate))||'');}
  function paidDateOf(p){return String((p&&(p.paidDate||p.dataBaixa||p.dataPagamento))||'');}
  function normalizeInstallment(p,i){
    return {
      id:String((p&&p.id)||('parcela_'+Date.now().toString(36)+'_'+i+'_'+Math.random().toString(36).slice(2,7))),
      type:sideOf(p),
      date:dateOf(p),
      value:valueOf(p),
      paid:isPaid(p),
      paidDate:paidDateOf(p)
    };
  }
  function recordInstallments(r,side){
    var list=Array.isArray(r&&r.installments)?r.installments:(Array.isArray(r&&r.parcelas)?r.parcelas:[]);
    return list.map(normalizeInstallment).filter(function(p){return !side||p.type===side;});
  }
  function recordTotal(r,side){
    if(side==='Pagar')return numberValue(r&&r.quantCompra)*numberValue(r&&r.precoCompra);
    return numberValue(r&&r.quantVenda)*numberValue(r&&r.precoVenda);
  }
  function formTotal(side){
    if(side==='Pagar')return numberValue(el('rqcomp')&&el('rqcomp').value)*numberValue(el('rpc')&&el('rpc').value);
    return numberValue(el('rqv')&&el('rqv').value)*numberValue(el('rpv')&&el('rpv').value);
  }
  function statusValue(r,side){return String(side==='Pagar'?(r&&r.pg):(r&&r.pgComprador)||'').trim().toLowerCase();}
  function stateForRecord(r,side){
    var total=recordTotal(r,side),list=recordInstallments(r,side),manualOk=statusValue(r,side)==='ok';
    var scheduled=list.reduce(function(s,p){return s+p.value;},0);
    var paid=list.filter(function(p){return p.paid;}).reduce(function(s,p){return s+p.value;},0);
    var unpaid=list.filter(function(p){return !p.paid;}).reduce(function(s,p){return s+p.value;},0);
    var outstanding=0;
    if(!manualOk){
      if(list.length)outstanding=total>0?Math.max(0,total-paid):unpaid;
      else outstanding=Math.max(0,total);
    }
    return {total:total,list:list,scheduled:scheduled,paid:paid,unpaid:unpaid,outstanding:outstanding,manualOk:manualOk};
  }

  function currentRows(){
    return Array.prototype.slice.call(document.querySelectorAll('.installmentRow')).map(function(row,i){
      var type=row.querySelector('.itype'),date=row.querySelector('.idate'),value=row.querySelector('.ivalue'),paid=row.querySelector('.ipaid'),paidDate=row.querySelector('.ipaiddate');
      return {
        id:String(row.getAttribute('data-id')||('parcela_'+Date.now().toString(36)+'_'+i)),
        type:type?type.value:'Receber',
        date:date?date.value:'',
        value:numberValue(value&&value.value),
        paid:!!(paid&&paid.value==='1'),
        paidDate:paidDate?paidDate.value:''
      };
    }).filter(function(p){return p.date||p.value;});
  }

  function editorState(side){
    var list=currentRows().filter(function(p){return p.type===side;}),total=formTotal(side);
    var scheduled=list.reduce(function(s,p){return s+p.value;},0);
    var paid=list.filter(function(p){return p.paid;}).reduce(function(s,p){return s+p.value;},0);
    return {list:list,total:total,scheduled:scheduled,paid:paid,pending:Math.max(0,total-paid),difference:total-scheduled};
  }

  function updateEditorSummary(){
    var box=el('installmentTotals');if(!box)return;
    var pagar=editorState('Pagar'),receber=editorState('Receber');
    function card(label,s,color){
      var diff=Math.abs(s.difference)>0.01;
      var note=!s.list.length?'Sem parcelas':(diff?(s.difference>0?'Falta distribuir '+cash(s.difference):'Parcelas excedem '+cash(Math.abs(s.difference))):'Total distribuído corretamente');
      return '<div style="flex:1;min-width:220px;border:1px solid '+(diff?'#e4b6ad':'#cfe5d7')+';background:'+(diff?'#fff5f2':'#f2faf5')+';border-radius:10px;padding:10px">'+
        '<b style="color:'+color+'">'+label+'</b><div style="margin-top:5px">Negociação: <b>'+cash(s.total)+'</b></div>'+
        '<div>Parcelado: '+cash(s.scheduled)+' • Baixado: '+cash(s.paid)+'</div><div>Pendente real: <b>'+cash(s.pending)+'</b></div>'+
        '<small style="color:'+(diff?'#a43d2d':'#31734d')+'">'+note+'</small></div>';
    }
    box.innerHTML='<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px">'+card('A pagar ao vendedor',pagar,'#9a5b00')+card('A receber do comprador',receber,'#176b45')+'</div>';
    var planSide=el('paymentPlanSide'),planTotal=el('paymentPlanTotal');
    if(planSide&&planTotal)planTotal.textContent='Total: '+cash(formTotal(planSide.value));
  }

  window.renderInstallmentsEditor=function(list){
    var target=el('installmentEditor');if(!target)return;
    var normalized=(Array.isArray(list)?list:[]).map(normalizeInstallment);
    target.innerHTML=normalized.map(function(p,i){
      var overdue=!p.paid&&p.date&&p.date<isoToday(),dueToday=!p.paid&&p.date===isoToday();
      var status=p.paid?'Baixada'+(p.paidDate?' em '+formatDateSafe(p.paidDate):''):(overdue?'Vencida':(dueToday?'Vence hoje':'Pendente'));
      var border=p.paid?'#bcdcc8':(overdue?'#dfaaa1':'#dfe6e0'),bg=p.paid?'#f1faf4':(overdue?'#fff3f1':'#fff');
      return '<div class="formgrid installmentRow" data-i="'+i+'" data-id="'+escapeHtml(p.id)+'" style="border:1px solid '+border+';background:'+bg+';padding:9px;border-radius:9px;margin-bottom:8px">'+
        '<div class="field"><label>Parcela '+(i+1)+'</label><select class="itype"><option '+(p.type==='Pagar'?'selected':'')+'>Pagar</option><option '+(p.type==='Receber'?'selected':'')+'>Receber</option></select><small style="font-weight:800;color:'+(overdue?'#b42318':'#557064')+'">'+status+'</small></div>'+
        '<div class="field"><label>Vencimento</label><input class="idate" type="date" value="'+escapeHtml(p.date)+'"></div>'+
        '<div class="field"><label>Valor</label><input class="ivalue" type="number" min="0" step="0.01" value="'+(p.value||'')+'"></div>'+
        '<div class="field"><label>Baixa</label><select class="ipaid" onchange="paymentInstallmentStatusChanged(this)"><option value="0" '+(!p.paid?'selected':'')+'>Pendente</option><option value="1" '+(p.paid?'selected':'')+'>Pago/Recebido</option></select></div>'+
        '<div class="field"><label>Data da baixa</label><input class="ipaiddate" type="date" value="'+escapeHtml(p.paidDate)+'"></div>'+
        '<div class="field"><label>Ações</label><div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="mini" onclick="toggleInstallmentPaidV112('+i+')">'+(p.paid?'Reabrir':'Dar baixa hoje')+'</button><button type="button" class="mini" style="background:#fff0ee;color:#b42318" onclick="removeInstallmentRow('+i+')">Excluir</button></div></div>'+
      '</div>';
    }).join('');
    updateEditorSummary();
  };

  window.collectInstallments=function(){return currentRows();};

  window.addInstallmentRow=function(){
    var list=currentRows(),buy=el('rpayBuy')&&el('rpayBuy').value==='Parcelado',sell=el('rpaySell')&&el('rpaySell').value==='Parcelado';
    var side=buy&&!sell?'Pagar':'Receber';
    list.push({id:'parcela_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),type:side,date:'',value:0,paid:false,paidDate:''});
    window.renderInstallmentsEditor(list);
  };

  window.removeInstallmentRow=function(i){
    var list=currentRows();list.splice(i,1);window.renderInstallmentsEditor(list);syncPgFields(false);
  };

  window.paymentInstallmentStatusChanged=function(select){
    var row=select&&select.closest('.installmentRow'),date=row&&row.querySelector('.ipaiddate');
    if(date){if(select.value==='1'&&!date.value)date.value=isoToday();if(select.value==='0')date.value='';}
    window.renderInstallmentsEditor(currentRows());syncPgFields(false);
  };

  window.toggleInstallmentPaidV112=function(i){
    var list=currentRows(),p=list[i];if(!p)return;p.paid=!p.paid;p.paidDate=p.paid?(p.paidDate||isoToday()):'';
    window.renderInstallmentsEditor(list);syncPgFields(false);
  };

  function addMonths(dateText,months){
    var parts=String(dateText||'').split('-').map(Number),y=parts[0],m=parts[1],d=parts[2];
    if(!y||!m||!d)return '';
    var targetMonth=(m-1)+months,targetYear=y+Math.floor(targetMonth/12);targetMonth=((targetMonth%12)+12)%12;
    var last=new Date(Date.UTC(targetYear,targetMonth+1,0)).getUTCDate(),day=Math.min(d,last);
    return String(targetYear).padStart(4,'0')+'-'+String(targetMonth+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  }

  function generatePlan(){
    var side=el('paymentPlanSide').value,count=Math.max(1,Math.min(60,Math.trunc(numberValue(el('paymentPlanCount').value)))),first=el('paymentPlanFirstDate').value,total=formTotal(side);
    if(total<=0){alert('Preencha a quantidade e o preço da '+(side==='Pagar'?'compra':'venda')+' antes de gerar as parcelas.');return;}
    if(!first){alert('Informe o primeiro vencimento.');return;}
    var all=currentRows(),same=all.filter(function(p){return p.type===side;});
    if(same.length&&!confirm('Substituir as '+same.length+' parcela(s) '+(side==='Pagar'?'a pagar':'a receber')+' já cadastradas?'))return;
    var keep=all.filter(function(p){return p.type!==side;}),cents=Math.round(total*100),base=Math.floor(cents/count),used=0,created=[];
    for(var i=0;i<count;i++){
      var part=i===count-1?cents-used:base;used+=part;
      created.push({id:'parcela_'+Date.now().toString(36)+'_'+i+'_'+Math.random().toString(36).slice(2,7),type:side,date:addMonths(first,i),value:part/100,paid:false,paidDate:''});
    }
    var method=side==='Pagar'?el('rpayBuy'):el('rpaySell'),pg=side==='Pagar'?el('rpg'):el('rpgc');
    if(method)method.value='Parcelado';if(pg)pg.value='pendente';
    window.renderInstallmentsEditor(keep.concat(created));
  }

  function syncPgFields(honorManualOk){
    ['Pagar','Receber'].forEach(function(side){
      var rows=currentRows().filter(function(p){return p.type===side;}),field=side==='Pagar'?el('rpg'):el('rpgc');if(!field||!rows.length)return;
      if(honorManualOk&&String(field.value).toLowerCase()==='ok'){
        var domRows=Array.prototype.slice.call(document.querySelectorAll('.installmentRow'));
        domRows.forEach(function(row){
          var type=row.querySelector('.itype'),paid=row.querySelector('.ipaid'),date=row.querySelector('.ipaiddate');
          if(type&&type.value===side){if(paid)paid.value='1';if(date&&!date.value)date.value=isoToday();}
        });
        field.value='ok';return;
      }
      field.value=rows.every(function(p){return p.paid;})?'ok':'pendente';
    });
    updateEditorSummary();
  }

  function validatePlanBeforeSave(event){
    syncPgFields(true);
    var problems=[];
    ['Pagar','Receber'].forEach(function(side){
      var state=editorState(side);
      if(state.list.length&&state.total>0&&Math.abs(state.scheduled-state.total)>0.01){
        var label=side==='Pagar'?'a pagar ao vendedor':'a receber do comprador';
        problems.push(label+': negociação '+cash(state.total)+' • parcelas '+cash(state.scheduled));
      }
    });
    if(problems.length){
      event.preventDefault();event.stopImmediatePropagation();
      var submit=event.target&&event.target.querySelector('button[type="submit"]');if(submit)submit.disabled=false;
      alert('O total das parcelas precisa ser exatamente igual ao total da negociação.\n\n'+problems.join('\n'));
    }
  }

  function pendingItems(r,side){
    var state=stateForRecord(r,side),result=[];if(state.outstanding<=0)return result;
    var remaining=state.outstanding,name=side==='Pagar'?(r.vendedor||'Vendedor não informado'):(r.comprador||'Comprador não informado');
    var typeLabel=side==='Pagar'?'A pagar':'A receber',unpaid=state.list.filter(function(p){return !p.paid;});
    unpaid.sort(function(a,b){return (a.date||'9999').localeCompare(b.date||'9999');});
    unpaid.forEach(function(p,i){
      if(remaining<=0.005)return;var amount=state.total>0?Math.min(p.value,remaining):p.value;if(amount<=0)return;
      remaining=Math.max(0,remaining-amount);
      var st=!p.date?'Sem vencimento':(p.date<isoToday()?'Vencida':(p.date===isoToday()?'Vence hoje':'Parcela pendente'));
      result.push({data:p.date||r.data,tipo:typeLabel,nome:name,q:'—',valor:amount,status:st+(unpaid.length>1?' • '+(i+1)+'ª parcela':'')});
    });
    if(remaining>0.005)result.push({data:r.data,tipo:typeLabel,nome:name,q:state.list.length?'—':(side==='Pagar'?numberValue(r.quantCompra):numberValue(r.quantVenda)),valor:remaining,status:state.list.length?'Saldo ainda não distribuído em parcelas':'Pagamento pendente'});
    return result;
  }

  window.v73SellerOutstanding=function(r){return stateForRecord(r,'Pagar').outstanding;};
  window.v73BuyerOutstanding=function(r){return stateForRecord(r,'Receber').outstanding;};

  window.installmentSummary=function(r){
    var pay=stateForRecord(r,'Pagar'),receive=stateForRecord(r,'Receber'),parts=[];
    if(pay.list.length||pay.outstanding>0)parts.push('Pagar: '+cash(pay.outstanding));
    if(receive.list.length||receive.outstanding>0)parts.push('Receber: '+cash(receive.outstanding));
    return parts.length?parts.join(' • '):'ok';
  };

  window.renderPendingFiltered=function(list){
    var source=Array.isArray(list)?list:[],items=[],pagar=0,receber=0;
    source.forEach(function(r){items=items.concat(pendingItems(r,'Pagar'),pendingItems(r,'Receber'));});
    items.forEach(function(x){if(x.tipo==='A pagar')pagar+=x.valor;else receber+=x.valor;});
    var kpis=el('pendingKpis'),body=el('pendingBody'),saldo=receber-pagar;
    if(kpis)kpis.innerHTML=[['Total a pagar',cash(pagar)],['Total a receber',cash(receber)],['Saldo a receber − pagar',cash(saldo)]].map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>';}).join('');
    items.sort(function(a,b){return (a.data||'9999').localeCompare(b.data||'9999');});
    if(body)body.innerHTML=items.length?items.map(function(x){var bad=x.status.indexOf('Vencida')===0;return '<tr><td>'+formatDateSafe(x.data)+'</td><td><span class="badge '+(x.tipo==='A pagar'?'warn':'')+'">'+x.tipo+'</span></td><td>'+escapeHtml(x.nome)+'</td><td class="num">'+(typeof x.q==='number'?numberFormatSafe(x.q):x.q)+'</td><td class="num"><b>'+cash(x.valor)+'</b></td><td style="color:'+(bad?'#b42318':'inherit')+';font-weight:'+(bad?'800':'inherit')+'">'+escapeHtml(x.status)+'</td></tr>';}).join(''):'<tr><td colspan="6" class="hint">Nenhum pagamento ou recebimento pendente para os filtros selecionados.</td></tr>';
  };

  window.renderPending=function(){
    var list;
    try{list=typeof reportFilteredRecords==='function'?reportFilteredRecords():records;}catch(e){list=records;}
    window.renderPendingFiltered(list);
  };

  function formatDateSafe(s){
    try{return typeof fmtDate==='function'?fmtDate(s):s||'—';}catch(e){return s||'—';}
  }
  function numberFormatSafe(v){try{return num.format(v);}catch(e){return String(v);}}

  function installTools(){
    var editor=el('installmentEditor');if(!editor||el('paymentPlanTools'))return;
    var tools=document.createElement('div');tools.id='paymentPlanTools';tools.style.cssText='border:1px solid #cfe5d7;background:#f5fbf7;border-radius:10px;padding:10px;margin:8px 0';
    tools.innerHTML='<b style="color:#176b45">Gerar parcelas automaticamente</b><div class="formgrid" style="margin-top:8px">'+
      '<div class="field"><label>Operação</label><select id="paymentPlanSide"><option value="Pagar">Pagar vendedor</option><option value="Receber">Receber comprador</option></select></div>'+
      '<div class="field"><label>Quantidade de parcelas</label><input id="paymentPlanCount" type="number" min="1" max="60" step="1" value="1"></div>'+
      '<div class="field"><label>Primeiro vencimento</label><input id="paymentPlanFirstDate" type="date"></div>'+
      '<div class="field"><label id="paymentPlanTotal">Total: R$ 0,00</label><button type="button" class="btn secondary" id="generatePaymentPlanBtn">Gerar parcelas</button></div></div>';
    editor.parentNode.insertBefore(tools,editor);
    var totals=document.createElement('div');totals.id='installmentTotals';editor.parentNode.insertBefore(totals,editor.nextSibling);
    el('paymentPlanFirstDate').value=(el('rdata')&&el('rdata').value)||isoToday();
    el('generatePaymentPlanBtn').onclick=generatePlan;
    el('paymentPlanSide').onchange=updateEditorSummary;
    var add=el('addInstallmentBtn');if(add)add.onclick=window.addInstallmentRow;
    var form=el('recordForm');if(form)form.addEventListener('submit',validatePlanBeforeSave,true);
    ['rqcomp','rpc','rqv','rpv'].forEach(function(id){var input=el(id);if(input)input.addEventListener('input',updateEditorSummary);});
    ['rpayBuy','rpaySell'].forEach(function(id){var input=el(id);if(input)input.addEventListener('change',function(){if(this.value==='Parcelado')el('paymentPlanSide').value=id==='rpayBuy'?'Pagar':'Receber';updateEditorSummary();});});
    editor.addEventListener('input',updateEditorSummary);
    editor.addEventListener('change',updateEditorSummary);
    updateEditorSummary();
  }

  installTools();
  try{
    var add=el('addInstallmentBtn');if(add)add.onclick=window.addInstallmentRow;
    if(typeof renderAll==='function')renderAll();
  }catch(e){console.warn('Parcelas v112:',e);}
  window.PAYMENTS_V112_READY=true;
})();


/* CONSOLIDATED: v112-backup.js */
(function(){
  'use strict';

  const BACKUP_FORMAT='gado-v112-backup';
  const BACKUP_SCHEMA=1;
  const APP_VERSION='112';
  const MAX_BACKUP_BYTES=180*1024*1024;
  const UNSAFE_KEYS=new Set(['__proto__','prototype','constructor']);
  let restorePreview=null;

  function byId(id){return document.getElementById(id)}
  function nowIso(){return new Date().toISOString()}
  function clone(value){return JSON.parse(JSON.stringify(value))}
  function asArray(value){return Array.isArray(value)?value:[]}
  function finite(value){const x=Number(value);return Number.isFinite(x)?x:0}
  function safeName(value){return String(value||'').replace(/[\\/:*?"<>|\r\n]+/g,'_').trim()}
  function stamp(value){const t=Date.parse(value&&value.updatedAt||'');return Number.isFinite(t)?t:0}
  function dateTag(){
    const d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'_'+String(d.getHours()).padStart(2,'0')+'-'+String(d.getMinutes()).padStart(2,'0');
  }
  function moneyText(value){
    return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  function html(value){
    return String(value??'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]});
  }
  function currentRecords(){try{return asArray(records)}catch(_){return []}}
  function currentCosts(){try{return asArray(costs)}catch(_){return []}}
  function currentUser(){
    try{
      if(typeof cloudUser!=='undefined'&&cloudUser){
        return {id:String(cloudUser.id||''),email:String(cloudUser.email||'')};
      }
    }catch(_){}
    return {id:'',email:''};
  }

  function safeCopy(value,depth){
    depth=depth||0;
    if(depth>30)throw new Error('O backup contém dados aninhados demais.');
    if(value===null||typeof value==='string'||typeof value==='boolean')return value;
    if(typeof value==='number')return Number.isFinite(value)?value:0;
    if(Array.isArray(value))return value.map(function(x){return safeCopy(x,depth+1)});
    if(value&&typeof value==='object'){
      const out={};
      Object.keys(value).forEach(function(key){
        if(!UNSAFE_KEYS.has(key))out[key]=safeCopy(value[key],depth+1);
      });
      return out;
    }
    return null;
  }

  function dedupe(list,prefix,backupCreatedAt){
    const map=new Map();
    let generated=0,duplicates=0;
    asArray(list).forEach(function(raw,index){
      if(!raw||typeof raw!=='object'||Array.isArray(raw))return;
      const item=safeCopy(raw,0);
      let id=String(item.id||'').trim();
      if(!id){
        id=prefix+'-restaurado-'+String(index+1)+'-'+String(Date.now());
        generated++;
      }
      item.id=id;
      if(!item.updatedAt&&backupCreatedAt)item.updatedAt=backupCreatedAt;
      const old=map.get(id);
      if(old){
        duplicates++;
        if(stamp(item)>=stamp(old))map.set(id,item);
      }else map.set(id,item);
    });
    return {items:Array.from(map.values()),generated:generated,duplicates:duplicates};
  }

  function dataForChecksum(rec,cost){
    return JSON.stringify({records:rec,costs:cost});
  }
  async function sha256(text){
    try{
      if(window.crypto&&window.crypto.subtle){
        const bytes=new TextEncoder().encode(text);
        const hash=await window.crypto.subtle.digest('SHA-256',bytes);
        return Array.from(new Uint8Array(hash)).map(function(x){return x.toString(16).padStart(2,'0')}).join('');
      }
    }catch(_){}
    let h=2166136261;
    for(let i=0;i<text.length;i++){
      h^=text.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return 'fnv32-'+(h>>>0).toString(16).padStart(8,'0');
  }

  function countPdfs(rec){
    return asArray(rec).reduce(function(total,r){
      return total+(r&&r.gtaPdf&&r.gtaPdf.data?1:0)+(r&&r.notaPdf&&r.notaPdf.data?1:0)+(r&&r.paymentPdf&&r.paymentPdf.data?1:0);
    },0);
  }

  function countInstallments(rec){
    return asArray(rec).reduce(function(total,r){return total+asArray(r&&r.installments).length},0);
  }

  function downloadBlob(name,blob){
    try{
      if(window.AndroidDownloads&&typeof window.AndroidDownloads.saveBase64==='function'){
        const reader=new FileReader();
        reader.onloadend=function(){
          try{window.AndroidDownloads.saveBase64(String(reader.result||''),name,blob.type||'application/octet-stream')}
          catch(error){if(window.AndroidDownloads.error)window.AndroidDownloads.error(String(error&&error.message||error))}
        };
        reader.onerror=function(){if(window.AndroidDownloads.error)window.AndroidDownloads.error('Falha ao preparar o arquivo')};
        reader.readAsDataURL(blob);
        return;
      }
    }catch(error){console.warn('Ponte de download Android:',error)}
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=name;
    a.rel='noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},1500);
  }

  async function createFullBackup(){
    const button=byId('backupBtn');
    const oldText=button?button.textContent:'';
    if(button){button.disabled=true;button.textContent='Preparando backup…'}
    try{
      const rec=clone(currentRecords());
      const cost=clone(currentCosts());
      const createdAt=nowIso();
      const owner=currentUser();
      const checksum=await sha256(dataForChecksum(rec,cost));
      const payload={
        format:BACKUP_FORMAT,
        schemaVersion:BACKUP_SCHEMA,
        appVersion:APP_VERSION,
        createdAt:createdAt,
        owner:{id:owner.id,email:owner.email},
        summary:{records:rec.length,costs:cost.length,installments:countInstallments(rec),pdfs:countPdfs(rec)},
        checksum:{algorithm:checksum.startsWith('fnv32-')?'FNV-1a-32':'SHA-256',value:checksum},
        data:{records:rec,costs:cost}
      };
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
      downloadBlob('backup_completo_gado_v112_'+dateTag()+'.json',blob);
      alert('Backup completo criado. Ele inclui negociações, custos, parcelas e os PDFs anexados.');
    }catch(error){
      console.error('BACKUP V112',error);
      alert('Não foi possível criar o backup: '+(error&&error.message?error.message:error));
    }finally{
      if(button){button.disabled=false;button.textContent=oldText||'Backup completo'}
    }
  }

  function xml(value){
    return String(value??'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]});
  }
  function columnName(index){
    let out='';
    for(let n=index+1;n>0;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;
    return out;
  }
  function excelDate(value){
    const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(!m)return null;
    const ms=Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]));
    return Math.floor((ms-Date.UTC(1899,11,30))/86400000);
  }
  function xlsxCell(ref,value,type,header){
    if(header)return '<c r="'+ref+'" s="1" t="inlineStr"><is><t>'+xml(value)+'</t></is></c>';
    if(value===null||value===undefined||value==='')return '<c r="'+ref+'"/>';
    if(type==='date'){
      const serial=excelDate(value);
      if(serial!==null)return '<c r="'+ref+'" s="3"><v>'+serial+'</v></c>';
    }
    if(type==='money')return '<c r="'+ref+'" s="2"><v>'+finite(value)+'</v></c>';
    if(type==='integer')return '<c r="'+ref+'" s="4"><v>'+Math.round(finite(value))+'</v></c>';
    if(type==='decimal'||typeof value==='number')return '<c r="'+ref+'" s="5"><v>'+finite(value)+'</v></c>';
    if(type==='boolean')return '<c r="'+ref+'" t="inlineStr"><is><t>'+(value?'Sim':'Não')+'</t></is></c>';
    return '<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>';
  }
  function sheetXml(columns,rows){
    const lastCol=columnName(Math.max(0,columns.length-1));
    const lastRow=Math.max(1,rows.length+1);
    const widths=columns.map(function(c,i){
      let width=Number(c.width)||Math.max(10,String(c.label||'').length+2);
      for(let j=0;j<Math.min(rows.length,80);j++)width=Math.max(width,Math.min(42,String(rows[j][c.key]??'').length+2));
      return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+Math.min(width,42)+'" customWidth="1"/>';
    }).join('');
    const header='<row r="1" ht="24" customHeight="1">'+columns.map(function(c,i){return xlsxCell(columnName(i)+'1',c.label,c.type,true)}).join('')+'</row>';
    const body=rows.map(function(row,rowIndex){
      const r=rowIndex+2;
      return '<row r="'+r+'">'+columns.map(function(c,i){return xlsxCell(columnName(i)+r,row[c.key],c.type,false)}).join('')+'</row>';
    }).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:'+lastCol+lastRow+'"/>'+
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
      '<sheetFormatPr defaultRowHeight="18"/><cols>'+widths+'</cols><sheetData>'+header+body+'</sheetData>'+
      '<autoFilter ref="A1:'+lastCol+lastRow+'"/></worksheet>';
  }

  const CRC_TABLE=(function(){
    const table=new Uint32Array(256);
    for(let i=0;i<256;i++){
      let c=i;
      for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;
      table[i]=c>>>0;
    }
    return table;
  })();
  function crc32(bytes){
    let crc=0xffffffff;
    for(let i=0;i<bytes.length;i++)crc=CRC_TABLE[(crc^bytes[i])&255]^(crc>>>8);
    return (crc^0xffffffff)>>>0;
  }
  function u16(value){return new Uint8Array([value&255,(value>>>8)&255])}
  function u32(value){return new Uint8Array([value&255,(value>>>8)&255,(value>>>16)&255,(value>>>24)&255])}
  function joinBytes(parts){
    const size=parts.reduce(function(total,x){return total+x.length},0);
    const out=new Uint8Array(size);
    let pos=0;
    parts.forEach(function(x){out.set(x,pos);pos+=x.length});
    return out;
  }
  function zipStore(files){
    const encoder=new TextEncoder();
    const locals=[],centrals=[];
    let offset=0;
    files.forEach(function(file){
      const name=encoder.encode(file.name);
      const data=typeof file.data==='string'?encoder.encode(file.data):file.data;
      const crc=crc32(data);
      const local=joinBytes([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
      const central=joinBytes([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
      locals.push(local);centrals.push(central);offset+=local.length;
    });
    const central=joinBytes(centrals);
    const end=joinBytes([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(central.length),u32(offset),u16(0)]);
    return joinBytes(locals.concat([central,end]));
  }

  function paymentTotals(r,type){
    const list=asArray(r&&r.installments).filter(function(p){return String(p&&p.type||'').toLowerCase()===type.toLowerCase()});
    return {
      count:list.length,
      pending:list.filter(function(p){return !p.paid}).reduce(function(s,p){return s+finite(p.value)},0),
      paid:list.filter(function(p){return !!p.paid}).reduce(function(s,p){return s+finite(p.value)},0)
    };
  }
  function recordCalc(r){
    try{if(typeof calc==='function')return calc(r)}catch(_){}
    const qc=finite(r&&r.quantCompra),qv=finite(r&&r.quantVenda),pc=finite(r&&r.precoCompra),pv=finite(r&&r.precoVenda),kg=finite(r&&r.pesoKg);
    const sold=Math.min(qc,qv),saldo=Math.max(0,qc-qv);
    return {qc:qc,qv:qv,pc:pc,pv:pv,kg:kg,at:kg/30,totalC:qc*pc,totalV:qv*pv,pcKg:kg?pc/kg:0,pvKg:kg?pv/kg:0,saldo:saldo,capital:saldo*pc,custo:0,lucro:sold*(pv-pc),status:saldo===0&&qc>0?'Vendido':qv>0?'Parcial':'Em estoque'};
  }
  function buildWorkbookData(){
    const rec=currentRecords(),cost=currentCosts();
    let totalBuy=0,totalSell=0,totalStock=0,totalCosts=0,totalProfit=0,totalHeads=0,totalSold=0;
    const negotiations=rec.map(function(r){
      const c=recordCalc(r),pay=paymentTotals(r,'Pagar'),receive=paymentTotals(r,'Receber');
      totalBuy+=finite(c.totalC);totalSell+=finite(c.totalV);totalStock+=finite(c.capital);totalCosts+=finite(c.custo);totalProfit+=finite(c.lucro);totalHeads+=finite(c.qc);totalSold+=Math.min(finite(c.qc),finite(c.qv));
      return {
        id:r.id||'',data:r.data||'',vendedor:r.vendedor||'',categoria:r.era||'',qtdCompra:c.qc,pesoKg:c.kg,arrobas:c.at,precoCompraCab:c.pc,precoCompraKg:c.pcKg,totalCompra:c.totalC,pgVendedor:r.pg||'',formaCompra:r.paymentBuy||'',contaVendedor:r.accountBuy||'',fazendaOrigem:r.originFarm||'',municipioOrigem:r.originCity||'',ufOrigem:r.originState||'',latitudeOrigem:r.originLat,longitudeOrigem:r.originLng,
        comprador:r.comprador||'',marca:r.marca||'',qtdVenda:c.qv,precoVendaCab:c.pv,precoVendaKg:c.pvKg,totalVenda:c.totalV,pgComprador:r.pgComprador||'',formaVenda:r.paymentSell||'',contaComprador:r.accountSell||'',fazendaDestino:r.destFarm||'',municipioDestino:r.destCity||'',ufDestino:r.destState||'',latitudeDestino:r.destLat,longitudeDestino:r.destLng,
        status:c.status,saldo:c.saldo,capitalEstoque:c.capital,custos:c.custo,lucro:c.lucro,gta:r.gta||'',nota:r.nota||'',gtaPdf:r.gtaPdf&&r.gtaPdf.name||'',notaPdf:r.notaPdf&&r.notaPdf.name||'',comprovantePdf:r.paymentPdf&&r.paymentPdf.name||'',parcelas:pay.count+receive.count,pendentePagar:pay.pending,pendenteReceber:receive.pending,observacoes:r.pagamento||r.observacoes||'',intermediario:r.parceiro||'',atualizadoEm:r.updatedAt||''
      };
    });
    const installments=[];
    rec.forEach(function(r){
      asArray(r.installments).forEach(function(p,index){
        installments.push({negociacaoId:r.id||'',negociacaoData:r.data||'',vendedor:r.vendedor||'',comprador:r.comprador||'',categoria:r.era||'',numero:index+1,tipo:p.type||'',vencimento:p.date||'',valor:finite(p.value),baixada:!!p.paid,dataBaixa:p.paidDate||'',status:p.paid?(String(p.type||'').toLowerCase()==='receber'?'Recebido':'Pago'):'Pendente'});
      });
    });
    const byRecord=new Map(rec.map(function(r){return [r.id,r]}));
    const costsRows=cost.map(function(c){
      const r=byRecord.get(c.recordId);
      return {id:c.id||'',data:c.date||'',mes:c.month||'',tipo:c.type||'',descricao:c.desc||'',negociacaoId:c.recordId||'',vendedor:r&&r.vendedor||'',valor:finite(c.value),atualizadoEm:c.updatedAt||''};
    });
    const summary=[
      {indicador:'Data da exportação',valor:new Date().toLocaleString('pt-BR'),unidade:''},
      {indicador:'Versão do programa',valor:'v'+APP_VERSION,unidade:''},
      {indicador:'Negociações',valor:rec.length,unidade:'registros'},
      {indicador:'Custos lançados',valor:cost.length,unidade:'lançamentos'},
      {indicador:'Parcelas',valor:installments.length,unidade:'parcelas'},
      {indicador:'PDFs anexados',valor:countPdfs(rec),unidade:'arquivos'},
      {indicador:'Cabeças compradas',valor:totalHeads,unidade:'cabeças'},
      {indicador:'Cabeças vendidas',valor:totalSold,unidade:'cabeças'},
      {indicador:'Total de compras',valor:totalBuy,unidade:'R$'},
      {indicador:'Total de vendas',valor:totalSell,unidade:'R$'},
      {indicador:'Capital em estoque',valor:totalStock,unidade:'R$'},
      {indicador:'Custos vinculados',valor:totalCosts,unidade:'R$'},
      {indicador:'Lucro realizado',valor:totalProfit,unidade:'R$'}
    ];
    return {summary:summary,negotiations:negotiations,installments:installments,costs:costsRows};
  }

  function createWorkbookBytes(){
    const data=buildWorkbookData();
    const sheets=[
      {name:'Resumo',columns:[{key:'indicador',label:'Indicador',width:25},{key:'valor',label:'Valor',width:20},{key:'unidade',label:'Unidade',width:14}],rows:data.summary},
      {name:'Negociações',columns:[
        {key:'id',label:'ID',width:18},{key:'data',label:'Data',type:'date',width:12},{key:'vendedor',label:'Vendedor',width:24},{key:'categoria',label:'Categoria',width:15},{key:'qtdCompra',label:'Qtd compra',type:'integer'},{key:'pesoKg',label:'Peso kg/cab',type:'decimal'},{key:'arrobas',label:'Arrobas/cab',type:'decimal'},{key:'precoCompraCab',label:'Preço compra/cab',type:'money'},{key:'precoCompraKg',label:'Preço compra/kg',type:'money'},{key:'totalCompra',label:'Total compra',type:'money'},{key:'pgVendedor',label:'PG vendedor'},{key:'formaCompra',label:'Forma pag. compra'},{key:'contaVendedor',label:'Conta/Pix vendedor',width:24},{key:'fazendaOrigem',label:'Fazenda origem',width:22},{key:'municipioOrigem',label:'Município origem',width:18},{key:'ufOrigem',label:'UF origem'},{key:'latitudeOrigem',label:'Latitude origem',type:'decimal'},{key:'longitudeOrigem',label:'Longitude origem',type:'decimal'},
        {key:'comprador',label:'Comprador',width:24},{key:'marca',label:'Marca',width:15},{key:'qtdVenda',label:'Qtd venda',type:'integer'},{key:'precoVendaCab',label:'Preço venda/cab',type:'money'},{key:'precoVendaKg',label:'Preço venda/kg',type:'money'},{key:'totalVenda',label:'Total venda',type:'money'},{key:'pgComprador',label:'PG comprador'},{key:'formaVenda',label:'Forma pag. venda'},{key:'contaComprador',label:'Conta/Pix comprador',width:24},{key:'fazendaDestino',label:'Fazenda destino',width:22},{key:'municipioDestino',label:'Município destino',width:18},{key:'ufDestino',label:'UF destino'},{key:'latitudeDestino',label:'Latitude destino',type:'decimal'},{key:'longitudeDestino',label:'Longitude destino',type:'decimal'},
        {key:'status',label:'Status'},{key:'saldo',label:'Saldo cabeças',type:'integer'},{key:'capitalEstoque',label:'Capital estoque',type:'money'},{key:'custos',label:'Custos',type:'money'},{key:'lucro',label:'Lucro realizado',type:'money'},{key:'gta',label:'GTA'},{key:'nota',label:'Nota'},{key:'gtaPdf',label:'PDF GTA',width:22},{key:'notaPdf',label:'PDF Nota',width:22},{key:'comprovantePdf',label:'PDF Comprovante',width:22},{key:'parcelas',label:'Parcelas',type:'integer'},{key:'pendentePagar',label:'Pendente pagar',type:'money'},{key:'pendenteReceber',label:'Pendente receber',type:'money'},{key:'observacoes',label:'Pagamento/Observações',width:30},{key:'intermediario',label:'Intermediário',width:22},{key:'atualizadoEm',label:'Atualizado em',width:23}
      ],rows:data.negotiations},
      {name:'Parcelas',columns:[{key:'negociacaoId',label:'ID negociação',width:18},{key:'negociacaoData',label:'Data negociação',type:'date'},{key:'vendedor',label:'Vendedor',width:24},{key:'comprador',label:'Comprador',width:24},{key:'categoria',label:'Categoria'},{key:'numero',label:'Nº',type:'integer'},{key:'tipo',label:'Tipo'},{key:'vencimento',label:'Vencimento',type:'date'},{key:'valor',label:'Valor',type:'money'},{key:'baixada',label:'Baixada',type:'boolean'},{key:'dataBaixa',label:'Data da baixa',type:'date'},{key:'status',label:'Status'}],rows:data.installments},
      {name:'Custos',columns:[{key:'id',label:'ID',width:18},{key:'data',label:'Data',type:'date'},{key:'mes',label:'Mês'},{key:'tipo',label:'Tipo',width:18},{key:'descricao',label:'Descrição',width:30},{key:'negociacaoId',label:'ID negociação',width:18},{key:'vendedor',label:'Vendedor',width:24},{key:'valor',label:'Valor',type:'money'},{key:'atualizadoEm',label:'Atualizado em',width:23}],rows:data.costs}
    ];
    const workbookSheets=sheets.map(function(s,i){return '<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>'}).join('');
    const workbookRels=sheets.map(function(_,i){return '<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>'}).join('')+'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    const overrides=sheets.map(function(_,i){return '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'}).join('');
    const files=[
      {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'+overrides+'</Types>'},
      {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'},
      {name:'docProps/core.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Exportação Compra e Venda de Gado v112</dc:title><dc:creator>Compra e Venda de Gado</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'+nowIso()+'</dcterms:created></cp:coreProperties>'},
      {name:'docProps/app.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Compra e Venda de Gado v112</Application></Properties>'},
      {name:'xl/workbook.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+workbookSheets+'</sheets></workbook>'},
      {name:'xl/_rels/workbook.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+workbookRels+'</Relationships>'},
      {name:'xl/styles.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="[$R$-pt-BR] #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/><numFmt numFmtId="166" formatCode="0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17633F"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'}
    ];
    sheets.forEach(function(s,i){files.push({name:'xl/worksheets/sheet'+(i+1)+'.xml',data:sheetXml(s.columns,s.rows)})});
    return zipStore(files);
  }

  function exportExcel(){
    const button=byId('csvBtn');
    const oldText=button?button.textContent:'';
    if(button){button.disabled=true;button.textContent='Gerando Excel…'}
    try{
      const bytes=createWorkbookBytes();
      downloadBlob('gado_exportacao_completa_'+dateTag()+'.xlsx',new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    }catch(error){
      console.error('EXCEL V112',error);
      alert('Não foi possível gerar o Excel: '+(error&&error.message?error.message:error));
    }finally{
      if(button){button.disabled=false;button.textContent=oldText||'Exportar Excel'}
    }
  }

  async function readBackupFile(file){
    if(!file)throw new Error('Nenhum arquivo foi selecionado.');
    if(file.size>MAX_BACKUP_BYTES)throw new Error('O backup é maior que 180 MB.');
    const text=await file.text();
    let raw;
    try{raw=JSON.parse(text)}catch(_){throw new Error('O arquivo não é um backup JSON válido.');}
    let format='legado',createdAt='',owner={id:'',email:''},expectedChecksum='',rec,cost;
    if(Array.isArray(raw)){
      rec=raw;cost=[];
    }else if(raw&&raw.format===BACKUP_FORMAT&&raw.data){
      format=BACKUP_FORMAT;
      createdAt=String(raw.createdAt||'');
      owner=raw.owner&&typeof raw.owner==='object'?{id:String(raw.owner.id||''),email:String(raw.owner.email||'')}:{id:'',email:''};
      expectedChecksum=String(raw.checksum&&raw.checksum.value||'');
      rec=raw.data.records;cost=raw.data.costs;
    }else if(raw&&typeof raw==='object'){
      createdAt=String(raw.createdAt||'');
      rec=raw.records;cost=raw.costs;
    }
    if(!Array.isArray(rec)||!Array.isArray(cost))throw new Error('O arquivo não contém as listas de negociações e custos.');
    const cleanRecords=dedupe(rec,'n',createdAt||nowIso());
    const cleanCosts=dedupe(cost,'c',createdAt||nowIso());
    if(rec.length>100000||cost.length>200000)throw new Error('O backup contém registros demais para restauração pelo telefone.');
    let checksumState='Não disponível (backup antigo)';
    if(expectedChecksum){
      const actual=await sha256(dataForChecksum(rec,cost));
      if(actual!==expectedChecksum)throw new Error('A verificação de integridade falhou. O arquivo pode estar incompleto ou alterado.');
      checksumState='Integridade confirmada';
    }
    return {
      fileName:file.name,format:format,createdAt:createdAt,owner:owner,checksumState:checksumState,
      records:cleanRecords.items,costs:cleanCosts.items,
      duplicates:cleanRecords.duplicates+cleanCosts.duplicates,
      generatedIds:cleanRecords.generated+cleanCosts.generated,
      pdfs:countPdfs(cleanRecords.items),installments:countInstallments(cleanRecords.items)
    };
  }

  function ensureRestoreModal(){
    let modal=byId('restoreV112Modal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='restoreV112Modal';
    modal.className='modal';
    modal.innerHTML='<div class="modalcard" style="max-width:760px"><div class="mh"><div><b>Restaurar backup com segurança</b><div class="hint">Confira o conteúdo antes de alterar os dados</div></div><button type="button" class="mini" id="restoreV112Close">Fechar</button></div><div class="mb"><div id="restoreV112Summary"></div><div style="margin-top:16px;padding:12px;border:1px solid #d7e9dc;background:#f3faf5;border-radius:12px"><b>Escolha como restaurar:</b><div class="hint" style="margin-top:6px"><b>Mesclar</b> acrescenta o que falta, evita duplicações e preserva edições atuais mais novas.<br><b>Substituir tudo</b> deixa o sistema exatamente como o backup e remove dados atuais que não estão nele.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:16px"><button type="button" class="btn secondary" id="restoreV112Cancel">Cancelar</button><button type="button" class="btn primary" id="restoreV112Merge">Mesclar com os atuais</button><button type="button" class="btn danger" id="restoreV112Replace">Substituir tudo</button></div></div></div>';
    document.body.appendChild(modal);
    byId('restoreV112Close').onclick=closeRestore;
    byId('restoreV112Cancel').onclick=closeRestore;
    byId('restoreV112Merge').onclick=function(){applyRestore('merge')};
    byId('restoreV112Replace').onclick=function(){applyRestore('replace')};
    return modal;
  }
  function closeRestore(){
    const modal=byId('restoreV112Modal');
    if(modal)modal.classList.remove('show');
    restorePreview=null;
  }
  function showRestorePreview(preview){
    restorePreview=preview;
    const modal=ensureRestoreModal();
    const user=currentUser();
    const differentUser=preview.owner.id&&user.id&&preview.owner.id!==user.id;
    const when=preview.createdAt?new Date(preview.createdAt).toLocaleString('pt-BR'):'Data não informada';
    byId('restoreV112Summary').innerHTML=
      '<div class="kpis" style="grid-template-columns:repeat(4,minmax(120px,1fr))"><div class="kpi"><span>Negociações</span><b>'+preview.records.length+'</b></div><div class="kpi"><span>Custos</span><b>'+preview.costs.length+'</b></div><div class="kpi"><span>Parcelas</span><b>'+preview.installments+'</b></div><div class="kpi"><span>PDFs</span><b>'+preview.pdfs+'</b></div></div>'+
      '<div class="calc"><b>Arquivo:</b> '+html(preview.fileName)+'<br><b>Criado em:</b> '+html(when)+'<br><b>Verificação:</b> '+html(preview.checksumState)+(preview.duplicates?'<br><b>Duplicações internas removidas:</b> '+preview.duplicates:'')+(preview.generatedIds?'<br><b>IDs antigos recuperados:</b> '+preview.generatedIds:'')+'</div>'+
      (differentUser?'<div style="margin-top:12px;padding:12px;border-radius:10px;background:#fff1d6;color:#7a5100"><b>Atenção:</b> este backup foi criado em outra conta. Confira antes de continuar.</div>':'');
    modal.classList.add('show');
  }

  function mergeLists(current,incoming){
    const map=new Map();
    asArray(current).forEach(function(item){if(item&&item.id)map.set(String(item.id),clone(item))});
    asArray(incoming).forEach(function(item){
      if(!item||!item.id)return;
      const id=String(item.id),old=map.get(id);
      if(!old||stamp(item)>stamp(old))map.set(id,clone(item));
    });
    return Array.from(map.values());
  }

  async function applyRestore(mode){
    if(!restorePreview)return;
    const merge=mode==='merge';
    if(!merge){
      const ok=confirm('ATENÇÃO: substituir tudo removerá do sistema as negociações e os custos atuais que não estiverem neste backup. Deseja continuar?');
      if(!ok)return;
    }
    const mergeBtn=byId('restoreV112Merge'),replaceBtn=byId('restoreV112Replace');
    if(mergeBtn)mergeBtn.disabled=true;if(replaceBtn)replaceBtn.disabled=true;
    try{
      const oldRecords=clone(currentRecords()),oldCosts=clone(currentCosts());
      if(typeof safetySnapshot==='function')safetySnapshot('antes-de-restaurar-backup-v112');
      if(merge){
        records=mergeLists(oldRecords,restorePreview.records);
        costs=mergeLists(oldCosts,restorePreview.costs);
      }else{
        const incomingRecordIds=new Set(restorePreview.records.map(function(x){return String(x.id)}));
        const incomingCostIds=new Set(restorePreview.costs.map(function(x){return String(x.id)}));
        if(typeof addDeletedId==='function'){
          oldRecords.forEach(function(x){if(x&&x.id&&!incomingRecordIds.has(String(x.id)))addDeletedId(DELETED_RECORDS_KEY,x.id)});
          oldCosts.forEach(function(x){if(x&&x.id&&!incomingCostIds.has(String(x.id)))addDeletedId(DELETED_COSTS_KEY,x.id)});
        }
        const restoredAt=nowIso();
        records=restorePreview.records.map(function(x){const y=clone(x);y.restoredAt=restoredAt;y.updatedAt=restoredAt;return y});
        costs=restorePreview.costs.map(function(x){const y=clone(x);y.restoredAt=restoredAt;y.updatedAt=restoredAt;return y});
      }
      if(typeof persist!=='function')throw new Error('A rotina de salvamento não está disponível.');
      persist();
      if(typeof renderAll==='function')renderAll();
      const recCount=records.length,costCount=costs.length;
      closeRestore();
      alert((merge?'Backup mesclado':'Backup substituído')+' com sucesso: '+recCount+' negociações e '+costCount+' custos. A nuvem será sincronizada.');
      setTimeout(function(){try{if(window.syncPendingNow)window.syncPendingNow(true)}catch(_){}},500);
    }catch(error){
      console.error('RESTORE V112',error);
      alert('Não foi possível restaurar: '+(error&&error.message?error.message:error));
    }finally{
      if(mergeBtn)mergeBtn.disabled=false;if(replaceBtn)replaceBtn.disabled=false;
    }
  }

  async function onRestoreFile(event){
    event.stopImmediatePropagation();
    const input=event.currentTarget||event.target;
    const file=input&&input.files&&input.files[0];
    if(!file)return;
    try{
      const preview=await readBackupFile(file);
      showRestorePreview(preview);
    }catch(error){
      console.error('READ BACKUP V112',error);
      alert('Backup inválido: '+(error&&error.message?error.message:error));
    }finally{
      if(input)input.value='';
    }
  }

  function bind(){
    const excelBtn=byId('csvBtn'),backupBtn=byId('backupBtn'),restore=byId('restore');
    if(excelBtn){excelBtn.textContent='Exportar Excel';excelBtn.onclick=exportExcel}
    if(backupBtn){backupBtn.textContent='Backup completo';backupBtn.onclick=createFullBackup}
    if(restore&&!restore.dataset.backupV112){
      restore.dataset.backupV112='1';
      restore.accept='.json,application/json';
      restore.addEventListener('change',onRestoreFile,true);
      const label=restore.closest('label');
      if(label&&label.childNodes.length)label.childNodes[0].textContent='Restaurar backup';
    }
    try{exportCSV=exportExcel}catch(_){}
    try{backup=createFullBackup}catch(_){}
    window.exportExcelV112=exportExcel;
    window.createFullBackupV112=createFullBackup;
    window.__BACKUP_V112_READY=true;
    window.__BACKUP_V112_TEST={zipStore:zipStore,createWorkbookBytes:createWorkbookBytes,mergeLists:mergeLists,readBackupFile:readBackupFile,sha256:sha256};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
  setTimeout(bind,700);
})();


/* CONSOLIDATED: v120-cadastros-lotes.js */
/* v120 â cadastros independentes de compradores e vendedores */
(function(){
  'use strict';
  var KEY='gado_cadastros_v120';
  function read(){try{return JSON.parse((window.userGet?userGet(KEY):localStorage.getItem(KEY))||'[]')}catch(e){return[]}}
  function write(v){try{if(window.userSet)userSet(KEY,JSON.stringify(v));else localStorage.setItem(KEY,JSON.stringify(v));if(window.scheduleCloudSave)window.scheduleCloudSave();}catch(e){}}
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])})}
  function render(){
    var sec=document.getElementById('cadastrosV120');if(!sec)return;
    var list=read(), q=(document.getElementById('cadBuscaV120').value||'').toLowerCase();
    var title=sec.querySelector('.ph h2');if(title)title.textContent='Clientes ('+list.length+')';
    var rows=list.filter(function(x){return !q||[x.nome,x.documento,x.telefone].join(' ').toLowerCase().includes(q)});
    rows.sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});
    document.getElementById('cadTabelaV120').innerHTML=rows.length?rows.map(function(x){return '<tr><td>'+esc(x.nome)+(x.lat!=null&&x.lng!=null?' <span title="Localização cadastrada" style="color:#18794e">📍</span>':'')+'</td><td>'+esc(x.documento||'—')+'</td><td>'+esc(x.telefone||'—')+'</td><td>'+esc(x.pix||'—')+'</td><td><button type="button" class="mini" data-cad-map="'+x.id+'">📍 Mapa</button> <button class="mini" data-cad-edit="'+x.id+'">Editar</button> <button class="mini" data-cad-del="'+x.id+'">Excluir</button></td></tr>'}).join(''):'<tr><td colspan="5" class="hint">Nenhum cliente cadastrado.</td></tr>';
  }
  function openForm(item){
    var nome=prompt('Nome do comprador ou vendedor:',item?item.nome:'');if(!nome||!nome.trim())return;
    var doc=prompt('CPF/CNPJ (opcional):',item?item.documento:'')||'';
    var tel=prompt('Telefone (opcional):',item?item.telefone:'')||'';
    var pix=prompt('Pix/conta (opcional):',item?item.pix:'')||'';
    var list=read(), obj={id:item?item.id:'cad-'+Date.now(),nome:nome.trim(),tipo:'Cliente',documento:doc,telefone:tel,pix:pix,lat:item&&item.lat!=null?item.lat:null,lng:item&&item.lng!=null?item.lng:null,aliases:item&&Array.isArray(item.aliases)?item.aliases.slice():[],updatedAt:new Date().toISOString()};
    var i=list.findIndex(function(x){return x.id===obj.id}),oldName=i>=0?list[i].nome:'';if(oldName&&oldName!==obj.nome&&obj.aliases.indexOf(oldName)<0)obj.aliases.push(oldName);if(i>=0)list[i]=obj;else list.push(obj);write(list);render();document.dispatchEvent(new CustomEvent('clientesAtualizados',{detail:{oldName:oldName,newName:obj.nome,id:obj.id}}));
  }
  function init(){
    if(document.getElementById('cadastrosV120'))return;
    var tabs=document.querySelector('.tabs');var shell=document.querySelector('.wrap');if(!tabs||!shell)return;
    var b=document.createElement('button');b.className='tabbtn';b.dataset.tab='cadastrosV120';b.textContent='Clientes';tabs.appendChild(b);
    var sec=document.createElement('section');sec.id='cadastrosV120';sec.className='tab';sec.innerHTML='<div class="toolbar"><button class="btn primary" id="cadNovoV120">+ Novo cliente</button><input class="search" id="cadBuscaV120" placeholder="Pesquisar cliente"></div><div class="panel"><div class="ph"><h2>Clientes</h2><span class="hint">O mesmo cliente pode comprar e vender</span></div><div class="tablewrap"><table class="smalltbl"><thead><tr><th>Nome</th><th>CPF/CNPJ</th><th>Telefone</th><th>Pix/conta</th><th>Ações</th></tr></thead><tbody id="cadTabelaV120"></tbody></table></div></div>';
    shell.appendChild(sec);
    b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});b.classList.add('active');sec.classList.add('active');render()};
    document.getElementById('cadNovoV120').onclick=function(){openForm(null)};
    document.getElementById('cadBuscaV120').oninput=render;
    sec.addEventListener('click',function(e){var btn=e.target.closest?e.target.closest('[data-cad-edit],[data-cad-del],[data-cad-map]'):e.target;var id=btn.dataset.cadEdit||btn.dataset.cadDel||btn.dataset.cadMap;if(!id)return;var list=read(),item=list.find(function(x){return x.id===id});if(btn.dataset.cadMap){if(e.preventDefault)e.preventDefault();if(e.stopPropagation)e.stopPropagation();if(window.openClientMapPicker)window.openClientMapPicker(item);return}if(e.target.dataset.cadEdit)openForm(item);else if(confirm('Excluir este cadastro?')){write(list.filter(function(x){return x.id!==id}));render()}});
    window.refreshCadastrosV120=render;
    document.addEventListener('clientesAtualizados',render);
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();


/* CONSOLIDATED: v121-animais-lotes.js */
/* v121 — numeração de animais por lote, sem alterar negociações antigas */
(function(){
  var KEY='gado_animais_v121';
  function all(){try{return JSON.parse((window.userGet?userGet(KEY):localStorage.getItem(KEY))||'{}')}catch(e){return{}}}
  function save(x){try{if(window.userSet)userSet(KEY,JSON.stringify(x));else localStorage.setItem(KEY,JSON.stringify(x));if(window.scheduleCloudSave)window.scheduleCloudSave();}catch(e){}}
  function people(){try{return JSON.parse((window.userGet?userGet('gado_cadastros_v120'):localStorage.getItem('gado_cadastros_v120'))||'[]')}catch(e){return[]}}
  function populatePeople(){
    var list=people(), s=document.getElementById('rSellerIdV121'), b=document.getElementById('rBuyerIdV121');if(!s||!b)return;
    function opts(tipo){return '<option value="">Selecionar</option>'+list.filter(function(x){return x.tipo===tipo}).map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.nome)+'</option>'}).join('')}
    s.innerHTML=opts('Vendedor');b.innerHTML=opts('Comprador');
  }
  function migrateLots(){
    if(typeof records==='undefined')return;
    var lots={};try{lots=JSON.parse((window.userGet?userGet('gado_lotes_v121'):localStorage.getItem('gado_lotes_v121'))||'{}')}catch(e){}
    records.forEach(function(r){if(!r||!r.id||lots[r.id])return;var q=Number(r.quantCompra||0),v=Number(r.quantVenda||0);lots[r.id]={id:r.id,recordId:r.id,vendedor:r.vendedor||'',data:r.data||'',categoria:r.era||'',original:q,vendida:Math.min(q,v),disponivel:Math.max(0,q-v),createdAt:new Date().toISOString()};});
    try{if(window.userSet)userSet('gado_lotes_v121',JSON.stringify(lots));else localStorage.setItem('gado_lotes_v121',JSON.stringify(lots))}catch(e){}
  }
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])})}
  function render(){
    var body=document.getElementById('animaisTabelaV121');if(!body||typeof records==='undefined')return;
    var a=all(), sold={};
    if(typeof records!=='undefined')records.forEach(function(x){(x.animalNumbersSold||[]).forEach(function(n){sold[String(n)]=1})});
    function allocated(id){return records.reduce(function(total,x){var lots=x.animalLotsSold||x.sourceLots||[];return total+(Array.isArray(lots)?lots.reduce(function(n,z){return n+((z.lotId||z.id)===id?Number(z.quantity||z.quantidade||0):0)},0):0)},0)}
    body.innerHTML=records.filter(function(r){return Number(r.quantCompra||0)-Number(r.quantVenda||0)-allocated(r.id)>0}).map(function(r){
      var nums=Array.isArray(a[r.id])?a[r.id]:[], available=nums.filter(function(n){return !sold[String(n)]}), total=Math.max(0,Number(r.quantCompra||0)), soldCount=records.filter(function(x){return x.animalLotId===r.id}).reduce(function(n,x){return n+(x.animalNumbersSold||[]).length},0)+allocated(r.id), remaining=Math.max(0,total-soldCount);
      return '<tr><td>'+esc(r.data)+'</td><td><b>'+esc(r.loteCodigo||'—')+'</b></td><td>'+esc(r.vendedor)+'</td><td>'+esc(r.era)+'</td><td>'+remaining+'</td><td>'+esc(available.join(', ')||'Ainda não numerados')+'</td><td><button class="mini" data-num-lote="'+esc(r.id)+'">Numerar</button></td></tr>';
    }).join('')||'<tr><td colspan="6" class="hint">Nenhuma compra encontrada.</td></tr>';
  }
  function init(){
    if(document.getElementById('animaisV121'))return;
    migrateLots();
    var tabs=document.querySelector('.tabs'),shell=document.querySelector('.wrap');if(!tabs||!shell)return;
    var b=document.createElement('button');b.className='tabbtn';b.textContent='Animais';tabs.appendChild(b);
    var sec=document.createElement('section');sec.id='animaisV121';sec.className='tab';sec.innerHTML='<div class="panel"><div class="ph"><h2>Animais por lote</h2><span class="hint">Numere os animais atuais ou novos</span></div><div class="tablewrap"><table class="smalltbl"><thead><tr><th>Data</th><th>ID lote</th><th>Vendedor</th><th>Categoria</th><th>Disponíveis</th><th>Números cadastrados</th><th>Ação</th></tr></thead><tbody id="animaisTabelaV121"></tbody></table></div></div>';shell.appendChild(sec);
    b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});b.classList.add('active');sec.classList.add('active');render()};
    sec.addEventListener('click',function(e){var id=e.target.dataset.numLote;if(!id)return;var a=all(),old=Array.isArray(a[id])?a[id]:[],v=prompt('Digite os números separados por vírgula:',old.join(', '));if(v===null)return;var nums=v.split(',').map(function(x){return x.trim()}).filter(Boolean);a[id]=Array.from(new Set(nums));save(a);render()});
    var q=document.getElementById('rqv');if(q&&!document.getElementById('animalNumbersSoldV121')){var w=document.createElement('div');w.className='field span2';w.innerHTML='<label>Lote de origem da venda</label><select id="animalLotV121"><option value="">Selecionar lote (opcional)</option></select><label style="margin-top:6px">Números dos animais vendidos</label><input id="animalNumbersSoldV121" placeholder="Ex.: 12, 18, 27"><div class="hint">Selecione o lote e informe os números comercializados.</div>';q.closest('.field').parentNode.insertBefore(w,q.closest('.field').nextSibling)}
    var rv=document.getElementById('rvendedor'),rc=document.getElementById('rcomprador');if(rv&&!document.getElementById('rSellerIdV121')){var a=document.createElement('div');a.className='field span2';a.innerHTML='<label>Vendedor cadastrado</label><select id="rSellerIdV121"></select>';rv.closest('.field').parentNode.insertBefore(a,rv.closest('.field'))}if(rc&&!document.getElementById('rBuyerIdV121')){var z=document.createElement('div');z.className='field span2';z.innerHTML='<label>Comprador cadastrado</label><select id="rBuyerIdV121"></select>';rc.closest('.field').parentNode.insertBefore(z,rc.closest('.field'))}populatePeople();
    var sel=document.getElementById('animalLotV121');if(sel&&typeof records!=='undefined'){sel.innerHTML='<option value="">Selecionar lote (opcional)</option>'+records.filter(function(r){return Number(r.quantCompra||0)>Number(r.quantVenda||0)}).map(function(r){return '<option value="'+esc(r.id)+'">'+esc(r.data)+' — '+esc(r.vendedor)+' — '+esc(r.era)+'</option>'}).join('')}
    var form=document.getElementById('recordForm');if(form)form.addEventListener('submit',function(){setTimeout(function(){var id=(document.getElementById('rid')||{}).value;if(!id||typeof records==='undefined')return;var r=records.find(function(x){return x.id===id});if(!r)return;var el=document.getElementById('animalNumbersSoldV121'),ls=document.getElementById('animalLotV121'),ss=document.getElementById('rSellerIdV121'),bb=document.getElementById('rBuyerIdV121');var nums=(el&&el.value?el.value.split(',').map(function(x){return x.trim()}).filter(Boolean):[]),lot=ls&&ls.value?ls.value:'';if(lot&&nums.length){var known=Array.isArray(all()[lot])?all()[lot].map(String):[],sold={};records.forEach(function(x){(x.animalNumbersSold||[]).forEach(function(n){if(x.id!==id)sold[String(n)]=1})});var invalid=nums.filter(function(n){return known.indexOf(String(n))<0||sold[String(n)]});if(invalid.length){alert('Números indisponíveis ou não pertencentes ao lote: '+invalid.join(', '));return}}r.animalLotId=lot;r.sellerIdV121=ss?ss.value:'';r.buyerIdV121=bb?bb.value:'';r.animalNumbersSold=nums;if(typeof persist==='function')persist()},50)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  setTimeout(function(){try{migrateLots();render();populatePeople()}catch(e){}},900);
  setTimeout(function(){try{migrateLots();render();populatePeople()}catch(e){}},2500);
  setTimeout(function(){try{migrateLots();render();populatePeople()}catch(e){}},5000);
})();


/* CONSOLIDATED: v122-clientes-negociacao.js */
/* v122 â clientes Ãºnicos e compra/venda sem resumo */
(function(){
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])})}
  function clients(){try{return JSON.parse((window.userGet?userGet('gado_cadastros_v120'):localStorage.getItem('gado_cadastros_v120'))||'[]')}catch(e){return[]}}
  function reconcile(){
    if(typeof records==='undefined'||!Array.isArray(records))return false;
    var list=clients(),changed=false;
    list.forEach(function(c){var names=[c.nome].concat(Array.isArray(c.aliases)?c.aliases:[]).map(function(x){return String(x||'').trim()}).filter(Boolean);records.forEach(function(r){['vendedor','comprador','clienteCompra','clienteVenda','cliente'].forEach(function(k){if(names.indexOf(String(r[k]||'').trim())>=0&&String(r[k]||'').trim()!==c.nome){r[k]=c.nome;changed=true;}});});});
    if(changed){try{if(typeof persist==='function')persist();if(typeof renderAll==='function')renderAll()}catch(e){}}
    return changed;
  }
  function setup(){
    document.querySelectorAll('.neg-v66-tab[data-negv66="resumo"], [data-negv66-go="resumo"]').forEach(function(x){x.style.display='none'});
    var summary=document.getElementById('negV66Resumo');if(summary){summary.style.display='block';var st=summary.querySelector('.neg-v66-title');if(st)st.textContent='Documentos e fechamento';var cards=summary.querySelector('.neg-v66-summary-grid');if(cards)cards.style.display='none'}
    var oldBuy=document.getElementById('rvendedor'),oldSell=document.getElementById('rcomprador');
    function replace(old,id,label){if(!old||document.getElementById(id))return;var s=document.createElement('select');s.id=id;s.required=old.required;s.className=old.className;s.setAttribute('data-client-select','1');var h=document.createElement('input');h.type='hidden';h.id=old.id;old.parentNode.replaceChild(s,old);s.parentNode.appendChild(h);var wrap=s.parentNode;var l=wrap.querySelector('label');if(l)l.textContent=label;}
    replace(oldBuy,'rclienteCompra','Cliente');replace(oldSell,'rclienteVenda','Cliente');
    var list=clients().sort(function(a,b){return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base'});});['rclienteCompra','rclienteVenda'].forEach(function(id){var s=document.getElementById(id);if(!s)return;var cur=s.value;s.innerHTML='<option value="">Selecione um cliente cadastrado</option>'+list.map(function(x){return '<option value="'+esc(x.nome)+'">'+esc(x.nome)+'</option>'}).join('');if(cur)s.value=cur;var hid=id==='rclienteCompra'?'rvendedor':'rcomprador';s.onchange=function(){var h=document.getElementById(hid);if(h)h.value=s.value||'';var cli=list.find(function(x){return x.nome===s.value});var lat=cli&&cli.lat!=null?cli.lat:'';var lng=cli&&cli.lng!=null?cli.lng:'';if(hid==='rvendedor'){var a=document.getElementById('roriginLat'),b=document.getElementById('roriginLng');if(a)a.value=lat;if(b)b.value=lng}else{var a2=document.getElementById('rdestLat'),b2=document.getElementById('rdestLng');if(a2)a2.value=lat;if(b2)b2.value=lng}};s.oninput=s.onchange});
    var go=document.querySelector('[data-negv66-go="resumo"]');if(go)go.textContent='Continuar para documentos â';
    var form=document.getElementById('recordForm');if(form&&!form.dataset.v122){form.dataset.v122='1';form.addEventListener('submit',function(e){var a=document.getElementById('rclienteCompra'),b=document.getElementById('rclienteVenda');if(a&&document.getElementById('rqcomp')&&Number(document.getElementById('rqcomp').value)>0&&!a.value){e.preventDefault();alert('Selecione um cliente cadastrado para a compra.');return}if(b&&document.getElementById('rqv')&&Number(document.getElementById('rqv').value)>0&&!b.value){e.preventDefault();alert('Selecione um cliente cadastrado para a venda.');return}if(a&&document.getElementById('rvendedor'))document.getElementById('rvendedor').value=a.value;if(b&&document.getElementById('rcomprador'))document.getElementById('rcomprador').value=b.value})}
  }
  function hydrateEditClient(){
    try{
      var rid=document.getElementById('rid'),id=rid&&rid.value;
      if(!id||typeof records==='undefined'||!Array.isArray(records))return;
      var r=records.find(function(x){return String(x.id)===String(id)});if(!r)return;
      [['rclienteCompra','rvendedor','vendedor'],['rclienteVenda','rcomprador','comprador']].forEach(function(a){
        var sel=document.getElementById(a[0]),hidden=document.getElementById(a[1]),name=String(r[a[2]]||'').trim();
        if(hidden&&name)hidden.value=name;
        if(sel&&name){
          var opt=Array.from(sel.options).find(function(o){return String(o.value||'').trim()===name||String(o.textContent||'').trim()===name;});
          if(opt){sel.value=opt.value;sel.dispatchEvent(new Event('change',{bubbles:true}));}
        }
      });
    }catch(e){}
  }
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest("button[onclick*='editRecord']")){[50,250,700,1200].forEach(function(ms){setTimeout(function(){setup();hydrateEditClient()},ms);})}},true);
  function init(){
    reconcile();setup();hydrateEditClient();
    [150,500,1000,1800].forEach(function(ms){setTimeout(function(){reconcile();setup();hydrateEditClient()},ms)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  document.addEventListener('clientesAtualizados',function(e){
    var d=e.detail||{},oldName=String(d.oldName||'').trim(),newName=String(d.newName||'').trim(),clientId=String(d.id||'').trim();
    if(oldName&&newName&&oldName!==newName&&typeof records!=='undefined'&&Array.isArray(records)){
      var changed=false;
      records.forEach(function(r){
        // Registros antigos guardam o nome em vendedor/comprador; versÃµes
        // intermediÃ¡rias podem ter usado campos de cliente separados.
        ['vendedor','comprador','clienteCompra','clienteVenda','cliente'].forEach(function(k){if(String(r[k]||'').trim()===oldName){r[k]=newName;changed=true;}});
        ['vendedorId','compradorId','clienteCompraId','clienteVendaId','clienteId'].forEach(function(k){if(clientId&&String(r[k]||'')===clientId){if(k.toLowerCase().indexOf('vendedor')>=0||k==='clienteCompraId')r.vendedor=newName;if(k.toLowerCase().indexOf('comprador')>=0||k==='clienteVendaId')r.comprador=newName;if(k==='clienteId'){if(r.quantCompra>0)r.vendedor=newName;if(r.quantVenda>0)r.comprador=newName;}changed=true;}});
      });
      try{if(changed&&typeof persist==='function')persist();if(changed&&typeof renderAll==='function')renderAll()}catch(err){}
    }
    reconcile();setup();
  });
  document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('#newRecordBtn,.new-record,.btn-new-record'))setTimeout(setup,100)});
})();



/* CONSOLIDATED: v127-formularios-separados.js */
/* v127 — filtrar vendas realizadas e abrir formulário separado */
(function(){
  var oldRender=window.renderTable;
  if(typeof oldRender==='function')window.renderTable=function(){oldRender();var view=window.__negListView||'seller';if(view==='buyer'){document.querySelectorAll('#tbody tr').forEach(function(tr){var cell=tr.querySelector('td:nth-child(5)');if(cell&&Number(String(cell.textContent).replace(/\./g,'').replace(',','.'))<=0)tr.remove()})}};
  function mode(m){window.__modeV127=m;setTimeout(function(){var c=document.getElementById('negV66Compra'),v=document.getElementById('negV66Venda'),s=document.getElementById('negV66Resumo'),tabs=document.querySelector('.neg-v66-tabs');if(c)c.style.display=m==='compra'?'block':'none';if(v)v.style.display=m==='venda'?'block':'none';if(s)s.style.display='block';if(tabs)tabs.style.display='none';var t=s&&s.querySelector('.neg-v66-title');if(t)t.textContent=m==='compra'?'Documentos e fechamento da compra':'Documentos e fechamento da venda'},80)}
  function bind(){var b=document.getElementById('newBtn');if(b&&!b.dataset.v127){b.dataset.v127='1';b.addEventListener('click',function(){mode((b.textContent||'').toLowerCase().indexOf('venda')>=0?'venda':'compra')})}}
  bind();setTimeout(bind,700);setTimeout(bind,1500);
})();


/* CONSOLIDATED: v128-navegacao-estavel.js */
/* v128 — navegação estável por telas */
(function(){
function apply(){
 var tabs=document.querySelector('.tabs'),neg=tabs&&tabs.querySelector('[data-tab="negociacoes"]'),panel=tabs&&tabs.querySelector('[data-tab="painel"]');if(!tabs||!neg||!panel)return false;
 neg.style.display='none';
 function btn(id,label,view){var b=document.getElementById(id);if(!b){b=document.createElement('button');b.id=id;b.type='button';b.className='tabbtn'}b.textContent=label;b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});b.classList.add('active');var s=document.getElementById('negociacoes');if(s)s.classList.add('active');var i=document.querySelector('.neg-list-tab[data-listview="'+view+'"]');if(i)i.click();var n=document.getElementById('newBtn');if(n)n.textContent=view==='seller'?'+ Nova compra':'+ Nova venda';return false};return b}
 var cad=tabs.querySelector('[data-tab="cadastrosV120"]'),ani=tabs.querySelector('[data-tab="animaisV121"]'),estoque=tabs.querySelector('[data-tab="estoque"]'),custos=tabs.querySelector('[data-tab="custos"]'),mapa=tabs.querySelector('[data-tab="mapa"]'),rel=tabs.querySelector('[data-tab="relatorios"]');
 var compra=btn('compraTelaV128','Compra','seller'),venda=btn('vendaTelaV128','Venda','buyer');
 if(cad)cad.textContent='Cadastro';if(estoque)estoque.textContent='Estoque';if(rel)rel.textContent='Relatório';
 // A ordem final é aplicada exclusivamente pelo módulo v131, depois que todos os módulos carregam.
 document.querySelectorAll('.neg-list-tabs').forEach(function(x){x.style.display='none'});
 return true;
}
 function loop(){if(!apply())setTimeout(loop,300)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loop);else loop();
})();


/* CONSOLIDATED: v130-lotes-venda.js */
/* v130 — vários lotes na venda e quantidade por lote */
(function(){
 function ensureLotCodes(){try{var list=(typeof records!=='undefined'?records:[]),changed=false,n=1;list.forEach(function(r){if(Number(r.quantCompra||0)>0){var code='LT-'+String(n++).padStart(2,'0');if(r.loteCodigo!==code){r.loteCodigo=code;changed=true}}});if(changed&&typeof persist==='function')persist()}catch(e){}}
 function saleLots(s){if(!s)return[];var lots=Array.isArray(s.animalLotsSold)&&s.animalLotsSold.length?s.animalLotsSold:(Array.isArray(s.sourceLots)&&s.sourceLots.length?s.sourceLots:null);if(lots)return lots;var id=s.animalLotId||s.sourceLotId||s.loteOrigemId||s.lotId;if(!id)return[];var qty=Array.isArray(s.animalNumbersSold)&&s.animalNumbersSold.length?s.animalNumbersSold.length:Number(s.quantVenda||0);return qty>0?[{lotId:id,quantity:qty}]:[]}
 function allocated(id,excludeId){try{return (typeof records!=='undefined'?records:[]).reduce(function(total,s){if(excludeId&&s.id===excludeId)return total;var lots=saleLots(s);return total+lots.reduce(function(a,x){return a+((x.lotId||x.id)===id?Number(x.quantity||x.quantidade||0):0)},0)},0)}catch(e){return 0}}
 function available(r,excludeId){return Math.max(0,Number(r.quantCompra||0)-Number(r.quantVenda||0)-allocated(r.id,excludeId))}
 function stock(){try{var list=(typeof records!=='undefined'?records:[]);return list.filter(function(r){return Number(r.quantCompra||0)>0})}catch(e){return[]}}
 function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
 function options(){ensureLotCodes();var list=stock().sort(function(a,b){return String(a.loteCodigo||'').localeCompare(String(b.loteCodigo||''),'pt-BR',{numeric:true})});return '<option value="">Selecione o lote</option>'+list.map(function(r){return '<option value="'+esc(r.id)+'">'+esc(r.loteCodigo||'LT')+' — '+esc(r.data)+' — '+esc(r.vendedor)+' — '+esc(r.era)+' (estoque '+available(r)+')</option>'}).join('')}
 function addRow(box){var row=document.createElement('div');row.className='field';row.style.display='flex';row.style.gap='8px';row.style.marginBottom='7px';row.innerHTML='<select class="lote130" style="flex:1">'+options()+'</select><input class="qtdLote130" type="number" min="1" step="1" placeholder="Qtd" style="width:100px"><button type="button" class="mini remLote130">×</button>';box.appendChild(row)}
 function setup(){
  ensureLotCodes();
  ['rSellerIdV121','rBuyerIdV121'].forEach(function(id){var e=document.getElementById(id);if(e&&e.closest('.field'))e.closest('.field').remove()});
  var q=document.getElementById('rqv');if(!q||document.getElementById('lotes130'))return;
  var box=document.createElement('div');box.id='lotes130';box.className='field span4';box.innerHTML='<label>Lotes de origem da venda</label><div class="hint">Selecione um ou mais lotes e informe quantos animais saem de cada um.</div><div id="loteRows130"></div><button type="button" class="btn secondary" id="addLote130">+ Adicionar lote</button>';q.closest('.field').parentNode.appendChild(box);var rows=document.getElementById('loteRows130');addRow(rows);document.getElementById('addLote130').onclick=function(){addRow(rows)};box.addEventListener('click',function(e){if(e.target.classList.contains('remLote130'))e.target.parentNode.remove()});
  var old=document.getElementById('animalLotV121');if(old)old.closest('.field')&&(old.closest('.field').style.display='none');
  var f=document.getElementById('recordForm');if(f&&!f.dataset.v130){f.dataset.v130='1';f.addEventListener('submit',function(){setTimeout(function(){var id=(document.getElementById('rid')||{}).value;if(!id||typeof records==='undefined')return;var lots=[];document.querySelectorAll('#loteRows130 .field').forEach(function(r){var l=r.querySelector('.lote130'),q=r.querySelector('.qtdLote130');if(l&&l.value&&Number(q.value)>0)lots.push({lotId:l.value,quantity:Number(q.value)})});var rec=records.find(function(x){return x.id===id});if(rec){rec.animalLotsSold=lots;if(typeof persist==='function')persist();try{if(typeof renderAll==='function')renderAll();else if(typeof renderStock==='function')renderStock()}catch(e){}}},120)})}
 }
  function nav(){var t=document.querySelector('.tabs'),p=t&&t.querySelector('[data-tab="painel"]');if(!t||!p)return;var find=function(x){return t.querySelector('[data-tab="'+x+'"]')};var by=function(s){return Array.from(t.querySelectorAll('.tabbtn')).find(function(b){return (b.textContent||'').trim()===s})};var c=find('cadastrosV120'),a=find('animaisV121')||by('Animais'),co=t.querySelector('#compraTelaV128'),ve=t.querySelector('#vendaTelaV128'),e=find('estoque'),cu=find('custos'),m=find('mapa'),r=find('relatorios');if(c)c.textContent='Cadastro';if(e)e.textContent='Estoque';if(r)r.textContent='Relatório';var cur=p;[c,co,ve,e,a,cu,m,r].filter(Boolean).forEach(function(x){t.insertBefore(x,cur.nextSibling);cur=x})}
 function init(){setup();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();



/* CONSOLIDATED: v131-ajustes-finais.js */
/* v132 — compra/venda limpas, sem resumo nem campos duplicados */
(function(){
 function byText(txt){return Array.from(document.querySelectorAll('.tabs .tabbtn')).find(function(b){return (b.textContent||'').trim()===txt})}
 function cleanText(){
  document.querySelectorAll('button,a,h2,h3,h4,th,b,.ph h2,.sectiontitle').forEach(function(e){
   var s=(e.textContent||'').trim();
   if(s==='Continuar para Venda →'||s==='Continuar para Venda') e.style.display='none';
   if(s==='Vendedores / Compras') e.textContent='Compras';
   if(s==='Compradores / Vendas') e.textContent='Vendas';
   if(s==='🐂 Vendedores / Compras') e.textContent='Compras';
   if(s==='💰 Compradores / Vendas') e.textContent='Vendas';
   if(s==='📋 Negociações completas') e.style.display='none';
   if(s==='Compra / Vendedor') e.textContent='Compra';
   if(s==='Venda / Comprador') e.textContent='Venda';
   if(s==='🐂 Compra / Vendedor') e.textContent='Compra';
   if(s==='💰 Venda / Comprador') e.textContent='Venda';
   if(s==='Vendedor') e.textContent='Cliente';
   if(s==='Comprador') e.textContent='Cliente';
   if(s==='Clientes'&&e.closest('.tabs')) e.textContent='Cadastro';
   if(s==='Estoque atual'&&e.closest('.tabs')) e.textContent='Estoque';
  });
  document.querySelectorAll('.neg-v66-top + div').forEach(function(e){if((e.textContent||'').indexOf('Escolha uma etapa da negociação')>=0)e.style.display='none'});
  document.querySelectorAll('.neg-v66-title').forEach(function(e){var s=(e.textContent||'').trim();if(s==='Compra / Vendedor')e.textContent='Compra';if(s==='Venda / Comprador')e.textContent='Venda'});
  var side=document.getElementById('paymentPlanSide');if(side&&side.closest('.field'))side.closest('.field').style.display='none';
  document.querySelectorAll('.neg-v66-tab,[data-negv66="resumo"]').forEach(function(e){e.style.display='none'});
  document.querySelectorAll('.neg-list-tabs').forEach(function(e){e.style.display='none'});
 }
 (function(){var st=document.createElement('style');st.textContent='.tabs{position:relative!important;top:auto!important;z-index:10!important;background:#fff!important;overflow:visible!important;margin-top:0!important;margin-bottom:18px!important}.tabs .tabbtn{position:relative;z-index:auto}.tab#negociacoes .tablewrap{overflow-x:auto}.tab#negociacoes table{font-size:12px}.tab#negociacoes th,.tab#negociacoes td{white-space:nowrap;padding:9px 10px}.tab#negociacoes th[data-sales-at],.tab#negociacoes th[data-sales-weight]{text-align:center;min-width:70px}.tab#negociacoes td.num{text-align:center}@media(max-width:600px){html,body{overflow-x:hidden!important;width:100%!important;max-width:100%!important}.tabs{display:flex!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;flex-wrap:nowrap!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important}.tabs::-webkit-scrollbar{display:none}.tabs .tabbtn{flex:0 0 auto!important;white-space:nowrap!important}.wrap{width:100%!important;max-width:100%!important;overflow-x:hidden!important}.head{width:100%!important;max-width:100%!important}.tablewrap{max-width:100%!important;overflow-x:auto!important}.modal{padding:8px!important;align-items:flex-start!important}.modalcard{width:100%!important;max-width:100%!important;margin:0 auto!important;max-height:calc(100dvh - 16px)!important;overflow:auto!important}.modalcard .mb{padding:14px!important}.modalcard .formgrid{grid-template-columns:1fr!important}.modalcard .span2,.modalcard .span4{grid-column:span 1!important}.modalcard .actions{flex-wrap:wrap!important}.modalcard .actions .btn{flex:1 1 120px!important}}';document.head.appendChild(st)})();
 (function(){
  function activeIntoView(){var t=document.querySelector('.tabs'),a=t&&t.querySelector('.tabbtn.active');if(a&&t&&window.innerWidth<=600){try{a.scrollIntoView({block:'nearest',inline:'center'})}catch(e){}}}
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('.tabs .tabbtn'))setTimeout(activeIntoView,30)},true);
  window.addEventListener('resize',function(){setTimeout(activeIntoView,30)});
  setTimeout(activeIntoView,500);
 })();
 function syncClientNames(){
  function sync(selectId,legacyId){
   var sel=document.getElementById(selectId); if(!sel)return;
   var old=document.getElementById(legacyId);
   if(!old){old=document.createElement('input');old.type='hidden';old.id=legacyId;old.name=legacyId;var f=sel.closest('form');if(f)f.appendChild(old)}
   old.value=sel.options[sel.selectedIndex]?sel.options[sel.selectedIndex].text:'';
  }
  sync('rclienteCompra','rvendedor'); sync('rclienteVenda','rcomprador');
  ['rclienteCompra','rclienteVenda'].forEach(function(id){var s=document.getElementById(id);if(s&&!s.dataset.v131Sync){s.dataset.v131Sync='1';s.addEventListener('change',function(){sync('rclienteCompra','rvendedor');sync('rclienteVenda','rcomprador')})}});
  function hydrate(selectId,legacyId){
   var s=document.getElementById(selectId),old=document.getElementById(legacyId); if(!s||!old)return;
   var val=(old.value||'').trim(); if(!val)return;
   var opt=Array.from(s.options).find(function(o){return (o.value||'').trim()===val||(o.textContent||'').trim()===val});
   if(opt)s.value=opt.value;
  }
  hydrate('rclienteCompra','rvendedor'); hydrate('rclienteVenda','rcomprador');
  [300,800,1500].forEach(function(ms){setTimeout(function(){hydrate('rclienteCompra','rvendedor');hydrate('rclienteVenda','rcomprador')},ms)});
  var form=document.getElementById('recordForm');
  if(form&&!form.dataset.v131EditHydrate){
   form.dataset.v131EditHydrate='1';
   new MutationObserver(function(){hydrate('rclienteCompra','rvendedor');hydrate('rclienteVenda','rcomprador')}).observe(form,{childList:true,subtree:true});
  }
  ['rvendedor','rcomprador'].forEach(function(id){var x=document.getElementById(id);if(x&&!x.dataset.v131Hydrate){x.dataset.v131Hydrate='1';x.addEventListener('input',function(){hydrate('rclienteCompra','rvendedor');hydrate('rclienteVenda','rcomprador')})}});
 }
 function normalizeLegacySaleLots(r){if(!r)return false;var has=Array.isArray(r.animalLotsSold)&&r.animalLotsSold.length||Array.isArray(r.sourceLots)&&r.sourceLots.length;if(has)return false;var id=r.animalLotId||r.sourceLotId||r.loteOrigemId||r.lotId||r.loteId||r.loteOrigem||r.lote; if(id&&typeof id==='object')id=id.id||id.lotId||id.recordId;var nums=(Array.isArray(r.animalNumbersSold)?r.animalNumbersSold:(Array.isArray(r.numerosAnimaisVendidos)?r.numerosAnimaisVendidos:[])).map(String);var qty=nums.length||Number(r.quantVenda||r.qtdVenda||r.quantidadeVenda||0);if(!id&&nums.length){try{var map=JSON.parse((typeof userGet==='function'?userGet('gado_animais_v121'):localStorage.getItem('gado_animais_v121'))||'{}'),best=null,score=0;Object.keys(map).forEach(function(lotId){var known=Array.isArray(map[lotId])?map[lotId].map(String):[],hits=nums.filter(function(n){return known.indexOf(n)>=0}).length;if(hits>score){score=hits;best=lotId;}});if(best&&score>0)id=best;}catch(e){}}if(!id||!(qty>0))return false;r.animalLotsSold=[{lotId:String(id),quantity:qty}];r.sourceLots=r.animalLotsSold;return true}
 function normalizeEditModal(){
  var title=document.getElementById('modalTitle'),rid=document.getElementById('rid');
  if(!title||title.textContent.indexOf('Editar')<0)return;
  var list=(typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[]));var migrated=list.some(normalizeLegacySaleLots);if(migrated){try{if(typeof persist==='function')persist()}catch(e){}}var r=list.find(function(x){return String(x.id)===String(rid&&rid.value)});var isVenda=!!(r&&(window.__negListView==='buyer'||(Number(r.quantVenda||0)>0&&!Number(r.quantCompra||0))));
  ['rclienteCompra','rclienteVenda'].forEach(function(id){var sel=document.getElementById(id);if(!sel)return;var field=sel.closest('.field');if(field)field.style.display='';sel.style.display='';var first=sel.options[0],rest=Array.from(sel.options).slice(1).sort(function(a,b){return String(a.textContent||'').localeCompare(String(b.textContent||''),'pt-BR',{sensitivity:'base'});});sel.innerHTML='';if(first)sel.appendChild(first);rest.forEach(function(opt){sel.appendChild(opt)});});
  var c=document.getElementById('negV66Compra'),v=document.getElementById('negV66Venda'),s=document.getElementById('negV66Resumo');
  if(c)c.style.display=isVenda?'none':'block'; if(v)v.style.display=isVenda?'block':'none'; if(s)s.style.display='block';
  var buyClient=document.getElementById('rclienteCompra'),sellClient=document.getElementById('rclienteVenda');
  // Depois de reconstruir/ordenar os selects, selecionar o cliente salvo no registro.
  [[buyClient,r&&r.vendedor],[sellClient,r&&r.comprador]].forEach(function(pair){
    var sel=pair[0],name=String(pair[1]||'').trim();if(!sel||!name)return;
    var opt=Array.from(sel.options).find(function(o){return String(o.value||'').trim()===name||String(o.textContent||'').trim()===name;});
    if(!opt){opt=document.createElement('option');opt.value=name;opt.textContent=name;sel.appendChild(opt);}
    sel.value=opt.value;sel.dispatchEvent(new Event('change',{bubbles:true}));
  });
  if(buyClient)buyClient.required=!isVenda;if(sellClient)sellClient.required=isVenda;
  var gc=document.getElementById('rgtaCompra'),gn=document.getElementById('rnotaCompra');if(gc)gc.value=(document.getElementById('rgta')||{}).value||'';if(gn)gn.value=(document.getElementById('rnota')||{}).value||'';var cv=document.getElementById('rcategoriaVenda'),cc=document.getElementById('rcategoria');if(cv&&cc&&document.activeElement!==cv)cv.value=cc.value||'';var wv=document.getElementById('rpesoVenda');if(wv){wv.disabled=false;wv.readOnly=false;if(document.activeElement!==wv)wv.value=r&&r.pesoVendaKg!=null?r.pesoVendaKg:'';}
  window.__modeV127=isVenda?'venda':'compra';
  var tabs=document.querySelector('.neg-v66-tabs');if(tabs)tabs.style.display='none';
  var st=s&&s.querySelector('.neg-v66-title');if(st)st.textContent=isVenda?'Documentos e fechamento da venda':'Documentos e fechamento da compra';
  var totals=document.getElementById('installmentTotals');if(totals){if(isVenda){var ins=Array.isArray(r&&r.installments)?r.installments:[],paid=ins.filter(function(p){return String(p.type||p.tipo||'').toLowerCase().indexOf('receb')>=0&&(p.paid===true||p.pago===true||p.baixada===true||String(p.status||'').toLowerCase()==='ok');}).reduce(function(a,p){return a+Number(p.value??p.valor??0)||0},0),scheduled=ins.filter(function(p){return String(p.type||p.tipo||'').toLowerCase().indexOf('receb')>=0;}).reduce(function(a,p){return a+Number(p.value??p.valor??0)||0},0),total=Number(r.quantVenda||0)*Number(r.precoVenda||0),pending=Math.max(0,total-paid);totals.innerHTML='<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px"><div style="flex:1;min-width:220px;border:1px solid #cfe5d7;background:#f2faf5;border-radius:10px;padding:10px"><b style="color:#176b45">A receber do comprador</b><div style="margin-top:5px">Negociação: <b>'+money.format(total)+'</b></div><div>Parcelado: '+money.format(scheduled)+' • Baixado: '+money.format(paid)+'</div><div>Pendente real: <b>'+money.format(pending)+'</b></div><small style="color:#31734d">'+(ins.length?'Total distribuído conforme parcelas':'Sem parcelas')+'</small></div></div>';}else{var cards=Array.from(totals.querySelectorAll('div')).filter(function(e){var t=(e.textContent||'').trim().toLowerCase();return t.indexOf('a pagar ao vendedor')===0&&e.children.length>0;});cards.forEach(function(card){card.style.display='';});Array.from(totals.querySelectorAll('div')).filter(function(e){return (e.textContent||'').trim().toLowerCase().indexOf('a receber do comprador')===0&&e.children.length>0;}).forEach(function(card){card.style.display='none';});}}
  refreshEditLotOptions(r);hydrateSaleLots(r);
  try{if(typeof updateEditorSummary==='function')updateEditorSummary();}catch(e){}
 }
 function normalizePaymentCards(){var totals=document.getElementById('installmentTotals');if(!totals)return;var sale=window.__modeV127==='venda'||Number(document.getElementById('rqv')?.value||0)>0&&Number(document.getElementById('rqcomp')?.value||0)===0,cards=Array.from(totals.querySelectorAll('div')).filter(function(e){var t=(e.textContent||'').trim().toLowerCase();return (t.indexOf('a pagar ao vendedor')===0||t.indexOf('a receber do comprador')===0)&&e.children.length>0;});if(sale&&!cards.some(function(e){return (e.textContent||'').trim().toLowerCase().indexOf('a receber do comprador')===0;})){var total=Number(document.getElementById('rqv')?.value||0)*Number(document.getElementById('rpv')?.value||0);totals.innerHTML='<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px"><div style="flex:1;min-width:220px;border:1px solid #cfe5d7;background:#f2faf5;border-radius:10px;padding:10px"><b style="color:#176b45">A receber do comprador</b><div style="margin-top:5px">Negociação: <b>'+money.format(total)+'</b></div><div>Parcelado: R$ 0,00 • Baixado: R$ 0,00</div><div>Pendente real: <b>'+money.format(total)+'</b></div><small style="color:#31734d">Sem parcelas</small></div></div>';return;}cards.forEach(function(card){var t=(card.textContent||'').trim().toLowerCase();card.style.display=(sale?t.indexOf('a receber do comprador')===0:t.indexOf('a pagar ao vendedor')===0)?'':'none';});}
 function hydrateSaleLots(r){if(!r)return;var saved=r.animalLotsSold||r.sourceLots||[];if(!Array.isArray(saved)||!saved.length)return;var rows=document.getElementById('loteRows130');if(rows&&rows.dataset.v131HydratedId===String(r.id))return;var all=rows?Array.from(rows.querySelectorAll('.field')):[];saved.forEach(function(item,i){var id=item.lotId||item.id,qty=Number(item.quantity||item.quantidade||0),row=all[i];if(!row&&document.getElementById('addLote130')){document.getElementById('addLote130').click();all=Array.from(rows.querySelectorAll('.field'));row=all[i];}var sel=row&&row.querySelector('.lote130'),q=row&&row.querySelector('.qtdLote130');if(sel){sel.value=id;sel.dispatchEvent(new Event('change',{bubbles:true}));}if(q)q.value=qty;});var rows2=document.getElementById('v131LotRows');if(rows2){saved.forEach(function(item){var c=rows2.querySelector('[data-lot="'+(item.lotId||item.id)+'"]'),q=rows2.querySelector('[data-lotq="'+(item.lotId||item.id)+'"]');if(c)c.checked=true;if(q)q.value=Number(item.quantity||item.quantidade||0);});}if(rows)rows.dataset.v131HydratedId=String(r.id);}
 function refreshEditLotOptions(r){var rows=document.getElementById('loteRows130');if(!rows)return;var base=sourceRecords(),saved=r&& (r.animalLotsSold||r.sourceLots)||[],ids=saved.map(function(x){return String(x.lotId||x.id)}),sig=base.map(function(l){return l.id+':'+Number(l.quantCompra||0)+':'+(l.loteCodigo||'')}).join('|')+';'+ids.join('|');if(rows.dataset.v131OptionsHash===sig)return;if(document.activeElement&&document.activeElement.classList&&document.activeElement.classList.contains('lote130'))return;base=base.filter(function(l){return Number(l.quantCompra||0)>0}).sort(function(a,b){return String(a.loteCodigo||'').localeCompare(String(b.loteCodigo||''),'pt-BR',{numeric:true})});rows.querySelectorAll('.lote130').forEach(function(sel){var keep=sel.value;sel.innerHTML='<option value="">Selecione o lote</option>'+base.map(function(l){var saldo=Math.max(0,Number(l.quantCompra||0)-Number(l.quantVenda||0)-allocatedFromLot(l.id));return '<option value="'+l.id+'">'+(l.loteCodigo||'LT')+' — '+(l.data||'')+' — '+(l.vendedor||'')+' — '+(l.era||'')+' (estoque '+saldo+')</option>';}).join('');sel.value=keep;});rows.dataset.v131OptionsHash=sig;}
 function showSaleLotHistory(r){var box=document.getElementById('negV66Venda');if(!box||!r)return;var saved=r.animalLotsSold||r.sourceLots||[];var old=document.getElementById('v131SaleLotHistory');if(old)old.remove();var d=document.createElement('div');d.id='v131SaleLotHistory';d.className='field span4';d.innerHTML='<label>Histórico dos lotes vendidos</label><div class="hint"></div>';var hint=d.querySelector('.hint');if(!Array.isArray(saved)||!saved.length){hint.textContent='Nenhum lote vinculado a esta venda.';}else{var list=(window.records||[]);hint.innerHTML=saved.map(function(x){var id=x.lotId||x.id,lot=list.find(function(y){return y.id===id})||{};return '<div style="padding:6px 0;border-bottom:1px solid #dfe9e2"><b>'+(lot.vendedor||'Lote')+'</b> • '+(lot.data||'')+' • '+(lot.era||'')+' — <b>'+Number(x.quantity||x.quantidade||0)+'</b> animal(is)</div>';}).join('');}var grid=box.querySelector('.formgrid');if(grid)grid.insertBefore(d,grid.firstChild);}
 function setModeRequirements(mode){var sale=mode==='venda',a=document.getElementById('rclienteCompra'),b=document.getElementById('rclienteVenda');if(a)a.required=!sale;if(b)b.required=sale;window.__modeV127=mode}
 function addLotPicker(){
  var box=document.getElementById('negV66Venda');if(!box||document.getElementById('v131LotPicker'))return;
  var base=(typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[]));var lots=base.filter(function(r){var used=base.reduce(function(a,s){var ls=s.animalLotsSold||s.sourceLots||[];return a+(Array.isArray(ls)?ls.reduce(function(n,x){return n+((x.lotId||x.id)===r.id?Number(x.quantity||x.quantidade||0):0)},0):0)},0);return Number(r.quantCompra||0)-Number(r.quantVenda||0)-used>0});
  var d=document.createElement('div');d.id='v131LotPicker';d.className='field span2';d.innerHTML='<label>Lotes de origem da venda</label><div class="hint">Selecione um ou mais lotes e informe quantos animais saem de cada um.</div><div id="v131LotRows"></div>';
  var anchor=box.querySelector('.formgrid');if(anchor)anchor.insertBefore(d,anchor.firstChild);var rows=d.querySelector('#v131LotRows');
  lots.forEach(function(r){var used=base.reduce(function(a,s){var ls=s.animalLotsSold||s.sourceLots||[];return a+(Array.isArray(ls)?ls.reduce(function(n,x){return n+((x.lotId||x.id)===r.id?Number(x.quantity||x.quantidade||0):0)},0):0)},0),saldo=Math.max(0,Number(r.quantCompra||0)-Number(r.quantVenda||0)-used),row=document.createElement('label');row.style.cssText='display:flex;gap:8px;align-items:center;margin:6px 0';row.innerHTML='<input type="checkbox" data-lot="'+r.id+'"> '+(r.vendedor||'Lote')+' • '+(r.era||'')+' • disponíveis: '+saldo+' <input type="number" min="1" max="'+saldo+'" step="1" data-lotq="'+r.id+'" style="width:90px" placeholder="Qtd">';rows.appendChild(row)});
  function collect(){var chosen=[];rows.querySelectorAll('[data-lot]:checked').forEach(function(c){var q=rows.querySelector('[data-lotq="'+c.dataset.lot+'"]');chosen.push({id:c.dataset.lot,quantidade:Number(q&&q.value||0)})});var qv=document.getElementById('rqv');if(chosen.length)qv.value=chosen.reduce(function(a,x){return a+x.quantidade},0);window.__v131PendingLots=chosen}
  rows.addEventListener('change',collect);rows.addEventListener('input',collect);
 }
 function addPurchaseDocuments(){
  var box=document.getElementById('negV66Compra');if(!box||document.getElementById('v131PurchaseDocs'))return;var grid=box.querySelector('.formgrid');if(!grid)return;
  var d=document.createElement('div');d.id='v131PurchaseDocs';d.className='field span2';d.innerHTML='<label>Documentos da compra</label><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn secondary">GTA <select id="rgtaCompra"><option></option><option>ok</option><option>pendente</option></select></label><label class="btn secondary">Nota fiscal <select id="rnotaCompra"><option></option><option>ok</option><option>pendente</option></select></label></div>';grid.appendChild(d);
  [['rgtaCompra','rgta'],['rnotaCompra','rnota']].forEach(function(pair){var a=document.getElementById(pair[0]),b=document.getElementById(pair[1]);if(a&&b){a.value=b.value||'';a.addEventListener('change',function(){b.value=a.value})}});
 }
 function addSaleCategory(){var box=document.getElementById('negV66Venda'),grid=box&&box.querySelector('.formgrid');if(!grid||document.getElementById('rcategoriaVenda'))return;var f=document.createElement('div');f.className='field';f.innerHTML='<label>Categoria</label><select id="rcategoriaVenda"><option></option><option>Bezerro</option><option>Garrote</option><option>Boi</option><option>Novilha</option><option>Vaca</option><option>Outro</option></select>';var mark=document.getElementById('rmarca')?.closest('.field');if(mark)grid.insertBefore(f,mark);var s=document.getElementById('rcategoriaVenda'),c=document.getElementById('rcategoria');s.addEventListener('change',function(){if(c)c.value=s.value})}
 function addSaleWeight(){var box=document.getElementById('negV66Venda'),grid=box&&box.querySelector('.formgrid');if(!grid||document.getElementById('rpesoVenda'))return;var f=document.createElement('div');f.className='field';f.innerHTML='<label>Peso (kg/cabeça)</label><input id="rpesoVenda" type="number" min="0" step="0.01" placeholder="Peso médio" />';var mark=document.getElementById('rqv')?.closest('.field');if(mark)grid.insertBefore(f,mark);var s=document.getElementById('rpesoVenda'),p=document.getElementById('rpeso');s.addEventListener('input',function(){if(p)p.value=s.value;try{preview()}catch(e){}})}
 function addPurchaseHistoryDocs(){
  if((window.__negListView||'seller')!=='seller')return;var h=document.querySelector('#negTableHead tr');if(!h||h.querySelector('[data-purchase-doc]'))return;var a=document.createElement('th');a.textContent='GTA';a.dataset.purchaseDoc='1';var b=document.createElement('th');b.textContent='Nota fiscal';b.dataset.purchaseDoc='1';var actionIndex=h.children.length-1;h.insertBefore(b,h.children[actionIndex]);h.insertBefore(a,h.children[actionIndex]);
  var list=(typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[]));document.querySelectorAll('#tbody tr').forEach(function(tr){var edit=tr.querySelector('button[onclick*="editRecord"]'),id=edit&&((edit.getAttribute('onclick')||'').match(/editRecord\('([^']+)/)||[])[1],r=list.find(function(x){return x.id===id})||{};var ca=document.createElement('td');ca.innerHTML=typeof badge==='function'?badge(r.gta)+' '+(typeof fileLink==='function'?fileLink(r.gtaPdf,'GTA'):''):'';var cb=document.createElement('td');cb.innerHTML=typeof badge==='function'?badge(r.nota)+' '+(typeof fileLink==='function'?fileLink(r.notaPdf,'Nota'):''):'';var ai=tr.children.length-1;tr.insertBefore(cb,tr.children[ai]);tr.insertBefore(ca,tr.children[ai]);});
 }
 function numberedForSale(r,list){var direct=Array.isArray(r&&r.animalNumbersSold)?r.animalNumbersSold:(Array.isArray(r&&r.numerosAnimaisVendidos)?r.numerosAnimaisVendidos:[]);if(direct.length)return direct.map(String);var map={};try{map=JSON.parse((typeof userGet==='function'?userGet('gado_animais_v121'):localStorage.getItem('gado_animais_v121'))||'{}')}catch(e){}var used={};(list||[]).forEach(function(x){if(x.id===r.id)return;(x.animalNumbersSold||[]).forEach(function(n){used[String(n)]=1})});var out=[],lots=r&& (r.animalLotsSold||r.sourceLots)||[];if(!Array.isArray(lots))return out;lots.forEach(function(x){var nums=Array.isArray(map[x.lotId||x.id])?map[x.lotId||x.id]:[];nums.forEach(function(n){if(out.length<lots.reduce(function(a,z){return a+Number(z.quantity||z.quantidade||0)},0)&&!used[String(n)])out.push(String(n));});});return out;}
 function addSalesAt(){
  if((window.__negListView||'seller')!=='buyer')return;var h=document.querySelector('#negTableHead tr');if(!h||h.querySelector('[data-sales-at]'))return;var th=document.createElement('th');th.textContent='@';th.dataset.salesAt='1';h.insertBefore(th,h.children[6]);var wh=document.createElement('th');wh.textContent='Peso kg';wh.dataset.salesWeight='1';h.insertBefore(wh,th);var nh=document.createElement('th');nh.textContent='Nº animais';nh.dataset.salesNumbers='1';h.insertBefore(nh,h.children[h.children.length-1]);var list=(typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[]));document.querySelectorAll('#tbody tr').forEach(function(tr){var edit=tr.querySelector('button[onclick*="editRecord"]'),id=edit&&((edit.getAttribute('onclick')||'').match(/editRecord\('([^']+)/)||[])[1],r=list.find(function(x){return x.id===id})||{},kg=Number(r.pesoVendaKg||r.pesoKg||r.peso||0),td=document.createElement('td'),at=document.createElement('td'),nums=numberedForSale(r,list),nd=document.createElement('td');td.className='num';td.textContent=num.format(kg);at.className='num';at.textContent=num.format(kg/30);nd.textContent=nums.length?nums.join(', '):'—';nd.dataset.salesNumbers='1';tr.insertBefore(td,tr.children[6]);tr.insertBefore(at,tr.children[7]);tr.insertBefore(nd,tr.children[tr.children.length-1]);});
 }
 function sourceRecords(){try{return typeof records!=='undefined'&&Array.isArray(records)?records:(window.records||[])}catch(e){return window.records||[]}}
 function installReportAggregation(){if(typeof window.reportFilteredRecords!=='function'||window.reportFilteredRecords.__v132Grouped)return;var raw=window.reportFilteredRecords;window.reportFilteredRecords=function(){var list=raw.apply(this,arguments),groups={};list.forEach(function(r){var key=[r.data||'',r.comprador||'',r.vendedor||'',r.era||'',r.marca||''].join('|'),g=groups[key];if(!g){g={...r,quantCompra:0,quantVenda:0,pesoKg:0,precoCompra:0,precoVenda:0,installments:[],animalLotsSold:[],sourceLots:[]};groups[key]=g}var qc=Number(r.quantCompra||0),qv=Number(r.quantVenda||0),pc=Number(r.precoCompra||0),pv=Number(r.precoVenda||0);g.quantCompra+=qc;g.quantVenda+=qv;g.pesoKg+=Number(r.pesoKg||r.peso||0)*Math.max(qc,qv,1);g.precoCompra+=qc*pc;g.precoVenda+=qv*pv;if(Array.isArray(r.installments))g.installments=g.installments.concat(r.installments);['animalLotsSold','sourceLots'].forEach(function(k){if(Array.isArray(r[k]))g[k]=g[k].concat(r[k])});if(Array.isArray(r.parcelas))g.installments=g.installments.concat(r.parcelas);if(Array.isArray(r.animalNumbersSold))g.animalNumbersSold=(g.animalNumbersSold||[]).concat(r.animalNumbersSold)});return Object.keys(groups).map(function(k){var g=groups[k];g.precoCompra=g.quantCompra?g.precoCompra/g.quantCompra:0;g.precoVenda=g.quantVenda?g.precoVenda/g.quantVenda:0;g.pesoKg=(g.quantCompra||g.quantVenda)?g.pesoKg/(g.quantCompra||g.quantVenda):0;return g})};window.reportFilteredRecords.__v132Grouped=true;}
 function allocatedFromLot(id,excludeId){return sourceRecords().reduce(function(total,sale){if(excludeId&&sale.id===excludeId)return total;var lots=sale.animalLotsSold||sale.sourceLots||[];return total+(Array.isArray(lots)?lots.reduce(function(a,x){return a+((x.lotId||x.id)===id?Number(x.quantity||x.quantidade||0):0)},0):0)},0)}
 function refreshAllocatedStock(){var body=document.getElementById('stockBody');if(!body)return;var list=sourceRecords().filter(function(r){var saldo=Number(r.quantCompra||0)-Number(r.quantVenda||0)-allocatedFromLot(r.id);return saldo>0&&Number(r.quantCompra||0)>0}).sort(function(a,b){return (b.data||'').localeCompare(a.data||'')});body.innerHTML=list.map(function(r){var qc=Number(r.quantCompra||0),qv=Number(r.quantVenda||0),allocated=allocatedFromLot(r.id),saldo=Math.max(0,qc-qv-allocated),kg=Number(r.pesoKg||r.peso||0),pc=Number(r.precoCompra||0);return '<tr><td>'+fmtDate(r.data)+'</td><td><b>'+esc(r.loteCodigo||'—')+'</b></td><td>'+esc(r.vendedor||'')+'</td><td>'+esc(r.era||'—')+'</td><td class="num">'+num.format(qc)+'</td><td class="num">'+num.format(qv+allocated)+'</td><td class="num"><b>'+num.format(saldo)+'</b></td><td class="num">'+num.format(daysInStock(r))+'</td><td class="num">'+num.format(kg)+'</td><td class="num">'+money.format(pc)+'</td><td class="num">'+money.format(kg?pc/kg:0)+'</td><td class="num">'+money.format(saldo*pc)+'</td><td><span class="badge warn">'+(saldo===0?'Vendido':'Em estoque')+'</span></td><td>'+esc(r.parceiro||'—')+'</td></tr>';}).join('');}
 function run(){
  if(false)return;
  var legacy=document.getElementById('v66-neg-separate');
  if(legacy)legacy.remove();
  var legacyStyle=document.getElementById('v66-neg-separate-style');
  if(legacyStyle)legacyStyle.remove();
  document.querySelectorAll('.neg-v66-tab,[data-negv66-go]').forEach(function(x){x.onclick=null;x.style.display='none'});
  ['rSellerIdV121','rBuyerIdV121'].forEach(function(id){var e=document.getElementById(id);if(e&&e.closest('.field'))e.closest('.field').remove()});
  cleanText();
  // O seletor oficial de lotes é criado pelo v130; não duplicar a lista aqui.
  addPurchaseDocuments();
  addSaleCategory();
  addSaleWeight();
  var gen=document.getElementById('generatePaymentPlanBtn');if(gen&&!gen.dataset.v131Side){gen.dataset.v131Side='1';gen.addEventListener('click',function(){var side=document.getElementById('paymentPlanSide');if(side){side.value=window.__modeV127==='venda'?'Receber':'Pagar';side.dispatchEvent(new Event('change'))}} ,true)}
  syncClientNames();
  installReportAggregation();
  if(window.renderTable&&!window.renderTable.__v131Lists){var rt=window.renderTable;window.renderTable=function(){var out=rt.apply(this,arguments);addPurchaseHistoryDocs();addSalesAt();return out};window.renderTable.__v131Lists=true}
  if(window.renderStock&&!window.renderStock.__v131Allocated){var rs=window.renderStock;window.renderStock=function(){var out=rs.apply(this,arguments);refreshAllocatedStock();return out};window.renderStock.__v131Allocated=true}
  if(window.preview&&!window.preview.__v131Calc){var op=window.preview;window.preview=function(){var out=op.apply(this,arguments),t=document.getElementById('calcPreview'),m=document.getElementById('modalTitle');if(t&&m&&m.textContent.indexOf('Editar')>=0){var qc=Number(document.getElementById('rqcomp')?.value||0),qv=Number(document.getElementById('rqv')?.value||0),kg=Number(document.getElementById('rpeso')?.value||0),pc=Number(document.getElementById('rpc')?.value||0),pv=Number(document.getElementById('rpv')?.value||0),at=kg?num.format(kg/30):'0';if(qc>0&&qv===0)t.innerHTML='<b>Cálculos:</b> '+at+' @ • compra '+(kg?money.format(pc/kg):money.format(0))+'/kg • saldo '+qc+' cabeças • compra total '+money.format(qc*pc);else if(qv>0&&qc===0)t.innerHTML='<b>Cálculos:</b> '+at+' @ • venda '+(kg?money.format(pv/kg):money.format(0))+'/kg • venda total '+money.format(qv*pv)}return out};window.preview.__v131Calc=true}
  if(window.editRecord&&!window.editRecord.__v131Edit){var oe=window.editRecord;window.editRecord=function(id){window.__v131PendingLots=null;window.__v131SubmitLots=null;var rows=document.getElementById('loteRows130');if(rows){rows.innerHTML='';var add=document.getElementById('addLote130');if(add)add.click();delete rows.dataset.v131HydratedId;delete rows.dataset.v131OptionsHash}var picker=document.getElementById('v131LotPicker');if(picker){picker.querySelectorAll('input[type="checkbox"]').forEach(function(x){x.checked=false});picker.querySelectorAll('input[type="number"]').forEach(function(x){x.value=''})}var weight=document.getElementById('rpesoVenda');if(weight)weight.value='';var out=oe.apply(this,arguments);setTimeout(normalizeEditModal,120);setTimeout(normalizeEditModal,500);setTimeout(normalizeEditModal,1100);return out};window.editRecord.__v131Edit=true}
  var t=document.querySelector('.tabs'),p=t&&t.querySelector('[data-tab="painel"]');if(!t||!p)return;
  var oldNeg=t.querySelector('[data-tab="negociacoes"]');if(oldNeg)oldNeg.style.display='none';
  function add(id,label,view){var b=document.getElementById(id);if(!b){b=document.createElement('button');b.id=id;b.type='button';b.className='tabbtn';b.textContent=label;b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});b.classList.add('active');var s=document.getElementById('negociacoes');if(s)s.classList.add('active');setModeRequirements(view==='buyer'?'venda':'compra');if(typeof setNegotiationListView==='function')setNegotiationListView(view);else{var q=document.querySelector('.neg-list-tab[data-listview="'+view+'"]');if(q&&typeof q.click==='function')q.click()}try{if(typeof renderTable==='function')renderTable()}catch(e){}var n=document.getElementById('newBtn');if(n)n.textContent=view==='seller'?'+ Nova compra':'+ Nova venda'};t.appendChild(b)}return b}
  var cad=t.querySelector('[data-tab="cadastrosV120"]')||byText('Cadastro'),ani=t.querySelector('[data-tab="animaisV121"]')||byText('Animais'),co=add('compraTelaV128','Compra','seller'),ve=add('vendaTelaV128','Venda','buyer'),es=t.querySelector('[data-tab="estoque"]')||byText('Estoque'),cu=t.querySelector('[data-tab="custos"]')||byText('$ Custos'),ma=t.querySelector('[data-tab="mapa"]')||byText('Mapa'),re=t.querySelector('[data-tab="relatorios"]')||byText('Relatório');
  var cur=p;[cad,co,ve,es,ani,cu,ma,re].filter(Boolean).forEach(function(x){t.insertBefore(x,cur.nextSibling);cur=x});
  t.dataset.v131Locked='1';
  t.style.visibility='';
 }
 document.addEventListener('click',function(ev){
  var x=ev.target&&ev.target.closest&&ev.target.closest('.neg-v66-tab,[data-negv66-go],[data-negv66="resumo"]');
  if(x){ev.preventDefault();ev.stopImmediatePropagation();x.style.display='none';}
 },true);
 document.addEventListener('change',function(ev){var s=ev.target;if(!s||!s.matches||!s.matches('select[data-client-select]'))return;var id=s.id==='rclienteCompra'?'rvendedor':'rcomprador',h=document.getElementById(id);if(h)h.value=s.value||'';},true);
 document.addEventListener('click',function(ev){var b=ev.target&&ev.target.closest&&ev.target.closest('#newBtn');if(b)setTimeout(function(){setModeRequirements((b.textContent||'').toLowerCase().indexOf('venda')>=0?'venda':'compra');if((b.textContent||'').toLowerCase().indexOf('venda')>=0)refreshEditLotOptions(null)},100)},true);
 document.addEventListener('submit',function(ev){var f=ev.target;if(!f||f.id!=='recordForm')return;['rclienteCompra','rclienteVenda'].forEach(function(sid){var s=document.getElementById(sid),hid=sid==='rclienteCompra'?'rvendedor':'rcomprador',h=document.getElementById(hid);if(s&&h)h.value=s.value||''});},true);
 document.addEventListener('submit',function(ev){var f=ev.target,sale=window.__modeV127==='venda'||window.__negListView==='buyer'||(Number(document.getElementById('rqv')?.value||0)>0&&Number(document.getElementById('rqcomp')?.value||0)===0);if(!f||f.id!=='recordForm'||!sale)return;window.__v131SaleEditId=(document.getElementById('rid')||{}).value||'';var total=Number(document.getElementById('rqv')?.value||0),chosen=[];document.querySelectorAll('#loteRows130 .field').forEach(function(row){var l=row.querySelector('.lote130'),q=row.querySelector('.qtdLote130');if(l&&l.value&&Number(q&&q.value||0)>0)chosen.push({lotId:l.value,quantity:Number(q.value)});});if(!chosen.length&&window.__v131PendingLots)chosen=window.__v131PendingLots.map(function(x){return {lotId:x.lotId||x.id,quantity:Number(x.quantity||x.quantidade||0)}});window.__v131SubmitLots=chosen;var sum=chosen.reduce(function(a,x){return a+Number(x.quantity||0)},0);if(total!==sum){ev.preventDefault();ev.stopImmediatePropagation();alert('A quantidade da venda deve ser igual à soma dos animais dos lotes. Venda: '+total+' • Lotes: '+sum);}},true);
 document.addEventListener('submit',function(ev){var sale=window.__modeV127==='venda'||window.__negListView==='buyer'||(Number(document.getElementById('rqv')?.value||0)>0&&Number(document.getElementById('rqcomp')?.value||0)===0);if(ev.target&&ev.target.id==='recordForm'&&sale){function syncSaleLots(){var chosen=window.__v131SubmitLots||window.__v131PendingLots||[],id=window.__v131SaleEditId||(document.getElementById('rid')||{}).value,list=(typeof records!=='undefined'&&records||window.records||[]),r=list.find(function(x){return x.id===id})||list[list.length-1];if(r&&chosen.length){r.animalLotsSold=chosen;r.sourceLots=chosen;if(!Array.isArray(r.animalNumbersSold)||!r.animalNumbersSold.length)r.animalNumbersSold=numberedForSale(r,list);r.updatedAt=new Date().toISOString();try{persist()}catch(e){}}try{if(typeof renderAll==='function')renderAll();else if(typeof renderStock==='function')renderStock();if(typeof renderTable==='function')renderTable();}catch(e){}}[150,600,1200,2200,4000].forEach(function(ms){setTimeout(syncSaleLots,ms);});}},false);
 document.addEventListener('submit',function(ev){var sale=window.__modeV127==='venda'||window.__negListView==='buyer'||(Number(document.getElementById('rqv')?.value||0)>0&&Number(document.getElementById('rqcomp')?.value||0)===0);if(ev.target&&ev.target.id==='recordForm'&&sale){setTimeout(function(){var id=document.getElementById('rid')?.value,r=(typeof records!=='undefined'&&records||[]).find(function(x){return x.id===id})||((typeof records!=='undefined'&&records||[]).slice(-1)[0]);var w=Number(document.getElementById('rpesoVenda')?.value||0);if(r&&w>0){r.pesoVendaKg=w;try{persist()}catch(e){}}},550)}},false);
 // A atualização contínua a cada 300 ms causava o pisca-pisca e reescrevia
 // selects enquanto o usuário editava. A normalização já é disparada pelos
 // eventos de abertura/alteração do modal e pelos timeouts controlados acima.
 var initialTabs=document.querySelector('.tabs');if(initialTabs)initialTabs.style.visibility='hidden';
 // Monta a navegação no primeiro ciclo, sem deixar as telas Compra/Venda
 // invisíveis enquanto o restante da sincronização termina.
 run();
 setTimeout(run,400);
 setTimeout(run,1600);
 new MutationObserver(function(){cleanText()}).observe(document.body,{subtree:true,childList:true});
})();

/* v180 — acabamento final para telas estreitas */
(function(){
  var st=document.createElement('style');
  st.textContent='@media(max-width:600px){.cattle-popup .leaflet-popup-content-wrapper{width:calc(100vw - 40px)!important;max-width:calc(100vw - 40px)!important}.cattle-popup .leaflet-popup-content{width:calc(100vw - 64px)!important;max-width:320px!important;overflow-x:hidden!important}.cattle-popup .map-popup,.cattle-popup .map-client-popup{min-width:0!important;max-width:100%!important}.cattle-popup table.smalltbl{width:100%!important;min-width:0!important;table-layout:fixed!important}.cattle-popup table.smalltbl th,.cattle-popup table.smalltbl td{padding:6px 3px!important;font-size:9px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.cattle-popup table.smalltbl th:nth-child(1),.cattle-popup table.smalltbl td:nth-child(1){width:23%!important}.cattle-popup table.smalltbl th:nth-child(2),.cattle-popup table.smalltbl td:nth-child(2){width:15%!important}.cattle-popup table.smalltbl th:nth-child(3),.cattle-popup table.smalltbl td:nth-child(3){width:23%!important}.cattle-popup table.smalltbl th:nth-child(4),.cattle-popup table.smalltbl td:nth-child(4){width:12%!important}.cattle-popup table.smalltbl th:nth-child(5),.cattle-popup table.smalltbl td:nth-child(5){width:27%!important}.tab#cadastrosV120 .tablewrap{max-height:none!important;overflow-y:visible!important}.tab#cadastrosV120 .smalltbl{min-width:620px!important}}';
  document.head.appendChild(st);
})();
