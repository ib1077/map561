/* Shared momentum for both route panels. All distances are logical screen pixels. */
window.createRouteMotion = function({target, changed, settled, now=()=>performance.now(), request=requestAnimationFrame, cancel=cancelAnimationFrame}) {
  let frame=0, speed=0, last=0, carry=0, samples=[], started=0, blocked=false;
  function stop(){if(frame)cancel(frame);frame=0;speed=0;}
  function reset(){stop();carry=0;samples=[];blocked=true;}
  function begin(x,y){const prior=speed;stop();carry=prior;started=now();samples=[{x,y,t:started}];blocked=false;return Math.abs(prior)>.01;}
  function move(x,y){const t=now();samples.push({x,y,t});while(samples.length>2&&samples[0].t<t-65)samples.shift();}
  function tick(t){const dt=Math.min(40,Math.max(0,t-last));last=t;const before=target.scrollLeft,max=Math.max(0,target.scrollWidth-target.clientWidth);target.scrollLeft=Math.max(0,Math.min(max,before+speed*dt));changed();speed*=Math.exp(-dt/850);if(target.scrollLeft===before||Math.abs(speed)<.08){stop();settled();return;}frame=request(tick);}
  function end(ok=true){if(!ok||blocked||samples.length<2){reset();return;}const t=now(),a=samples[0],b=samples.at(-1),dt=b.t-a.t,dx=a.x-b.x,dy=a.y-b.y;
    if(t-b.t>80||dt<4||Math.abs(dx)<4||Math.abs(dx)<Math.abs(dy)*1.2){reset();return;}
    const velocity=dx/dt;if(Math.abs(velocity)<.32){reset();return;}
    const bonus=t-started<330&&Math.sign(carry)===Math.sign(velocity)?carry*.85:0;
    speed=Math.max(-18,Math.min(18,velocity*4+bonus));carry=0;last=t;frame=request(tick);
  }
  return {begin,move,end,reset,stop};
};
