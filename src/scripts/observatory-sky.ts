import * as THREE from 'three';

/** Camera-relative sky: one star draw, one dust plane and a rare two-draw comet. */
export function createObservatorySky(mobile: boolean) {
  const root = new THREE.Group();root.name = 'Observatory celestial sky';
  let seed = 84731;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  const count = mobile ? 650 : 1400;
  const positions = new Float32Array(count * 3), sizes = new Float32Array(count), phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions.set([(random() - .5) * 270, random() * 115 - 35, -55 - random() * 100], i * 3);
    sizes[i] = random() > .94 ? 4 + random() * 2 : 1.5 + random() * 1.8;
    phases[i] = random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('starSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
  const stars = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, pixelRatio: { value: 1 } },
    vertexShader: `attribute float starSize;attribute float phase;uniform float time;uniform float pixelRatio;varying float light;
      void main(){light=.72+.22*sin(phase+time*.55);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=starSize*pixelRatio;}`,
    fragmentShader: `varying float light;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.04,.45,d))*light;
      gl_FragColor=vec4(vec3(.84,.9,1.),a);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  root.add(new THREE.Points(geometry, stars));
  const nearPositions=new Float32Array((mobile?45:100)*3);
  for(let i=0;i<nearPositions.length;i+=3)nearPositions.set([(random()-.5)*62,random()*24-3,random()*35-18],i);
  const nearGeometry=new THREE.BufferGeometry();nearGeometry.setAttribute('position',new THREE.BufferAttribute(nearPositions,3));
  const nearMaterial=new THREE.ShaderMaterial({
    uniforms:{time:{value:0},pixelRatio:{value:1}},
    vertexShader:`uniform float time;uniform float pixelRatio;varying float strength;
      void main(){vec3 p=position;p.y+=sin(time*.09+p.x)*.35;p.x+=sin(time*.06+p.z)*.45;
      vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
      gl_PointSize=clamp(20./max(1.,-view.z),.65,2.)*pixelRatio;strength=.14*clamp(-view.z/5.,0.,1.);}`,
    fragmentShader:`varying float strength;void main(){float alpha=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.8,.86,.88,alpha*strength);}`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false
  });
  const nearDust=new THREE.Points(nearGeometry,nearMaterial);nearDust.name='Near orbital dust';root.add(nearDust);


  // A restrained blue-grey interstellar dust band, baked once into a small texture.
  const canvas = document.createElement('canvas');canvas.width = 768;canvas.height = 384;
  const ctx = canvas.getContext('2d')!;ctx.fillStyle='#000';ctx.fillRect(0,0,768,384);
  for (let i = 0; i < 90; i++) {
    const x = random() * 768, y = 235 - x * .15 + (random() - .5) * 90, radius = 35 + random() * 110;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(91,112,145,${.025 + random() * .065})`);glow.addColorStop(1, 'rgba(36,48,72,0)');
    ctx.fillStyle = glow;ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  // Fade all four texture edges so the nebula never exposes a rectangular plane.
  const dustPixels=ctx.getImageData(0,0,768,384);
  const smooth=(v:number)=>{const t=Math.min(1,Math.max(0,v));return t*t*(3-2*t);};
  for(let y=0;y<384;y++)for(let x=0;x<768;x++){
    const edge=smooth(Math.min(x,767-x)/140)*smooth(Math.min(y,383-y)/90);
    for(let channel=0;channel<3;channel++)dustPixels.data[(y*768+x)*4+channel]*=edge;
  }
  ctx.putImageData(dustPixels,0,0);
  const dustTexture = new THREE.CanvasTexture(canvas);dustTexture.colorSpace = THREE.SRGBColorSpace;
  const dust = new THREE.Mesh(new THREE.PlaneGeometry(250, 125), new THREE.MeshBasicMaterial({ map: dustTexture, transparent: true, opacity: .7, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  dust.position.set(-35, 18, -150);root.add(dust);

  const rockCanvas=document.createElement('canvas');rockCanvas.width=512;rockCanvas.height=256;
  const rock=rockCanvas.getContext('2d')!,rockPixels=rock.createImageData(512,256);
  for(let i=0;i<rockPixels.data.length;i+=4){const value=155+random()*28;rockPixels.data[i]=rockPixels.data[i+1]=rockPixels.data[i+2]=value;rockPixels.data[i+3]=255;}
  rock.putImageData(rockPixels,0,0);
  for(let i=0;i<360;i++){
    const x=random()*512,y=random()*256,r=1+random()**3*12;
    const crater=rock.createRadialGradient(x-r*.18,y-r*.15,r*.1,x,y,r);
    crater.addColorStop(0,'rgba(21,26,33,.15)');crater.addColorStop(.68,'rgba(30,36,42,.09)');crater.addColorStop(.82,'rgba(235,238,242,.1)');crater.addColorStop(1,'rgba(140,140,140,0)');
    rock.fillStyle=crater;rock.fillRect(x-r,y-r,r*2,r*2);
  }
  const rockMap=new THREE.CanvasTexture(rockCanvas);rockMap.colorSpace=THREE.SRGBColorSpace;
  const relief=rockMap.clone();relief.colorSpace=THREE.NoColorSpace;relief.needsUpdate=true;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 40, 28), new THREE.MeshStandardMaterial({ color: '#515b69', map:rockMap,bumpMap:relief,bumpScale:.065,roughness: .94, fog: false }));
  moon.position.set(-43, 22, -92);root.add(moon);
  // Fresnel rim is a single small mesh; no bloom or full-screen post-processing.
  const rimMaterial=new THREE.ShaderMaterial({
    vertexShader:`varying vec3 normalView;varying vec3 towardEye;void main(){vec4 view=modelViewMatrix*vec4(position,1.);normalView=normalize(normalMatrix*normal);towardEye=normalize(-view.xyz);gl_Position=projectionMatrix*view;}`,
    fragmentShader:`varying vec3 normalView;varying vec3 towardEye;void main(){vec3 n=normalize(normalView);float rim=pow(1.-max(dot(n,normalize(towardEye)),0.),3.5);float sun=max(dot(n,normalize(vec3(-.7,.4,.5))),0.);gl_FragColor=vec4(.55,.69,.79,rim*sun*.55);}`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false
  });
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(9.12,40,28),rimMaterial);atmosphere.position.copy(moon.position);root.add(atmosphere);

  const orbitMat = new THREE.LineBasicMaterial({ color: '#a1b6ca', transparent: true, opacity: .12, depthWrite: false, fog: false });
  for (let i = 0; i < 2; i++) {
    const curve = new THREE.EllipseCurve(0, 0, 15 + i * .9, 15 + i * .9, 0, Math.PI * 2, false, 0);
    const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(curve.getPoints(120)), orbitMat);
    orbit.position.copy(moon.position);orbit.rotation.set(1.05, .2, -.3);root.add(orbit);
  }

  const comet = new THREE.Group();root.add(comet);
  const tail = [], colors = [];
  for (let i = 0; i < 32; i++) {
    const t = i / 31;tail.push(-t * 19, t * 6.2, 0);
    const brightness = (1 - t) ** 2;colors.push(brightness * .63, brightness * .8, brightness);
  }
  const trailGeometry = new THREE.BufferGeometry();trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tail, 3));trailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const trailMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending });
  comet.add(new THREE.Line(trailGeometry, trailMaterial));
  const headCanvas = document.createElement('canvas');headCanvas.width = headCanvas.height = 32;
  const headCtx = headCanvas.getContext('2d')!, glow = headCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, '#fff');glow.addColorStop(.12, '#deefff');glow.addColorStop(1, 'transparent');headCtx.fillStyle = glow;headCtx.fillRect(0, 0, 32, 32);
  const headMaterial = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(headCanvas), color: '#dcecff', transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending });
  const head = new THREE.Sprite(headMaterial);head.scale.setScalar(.85);comet.add(head);
  let elapsed = 0;
  return { root, update(dt: number, position: number, calm: boolean, pixelRatio: number) {
    root.position.x = position * .96;
    if (!calm) elapsed += dt;
    stars.uniforms.time.value = elapsed;stars.uniforms.pixelRatio.value = pixelRatio;
    nearDust.position.x=position*.04;nearMaterial.uniforms.time.value=elapsed;nearMaterial.uniforms.pixelRatio.value=pixelRatio;
    dust.position.x=-35+Math.sin(elapsed*.012)*5;dust.position.y=18+Math.sin(elapsed*.009)*2;dust.rotation.z=Math.sin(elapsed*.006)*.022;
    const phase = (elapsed + 13) % 18, progress = phase / 2.4;
    comet.visible = !calm && phase < 2.4;
    if (comet.visible) {
      comet.position.set(-70 + progress * 90, 36 - progress * 29, -83);
      const opacity = Math.min(1, progress * 8, (1 - progress) * 6);
      trailMaterial.opacity = opacity;headMaterial.opacity = opacity;
    }
  } };
}
