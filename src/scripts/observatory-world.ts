import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { exhibitionArchitecture } from './observatory-architecture';
import { createObservatorySky } from './observatory-sky';
import { batchRigid } from './observatory-batch';
import { observatorySurfaces } from './observatory-surfaces';
import { createCurator } from './observatory-curator';
import { archiveRooms, archiveWorks } from '../data/observatory';

const GAP=17;
type Bay={ group:THREE.Group; screen:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>; backing:THREE.Mesh; wings:THREE.Mesh[]; cap:THREE.Mesh; texture?:THREE.Texture; loading?:Promise<void>; props:THREE.Group; shutters:THREE.Group; blades:THREE.Group[] };

export class ObservatoryWorld {
  renderer:THREE.WebGLRenderer;
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(44,1,.1,400);
  bays:Bay[]=[];
  curator=createCurator();
  pointer=new THREE.Vector2();
  raycaster=new THREE.Raycaster();
  index=0;
  position=0;
  destination=0;
  startPosition=0;
  travelStart=0;
  travelling=false;
  calm=false;
  mobile=false;
  disposed=false;
  frame=0;
  lastTime=0;
  phase=0;
  walk=0;
  revealStart=-10000;
  preview?:HTMLVideoElement;
  previewTexture?:THREE.VideoTexture;
  previewIndex=-1;
  environment:THREE.WebGLRenderTarget;
  loader=new THREE.TextureLoader();
  look=new THREE.Vector3();
  cameraGoal=new THREE.Vector3();
  resizeObserver:ResizeObserver;
  floorMaterial:THREE.MeshStandardMaterial;
  surfaces=observatorySurfaces();
  placeholder=new THREE.DataTexture(new Uint8Array([20,24,29,255]),1,1);
  motionQuery=matchMedia('(prefers-reduced-motion: reduce)');

  focus=0;
  focusMotion?:{from:number;to:number;start:number;duration:number;resolve:()=>void};
  focusLook=new THREE.Vector3();
  focusCamera=new THREE.Vector3();
  focusOrigin=new THREE.Vector3();
  focusLookOrigin=new THREE.Vector3();
  contact:THREE.Mesh;
  sky?:ReturnType<typeof createObservatorySky>;
  onFailure:()=>void;

