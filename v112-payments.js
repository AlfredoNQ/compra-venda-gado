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
      if(state.list.length&&state.total>0&&state.scheduled-state.total>0.01)problems.push((side==='Pagar'?'Compra':'Venda')+': parcelas excedem o total em '+cash(state.scheduled-state.total));
    });
    if(problems.length&&!confirm(problems.join('\n')+'\n\nDeseja salvar mesmo assim?')){
      event.preventDefault();event.stopImmediatePropagation();
      var submit=event.target&&event.target.querySelector('button[type="submit"]');if(submit)submit.disabled=false;
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
