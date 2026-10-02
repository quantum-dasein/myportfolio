import * as THREE from 'three';

/** A floor aperture and a suspended scanner, shared by every archive exhibit. */
export function createArchivePortal(scene: THREE.Scene, reduced: boolean) {
  const root = new THREE.Group(); root.position.set(1, 0, 5.9); root.name = 'Central archive portal'; scene.add(root);
  const resources: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(v: T): T => { resources.push(v); return v; };
  const metal = own(new THREE.MeshStandardMaterial({ color: '#101c1a', metalness: .7, roughness: .32 }));
  const glow = own(new THREE.MeshBasicMaterial({ color: new THREE.Color(.2, 1.15, .58), toneMapped: false }));
  const soft = own(new THREE.MeshBasicMaterial({ color: '#65ffb0', transparent: true, opacity: .24, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  const disc = new THREE.Mesh(own(new THREE.CylinderGeometry(1.98, 2.02, .055, 96)), metal); disc.position.y = .029; disc.receiveShadow = true; root.add(disc);
  function ring(radius: number, width: number, y: number, material: THREE.Material, arc = Math.PI * 2) {
    const m = new THREE.Mesh(own(new THREE.TorusGeometry(radius, width, 6, 128, arc)), material); m.rotation.x = Math.PI / 2; m.position.y = y; root.add(m); return m;
  }
  ring(2.02, .012, .07, glow); ring(2.22, .006, .018, glow); ring(1.77, .004, .061, soft);
  const crown = new THREE.Group(); crown.position.y = 2.65; root.add(crown);
  // The scanner fades after revealing a work so its front arc does not obscure the model.
  const crownMetal = own(metal.clone()); crownMetal.transparent = true; crownMetal.depthWrite = false;
  const crownGlow = own(glow.clone()); crownGlow.transparent = true; crownGlow.depthWrite = false;
  const arcGeometry = own(new THREE.TorusGeometry(2.13, .019, 8, 72, Math.PI * .49));
  const arcLight = own(new THREE.TorusGeometry(2.13, .009, 6, 72, Math.PI * .43));
  for (let i = 0; i < 3; i++) {
    const arc = new THREE.Mesh(arcGeometry, crownMetal); arc.rotation.set(Math.PI / 2, 0, i * Math.PI * 2 / 3); crown.add(arc);
    const line = new THREE.Mesh(arcLight, crownGlow); line.rotation.copy(arc.rotation); line.position.y = .022; crown.add(line);
  }
  const ticks = new THREE.InstancedMesh(own(new THREE.BoxGeometry(.012, .008, .08)), glow, 72);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; position.set(Math.sin(a) * 2.12, .022, Math.cos(a) * 2.12); rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a); scale.z = i % 6 === 0 ? 1.65 : .65; ticks.setMatrixAt(i, matrix.compose(position, rotation, scale)); } root.add(ticks);
  const housings = own(new THREE.CylinderGeometry(.065, .12, .16, 12));
  const lens = own(new THREE.SphereGeometry(.04, 12, 8));
  for (let i = 0; i < 3; i++) { const a = (i / 3 + .5) * Math.PI * 2; const x = Math.sin(a) * 2.22, z = Math.cos(a) * 2.22; const p = new THREE.Mesh(housings, metal); p.position.set(x, .08, z); root.add(p); const l = new THREE.Mesh(lens, glow); l.position.set(x, .17, z); root.add(l); }
  const sweepMaterial = own(new THREE.MeshBasicMaterial({ color: '#7bffc2', transparent: true, opacity: .2, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  const sweep = new THREE.Mesh(own(new THREE.RingGeometry(0, 1.98, 96)), sweepMaterial); sweep.rotation.x = -Math.PI / 2; sweep.visible = false; root.add(sweep);
  const sweepEdge = ring(1.98, .007, 0, glow); sweepEdge.visible = false;
  const curtainMaterial = own(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScan: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uTime; uniform float uScan; varying vec2 vUv; void main(){float rails=pow(max(0.,cos(vUv.x*6.283185*48.)),24.);float fade=sin(vUv.y*3.141593);float band=exp(-abs(vUv.y-uScan)*48.);float flow=.65+.35*sin(vUv.y*38.-uTime*4.);gl_FragColor=vec4(.2,1.35,.7,(rails*.085*flow+band*.15)*fade);}',
  }));
  const curtain = new THREE.Mesh(own(new THREE.CylinderGeometry(2.03, 2.03, 2.6, 64, 1, true)), curtainMaterial); curtain.position.y = 1.35; curtain.visible = false; root.add(curtain);
  const dustGeometry = own(new THREE.BufferGeometry()); const positions = new Float32Array(96 * 3);
  for (let i = 0; i < 96; i++) { const a = i * 2.399963; const r = 1.85 + (i % 7) * .025; positions[i * 3] = Math.sin(a) * r; positions[i * 3 + 1] = (i / 96) * 2.7 + .12; positions[i * 3 + 2] = Math.cos(a) * r; }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustMaterial = own(new THREE.PointsMaterial({ color: '#a1ffcc', size: .016, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending }));
  const dust = new THREE.Points(dustGeometry, dustMaterial); root.add(dust);
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128;
  const ctx = canvas.getContext('2d')!; const font = getComputedStyle(document.documentElement).getPropertyValue('--font-display');
  ctx.font = `500 34px ${font || 'sans-serif'}`; ctx.textAlign = 'center'; ctx.fillStyle = '#b6e5cb'; ctx.fillText('ARCHIVE  /  SELECT · REVEAL · EXPLORE', 512, 78);
  const texture = own(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(own(new THREE.PlaneGeometry(2.3, .2875)), own(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })));
  label.rotation.x = -Math.PI / 2; label.position.set(0, .013, 2.5); root.add(label);
  return {
    root,
    update(t: number, scanning: boolean, y: number, occupied: boolean) {
      if (!reduced) { crown.rotation.y = t * .075; dust.rotation.y = -t * .045; }
      crownMetal.opacity = occupied && !scanning ? .06 : 1;
      crownGlow.opacity = occupied && !scanning ? .13 : 1;
      crownGlow.color.copy(glow.color);
      dustMaterial.opacity = scanning ? .75 : occupied ? .22 : .12;
      sweep.visible = sweepEdge.visible = curtain.visible = scanning;
      curtainMaterial.uniforms.uTime.value = t; curtainMaterial.uniforms.uScan.value = (y - .05) / 2.6;
      sweep.position.y = sweepEdge.position.y = y;
      sweepMaterial.opacity = .07;
      glow.color.setRGB(.15, scanning ? 1.8 : .9, scanning ? .85 : .48);
    },
    dispose() { root.removeFromParent(); resources.forEach(r => r.dispose()); ticks.dispose(); },
  };
}
