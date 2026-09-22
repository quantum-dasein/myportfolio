import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Shared materials and merged rigid geometry keep each room inexpensive to draw.
export function exhibitionArchitecture(surfaces: {stoneColor:THREE.Texture;stoneRelief:THREE.Texture;metal:THREE.Texture}) {
  const limestone=new THREE.MeshPhysicalMaterial({color:'#b2aaa0',map:surfaces.stoneColor,bumpMap:surfaces.stoneRelief,bumpScale:.008,roughness:.72,metalness:.04});
  const graphite=new THREE.MeshStandardMaterial({color:'#171d25',roughness:.63,metalness:.25});
  const alloy=new THREE.MeshPhysicalMaterial({color:'#879eac',roughness:.28,metalness:.9,roughnessMap:surfaces.metal,clearcoat:.25});
  const ceramic=new THREE.MeshPhysicalMaterial({color:'#c7c3b7',roughness:.32,metalness:.1,clearcoat:.35});
  const bronze=new THREE.MeshStandardMaterial({color:'#95816a',roughness:.34,metalness:.85,roughnessMap:surfaces.metal});
  const glass=new THREE.MeshPhysicalMaterial({color:'#a2c5ca',metalness:.25,roughness:.18,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});
  const light=[ '#e5d5bf','#c2d9e5','#ddc4a5','#b5d9d5'].map(color=>new THREE.MeshBasicMaterial({color,toneMapped:false}));
  function mesh(group:THREE.Group,geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,shadow=true){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=shadow;group.add(m);return m;}
  function box(group:THREE.Group,w:number,h:number,d:number,material:THREE.Material,x:number,y:number,z:number,r=.08){return mesh(group,new RoundedBoxGeometry(w,h,d,2,r),material,x,y,z);}
  return (room:number,group:THREE.Group,props:THREE.Group)=>{
    const glow=light[room];
    if(room===0){
      // A luminous stone aperture: asymmetrical wings and a floating lintel.
      box(group,1.0,8.5,1.15,limestone,-5.6,4.25,-6.2,.12);
      box(group,.42,7.1,1.0,limestone,5.3,3.55,-5.6);
      box(group,11.9,.6,1.55,limestone,-.25,8.2,-6.2,.12);
      box(group,10.5,.025,.065,glow,-.2,7.87,-5.51,.008);
      for(let i=0;i<5;i++)box(group,.16,7.7,1.0,bronze,-6.3-i*.38,3.85,-6.9-i*.25,.025);
      box(group,10,.18,2.65,limestone,0,.15,-3.7);
      box(group,9.3,.025,.025,glow,0,.23,-2.38,.006);
      const disc=mesh(group,new THREE.CylinderGeometry(1.02,1.08,.6,64),limestone,5.9,.3,.0);
      const sculpture=mesh(props,new THREE.TorusGeometry(.86,.12,16,80),bronze,5.9,1.6,0);sculpture.rotation.set(.25,.6,.15);
      mesh(props,new THREE.SphereGeometry(.41,32,24),ceramic,5.9,1.52,0);
      mesh(group,new THREE.CylinderGeometry(.74,.74,.035,64),bronze,5.9,.62,0);
    }else if(room===1){
      // A precision display laboratory; circular canopy and fluted ceramic piers.
      const canopy=mesh(group,new THREE.TorusGeometry(5.75,.13,12,96),alloy,0,7.7,-3.9);canopy.rotation.x=Math.PI/2;
      const inner=mesh(group,new THREE.TorusGeometry(5.58,.025,6,96),glow,0,7.67,-3.9,false);inner.rotation.x=Math.PI/2;
      for(const side of [-1,1]){
        box(group,.16,7.7,.24,alloy,side*5.45,3.85,-5.3,.035);
        mesh(group,new THREE.CylinderGeometry(.9,.9,1.45,64),ceramic,side*5.5,.725,-.3);
        for(let i=0;i<24;i++){const a=i/24*Math.PI*2;box(group,.035,1.18,.035,bronze,side*5.5+Math.cos(a)*.91,.73,-.3+Math.sin(a)*.91,.006);}
        mesh(group,new THREE.CylinderGeometry(.95,.95,.05,64),alloy,side*5.5,1.49,-.3);
      }
      const object=mesh(props,new THREE.TorusKnotGeometry(.68,.16,80,12,2,3),alloy,5.5,2.35,-.3);object.rotation.x=.4;
      const cube=box(props,1,1,1,ceramic,-5.5,2.23,-.3,.15);cube.rotation.set(.4,.5,.3);
      box(group,9.8,.25,2.5,graphite,0,.2,-3.9);
      box(group,8.9,.025,.05,glow,0,.34,-2.68,.009);
    }else if(room===2){
      // Black-box cinema: deep, receding acoustic portals and an overhead slit.
      for(let i=0;i<4;i++){
        const z=-5.1-i*.8;
        for(const side of [-1,1])box(group,.42,7.65,.38,graphite,side*(5.05+i*.32),3.82,z);
        box(group,10.5+i*.64,.32,.38,graphite,0,7.5,z);
        if(i===0||i===3)box(group,9.8+i*.64,.02,.03,glow,0,7.31,z+.22,.005);
      }
      for(const side of [-1,1]){const wing=box(group,2.3,6.8,.2,graphite,side*6.05,3.4,-3.6);wing.rotation.y=side*.42;
        for(let i=0;i<6;i++)box(group,.025,5.9,.035,bronze,side*(5.3+i*.26),3.4,-3.04-i*.11,.005);}
      box(group,10.3,.22,2.5,graphite,0,.16,-4.2);
      for(let i=0;i<3;i++){box(group,11+i*.8,.12,.45,graphite,0,-.005-i*.015,-1.3+i*.62);box(group,10.2+i*.8,.015,.022,glow,0,.059-i*.015,-1.06+i*.62,.005);}
      const reel=mesh(props,new THREE.TorusGeometry(.58,.07,12,64),bronze,5.85,1.28,0);reel.rotation.y=.2;
      mesh(group,new THREE.CylinderGeometry(.83,.85,.48,48),graphite,5.85,.24,0);
    }else{
      // A suspended digital atelier, translucent layers instead of a solid wall.
      for(let i=0;i<3;i++){
        const x=(i-1)*5.3,z=-6.4-Math.abs(i-1)*.5;
        const panel=box(group,4.65,7.25,.06,glass,x,4.1,z,.025);panel.castShadow=false;panel.receiveShadow=false;
        for(const side of [-1,1])box(group,.035,7.35,.04,alloy,x+side*2.35,4.1,z+.05,.007);
        box(group,4.73,.025,.025,glow,x,.44,z+.07,.005);
        box(group,4.73,.035,.045,alloy,x,7.76,z+.05,.007);
      }
      box(group,9.6,.12,1.65,alloy,0,.32,-3.7,.045);
      for(const side of [-1,1])box(group,.04,8,.04,alloy,side*4.7,4.37,-4.4,.006);
      for(let i=0;i<3;i++){const panel=box(props,1.4,2.2,.1,alloy,5.55+i*.36,1.9+i*.22,-.5-i*.45,.08);panel.rotation.y=-.4;}
      mesh(group,new THREE.CylinderGeometry(1.05,1.12,.35,64),graphite,5.8,.175,-.6);
      for(let i=0;i<7;i++)box(group,.24,.014,.025,glow,-4+i*.38,.09,1.7,.003);
    }
  };
}
