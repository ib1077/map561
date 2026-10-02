(() => {
  'use strict';
  const rows=window.ASSET_ROWS||[], $=s=>document.querySelector(s);
  const groups=[['2','駅'],['6','距離標（kp）'],['3','トンネル'],['8','上り信号機'],['9','下り信号機'],['10','上り地上子'],['11','下り地上子'],['12','無電源地上子'],['7','曲線'],['5','避難口']];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const km=n=>{const m=Math.round(Math.abs(n)*1000);return `${n<0?'−':''}${String(Math.floor(m/1000)).padStart(2,'0')}k${String(m%1000).padStart(3,'0')}m`;};
  const dialog=document.createElement('section');dialog.id='listPrintDialog';dialog.hidden=true;
  dialog.innerHTML=`<div class="lp-toolbar"><strong>構造物一覧の印刷</strong><button id="lpClose">閉じる</button><label>並べ方 <select id="lpOrder"><option value="distance">距離順</option><option value="category">種別順</option></select></label><label>範囲 <select id="lpRange"><option value="all">全線</option><option value="section">区間指定</option></select></label><span id="lpRangeInputs" hidden><input id="lpFrom" type="number" step="0.001" value="0" aria-label="開始km"> ～ <input id="lpTo" type="number" step="0.001" value="56.1" aria-label="終了km"> km</span><button id="lpRefresh">プレビュー更新</button><button id="lpPrint">印刷・PDF保存</button><details><summary>印刷する種別</summary><div class="lp-types">${groups.filter(([code])=>rows.some(r=>String(r.categoryCode)===code)).map(([code,name])=>`<label><input type="checkbox" value="${code}" checked>${name}</label>`).join('')}</div></details><span id="lpStatus" role="status"></span><small>A4縦・2段／左段の上から下、次に右段へ。文字は9.5pt。小番号：元＝元資料の種別順、距＝全データの距離順。種別順の無電源地上子は名称→距離。末尾に移設履歴と凡例を別紙で追加。印刷倍率100%・ブラウザのヘッダーとフッターなしを推奨。</small></div><div id="lpPages"></div>`;
  document.body.append(dialog);
  const button=document.createElement('button');button.id='assetPrintBtn';button.textContent='一覧を印刷・PDF';button.className='lp-open';$('.asset-toolbar').append(button);
  function details(r){
    if(Number(r.categoryCode)===1)return r.type2==null?'勾配終点':`${Number(r.type2)>0?'+':''}${r.type2}‰`;
    if(Number(r.categoryCode)===3)return [String(r.type2??'').replace(/^[12](?=\D)/,''),r.type3!=null?`延長 ${r.type3}m`:''].filter(Boolean).join('　');
    return [r.type2,r.type3].filter(v=>v!==null&&v!==undefined&&v!=='').map((v,i)=>Number(r.categoryCode)===7&&i===1?`R${v}`:v).join('　');
  }
  function rowHtml(r){const type=Number(r.categoryCode)===3?({'T始点':'トンネル始','T終点':'トンネル終','T勾配':'トンネル勾配'}[r.type1]||r.type1):r.type1;return `<tr class="lp-cat-${Number(r.categoryCode)}"><td>${km(r.distanceKm)}<small class="lp-numbers">元${esc(r.currentOrder)} ／ 距${esc(r.distanceOrder)}</small></td><td>${esc(type)}</td><td>${esc(details(r))}</td></tr>`;}
  let count=0;
  function render(){
    const from=Number($('#lpFrom').value),to=Number($('#lpTo').value),section=$('#lpRange').value==='section',chosen=new Set([...dialog.querySelectorAll('.lp-types input:checked')].map(x=>Number(x.value)));
    if(section&&(!Number.isFinite(from)||!Number.isFinite(to)||from>to)){$('#lpStatus').textContent='開始・終了の距離を確認してください。';return false;}
    const selected=rows.filter(r=>Number(r.categoryCode)!==1&&r.type1!=="T勾配"&&chosen.has(Number(r.categoryCode))&&(!section||(r.distanceKm>=from&&r.distanceKm<=to)));
    const category=$('#lpOrder').value==='category',rank=new Map(groups.map(([c],i)=>[Number(c),i]));
    selected.sort((a,b)=>(category?(rank.get(Number(a.categoryCode))??99)-(rank.get(Number(b.categoryCode))??99):0)||(category&&Number(a.categoryCode)===12&&Number(b.categoryCode)===12?String(a.type2??"").localeCompare(String(b.type2??""),"ja",{numeric:true}):0)||a.distanceKm-b.distanceKm||a.distanceOrder-b.distanceOrder);
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
    const history=window.ASSET_RELOCATIONS||[];
    if(history.length){
      const appendix=document.createElement('article');appendix.className='lp-page lp-history-page';
      appendix.innerHTML=`<header><strong>智頭線 構造物の移設履歴</strong><span>${history.length}件</span></header><div class="lp-history-body"><p>元資料から変更した位置の一覧です。本表の距離は移設後の位置を使用しています。区間・種別の絞り込みにかかわらず、履歴は全${history.length}件を掲載します。</p><table><colgroup><col style="width:8mm"><col><col style="width:25mm"><col style="width:25mm"><col style="width:22mm"></colgroup><thead><tr><th>No.</th><th>構造物・設備</th><th>旧位置</th><th>移設後</th><th>移設年月</th></tr></thead><tbody>${history.map((h,i)=>`<tr><td>${i+1}</td><td>${esc(h.name)}</td><td>${km(h.fromKm)}</td><td>${km(h.toKm)}</td><td>${esc(h.date)}</td></tr>`).join('')}</tbody></table></div><footer></footer>`;
      pages.append(appendix);
    }
    const legend=document.createElement('article');legend.className='lp-page lp-legend-page';
    legend.innerHTML=`<header><strong>智頭線 データの凡例</strong><span>色・記号・参照番号</span></header><div class="lp-legend-body"><p>図の記号と一覧の種別表記の見方です。設備の機能・動作はこの凡例では説明しません。</p><table><thead><tr><th>種類・表記</th><th>色・記号の見方／内容</th></tr></thead><tbody>
    <tr><td style="color:#9e242d">上り</td><td>赤。上り信号機・上り有電源地上子などの方向を示します。</td></tr>
    <tr><td style="color:#125da1">下り</td><td>青。下り信号機・下り有電源地上子などの方向を示します。</td></tr>
    <tr><td style="color:#17623f">駅</td><td>駅名・駅位置。図では淡いグリーンの縦帯。</td></tr>
    <tr><td style="color:#63507f">トンネル</td><td>図では太い暗色の線。始点・終点、名称、延長を掲載。</td></tr>
    <tr><td style="color:#84613e">進入路・避難口</td><td>元資料の名称・種別に準拠。図の避難口は四角の記号。</td></tr>
    <tr><td style="color:#a56717">曲線・R値</td><td>図では薄いオレンジの線と曲線の数値。Rは曲線半径の表記。BTC・BC・EC・ETCなどの表記は元資料に準拠。</td></tr>
    <tr><td>信号機</td><td>丸い記号。上り＝赤、下り＝青。中継は白抜きの丸。</td></tr>
    <tr><td>有電源地上子</td><td>勾配図ではひし形、位置図では四角。方向別に赤・青。</td></tr>
    <tr><td style="color:#787080">無電源地上子</td><td>図では小さな横長の記号。分類表記は下表を参照。</td></tr>
    <tr><td style="color:#816314">kp（距離標）</td><td>距離を示す表記。例：01k250m＝1km250m。</td></tr>
    <tr><td>元種別順番号（元）</td><td>元資料の種別順に対応する参照番号。</td></tr>
    <tr><td>距離順番号（距）</td><td>全データの距離順に対応する参照番号。印刷から除外した行の番号は欠番のまま保持します。</td></tr>
    </tbody></table><h2>無電源地上子の分類</h2><table class="lp-classifications"><thead><tr><th>分類</th><th>表記</th></tr></thead><tbody>${['P45','R/C','TF','PS','TS','F','SC-0'].map((name,i)=>`<tr><td>${i+1}</td><td>${name}</td></tr>`).join('')}</tbody></table><p>略号は元資料の表記に準拠。略号の意味・動作は推測していません。</p><p>通常勾配とトンネル内勾配変化点は一覧印刷から除外しています。元データとアプリ内一覧には残しています。</p></div><footer></footer>`;
    pages.append(legend);
    [...pages.children].forEach((p,i)=>p.querySelector('footer').textContent=`${i+1} / ${pages.children.length}　　${p.classList.contains('lp-legend-page')?'凡例':p.classList.contains('lp-history-page')?'移設履歴':'元：元資料の種別順番号　距：距離順番号　　左段 ↓ → 右段 ↓'}`);
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
