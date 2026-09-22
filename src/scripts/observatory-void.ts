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
  tint:THREE.Color;reveal:number;active:number;hover:number;
};

const screenVertex=`uniform float uBend;uniform float uHover;varying vec2 vUv;
void main(){vUv=uv;vec3 p=position;
  p.z-=p.x*p.x*uBend*3.;
  p.z+=sin(uv.x*3.14159)*sin(uv.y*3.14159)*uHover*.08;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const screenFragment=`uniform sampler2D uMap;uniform float uTime,uShift,uReveal,uDim,uHover,uLight;uniform vec3 uTint;varying vec2 vUv;
${NOISE}
void main(){
  vec2 uv=(vUv-.5)*(1.-.025*uHover)+.5;
  vec2 off=vec2(uShift*.011,0.);
  vec3 col=vec3(texture2D(uMap,uv+off).r,texture2D(uMap,uv).g,texture2D(uMap,uv-off).b);
  float grey=dot(col,vec3(.2126,.7152,.0722));
  col=mix(col,vec3(grey),uDim*.65)*(1.-uDim*.66)*uLight;
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
const poolFragment=`uniform vec3 uTint;uniform float uIntensity;varying vec2 vUv;
void main(){vec2 p=vUv-.5;float g=exp(-dot(p,p)*11.);gl_FragColor=vec4(uTint*g*uIntensity,1.);}`;

const floorShader={
  name:'ObservatoryWetFloor',
  uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},uTime:{value:0},uBackground:{value:new THREE.Color()},uBlur:{value:.012}},
  vertexShader:`uniform mat4 textureMatrix;varying vec4 vProj;varying vec3 vWorld;
    void main(){vProj=textureMatrix*vec4(position,1.);vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime;uniform float uBlur;uniform vec3 uBackground;varying vec4 vProj;varying vec3 vWorld;
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
      vec3 col=vec3(.009,.010,.013)+acc*fresnel*(.8+wet*.35);
      col+=(fine-.5)*.006;
      float dist=length(cameraPosition.xz-vWorld.xz);
      col=mix(col,uBackground,smoothstep(22.,70.,dist));
      gl_FragColor=vec4(col,1.);
      #include <colorspace_fragment>
    }`,
};

