(() => {
  'use strict';
  const rows=window.ASSET_ROWS||[], $=s=>document.querySelector(s);
  const groups=[['2','駅'],['6','距離標（kp）'],['3','トンネル'],['8','上り信号機'],['9','下り信号機'],['10','上り地上子'],['11','下り地上子'],['12','無電源地上子'],['7','曲線'],['1','勾配'],['5','避難口']];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const km=n=>{const m=Math.round(Math.abs(n)*1000);return `${n<0?'−':''}${String(Math.floor(m/1000)).padStart(2,'0')}k${String(m%1000).padStart(3,'0')}m`;};
  const dialog=document.createElement('section');dialog.id='listPrintDialog';dialog.hidden=true;
  dialog.innerHTML=`<div class="lp-toolbar"><strong>構造物一覧の印刷</strong><button id="lpClose">閉じる</button><label>並べ方 <select id="lpOrder"><option value="distance">距離順</option><option value="category">種別順</option></select></label><label>範囲 <select id="lpRange"><option value="all">全線</option><option value="section">区間指定</option></select></label><span id="lpRangeInputs" hidden><input id="lpFrom" type="number" step="0.001" value="0" aria-label="開始km"> ～ <input id="lpTo" type="number" step="0.001" value="56.1" aria-label="終了km"> km</span><button id="lpRefresh">プレビュー更新</button><button id="lpPrint">印刷・PDF保存</button><details><summary>印刷する種別</summary><div class="lp-types">${groups.filter(([code])=>rows.some(r=>String(r.categoryCode)===code)).map(([code,name])=>`<label><input type="checkbox" value="${code}" checked>${name}</label>`).join('')}</div></details><span id="lpStatus" role="status"></span><small>A4縦・2段／左段の上から下、次に右段へ。文字は10pt。印刷倍率100%・ブラウザのヘッダーとフッターなしを推奨。</small></div><div id="lpPages"></div>`;
  document.body.append(dialog);
  const button=document.createElement('button');button.id='assetPrintBtn';button.textContent='一覧を印刷・PDF';button.className='lp-open';$('.asset-toolbar').append(button);
  function details(r){
    if(Number(r.categoryCode)===1)return r.type2==null?'勾配終点':`${Number(r.type2)>0?'+':''}${r.type2}‰`;
    if(Number(r.categoryCode)===3)return [String(r.type2??'').replace(/^[12](?=\D)/,''),r.type3!=null?`延長 ${r.type3}m`:''].filter(Boolean).join('　');
    return [r.type2,r.type3].filter(v=>v!==null&&v!==undefined&&v!=='').map((v,i)=>Number(r.categoryCode)===7&&i===1?`R${v}`:v).join('　');
  }
  function rowHtml(r){const type=Number(r.categoryCode)===3?(r.type1==='T始点'?'トンネル始':'トンネル終'):r.type1;return `<tr class="lp-cat-${Number(r.categoryCode)}"><td>${km(r.distanceKm)}</td><td>${esc(type)}</td><td>${esc(details(r))}</td></tr>`;}
  let count=0;
  function render(){
    const from=Number($('#lpFrom').value),to=Number($('#lpTo').value),section=$('#lpRange').value==='section',chosen=new Set([...dialog.querySelectorAll('.lp-types input:checked')].map(x=>Number(x.value)));
    if(section&&(!Number.isFinite(from)||!Number.isFinite(to)||from>to)){$('#lpStatus').textContent='開始・終了の距離を確認してください。';return false;}
    const selected=rows.filter(r=>chosen.has(Number(r.categoryCode))&&(!section||(r.distanceKm>=from&&r.distanceKm<=to)));
    const category=$('#lpOrder').value==='category',rank=new Map(groups.map(([c],i)=>[Number(c),i]));
    selected.sort((a,b)=>(category?(rank.get(Number(a.categoryCode))??99)-(rank.get(Number(b.categoryCode))??99):0)||a.distanceKm-b.distanceKm||a.distanceOrder-b.distanceOrder);
    const pages=$('#lpPages');pages.innerHTML='';count=selected.length;
    if(!count){$('#lpStatus').textContent='該当する構造物はありません。';$('#lpPrint').disabled=true;return false;}
    $('#lpPrint').disabled=false;
    let page,columns,column,tbody,previous=null;
    function newPage(){page=document.createElement('article');page.className='lp-page';page.innerHTML=`<header><strong>智頭線 構造物一覧</strong><span>${category?'種別順':'距離順'} · ${section?`${km(from)}～${km(to)}`:'全線'} · ${count}件</span></header><div class="lp-columns"></div><footer></footer>`;pages.append(page);columns=page.querySelector('.lp-columns');newColumn();}
    function newColumn(){column=document.createElement('div');column.className='lp-column';column.innerHTML='<table><colgroup><col style="width:24mm"><col style="width:25mm"><col></colgroup><thead><tr><th>距離</th><th>種別</th><th>名称／内容</th></tr></thead><tbody></tbody></table>';columns.append(column);tbody=column.querySelector('tbody');}
    function advance(){if(columns.children.length===1)newColumn();else newPage();}
    newPage();
    for(const r of selected){
      const code=Number(r.categoryCode),heading=category&&code!==previous?`<tr class="lp-group"><th colspan="3">${esc(groups.find(([c])=>Number(c)===code)?.[1]||r.type1)}</th></tr>`:'';
      tbody.insertAdjacentHTML('beforeend',heading+rowHtml(r));
      if(column.scrollHeight>column.clientHeight+1){tbody.lastElementChild.remove();if(heading)tbody.lastElementChild.remove();advance();tbody.insertAdjacentHTML('beforeend',(category?`<tr class="lp-group"><th colspan="3">${esc(groups.find(([c])=>Number(c)===code)?.[1]||r.type1)}${heading?'':'（続き）'}</th></tr>`:'')+rowHtml(r));}
      previous=code;
    }
    [...pages.children].forEach((p,i)=>p.querySelector('footer').textContent=`${i+1} / ${pages.children.length}　　左段 ↓ → 右段 ↓`);
    $('#lpStatus').textContent=`${count}件・${pages.children.length}ページ`;
    return true;
  }
  button.onclick=()=>{dialog.hidden=false;requestAnimationFrame(render);};
  $('#lpClose').onclick=()=>{dialog.hidden=true;};
  $('#lpRefresh').onclick=render;
  $('#lpOrder').onchange=render;$('#lpRange').onchange=()=>{$('#lpRangeInputs').hidden=$('#lpRange').value==='all';render();};
  dialog.querySelectorAll('.lp-types input').forEach(x=>x.onchange=render);
  $('#lpPrint').onclick=()=>{if(!render())return;document.body.classList.add('printing-list');let style=$('#printPageStyle');if(!style){style=document.createElement('style');style.id='printPageStyle';document.head.append(style);}style.textContent='@page{size:A4 portrait;margin:8mm}';window.print();};
  window.addEventListener('afterprint',()=>document.body.classList.remove('printing-list'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')dialog.hidden=true;});
})();
