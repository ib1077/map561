window.createAutoPan=function({target,changed,stopped,request=requestAnimationFrame,cancel=cancelAnimationFrame}){
 let running=false,frame=null,last=null,position=0,direction=1,rate=12;
 const maximum=()=>Math.max(0,target.scrollWidth-target.clientWidth);
 function stop(){if(frame!==null)cancel(frame);frame=null;last=null;if(!running)return;running=false;stopped();}
 function tick(time){if(!running)return;frame=null;if(last!==null){position=Math.max(0,Math.min(maximum(),position+direction*rate*Math.min(100,Math.max(0,time-last))/1000));target.scrollLeft=position;changed();if(direction>0?position>=maximum():position<=0){stop();return;}}last=time;frame=request(tick);}
 return {stop,isRunning:()=>running,start(dir=1,speed=12){stop();direction=dir<0?-1:1;rate=Math.max(1,Math.min(100,Number(speed)||12));position=target.scrollLeft;if(direction>0?position>=maximum():position<=0)return false;running=true;last=null;frame=request(tick);return true;}};
};
window.installAutoScroll=function(api){
 const $=s=>document.querySelector(s),button=$('#autoScrollBtn');
 $('#routeWorkspace').insertAdjacentHTML('beforeend',`<section id="autoScrollPanel" class="auto-scroll-panel hidden" aria-label="オートスクロール"><button id="autoPlay" aria-pressed="false">▶ 開始</button><select id="autoDirection" aria-label="進む方向"><option value="1">下り → 智頭</option><option value="-1">上り → 上郡</option></select><select id="autoRate" aria-label="流れる速さ"><option value="12">ゆっくり</option><option value="24">ふつう</option><option value="48">速め</option></select><button id="autoClose" aria-label="オートスクロールを閉じる">×</button><span id="autoStatus" role="status">図に触れると停止</span></section>`);
 const panel=$('#autoScrollPanel');
 function sync(){const on=motion.isRunning();button.classList.toggle('active',on);button.querySelector('.side-icon').textContent=on?'Ⅱ':'▶';$('#autoPlay').textContent=on?'Ⅱ 停止':'▶ 開始';$('#autoPlay').setAttribute('aria-pressed',String(on));}
 const motion=window.createAutoPan({target:api.target,changed:api.changed,stopped:()=>{sync();api.save();$('#autoStatus').textContent='停止中・開始で再開';}});
 function close(){motion.stop();panel.classList.add('hidden');button.setAttribute('aria-expanded','false');}
 button.onclick=()=>{if(motion.isRunning()){motion.stop();return;}const open=panel.classList.contains('hidden');panel.classList.toggle('hidden',!open);button.setAttribute('aria-expanded',String(open));if(open)api.prepare();};
 $('#autoPlay').onclick=()=>{if(motion.isRunning()){motion.stop();return;}api.prepare();if(!motion.start(Number($('#autoDirection').value),Number($('#autoRate').value)))$('#autoStatus').textContent='この方向の端です。方向変更・拡大で移動できます';else $('#autoStatus').textContent='図に触れると停止';sync();};
 for(const id of ['autoDirection','autoRate'])$('#'+id).onchange=()=>{const resume=motion.isRunning();motion.stop();if(resume)$('#autoPlay').click();};
 $('#autoClose').onclick=close;
 document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&!button.contains(e.target))motion.stop();},true);
 document.addEventListener('wheel',()=>motion.stop(),{capture:true,passive:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close();else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key))motion.stop();},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)motion.stop();});
 window.addEventListener('blur',()=>motion.stop());window.addEventListener('beforeprint',()=>motion.stop());window.addEventListener('pagehide',()=>motion.stop());
 return {close,stop:motion.stop};
};
