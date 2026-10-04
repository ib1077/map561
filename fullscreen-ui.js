/* Standard, user-initiated fullscreen. DATA and storage are not touched. */
(()=>{
 'use strict';
 const button=document.getElementById('fullscreenBtn'),status=document.getElementById('fullscreenStatus');let timer,busy=false;
 const supported=()=>typeof document.documentElement.requestFullscreen==='function'&&document.fullscreenEnabled!==false;
 function say(text){clearTimeout(timer);status.textContent=text;timer=setTimeout(()=>{status.textContent='';},6500);}
 function sync(){const on=!!document.fullscreenElement;button.textContent=on?'全画面解除':'全画面';button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',on?'全画面表示を解除する':'全画面表示にする');button.title=supported()?'全画面の切替':'この環境では全画面表示を利用できません';}
 function layout(){requestAnimationFrame(()=>requestAnimationFrame(()=>window.dispatchEvent(new Event('resize'))));}
 button.addEventListener('click',async()=>{
   if(busy)return;
   if(!document.fullscreenElement&&!supported()){say('この環境では全画面表示を利用できません。通常表示で使用できます。');return;}
   busy=true;
   try{
     if(document.fullscreenElement)await document.exitFullscreen();
     else await document.documentElement.requestFullscreen({navigationUI:'hide'});
     status.textContent='';
   }catch(_){say(document.fullscreenElement?'全画面を解除できませんでした。端末の戻る操作またはEscでも解除できます。':'全画面にできませんでした。通常表示で使用できます。');}
   finally{busy=false;sync();layout();}
 });
 document.addEventListener('fullscreenchange',()=>{sync();layout();});
 document.getElementById('homeBtn').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});});
 sync();
})();
