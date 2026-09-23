/* Saved edits are separate from the supplied data and survive app updates. */
window.createSpeedStore=function(profiles,storage){
 const key='chizu-speed-edits-v1',base=JSON.parse(JSON.stringify(profiles)),history=[];let edits={},warning='';
 const address=(train,index,dir)=>`${train}:${index}:${dir}`;
 function validate(items){if(!Array.isArray(items)||items.length>10000)throw Error('速度データの形式が違います');const next={};for(const r of items){const p=base[r.train]?.points?.[r.index];if(!p||!['up','down'].includes(r.direction)||!Number.isInteger(r.index)||r.km!==p.km||r.original!==p[r.direction]||!Number.isFinite(r.value)||r.value<0||r.value>150)throw Error('元データまたは速度値が一致しません');const k=address(r.train,r.index,r.direction);if(k in next)throw Error('同じ地点の重複があります');next[k]={...r};}return next;}
 function apply(next){for(const [t,b] of Object.entries(base))b.points.forEach((p,i)=>{for(const d of ['up','down'])profiles[t].points[i][d]=next[address(t,i,d)]?.value??p[d];});}
 function documentOf(next){return {format:'chizu-speed-edits',version:1,savedAt:new Date().toISOString(),edits:Object.values(next)};}
 function parse(doc){if(doc?.format!=='chizu-speed-edits'||doc.version!==1)throw Error('このアプリのバックアップではありません');return validate(doc.edits);}
 function commit(next,remember=true){storage.setItem(key,JSON.stringify(documentOf(next)));if(remember){history.push(edits);if(history.length>100)history.shift();}edits=next;apply(edits);}
 try{const raw=storage.getItem(key);if(raw){edits=parse(JSON.parse(raw));apply(edits);}}catch(e){warning='保存データを読み込めません。バックアップを確認してください。';}
 return {warning,base,count:()=>Object.keys(edits).length,canUndo:()=>history.length>0,
 set(train,index,direction,value){const p=base[train]?.points[index];if(!p||!['up','down'].includes(direction)||!Number.isFinite(value)||value<0||value>150)throw Error('速度は0〜150で入力してください');const k=address(train,index,direction),next={...edits};if(value===p[direction])delete next[k];else next[k]={train,index,direction,km:p.km,original:p[direction],value};commit(next);},
 undo(){if(!history.length)return;const next=history.at(-1);commit(next,false);history.pop();},
 export:()=>documentOf(edits),preview:doc=>Object.keys(parse(doc)).length,
 import(doc){const incoming=parse(doc);commit({...edits,...incoming});}
 };
};

