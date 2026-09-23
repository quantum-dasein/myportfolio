import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createCurator } from './observatory-curator';
import { archiveWorks } from '../data/observatory';
import type { HallState } from './observatory-sound';

/*
 * The Observatory, second edition: a black hall of light.
 * Works float above a wet mirror floor, lit from behind by volumetric shafts.
 * Every image keeps its full frame and true colour; motion only bends and splits
 * the light while the camera travels, then settles back to a clean print.
 */

const GAP=10;
const LIFT=.95;
const MAX_W=7.2,MAX_H=4.2,MAX_V=5.1;
const NOISE=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}`;

type Shader=THREE.ShaderMaterial;
type Bay={
  group:THREE.Group;
  screen:THREE.Mesh<THREE.PlaneGeometry,Shader>;
  halo:THREE.Mesh<THREE.PlaneGeometry,Shader>;
  beam:THREE.Mesh<THREE.ConeGeometry,Shader>;
  pool:THREE.Mesh<THREE.PlaneGeometry,Shader>;
  texture?:THREE.Texture;loading?:Promise<void>;
  projector?:THREE.Mesh<THREE.BufferGeometry,Shader>;
  tint:THREE.Color;reveal:number;active:number;hover:number;room:number;lum:number;
};

// Each room has its own weather. Values blend continuously as the camera travels.
const ROOMS=[
  {fog:'#0a0806',density:.022,beam:1,dust:1,grid:0,holo:0,bloom:.62,projector:0},
  {fog:'#05080c',density:.018,beam:1.45,dust:.45,grid:0,holo:0,bloom:.55,projector:0},
  {fog:'#0b0607',density:.019,beam:.45,dust:1.2,grid:0,holo:0,bloom:.62,projector:1},
  {fog:'#03090b',density:.016,beam:.3,dust:.35,grid:1,holo:1,bloom:.78,projector:0},
];
type Atmosphere=Omit<typeof ROOMS[number],'fog'>&{fog:THREE.Color};

const screenVertex=`uniform float uBend;uniform float uHover;varying vec2 vUv;
void main(){vUv=uv;vec3 p=position;
  p.z-=p.x*p.x*uBend*3.;
  p.z+=sin(uv.x*3.14159)*sin(uv.y*3.14159)*uHover*.08;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const screenFragment=`uniform sampler2D uMap;uniform float uTime,uShift,uReveal,uDim,uHover,uLight,uHolo;uniform vec3 uTint,uGlare;varying vec2 vUv;
${NOISE}
void main(){
  vec2 uv=(vUv-.5)*(1.-.025*uHover)+.5;
  float glitch=step(.986,hash(vec2(floor(vUv.y*38.),floor(uTime*9.))))*uHolo;
  uv.x+=glitch*.012;
  vec2 off=vec2(uShift*.011+uHolo*.0022,0.);
  vec3 col=vec3(texture2D(uMap,uv+off).r,texture2D(uMap,uv).g,texture2D(uMap,uv-off).b);
  float grey=dot(col,vec3(.2126,.7152,.0722));
  col=mix(col,vec3(grey),uDim*.65)*(1.-uDim*.66)*uLight;
  float scan=.5+.5*sin(vUv.y*680.-uTime*5.);
  col*=1.-uHolo*(.16*scan+.04*step(.965,hash(vec2(floor(uTime*14.),3.))));
  col*=.9;
  col+=uHolo*uTint*(.035+glitch*.25);
  vec2 g=(vUv-uGlare.xy)*vec2(1.,.8);col+=vec3(1.,.95,.88)*(exp(-dot(g,g)*9.)*.045+exp(-dot(g,g)*70.)*.05)*uGlare.z;
  vec2 px=fwidth(vUv);vec2 e=min(vUv,1.-vUv)/px;
  col+=(1.-smoothstep(0.,1.8,min(e.x,e.y)))*.2*(1.-uDim*.6);
  float n=noise(vUv*vec2(5.,3.5)+uTime*.04)*.7+noise(vUv*26.)*.3;
  float front=vUv.x*.7+n*.3,edge=uReveal*1.32-.16;
  float mask=smoothstep(front,front+.012,edge);
  float line=(1.-smoothstep(0.,.03,abs(edge-front-.006)))*(1.-step(.999,uReveal));
  col+=uTint*line*2.6;
  gl_FragColor=vec4(col,max(mask,line));
  #include <colorspace_fragment>
}`;
const haloFragment=`uniform vec3 uTint;uniform float uIntensity;uniform vec2 uSize;varying vec2 vUv;
float box(vec2 p,vec2 b){vec2 d=abs(p)-b;return length(max(d,0.))+min(max(d.x,d.y),0.);}
void main(){vec2 p=(vUv-.5)*uSize;float d=box(p,uSize*.5-vec2(1.6));
  vec2 q=abs(vUv-.5)*2.;float fade=(1.-smoothstep(.55,1.,q.x))*(1.-smoothstep(.55,1.,q.y));
  float g=(exp(-max(d,0.)*1.9)*.75+exp(-max(d,0.)*6.)*.55)*fade;
  gl_FragColor=vec4(uTint*g*uIntensity,1.);}`;
const beamVertex=`varying vec2 vUv;varying vec3 vN;varying vec3 vV;
void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const beamFragment=`uniform vec3 uTint;uniform float uIntensity,uTime;varying vec2 vUv;varying vec3 vN;varying vec3 vV;
${NOISE}
void main(){float facing=abs(dot(normalize(vN),normalize(vV)));float v=vUv.y;
  float along=smoothstep(.0,.75,v)*(1.-smoothstep(.93,1.,v));
  float streak=.5+.5*noise(vec2(vUv.x*42.,v*1.3-uTime*.05));
  gl_FragColor=vec4(uTint*pow(facing,1.8)*along*streak*uIntensity,1.);}`;
const plainVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const projectorVertex=`attribute float aAlong;attribute float aSpan;varying float vAlong;varying float vSpan;varying vec3 vWorld;
void main(){vAlong=aAlong;vSpan=aSpan;vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const projectorFragment=`uniform vec3 uTint;uniform float uIntensity,uTime;varying float vAlong;varying float vSpan;varying vec3 vWorld;
${NOISE}
void main(){float body=vAlong*(1.-vAlong)*4.;body*=body;
  float across=(vSpan-.5*(1.-vAlong))/max(vAlong,.001);
  body*=smoothstep(0.,.3,across)*smoothstep(1.,.7,across);
  float rays=.2+.8*noise(vec2(vWorld.x*2.2+vWorld.z*.6,vWorld.y*.25-uTime*.2));
  float flicker=.94+.06*sin(uTime*47.)*sin(uTime*31.);
  gl_FragColor=vec4(uTint*body*rays*flicker*uIntensity,1.);}`;
const poolFragment=`uniform vec3 uTint;uniform float uIntensity;varying vec2 vUv;
void main(){vec2 p=vUv-.5;float g=exp(-dot(p,p)*11.);gl_FragColor=vec4(uTint*g*uIntensity,1.);}`;

const floorShader={
  name:'ObservatoryWetFloor',
  uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},uTime:{value:0},uBackground:{value:new THREE.Color()},uBlur:{value:.012},uGrid:{value:0},uGridColor:{value:new THREE.Color(.45,.8,.9)},uTorch:{value:new THREE.Vector4()}},
  vertexShader:`uniform mat4 textureMatrix;varying vec4 vProj;varying vec3 vWorld;
    void main(){vProj=textureMatrix*vec4(position,1.);vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime;uniform float uBlur;uniform float uGrid;uniform vec3 uGridColor;uniform vec4 uTorch;uniform vec3 uBackground;varying vec4 vProj;varying vec3 vWorld;
    ${NOISE}
    const vec2 taps[12]=vec2[](vec2(-.326,-.406),vec2(-.840,-.074),vec2(-.696,.457),vec2(-.203,.621),vec2(.962,-.195),vec2(.473,-.480),vec2(.519,.767),vec2(.185,-.893),vec2(.507,.064),vec2(.896,.412),vec2(-.322,-.933),vec2(-.792,-.598));
    void main(){
      vec2 uv=vProj.xy/vProj.w;
      float wet=noise(vWorld.xz*.35);float fine=noise(vWorld.xz*9.);
      uv+=vec2(noise(vWorld.xz*1.7)-.5,fine-.5)*.006;
      float blur=uBlur*(.55+wet*.9);
      vec3 acc=texture2D(tDiffuse,uv).rgb;
      for(int i=0;i<12;i++)acc+=texture2D(tDiffuse,uv+taps[i]*vec2(.55,2.4)*blur).rgb;
      acc/=13.;
      vec3 view=normalize(cameraPosition-vWorld);
      float fresnel=.28+.72*pow(1.-max(view.y,0.),3.);
      vec2 toTorch=vWorld.xz-uTorch.xz;float spot=exp(-dot(toTorch,toTorch)/3.2)*uTorch.w;
      vec3 col=vec3(.009,.010,.013)+acc*fresnel*(.8+wet*.35)*(1.+spot*3.);
      col+=vec3(1.,.9,.78)*spot*(.12+wet*.12);
      col+=(fine-.5)*.006;
      float dist=length(cameraPosition.xz-vWorld.xz);
      if(uGrid>.001){
        vec2 cell=vWorld.xz*.5;vec2 g=abs(fract(cell)-.5)/fwidth(cell);float line=1.-min(min(g.x,g.y),1.);
        float pulse=.6+.4*sin(vWorld.x*.35-uTime*1.4);
        col+=uGridColor*line*uGrid*exp(-dist*.055)*.32*pulse;
      }
      col=mix(col,uBackground,smoothstep(22.,70.,dist));
      gl_FragColor=vec4(col,1.);
      #include <colorspace_fragment>
    }`,
};

