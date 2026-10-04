/* User DATA lives in localStorage; this module never removes it. */
(()=>{
  'use strict';
  const button=document.getElementById('pwaUpdate'),status=document.getElementById('pwaStatus');
  const version=document.getElementById('appVersion').textContent.replace(/^Ver\./,'');
  const say=text=>{status.textContent=text;};
  const standalone=!!window.CHIZU_SINGLE_HTML;
  if(standalone||location.protocol==='file:'||!('serviceWorker' in navigator)||!isSecureContext){
    button.disabled=true;say(standalone||location.protocol==='file:'?'単独HTML版：更新は新しいHTMLファイルへの差し替えで行います。':'オフライン保存・更新にはHTTPSで開いてください。');return;
  }
  say("オフライン起動の準備を確認しています…");
  let busy=false,registration;
  function ask(worker,type){return new Promise((resolve,reject)=>{
    const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(Error('worker timeout'));},10000);
    channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();event.data?.ok?resolve(event.data):reject(Error(event.data?.error||'worker error'));};
    worker.postMessage({type},[channel.port2]);
  });}
  function installed(reg){return new Promise((resolve,reject)=>{
    const started=Date.now();
    const tick=()=>{
      if(reg.waiting)return resolve(reg.waiting);
      if(reg.installing?.state==='redundant')return reject(Error('install failed'));
      if(!reg.installing)return resolve(null);
      if(Date.now()-started>45000)return reject(Error('install timeout'));
      setTimeout(tick,100);
    };tick();
  });}
  async function readyLabel(){
    if(busy)return;
    try{const info=await ask(navigator.serviceWorker.controller||registration.active,'STATUS');
      if(!busy)say(info.version===version?'オフライン起動の準備ができています。':'新しい版の準備ができています。「更新して再起動」で切り替えます。');
    }catch(_){if(!busy)say('オフライン保存を確認できません。オンラインで「更新して再起動」を押してください。');}
  }
  const registrationPromise=new Promise(resolve=>window.addEventListener('load',resolve,{once:true})).then(async()=>{
    registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    if(registration.installing){const worker=registration.installing;worker.addEventListener('statechange',()=>{if(worker.state==='redundant'&&!busy)say('オフライン保存に失敗しました。通信を確認して「更新して再起動」を押してください。');});}
    await navigator.serviceWorker.ready;await readyLabel();return registration;
  });
  registrationPromise.catch(()=>{if(!busy)say('オフライン保存に失敗しました。通信を確認して「更新して再起動」を押してください。');});
  button.addEventListener('click',async()=>{
    if(busy)return;busy=true;button.disabled=true;say('更新を確認しています…');
    let switchTimer;
    try{
      // Network-only metadata: never mistake an offline cache for the latest release.
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
      let release;
      try{const response=await fetch('./release.json',{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('release unavailable');release=await response.json();}finally{clearTimeout(timer);}
      if(typeof release.version!=='string'||typeof release.build!=='string')throw Error('invalid release');
      // Do not wait indefinitely for navigator.serviceWorker.ready after a failed first install.
      registration=await navigator.serviceWorker.getRegistration(new URL('./',location.href))||await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      await registration.update();say('新版のファイルを確認しています…');
      const worker=await installed(registration);
      const info=await ask(worker||registration.active,'STATUS');
      if(info.version!==release.version||info.build!==release.build)throw Error('release mismatch');
      if(worker){
        say('準備ができました。更新して再起動します…');
        const changed=new Promise((resolve,reject)=>{
          const handler=()=>{clearTimeout(switchTimer);navigator.serviceWorker.removeEventListener('controllerchange',handler);resolve();};
          navigator.serviceWorker.addEventListener('controllerchange',handler);
          switchTimer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',handler);reject(Error('activation timeout'));},15000);
        });
        await ask(worker,'ACTIVATE');await changed;
      }else if(info.version===version){say('現在のバージョンは最新版です。再起動します…');}
      location.reload();
    }catch(error){clearTimeout(switchTimer);say('更新できませんでした。現在のバージョンを使用します。通信を確認して、もう一度お試しください。');console.warn('PWA update:',error.message);}
    finally{busy=false;button.disabled=false;}
  });
})();
