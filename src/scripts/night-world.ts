// The world of the night scene: a formal garden at night in front of a glass pavilion. A dusky sky with
// stars and a moon (also baked into the environment, so glass, skin and water reflect a real night), two
// mirror pools either side of a stone walkway lined with lanterns, grass moving in the wind, rows of
// cypresses, far hills, a breath of mist over the water. The pavilion is dressed as a home: polished
// floors, a warm timber core, and inside it the kitchen, the lounge and the hanging garden from the Model
// Room, his own models, as the furniture of the life he describes.
import * as THREE from 'three';
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const skyVertex = `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const skyFragment = `varying vec3 vP; uniform vec3 uMoon;
  void main(){ float h = clamp(vP.y, -.1, 1.);
    vec3 horizon = vec3(.2,.11,.2), glow = vec3(.42,.2,.26), zenith = vec3(.008,.014,.045);
    vec3 c = mix(horizon, zenith, pow(max(h, 0.), .42)); c += glow * exp(-abs(h) * 13.) * .6;
    // The milky way: a faint band across the sky.
    float band = exp(-pow(dot(vP, normalize(vec3(.35, .55, -.76))) * 5.5, 2.)) * smoothstep(-.05, .3, h);
    c += vec3(.05, .05, .08) * band;
    float m = max(dot(vP, uMoon), 0.); c += vec3(.55, .6, .75) * (pow(m, 900.) * 3. + pow(m, 30.) * .08);
    gl_FragColor = vec4(c, 1.); }`;

export function glowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,.35)') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, inner); g.addColorStop(.3, mid); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function canvasTexture(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void, repeat = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createWorld(o: { scene: THREE.Scene; renderer: THREE.WebGLRenderer; loader: GLTFLoader; mobile: boolean }) {
  const { scene, renderer, loader, mobile } = o;
  const own: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => { own.push(x); return x; };
  const updates: ((t: number) => void)[] = [];
  const moonDir = V(-.45, .42, -.79).normalize();

  // ── Sky, stars, moon ──────────────────────────────────────────────────────────────────────────────────
  const skyMat = keep(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uMoon: { value: moonDir } }, vertexShader: skyVertex, fragmentShader: skyFragment }));
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(300, 48, 24)), skyMat); scene.add(sky);
  const STARS = mobile ? 1200 : 3200, sp = new Float32Array(STARS * 3), sd = new Float32Array(STARS);
  for (let i = 0; i < STARS; i++) { const u = Math.random() * Math.PI * 2, v = Math.acos(1 - Math.random() * .95); sp.set([Math.sin(v) * Math.cos(u) * 250, Math.cos(v) * 250, Math.sin(v) * Math.sin(u) * 250], i * 3); sd[i] = Math.random(); }
  const starGeo = keep(new THREE.BufferGeometry()); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); starGeo.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
  const starMat = keep(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: renderer.getPixelRatio() } }, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float seed; uniform float uTime, uScale; varying float vA; void main(){ vA = (.25 + .75 * (.5 + .5 * sin(uTime * (.8 + seed * 2.) + seed * 40.))) * (.35 + seed * .65); gl_PointSize = (.8 + pow(seed, 3.) * 2.6) * uScale; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1., .96, .9) * vA, smoothstep(.5, .05, d)); }`,
  }));
  scene.add(new THREE.Points(starGeo, starMat));
  updates.push(t => { starMat.uniforms.uTime.value = t; });
  const moon = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(glowTexture('rgba(255,251,240,1)', 'rgba(200,215,255,.22)')), fog: false, depthWrite: false, color: new THREE.Color(1.8, 1.8, 1.7), toneMapped: false })));
  moon.position.copy(moonDir).multiplyScalar(240); moon.scale.setScalar(22); scene.add(moon);

  // The environment everything reflects: this sky, and the warm glow of the house low in front.
  {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMat));
    const warm = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.35, .7), side: THREE.DoubleSide }));
    warm.position.set(0, .9, -8); env.add(warm);
    const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(env, .02); pm.dispose(); keep(rt);
    scene.environment = rt.texture; scene.environmentIntensity = .55;
  }

  // ── Light ─────────────────────────────────────────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight('#34467a', '#0e0a07', .35));
  const moonLight = new THREE.DirectionalLight('#aebfff', .75); moonLight.position.copy(moonDir).multiplyScalar(40).add(V(0, 0, 30)); moonLight.target.position.set(0, 0, 14);
  moonLight.castShadow = true; moonLight.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(moonLight.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 5, far: 90 }); moonLight.shadow.bias = -.0004; moonLight.shadow.normalBias = .02;
  scene.add(moonLight, moonLight.target);
  // A cool rim from behind the house, so their outlines separate from the warm glass.
  const rim = new THREE.SpotLight('#9fb6ff', 0, 30, .45, .8, 1.2); rim.position.set(-3, 7, 4); rim.target.position.set(0, 1.2, 13.4); scene.add(rim, rim.target);

  // ── The ground: stone, a walkway over two mirror pools, lawns ─────────────────────────────────────────
  const stone = canvasTexture(512, 512, x => {
    x.fillStyle = '#5b574f'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 250 : 0},240,${Math.random() * .05})`; x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
    x.strokeStyle = 'rgba(20,18,16,.55)'; x.lineWidth = 3;
    for (let k = 0; k <= 512; k += 128) { x.beginPath(); x.moveTo(0, k); x.lineTo(512, k); x.stroke(); x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 512); x.stroke(); }
  });
  const slabMat = keep(new THREE.MeshPhysicalMaterial({ map: stone, color: '#9a948a', roughness: .72, clearcoat: .25, clearcoatRoughness: .5 }));
  const lawnMat = keep(new THREE.MeshStandardMaterial({ color: '#0d1710', roughness: 1 }));
  const ground = new THREE.Mesh(keep(new THREE.CircleGeometry(170, 64)), lawnMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const slab = (w: number, d: number, x: number, z: number, y = .02, repeat = 1) => {
    const m = slabMat.clone(); keep(m); m.map = stone.clone(); keep(m.map); m.map.repeat.set(w / 2.4 * repeat, d / 2.4 * repeat); m.map.needsUpdate = true;
    const g = new THREE.Mesh(keep(new THREE.BoxGeometry(w, .08, d)), m); g.position.set(x, y - .04, z); g.receiveShadow = true; scene.add(g); return g;
  };
  slab(2.6, 22.5, 0, 26.3);                  // the walkway
  slab(18, 5.2, 0, 13.4);                     // the terrace in front of the house
  slab(22, .5, 0, 15.9, .06); slab(22, .5, 0, 37.7, .06); slab(.5, 22.3, 11, 26.8, .06); slab(.5, 22.3, -11, 26.8, .06);   // coping round the pools
  // The water: one mirror under the walkway, dark and still, with a slow ripple.
  const WATER = { w: 21.5, d: 21.4, z: 26.8 };
  const still = new THREE.Mesh(keep(new THREE.PlaneGeometry(WATER.w, WATER.d)), keep(new THREE.MeshPhysicalMaterial({ color: '#02050a', roughness: .04, metalness: .3, envMapIntensity: 1.4 })));
  still.rotation.x = -Math.PI / 2; still.position.set(0, .005, WATER.z); scene.add(still);
  let mirror: THREE.Mesh | null = null;
  if (!mobile) {
    const water = new Reflector(keep(new THREE.PlaneGeometry(WATER.w, WATER.d)), {
      textureWidth: Math.min(1024, innerWidth), textureHeight: Math.min(1024, innerHeight), clipBias: .003, color: 0x7a8698,
      shader: {
        name: 'NightWater', uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: { value: 0 } },
        vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main(){ vUv = textureMatrix * vec4(position, 1.); vW = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
        fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; uniform float uTime; varying vec4 vUv; varying vec3 vW;
          void main(){ vec2 r = vec2(sin(vW.x * 3.1 + uTime * .9) + sin(vW.z * 4.3 - uTime * 1.3 + vW.x), cos(vW.z * 2.7 + uTime * .7) + sin(vW.x * 5.1 - uTime)) * .004;
            vec4 uv = vUv; uv.xy += r * uv.w; vec3 refl = texture2DProj(tDiffuse, uv).rgb;
            vec3 deep = vec3(.003, .006, .01); gl_FragColor = vec4(mix(deep, refl * color, .7), 1.);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      },
    }) as THREE.Mesh & { material: THREE.ShaderMaterial };
    water.rotation.x = -Math.PI / 2; water.position.set(0, .006, WATER.z); scene.add(water); still.visible = false; mirror = water;
    updates.push(t => { water.material.uniforms.uTime.value = t; });
    own.push({ dispose: () => (water as unknown as { dispose(): void }).dispose() });
  }

  // Grass: thin blades that lean in a slow wind, everywhere but the stone and the water.
  let grassMesh: THREE.InstancedMesh | null = null;
  {
    const COUNT = mobile ? 14000 : 60000;
    const blade = keep(new THREE.PlaneGeometry(.035, .32, 1, 3)); blade.translate(0, .16, 0);
    const pos = blade.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / .32; pos.setX(i, pos.getX(i) * (1 - y * .92)); }
    const mat = keep(new THREE.MeshStandardMaterial({ color: '#2f4a2c', roughness: .9, side: THREE.DoubleSide }));
    const shader = { uTime: { value: 0 } };
    mat.onBeforeCompile = s => {
      s.uniforms.uTime = shader.uTime;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; varying float vTip;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 wp = instanceMatrix * vec4(0., 0., 0., 1.); float tip = position.y / .32; vTip = tip;
          float gust = sin(wp.x * .35 + uTime * 1.2) * .5 + sin(wp.z * .5 + uTime * .8) * .5;
          transformed.x += tip * tip * (.08 + .07 * gust); transformed.z += tip * tip * .04 * sin(uTime * 1.7 + wp.x);`);
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTip;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(.35, 1.25, vTip);');
    };
    mat.customProgramCacheKey = () => 'grass';
    const grass = new THREE.InstancedMesh(blade, mat, COUNT); grass.receiveShadow = true; grassMesh = grass;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let n = 0;
    while (n < COUNT) {
      const r = 6 + Math.pow(Math.random(), .7) * 46, a = Math.random() * Math.PI * 2, x = Math.cos(a) * r, z = 18 + Math.sin(a) * r;
      if (Math.abs(x) < 11.4 && z > 15.4 && z < 38.2) continue;          // pools and walkway
      if (Math.abs(x) < 9.2 && z > 10.7 && z < 16.2) continue;           // the terrace
      if (Math.abs(x) < 16.4 && z < 11.8 && z > -9.8) continue;          // the house
      q.setFromEuler(e.set((Math.random() - .5) * .3, Math.random() * Math.PI, (Math.random() - .5) * .3));
      m4.compose(V(x, 0, z), q, V(1, .6 + Math.random() * .9, 1)); grass.setMatrixAt(n++, m4);
    }
    grass.frustumCulled = false; scene.add(grass);
    updates.push(t => { shader.uTime.value = t; });
  }

  // Cypresses along the pools, and far hills round the horizon.
  {
    const profile = Array.from({ length: 14 }, (_, i) => { const t = i / 13; return new THREE.Vector2(Math.sin(Math.pow(t, .7) * Math.PI) * .55 * (1 - t * .3) + (i === 0 ? .01 : 0), t * 6.5); });
    const cone = keep(new THREE.LatheGeometry(profile, 12));
    const cp = cone.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < cp.count; i++) { const k = 1 + (Math.sin(cp.getY(i) * 7 + Math.atan2(cp.getZ(i), cp.getX(i)) * 3) * .08); cp.setX(i, cp.getX(i) * k); cp.setZ(i, cp.getZ(i) * k); }
    cone.computeVertexNormals();
    const leaf = keep(new THREE.MeshStandardMaterial({ color: '#0f1d14', roughness: .95 }));
    const trees = new THREE.InstancedMesh(cone, leaf, 26); const m4 = new THREE.Matrix4(); let n = 0;
    for (const x of [-12.6, 12.6]) for (let z = 17; z <= 37; z += 2.1) { m4.compose(V(x, 0, z), new THREE.Quaternion(), V(1, .85 + Math.random() * .35, 1)); trees.setMatrixAt(n++, m4); }
    for (const x of [-20, 20]) for (const z of [2, 8]) { m4.compose(V(x, 0, z), new THREE.Quaternion(), V(1.3, 1.25, 1.3)); trees.setMatrixAt(n++, m4); }
    trees.count = n; trees.castShadow = true; trees.receiveShadow = true; scene.add(trees);
    const hills = keep(new THREE.CylinderGeometry(150, 150, 1, 128, 1, true));
    const hp = hills.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < hp.count; i++) if (hp.getY(i) > 0) { const a = Math.atan2(hp.getZ(i), hp.getX(i)); hp.setY(i, 6 + 9 * (Math.sin(a * 3) * .5 + .5) * (Math.sin(a * 7 + 1) * .3 + .7) + 4 * Math.sin(a * 17)); } else hp.setY(i, -1);
    const hm = new THREE.Mesh(hills, keep(new THREE.MeshBasicMaterial({ color: '#070a14', side: THREE.BackSide, fog: false }))); hm.position.set(0, 0, 10); scene.add(hm);
  }

  // Mist lying on the water.
  const mistMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }`,
    fragmentShader: `uniform float uTime; varying vec3 vW;
      float n(vec2 p){ return sin(p.x) * sin(p.y); }
      void main(){ vec2 p = vW.xz * .35 + vec2(uTime * .05, uTime * .02); float f = n(p) * .5 + n(p * 2.3 + 1.7) * .3 + n(p * 5.1 - uTime * .1) * .2;
        float edge = smoothstep(0., 3., 11. - abs(vW.x)) * smoothstep(0., 3., vW.z - 15.5) * smoothstep(0., 3., 38. - vW.z);
        gl_FragColor = vec4(vec3(.55, .6, .75), clamp(f * .5 + .5, 0., 1.) * .09 * edge); }`,
  }));
  const mist = new THREE.Mesh(keep(new THREE.PlaneGeometry(24, 24)), mistMat); mist.rotation.x = -Math.PI / 2; mist.position.set(0, .25, 26.8); mist.renderOrder = 3; scene.add(mist);
  updates.push(t => { mistMat.uniforms.uTime.value = t; });

  // ── Lanterns along the walkway (their light is in the water) ──────────────────────────────────────────
  const brass = keep(new THREE.MeshStandardMaterial({ color: '#16130f', roughness: .45, metalness: .7 }));
  const lanterns: { mat: THREE.MeshStandardMaterial; z: number }[] = [];
  const postGeo = keep(new THREE.CylinderGeometry(.018, .026, .62, 10)), headGeo = keep(new THREE.BoxGeometry(.1, .15, .1)), capGeo = keep(new THREE.ConeGeometry(.08, .06, 4));
  for (let z = 36.5; z >= 16.5; z -= 2.5) for (const x of [-1.15, 1.15]) {
    const p = new THREE.Mesh(postGeo, brass); p.position.set(x, .33, z); scene.add(p);
    const m = keep(new THREE.MeshStandardMaterial({ color: '#2a1c10', emissive: '#ffb45e', emissiveIntensity: 0 })); lanterns.push({ mat: m, z });
    const h = new THREE.Mesh(headGeo, m); h.position.set(x, .7, z); scene.add(h);
    const c = new THREE.Mesh(capGeo, brass); c.position.set(x, .8, z); c.rotation.y = Math.PI / 4; scene.add(c);
  }

  // ── The pavilion, dressed as a home ───────────────────────────────────────────────────────────────────
  const houseLights: { m: THREE.MeshStandardMaterial; at: number; gain: number }[] = [];
  const inside: THREE.PointLight[] = [];
  const slats = canvasTexture(1024, 256, x => {
    // Dark walnut slats with their grooves: the timber core of the house.
    for (let i = 0; i < 64; i++) { const tone = 60 + Math.random() * 25; x.fillStyle = `rgb(${tone + 30},${tone + 12},${tone - 5})`; x.fillRect(i * 16, 0, 13, 256); x.fillStyle = 'rgba(0,0,0,.8)'; x.fillRect(i * 16 + 13, 0, 3, 256); }
    for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * .12})`; x.fillRect(Math.random() * 1024, Math.random() * 256, 1, 20 + Math.random() * 60); }
  });
  /** No usable UVs came with the core: project the slats onto each face from its own side (3 m per repeat). */
  function projectUV(g: THREE.BufferGeometry) {
    const pa = g.attributes.position as THREE.BufferAttribute, na = g.attributes.normal as THREE.BufferAttribute, uv = new Float32Array(pa.count * 2);
    for (let i = 0; i < pa.count; i++) {
      const nx = Math.abs(na.getX(i)), ny = Math.abs(na.getY(i)), nz = Math.abs(na.getZ(i));
      const [u, v] = nx > nz && nx > ny ? [pa.getZ(i), pa.getY(i)] : nz > ny ? [pa.getX(i), pa.getY(i)] : [pa.getX(i), pa.getZ(i)];
      uv[i * 2] = u / 3; uv[i * 2 + 1] = v / 4.7;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  const house = loader.loadAsync(mobile ? '/models/night/pavilion.mobile.glb' : '/models/night/pavilion.glb').then(gltf => {
    gltf.scene.traverse(n => {
      const mesh = n as THREE.Mesh; if (!mesh.isMesh) return;
      const m = mesh.material as THREE.MeshStandardMaterial, name = m.name;
      mesh.receiveShadow = true; mesh.castShadow = !/Glass|Light/.test(name);
      if (name === 'Glass') mesh.material = keep(new THREE.MeshPhysicalMaterial({ color: '#b9ccd2', metalness: .05, roughness: .03, transparent: true, opacity: .16, depthWrite: false, envMapIntensity: 1.6, specularIntensity: 1 }));
      else if (name === 'BacklightBackWall') {
        projectUV(mesh.geometry);
        // The core's faces: timber slats, washed from above by the light strip.
        const t = slats.clone(); keep(t); t.repeat.set(1, 1); t.needsUpdate = true;
        mesh.material = keep(new THREE.MeshStandardMaterial({ name, map: t, color: '#b58d6a', roughness: .55, emissive: '#ffb070', emissiveMap: t, emissiveIntensity: 0 }));
        houseLights.push({ m: mesh.material as THREE.MeshStandardMaterial, at: 8, gain: .05 });
      } else if (/Light/.test(name) && name !== 'MatteGreyLight') {   // the light strips (not the core's 'MatteGreyLight' walls)
        const lit = keep(new THREE.MeshStandardMaterial({ color: '#221a12', emissive: '#ffc27a', emissiveIntensity: 0, name }));
        mesh.material = lit; houseLights.push({ m: lit, at: { BacklightCeilingPerimeter: 4, CeilingSpotLights: 6, FloorLight: 10 }[name] ?? 7, gain: { BacklightCeilingPerimeter: 1.4, CeilingSpotLights: 2.2, FloorLight: 1.1 }[name] ?? 1 });
      } else if (name === 'Black') mesh.material = keep(new THREE.MeshPhysicalMaterial({ color: '#0d0e10', roughness: .22, metalness: .1, clearcoat: .8, clearcoatRoughness: .08, envMapIntensity: 1.1 }));   // polished dark stone floor and frames
      else if (name === 'Matte') mesh.material = keep(new THREE.MeshStandardMaterial({ color: '#24262a', roughness: .35, metalness: .75 }));   // bronze-dark mullions
      else if (name === 'MatteGreyLight') { projectUV(mesh.geometry); const t = slats.clone(); keep(t); t.needsUpdate = true; mesh.material = keep(new THREE.MeshStandardMaterial({ map: t, color: '#8a6a50', roughness: .6 })); }
      else if (name === 'MatteGreyDark') { m.color.set('#1a1b1d'); m.roughness = .7; }
      else if (name === 'wood') { m.color.set('#b08868'); m.roughness = .55; }
    });
    scene.add(gltf.scene);
    for (const [x, z] of [[-7, 3], [7, 3]]) { const l = new THREE.PointLight('#ffc98f', 0, 16, 1.5); l.position.set(x, 3.6, z); l.castShadow = false; scene.add(l); inside.push(l); }
  });
  // The furniture of their life, from the Model Room.
  const furniture = Promise.all([
    loader.loadAsync(mobile ? '/models/exhibits/sofa.mobile.glb' : '/models/exhibits/sofa.glb').then(g => { g.scene.position.set(0, 0, 7.4); g.scene.rotation.y = Math.PI; return g.scene; }),
    loader.loadAsync(mobile ? '/models/exhibits/plant-pendant.mobile.glb' : '/models/exhibits/plant-pendant.glb').then(g => { g.scene.position.set(0, 2.9, 7.2); return g.scene; }),
    mobile ? Promise.resolve(null) : loader.loadAsync('/models/exhibits/kitchen-modern-25.glb').then(g => { g.scene.position.set(-9.2, .02, 1.5); g.scene.rotation.y = Math.PI / 2; g.scene.scale.setScalar(.95); return g.scene; }),
  ]).then(parts => {
    // The lounge and the planter dressed as in the Model Room (their textures never made it into the archive).
    const velvet = (color: string, sheen: string) => keep(new THREE.MeshPhysicalMaterial({ color, roughness: .82, sheen: 1, sheenColor: new THREE.Color(sheen), sheenRoughness: .42 }));
    const fabric = (color: string) => keep(new THREE.MeshPhysicalMaterial({ color, roughness: .95, sheen: .45, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: .8 }));
    const swap: Record<string, () => THREE.Material> = {
      'Material #7100': () => velvet('#23402f', '#7fc6a0'), 'Material #7087': () => velvet('#1a3226', '#5fa07e'), 'Material #7024': () => fabric('#d9cfbb'),
      'Material #7137': () => fabric('#b8764f'), 'Material #7162': () => velvet('#2f5a47', '#8fd0b0'), 'Material #7136': () => fabric('#cbbfa6'), 'Material #7160': () => fabric('#1e2426'),
    };
    parts[0]?.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh) { const name = (m.material as THREE.Material).name; if (swap[name]) m.material = swap[name](); } });
    parts[1]?.traverse(n => { const m = n as THREE.Mesh; if (!m.isMesh) return; const mat = m.material as THREE.MeshStandardMaterial; if (mat.name === 'wire_088144225') { mat.color.set('#1d2120'); mat.metalness = .6; } else { mat.color.set('#3c7a4b'); mat.metalness = 0; mat.roughness = .72; mat.side = THREE.DoubleSide; } });
    for (const part of parts) {
      if (!part) continue;
      part.traverse(n => { const m = n as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; const mat = m.material as THREE.MeshStandardMaterial; if (mat.metalness > .9 && !mat.map) mat.metalness = .6; } });
      scene.add(part);
    }
    const lamp = new THREE.PointLight('#ffc070', 0, 7, 2); lamp.position.set(0, 2.7, 7.2); scene.add(lamp); inside.push(lamp);
  }).catch(() => {});

  return {
    ready: Promise.all([house, furniture]),
    lanterns, houseLights, inside, rim, moonLight,
    /** Every frame: the time, how far the house has woken, where she is on the walkway. */
    update(t: number, wake: number, camZ: number, intro: boolean) {
      for (const u of updates) u(t);
      for (const l of houseLights) l.m.emissiveIntensity = THREE.MathUtils.smoothstep(wake, l.at, l.at + 1.4) * l.gain;
      inside.forEach((l, i) => (l.intensity = THREE.MathUtils.smoothstep(wake, 4 + i * .9, 6.5 + i * .9) * (i === inside.length - 1 ? 3 : 14)));
      for (const l of lanterns) l.mat.emissiveIntensity = intro ? .25 : THREE.MathUtils.smoothstep(camZ - l.z, -12, -3) * 2.4;
      rim.intensity = THREE.MathUtils.smoothstep(wake, 6, 10) * 40;
    },
    /** 0: everything; 1: a lighter lawn; 2: no mirror, a sparse lawn. */
    setQuality(level: number) {
      if (mirror) { mirror.visible = level < 2; still.visible = level >= 2; }
      if (grassMesh) grassMesh.count = Math.min(grassMesh.instanceMatrix.count, [60000, 28000, 12000][level] ?? 12000);
    },
    dispose() { own.forEach(x => x.dispose()); },
  };
}
