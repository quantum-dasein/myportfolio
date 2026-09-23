import * as THREE from 'three';

/*
 * The hall keeps Vienna time. Night is deep and starry; dawn brings a warm glow to
 * the horizon behind the works; the day is clearer and cooler; dusk turns violet.
 * Nothing flips at a boundary: the keyframes blend minute by minute.
 */
type Key={h:number;horizon:string;glow:number;fog:string;fogMix:number;stars:number;label:[string,string]};
const KEYS:Key[]=[
  {h:0,   horizon:'#16215a',glow:.22,fog:'#03050c',fogMix:.45,stars:1.25,label:['Night','Nacht']},
  {h:4.5, horizon:'#1c1f52',glow:.22,fog:'#04050d',fogMix:.45,stars:1.2, label:['Night','Nacht']},
  {h:6,   horizon:'#5a2f63',glow:.45,fog:'#0d0710',fogMix:.4, stars:.8,  label:['Dawn','Morgengrauen']},
  {h:7.3, horizon:'#ff9a6a',glow:.6, fog:'#170c0b',fogMix:.38,stars:.45, label:['Sunrise','Sonnenaufgang']},
  {h:10,  horizon:'#8fbde6',glow:.34,fog:'#0a1018',fogMix:.3, stars:.28, label:['Day','Tag']},
  {h:16,  horizon:'#b9c9d8',glow:.3, fog:'#0c0f14',fogMix:.25,stars:.3,  label:['Day','Tag']},
  {h:18.5,horizon:'#ffb070',glow:.5, fog:'#150d09',fogMix:.35,stars:.45, label:['Golden hour','Goldene Stunde']},
  {h:20,  horizon:'#e35a78',glow:.58,fog:'#12070d',fogMix:.38,stars:.7,  label:['Dusk','Abenddämmerung']},
  {h:21.5,horizon:'#2d3d96',glow:.42,fog:'#05071a',fogMix:.42,stars:1.05,label:['Blue hour','Blaue Stunde']},
  {h:24,  horizon:'#16215a',glow:.22,fog:'#03050c',fogMix:.45,stars:1.25,label:['Night','Nacht']},
];

/** Current hour in Vienna as a fraction, e.g. 7.5 for 07:30. `?hour=7` overrides it for testing. */
export function viennaHour(){
  const forced=Number(new URLSearchParams(location.search).get('hour'));
  if(location.search.includes('hour=')&&Number.isFinite(forced))return ((forced%24)+24)%24;
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Vienna',hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(new Date());
  const get=(type:string)=>Number(parts.find(part=>part.type===type)?.value??0);
  return get('hour')+get('minute')/60;
}
export function viennaClock(){
  const hour=viennaHour(),h=Math.floor(hour),m=Math.floor((hour-h)*60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export function daylightAt(hour:number){
  let i=0;while(i<KEYS.length-2&&KEYS[i+1].h<=hour)i++;
  const a=KEYS[i],b=KEYS[i+1],t=THREE.MathUtils.clamp((hour-a.h)/(b.h-a.h),0,1),s=t*t*(3-2*t);
  return {
    horizon:new THREE.Color(a.horizon).lerp(new THREE.Color(b.horizon),s),
    glow:THREE.MathUtils.lerp(a.glow,b.glow,s),
    fog:new THREE.Color(a.fog).lerp(new THREE.Color(b.fog),s),
    fogMix:THREE.MathUtils.lerp(a.fogMix,b.fogMix,s),
    stars:THREE.MathUtils.lerp(a.stars,b.stars,s),
    label:s<.5?a.label:b.label,
  };
}
export type Daylight=ReturnType<typeof daylightAt>;

/** A wide glow along the horizon, far behind the hall; the wet floor reflects it. */
export function createHorizon(){
  const material=new THREE.ShaderMaterial({
    uniforms:{uColor:{value:new THREE.Color()},uGlow:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 uColor;uniform float uGlow;varying vec2 vUv;
      void main(){float y=vUv.y,band=exp(-((y-.16)*6.)*((y-.16)*6.))+.35*exp(-y*3.5);
        float sides=smoothstep(0.,.25,vUv.x)*smoothstep(1.,.75,vUv.x);
        gl_FragColor=vec4(uColor*band*sides*uGlow,1.);}`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(640,150),material);
  mesh.position.set(0,40,-175);mesh.renderOrder=-5;mesh.frustumCulled=false;
  return mesh;
}
