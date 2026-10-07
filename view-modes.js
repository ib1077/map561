/* Screen-only view choices. One shared distance/zoom controller; no duplicate DATA. */
window.installViewModes=function(api){
 'use strict';
 const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],key='chizu-view-layout-v1';
 let stored;try{stored=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}
 const choice={layout:['single','follow','legacy'].includes(stored?.layout)?stored.layout:'legacy',main:['gradient','plan'].includes(stored?.main)?stored.main:'gradient',aux:['gradient','plan'].includes(stored?.aux)?stored.aux:'plan'};
 const names={gradient:'勾配図',plan:'位置図'},main=()=>api.mode()==='speed'?'gradient':choice.main;
 const isPlanMain=()=>choice.layout!=='legacy'&&main()==='plan';
 const showPlan=()=>choice.layout==='legacy'||isPlanMain();
 function persist(){try{localStorage.setItem(key,JSON.stringify(choice));}catch(_){}}
 function scene(kind,y,h,overview=false){
  const line=kind==='gradient'?`M36 ${y+h*.73} L91 ${y+h*.68} L137 ${y+h*.37} L204 ${y+h*.5} L281 ${y+h*.26}`:`M36 ${y+h*.60}H281`;
  return `<rect x="30" y="${y}" width="261" height="${h}" rx="3" fill="${overview?'#eef4f0':'#fffdf6'}"/><path d="${line}" fill="none" stroke="#37717a" stroke-width="3"/><path d="${line}" fill="none" stroke="#749185" stroke-width="7" stroke-dasharray="0 53 30 190"/><text x="39" y="${y+14}" fill="#173b4c" font-size="11">${overview?'補助・':choice.layout==='follow'?'メイン・':''}${names[kind]}</text>${!overview?`<circle cx="93" cy="${y+h*.45}" r="3" fill="#b23935"/><circle cx="139" cy="${y+h*.26}" r="3" fill="#176e9d"/>`:''}${overview?`<rect x="111" y="${y+2}" width="72" height="${h-4}" rx="2" fill="#d79b3920" stroke="#bb7925" stroke-width="1.6"/>`:''}`;
 }
 function preview(){
  let svg='<rect x="1" y="1" width="298" height="178" rx="9" fill="#dfe8e4"/><rect x="7" y="8" width="18" height="164" rx="3" fill="#173b4c"/>';
  if(choice.layout==='single')svg+=scene(choice.main,8,164);
  else if(choice.layout==='legacy')svg+=scene('gradient',8,99)+scene('plan',112,60);
  else svg+=scene(choice.main,8,113)+scene(choice.aux,126,46,true);
  $('#viewPreview').innerHTML=svg;
  $('#viewPreviewCaption').textContent=choice.layout==='legacy'?'配置見本：上下が同じ縮尺':choice.layout==='single'?`配置見本：${names[choice.main]}を大きく`:`配置見本：${names[choice.main]}＋周辺の${names[choice.aux]}`;
 }
 function sync(){
  document.body.dataset.viewLayout=choice.layout;document.body.dataset.viewMain=main();
  $('#railViewport').inert=isPlanMain();$('#railViewport').setAttribute('aria-hidden',String(isPlanMain()));
  $('#assetStrip').setAttribute('aria-hidden',String(!showPlan()));
  $('#viewOverview').hidden=choice.layout!=='follow';
  $('#swapMainView').hidden=choice.layout==='legacy';$('#swapMainView').disabled=api.mode()==='speed';
  $('#swapMainView').textContent=api.mode()==='speed'?'速度表示中':main()==='gradient'?'位置図へ':'勾配図へ';
  all('[data-view-layout]').filter(e=>e.tagName==='BUTTON').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.viewLayout===choice.layout)));
  for(const kind of ['main','aux'])all(`[data-view-${kind}]`).filter(e=>e.tagName==='BUTTON').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset['view'+kind[0].toUpperCase()+kind.slice(1)]===choice[kind])));
  $('#mainViewChoices').hidden=choice.layout==='legacy';$('#auxViewChoices').hidden=choice.layout!=='follow';
  $('#viewChoiceNote').textContent=choice.layout==='single'?'図を切り替えても同じ場所・同じ縮尺。':choice.layout==='follow'?'操作はメインだけ。補助は周辺を約3倍広く表示（最大は全線）。枠がメイン範囲です。':'これまでの勾配図＋位置図。上下の距離と縮尺が揃います。';
  $('#viewSpeedNote').hidden=api.mode()!=='speed';preview();
 }
 function change(values){Object.assign(choice,values);persist();sync();api.changed();}
 all('button[data-view-layout]').forEach(b=>b.onclick=()=>change({layout:b.dataset.viewLayout}));
 all('button[data-view-main]').forEach(b=>b.onclick=()=>change({main:b.dataset.viewMain}));
 all('button[data-view-aux]').forEach(b=>b.onclick=()=>change({aux:b.dataset.viewAux}));
 $('#chooseView').onclick=()=>{api.openSettings();$('#settings').scrollTop=0;};$('#viewChooseDone').onclick=api.closeSettings;
 $('#swapMainView').onclick=()=>{if(api.mode()!=='speed')change({main:main()==='gradient'?'plan':'gradient'});};
 function renderOverview(){
  if(choice.layout!=='follow')return;
  const surface=$('#viewOverview'),canvas=$('#viewOverviewCanvas'),w=surface.clientWidth,h=surface.clientHeight;if(!w||!h)return;
  const g=api.geometry(),span=Math.min(api.total,Math.max(.15,g.width/g.zoom*3)),mid=(g.left+g.right)/2,start=Math.max(0,Math.min(api.total-span,mid-span/2)),end=start+span;
  const dpr=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#f0f5f1';ctx.fillRect(0,0,w,h);
  const x=km=>8+(km-start)/span*(w-16),visible=api.data.stations.filter(s=>s.km>=start&&s.km<=end);
  let y=()=>h*.63;
  if(choice.aux==='gradient'){
   const value=km=>{const ps=api.data.gradient;for(let i=1;i<ps.length;i++){if(km<=ps[i].km){const a=ps[i-1],b=ps[i];return a.y+(b.y-a.y)*(km-a.km)/(b.km-a.km||1);}}return ps.at(-1).y;};
   const points=[{km:start,y:value(start)},...api.data.gradient.filter(p=>p.km>start&&p.km<end),{km:end,y:value(end)}];
   const min=Math.min(...points.map(p=>p.y)),max=Math.max(...points.map(p=>p.y));y=km=>h-10-(value(km)-min)/(max-min||1)*Math.max(12,h-43);
   ctx.beginPath();points.forEach((p,i)=>{if(i)ctx.lineTo(x(p.km),y(p.km));else ctx.moveTo(x(p.km),y(p.km));});ctx.strokeStyle='#37717a';ctx.lineWidth=2;ctx.stroke();
  }else{ctx.beginPath();ctx.moveTo(8,y());ctx.lineTo(w-8,y());ctx.strokeStyle='#a5b5ad';ctx.lineWidth=3;ctx.stroke();}
  for(const t of api.data.tunnels){if(t.end<start||t.start>end)continue;const a=Math.max(start,t.start),b=Math.min(end,t.end);ctx.beginPath();ctx.moveTo(x(a),y(a));if(choice.aux==='gradient')for(const p of api.data.gradient)if(p.km>a&&p.km<b)ctx.lineTo(x(p.km),y(p.km));ctx.lineTo(x(b),y(b));ctx.strokeStyle='#657e70';ctx.lineWidth=4;ctx.stroke();}
  // Labels use two rows and bounded spacing; the main view retains full information.
  const occupied=[-100,-100];ctx.font='10px sans-serif';
  for(const s of visible){const xx=x(s.km),yy=y(s.km);ctx.fillStyle='#54846c';ctx.fillRect(xx-2,yy-4,4,8);const tw=ctx.measureText(s.name).width,lx=Math.max(4,Math.min(w-tw-4,xx+4));let row=occupied[0]+7<lx?0:occupied[1]+7<lx?1:-1;if(row<0)continue;occupied[row]=lx+tw;ctx.fillStyle='#314f47';ctx.fillText(s.name,lx,29+row*12);}
  const a=Math.max(start,Math.max(0,g.left)),b=Math.min(end,Math.min(api.total,g.right)),xx=x(a),ww=Math.max(1,x(b)-xx);ctx.fillStyle='#d8992820';ctx.fillRect(xx,19,ww,h-21);ctx.strokeStyle='#b47b26';ctx.lineWidth=1.5;ctx.strokeRect(xx,19,ww,h-21);
  $('#overviewCaption').textContent=`周辺の${names[choice.aux]}　${start.toFixed(1)}–${end.toFixed(1)}km ／ 枠＝メイン`;
  surface.setAttribute('aria-label',`周辺の${names[choice.aux]} ${start.toFixed(2)}から${end.toFixed(2)}km。メイン ${a.toFixed(2)}から${b.toFixed(2)}km`);
  surface.dataset.start=String(start);surface.dataset.end=String(end);surface.dataset.mainStart=String(a);surface.dataset.mainEnd=String(b);
 }
 return {start(){sync();},sync,isPlanMain,showPlan,renderOverview};
};
