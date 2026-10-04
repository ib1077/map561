/* Standard, user-initiated fullscreen. DATA and storage are not touched. */
(()=>{
 'use strict';
 const button=document.getElementById('fullscreenBtn'),status=document.getElementById('fullscreenStatus');let timer,busy=false;
 const launchFullscreen=matchMedia('(display-mode: fullscreen)');
 const supported=()=>typeof document.documentElement.requestFullscreen==='function'&&document.fullscreenEnabled!==false;
 function say(text){clearTimeout(timer);status.textContent=text;timer=setTimeout(()=>{status.textContent='';},6500);}
 function sync(){const on=!!document.fullscreenElement,launched=!on&&launchFullscreen.matches;button.textContent=on?'全画面解除':launched?'全画面起動':'全画面';button.setAttribute('aria-pressed',String(on||launched));button.setAttribute('aria-label',on?'全画面表示を解除する':launched?'PWA起動時の全画面について':'全画面表示にする');button.title=supported()?'全画面の切替':'この環境では全画面表示を利用できません';}
 function layout(){requestAnimationFrame(()=>requestAnimationFrame(()=>window.dispatchEvent(new Event('resize'))));}
 button.addEventListener('click',async()=>{
   if(busy)return;
   if(!document.fullscreenElement&&launchFullscreen.matches){say('PWA起動時の全画面表示です。この起動方式はアプリの全画面解除の対象外です。通常起動へ戻す場合は通常版を使用してください。');return;}
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
 launchFullscreen.addEventListener?.('change',()=>{sync();layout();});
 sync();
})();