const finishShader={
  name:'ObservatoryFilm',
  uniforms:{tDiffuse:{value:null},uTime:{value:0},uShift:{value:0},uGrain:{value:.045},uResolution:{value:new THREE.Vector2(1,1)},uVignette:{value:.62},uExposure:{value:1}},
  vertexShader:plainVertex,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime,uShift,uGrain,uVignette,uExposure;uniform vec2 uResolution;varying vec2 vUv;
    float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
    void main(){
      vec2 d=vUv-.5;float r2=dot(d,d);
      float ca=(.0035+uShift*.028)*r2;
      vec3 c=vec3(texture2D(tDiffuse,vUv-d*ca).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv+d*ca*1.4).b);
      c*=mix(1.,uVignette,smoothstep(.06,.5,r2))*uExposure;
      float luma=dot(c,vec3(.2126,.7152,.0722));
      c+=(hash(floor(vUv*uResolution)+fract(uTime*7.)*917.)-.5)*uGrain*(.35+.65*(1.-smoothstep(0.,.6,luma)));
      gl_FragColor=vec4(max(c,0.),1.);
    }`,
};

const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(e0:number,e1:number,v:number)=>{const t=THREE.MathUtils.clamp((v-e0)/(e1-e0),0,1);return t*t*(3-2*t);};

export class ObservatoryWorld {
  renderer:THREE.WebGLRenderer;
  composer:EffectComposer;
  bloom:UnrealBloomPass;
  finish:ShaderPass;
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(40,1,.1,320);
  bays:Bay[]=[];
  curator=createCurator();
  pointer=new THREE.Vector2();
  smoothPointer=new THREE.Vector2();
  raycaster=new THREE.Raycaster();
  /** Nearest work to the camera. The hall is continuous; this is only the one in front of you. */
  index=0;
  position=0;target=0;velocity=0;shift=0;
  dragging=false;dragBase=0;dragLast=0;dragTime=0;dragSpeed=0;lastInput=-1e9;settledAt=0;
  onIndex?:(index:number)=>void;
  calm=false;mobile=false;disposed=false;
  frame=0;lastTime=0;phase=0;walk=0;elapsed=0;
  preview?:HTMLVideoElement;previewTexture?:THREE.VideoTexture;previewIndex=-1;previewAuto=false;
  environment:THREE.WebGLRenderTarget;
  loader=new THREE.TextureLoader();
  look=new THREE.Vector3();cameraGoal=new THREE.Vector3();
  resizeObserver:ResizeObserver;
  placeholder=new THREE.DataTexture(new Uint8Array([6,7,9,255]),1,1);
  motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
  focus=0;
  focusMotion?:{from:number;to:number;start:number;duration:number;resolve:()=>void};
  focusLook=new THREE.Vector3();focusCamera=new THREE.Vector3();focusOrigin=new THREE.Vector3();focusLookOrigin=new THREE.Vector3();
  floor:Reflector;
  dust:THREE.Points<THREE.BufferGeometry,Shader>;
  stars:THREE.Points<THREE.BufferGeometry,Shader>;
  contact:THREE.Mesh;
  key:THREE.SpotLight;rim:THREE.DirectionalLight;ambient:THREE.HemisphereLight;
  tint=new THREE.Color('#d6dcdf');
  rooms=ROOMS.map(room=>({...room,fog:new THREE.Color(room.fog)})) as Atmosphere[];
  weather:Atmosphere={...ROOMS[0],fog:new THREE.Color(ROOMS[0].fog)};
  background:THREE.Color;
  // Opening sequence: 0 = darkness, 1 = the hall at rest.
  intro=1;introStart=Infinity;introSpeed=1;introResolve?:()=>void;
  introDone:Promise<void>=Promise.resolve();
  // The visitor's hand is a torch: it lights the wet floor, the dust and the prints.
  torch=new THREE.PointLight('#fff1dc',0,7,1.6);
  followSpot=new THREE.Group();followFrom=new THREE.Vector3();
  torchPoint=new THREE.Vector3(0,0,2);torchGoal=new THREE.Vector3();torchPower=0;
  pointerInside=false;lastPointer=new THREE.Vector2(9,9);pointerMovedAt=-1e9;
  tilt?:THREE.Vector2;
  // The astronaut has a life of his own: he steps closer, follows the light, greets, stargazes.
  hovered=false;lastActivity=0;approach=0;astro=new THREE.Vector2();astroReady=false;
  greetW=0;waveW=0;starW=0;sitW=0;tabletW=0;
  // Teleport: he no longer sprints between works; he taps his tablet and beams across.
  astroIndex=-1;tele:'here'|'leaving'|'gone'|'arriving'='here';teleT=0;
  dissolve={uDissolve:{value:0},uDissolveColor:{value:new THREE.Color('#8fd8ff')},uDissolveBase:{value:0},uDissolveHeight:{value:2.7}};
  patched=new WeakSet<THREE.Material>();
  column!:THREE.Mesh<THREE.CylinderGeometry,Shader>;ring!:THREE.Mesh<THREE.PlaneGeometry,Shader>;
  tablet=new THREE.Group();tabletCanvas=document.createElement('canvas');tabletTexture!:THREE.CanvasTexture;tabletDrawnAt=0;tabletFlash=0;
  leftHand?:THREE.Object3D;headBone?:THREE.Object3D;rigTag='';
  onTeleport?:(phase:'out'|'in')=>void;departure?:{to:number;at:number};
  hop?:{fromX:number;fromZ:number;toX:number;toZ:number;t:number;dur:number;height:number;index:number};
  landing=0;anchorScratch=new THREE.Vector2();onLand?:()=>void;
  // Through his eyes: the camera sits in the helmet, the sky opens up.
  fpGoal=false;fp=0;fpMotion?:{from:number;to:number;start:number;duration:number};
  lookYaw=0;lookPitch=0;lookGoal=new THREE.Vector2();fpEye=new THREE.Vector3();fpLook=new THREE.Vector3();
  sky?:THREE.Mesh<THREE.SphereGeometry,Shader>;planet?:THREE.Mesh<THREE.SphereGeometry,Shader>;
  autoplayBlocked=new Set<number>();
  // Adaptive quality: phones and weak GPUs step down instead of stuttering.
  quality=0;frameTimes:number[]=[];lastRenderAt=0;qualityFrom=0;plainFloor?:THREE.Mesh;
  roomWeights=[1,0,0,0];wasMoving=false;
  // Map view: the hall seen from the ceiling, every work laid out as a card.
  overview=0;overviewMotion?:{from:number;to:number;start:number;duration:number;resolve:()=>void};
  overviewCam=new THREE.Vector3();overviewLook=new THREE.Vector3();mapSlots:THREE.Vector3[]=[];mapHover=-1;
  onFrame?:(state:HallState)=>void;onSettle?:(room:number)=>void;
  onFailure:()=>void;
  tick:(time:number)=>void;

  constructor(private host:HTMLElement,onFailure:()=>void){
    this.onFailure=onFailure;
    this.mobile=matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    this.calm=this.isCalm();
    this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    // Neutral keeps artwork colours intact below the highlights; only light blooms.
    this.renderer.toneMapping=THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure=1;
    this.placeholder.needsUpdate=true;this.placeholder.colorSpace=THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-hidden','true');
    host.append(this.renderer.domElement);
    const siteBackground=getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()||'#020203';
    this.background=new THREE.Color(siteBackground);
    this.scene.background=this.background.clone();
    this.scene.fog=new THREE.FogExp2(siteBackground,.022);
    const pmrem=new THREE.PMREMGenerator(this.renderer);
    const room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);
    this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.28;room.dispose();pmrem.dispose();

    this.ambient=new THREE.HemisphereLight('#9fb1c4','#050608',.35);this.scene.add(this.ambient);
    this.key=new THREE.SpotLight('#ffffff',60,26,.5,.8,1.6);this.key.position.set(0,11,6);this.scene.add(this.key,this.key.target);
    this.rim=new THREE.DirectionalLight('#dfe8ff',2.4);this.rim.position.set(2,6,-8);this.scene.add(this.rim,this.rim.target);

    const size=this.drawingSize();
    this.floor=new Reflector(new THREE.PlaneGeometry(260,120),{
      clipBias:.003,textureWidth:size.x*(this.mobile?.35:.5),textureHeight:size.y*(this.mobile?.35:.5),
      shader:floorShader,multisample:0,
    });
    this.floor.rotation.x=-Math.PI/2;this.floor.position.z=-20;
    const floorMaterial=this.floor.material as Shader;floorMaterial.uniforms.uBackground.value.copy(this.background);
    floorMaterial.uniforms.uBlur.value=this.mobile?.016:.012;
    this.scene.add(this.floor);

    this.stars=this.buildStars();this.scene.add(this.stars);
    this.dust=this.buildDust();this.scene.add(this.dust);
    this.buildBays();
    this.scene.add(this.curator.root);
    this.scene.add(this.torch);
    this.buildTeleport();this.buildTablet();this.makeDissolvable(this.curator.root);
    // Unit cone, apex at the origin, opening along +z after the turn: scaled to reach the floor.
    const spotGeometry=new THREE.ConeGeometry(.9,1,48,1,true);spotGeometry.translate(0,-.5,0);
    const spotCone=new THREE.Mesh(spotGeometry,new THREE.ShaderMaterial({uniforms:{uTint:{value:new THREE.Color()},uIntensity:{value:0},uTime:{value:0}},vertexShader:beamVertex,fragmentShader:beamFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
    spotCone.rotation.x=-Math.PI/2;spotCone.frustumCulled=false;this.followSpot.add(spotCone);this.followSpot.visible=false;this.scene.add(this.followSpot);

    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
    const shadowCtx=shadowCanvas.getContext('2d')!;const gradient=shadowCtx.createRadialGradient(64,64,4,64,64,62);
    gradient.addColorStop(0,'rgba(0,0,0,.85)');gradient.addColorStop(.45,'rgba(0,0,0,.35)');gradient.addColorStop(1,'rgba(0,0,0,0)');
    shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,128,128);
    this.contact=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
    this.contact.rotation.x=-Math.PI/2;this.scene.add(this.contact);

    const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:this.mobile?0:4});
    this.composer=new EffectComposer(this.renderer,target);
    this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(size.x,size.y),.62,.62,.93);
    this.composer.addPass(this.bloom);
    this.finish=new ShaderPass(finishShader);this.composer.addPass(this.finish);
    // Grain reads as blur on small, dense screens.
    if(this.mobile){this.finish.uniforms.uGrain.value=.022;this.finish.uniforms.uVignette.value=.7;}
    this.composer.addPass(new OutputPass());

    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
    this.resize();
    this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
    this.tick=(time:number)=>this.render(time);
  }

  isCalm(){return document.documentElement.classList.contains('rb-calm')||this.motionQuery.matches;}
  private contextLost=(event:Event)=>{event.preventDefault();this.onFailure();this.dispose();};
  private narrow(){return this.host.clientWidth<650;}
  private drawingSize(){
    const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);
    // Phones render near their native density: a soft picture reads as a cheap one.
    const ratio=Math.min(devicePixelRatio||1,this.mobile?2.6:1.6,Math.sqrt((this.mobile?2900000:2400000)/(w*h)))*(this.quality>=3?.75:1);
    return new THREE.Vector2(Math.round(w*ratio),Math.round(h*ratio));
  }
  private maxX(){return (this.bays.length-1)*GAP;}
  private clampTarget(value:number,give=GAP*.3){return THREE.MathUtils.clamp(value,-give,this.maxX()+give);}
  /** Index the hall is heading to, so repeated key presses queue up naturally. */
  targetIndex(){return THREE.MathUtils.clamp(Math.round(this.target/GAP),0,this.bays.length-1);}
  isMoving(){return this.dragging||Math.abs(this.target-this.position)>.04;}

  private buildStars(){
    let seed=41027;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
    const count=this.mobile?420:900;const positions=new Float32Array(count*3),sizes=new Float32Array(count);
    for(let i=0;i<count;i++){positions.set([(random()-.5)*300,6+random()*80,-70-random()*110],i*3);sizes[i]=random()>.95?3.2:1+random()*1.4;}
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
    const material=new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0},uPixelRatio:{value:1},uLight:{value:1}},
      vertexShader:`attribute float aSize;uniform float uTime,uPixelRatio;varying float vA;
        void main(){vA=.45+.25*sin(position.x*3.1+uTime*.6);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uPixelRatio;}`,
      fragmentShader:`uniform float uLight;varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vec3(.8,.87,1.)*vA*uLight*(1.-smoothstep(.05,.5,d)),1.);}`,
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,
    });
    const points=new THREE.Points(geometry,material);points.frustumCulled=false;return points;
  }

  private buildDust(){
    let seed=9151;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
    const count=this.mobile?500:1400;const positions=new Float32Array(count*3),seeds=new Float32Array(count);
    for(let i=0;i<count;i++){positions.set([(random()-.5)*72,random()*9,-6+random()*12],i*3);seeds[i]=random();}
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
    const material=new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0},uCamX:{value:0},uPixelRatio:{value:1},uGap:{value:GAP},uFocus:{value:0},uAmount:{value:1},uTorch:{value:new THREE.Vector4()}},
      vertexShader:`attribute float aSeed;uniform float uTime,uCamX,uPixelRatio,uGap,uFocus,uAmount;uniform vec4 uTorch;varying float vA;
        void main(){vec3 p=position;
          p.x=uCamX+mod(p.x-uCamX+36.,72.)-36.+sin(uTime*.17+aSeed*31.)*.35;
          p.y=mod(p.y+uTime*(.04+aSeed*.07),9.)+.15;
          p.z+=cos(uTime*.13+aSeed*17.)*.3;
          float dx=abs(mod(p.x+uGap*.5,uGap)-uGap*.5);
          float beam=exp(-dx*dx/9.)*exp(-(p.z+1.5)*(p.z+1.5)/14.)*smoothstep(0.,2.5,p.y);
          vec3 lit=p-uTorch.xyz;beam+=exp(-dot(lit,lit)/2.5)*uTorch.w*.9;
          vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
          gl_PointSize=clamp((.7+aSeed*1.6)*uPixelRatio*16./-mv.z,.5,6.);
          vA=(.035+beam*.75)*(.55+.45*sin(uTime*.8+aSeed*50.))*(1.-uFocus*.8)*uAmount*step(aSeed,uAmount*.7+.3);}`,
      fragmentShader:`varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vec3(1.,.96,.9)*vA*(1.-smoothstep(.05,.5,d)),1.);}`,
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,
    });
    const points=new THREE.Points(geometry,material);points.frustumCulled=false;return points;
  }

  private buildBays(){
    const screenGeo=new THREE.PlaneGeometry(1,1,32,12);
    const flat=new THREE.PlaneGeometry(1,1);
    const beamGeo=new THREE.ConeGeometry(5.2,15,64,1,true);
    const additive={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false} as const;
    archiveWorks.forEach((work,i)=>{
      const group=new THREE.Group();group.position.x=i*GAP;this.scene.add(group);
      const tint=new THREE.Color('#d9dee4');
      const vertical=work.ratio==='vertical';
      const w=vertical?MAX_V*.5625:MAX_W,h=vertical?MAX_V:MAX_H;
      const beam=new THREE.Mesh(beamGeo,new THREE.ShaderMaterial({uniforms:{uTint:{value:tint.clone()},uIntensity:{value:0},uTime:{value:0}},vertexShader:beamVertex,fragmentShader:beamFragment,...additive}));
      beam.position.set(0,7.6,-2.6);beam.rotation.x=-.16;group.add(beam);
      const halo=new THREE.Mesh(flat,new THREE.ShaderMaterial({uniforms:{uTint:{value:tint.clone()},uIntensity:{value:0},uSize:{value:new THREE.Vector2(w+3.2,h+3.2)}},vertexShader:plainVertex,fragmentShader:haloFragment,...additive}));
      halo.scale.set(w+3.2,h+3.2,1);halo.position.set(0,LIFT+h/2,-.35);group.add(halo);
      const pool=new THREE.Mesh(flat,new THREE.ShaderMaterial({uniforms:{uTint:{value:tint.clone()},uIntensity:{value:0}},vertexShader:plainVertex,fragmentShader:poolFragment,...additive}));
      pool.rotation.x=-Math.PI/2;pool.scale.set(w*1.7,7,1);pool.position.set(0,.012,1.4);group.add(pool);
      const screen=new THREE.Mesh(screenGeo,new THREE.ShaderMaterial({
        uniforms:{uMap:{value:this.placeholder},uTime:{value:0},uShift:{value:0},uReveal:{value:0},uDim:{value:1},uHover:{value:0},uLight:{value:1},uBend:{value:0},uHolo:{value:0},uTint:{value:tint.clone()},uGlare:{value:new THREE.Vector3()}},
        vertexShader:screenVertex,fragmentShader:screenFragment,transparent:true,fog:false,
      }));
      screen.scale.set(w,h,1);screen.position.set(0,LIFT+h/2,0);screen.userData.index=i;group.add(screen);
      const bay:Bay={group,screen,halo,beam,pool,tint,reveal:0,active:0,hover:0,room:work.roomIndex,lum:.4};
      // The cinema room: every film is thrown onto its frame by a projector overhead.
      if(ROOMS[work.roomIndex].projector){
        bay.projector=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.ShaderMaterial({uniforms:{uTint:{value:tint.clone()},uIntensity:{value:0},uTime:{value:0}},vertexShader:projectorVertex,fragmentShader:projectorFragment,...additive,side:THREE.DoubleSide}));
        bay.projector.frustumCulled=false;group.add(bay.projector);
      }
      group.visible=false;
      this.bays.push(bay);
      this.layout(bay,w,h);
    });
  }

  private layout(bay:Bay,width:number,height:number){
    bay.screen.scale.set(width,height,1);bay.screen.position.y=LIFT+height/2;
    bay.halo.scale.set(width+3.2,height+3.2,1);bay.halo.position.y=bay.screen.position.y;
    (bay.halo.material.uniforms.uSize.value as THREE.Vector2).set(width+3.2,height+3.2);
    bay.pool.scale.x=width*1.7;
    if(bay.projector){
      const apex=[-1.2,9.6,7.5],x=width/2,bottom=LIFT,top=LIFT+height,z=.03;
      const corners=[[-x,bottom],[x,bottom],[x,top],[-x,top]];
      const positions:number[]=[],along:number[]=[],span:number[]=[];
      for(let side=0;side<4;side++){
        const a=corners[side],b=corners[(side+1)%4];
        positions.push(...apex,a[0],a[1],z,b[0],b[1],z);along.push(0,1,1);span.push(.5,0,1);
      }
      const geometry=bay.projector.geometry;
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('aAlong',new THREE.Float32BufferAttribute(along,1));
      geometry.setAttribute('aSpan',new THREE.Float32BufferAttribute(span,1));
      geometry.computeBoundingSphere();
    }
  }

  async prepare(index:number){
    const bay=this.bays[index];if(!bay||bay.texture)return;
    if(bay.loading)return bay.loading;
    bay.loading=this.loader.loadAsync(archiveWorks[index].img).then(texture=>{
      if(this.disposed){texture.dispose();return;}
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
      // Phones keep prints at 1024px: fifteen full-size textures can exhaust iOS memory.
      const source=texture.image as HTMLImageElement;
      if(this.mobile&&source.width>1600){
        const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=Math.round(1600*source.height/source.width);
        canvas.getContext('2d')!.drawImage(source,0,0,canvas.width,canvas.height);
        const small=new THREE.CanvasTexture(canvas);small.colorSpace=THREE.SRGBColorSpace;small.anisotropy=texture.anisotropy;
        texture.dispose();texture=small;
      }
      bay.texture=texture;this.renderer.initTexture(texture);
      if(this.previewIndex!==index)bay.screen.material.uniforms.uMap.value=texture;
      const image=source;const aspect=image.width/image.height;
      const vertical=aspect<1;
      const height=vertical?MAX_V:Math.min(MAX_H,MAX_W/aspect);
      this.layout(bay,height*aspect,height);
      // The average colour of each work becomes the colour of its light.
      const probe=document.createElement('canvas');probe.width=probe.height=6;
      const ctx=probe.getContext('2d',{willReadFrequently:true});
      if(ctx){
        ctx.drawImage(image,0,0,6,6);const data=ctx.getImageData(0,0,6,6).data;let r=0,g=0,b=0;
        for(let p=0;p<data.length;p+=4){r+=data[p];g+=data[p+1];b+=data[p+2];}
        const peak=Math.max(r,g,b,1);bay.lum=(r*.2126+g*.7152+b*.0722)/(data.length/4)/255;bay.tint.setRGB(r/peak,g/peak,b/peak,THREE.SRGBColorSpace).lerp(new THREE.Color(1,1,1),.35);
        [bay.screen,bay.halo,bay.beam,bay.pool,bay.projector].forEach(mesh=>mesh&&(mesh.material.uniforms.uTint.value as THREE.Color).copy(bay.tint));
      }
      if(this.calm)bay.reveal=1;
    }).catch(()=>{bay.reveal=1;});
    return bay.loading;
  }

  /* ---------- Movement: the hall follows your hand, then settles on a work. ---------- */
  select(index:number,mode:'walk'|'teleport'='walk'){
    index=THREE.MathUtils.clamp(index,0,this.bays.length-1);
    const to=index*GAP;
    if(this.isCalm()){this.position=this.target=to;this.updateIndex();return;}
    this.lastInput=-1e9;this.dragging=false;this.skipIntro();this.lastActivity=performance.now();
    // Cinematic departure: he lifts the tablet and taps before the hall moves.
    const visible=mode==='teleport'&&this.tele==='here'&&!this.hop&&this.intro>=1&&this.focus===0&&this.overview===0&&!this.isMoving()&&to!==this.astroIndex*GAP;
    if(visible){this.tele='leaving';this.teleT=0;this.onTeleport?.('out');this.departure={to,at:performance.now()+650};}
    else{this.departure=undefined;this.depart(to);}
    void this.prepare(index);
  }
  private depart(to:number){
    // Long jumps enter the last stretch already in motion instead of racing past every room.
    if(Math.abs(to-this.position)>GAP*3.5){
      const from=this.position;this.position=to-Math.sign(to-from)*GAP*1.6;this.camera.position.x+=this.position-from;
    }
    this.target=to;
  }
  scrollBy(pixels:number){
    this.skipIntro();
    this.target=this.clampTarget(this.target+pixels*GAP/560);this.lastInput=this.lastActivity=performance.now();
  }
  dragStart(){this.skipIntro();this.lastActivity=performance.now();this.dragging=true;this.dragBase=this.target;this.dragLast=this.target;this.dragTime=performance.now();this.dragSpeed=0;}
  dragMove(pixels:number,span:number){
    if(!this.dragging)return;
    const next=this.clampTarget(this.dragBase-pixels*GAP*1.35/Math.max(320,span),GAP*.45);
    const now=performance.now(),dt=Math.max(1,now-this.dragTime);
    this.dragSpeed=mix(this.dragSpeed,(next-this.dragLast)/dt,.35);this.dragLast=next;this.dragTime=now;
    this.target=next;this.lastInput=this.lastActivity=now;
  }
  dragEnd(){
    if(!this.dragging)return;this.dragging=false;
    // A flick carries on a little; the snap below then lands it on a work.
    const stale=performance.now()-this.dragTime>90;
    this.target=this.clampTarget(this.target+(stale?0:THREE.MathUtils.clamp(this.dragSpeed*150,-GAP*.9,GAP*.9)));
    // A quick short flick still turns to the neighbouring work.
    const from=Math.round(this.dragBase/GAP);
    if(!stale&&Math.abs(this.dragSpeed)>.006&&Math.round(this.target/GAP)===from)this.target=this.clampTarget((from+Math.sign(this.dragSpeed))*GAP,0);this.lastInput=-1e9;
  }
  private updateIndex(){
    const nearest=THREE.MathUtils.clamp(Math.round(this.position/GAP),0,this.bays.length-1);
    if(nearest===this.index)return;
    this.index=nearest;
    if(this.previewIndex>=0&&this.previewIndex!==nearest)this.stopPreview();
    for(const i of [nearest,nearest+1,nearest-1,nearest+2,nearest-2])void this.prepare(i);
    this.onIndex?.(nearest);
  }

  /* ---------- Teleport ---------- */
  private buildTeleport(){
    const additive={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false} as const;
    this.column=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,4.2,48,1,true),new THREE.ShaderMaterial({
      uniforms:{uIntensity:{value:0},uTime:{value:0},uColor:{value:new THREE.Color('#8fd8ff')}},vertexShader:beamVertex,
      fragmentShader:`uniform float uIntensity,uTime;uniform vec3 uColor;varying vec2 vUv;varying vec3 vN;varying vec3 vV;
        void main(){float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),1.4);float bands=.5+.5*sin(vUv.y*46.-uTime*16.);
        float fade=smoothstep(0.,.08,vUv.y)*(1.-smoothstep(.5,1.,vUv.y));gl_FragColor=vec4(uColor*(rim*.9+.15)*(.55+.45*bands)*fade*uIntensity*.8,1.);}`,
      ...additive,side:THREE.DoubleSide}));
    this.ring=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2),new THREE.ShaderMaterial({
      uniforms:{uIntensity:{value:0},uTime:{value:0},uColor:{value:new THREE.Color('#8fd8ff')}},vertexShader:plainVertex,
      fragmentShader:`uniform float uIntensity,uTime;uniform vec3 uColor;varying vec2 vUv;
        void main(){float r=length(vUv-.5)*2.;float wave=exp(-pow((r-fract(uTime*1.3))*9.,2.))*(1.-r);float core=exp(-r*r*5.);
        gl_FragColor=vec4(uColor*(wave*1.2+core*.5)*uIntensity*step(r,1.),1.);}`,...additive}));
    this.ring.rotation.x=-Math.PI/2;
    this.column.visible=this.ring.visible=false;this.scene.add(this.column,this.ring);
  }
  /** Every material of the astronaut (and his tablet) can come apart in voxels. */
  private makeDissolvable(root:THREE.Object3D){
    root.traverse(object=>{const mesh=object as THREE.Mesh;if(!mesh.isMesh)return;
      for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
        if(this.patched.has(material))continue;this.patched.add(material);
        const previous=material.onBeforeCompile.bind(material),previousKey=material.customProgramCacheKey();
        material.onBeforeCompile=(shader,renderer)=>{
          previous(shader,renderer);Object.assign(shader.uniforms,this.dissolve);
          shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vDissolveWorld;')
            .replace('#include <project_vertex>','#include <project_vertex>\nvDissolveWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
          shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
            varying vec3 vDissolveWorld;uniform float uDissolve,uDissolveBase,uDissolveHeight;uniform vec3 uDissolveColor;
            float dissolveCut(){return uDissolve*1.3-(1.-clamp((vDissolveWorld.y-uDissolveBase)/uDissolveHeight,0.,1.))*.3;}
            float dissolveNoise(){return fract(sin(dot(floor(vDissolveWorld*34.),vec3(12.9898,78.233,37.719)))*43758.5453);}`)
            .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(uDissolve>0.&&dissolveNoise()<dissolveCut())discard;');
          if(shader.fragmentShader.includes('totalEmissiveRadiance'))shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\nif(uDissolve>0.){float cut=dissolveCut();totalEmissiveRadiance+=uDissolveColor*(1.-smoothstep(cut,cut+.08,dissolveNoise()))*5.;}');
        };
        material.customProgramCacheKey=()=>previousKey+'|dissolve';material.needsUpdate=true;
      }});
  }
  /** Where he stands for a work: beside it in the hall, in front of it when you see through his eyes. */
  private anchor(index:number,out:THREE.Vector2){
    const edge=this.bays[index].screen.scale.x/2,centre=index*GAP,narrow=this.narrow();
    const side=new THREE.Vector2(centre-(narrow?Math.min(edge+.45,2.4):edge+mix(.6,.25,this.approach)),narrow?1.2:mix(1.6,.9,this.approach));
    const front=new THREE.Vector2(centre-.15,narrow?9.5:7.6);
    return out.copy(side).lerp(front,this.fpGoal?1:0);
  }
  /**
   * Travel: across the hall he leaps (the floor's gravity is faint); the room buttons
   * and the map send him by teleport. Far jumps from a fast drag also teleport.
   */
  private updateTeleport(dt:number,ov:number,viewing:boolean){
    if(this.calm){this.tele='here';this.hop=undefined;this.dissolve.uDissolve.value=0;this.curator.root.visible=true;return;}
    if(this.tele==='here'&&this.hop){
      this.hop.t=Math.min(1,this.hop.t+dt/this.hop.dur);
      if(this.hop.t>=1){this.astroIndex=this.hop.index;this.hop=undefined;this.landing=1;this.onLand?.();}
    }
    if(this.tele==='here'&&!this.hop){
      const home=this.anchor(this.astroIndex,this.anchorScratch);
      const drift=Math.hypot(home.x-this.astro.x,home.y-this.astro.y);
      if(!viewing&&ov>0&&this.index!==this.astroIndex){this.tele='leaving';this.teleT=0;this.onTeleport?.('out');}
      else if(!viewing&&ov===0&&(this.index!==this.astroIndex||drift>2.5)){
        const steps=Math.abs(this.index-this.astroIndex);
        if(steps>3){this.tele='leaving';this.teleT=0;this.onTeleport?.('out');}
        else{
          const to=this.anchor(this.index,new THREE.Vector2()),span=Math.max(1,steps);
          this.hop={fromX:this.astro.x,fromZ:this.astro.y,toX:to.x,toZ:to.y,t:0,dur:.8+.16*span,height:1.3+.45*span,index:this.index};
          // Through his eyes the leap faces the next work, wherever you were looking.
          if(this.fpGoal)this.lookGoal.set(0,0);
        }
      }
    }else if(this.tele==='leaving'){
      this.teleT=Math.min(1,this.teleT+dt/.85);if(this.teleT>=1){this.tele='gone';this.teleT=0;}
    }else if(this.tele==='gone'){
      if(ov===0&&!this.isMoving()&&!viewing){this.astroIndex=this.index;this.tele='arriving';this.teleT=0;this.approach=0;this.onTeleport?.('in');}
    }else{
      this.teleT=Math.min(1,this.teleT+dt/1.15);if(this.teleT>=1)this.tele='here';
    }
    const d=this.tele==='leaving'?smooth(.36,.95,this.teleT):this.tele==='gone'?1:this.tele==='arriving'?1-smooth(.12,.85,this.teleT):0;
    this.dissolve.uDissolve.value=d;this.curator.root.visible=d<.999;
  }

  /* ---------- Tablet ---------- */
  private buildTablet(){
    this.tabletCanvas.width=256;this.tabletCanvas.height=176;
    this.tabletTexture=new THREE.CanvasTexture(this.tabletCanvas);this.tabletTexture.colorSpace=THREE.SRGBColorSpace;
    const body=new THREE.Mesh(new THREE.BoxGeometry(.34,.24,.022),new THREE.MeshStandardMaterial({color:'#1b222a',metalness:.6,roughness:.35}));
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(.31,.21),new THREE.MeshBasicMaterial({map:this.tabletTexture,toneMapped:false}));
    screen.position.z=.012;this.tablet.add(body,screen);this.tablet.visible=false;this.scene.add(this.tablet);
    this.makeDissolvable(this.tablet);this.drawTablet(0);
  }
  private drawTablet(time:number){
    const ctx=this.tabletCanvas.getContext('2d');if(!ctx)return;
    const W=256,H=176,pulse=.5+.5*Math.sin(time*.006);
    ctx.fillStyle='#050e16';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(143,216,255,.08)';ctx.lineWidth=1;
    for(let x=0;x<W;x+=16){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=16){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.fillStyle='#8fd8ff';ctx.font='bold 11px monospace';ctx.fillText('RB / OBSERVATORY',12,20);
    ctx.textAlign='right';ctx.fillText(String(this.index+1).padStart(2,'0')+' / '+String(this.bays.length).padStart(2,'0'),W-12,20);ctx.textAlign='left';
    // The hall as a line of rooms; his position pulses.
    const count=this.bays.length;
    for(let i=0;i<count;i++){
      const px=20+i*(W-40)/(count-1),py=80,on=i===this.index;
      ctx.fillStyle=on?'#ffffff':['#c7a978','#8fb4d4','#d98fa6','#6fd6c8'][this.bays[i].room];
      ctx.globalAlpha=on?1:.55;ctx.beginPath();ctx.arc(px,py,on?4:2.5,0,Math.PI*2);ctx.fill();
      if(on){ctx.globalAlpha=.25+.5*pulse;ctx.strokeStyle='#8fd8ff';ctx.beginPath();ctx.arc(px,py,8+pulse*5,0,Math.PI*2);ctx.stroke();}
    }
    ctx.globalAlpha=1;
    const teleporting=this.tele==='leaving'||this.tele==='arriving';
    ctx.fillStyle=teleporting?'#ffffff':'#8fd8ff';ctx.font='10px monospace';
    ctx.fillText(teleporting?'TELEPORT':'SIGNAL  '+'|'.repeat(3+Math.round(pulse*3)),12,H-38);
    ctx.fillStyle='rgba(143,216,255,.25)';ctx.fillRect(12,H-28,W-24,4);
    ctx.fillStyle='#8fd8ff';ctx.fillRect(12,H-28,(W-24)*(teleporting?this.teleT:.35+.3*pulse),4);
    if(this.tabletFlash>.01){ctx.fillStyle='rgba(200,240,255,'+(this.tabletFlash*.85).toFixed(3)+')';ctx.fillRect(0,0,W,H);}
    this.tabletTexture.needsUpdate=true;
  }
  private placeTablet(time:number){
    const root=this.curator.root,rig=String(root.userData.astronautRig??'');
    if(rig!==this.rigTag||!this.leftHand){this.rigTag=rig;this.leftHand=undefined;this.headBone=undefined;
      root.traverse(o=>{if(/RightHand$/.test(o.name))this.leftHand=o;if(/Head$/.test(o.name))this.headBone=o;});}
    const hand=this.leftHand,head=this.headBone;
    // A hologram tablet: it unfolds from his hand only while he uses it, so it never
    // swings through the suit when he walks, waves or sits.
    const w=this.tabletW;
    this.tablet.visible=Boolean(hand&&head)&&root.visible&&w>.06;if(!this.tablet.visible||!hand||!head)return;
    root.updateMatrixWorld(true);
    const handPos=hand.getWorldPosition(new THREE.Vector3()),headPos=head.getWorldPosition(new THREE.Vector3());
    const yaw=root.rotation.y,forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),left=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    this.tablet.position.copy(handPos).addScaledVector(forward,.2).addScaledVector(left,.06).add(new THREE.Vector3(0,.1,0));
    this.tablet.lookAt(headPos);this.tablet.scale.setScalar(smooth(.06,.45,w));
    if(time-this.tabletDrawnAt>(w>.05||this.tele!=='here'?110:600)){this.tabletDrawnAt=time;this.drawTablet(time);}
  }

  /* ---------- Through his eyes ---------- */
  setFirstPerson(on:boolean){
    if(on===this.fpGoal)return;
    this.fpGoal=on;this.lookGoal.set(0,0);this.hovered=false;this.lastActivity=performance.now();
    if(on)this.buildSky();
    this.fpMotion={from:this.fp,to:on?1:0,start:performance.now(),duration:this.isCalm()?1:on?1700:1300};
  }
  /** Drag to look around inside the helmet; up tilts the view to the open sky. */
  lookBy(dx:number,dy:number){
    // Like a photo sphere on a phone: you take hold of the view and pull it.
    this.lookGoal.x=THREE.MathUtils.clamp(this.lookGoal.x+dx*.0042,-1.35,1.35);
    this.lookGoal.y=THREE.MathUtils.clamp(this.lookGoal.y+dy*.0034,-.35,1.1);
    this.lastActivity=performance.now();
  }
  private buildSky(){
    if(this.sky)return;
    const noise3=`float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
        return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n3(p);p*=2.03;a*=.5;}return v;}`;
    this.sky=new THREE.Mesh(new THREE.SphereGeometry(150,64,32),new THREE.ShaderMaterial({
      uniforms:{uFade:{value:0},uTime:{value:0},uBg:{value:new THREE.Color()}},
      vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform float uFade,uTime;uniform vec3 uBg;varying vec3 vDir;`+noise3+`
        vec3 starLayer(vec3 d,float scale,float density){vec3 g=floor(d*scale);float h=h3(g);vec3 f=fract(d*scale)-.5;
          float s=step(density,h)*pow(max(0.,1.-length(f)*2.4),5.);return vec3(.85,.9,1.)*s*(.55+.45*sin(uTime*(1.2+h*3.)+h*70.));}
        void main(){
          vec3 d=normalize(vDir);
          float band=exp(-pow(d.y*.95-d.x*.35+d.z*.12,2.)*7.);
          float n=fbm(d*2.4+vec3(0.,0.,uTime*.004));float wisps=fbm(d*6.+n*1.5);
          vec3 col=mix(vec3(.02,.03,.08),vec3(.3,.12,.36),smoothstep(.4,.85,n))*band*.9;
          col+=vec3(.08,.26,.42)*pow(max(0.,wisps-.42),2.)*6.*band;
          col+=vec3(.9,.75,.55)*pow(max(0.,n-.55),3.)*4.*band;
          col+=starLayer(d,190.,.986)+starLayer(d,70.,.992)*1.6+starLayer(d,420.,.978)*.6;
          // A shooting star every few seconds, drawn as a fading trail.
          float cycle=fract(uTime/7.3),head=cycle*1.8-.4;
          vec3 p0=normalize(vec3(mix(-.9,.9,head),.72-head*.18,-.55+head*.25)),p1=normalize(vec3(mix(-.9,.9,head-.16),.72-(head-.16)*.18,-.55+(head-.16)*.25));
          vec3 ab=p1-p0;float s=clamp(dot(d-p0,ab)/dot(ab,ab),0.,1.);float trail=exp(-pow(length(d-(p0+ab*s))*320.,2.))*(1.-s);
          col+=vec3(1.,.95,.85)*trail*step(.05,cycle)*step(cycle,.7)*1.8;
          gl_FragColor=vec4(uBg+col*uFade,1.);
        }`,
      // Opaque and drawn first: a backdrop, never on top of the floor or the astronaut.
      side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false}));
    this.sky.renderOrder=-10;this.sky.frustumCulled=false;this.scene.add(this.sky);
    this.planet=new THREE.Mesh(new THREE.SphereGeometry(22,64,48),new THREE.ShaderMaterial({
      uniforms:{uFade:{value:0}},
      vertexShader:`varying vec3 vN;varying vec3 vL;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vL=position;vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform float uFade;varying vec3 vN;varying vec3 vL;varying vec3 vV;`+noise3+`
        void main(){vec3 n=normalize(vN);float light=max(dot(n,normalize(vec3(.8,.35,.45))),0.);
          float bands=fbm(vec3(vL.y*.18,vL.x*.03,vL.z*.03))*.6+.4*sin(vL.y*.35+fbm(vL*.08)*3.);
          vec3 surface=mix(vec3(.28,.2,.34),vec3(.78,.62,.52),bands);
          float rim=pow(1.-max(dot(n,vV),0.),3.);
          vec3 col=surface*light*1.1+vec3(.35,.55,.9)*rim*(.35+light);
          gl_FragColor=vec4(col*uFade,1.);}`,fog:false}));
    this.planet.frustumCulled=false;this.scene.add(this.planet);
  }

  /* ---------- Map view ---------- */
  private layoutMap(){
    const cols=this.narrow()?3:5,rows=Math.ceil(this.bays.length/cols),cellX=9.4,cellZ=7.4;
    const centre=new THREE.Vector3(this.position,.55,-6);
    this.mapSlots=this.bays.map((_,i)=>new THREE.Vector3(centre.x+(i%cols-(cols-1)/2)*cellX,centre.y,centre.z+(Math.floor(i/cols)-(rows-1)/2)*cellZ));
    const tanV=Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2)),tanH=tanV*this.camera.aspect;
    const height=Math.max((cols*cellX/2+1.5)/tanH,(rows*cellZ/2+2.5)/tanV)*1.04;
    this.overviewLook.set(centre.x,centre.y,centre.z+1);this.overviewCam.set(centre.x,centre.y+height,centre.z+height*.22);
  }
  enterOverview(){
    this.stopPreview();this.dragging=false;this.hovered=false;this.skipIntro();
    this.target=this.index*GAP;this.position=this.target;
    this.bays.forEach((_,i)=>void this.prepare(i));
    if(this.overview===0)this.layoutMap();
    return this.moveOverview(1);
  }
  exitOverview(index?:number){
    this.mapHover=-1;this.lastActivity=performance.now();
    // Flying into a card: the hall is rebuilt around it while the camera descends.
    if(index!==undefined&&index!==this.index){this.position=this.target=index*GAP;this.updateIndex();}
    return this.moveOverview(0);
  }
  private moveOverview(to:number){
    this.overviewMotion?.resolve();this.overviewMotion=undefined;
    if(this.disposed||this.isCalm()){this.overview=to;return Promise.resolve();}
    return new Promise<void>(resolve=>{this.overviewMotion={from:this.overview,to,start:performance.now(),duration:to?1700:1500,resolve};});
  }
  /** Card under the pointer in the map view, or -1. */
  pick(clientX:number,clientY:number){
    const rect=this.host.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),this.camera);
    const hit=this.raycaster.intersectObjects(this.bays.map(bay=>bay.screen),false)[0];
    return hit?Number(hit.object.userData.index):-1;
  }

  /* ---------- Opening sequence ---------- */
  armIntro(){this.intro=0;this.introStart=Infinity;this.introSpeed=1;this.introDone=new Promise(resolve=>{this.introResolve=resolve;});}
  beginIntro(){if(this.intro<1)this.introStart=this.lastActivity=performance.now();return this.introDone;}
  skipIntro(){if(this.intro<1)this.introSpeed=4;}

  private render(time:number){
    if(this.disposed)return;
    this.frame=requestAnimationFrame(this.tick);
    if(document.hidden)return;
    if(this.mobile&&time-this.lastTime<1000/30-1)return;
    const dt=Math.min((time-this.lastTime)/1000,.05);this.lastTime=time;
    this.watchQuality(time);
    this.calm=this.isCalm();
    if(!this.calm)this.elapsed+=dt;
    if(this.focusMotion){
      const m=this.focusMotion,t=Math.min(1,(time-m.start)/m.duration),e=t<.5?4*t**3:1-(-2*t+2)**3/2;
      this.focus=THREE.MathUtils.lerp(m.from,m.to,e);
      if(t===1){this.focusMotion=undefined;m.resolve();}
    }
    if(this.overviewMotion){
      const m=this.overviewMotion,t=Math.min(1,(time-m.start)/m.duration);
      this.overview=THREE.MathUtils.lerp(m.from,m.to,t<.5?4*t**3:1-(-2*t+2)**3/2);
      if(t===1){this.overviewMotion=undefined;m.resolve();}
    }
    const ov=this.overview;
    if(this.fpMotion){
      const m=this.fpMotion,t=Math.min(1,(time-m.start)/m.duration);
      this.fp=THREE.MathUtils.lerp(m.from,m.to,t<.5?4*t**3:1-(-2*t+2)**3/2);if(t===1)this.fpMotion=undefined;
    }
    if(this.sky){
      const skyOn=this.fp>.001;this.sky.visible=skyOn;this.planet!.visible=skyOn;
      if(skyOn){this.sky.position.copy(this.camera.position);this.sky.material.uniforms.uFade.value=this.fp;(this.sky.material.uniforms.uBg.value as THREE.Color).copy(this.weather.fog);this.sky.material.uniforms.uTime.value=this.elapsed;
        this.planet!.position.set(this.camera.position.x-38,58,-120);this.planet!.material.uniforms.uFade.value=this.fp;}
    }
    if(this.intro<1&&time>this.introStart){
      this.intro=Math.min(1,this.intro+dt*this.introSpeed/3.6);
      if(this.intro>.68&&this.introResolve){this.introResolve();this.introResolve=undefined;}
      if(this.calm)this.intro=1;
    }
    const intro=this.intro;

    if(this.departure&&time>=this.departure.at){this.depart(this.departure.to);this.departure=undefined;this.lastInput=-1e9;}
    // Snap once the hand is off the hall.
    if(!this.dragging&&time-this.lastInput>150&&this.focus===0)this.target=THREE.MathUtils.clamp(Math.round(this.target/GAP),0,this.bays.length-1)*GAP;
    const previous=this.position;
    this.position=this.calm?this.target:THREE.MathUtils.damp(this.position,this.target,this.dragging?11:4.2,dt);
    if(Math.abs(this.position-this.target)<.0005)this.position=this.target;
    this.updateIndex();
    const x=this.position;
    this.velocity=dt>0?(x-previous)/dt/GAP:0;
    this.shift=THREE.MathUtils.damp(this.shift,this.calm?0:Math.min(1,Math.abs(this.velocity)*.5),10,dt);
    if(this.isMoving())this.settledAt=time;
    if(!this.pointer.equals(this.lastPointer)){this.lastPointer.copy(this.pointer);this.pointerMovedAt=time;this.lastActivity=time;}
    this.smoothPointer.lerp(this.tilt&&time-this.pointerMovedAt>1500?this.tilt:this.pointer,1-Math.exp(-dt*3));
    const parallax=this.calm?0:1;

    // Weather of the room(s) around the camera.
    const f=THREE.MathUtils.clamp(x/GAP,0,this.bays.length-1),i0=Math.floor(f),i1=Math.min(this.bays.length-1,i0+1),t=f-i0;
    const a=this.rooms[this.bays[i0].room],b=this.rooms[this.bays[i1].room];
    const w=this.weather,k=this.calm?1:1-Math.exp(-dt*2.2);
    for(const key of ['density','beam','dust','grid','holo','bloom','projector'] as const)w[key]=mix(w[key],mix(a[key],b[key],t),k);
    w.fog.lerp(a.fog.clone().lerp(b.fog,t),k);
    this.roomWeights.fill(0);this.roomWeights[this.bays[i0].room]+=1-t;this.roomWeights[this.bays[i1].room]+=t;
    (this.scene.background as THREE.Color).copy(w.fog);
    const fog=this.scene.fog as THREE.FogExp2;fog.color.copy(w.fog);fog.density=w.density*(1-ov*.9);
    const floorUniforms=(this.floor.material as Shader).uniforms;
    floorUniforms.uBackground.value.copy(w.fog);floorUniforms.uGrid.value=w.grid*smooth(.5,1,intro);floorUniforms.uTime.value=this.elapsed;

    // Astronaut: a visitor standing in front of the work, seen from behind.
    const narrow=this.narrow();
    // He stands just off the left edge of the work: clear of the headline, never on the print.
    const viewing=this.focus>0||Boolean(this.focusMotion);
    if(!viewing)this.approach=THREE.MathUtils.damp(this.approach,this.hovered&&!this.isMoving()&&!this.calm&&!this.fpGoal?1:0,2.2,dt);
    if(this.astroIndex<0||this.calm)this.astroIndex=this.index;
    this.updateTeleport(dt,ov,viewing);
    if(this.fp>.72)this.curator.root.visible=false;
    // He belongs to one work at a time and stands just off its left edge.
    const home=this.astroIndex;
    const spot=this.anchor(home,this.anchorScratch);let goalX=spot.x,goalZ=spot.y;
    // While a work is open he simply stays where he is: no shuffling, no re-standing.
    if(viewing&&this.astroReady){goalX=this.astro.x;goalZ=this.astro.y;}
    // In the map he rides along with the card of his work.
    const mapSlot=this.mapSlots[home];let glide=false;
    if(ov>0&&mapSlot){const card=this.bays[home].screen.scale,k=smooth(0,1,ov*1.4-home/this.bays.length*.4);goalX=mix(goalX,mapSlot.x-card.x/2-.9,k);goalZ=mix(goalZ,mapSlot.z+card.y*.15,k);glide=true;}
    // A low-gravity leap: crouch, a long floating arc with the knees tucked, a soft landing.
    let lift=0,tuck=0;
    const hop=this.hop;
    if(hop){
      const u=smooth(.12,.9,hop.t),arc=Math.sin(Math.PI*THREE.MathUtils.clamp((hop.t-.12)/.78,0,1));
      goalX=mix(hop.fromX,hop.toX,u);goalZ=mix(hop.fromZ,hop.toZ,u);lift=arc*hop.height;
      tuck=arc*.38+smooth(0,.08,hop.t)*(1-smooth(.1,.16,hop.t))*.22+smooth(.88,.93,hop.t)*(1-smooth(.95,1,hop.t))*.24;
    }
    this.landing=Math.max(0,this.landing-dt*2.2);
    if(!this.astroReady||this.calm||glide||hop||this.tele!=='here'){this.astro.set(goalX,goalZ);this.astroReady=true;}
    const px=this.astro.x,pz=this.astro.y;
    this.astro.x=THREE.MathUtils.damp(this.astro.x,goalX,7,dt);this.astro.y=THREE.MathUtils.damp(this.astro.y,goalZ,3.5,dt);
    const stepX=hop?hop.toX-hop.fromX:this.astro.x-px,stepZ=hop?hop.toZ-hop.fromZ:this.astro.y-pz,stride=hop?0:dt>0?Math.hypot(stepX,stepZ)/dt:0;
    this.walk=THREE.MathUtils.damp(this.walk,this.calm?0:Math.min(1,stride/2),6,dt);
    this.phase+=dt*mix(1.1,10.5,this.walk);
    const root=this.curator.root;
    root.position.set(this.astro.x,(root.userData.soleOffset??0)+lift,this.astro.y);
    this.contact.position.set(this.astro.x,.02,this.astro.y);this.contact.scale.setScalar(1/(1+lift*.5));
    // Left alone he turns to greet you, then looks up at the stars.
    const idle=this.calm||intro<1||viewing||ov>0||this.fp>0||hop?0:(time-this.lastActivity)/1000;
    // Moods ease in and out, so he gets up like a person, not like a switch.
    const ease=(v:number,goal:number,up:number,down:number)=>THREE.MathUtils.damp(v,goal,goal>v?up:down,dt);
    this.greetW=ease(this.greetW,smooth(9,9.8,idle)*(1-smooth(15,15.8,idle)),3,4);
    this.waveW=ease(this.waveW,smooth(9.8,10.3,idle)*(1-smooth(13.2,13.8,idle)),4,6);
    this.starW=ease(this.starW,smooth(16,17.5,idle),1.5,2.5);
    this.sitW=ease(this.sitW,smooth(23,25.5,idle),.85,1.6);
    // Tablet: a glance at it early in a quiet moment, and in hand for every teleport.
    const checking=smooth(4.5,5.3,idle)*(1-smooth(8.2,9,idle));
    const beaming=this.tele==='leaving'?1-smooth(.75,.95,this.teleT):this.tele==='arriving'?1-smooth(.35,.7,this.teleT):0;
    this.tabletW=ease(this.tabletW,Math.max(checking,beaming),this.tele==='leaving'?9:3,3);
    this.tabletFlash=this.tele==='leaving'?smooth(.22,.3,this.teleT)*(1-smooth(.34,.6,this.teleT)):this.tabletFlash*.9;
    const greet=this.greetW,wave=this.waveW,stargaze=this.starW,sit=Math.max(this.sitW,tuck);
    const toCamera=Math.atan2(this.camera.position.x-this.astro.x,this.camera.position.z-this.astro.y);
    const turnTo=(from:number,to:number,amount:number)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*amount;
    // During the opening he first faces us, then turns to the work.
    let facing=mix(-.25,2.3-this.smoothPointer.x*.2,smooth(.5,.85,intro));
    facing=turnTo(facing,toCamera,greet);facing=turnTo(facing,toCamera+.7,stargaze);
    if(this.walk>.3&&stride>.6)facing=Math.atan2(stepX,stepZ);
    if(hop&&Math.hypot(stepX,stepZ)>.1)facing=Math.atan2(stepX,stepZ);
    root.rotation.y=turnTo(root.rotation.y,facing,1-Math.exp(-dt*(intro<1?3:5)));
    const attention=this.calm?0:(.35+.25*Math.sin(this.phase*.3))*(1-this.walk);
    let pose:{yaw?:number;pitch?:number;wave?:number}|undefined;
    if(this.torchPower>.05&&!viewing){
      const dx=this.torchPoint.x-this.astro.x,dy=this.torchPoint.y-1.75,dz=this.torchPoint.z-this.astro.y;
      const yaw=Math.atan2(Math.sin(Math.atan2(dx,dz)-root.rotation.y),Math.cos(Math.atan2(dx,dz)-root.rotation.y));
      pose={yaw:THREE.MathUtils.clamp(yaw,-1.15,1.15)*this.torchPower,pitch:-Math.atan2(dy,Math.hypot(dx,dz))*.8*this.torchPower};
    }
    if(greet>.01)pose={yaw:(pose?.yaw??0)*(1-greet),pitch:-.08*greet,wave};
    if(stargaze>.01)pose={yaw:.25*stargaze,pitch:-.8*stargaze};
    if(ov>.3)pose={yaw:0,pitch:-.9*smooth(.3,.8,ov)};
    if(sit>.001)pose={...(pose??{}),sit,pitch:(pose?.pitch??0)*.7-.25*sit};
    if(this.tabletW>.01){const t=this.tabletW;pose={...(pose??{}),tablet:t,yaw:mix(pose?.yaw??0,-.28,t),pitch:mix(pose?.pitch??0,.5,t)};}
    const visor=root.userData.visorUniforms;if(visor)(visor.uVisorTint.value as THREE.Color).copy(this.tint).lerp(new THREE.Color('#8fa9c9'),.5);
    this.curator.animate(this.phase,this.walk,this.smoothPointer.x*.6,this.calm?0:dt,attention,pose);
    this.placeTablet(time);
    this.column.position.set(this.astro.x,2.1,this.astro.y);this.ring.position.set(this.astro.x,.03,this.astro.y);
    const beam=this.tele==='leaving'?smooth(.3,.55,this.teleT)*(1-smooth(.85,1,this.teleT)):this.tele==='arriving'?smooth(0,.12,this.teleT)*(1-smooth(.55,1,this.teleT)):0;
    this.column.material.uniforms.uIntensity.value=beam;this.column.material.uniforms.uTime.value=this.elapsed;this.column.visible=beam>.001;
    const puff=Math.max(beam,this.landing*.5*(1-this.fp));
    this.ring.material.uniforms.uIntensity.value=puff;this.ring.material.uniforms.uTime.value=this.elapsed;this.ring.visible=puff>.001;
    (this.contact.material as THREE.MeshBasicMaterial).opacity=(1-this.dissolve.uDissolve.value)*(1-this.fp);

    // Camera: a low, slightly oblique view so the row recedes into the dark.
    const crane=1-smooth(0,1,intro)**.7;
    if(narrow){this.cameraGoal.set(x+this.smoothPointer.x*.35*parallax,3.5+crane*2.4,17.5+crane*7);this.look.set(x,3.05+crane*.8,0);}
    else{
      this.cameraGoal.set(x-4.6+this.smoothPointer.x*.9*parallax+crane*2.5,1.75+this.smoothPointer.y*.3*parallax+crane*2.6,12.6+crane*8);
      this.look.set(x-1.3+crane*1.2,2.45+crane*.6,0);
    }
    // Through his eyes: the camera rides in his helmet, and follows every leap.
    if(this.fp>0){
      const hopNow=this.hop,from=this.astroIndex,to=hopNow?hopNow.index:from,blend=hopNow?smooth(.15,.85,hopNow.t):0;
      const lookX=mix(from*GAP,to*GAP,blend),lookY=mix(this.bays[from].screen.position.y,this.bays[to].screen.position.y,blend);
      const root=this.curator.root;
      this.fpEye.set(this.astro.x,root.position.y+2.18+Math.sin(this.elapsed*1.15)*.012-this.landing*.16,this.astro.y);
      if(this.tilt&&this.mobile){this.lookGoal.x=THREE.MathUtils.clamp(this.lookGoal.x*.98+this.tilt.x*.012,-1.3,1.3);}
      this.lookYaw=THREE.MathUtils.damp(this.lookYaw,this.lookGoal.x,4,dt);this.lookPitch=THREE.MathUtils.damp(this.lookPitch,this.lookGoal.y,4,dt);
      const dx=lookX-this.fpEye.x,dy=lookY-this.fpEye.y,dz=-this.fpEye.z;
      const yaw=Math.atan2(dx,dz)+this.lookYaw,pitch=Math.atan2(dy,Math.hypot(dx,dz))+this.lookPitch;
      this.fpLook.set(this.fpEye.x+Math.sin(yaw)*Math.cos(pitch)*10,this.fpEye.y+Math.sin(pitch)*10,this.fpEye.z+Math.cos(yaw)*Math.cos(pitch)*10);
      const k=this.fp;this.cameraGoal.lerp(this.fpEye,k);this.look.lerp(this.fpLook,k);
    }
    const fov=mix(this.narrow()?46:38,this.narrow()?68:58,this.fp);
    if(Math.abs(this.camera.fov-fov)>.01){this.camera.fov=fov;this.camera.updateProjectionMatrix();}
    const bay=this.bays[this.index],screen=bay.screen,centre=this.index*GAP;
    const halfFov=Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2));
    const distance=Math.max(screen.scale.y/(2*halfFov*.74),screen.scale.x/(2*halfFov*this.camera.aspect*.86));
    this.focusLook.set(centre,screen.position.y,0);
    this.focusCamera.set(centre,screen.position.y,distance);
    if(this.focusMotion?.to===1){this.cameraGoal.copy(this.focusOrigin);this.look.copy(this.focusLookOrigin);}
    this.cameraGoal.lerp(this.focusCamera,this.focus);this.look.lerp(this.focusLook,this.focus);
    if(ov>0){this.cameraGoal.lerp(this.overviewCam,ov);this.look.lerp(this.overviewLook,ov);}
    if(this.calm||this.focus>0||ov>0||this.fp>0)this.camera.position.copy(this.cameraGoal);
    else this.camera.position.lerp(this.cameraGoal,1-Math.exp(-dt*(intro<1?2.2:4.5)));
    this.camera.lookAt(this.look);
    if(!this.calm&&!narrow&&ov===0&&this.fp===0)this.camera.rotation.z+=THREE.MathUtils.clamp(this.velocity,-2,2)*-.012*(1-this.focus);
    // Torch: where the pointer's ray meets the wall of prints, or the floor below it.
    const torchOn=this.pointerInside&&time-this.pointerMovedAt<(this.mobile?900:4500)&&this.focus<.5&&ov<.05&&this.fp<.05&&intro>=.6;
    this.torchPower=THREE.MathUtils.damp(this.torchPower,torchOn?1:0,torchOn?4:1.2,dt);
    if(this.torchPower>.001){
      this.raycaster.setFromCamera(this.pointer,this.camera);const ray=this.raycaster.ray,goal=this.torchGoal;
      let found=false;
      if(ray.direction.z<-.01){goal.copy(ray.origin).addScaledVector(ray.direction,(.35-ray.origin.z)/ray.direction.z);found=goal.y>.05;}
      if(!found&&ray.direction.y<-.01){goal.copy(ray.origin).addScaledVector(ray.direction,Math.min(60,-ray.origin.y/ray.direction.y));found=true;}
      if(found)this.torchPoint.lerp(goal,1-Math.exp(-dt*9));
    }
    const tp=this.torchPoint,power=this.torchPower;
    this.torch.position.set(tp.x,tp.y+.8,tp.z+1.4);this.torch.intensity=9*power;
    // A follow-spot from the rig above keeps the light visible as a beam.
    this.followSpot.visible=power>.01;
    if(this.followSpot.visible){
      const from=this.followFrom.set(tp.x-1.2,11,tp.z+3.5);const length=from.distanceTo(tp);
      this.followSpot.position.copy(from);this.followSpot.lookAt(tp);this.followSpot.children[0].scale.set(1,length,1);
      const beam=(this.followSpot.children[0] as THREE.Mesh<THREE.ConeGeometry,Shader>).material.uniforms;
      beam.uIntensity.value=power*(this.mobile?.08:.1);beam.uTime.value=this.elapsed;(beam.uTint.value as THREE.Color).copy(this.torch.color);
    }this.torch.color.copy(this.tint).lerp(new THREE.Color(1,.95,.88),.6);
    (floorUniforms.uTorch.value as THREE.Vector4).set(tp.x,tp.y,tp.z,power*(tp.y<.6?1:.45));

    this.tint.lerp(bay.tint,1-Math.exp(-dt*2.5));
    this.key.color.copy(this.tint);this.key.position.set(this.astro.x+1.1,10,this.astro.y+3.6);this.key.target.position.set(this.astro.x,0,this.astro.y);
    const lamp=smooth(.08,.3,intro);
    this.key.intensity=38*(1-this.focus*.7)*lamp;
    this.rim.color.copy(this.tint);this.rim.position.set(x+1,6,-6);this.rim.target.position.set(this.astro.x,1,this.astro.y);
    this.rim.intensity=3.2*(1-this.focus*.7)*lamp;this.ambient.intensity=.35*(1-this.focus*.6)*lamp;

    // A tired bulb warming up: the first beam stutters before it holds.
    const warm=smooth(.12,.42,intro);
    const stutter=intro>=.42?1:warm*(Math.sin(this.elapsed*37.)>.15-warm*.9?1:.25);
    const revealGate=smooth(.35,.5,intro);
    const settled=time-this.settledAt>450;
    this.bays.forEach((bay,i)=>{
      const near=Math.abs(i*GAP-x)<GAP*3.2||ov>0;bay.group.visible=near;if(!near)return;
      const isCurrent=i===this.index;
      bay.active=THREE.MathUtils.damp(bay.active,isCurrent?1:0,this.calm?100:3.2,dt);
      bay.hover=THREE.MathUtils.damp(bay.hover,isCurrent&&this.previewIndex===i&&!this.previewAuto?1:0,4,dt);
      if(bay.texture&&bay.reveal<1&&revealGate>.99)bay.reveal=this.calm?1:Math.min(1,bay.reveal+dt/1.5);
      const focusOthers=isCurrent?1:1-this.focus;
      const u=bay.screen.material.uniforms;
      u.uTime.value=this.elapsed;u.uReveal.value=bay.reveal;u.uShift.value=this.shift;u.uHover.value=bay.hover;
      u.uBend.value=this.shift*.55*(1-this.focus);
      u.uDim.value=(1-bay.active)*(1-this.focus*(isCurrent?1:0))+(isCurrent?0:this.focus);
      u.uLight.value=focusOthers;
      (u.uGlare.value as THREE.Vector3).set((tp.x-i*GAP)/bay.screen.scale.x+.5,(tp.y-bay.screen.position.y)/bay.screen.scale.y+.5,power*(tp.y>.3?1:.35)*(1-this.focus));
      u.uHolo.value=ROOMS[bay.room].holo*(isCurrent?mix(.3,0,this.focus):1)*(this.calm?.4:1);
      const room=ROOMS[bay.room];
      let light=(.22+.78*bay.active)*bay.reveal*focusOthers;
      if(ov>0){
        light=mix(light,(this.mapHover===i?1:.55)*bay.reveal,ov);
        u.uDim.value=mix(u.uDim.value,this.mapHover===i?0:.28,ov);u.uHolo.value*=1-ov;u.uBend.value*=1-ov;
      }
      const soften=mix(1.15,.35,bay.lum);
      bay.halo.material.uniforms.uIntensity.value=light*.24*(1-this.focus*.6)*soften;
      bay.beam.material.uniforms.uIntensity.value=light*(this.mobile?.12:.15)*(1-this.focus)*room.beam*(isCurrent?stutter:lamp)*(1-ov);
      bay.beam.material.uniforms.uTime.value=this.elapsed;
      bay.pool.material.uniforms.uIntensity.value=light*.13*soften*(1-ov);
      // Objects turn slowly, like pieces on a plinth.
      bay.group.rotation.y=bay.room===1&&!this.calm?Math.sin(this.elapsed*.32+i*1.7)*.11*(1-this.focus)*(1-ov):0;
      // Cards lift off the wall one after another and settle into the map.
      const slot=this.mapSlots[i];
      if(ov>0&&slot){
        const local=smooth(0,1,ov*1.4-i/this.bays.length*.4),cy=bay.screen.position.y;
        bay.group.position.set(mix(i*GAP,slot.x,local),mix(0,slot.y,local)+Math.sin(local*Math.PI)*1.8+(this.mapHover===i?.5*ov:0),mix(0,slot.z+cy,local));
        bay.group.rotation.x=-Math.PI/2*local;
      }else{bay.group.position.set(i*GAP,0,0);bay.group.rotation.x=0;}
      if(bay.projector){
        const playing=this.previewIndex===i&&this.previewTexture?1:.35;
        bay.projector.material.uniforms.uIntensity.value=light*.06*playing*(1-this.focus)*(1-ov);
        bay.projector.material.uniforms.uTime.value=this.elapsed;
      }
    });

    // The cinema room plays its films as soon as you stop in front of one.
    const work=archiveWorks[this.index];
    if(settled&&!this.calm&&this.focus===0&&ov===0&&intro>=1&&bay.room===2&&work.video&&this.previewIndex!==this.index&&!this.autoplayBlocked.has(this.index)&&this.autoplayAllowed())this.previewFilm(true);

    const pr=this.renderer.getPixelRatio();
    this.stars.position.x=x*.92;const stars=this.stars.material.uniforms;stars.uTime.value=this.elapsed;stars.uPixelRatio.value=pr;stars.uLight.value=smooth(0,.5,intro)*(1-w.grid*.5);
    const dust=this.dust.material.uniforms;(dust.uTorch.value as THREE.Vector4).set(tp.x,tp.y,tp.z,power);dust.uTime.value=this.elapsed;dust.uCamX.value=x;dust.uPixelRatio.value=pr;dust.uFocus.value=this.focus;dust.uAmount.value=w.dust*smooth(.1,.5,intro);
    this.floor.position.x=x;if(this.plainFloor)this.plainFloor.position.x=x;
    const film=this.finish.uniforms;film.uTime.value=this.calm?0:this.elapsed;film.uShift.value=this.shift;
    film.uExposure.value=smooth(0,.35,intro)*.85+.15*smooth(.02,.1,intro);
    this.bloom.strength=w.bloom+this.shift*.25;
    this.onFrame?.({speed:Math.abs(this.velocity),rooms:this.roomWeights,focus:this.focus,lamp:intro<.12?0:intro>=.42?1:stutter});
    const movingNow=this.isMoving();
    if(this.wasMoving&&!movingNow&&this.focus===0)this.onSettle?.(bay.room);
    this.wasMoving=movingNow;
    this.composer.render(dt);
  }

  private watchQuality(time:number){
    const gap=time-this.lastRenderAt;this.lastRenderAt=time;
    if(time<this.qualityFrom||gap>250||this.quality>=3)return;
    this.frameTimes.push(gap);if(this.frameTimes.length<90)return;
    const average=this.frameTimes.reduce((a,b)=>a+b,0)/this.frameTimes.length;this.frameTimes.length=0;
    if(average<(this.mobile?42:30))return;
    this.quality++;this.qualityFrom=time+2500;
    // Step down in the order you notice least: glow, then the mirror floor, then resolution.
    if(this.quality===1)this.bloom.enabled=false;
    if(this.quality===3)this.resize();
    if(this.quality===2){
      this.floor.visible=false;
      this.plainFloor=new THREE.Mesh(new THREE.PlaneGeometry(260,120),new THREE.MeshBasicMaterial({color:this.background}));
      this.plainFloor.rotation.x=-Math.PI/2;this.plainFloor.position.z=-20;this.scene.add(this.plainFloor);
    }
  }

  private autoplayAllowed(){
    const connection=(navigator as any).connection;
    return !(connection?.saveData||/(^|-)2g$/.test(connection?.effectiveType??''));
  }

  async start(index=0){
    this.index=index;this.position=this.target=index*GAP;
    this.bays.forEach((bay,i)=>{bay.group.visible=Math.abs(i-index)<3;bay.active=i===index?1:0;});
    this.camera.position.set(this.position-4.6,1.75,12.6);this.look.set(this.position-1.3,2.45,0);this.camera.lookAt(this.look);
    if(this.intro<1){this.camera.position.add(new THREE.Vector3(2.5,2.6,8));this.curator.root.rotation.y=-.25;}
    await this.prepare(index);if(this.disposed)return;
    void this.prepare(index-1);void this.prepare(index+1);void this.prepare(index+2);
    await this.renderer.compileAsync(this.scene,this.camera);
    if(this.disposed)return;
    this.lastTime=this.lastActivity=performance.now();this.qualityFrom=this.lastTime+4000;
    this.frame=requestAnimationFrame(this.tick);
    this.curator.load(()=>!this.isMoving()).then(()=>{if(this.disposed)this.curator.dispose();else this.makeDissolvable(this.curator.root);});
  }

  focusWork(){
    this.skipIntro();this.dragging=false;this.hovered=false;this.lastActivity=performance.now();
    if(!this.previewAuto)this.stopPreview();
    this.target=this.index*GAP;
    this.focusOrigin.copy(this.camera.position);this.focusLookOrigin.copy(this.look);
    return this.moveFocus(1);
  }
  restoreView(){this.lastActivity=performance.now();return this.moveFocus(0);}
  private moveFocus(to:number){
    this.focusMotion?.resolve();this.focusMotion=undefined;
    if(this.disposed||this.isCalm()){this.focus=to;return Promise.resolve();}
    return new Promise<void>(resolve=>{this.focusMotion={from:this.focus,to,start:performance.now(),duration:this.mobile?560:900,resolve};});
  }

  /** Viewport rectangle of the selected work, used to hand the image over to the DOM viewer. */
  screenRect(){
    const screen=this.bays[this.index].screen;screen.updateWorldMatrix(true,false);
    const rect=this.host.getBoundingClientRect();let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    for(const [cx,cy] of [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]){
      const point=new THREE.Vector3(cx,cy,0).applyMatrix4(screen.matrixWorld).project(this.camera);
      const px=rect.left+(point.x+1)/2*rect.width,py=rect.top+(1-point.y)/2*rect.height;
      left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
    }
    return new DOMRect(left,top,right-left,bottom-top);
  }
  aspect(){const s=this.bays[this.index].screen.scale;return s.x/s.y;}

  hit(clientX:number,clientY:number){
    const rect=this.host.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),this.camera);
    return this.raycaster.intersectObject(this.bays[this.index].screen,false).length>0;
  }
  /** Muted film on the frame: on hover everywhere, automatically in the cinema room. */
  previewFilm(auto=false){
    const work=archiveWorks[this.index];
    if(this.previewIndex===this.index)return;
    if(!work.video||this.isCalm()||this.isMoving()||(!auto&&this.mobile)){if(!work.video&&!this.isMoving()){this.stopPreview();this.previewIndex=this.index;this.previewAuto=false;}return;}
    this.stopPreview();
    const video=document.createElement('video');video.src=work.video;video.muted=true;video.loop=true;video.playsInline=true;video.preload='auto';
    video.setAttribute('playsinline','');
    const index=this.index;
    this.preview=video;this.previewIndex=index;this.previewAuto=auto;
    video.addEventListener('playing',()=>{
      if(this.preview!==video)return;
      this.previewTexture=new THREE.VideoTexture(video);this.previewTexture.colorSpace=THREE.SRGBColorSpace;
      this.bays[index].screen.material.uniforms.uMap.value=this.previewTexture;
    },{once:true});
    // Low Power Mode and data savers refuse autoplay; remember, never retry every frame.
    video.play().catch(()=>{if(auto)this.autoplayBlocked.add(index);if(this.preview===video)this.stopPreview();});
  }
  /** Hover ended: hover previews stop, the cinema room keeps playing. */
  endHover(){if(!this.previewAuto)this.stopPreview();}
  stopPreview(){
    if(this.preview){this.preview.pause();this.preview.removeAttribute('src');this.preview.load();}
    if(this.previewIndex>=0){const bay=this.bays[this.previewIndex];bay.screen.material.uniforms.uMap.value=bay.texture??this.placeholder;}
    this.previewTexture?.dispose();this.preview=undefined;this.previewTexture=undefined;this.previewIndex=-1;this.previewAuto=false;
  }
  resize(){
    const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);
    this.camera.aspect=w/h;this.camera.fov=w<650?46:38;this.camera.updateProjectionMatrix();
    const size=this.drawingSize();const ratio=size.x/w;
    this.renderer.setPixelRatio(ratio);this.renderer.setSize(w,h);
    this.composer?.setPixelRatio(ratio);this.composer?.setSize(w,h);
    this.floor?.getRenderTarget().setSize(Math.round(size.x*(this.mobile?.35:.5)),Math.round(size.y*(this.mobile?.35:.5)));
    this.finish?.uniforms.uResolution.value.set(size.x,size.y);
  }
  pause(){cancelAnimationFrame(this.frame);this.stopPreview();}
  resume(){if(!this.disposed){cancelAnimationFrame(this.frame);this.lastTime=this.lastActivity=performance.now();this.frame=requestAnimationFrame(this.tick);}}
  dispose(){
    if(this.disposed)return;this.disposed=true;this.focusMotion?.resolve();this.focusMotion=undefined;this.introResolve?.();this.pause();this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);
    const geometries=new Set<THREE.BufferGeometry>();const materials=new Set<THREE.Material>();const textures=new Set<THREE.Texture>();
    this.scene.traverse(obj=>{const mesh=obj as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){materials.add(mat);
      for(const value of Object.values(mat))if(value instanceof THREE.Texture)textures.add(value);
      const uniforms=(mat as Shader).uniforms;if(uniforms)for(const u of Object.values(uniforms))if(u.value instanceof THREE.Texture)textures.add(u.value);}});
    this.bays.forEach(bay=>{if(bay.texture)textures.add(bay.texture);});
    this.floor.dispose();
    textures.forEach(texture=>texture.dispose());materials.forEach(mat=>mat.dispose());geometries.forEach(geo=>geo.dispose());
    this.composer.dispose();this.bloom.dispose();this.environment.dispose();
    this.placeholder.dispose();this.curator.dispose();
    this.renderer.dispose();this.renderer.domElement.remove();
  }
}
