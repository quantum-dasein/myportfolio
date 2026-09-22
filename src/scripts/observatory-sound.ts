/*
 * Sound of the hall, synthesised in the browser: no extra downloads.
 * It sits under the studio drone (SoundField) and follows the same switch:
 * silent unless the visitor turned sound on, muted in Calm mode, in a hidden
 * tab and while a film plays in the viewer.
 */
export type HallState={speed:number;rooms:number[];focus:number;lamp:number};

export function createHallSound(){
  let ctx:AudioContext|undefined,master:GainNode|undefined;
  let wind:{gain:GainNode;filter:BiquadFilterNode}|undefined;
  const layers:GainNode[]=[];
  let filmOpen=false,lastLamp=0,lastPing=0;
  const html=document.documentElement;
  const wanted=()=>html.classList.contains('rb-sound')&&!html.classList.contains('rb-calm')&&!document.hidden&&!filmOpen;

  function noise(context:AudioContext){
    const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);const data=buffer.getChannelData(0);
    let brown=0;for(let i=0;i<data.length;i++){const white=Math.random()*2-1;brown=(brown+.02*white)/1.02;data[i]=white*.55+brown*2.2;}
    const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.start();return source;
  }
  function build(){
    const Ctor=window.AudioContext||(window as any).webkitAudioContext;if(!Ctor)return;
    ctx=new Ctor();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
    // Movement: air rushing past, brighter the faster you go.
    const air=noise(ctx),filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=380;filter.Q.value=.8;
    const gain=ctx.createGain();gain.gain.value=0;air.connect(filter).connect(gain).connect(master);wind={gain,filter};
    // 0 Atmospheres: a warm low breath of the room.
    const warm=ctx.createGain();warm.gain.value=0;const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=220;noise(ctx).connect(low).connect(warm).connect(master);
    // 1 Objects: two slow metallic partials, like a struck plinth ringing out.
    const metal=ctx.createGain();metal.gain.value=0;const ring=ctx.createGain();ring.gain.value=.65;
    for(const [freq,level] of [[196,.5],[293.7*1.004,.28],[587.3,.08]] as const){const osc=ctx.createOscillator();osc.frequency.value=freq;const g=ctx.createGain();g.gain.value=level;osc.connect(g).connect(ring);osc.start();}
    const beat=ctx.createOscillator();beat.frequency.value=.23;const depth=ctx.createGain();depth.gain.value=.35;beat.connect(depth).connect(ring.gain);beat.start();
    ring.connect(metal).connect(master);
    // 2 Cinema: the purr of a projector, a filtered rattle at twenty-four frames.
    const projector=ctx.createGain();projector.gain.value=0;const shutter=ctx.createGain();shutter.gain.value=.5;
    const band=ctx.createBiquadFilter();band.type='bandpass';band.frequency.value=900;band.Q.value=1.4;
    noise(ctx).connect(band).connect(shutter).connect(projector);
    const frames=ctx.createOscillator();frames.type='square';frames.frequency.value=24;const frameDepth=ctx.createGain();frameDepth.gain.value=.45;frames.connect(frameDepth).connect(shutter.gain);frames.start();
    projector.connect(master);
    // 3 Digital: a thin shimmering carrier.
    const digital=ctx.createGain();digital.gain.value=0;const shimmer=ctx.createGain();shimmer.gain.value=.7;
    for(const [freq,level] of [[1318.5,.22],[1975.5,.12],[2637,.05]] as const){const osc=ctx.createOscillator();osc.type='sine';osc.frequency.value=freq;const g=ctx.createGain();g.gain.value=level;osc.connect(g).connect(shimmer);osc.start();}
    const trem=ctx.createOscillator();trem.frequency.value=6.5;const tremDepth=ctx.createGain();tremDepth.gain.value=.3;trem.connect(tremDepth).connect(shimmer.gain);trem.start();
    shimmer.connect(digital).connect(master);
    layers.push(warm,metal,projector,digital);
  }
  const levels=[.09,.018,.05,.012];

  function ensure(){
    if(!wanted())return false;
    if(!ctx)build();
    if(ctx&&ctx.state==='suspended')void ctx.resume().catch(()=>{});
    return Boolean(ctx&&ctx.state==='running');
  }
  function set(param:AudioParam,value:number,time=.12){if(ctx)param.setTargetAtTime(value,ctx.currentTime,time);}
  function master_(on:boolean){if(master&&ctx)set(master.gain,on?1:0,on?.6:.15);}
  // Chrome only lets audio start after a gesture; the drone uses the same rule.
  ['pointerdown','keydown','touchstart'].forEach(type=>addEventListener(type,()=>{if(wanted()){ensure();master_(true);}},{passive:true}));
  new MutationObserver(()=>{if(wanted())ensure();master_(wanted());}).observe(html,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>master_(wanted()));
  addEventListener('rb:exhibition-film',event=>{filmOpen=Boolean((event as CustomEvent).detail);master_(wanted());});

  function ping(room:number){
    if(!ctx||!master||ctx.state!=='running'||!wanted())return;
    const now=ctx.currentTime;if(now-lastPing<.25)return;lastPing=now;
    const base=[392,440,329.6,523.3][room]??392;
    for(const [ratio,level,decay] of [[1,.05,1.6],[2.01,.018,.9],[3.02,.007,.5]] as const){
      const osc=ctx.createOscillator();osc.frequency.value=base*ratio;const g=ctx.createGain();
      g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(level,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+decay);
      osc.connect(g).connect(master);osc.start(now);osc.stop(now+decay+.05);osc.onended=()=>osc.disconnect();
    }
  }
  function burst(duration:number,from:number,to:number,level:number){
    if(!ctx||!master||ctx.state!=='running'||!wanted())return;
    const now=ctx.currentTime;const source=noise(ctx);const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.Q.value=1.1;
    filter.frequency.setValueAtTime(from,now);filter.frequency.exponentialRampToValueAtTime(to,now+duration);
    const g=ctx.createGain();g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(level,now+duration*.45);g.gain.linearRampToValueAtTime(0,now+duration);
    source.connect(filter).connect(g).connect(master);source.stop(now+duration+.05);source.onended=()=>source.disconnect();
  }

  return {
    frame(state:HallState){
      if(!ctx||!wind||ctx.state!=='running')return;
      const speed=Math.min(1,state.speed);
      set(wind.gain.gain,speed*speed*.16*(1-state.focus),.08);
      set(wind.filter.frequency,300+speed*1500,.1);
      layers.forEach((layer,i)=>set(layer.gain,(state.rooms[i]??0)*levels[i]*(1-state.focus*.8)*state.lamp,.5));
      // The lamp clicks every time it catches during the opening.
      if(state.lamp>.5!==lastLamp>.5&&state.lamp<1)burst(.04,3200,2400,.12);
      lastLamp=state.lamp;
    },
    arrive:ping,
    open(){burst(.9,260,2600,.12);},
    close(){burst(.7,2400,300,.09);},
    dispose(){void ctx?.close();},
  };
}
