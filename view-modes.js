/* Screen-only view choices. One shared distance/zoom controller; no duplicate DATA. */
window.installViewModes=function(api){
 'use strict';
 const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],key='chizu-view-layout-v1';
 const choice={layout:'follow',main:'gradient',aux:'gradient'};
 const names={gradient:'勾配図',plan:'位置図'},main=()=>choice.main;
 const isPlanMain=()=>(choice.layout==='follow'&&main()==='plan');
 const showPlan=()=>choice.layout==='legacy'||isPlanMain();
 function sync(){
  document.body.dataset.viewLayout=choice.layout;document.body.dataset.viewMain=main();
  const hiddenGradient=choice.layout==='follow'&&main()==='plan';
  $('#railViewport').inert=hiddenGradient;$('#railViewport').setAttribute('aria-hidden',String(hiddenGradient));
  $('#assetStrip').setAttribute('aria-hidden',String(!showPlan()));$('#viewOverview').hidden=choice.layout!=='follow';
  const speed=$('.side-controls [data-mode="speed"]'),on=api.mode()==='speed';speed.disabled=hiddenGradient;speed.textContent='速度 '+(on?'ON':'OFF');speed.setAttribute('aria-pressed',String(on));speed.title=hiddenGradient?'速度は勾配図で表示します':'速度表示の切替';
 }
 function selectEntry(entry){
  const entries={gradient:{layout:'follow',main:'gradient',aux:'gradient'},plan:{layout:'follow',main:'plan',aux:'plan'},'gradient-plan':{layout:'legacy',main:'gradient',aux:'plan'}};
  Object.assign(choice,entries[entry]||entries.gradient);sync();
 }
 const nav=$('#viewOverview');let tap=null,frame=0;
 nav.setAttribute('role','button');nav.tabIndex=0;nav.title='オレンジ枠を左右へドラッグして移動';
 const clamp=km=>Math.max(0,Math.min(api.total,km));
 function flush(commit=false){if(frame){cancelAnimationFrame(frame);frame=0;}if(tap?.dragged&&Number.isFinite(tap.target))api.navigate(tap.target,commit);}
 // Only the orange viewport frame is draggable; the overview itself never pans or zooms.
 nav.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  if(tap){finishDrag();return;}
  const p=api.pointer(e,nav),g=api.geometry(),start=Number(nav.dataset.start),end=Number(nav.dataset.end),width=nav.clientWidth;
  const x1=8+(Math.max(0,g.left)-start)/(end-start)*(width-16),x2=8+(Math.min(api.total,g.right)-start)/(end-start)*(width-16);
  if(p.x<x1-12||p.x>x2+12)return;
  e.preventDefault();
  tap={id:e.pointerId,x:p.x,y:p.y,start,end,width,center:(g.left+g.right)/2,onFrame:true};
  nav.classList.add('dragging');nav.setPointerCapture?.(e.pointerId);
 });
 nav.addEventListener('pointermove',e=>{
  if(!tap||e.pointerId!==tap.id)return;
  e.preventDefault();const p=api.pointer(e,nav),dx=p.x-tap.x;
  if(tap.dragged||Math.abs(dx)>3){tap.dragged=true;tap.target=clamp(tap.center+dx/Math.max(1,tap.width-16)*(tap.end-tap.start));if(!frame)frame=requestAnimationFrame(()=>{frame=0;flush(false);});}
 });
 function finishDrag(e){
  if(!tap||(e&&e.pointerId!==tap.id))return;
  if(e?.type==='pointerup'&&tap.dragged){const p=api.pointer(e,nav);tap.target=clamp(tap.center+(p.x-tap.x)/Math.max(1,tap.width-16)*(tap.end-tap.start));}
  const id=tap.id;flush(true);tap=null;nav.classList.remove('dragging');
  if(nav.hasPointerCapture?.(id))nav.releasePointerCapture(id);
  renderOverview();
 }
 for(const name of ['pointerup','pointercancel','lostpointercapture'])nav.addEventListener(name,finishDrag);
 nav.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const g=api.geometry();api.navigate((g.left+g.right)/2+(e.key==='ArrowLeft'?-1:1)*(g.right-g.left));});
 function renderOverview(){
  if(choice.layout!=='follow')return;
  const surface=$('#viewOverview'),canvas=$('#viewOverviewCanvas'),w=surface.clientWidth,h=surface.clientHeight;if(!w||!h)return;
  const g=api.geometry(),span=Math.min(api.total,Math.max(.15,g.width/g.zoom*5)),mid=(g.left+g.right)/2,start=tap?.onFrame?tap.start:Math.max(0,Math.min(api.total-span,mid-span/2)),end=tap?.onFrame?tap.end:start+span;
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
  $('#overviewCaption').textContent=`周辺の${names[choice.aux]}　${start.toFixed(1)}–${end.toFixed(1)}km ／ オレンジ枠を左右へドラッグ`;
  surface.setAttribute('aria-label',`周辺の${names[choice.aux]} ${start.toFixed(2)}から${end.toFixed(2)}km。メイン ${a.toFixed(2)}から${b.toFixed(2)}km`);
  surface.dataset.start=String(start);surface.dataset.end=String(end);surface.dataset.mainStart=String(a);surface.dataset.mainEnd=String(b);
 }
 return {start(){sync();},sync,selectEntry,isPlanMain,showPlan,renderOverview};
};
