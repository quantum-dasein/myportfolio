import * as THREE from 'three';
import { batchRigid } from './observatory-batch';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

type Bones = Record<string,THREE.Object3D>;
const up=new THREE.Vector3(0,1,0);

function textile(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#b8c0c4';ctx.fillRect(0,0,512,512);
  let seed=3571;
  for(let y=0;y<512;y+=4)for(let x=0;x<512;x+=4){
    seed=(seed*16807)%2147483647;const shade=174+seed%24;
    ctx.fillStyle=`rgb(${shade},${shade+3},${shade+5})`;
    ctx.fillRect(x,y,(x+y)%8===0?3:1,(x+y)%8===0?1:3);
  }
  // Quilting and double stitches are texture detail, not hundreds of meshes.
  ctx.strokeStyle='#929da3';ctx.lineWidth=2;
  for(let y=0;y<=512;y+=128){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();}
  ctx.strokeStyle='#d6dddf';ctx.lineWidth=1;ctx.setLineDash([5,5]);
  for(let y=0;y<=512;y+=128){for(const d of [-5,5]){ctx.beginPath();ctx.moveTo(0,y+d);ctx.lineTo(512,y+d);ctx.stroke();}}
  // Fine wear is baked into the existing cloth map, without extra geometry.
  ctx.setLineDash([]);ctx.strokeStyle='rgba(71,83,91,.15)';ctx.lineWidth=1;
  for(let i=0;i<95;i++){seed=seed*16807%2147483647;const x=seed%512;seed=seed*16807%2147483647;const y=seed%512;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3+seed%13,y+seed%4);ctx.stroke();}
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
  const bump=map.clone();bump.colorSpace=THREE.NoColorSpace;bump.needsUpdate=true;
  return {map,bump};
}

// The studio's RB monogram, mounted on the backpack as an engraved plate.
function monogramPlate(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;
  const ctx=canvas.getContext('2d')!;
  const plate=ctx.createLinearGradient(0,0,0,384);plate.addColorStop(0,'#1b2127');plate.addColorStop(1,'#0c1014');
  ctx.fillStyle=plate;ctx.fillRect(0,0,512,384);ctx.strokeStyle='#7d8a93';ctx.lineWidth=5;ctx.strokeRect(10,10,492,364);
  ctx.fillStyle='#9aa7ae';ctx.font='22px monospace';ctx.textAlign='center';ctx.fillText('RODION BELOUSOV · STUDIO',256,356);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const mark=new Image();mark.decoding='async';
  mark.onload=()=>{ctx.drawImage(mark,256-150,24,300,300);texture.needsUpdate=true;};
  mark.src='/brand/rb-monogram-256.png';
  return texture;
}