const finishShader={
  name:'ObservatoryFilm',
  uniforms:{tDiffuse:{value:null},uTime:{value:0},uShift:{value:0},uGrain:{value:.045},uResolution:{value:new THREE.Vector2(1,1)},uVignette:{value:.62}},
  vertexShader:plainVertex,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime,uShift,uGrain,uVignette;uniform vec2 uResolution;varying vec2 vUv;
    float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
    void main(){
      vec2 d=vUv-.5;float r2=dot(d,d);
      float ca=(.0035+uShift*.028)*r2;
      vec3 c=vec3(texture2D(tDiffuse,vUv-d*ca).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv+d*ca*1.4).b);
      c*=mix(1.,uVignette,smoothstep(.06,.5,r2));
      float luma=dot(c,vec3(.2126,.7152,.0722));
      c+=(hash(floor(vUv*uResolution)+fract(uTime*7.)*917.)-.5)*uGrain*(.35+.65*(1.-smoothstep(0.,.6,luma)));
      gl_FragColor=vec4(max(c,0.),1.);
    }`,
};

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
  index=0;position=0;destination=0;startPosition=0;travelStart=0;travelling=false;
  velocity=0;shift=0;
  calm=false;mobile=false;disposed=false;
  frame=0;lastTime=0;phase=0;walk=0;elapsed=0;
  preview?:HTMLVideoElement;previewTexture?:THREE.VideoTexture;previewIndex=-1;
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
    const background=new THREE.Color(siteBackground);
    this.scene.background=background;
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
    const floorMaterial=this.floor.material as Shader;floorMaterial.uniforms.uBackground.value.copy(background);
    floorMaterial.uniforms.uBlur.value=this.mobile?.016:.012;
    this.scene.add(this.floor);

    this.stars=this.buildStars();this.scene.add(this.stars);
    this.dust=this.buildDust();this.scene.add(this.dust);
    this.buildBays();
    this.scene.add(this.curator.root);

    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
    const shadowCtx=shadowCanvas.getContext('2d')!;const gradient=shadowCtx.createRadialGradient(64,64,4,64,64,62);
    gradient.addColorStop(0,'rgba(0,0,0,.85)');gradient.addColorStop(.45,'rgba(0,0,0,.35)');gradient.addColorStop(1,'rgba(0,0,0,0)');
    shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,128,128);
    this.contact=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
    this.contact.rotation.x=-Math.PI/2;this.scene.add(this.contact);

    const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:this.mobile?2:4});
    this.composer=new EffectComposer(this.renderer,target);
    this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(size.x,size.y),.62,.62,.8);
    this.composer.addPass(this.bloom);
    this.finish=new ShaderPass(finishShader);this.composer.addPass(this.finish);
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
    const ratio=Math.min(devicePixelRatio||1,this.mobile?2:1.6,Math.sqrt(2400000/(w*h)));
    return new THREE.Vector2(Math.round(w*ratio),Math.round(h*ratio));
  }

  private buildStars(){
    let seed=41027;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
    const count=this.mobile?420:900;const positions=new Float32Array(count*3),sizes=new Float32Array(count);
    for(let i=0;i<count;i++){positions.set([(random()-.5)*300,6+random()*80,-70-random()*110],i*3);sizes[i]=random()>.95?3.2:1+random()*1.4;}
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
    const material=new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0},uPixelRatio:{value:1}},
      vertexShader:`attribute float aSize;uniform float uTime,uPixelRatio;varying float vA;
        void main(){vA=.45+.25*sin(position.x*3.1+uTime*.6);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uPixelRatio;}`,
      fragmentShader:`varying float vA;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vec3(.8,.87,1.)*vA*(1.-smoothstep(.05,.5,d)),1.);}`,
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
      uniforms:{uTime:{value:0},uCamX:{value:0},uPixelRatio:{value:1},uGap:{value:GAP},uFocus:{value:0}},
      vertexShader:`attribute float aSeed;uniform float uTime,uCamX,uPixelRatio,uGap,uFocus;varying float vA;
        void main(){vec3 p=position;
          p.x=uCamX+mod(p.x-uCamX+36.,72.)-36.+sin(uTime*.17+aSeed*31.)*.35;
          p.y=mod(p.y+uTime*(.04+aSeed*.07),9.)+.15;
          p.z+=cos(uTime*.13+aSeed*17.)*.3;
          float dx=abs(mod(p.x+uGap*.5,uGap)-uGap*.5);
          float beam=exp(-dx*dx/9.)*exp(-(p.z+1.5)*(p.z+1.5)/14.)*smoothstep(0.,2.5,p.y);
          vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
          gl_PointSize=clamp((.7+aSeed*1.6)*uPixelRatio*16./-mv.z,.5,6.);
          vA=(.035+beam*.75)*(.55+.45*sin(uTime*.8+aSeed*50.))*(1.-uFocus*.8);}`,
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
        uniforms:{uMap:{value:this.placeholder},uTime:{value:0},uShift:{value:0},uReveal:{value:0},uDim:{value:1},uHover:{value:0},uLight:{value:1},uBend:{value:0},uTint:{value:tint.clone()}},
        vertexShader:screenVertex,fragmentShader:screenFragment,transparent:true,fog:false,
      }));
      screen.scale.set(w,h,1);screen.position.set(0,LIFT+h/2,0);screen.userData.index=i;group.add(screen);
      group.visible=false;
      this.bays.push({group,screen,halo,beam,pool,tint,reveal:0,active:0,hover:0});
    });
  }

  private layout(bay:Bay,width:number,height:number){
    bay.screen.scale.set(width,height,1);bay.screen.position.y=LIFT+height/2;
    bay.halo.scale.set(width+3.2,height+3.2,1);bay.halo.position.y=bay.screen.position.y;
    (bay.halo.material.uniforms.uSize.value as THREE.Vector2).set(width+3.2,height+3.2);
    bay.pool.scale.x=width*1.7;
  }

  async prepare(index:number){
    const bay=this.bays[index];if(!bay||bay.texture)return;
    if(bay.loading)return bay.loading;
    bay.loading=this.loader.loadAsync(archiveWorks[index].img).then(texture=>{
      if(this.disposed){texture.dispose();return;}
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
      bay.texture=texture;this.renderer.initTexture(texture);bay.screen.material.uniforms.uMap.value=texture;
      const image=texture.image as HTMLImageElement;const aspect=image.width/image.height;
      const vertical=aspect<1;
      const height=vertical?MAX_V:Math.min(MAX_H,MAX_W/aspect);
      this.layout(bay,height*aspect,height);
      // The average colour of each work becomes the colour of its light.
      const probe=document.createElement('canvas');probe.width=probe.height=6;
      const ctx=probe.getContext('2d',{willReadFrequently:true});
      if(ctx){
        ctx.drawImage(image,0,0,6,6);const data=ctx.getImageData(0,0,6,6).data;let r=0,g=0,b=0;
        for(let p=0;p<data.length;p+=4){r+=data[p];g+=data[p+1];b+=data[p+2];}
        const peak=Math.max(r,g,b,1);bay.tint.setRGB(r/peak,g/peak,b/peak,THREE.SRGBColorSpace).lerp(new THREE.Color(1,1,1),.35);
        [bay.screen,bay.halo,bay.beam,bay.pool].forEach(mesh=>(mesh.material.uniforms.uTint.value as THREE.Color).copy(bay.tint));
      }
      if(this.calm)bay.reveal=1;
    }).catch(()=>{bay.reveal=1;});
    return bay.loading;
  }

  private render(time:number){
    if(this.disposed)return;
    this.frame=requestAnimationFrame(this.tick);
    if(document.hidden)return;
    if(this.mobile&&time-this.lastTime<1000/30-1)return;
    const dt=Math.min((time-this.lastTime)/1000,.05);this.lastTime=time;
    this.calm=this.isCalm();
    if(this.calm){if(this.preview)this.stopPreview();if(this.travelling){this.position=this.destination;this.travelling=false;}}
    else this.elapsed+=dt;
    if(this.focusMotion){
      const m=this.focusMotion,t=Math.min(1,(time-m.start)/m.duration),e=t<.5?4*t**3:1-(-2*t+2)**3/2;
      this.focus=THREE.MathUtils.lerp(m.from,m.to,e);
      if(t===1){this.focusMotion=undefined;m.resolve();}
    }
    const previous=this.position;let progress=1;
    if(this.travelling){
      progress=Math.min((time-this.travelStart)/1500,1);
      const eased=progress<.5?8*progress**4:1-(-2*progress+2)**4/2;
      this.position=THREE.MathUtils.lerp(this.startPosition,this.destination,eased);
      if(progress>=1)this.travelling=false;
    }
    const x=this.position;
    this.velocity=dt>0?(x-previous)/dt/GAP:0;
    this.shift=THREE.MathUtils.damp(this.shift,this.calm?0:Math.min(1,Math.abs(this.velocity)*.55),10,dt);
    const moving=!this.calm&&Math.abs(x-previous)>.001;
    this.walk=THREE.MathUtils.damp(this.walk,moving?1:0,8,dt);
    this.phase+=dt*(moving?10.5:1.1);
    this.smoothPointer.lerp(this.pointer,1-Math.exp(-dt*3));
    const parallax=this.calm?0:1;

    // Astronaut: a visitor standing in front of the work, seen from behind.
    const attention=this.calm?0:(.35+.25*Math.sin(this.phase*.3))*(1-this.walk);
    this.curator.animate(this.phase,this.walk,this.smoothPointer.x*.6,this.calm?0:dt,attention);
    const narrow=this.narrow();
    this.curator.root.position.set(x-(narrow?2.2:5.35),(this.curator.root.userData.soleOffset??0),narrow?3.2:.9+Math.sin(progress*Math.PI)*.6);
    this.contact.position.set(this.curator.root.position.x,.02,this.curator.root.position.z);
    const facing=moving?(this.destination>this.startPosition?Math.PI/2:-Math.PI/2):2.55-this.smoothPointer.x*.25;
    this.curator.root.rotation.y=THREE.MathUtils.damp(this.curator.root.rotation.y,facing,5,dt);

    // Camera: a low, slightly oblique view so the row recedes into the dark.
    if(narrow){this.cameraGoal.set(x+this.smoothPointer.x*.35*parallax,3.5,17.5);this.look.set(x,3.05,0);}
    else{
      this.cameraGoal.set(x-4.6+this.smoothPointer.x*.9*parallax,1.75+this.smoothPointer.y*.3*parallax,12.6);
      this.look.set(x-1.3,2.45,0);
    }
    const screen=this.bays[this.index].screen;
    const halfFov=Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2));
    const distance=Math.max(screen.scale.y/(2*halfFov*.74),screen.scale.x/(2*halfFov*this.camera.aspect*.86));
    this.focusLook.set(this.destination,screen.position.y,0);
    this.focusCamera.set(this.destination,screen.position.y,distance);
    if(this.focusMotion?.to===1){this.cameraGoal.copy(this.focusOrigin);this.look.copy(this.focusLookOrigin);}
    this.cameraGoal.lerp(this.focusCamera,this.focus);this.look.lerp(this.focusLook,this.focus);
    if(this.calm||this.focus>0)this.camera.position.copy(this.cameraGoal);
    else this.camera.position.lerp(this.cameraGoal,1-Math.exp(-dt*4.5));
    this.camera.lookAt(this.look);
    if(!this.calm&&!narrow)this.camera.rotation.z+=this.velocity*-.012*(1-this.focus);

    const current=this.bays[this.index];
    this.tint.lerp(current.tint,1-Math.exp(-dt*2.5));
    this.key.color.copy(this.tint);this.key.position.set(x-4.2,10,4.5);this.key.target.position.set(x-5.3,0,.9);
    this.key.intensity=38*(1-this.focus*.7);
    this.rim.color.copy(this.tint);this.rim.position.set(x+1,6,-6);this.rim.target.position.set(x-5.3,1,.9);
    this.rim.intensity=3.2*(1-this.focus*.7);this.ambient.intensity=.35*(1-this.focus*.6);

    this.bays.forEach((bay,i)=>{
      const near=Math.abs(i*GAP-x)<GAP*3.2;bay.group.visible=near;if(!near)return;
      const isCurrent=i===this.index;
      bay.active=THREE.MathUtils.damp(bay.active,isCurrent?1:0,this.calm?100:3.2,dt);
      bay.hover=THREE.MathUtils.damp(bay.hover,isCurrent&&this.previewIndex===i?1:0,4,dt);
      if(bay.texture&&bay.reveal<1)bay.reveal=this.calm?1:Math.min(1,bay.reveal+dt/1.5);
      const focusOthers=isCurrent?1:1-this.focus;
      const u=bay.screen.material.uniforms;
      u.uTime.value=this.elapsed;u.uReveal.value=bay.reveal;u.uShift.value=this.shift;u.uHover.value=bay.hover;
      u.uBend.value=this.shift*.55*(1-this.focus);
      u.uDim.value=(1-bay.active)*(1-this.focus*(isCurrent?1:0))+(isCurrent?0:this.focus);
      u.uLight.value=focusOthers;
      const light=(.22+.78*bay.active)*bay.reveal*focusOthers;
      bay.halo.material.uniforms.uIntensity.value=light*.24*(1-this.focus*.6);
      bay.beam.material.uniforms.uIntensity.value=light*(this.mobile?.12:.15)*(1-this.focus);
      bay.beam.material.uniforms.uTime.value=this.elapsed;
      bay.pool.material.uniforms.uIntensity.value=light*.13;
    });

    const pr=this.renderer.getPixelRatio();
    this.stars.position.x=x*.92;this.stars.material.uniforms.uTime.value=this.elapsed;this.stars.material.uniforms.uPixelRatio.value=pr;
    const dust=this.dust.material.uniforms;dust.uTime.value=this.elapsed;dust.uCamX.value=x;dust.uPixelRatio.value=pr;dust.uFocus.value=this.focus;
    (this.floor.material as Shader).uniforms.uTime.value=this.elapsed;
    this.floor.position.x=x;
    const film=this.finish.uniforms;film.uTime.value=this.calm?0:this.elapsed;film.uShift.value=this.shift;
    this.bloom.strength=.62+this.shift*.25;
    this.composer.render(dt);
  }

  async start(index=0){
    this.index=index;this.position=this.destination=this.startPosition=index*GAP;
    this.bays.forEach((bay,i)=>{bay.group.visible=Math.abs(i-index)<3;bay.active=i===index?1:0;});
    this.camera.position.set(this.position-4.6,1.75,12.6);this.look.set(this.position-1.3,2.45,0);this.camera.lookAt(this.look);
    await this.prepare(index);if(this.disposed)return;
    void this.prepare(index-1);void this.prepare(index+1);void this.prepare(index+2);
    await this.renderer.compileAsync(this.scene,this.camera);
    if(this.disposed)return;
    this.lastTime=performance.now();
    this.frame=requestAnimationFrame(this.tick);
    this.curator.load(()=>!this.travelling).then(()=>{if(this.disposed)this.curator.dispose();});
  }

  focusWork(){
    this.stopPreview();this.focusOrigin.copy(this.camera.position);this.focusLookOrigin.copy(this.look);
    this.position=this.destination;this.travelling=false;
    return this.moveFocus(1);
  }
  restoreView(){void this.moveFocus(0);}
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

  select(index:number){
    this.stopPreview();this.index=index;this.startPosition=this.position;this.destination=index*GAP;
    if(this.isCalm()||Math.abs(this.destination-this.position)>GAP*1.6){
      this.position=this.destination;this.camera.position.x+=this.destination-this.startPosition;this.travelling=false;
    }else{this.travelling=true;this.travelStart=performance.now();}
    void this.prepare(index);void this.prepare(index-1);void this.prepare(index+1);void this.prepare(index+2);
  }
  hit(clientX:number,clientY:number){
    const rect=this.host.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),this.camera);
    return this.raycaster.intersectObject(this.bays[this.index].screen,false).length>0;
  }
  previewFilm(){
    const work=archiveWorks[this.index];
    if(!work.video||this.preview||this.isCalm()||this.mobile||this.travelling){if(!work.video&&!this.travelling)this.previewIndex=this.index;return;}
    const video=document.createElement('video');video.src=work.video;video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';
    this.preview=video;this.previewIndex=this.index;
    video.addEventListener('loadeddata',()=>{
      if(this.preview!==video)return;
      this.previewTexture=new THREE.VideoTexture(video);this.previewTexture.colorSpace=THREE.SRGBColorSpace;
      this.bays[this.index].screen.material.uniforms.uMap.value=this.previewTexture;
    },{once:true});
    video.play().catch(()=>this.stopPreview());
  }
  stopPreview(){
    if(this.preview){this.preview.pause();this.preview.removeAttribute('src');this.preview.load();}
    if(this.previewIndex>=0){const bay=this.bays[this.previewIndex];bay.screen.material.uniforms.uMap.value=bay.texture??this.placeholder;}
    this.previewTexture?.dispose();this.preview=undefined;this.previewTexture=undefined;this.previewIndex=-1;
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
  resume(){if(!this.disposed){cancelAnimationFrame(this.frame);this.lastTime=performance.now();this.frame=requestAnimationFrame(this.tick);}}
  dispose(){
    if(this.disposed)return;this.disposed=true;this.focusMotion?.resolve();this.focusMotion=undefined;this.pause();this.resizeObserver.disconnect();
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
