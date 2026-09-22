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
export function createAstronaut(){
  const root=new THREE.Group();root.name='RB Observatory astronaut';
  const cloth=textile();
  const fabric=new THREE.MeshStandardMaterial({color:'#f1f4f5',map:cloth.map,bumpMap:cloth.bump,bumpScale:.006,roughness:.78,metalness:.035});
  const ceramic=new THREE.MeshPhysicalMaterial({color:'#dbe1e4',roughness:.3,metalness:.2,clearcoat:.5,clearcoatRoughness:.24});
  const graphite=new THREE.MeshStandardMaterial({color:'#171d24',roughness:.68,metalness:.15});
  const metal=new THREE.MeshStandardMaterial({color:'#9cabb5',roughness:.26,metalness:.87});
  const visor=new THREE.MeshPhysicalMaterial({color:'#08131c',roughness:.075,metalness:.86,clearcoat:1,clearcoatRoughness:.05,iridescence:.22,iridescenceIOR:1.3,envMapIntensity:2.4});
  const light=new THREE.MeshStandardMaterial({color:'#d9f0ff',emissive:'#9bc7dc',emissiveIntensity:1.8,roughness:.4});
  const patch=new THREE.MeshStandardMaterial({map:badge(['RB','OBSERVATORY','EXPEDITION 01'],true),roughness:.78});
  const screenCanvas=document.createElement('canvas');screenCanvas.width=256;screenCanvas.height=128;
  const screenCtx=screenCanvas.getContext('2d')!;screenCtx.fillStyle='#0c1a21';screenCtx.fillRect(0,0,256,128);
  screenCtx.fillStyle='#b9dbda';screenCtx.font='bold 32px monospace';screenCtx.fillText('RB / 01',16,37);
  for(let i=0;i<3;i++){screenCtx.fillStyle='#29424c';screenCtx.fillRect(16,55+i*19,224,8);screenCtx.fillStyle='#90babb';screenCtx.fillRect(16,55+i*19,170-i*29,8);}
  const screenMap=new THREE.CanvasTexture(screenCanvas);screenMap.colorSpace=THREE.SRGBColorSpace;
  const instruments=new THREE.MeshBasicMaterial({map:screenMap,toneMapped:false});
  const label=new THREE.MeshStandardMaterial({map:badge(['01','LIFE SUPPORT'],false),roughness:.65});

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
  let activeBones=bones,headYaw=0;
  const headBase=new THREE.Quaternion(),chestBase=new THREE.Quaternion();
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
  return {root,load,dispose(){disposed=true;mixer?.stopAllAction();if(mixer)mixer.uncacheRoot(mixer.getRoot());},animate(phase:number,walking:number,look:number,dt=.016,attention=0){
    // Undo our additive pose before the mixer writes the next animation sample.
    if(gazeApplied){activeBones.Head.quaternion.copy(headBase);activeBones.Spine2.quaternion.copy(chestBase);}
    if(mixer){idle?.setEffectiveWeight(1-walking);walk?.setEffectiveWeight(walking);mixer.update(dt);}
    else {
      const swing=Math.sin(phase)*.5*walking;
      bones.LeftUpLeg.rotation.x=swing;bones.RightUpLeg.rotation.x=-swing;
      bones.LeftLeg.rotation.x=Math.max(0,-Math.sin(phase))*.6*walking;bones.RightLeg.rotation.x=Math.max(0,Math.sin(phase))*.6*walking;
      bones.LeftArm.rotation.x=-swing*.6;bones.RightArm.rotation.x=swing*.6;
    }
    headBase.copy(activeBones.Head.quaternion);chestBase.copy(activeBones.Spine2.quaternion);
    if(dt>0)headYaw=THREE.MathUtils.damp(headYaw,(look*.16+attention*.46)*(1-walking),3,dt);
    gazeEuler.set(-attention*.1*(1-walking),headYaw,(dt>0?Math.sin(phase*.31)*.012:0)*(1-walking));
    gaze.setFromEuler(gazeEuler);activeBones.Head.quaternion.multiply(gaze);
    gazeEuler.set(0,attention*.065*(1-walking),0);gaze.setFromEuler(gazeEuler);activeBones.Spine2.quaternion.multiply(gaze);gazeApplied=true;
    light.emissiveIntensity=dt>0?1.55+Math.sin(phase*.45)*.1:1.55;
    root.userData.attention=attention;root.userData.headYaw=headYaw;
  }};
}