function badge(lines:string[],dark=false){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle=dark?'#101820':'#cbd2d5';ctx.fillRect(0,0,512,384);
  ctx.strokeStyle=dark?'#8c9ba4':'#45535d';ctx.lineWidth=4;ctx.strokeRect(12,12,488,360);
  ctx.setLineDash([5,5]);ctx.lineWidth=1;ctx.strokeRect(20,20,472,344);ctx.setLineDash([]);
  ctx.fillStyle=dark?'#f1f5f7':'#1c2a34';ctx.textAlign='center';ctx.font='bold 120px Arial';ctx.fillText(lines[0],256,162);
  ctx.font='30px monospace';lines.slice(1).forEach((line,i)=>ctx.fillText(line,256,232+i*43));
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

/** Original suit geometry/textiles, driven by a locally hosted Mixamo rig. */
// Measured on the rig: X- swings a thigh forward, X+ bends a knee, Y swings an arm forward.
const SIT_POSE={drop:1.26,bones:[
  ['LeftUpLeg',[1,0,0],-2.05],['RightUpLeg',[1,0,0],-2.05],['LeftUpLeg',[0,0,1],.16],['RightUpLeg',[0,0,1],-.16],
  ['LeftLeg',[1,0,0],1.55],['RightLeg',[1,0,0],1.55],
  ['Spine1',[1,0,0],.2],
  ['RightArm',[0,1,0],.95],['LeftArm',[0,1,0],-.95],['RightForeArm',[0,1,0],.55],['LeftForeArm',[0,1,0],-.55],
] as [string,[number,number,number],number][]};

// Left arm: Y- brings the upper arm forward, the forearm forward and across the chest.
// Held in the right hand, the side the camera sees; mirrored axes of the left arm.
const TABLET_POSE:[string,[number,number,number],number][]=[['RightArm',[0,1,0],.42],['RightForeArm',[0,1,0],1.45]];

const DIVE_POSE:[string,[number,number,number],number][]=[
  ['Spine1',[1,0,0],.5],['LeftUpLeg',[1,0,0],-1.25],['RightUpLeg',[1,0,0],-1.25],['LeftLeg',[1,0,0],1.9],['RightLeg',[1,0,0],1.9],
  ['RightArm',[0,1,0],1.55],['LeftArm',[0,1,0],-1.55],['RightForeArm',[0,1,0],.2],['LeftForeArm',[0,1,0],-.2],
];

export function createAstronaut(){
  const root=new THREE.Group();root.name='RB Observatory astronaut';
  const cloth=textile();
  const fabric=new THREE.MeshStandardMaterial({color:'#f1f4f5',map:cloth.map,bumpMap:cloth.bump,bumpScale:.006,roughness:.78,metalness:.035});
  const ceramic=new THREE.MeshPhysicalMaterial({color:'#dbe1e4',roughness:.3,metalness:.2,clearcoat:.5,clearcoatRoughness:.24});
  const graphite=new THREE.MeshStandardMaterial({color:'#171d24',roughness:.68,metalness:.15});
  const metal=new THREE.MeshStandardMaterial({color:'#9cabb5',roughness:.26,metalness:.87});
  const visor=new THREE.MeshPhysicalMaterial({color:'#08131c',roughness:.075,metalness:.86,clearcoat:1,clearcoatRoughness:.05,iridescence:.22,iridescenceIOR:1.3,envMapIntensity:.3});
  // The visor reflects a sky of its own: drifting nebula, twinkling points and
  // now and then a flare trail sweeping across, instead of the studio softbox.
  const visorUniforms={uVisorTime:{value:0},uVisorTint:{value:new THREE.Color('#9fb6d0')},uVisorGlow:{value:1}};
  root.userData.visorUniforms=visorUniforms;
  visor.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,visorUniforms);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uVisorTime,uVisorGlow;uniform vec3 uVisorTint;').replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      {
        vec3 eye=normalize(vViewPosition);vec3 r=reflect(-eye,normal);
        float facing=1.-max(dot(normal,eye),0.);float edge=.25+.75*facing*facing;
        vec2 p=vec2(atan(r.x,r.z),r.y*1.6);float t=uVisorTime;
        vec3 sky=uVisorTint*smoothstep(-.2,.9,sin(p.x*2.3+t*.23)*.5+.5)*smoothstep(-.6,.7,r.y)*.22;
        sky+=vec3(.55,.32,.62)*pow(max(0.,sin(p.x*1.7-t*.17+p.y*1.3)),7.)*.3;
        vec2 cell=floor(p*vec2(26.,20.));float h=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);
        vec2 f=fract(p*vec2(26.,20.))-.5;
        sky+=step(.9,h)*pow(max(0.,sin(t*(1.5+h*3.)+h*40.)),10.)*(1.-smoothstep(.05,.3,length(f)))*1.4;
        float cycle=fract(t*.07+.3),sweep=(cycle-.15)*7.;
        float trail=exp(-((p.y-(p.x-sweep)*.4-.2)*16.)*((p.y-(p.x-sweep)*.4-.2)*16.))*smoothstep(.15,.22,cycle)*(1.-smoothstep(.3,.42,cycle))*smoothstep(sweep-1.2,sweep,p.x)*(1.-step(sweep,p.x));
        sky+=vec3(1.,.82,.58)*trail*1.8;
        totalEmissiveRadiance+=sky*edge*uVisorGlow;
      }`);
  };
  const light=new THREE.MeshStandardMaterial({color:'#d9f0ff',emissive:'#9bc7dc',emissiveIntensity:1.8,roughness:.4});
  const patch=new THREE.MeshStandardMaterial({map:badge(['RB','OBSERVATORY','EXPEDITION 01'],true),roughness:.78});
  const screenCanvas=document.createElement('canvas');screenCanvas.width=256;screenCanvas.height=128;
  const screenCtx=screenCanvas.getContext('2d')!;screenCtx.fillStyle='#0c1a21';screenCtx.fillRect(0,0,256,128);
  screenCtx.fillStyle='#b9dbda';screenCtx.font='bold 32px monospace';screenCtx.fillText('RB / 01',16,37);
  for(let i=0;i<3;i++){screenCtx.fillStyle='#29424c';screenCtx.fillRect(16,55+i*19,224,8);screenCtx.fillStyle='#90babb';screenCtx.fillRect(16,55+i*19,170-i*29,8);}
  const screenMap=new THREE.CanvasTexture(screenCanvas);screenMap.colorSpace=THREE.SRGBColorSpace;
  const instruments=new THREE.MeshBasicMaterial({map:screenMap,toneMapped:false});
  const label=new THREE.MeshStandardMaterial({map:monogramPlate(),roughness:.55,metalness:.25});

  function suit(bones:Bones){
    root.updateMatrixWorld(true);
    const point=(name:string)=>root.worldToLocal(bones[name].getWorldPosition(new THREE.Vector3()));
    const attach=(bone:string,part:THREE.Object3D)=>{batchRigid(part);root.add(part);root.updateMatrixWorld(true);bones[bone].attach(part);return part;};
    const mesh=(geo:THREE.BufferGeometry,mat:THREE.Material,parent:THREE.Object3D,pos:THREE.Vector3)=>{
      const object=new THREE.Mesh(geo,mat);object.position.copy(pos);object.castShadow=true;object.receiveShadow=false;parent.add(object);return object;
    };
    const sphere=(parent:THREE.Object3D,mat:THREE.Material,pos:THREE.Vector3,scale:THREE.Vector3)=>{const m=mesh(new THREE.SphereGeometry(1,parent.name==='helmet'?48:24,parent.name==='helmet'?32:16),mat,parent,pos);m.scale.copy(scale);return m;};
    const box=(parent:THREE.Object3D,mat:THREE.Material,pos:THREE.Vector3,w:number,h:number,d:number,r=.02)=>mesh(new RoundedBoxGeometry(w,h,d,1,r),mat,parent,pos);
    const ring=(parent:THREE.Object3D,pos:THREE.Vector3,radius:number,tube:number,mat:THREE.Material=metal)=>{const r=mesh(new THREE.TorusGeometry(radius,tube,8,32),mat,parent,pos);r.rotation.x=Math.PI/2;return r;};
    const capsule=(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,radius:number,mat:THREE.Material=fabric)=>{
      const delta=b.clone().sub(a),length=delta.length();const m=mesh(new THREE.CapsuleGeometry(radius,Math.max(.005,length-radius*1.25),6,20),mat,parent,a.clone().add(b).multiplyScalar(.5));
      m.quaternion.setFromUnitVectors(up,delta.normalize());return m;
    };
    const hips=point('Hips'),neck=point('Neck'),head=point('Head');
    const torso=new THREE.Group();
    const center=hips.clone().lerp(neck,.52);
    sphere(torso,fabric,center,new THREE.Vector3(.255,(neck.y-hips.y)*.59,.173));
    box(torso,ceramic,center.clone().add(new THREE.Vector3(0,.055,.147)),.37,.28,.09,.045);
    box(torso,graphite,center.clone().add(new THREE.Vector3(0,.063,.201)),.27,.17,.025,.01);
    box(torso,metal,center.clone().add(new THREE.Vector3(0,.08,.22)),.15,.07,.016,.006);
    mesh(new THREE.PlaneGeometry(.137,.062),instruments,torso,center.clone().add(new THREE.Vector3(0,.08,.23)));
    for(let i=0;i<3;i++)box(torso,i===0?light:ceramic,center.clone().add(new THREE.Vector3(-.072+i*.07,.002,.222)),.034,.019,.012,.003);
    // Webbing straps cross the textured pressure garment.
    for(const side of [-1,1])box(torso,graphite,center.clone().add(new THREE.Vector3(side*.177,.01,.142)),.025,.38,.022,.005);
    const chestPatch=mesh(new THREE.PlaneGeometry(.11,.06),patch,torso,center.clone().add(new THREE.Vector3(-.11,.17,.197)));
    attach('Spine1',torso);

    const waist=new THREE.Group();sphere(waist,fabric,hips.clone().add(new THREE.Vector3(0,-.012,0)),new THREE.Vector3(.22,.16,.17));
    const belt=ring(waist,hips.clone().add(new THREE.Vector3(0,.075,0)),.205,.023,graphite);belt.scale.y=.82;
    box(waist,metal,hips.clone().add(new THREE.Vector3(0,.075,.17)),.095,.045,.025,.006);attach('Hips',waist);

    const helmet=new THREE.Group();helmet.name='helmet';const helmetCenter=head.clone().add(new THREE.Vector3(0,.082,.01));
    sphere(helmet,ceramic,helmetCenter,new THREE.Vector3(.207,.227,.213));
    // Convex glass sits inside a substantial gasket and a machined bezel.
    sphere(helmet,graphite,helmetCenter.clone().add(new THREE.Vector3(0,-.014,.14)),new THREE.Vector3(.19,.158,.105));
    sphere(helmet,metal,helmetCenter.clone().add(new THREE.Vector3(0,-.012,.163)),new THREE.Vector3(.177,.147,.093));
    sphere(helmet,visor,helmetCenter.clone().add(new THREE.Vector3(0,-.01,.185)),new THREE.Vector3(.165,.137,.081));
    for(const side of [-1,1]){
      const hinge=mesh(new THREE.CylinderGeometry(.049,.049,.034,20),metal,helmet,helmetCenter.clone().add(new THREE.Vector3(side*.208,-.025,0)));hinge.rotation.z=Math.PI/2;
      box(helmet,graphite,helmetCenter.clone().add(new THREE.Vector3(side*.12,.15,.08)),.069,.043,.048,.012);
      box(helmet,light,helmetCenter.clone().add(new THREE.Vector3(side*.12,.15,.108)),.042,.021,.006,.003);
    }
    ring(helmet,head.clone().add(new THREE.Vector3(0,-.113,0)),.151,.025,graphite);
    ring(helmet,head.clone().add(new THREE.Vector3(0,-.089,0)),.163,.018);
    attach('Head',helmet);

    const pack=new THREE.Group();const back=center.clone().add(new THREE.Vector3(0,.045,-.218));
    box(pack,graphite,back,.37,.47,.17,.045);box(pack,ceramic,back.clone().add(new THREE.Vector3(0,0,-.094)),.315,.4,.055,.02);
    const serial=mesh(new THREE.PlaneGeometry(.22,.165),label,pack,back.clone().add(new THREE.Vector3(0,.035,-.126)));serial.rotation.y=Math.PI;
    for(const side of [-1,1]){
      const tank=mesh(new THREE.CapsuleGeometry(.057,.27,5,16),metal,pack,back.clone().add(new THREE.Vector3(side*.2,-.015,0)));
      for(const y of [-.1,.1])box(pack,graphite,tank.position.clone().add(new THREE.Vector3(0,y,0)),.125,.025,.13,.004);
    }
    for(let i=0;i<5;i++)box(pack,graphite,back.clone().add(new THREE.Vector3(0,-.12+i*.015,-.127)),.2,.006,.006,.001);
    const hoseCurve=new THREE.CatmullRomCurve3([back.clone().add(new THREE.Vector3(.2,-.12,0)),center.clone().add(new THREE.Vector3(.29,-.2,-.09)),center.clone().add(new THREE.Vector3(.27,-.21,.15)),center.clone().add(new THREE.Vector3(.13,-.16,.19))]);
    mesh(new THREE.TubeGeometry(hoseCurve,28,.021,8,false),graphite,pack,new THREE.Vector3());attach('Spine1',pack);

    for(const side of ['Left','Right']){
      const shoulder=point(side+'Arm'),elbow=point(side+'ForeArm'),wrist=point(side+'Hand');
      const upper=new THREE.Group();capsule(upper,shoulder,elbow,.107);
      sphere(upper,fabric,shoulder.clone().lerp(elbow,.16),new THREE.Vector3(.123,.117,.123));
      const shoulderBadge=mesh(new THREE.PlaneGeometry(.115,.086),patch,upper,shoulder.clone().lerp(elbow,.2).add(new THREE.Vector3(0,0,.127)));
      attach(side+'Arm',upper);
      const lower=new THREE.Group();capsule(lower,elbow,wrist,.091);
      const direction=wrist.clone().sub(elbow).normalize();
      for(let i=0;i<4;i++){const cuff=ring(lower,elbow.clone().addScaledVector(direction,.015+i*.014),.104,.009,graphite);cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);}
      const wristSeal=ring(lower,wrist.clone().addScaledVector(direction,-.035),.085,.021,metal);wristSeal.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);
      attach(side+'ForeArm',lower);
      const hand=new THREE.Group();const tip=wrist.clone().addScaledVector(direction,.11);
      capsule(hand,wrist,tip,.067,fabric);sphere(hand,graphite,tip,new THREE.Vector3(.055,.035,.05));
      capsule(hand,wrist.clone().addScaledVector(direction,.025).add(new THREE.Vector3(0,0,.05)),wrist.clone().addScaledVector(direction,.085).add(new THREE.Vector3(0,0,.085)),.027,fabric);attach(side+'Hand',hand);

      const hip=point(side+'UpLeg'),knee=point(side+'Leg'),ankle=point(side+'Foot'),toe=point(side+'ToeBase');
      const thigh=new THREE.Group();capsule(thigh,hip,knee,.126);
      box(thigh,ceramic,hip.clone().lerp(knee,.45).add(new THREE.Vector3(side==='Left'?.09:-.09,0,.078)),.11,.17,.045,.016);attach(side+'UpLeg',thigh);
      const shin=new THREE.Group();capsule(shin,knee,ankle,.103);
      box(shin,graphite,knee.clone().add(new THREE.Vector3(0,-.025,.095)),.155,.12,.047,.03);
      box(shin,ceramic,knee.clone().add(new THREE.Vector3(0,-.025,.121)),.123,.09,.022,.025);
      for(let i=0;i<3;i++)ring(shin,knee.clone().add(new THREE.Vector3(0,-.095-i*.019,0)),.115,.008,graphite);
      ring(shin,ankle.clone().add(new THREE.Vector3(0,.09,0)),.104,.018,metal);attach(side+'Leg',shin);
      const boot=new THREE.Group();const foot=ankle.clone().lerp(toe,.52);foot.y=ankle.y-.025;foot.z+=.022;
      box(boot,ceramic,foot,.18,.145,.29,.04);box(boot,graphite,foot.clone().add(new THREE.Vector3(0,-.075,0)),.19,.033,.31,.009);
      for(let i=0;i<4;i++)box(boot,graphite,foot.clone().add(new THREE.Vector3(0,.077,.06-i*.041)),.175,.018,.016,.003);
      attach(side+'Foot',boot);
    }
    root.userData.soleOffset=Math.max(0,(.1165-Math.min(point('LeftFoot').y,point('RightFoot').y))*1.42);
  }

  // Local fallback uses the same detailed suit if the animation asset cannot load.
  const fallback=new THREE.Group();root.add(fallback);const bones:Bones={};
  function bone(name:string,parent:THREE.Object3D,x:number,y:number,z:number){const b=new THREE.Bone();b.name=name;b.position.set(x,y,z);parent.add(b);bones[name]=b;return b;}
  const hips=bone('Hips',fallback,0,.99,0);const spine=bone('Spine1',hips,0,.2,0);const chest=bone('Spine2',spine,0,.1,0);const neck=bone('Neck',chest,0,.22,0);bone('Head',neck,0,.09,0);
  for(const [name,sign] of [['Left',1],['Right',-1]] as const){
    const arm=bone(name+'Arm',chest,sign*.25,.1,0);const forearm=bone(name+'ForeArm',arm,sign*.28,0,0);bone(name+'Hand',forearm,sign*.28,0,0);
    const leg=bone(name+'UpLeg',hips,sign*.105,-.055,0);const knee=bone(name+'Leg',leg,0,-.42,0);const foot=bone(name+'Foot',knee,0,-.415,0);bone(name+'ToeBase',foot,0,-.035,.12);
  }
  suit(bones);bones.LeftArm.rotation.z=-1.4;bones.RightArm.rotation.z=1.4;
  root.scale.setScalar(1.42);
  let mixer:THREE.AnimationMixer|undefined,idle:THREE.AnimationAction|undefined,walk:THREE.AnimationAction|undefined;
  let disposed=false;
  let activeBones=bones,headYaw=0,headPitch=0,waveTime=0;
  const touched:[THREE.Object3D,THREE.Quaternion][]=[];
  const bend=(list:[string,[number,number,number],number][],weight:number)=>{
    for(const [name,axis,angle] of list){
      const bone=activeBones[name];if(!bone)continue;
      touched.push([bone,bone.quaternion.clone()]);
      turn.setFromAxisAngle(armAxis.set(axis[0],axis[1],axis[2]),angle*weight);bone.quaternion.multiply(turn);
    }
  };const hipsBase=new THREE.Vector3();let hipsMoved=false;const scaleProbe=new THREE.Vector3();
  const headBase=new THREE.Quaternion(),chestBase=new THREE.Quaternion();
  const armBase=new THREE.Quaternion(),foreBase=new THREE.Quaternion();
  const armAxis=new THREE.Vector3(0,0,1),foreAxis=new THREE.Vector3(0,0,1),turn=new THREE.Quaternion();
  const gaze=new THREE.Quaternion(),gazeEuler=new THREE.Euler();
  let gazeApplied=false;
  const load=async(canInstall=()=>true)=>{
    let model:THREE.Group|undefined;
    try{
      const gltf=await new GLTFLoader().loadAsync('/models/observatory/curator-motion-v1.glb');model=gltf.scene;if(disposed){model.traverse(o=>{if((o as THREE.Mesh).isMesh)(o as THREE.Mesh).geometry.dispose();});return;}
      // Same bind-space transform as the source rig, without its unused body meshes.
      model.scale.setScalar(1.0390870138767891);
      model.position.set(-9.968400893622942e-8,.0033573715457824184,-.017258680149053574);
      while(!disposed&&!canInstall())await new Promise(resolve=>setTimeout(resolve,100));
      if(disposed)return;
      const rig:Bones={};model.traverse(object=>{if(object.name.startsWith('mixamorig'))rig[object.name.replace(/^mixamorig[:_]?/,'')]=object;
        if((object as THREE.Mesh).isMesh)object.visible=false;
      });
      for(const key of Object.keys(bones))if(!rig[key])throw new Error(`Missing rig joint: ${key}`);
      root.add(model);suit(rig);
      root.remove(fallback);fallback.traverse(object=>{if((object as THREE.Mesh).isMesh)(object as THREE.Mesh).geometry.dispose();});
      mixer=new THREE.AnimationMixer(model);
      const idleClip=gltf.animations.find(c=>c.name==='idle'),walkClip=gltf.animations.find(c=>c.name==='walk');
      if(idleClip)idle=mixer.clipAction(idleClip).play();if(walkClip){walk=mixer.clipAction(walkClip).play();walk.setEffectiveWeight(0);}
      activeBones=rig;gazeApplied=false;root.userData.astronautRig='mixamo';
    }catch{if(model)root.remove(model);root.userData.astronautRig='procedural';}
  };
  return {root,load,dispose(){disposed=true;mixer?.stopAllAction();if(mixer)mixer.uncacheRoot(mixer.getRoot());},animate(phase:number,walking:number,look:number,dt=.016,attention=0,pose?:{yaw?:number;pitch?:number;wave?:number;sit?:number;tablet?:number;dive?:number}){
    for(let i=touched.length-1;i>=0;i--)touched[i][0].quaternion.copy(touched[i][1]);touched.length=0;
    if(hipsMoved){activeBones.Hips.position.copy(hipsBase);hipsMoved=false;}
    // Undo our additive pose before the mixer writes the next animation sample.
    if(gazeApplied){activeBones.Head.quaternion.copy(headBase);activeBones.Spine2.quaternion.copy(chestBase);activeBones.RightArm.quaternion.copy(armBase);activeBones.RightForeArm.quaternion.copy(foreBase);}
    if(mixer){idle?.setEffectiveWeight(1-walking);walk?.setEffectiveWeight(walking);mixer.update(dt);}
    else {
      const swing=Math.sin(phase)*.5*walking;
      bones.LeftUpLeg.rotation.x=swing;bones.RightUpLeg.rotation.x=-swing;
      bones.LeftLeg.rotation.x=Math.max(0,-Math.sin(phase))*.6*walking;bones.RightLeg.rotation.x=Math.max(0,Math.sin(phase))*.6*walking;
      bones.LeftArm.rotation.x=-swing*.6;bones.RightArm.rotation.x=swing*.6;
    }
    headBase.copy(activeBones.Head.quaternion);chestBase.copy(activeBones.Spine2.quaternion);
    armBase.copy(activeBones.RightArm.quaternion);foreBase.copy(activeBones.RightForeArm.quaternion);
    // A pose from the hall (following the light, looking up at the sky) overrides the idle glance.
    const yawGoal=pose?.yaw??(look*.16+attention*.46),pitchGoal=pose?.pitch??-attention*.1;
    if(dt>0){headYaw=THREE.MathUtils.damp(headYaw,yawGoal*(1-walking),3,dt);headPitch=THREE.MathUtils.damp(headPitch,pitchGoal*(1-walking),2.5,dt);}
    const headShare=pose?.yaw!==undefined?.65:1;
    gazeEuler.set(headPitch*.75,headYaw*headShare,(dt>0?Math.sin(phase*.31)*.012:0)*(1-walking));
    gaze.setFromEuler(gazeEuler);activeBones.Head.quaternion.multiply(gaze);
    gazeEuler.set(headPitch*.25,pose?.yaw!==undefined?headYaw*.35:attention*.065*(1-walking),0);gaze.setFromEuler(gazeEuler);activeBones.Spine2.quaternion.multiply(gaze);
    // Greeting: the right arm lifts and the forearm swings.
    const wave=(pose?.wave??0)*(1-walking);
    if(wave>.001){
      if(dt>0)waveTime+=dt;
      const tune=root.userData.waveTune??{arm:[0,0,1,-1.6],fore:[0,0,1,-1.4],swing:.4};
      armAxis.set(tune.arm[0],tune.arm[1],tune.arm[2]).normalize();foreAxis.set(tune.fore[0],tune.fore[1],tune.fore[2]).normalize();
      turn.setFromAxisAngle(armAxis,tune.arm[3]*wave);activeBones.RightArm.quaternion.multiply(turn);
      turn.setFromAxisAngle(foreAxis,(tune.fore[3]+Math.sin(waveTime*9)*tune.swing)*wave);activeBones.RightForeArm.quaternion.multiply(turn);
    }else waveTime=0;
    // Sitting down on the floor: hips lower, knees up, forearms resting on them.
    const sit=(pose?.sit??0)*(1-walking);
    if(sit>.001){
      const tune=root.userData.sitTune??SIT_POSE;
      const hips=activeBones.Hips;hipsBase.copy(hips.position);hipsMoved=true;
      hips.parent!.getWorldScale(scaleProbe);hips.position.y-=tune.drop*sit/Math.max(1e-4,scaleProbe.y);
      bend(tune.bones,sit);
    }
    // Holding the tablet up in front of the chest, forearm across the body.
    const hold=(pose?.tablet??0)*(1-sit);
    if(hold>.001)bend(TABLET_POSE,hold);
    // In the air: knees tucked high, body leaning in, both arms reaching ahead.
    const dive=pose?.dive??0;if(dive>.001)bend(DIVE_POSE,dive);
    gazeApplied=true;
    light.emissiveIntensity=dt>0?.7+Math.sin(phase*.45)*.08:.7;
    if(dt>0)visorUniforms.uVisorTime.value+=dt;
    root.userData.attention=attention;root.userData.headYaw=headYaw;
  }};
}