  constructor(private host:HTMLElement,onFailure:()=>void) {
    this.onFailure=onFailure;
    this.mobile=matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    this.calm=this.isCalm();
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});

    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.05;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.placeholder.needsUpdate=true;this.placeholder.colorSpace=THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-hidden','true');
    host.append(this.renderer.domElement);
    const siteBackground=getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()||'#020203';
    this.scene.background=new THREE.Color(siteBackground);
    this.renderer.setClearColor(siteBackground);
    this.scene.fog=new THREE.FogExp2(siteBackground,.012);
    const pmrem=new THREE.PMREMGenerator(this.renderer);
    const room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.02);
    this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
    this.scene.environmentIntensity=1.05;
    const ambient=new THREE.HemisphereLight('#d6dcdf','#171c25',.65);this.scene.add(ambient);
    const roomKey=['#fff0d8','#deedf9','#f1dfc8','#dcefe9'].map(c=>new THREE.Color(c));
    const roomFill=['#cdd6e0','#aecbdf','#abb6cd','#a8d5ce'].map(c=>new THREE.Color(c));
    const key=new THREE.DirectionalLight('#fff5e8',4.1);key.position.set(-3,12,6);
    key.castShadow=true;key.shadow.mapSize.set(1024,1024);
    key.shadow.camera.left=-13;key.shadow.camera.right=13;key.shadow.camera.top=11;key.shadow.camera.bottom=-11;
    key.shadow.camera.far=45;key.shadow.normalBias=.035;key.shadow.bias=-.0002;
    this.scene.add(key,key.target);
    const fill=new THREE.DirectionalLight('#c2d5ee',1.35);fill.position.set(-9,5,7);this.scene.add(fill,fill.target);
    const rim=new THREE.DirectionalLight('#d6dcdf',4.2);rim.position.set(4,7,-9);this.scene.add(rim,rim.target);
    this.floorMaterial=new THREE.MeshPhysicalMaterial({color:'#35414d',map:this.surfaces.floorColor,roughness:.64,metalness:.28,clearcoat:.18,clearcoatRoughness:.5,roughnessMap:this.surfaces.floorRelief,bumpMap:this.surfaces.floorRelief,bumpScale:.006});
    this.buildSky();
    this.buildBays();
    this.scene.add(this.curator.root);
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
    const shadowCtx=shadowCanvas.getContext('2d')!;const gradient=shadowCtx.createRadialGradient(64,64,5,64,64,62);
    gradient.addColorStop(0,'rgba(0,0,0,.8)');gradient.addColorStop(.4,'rgba(0,0,0,.35)');gradient.addColorStop(1,'rgba(0,0,0,0)');
    shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,128,128);
    this.contact=new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
    this.contact.rotation.x=-Math.PI/2;this.scene.add(this.contact);
    // One stable light layout avoids recompiling every material between bays.
    const exhibit=new THREE.PointLight('#d6dcdf',22,24,2);exhibit.position.set(0,5,-1);this.scene.add(exhibit);
    this.curator.root.position.set(-3.1,0,3.5);this.curator.root.rotation.y=.55;
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
    this.resize();
    this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
    this.tick=(time:number)=>{
      if(this.disposed)return;
      this.frame=requestAnimationFrame(this.tick);
      if(document.hidden)return;
      if(this.mobile&&time-this.lastTime<1000/30-1)return;
      const elapsed=time-this.lastTime;
      const dt=Math.min(elapsed/1000,.05);this.lastTime=time;
      this.calm=this.isCalm();
      if(this.calm){
        if(this.preview)this.stopPreview();
        if(this.travelling){this.position=this.destination;this.travelling=false;}
      }
      if(this.focusMotion){
        const m=this.focusMotion,t=Math.min(1,(time-m.start)/m.duration),e=t*t*(3-2*t);
        this.focus=THREE.MathUtils.lerp(m.from,m.to,e);
        if(t===1){this.focusMotion=undefined;m.resolve();}
      }
      const room=archiveWorks[this.index].roomIndex;
      key.color.lerp(roomKey[room],Math.min(1,dt*2));fill.color.lerp(roomFill[room],Math.min(1,dt*2));
      key.intensity=3.2*(1-this.focus*.6);fill.intensity=1.15*(1-this.focus*.6);rim.intensity=3.2*(1-this.focus*.65);ambient.intensity=.65*(1-this.focus*.65);
      this.scene.environmentIntensity=.72*(1-this.focus*.65);
      const previous=this.position;
      let progress=1;
      if(this.travelling){
        progress=Math.min((time-this.travelStart)/1900,1);
        const eased=progress<.5?4*progress**3:1-(-2*progress+2)**3/2;
        this.position=THREE.MathUtils.lerp(this.startPosition,this.destination,eased);
        if(progress>=1)this.travelling=false;
      }
      const moving=!this.calm&&Math.abs(this.position-previous)>.001;
      this.walk=THREE.MathUtils.damp(this.walk,moving?1:0,8,dt);
      this.phase+=dt*(moving?10.5:1.1);
      const attention=this.calm?0:Math.max(this.focus,(.5+.5*Math.sin(this.phase*.35))**3*.85)*(1-this.walk);
      this.curator.animate(this.phase,this.walk,this.pointer.x*.5,this.calm?0:dt,attention);
      const x=this.position;
      this.sky?.update(dt,x,this.calm,this.renderer.getPixelRatio());
      this.curator.root.position.set(x-3.1,.075+(this.curator.root.userData.soleOffset??0),3.1+Math.sin(progress*Math.PI)*.32);
      this.contact.position.set(x-3.1,.078,this.curator.root.position.z);
      const facing=moving ? (this.destination>this.startPosition?Math.PI/2:-Math.PI/2) : .55+attention*1.55;
      this.curator.root.rotation.y=THREE.MathUtils.damp(this.curator.root.rotation.y,facing,5,dt);
      const parallax=this.calm?0:1;
      const narrow=this.host.clientWidth<650;
      this.cameraGoal.set(x+(narrow?.3:8.6)+this.pointer.x*.7*parallax,narrow?6.4:5.8+this.pointer.y*.25*parallax,narrow?24.2:15.4);
      this.look.set(x+(narrow?0:-3.4),narrow?3.2:2.7,-2.5);
      const screen=this.bays[this.index].screen;
      const halfFov=Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2));
      const distance=Math.max(screen.scale.y/(2*halfFov*.7),screen.scale.x/(2*halfFov*this.camera.aspect*.82));
      this.focusLook.set(this.destination,3.85,-4.2);
      if(this.focusMotion?.to===1){this.cameraGoal.copy(this.focusOrigin);this.look.copy(this.focusLookOrigin);}
      this.focusCamera.set(this.destination+(narrow?0:.35),4.05,-4.2+distance);this.cameraGoal.lerp(this.focusCamera,this.focus);
      this.look.lerp(this.focusLook,this.focus);
      if(this.calm||this.focus>0)this.camera.position.copy(this.cameraGoal);
      else this.camera.position.lerp(this.cameraGoal,1-Math.exp(-dt*5));
      this.camera.lookAt(this.look);
      key.position.x=x-3;key.target.position.set(x,0,0);
      fill.position.x=x-9;fill.target.position.set(x,2,0);
      rim.position.x=x+4;rim.target.position.set(x,2,0);
      exhibit.position.x=x;
      this.bays.forEach((bay,i)=>{
        bay.group.visible=Math.abs(i*GAP-x)<27;
        const reveal=(time-this.revealStart)/1300;
        const unfolding=i===this.index&&reveal<1&&!this.calm;
        bay.shutters.visible=unfolding;bay.screen.visible=!unfolding;
        if(unfolding)bay.blades.forEach((blade,j)=>{
          const t=THREE.MathUtils.clamp((reveal-j*.038)/.71,0,1);
          blade.rotation.y=(1-t)**3*1.4;
        });
        if(!this.calm&&bay.group.visible){bay.props.rotation.y=Math.sin(time*.00016+i)*.06;}
      });
      this.renderer.render(this.scene,this.camera);
    };
    this.camera.position.copy(this.cameraGoal.set(8.6,5.8,15.4));
  }
  tick:(time:number)=>void;
  isCalm(){return document.documentElement.classList.contains('rb-calm')||this.motionQuery.matches;}
  private contextLost=(event:Event)=>{event.preventDefault();this.onFailure();this.dispose();};

  private mesh(geo:THREE.BufferGeometry,mat:THREE.Material,parent:THREE.Object3D,x:number,y:number,z:number){
    const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  private buildSky(){
    this.sky=createObservatorySky(this.mobile);this.scene.add(this.sky.root);
  }

  private buildBays(){
    const architecture=exhibitionArchitecture(this.surfaces);
    const dark=new THREE.MeshStandardMaterial({color:'#303a45',roughness:.36,metalness:.68,roughnessMap:this.surfaces.metal,bumpMap:this.surfaces.metal,bumpScale:.003});
    const chrome=new THREE.MeshPhysicalMaterial({color:'#dfe7ed',roughness:.23,metalness:.96,clearcoat:.3,roughnessMap:this.surfaces.metal,bumpMap:this.surfaces.metal,bumpScale:.0008});
    const edgeMat=new THREE.MeshBasicMaterial({color:new THREE.Color('#d6dcdf').multiplyScalar(2),toneMapped:false});
    const slabGeometry=new THREE.CylinderGeometry(10.5,10.5,.55,64);
    const screenGeo=new THREE.PlaneGeometry(1,1);
    const pathGeo=new THREE.BoxGeometry(GAP,.13,3.0);
    const pathMat=new THREE.MeshStandardMaterial({color:'#353e47',roughness:.64,metalness:.4,map:this.surfaces.floorColor,bumpMap:this.surfaces.floorRelief,bumpScale:.018});
    const glowGeo=new THREE.BoxGeometry(GAP,.012,.025);
    archiveWorks.forEach((work,i)=>{
      const group=new THREE.Group();group.position.x=i*GAP;this.scene.add(group);
      const ri=work.roomIndex;
      const accent=new THREE.Color(archiveRooms[ri].color);
      const surface=this.floorMaterial.clone();surface.color.set(['#4a4d4d','#303e49','#222831','#35484c'][ri]);
      const slab=this.mesh(slabGeometry,surface,group,0,-.32,-1.3);slab.receiveShadow=true;
      const path=this.mesh(pathGeo,pathMat,group,0,.005,3.5);path.receiveShadow=true;
      this.mesh(glowGeo,edgeMat,group,0,.075,2.0);
      this.mesh(glowGeo,edgeMat,group,0,.075,5.0);
      for(let j=0;j<3;j++){
        const ring=this.mesh(new THREE.RingGeometry(7.6+j*.45,7.615+j*.45,96),new THREE.MeshBasicMaterial({color:'#d2d4ce',transparent:true,opacity:.16,side:THREE.DoubleSide}),group,0,-.037,-1.3);
        ring.rotation.x=-Math.PI/2;
      }
      // Machined dial markings: a single instanced draw call per platform.
      const ticks=new THREE.InstancedMesh(new THREE.BoxGeometry(.022,.009,.22),new THREE.MeshBasicMaterial({color:'#9da7b0',transparent:true,opacity:.34}),64);
      const marker=new THREE.Object3D();
      for(let t=0;t<64;t++){const angle=t/64*Math.PI*2;marker.position.set(Math.sin(angle)*8.4,-.034,-1.3+Math.cos(angle)*8.4);marker.rotation.y=angle;marker.scale.z=t%4===0?1.8:1;marker.updateMatrix();ticks.setMatrixAt(t,marker.matrix);}
      group.add(ticks);
      // The exhibition aperture: architecture has depth, imagery keeps its ratio.
      const screenMat=new THREE.MeshBasicMaterial({color:'#ffffff',map:this.placeholder,toneMapped:false,fog:false});
      const screen=new THREE.Mesh(screenGeo,screenMat);screen.position.set(0,3.85,-4.2);
      const vertical=work.ratio==='vertical';screen.scale.set(vertical?2.5:8.3,vertical?4.44:4.67,1);group.add(screen);
      const shutters=new THREE.Group();shutters.position.copy(screen.position);shutters.scale.copy(screen.scale);shutters.visible=false;group.add(shutters);
      const blades:THREE.Group[]=[];
      for(let bladeIndex=0;bladeIndex<8;bladeIndex++){
        const pivot=new THREE.Group();pivot.position.x=-.5+bladeIndex/8;
        const bladeGeometry=new THREE.PlaneGeometry(1/8,1);const uv=bladeGeometry.getAttribute('uv');
        for(let v=0;v<uv.count;v++)uv.setX(v,(bladeIndex+uv.getX(v))/8);
        const blade=new THREE.Mesh(bladeGeometry,screenMat);blade.position.x=1/16;pivot.add(blade);shutters.add(pivot);blades.push(pivot);
      }
      screen.userData.index=i;
      const backing=this.mesh(new RoundedBoxGeometry(8.7,5.08,.24,2,.065),dark,group,0,3.85,-4.39);backing.castShadow=true;
      // Slightly separated side wings read as a floating frame, not a UI card.
      const wings=[-1,1].map(side=>this.mesh(new THREE.BoxGeometry(.07,5.15,.34),chrome,group,side*4.41,3.85,-4.28));
      const cap=this.mesh(new THREE.BoxGeometry(8.6,.022,.12),edgeMat,group,0,6.46,-4.3);
      const props=new THREE.Group();group.add(props);
      architecture(ri,group,props);
      // A small exhibition number engraved in the platform.
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
      const ctx=canvas.getContext('2d')!;ctx.fillStyle='#b6bebd';ctx.font='300 68px Arial';ctx.textAlign='center';ctx.fillText(String(i+1).padStart(2,'0'),128,86);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const number=this.mesh(new THREE.PlaneGeometry(1.1,.55),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.5,depthWrite:false}),group,-4.5,.08,3.5);number.rotation.x=-Math.PI/2;
      batchRigid(props);
      batchRigid(group,new Set([screen,backing,cap,...wings]));
      this.bays.push({group,screen,backing,wings,cap,props,shutters,blades});
    });
  }

  async prepare(index:number){
    const bay=this.bays[index];if(!bay||bay.texture)return;
    if(bay.loading)return bay.loading;
    bay.loading=this.loader.loadAsync(archiveWorks[index].img).then(texture=>{
      if(this.disposed){texture.dispose();return;}
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
      bay.texture=texture;this.renderer.initTexture(texture);bay.screen.material.map=texture;
      const image=texture.image as HTMLImageElement;
      const aspect=image.width/image.height;
      const height=Math.min(4.67,8.3/aspect);bay.screen.scale.set(height*aspect,height,1);
      bay.shutters.scale.copy(bay.screen.scale);
      const width=height*aspect;
      bay.backing.scale.set((width+.4)/8.7,(height+.4)/5.08,1);
      bay.wings.forEach((wing,i)=>{wing.position.x=(i===0?-1:1)*(width+.48)/2;wing.scale.y=(height+.47)/5.15;});
      bay.cap.scale.x=(width+.35)/8.6;bay.cap.position.y=3.85+(height+.47)/2;
    }).catch(()=>{bay.screen.material.color.set('#253238');});
    return bay.loading;
  }
  async start(index=0){
    // The detailed local suit is already present. Network animation never gates entry.
    this.index=index;this.position=this.destination=this.startPosition=index*GAP;
    const narrow=this.host.clientWidth<650;
    this.camera.position.set(this.position+(narrow?.3:8.6),narrow?6.4:5.8,narrow?24.2:15.4);
    this.look.set(this.position+(narrow?0:-3.4),narrow?3.2:2.7,-2.5);this.camera.lookAt(this.look);
    this.bays.forEach((bay,i)=>{bay.group.visible=Math.abs(i-index)<2;});
    await this.prepare(index);if(this.disposed)return;
    void this.prepare(index-1);void this.prepare(index+1);void this.prepare(index+2);
    // Compile the four material families before the first room transition.
    const visible=this.bays.map(b=>b.group.visible);this.bays.forEach(b=>b.group.visible=true);
    await this.renderer.compileAsync(this.scene,this.camera);
    this.bays.forEach((b,i)=>b.group.visible=visible[i]);
    if(this.disposed)return;
    this.frame=requestAnimationFrame(this.tick);
    // Keep the initial scene interactive while the optional rig downloads.
    this.curator.load(()=>!this.travelling).then(()=>{if(this.disposed)this.curator.dispose();});
  }
  focusWork(){
    this.stopPreview();this.focusOrigin.copy(this.camera.position);this.focusLookOrigin.copy(this.look);this.position=this.destination;this.travelling=false;this.revealStart=-10000;
    return this.moveFocus(1);
  }
  restoreView(){void this.moveFocus(0);}
  private moveFocus(to:number){
    this.focusMotion?.resolve();this.focusMotion=undefined;
    if(this.disposed||this.isCalm()){this.focus=to;return Promise.resolve();}
    return new Promise<void>(resolve=>{this.focusMotion={from:this.focus,to,start:performance.now(),duration:this.mobile?460:720,resolve};});
  }
  select(index:number){
    this.stopPreview();this.index=index;this.startPosition=this.position;this.destination=index*GAP;
    this.revealStart=performance.now();
    // Long jumps dissolve at the UI level; never race through fifteen rooms.
    if(this.isCalm()||Math.abs(this.destination-this.position)>GAP*1.6){this.position=this.destination;this.camera.position.x=this.position+(this.host.clientWidth<650?.3:8.6);this.travelling=false;}
    else{this.travelling=true;this.travelStart=performance.now();}
    void this.prepare(index);void this.prepare(index-1);void this.prepare(index+1);void this.prepare(index+2);
  }
  hit(clientX:number,clientY:number){
    const rect=this.host.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),this.camera);
    const hit=this.raycaster.intersectObjects([this.bays[this.index].screen]);return hit.length>0;
  }
  previewFilm(){
    const work=archiveWorks[this.index];if(!work.video||this.preview||this.isCalm()||this.mobile||this.travelling)return;
    const video=document.createElement('video');video.src=work.video;video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';
    this.preview=video;this.previewIndex=this.index;
    video.addEventListener('loadeddata',()=>{
      if(this.preview!==video)return;
      this.previewTexture=new THREE.VideoTexture(video);this.previewTexture.colorSpace=THREE.SRGBColorSpace;
      this.bays[this.index].screen.material.map=this.previewTexture;this.bays[this.index].screen.material.needsUpdate=true;
    },{once:true});
    video.play().catch(()=>this.stopPreview());
  }
  stopPreview(){
    if(this.preview){this.preview.pause();this.preview.removeAttribute('src');this.preview.load();}
    if(this.previewIndex>=0){const bay=this.bays[this.previewIndex];bay.screen.material.map=bay.texture??this.placeholder;bay.screen.material.needsUpdate=true;}
    this.previewTexture?.dispose();this.preview=undefined;this.previewTexture=undefined;this.previewIndex=-1;
  }
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight;this.camera.aspect=w/h;this.camera.fov=w<650?49:44;this.camera.updateProjectionMatrix();
    // Match Retina phones without allowing a giant desktop drawing buffer.
    // Frame-rate caps are intentional, never a reason to blur the artwork.
    const ratio=Math.min(devicePixelRatio||1,this.mobile?2.5:1.7,Math.sqrt(2600000/Math.max(1,w*h)));
    this.renderer.setPixelRatio(ratio);this.renderer.setSize(w,h);}
  pause(){cancelAnimationFrame(this.frame);this.stopPreview();}
  resume(){if(!this.disposed){cancelAnimationFrame(this.frame);this.lastTime=performance.now();this.frame=requestAnimationFrame(this.tick);}}
  dispose(){
    if(this.disposed)return;this.disposed=true;this.focusMotion?.resolve();this.focusMotion=undefined;this.pause();this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);
    const geometries=new Set<THREE.BufferGeometry>();const materials=new Set<THREE.Material>();const textures=new Set<THREE.Texture>();
    this.scene.traverse(obj=>{const mesh=obj as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){materials.add(mat);for(const value of Object.values(mat))if(value instanceof THREE.Texture)textures.add(value);}});
    this.bays.forEach(bay=>{if(bay.texture)textures.add(bay.texture);});
    textures.forEach(texture=>texture.dispose());materials.forEach(mat=>mat.dispose());geometries.forEach(geo=>geo.dispose());this.environment.dispose();this.renderer.dispose();this.renderer.domElement.remove();
    this.floorMaterial.bumpMap?.dispose();
    this.placeholder.dispose();Object.values(this.surfaces).forEach(texture=>texture.dispose());this.curator.dispose();
  }
}
