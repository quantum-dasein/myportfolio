/*
 * Sound of the hall, synthesised in the browser: no extra downloads.
 * It sits under the studio drone (SoundField) and follows the same switch:
 * silent unless the visitor turned sound on, muted in Calm mode, in a hidden
 * tab and while a film plays in the viewer.
 *
 * Everything is soft and tonal: slow pads through a low-pass filter, a breath
 * of air when the hall moves and a small glass chime when it settles. No raw
 * noise beds and no fast modulation, which read as hiss and engine rattle.
 */
export type HallState={speed:number;rooms:number[];focus:number;lamp:number};

// One chord per room, all in A so crossing rooms never clashes.
const CHORDS=[
  [110,164.81,220,277.18],   // Atmospheres: A major, warm and low
  [146.83,220,293.66,329.63],// Objects: D add9, open and still
  [110,130.81,164.81,196],   // Moving images: A minor 7, a cinema dusk
  [220,329.63,440,493.88],   // Digital worlds: high, airy fifths
];
const LEVEL=.55;

export function createHallSound(){
  let ctx:AudioContext|undefined,master:GainNode|undefined,air:{gain:GainNode;filter:BiquadFilterNode}|undefined;
  const pads:GainNode[]=[];
  let filmOpen=false,lastLamp=0,lastPing=0,lastRooms='';
  const html=document.documentElement;
  const wanted=()=>html.classList.contains('rb-sound')&&!html.classList.contains('rb-calm')&&!document.hidden&&!filmOpen;

  function build(){
    const Ctor=window.AudioContext||(window as any).webkitAudioContext;if(!Ctor)return;
    ctx=new Ctor({latencyHint:'playback'});
    master=ctx.createGain();master.gain.value=0;
    const soften=ctx.createBiquadFilter();soften.type='lowpass';soften.frequency.value=2400;
    const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-20;limiter.ratio.value=6;
    master.connect(soften).connect(limiter).connect(ctx.destination);
    // Air: filtered pink-ish noise, only audible while the hall moves.
    const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const data=buffer.getChannelData(0);
    let b0=0,b1=0,b2=0;for(let i=0;i<data.length;i++){const w=Math.random()*2-1;b0=.99765*b0+w*.099;b1=.963*b1+w*.2965;b2=.57*b2+w*1.0526;data[i]=(b0+b1+b2+w*.1848)*.12;}
    const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;noise.start();
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=300;filter.Q.value=.3;
    const gain=ctx.createGain();gain.gain.value=0;noise.connect(filter).connect(gain).connect(master);air={gain,filter};
    // Pads: detuned triangle pairs, a slow breathing filter per room.
    CHORDS.forEach((chord,room)=>{
      const pad=ctx!.createGain();pad.gain.value=0;
      const tone=ctx!.createBiquadFilter();tone.type='lowpass';tone.frequency.value=room===3?1600:700;tone.Q.value=.4;
      const sway=ctx!.createOscillator();sway.frequency.value=.05+room*.013;const swayDepth=ctx!.createGain();swayDepth.gain.value=room===3?500:220;
      sway.connect(swayDepth).connect(tone.frequency);sway.start();
      chord.forEach((freq,n)=>{for(const detune of [-6,6]){
        const osc=ctx!.createOscillator();osc.type=n===0?'sine':'triangle';osc.frequency.value=freq;osc.detune.value=detune;
        const g=ctx!.createGain();g.gain.value=(n===0?.5:.26)/chord.length;osc.connect(g).connect(tone);osc.start();
      }});
      tone.connect(pad).connect(master!);pads.push(pad);
    });
  }

  function ensure(){
    if(!wanted())return false;
    if(!ctx)build();
    if(ctx&&ctx.state==='suspended')void ctx.resume().catch(()=>{});
    return Boolean(ctx&&ctx.state==='running');
  }
  const ramp=(param:AudioParam,value:number,time:number)=>{if(ctx)param.setTargetAtTime(value,ctx.currentTime,time);};
  const setMaster=(on:boolean)=>{if(master)ramp(master.gain,on?LEVEL:0,on?.8:.2);};
  // Chrome only lets audio start after a gesture; the drone uses the same rule.
  ['pointerdown','keydown','touchstart'].forEach(type=>addEventListener(type,()=>{if(wanted()){ensure();setMaster(true);}},{passive:true}));
  new MutationObserver(()=>{if(wanted())ensure();setMaster(wanted());}).observe(html,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>setMaster(wanted()));
  addEventListener('rb:exhibition-film',event=>{filmOpen=Boolean((event as CustomEvent).detail);setMaster(wanted());});

  const live=()=>Boolean(ctx&&master&&ctx.state==='running'&&wanted());
  function chime(freq:number,level:number,delay=0){
    if(!live())return;
    const now=ctx!.currentTime+delay;
    for(const [ratio,share,decay] of [[1,1,2.4],[2,.28,1.4],[3.01,.08,.8]] as const){
      const osc=ctx!.createOscillator();osc.type='sine';osc.frequency.value=freq*ratio;const g=ctx!.createGain();
      g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(level*share,now+.02);g.gain.exponentialRampToValueAtTime(.0001,now+decay);
      osc.connect(g).connect(master!);osc.start(now);osc.stop(now+decay+.05);osc.onended=()=>osc.disconnect();
    }
  }
  function swell(from:number,to:number,duration:number,level:number){
    if(!live()||!air)return;
    const now=ctx!.currentTime;
    air.filter.frequency.cancelScheduledValues(now);air.filter.frequency.setValueAtTime(from,now);air.filter.frequency.exponentialRampToValueAtTime(to,now+duration);
    air.gain.gain.cancelScheduledValues(now);air.gain.gain.setValueAtTime(air.gain.gain.value,now);
    air.gain.gain.linearRampToValueAtTime(level,now+duration*.5);air.gain.gain.linearRampToValueAtTime(0,now+duration);
  }
  let swellUntil=0;let breathTimer:ReturnType<typeof setInterval>|undefined;

  return {
    frame(state:HallState){
      if(!ctx||!air||ctx.state!=='running')return;
      // Parameter updates are cheap, but only send them when something changed.
      const speed=Math.min(1,state.speed);
      if(ctx.currentTime>swellUntil){ramp(air.gain.gain,speed*speed*.5*(1-state.focus),.25);ramp(air.filter.frequency,260+speed*700,.3);}
      const key=state.rooms.map(v=>v.toFixed(2)).join()+state.focus.toFixed(2)+state.lamp.toFixed(1);
      if(key!==lastRooms){lastRooms=key;pads.forEach((pad,i)=>ramp(pad.gain,(state.rooms[i]??0)*.22*(1-state.focus*.7)*state.lamp,1.2));}
      // The lamp catches with a tiny glassy tick during the opening.
      if(state.lamp>.5&&lastLamp<=.5&&state.lamp<1)chime(1318.5,.025);
      lastLamp=state.lamp;
    },
    arrive(room:number){
      if(!ctx)return;const now=ctx.currentTime;if(now-lastPing<.4)return;lastPing=now;
      chime([880,587.33,659.25,987.77][room]??880,.045);
    },
    // Teleport: a quick glassy arpeggio, falling as he leaves and rising as he lands.
    teleport(phase:'out'|'in'){
      const notes=[1760,1318.5,1108.7,880];(phase==='out'?notes:[...notes].reverse()).forEach((freq,i)=>chime(freq,.022,.3+i*.07));
      swell(phase==='out'?1800:300,phase==='out'?300:1800,.8,.12);swellUntil=(ctx?.currentTime??0)+.8;
    },
    // A low-gravity landing: a soft, deep touch on the floor.
    land(){
      if(!live())return;const now=ctx!.currentTime;
      const osc=ctx!.createOscillator();osc.type='sine';osc.frequency.setValueAtTime(95,now);osc.frequency.exponentialRampToValueAtTime(48,now+.35);
      const g=ctx!.createGain();g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.18,now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+.45);
      osc.connect(g).connect(master!);osc.start(now);osc.stop(now+.5);osc.onended=()=>osc.disconnect();
    },
    // Inside the helmet: slow breathing, in and out.
    firstPerson(on:boolean){
      clearInterval(breathTimer);breathTimer=undefined;
      if(!on)return;
      const breathe=()=>{if(!live()||!air)return;const now=ctx!.currentTime;
        air.filter.frequency.cancelScheduledValues(now);air.filter.frequency.setValueAtTime(260,now);air.filter.frequency.linearRampToValueAtTime(820,now+1.3);air.filter.frequency.linearRampToValueAtTime(300,now+3.2);
        air.gain.gain.cancelScheduledValues(now);air.gain.gain.setValueAtTime(air.gain.gain.value,now);
        air.gain.gain.linearRampToValueAtTime(.16,now+1.2);air.gain.gain.linearRampToValueAtTime(.03,now+1.8);air.gain.gain.linearRampToValueAtTime(.12,now+2.6);air.gain.gain.linearRampToValueAtTime(0,now+3.4);
        swellUntil=now+3.4;};
      breathe();breathTimer=setInterval(breathe,4600);
    },    // Through a gate: a soft rising air and two quiet notes.
    gate(){swell(260,1500,1.4,.18);swellUntil=(ctx?.currentTime??0)+1.4;chime(659.25,.02,.15);chime(987.77,.016,.32);},
    // Caught comet: a bright rising sparkle.
    comet(){[1318.5,1661.2,1975.5,2637].forEach((freq,i)=>chime(freq,.03,i*.06));},
    open(){swell(200,1400,1.1,.35);swellUntil=(ctx?.currentTime??0)+1.1;},
    close(){swell(1200,220,.9,.25);swellUntil=(ctx?.currentTime??0)+.9;},
    dispose(){clearInterval(breathTimer);void ctx?.close();},
  };
}
