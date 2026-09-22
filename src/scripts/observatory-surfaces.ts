import * as THREE from 'three';

/** Shared 512px PBR surfaces: detail in textures, not thousands of polygons. */
export function observatorySurfaces() {
  let seed = 9187;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  function canvas() { const c = document.createElement('canvas'); c.width = c.height = 512; return c; }
  function texture(c: HTMLCanvasElement, color = false, repeat = 1) {
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat); t.anisotropy = 4;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const stone = canvas(), floor = canvas(), brushed = canvas();
  const ctx = stone.getContext('2d')!, pixels = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const vein = Math.sin(x * .028 + Math.sin(y * .015) * 3 + Math.sin(x * .011 + y * .012));
    const v = 140 + random() * 14 + vein * 3; const n = (y * 512 + x) * 4;
    pixels.data[n] = v; pixels.data[n + 1] = v + 3; pixels.data[n + 2] = v + 5; pixels.data[n + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const fc = floor.getContext('2d')!; fc.drawImage(stone, 0, 0);
  // Recessed expansion joints, polished edges and flush fasteners in basalt tiles.
  for (let y = 0; y < 512; y += 128) for (let x = 0; x < 512; x += 128) {
    fc.fillStyle = `rgba(5,9,14,${.08 + random() * .14})`; fc.fillRect(x, y, 128, 128);
    fc.strokeStyle = '#7d858e'; fc.lineWidth = 1; fc.strokeRect(x + 1, y + 1, 126, 126);
    fc.strokeStyle = 'rgba(237,241,246,.12)'; fc.lineWidth = 1; fc.strokeRect(x + 3, y + 3, 122, 122);
    for (const ox of [9, 119]) for (const oy of [9, 119]) {
      fc.fillStyle = '#636d77'; fc.beginPath(); fc.arc(x + ox, y + oy, 1.5, 0, Math.PI * 2); fc.fill();
    }
  }
  const bc = brushed.getContext('2d')!; bc.fillStyle = '#cccccc'; bc.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y++) {
    const value = Math.round(190 + random() * 35); bc.strokeStyle = `rgb(${value},${value},${value})`; bc.lineWidth = 1;
    bc.beginPath(); bc.moveTo(0, y); bc.lineTo(512, y); bc.stroke();
  }
  for (let i = 0; i < 75; i++) {
    bc.fillStyle = 'rgba(45,45,45,.2)'; bc.fillRect(random() * 512, random() * 512, 10 + random() * 90, .5);
  }
  return {
    floorColor: texture(floor, true, 2), floorRelief: texture(floor, false, 2),
    stoneColor: texture(stone, true, 2), stoneRelief: texture(stone, false, 2),
    metal: texture(brushed, false, 2),
  };
}