window.installSpeedEditor=function(api){
 const {state,profiles,svg,viewport,logicalPointer,stop,refresh,render,kmText,store}=api;
 const $=s=>document.querySelector(s);let active=false,index=null,direction='up',drag=null;
 $('#speedOverlayTools').insertAdjacentHTML('beforeend','<button id="editSpeedBtn" aria-pressed="false">✎ 編集</button>');
 $('#routeWorkspace').insertAdjacentHTML('beforeend',`<section id="speedEditor" class="speed-editor hidden" aria-label="速度の編集">
 <div class="speed-edit-row"><strong id="editLocation">グラフの点を選択</strong><select id="editDirection" aria-label="編集方向"><option value="up">上り</option><option value="down">下り</option></select><button id="editPrev" aria-label="前の地点">‹</button><button id="editNext" aria-label="次の地点">›</button><button id="editClose">完了</button></div>
 <div class="speed-edit-row"><button id="editMinus">−1</button><input id="editValue" type="number" min="0" max="150" step="0.1" inputmode="decimal" aria-label="速度 km/h"><span>km/h</span><button id="editPlus">＋1</button><button id="editApply">保存</button><button id="editUndo">戻す</button><button id="editOriginal">元の値</button></div>
 <div class="speed-edit-row"><span id="editStatus" role="status"></span><button id="editExport">バックアップ</button><button id="editImport">読込</button><input id="editFile" type="file" accept=".json,application/json" hidden></div>
 <small>点をタップして選択。同じ点を上下にドラッグすると速度だけ変更。空白はスクロール。</small>
 </section>`);
 function status(message){$('#editStatus').textContent=message;}
 function selected(){return index===null?null:profiles[state.selectedTrain].points[index];}
 function sync(){const p=selected();$('#editLocation').textContent=p?`${state.selectedTrain}　${kmText(p.km)}　元 ${store.base[state.selectedTrain].points[index][direction]}`:`${state.selectedTrain}　グラフの点を選択`;$('#editValue').value=p?p[direction]:'';for(const id of ['editValue','editMinus','editPlus','editApply','editOriginal','editPrev','editNext'])$('#'+id).disabled=!p;$('#editUndo').disabled=!store.canUndo();}
 function persist(value){if(index===null)return;try{store.set(state.selectedTrain,index,direction,value);refresh();sync();status(`端末保存済み　変更 ${store.count()}件`);}catch(e){status(`保存できません：${e.message}`);sync();render();}}
 function finishDrag(cancelled){if(!drag)return;const d=drag;drag=null;if(!cancelled&&d.moved)persist(d.value);else{sync();render();}}
 function toggle(on){finishDrag(true);active=on;stop();$('#speedEditor').classList.toggle('hidden',!on);$('#editSpeedBtn').setAttribute('aria-pressed',String(on));if(on){direction=state.speedDirections[0]||'up';$('#editDirection').value=direction;ensureDirection();status(store.warning||`変更 ${store.count()}件。操作ごとに端末へ保存`);}sync();render();}
 function ensureDirection(){if(!state.speedDirections.includes(direction)){state.speedDirections.push(direction);document.querySelectorAll('[data-speed]').forEach(i=>i.checked=state.speedDirections.includes(i.dataset.speed));}}
 function point(e){const p=logicalPointer(e,viewport);return {x:p.x+viewport.scrollLeft,y:p.y+viewport.scrollTop-parseFloat(svg.style.top||0)};}
 const height=()=>Number(svg.getAttribute('height'));
 const py=v=>30+(150-v)/150*Math.max(150,height()-76);
 const px=p=>34+p.km*state.zoom;
 function near(p){let best=null,dist=18;profiles[state.selectedTrain].points.forEach((v,i)=>{const d=Math.hypot(p.x-px(v),p.y-py(v[direction]));if(d<dist){best=i;dist=d;}});return best;}
 svg.addEventListener('click',e=>{if(active){e.preventDefault();e.stopImmediatePropagation();}},true);
 viewport.addEventListener('pointerdown',e=>{if(!active)return;if(drag){finishDrag(true);e.stopImmediatePropagation();return;}const p=point(e),i=near(p);if(i===null)return;stop();e.preventDefault();e.stopImmediatePropagation();const wasSelected=i===index;index=i;drag={id:e.pointerId,startY:p.y,original:selected()[direction],value:selected()[direction],moved:false,canDrag:wasSelected};viewport.setPointerCapture(e.pointerId);sync();render();},true);
 viewport.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const delta=point(e).y-drag.startY;if(!drag.canDrag||Math.abs(delta)<3)return;drag.moved=true;drag.value=Math.max(0,Math.min(150,Math.round(drag.original-delta*150/Math.max(150,height()-76))));$('#editValue').value=drag.value;status('指を離すと保存');render();},true);
 for(const name of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(name,e=>{if(!drag||drag.id!==e.pointerId)return;e.stopImmediatePropagation();finishDrag(name!=='pointerup');},true);
 $('#editSpeedBtn').onclick=()=>toggle(!active);$('#editClose').onclick=()=>toggle(false);
 $('#editDirection').onchange=e=>{finishDrag(true);direction=e.target.value;ensureDirection();sync();render();};
 $('#editMinus').onclick=()=>persist(Math.max(0,Math.round((selected()[direction]-1)*10)/10));$('#editPlus').onclick=()=>persist(Math.min(150,Math.round((selected()[direction]+1)*10)/10));
 $('#editApply').onclick=()=>{if($('#editValue').value.trim()===''){status('速度を入力してください');return;}persist(Number($('#editValue').value));};$('#editValue').onkeydown=e=>{if(e.key==='Enter')$('#editApply').click();};
 $('#editOriginal').onclick=()=>persist(store.base[state.selectedTrain].points[index][direction]);
 $('#editUndo').onclick=()=>{try{store.undo();refresh();sync();status(`戻しました。端末保存済み　変更 ${store.count()}件`);}catch(e){status('保存できません：'+e.message);}};
 for(const [id,step] of [['editPrev',-1],['editNext',1]])$('#'+id).onclick=()=>{index=Math.max(0,Math.min(profiles[state.selectedTrain].points.length-1,index+step));api.center(selected().km);sync();render();};
 $('#editExport').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(store.export(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='智頭線_速度修整_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);status('バックアップを出力しました');};
 $('#editImport').onclick=()=>$('#editFile').click();$('#editFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>2000000)throw Error('ファイルが大きすぎます');const doc=JSON.parse(await f.text()),n=store.preview(doc);if(!confirm(`${n}件の修整を取り込みます。同じ地点の修整はファイルの値に更新します。よろしいですか？`))return;store.import(doc);refresh();sync();status(`${n}件を取込・端末保存しました`);}catch(err){status('読込できません：'+err.message);}finally{e.target.value='';}};
 return {close:()=>toggle(false),changedTrain:()=>{finishDrag(true);index=null;sync();},draw(){if(!active||state.mode!=='speed')return '';let out='';const points=profiles[state.selectedTrain].points;points.forEach((p,i)=>{const x=px(p);const y=py(i===index&&drag?.moved?drag.value:p[direction]);out+=`<circle pointer-events="none" cx="${x}" cy="${y}" r="${i===index?7:3}" fill="${i===index?'#fff5cd':'white'}" stroke="${direction==='up'?'#b43d38':'#226fa5'}" stroke-width="${i===index?3:1.5}"/>`;});return out;}};
};
