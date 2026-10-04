window.createAutoPan=function({target,changed,stopped,request=requestAnimationFrame,cancel=cancelAnimationFrame}){
 let running=false,frame=null,last=null,position=0,direction=1,rate=12;
 const maximum=()=>Math.max(0,target.scrollWidth-target.clientWidth);
 function stop(){if(frame!==null)cancel(frame);frame=null;last=null;if(!running)return;running=false;stopped();}
 function tick(time){if(!running)return;frame=null;if(last!==null){position=Math.max(0,Math.min(maximum(),position+direction*rate*Math.min(100,Math.max(0,time-last))/1000));target.scrollLeft=position;changed();if(direction>0?position>=maximum():position<=0){stop();return;}}last=time;frame=request(tick);}
 return {stop,isRunning:()=>running,start(dir=1,speed=12){stop();direction=dir<0?-1:1;rate=Math.max(1,Math.min(100,Number(speed)||12));position=target.scrollLeft;if(direction>0?position>=maximum():position<=0)return false;running=true;last=null;frame=request(tick);return true;}};
};
window.installAutoScroll=function(api){
 const $=s=>document.querySelector(s),button=$('#autoScrollBtn');let direction=1,rate=24;
 $('#routeWorkspace').insertAdjacentHTML('beforeend',`<section id="autoScrollPanel" class="auto-scroll-panel hidden" aria-label="オートスクロール"><button data-pan-dir="-1" data-pan-rate="48" aria-label="上郡方向へ速く">◀◀</button><button data-pan-dir="-1" data-pan-rate="24" aria-label="上郡方向へ通常速度">◀</button><button data-pan-dir="1" data-pan-rate="24" aria-label="智頭方向へ通常速度">▶</button><button data-pan-dir="1" data-pan-rate="48" aria-label="智頭方向へ速く">▶▶</button><button id="autoStop" aria-label="スクロール停止">Ⅱ 停止</button><button id="autoClose" aria-label="パネルだけ閉じる（再生継続）">☒</button><span id="autoStatus" role="status" class="visually-hidden"></span></section>`);
 const panel=$('#autoScrollPanel');
 function sync(){const on=motion.isRunning();button.classList.toggle('active',on);button.querySelector('.side-icon').textContent=on?'Ⅱ':'▶';button.lastElementChild.textContent=on?'停止':'再生';button.setAttribute('aria-label',on?(panel.classList.contains('hidden')?'再生操作を開く':'オートスクロールを停止'):'オートスクロールを再生');panel.querySelectorAll('[data-pan-dir]').forEach(b=>b.setAttribute('aria-pressed',String(on&&Number(b.dataset.panDir)===direction&&Number(b.dataset.panRate)===rate)));}
 const motion=window.createAutoPan({target:api.target,changed:api.changed,stopped:()=>{sync();api.save();$('#autoStatus').textContent='停止中';}});
 function hide(){panel.classList.add('hidden');button.setAttribute('aria-expanded','false');sync();}
 function close(){motion.stop();hide();}
 function show(){panel.classList.remove('hidden');button.setAttribute('aria-expanded','true');sync();}
 function play(dir,speed){direction=dir;rate=speed;api.prepare();const started=motion.start(direction,rate);$('#autoStatus').textContent=started?'再生中。図に触れると停止':'この方向の端です';sync();}
 button.onclick=()=>{if(motion.isRunning()){if(panel.classList.contains('hidden'))show();else motion.stop();return;}show();play(direction,rate);};
 panel.querySelectorAll('[data-pan-dir]').forEach(b=>b.onclick=()=>play(Number(b.dataset.panDir),Number(b.dataset.panRate)));
 $('#autoStop').onclick=()=>motion.stop();$('#autoClose').onclick=hide;
 document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&!button.contains(e.target))motion.stop();},true);
 document.addEventListener('wheel',()=>motion.stop(),{capture:true,passive:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)&&!panel.contains(e.target))motion.stop();},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)motion.stop();});
 window.addEventListener('blur',()=>motion.stop());window.addEventListener('beforeprint',()=>motion.stop());window.addEventListener('pagehide',()=>motion.stop());
 return {close,stop:motion.stop};
};
