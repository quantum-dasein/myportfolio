// The author's small copy of a work: any model, made into one piece for his wheel. Pure arithmetic on typed
// arrays, so it can run in a worker (model-room-piece.worker.ts) and never cost the room a frame.
//
// All the model's meshes become one geometry, scaled to stand on the wheel (no taller than his figure, no
// wider than a hand past the plate). It keeps its own normals, UVs and materials: the triangles of each
// material are one group, ordered bottom to top inside it, so revealing every group up to the same height
// builds the work upwards in its own colours. Alongside: the height of every triangle in the whole piece (to
// pace the build), the wire's edges in that same order, and how wide the piece is at each height (for the
// band of light and his hands).

export type PiecePart = { position: Float32Array; normal: Float32Array | null; uv: Float32Array | null; index: Uint32Array | null; matrix: ArrayLike<number>; material: number };
export type PieceData = {
  position: Float32Array; normal: Float32Array; uv: Float32Array | null; index: Uint32Array; lines: Uint32Array;
  /** Per material: where its triangles start in `index`, and their heights (ascending). */
  groups: { material: number; start: number; heights: Float32Array }[];
  /** Every triangle's height, ascending (the build's pace). */
  heights: Float32Array; radii: Float32Array; tris: number; h: number;
  /** Per height slice: the piece's outline, [minX, maxX, minZ, maxZ] (for the band of light that hugs it). */
  extents: Float32Array;
};

export const PIECE_BINS = 40;

export function buildPiece(parts: PiecePart[], maxH: number, maxR: number): PieceData | null {
  let verts = 0, idx = 0;
  for (const p of parts) { const n = p.position.length / 3; verts += n; idx += p.index ? p.index.length : n; }
  if (!verts || idx < 3) return null;
  const withUV = parts.some(p => p.uv);
  const P = new Float32Array(verts * 3), N = new Float32Array(verts * 3), UV = withUV ? new Float32Array(verts * 2) : null;
  const index = new Uint32Array(idx), triMat = new Uint32Array(Math.floor(idx / 3)), needNormals: [number, number][] = [];
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let vo = 0, io = 0;
  for (const p of parts) {
    const e = p.matrix, src = p.position, n = src.length / 3;
    for (let i = 0; i < n; i++) {
      const x = src[i * 3], y = src[i * 3 + 1], z = src[i * 3 + 2], o = (vo + i) * 3;
      const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
      P[o] = X; P[o + 1] = Y; P[o + 2] = Z;
      if (X < minX) minX = X; if (X > maxX) maxX = X; if (Y < minY) minY = Y; if (Y > maxY) maxY = Y; if (Z < minZ) minZ = Z; if (Z > maxZ) maxZ = Z;
      if (p.normal) {
        // (The part's own normals, turned with it.)
        const a = p.normal[i * 3], b = p.normal[i * 3 + 1], c = p.normal[i * 3 + 2];
        let nx = e[0] * a + e[4] * b + e[8] * c, ny = e[1] * a + e[5] * b + e[9] * c, nz = e[2] * a + e[6] * b + e[10] * c;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; N[o] = nx; N[o + 1] = ny; N[o + 2] = nz;
      }
      if (UV && p.uv) { UV[(vo + i) * 2] = p.uv[i * 2]; UV[(vo + i) * 2 + 1] = p.uv[i * 2 + 1]; }
    }
    if (!p.normal) needNormals.push([vo, vo + n]);
    const count = p.index ? p.index.length : n;
    if (p.index) for (let i = 0; i < count; i++) index[io + i] = p.index[i] + vo;
    else for (let i = 0; i < count; i++) index[io + i] = vo + i;
    triMat.fill(p.material, io / 3, (io + count) / 3);
    io += count; vo += n;
  }
  // Stand it on the wheel, centred, at a size that fits.
  const sizeY = maxY - minY || 1, reach = Math.max(maxX - minX, maxZ - minZ) / 2 || 1;
  const s = Math.min(maxH / sizeY, maxR / reach), h = Math.max(.01, sizeY * s), cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  for (let i = 0; i < verts; i++) { P[i * 3] = (P[i * 3] - cx) * s; P[i * 3 + 1] = (P[i * 3 + 1] - minY) * s; P[i * 3 + 2] = (P[i * 3 + 2] - cz) * s; }
  const tris = Math.floor(idx / 3), cy = new Float32Array(tris);
  for (let t = 0; t < tris; t++) cy[t] = (P[index[t * 3] * 3 + 1] + P[index[t * 3 + 1] * 3 + 1] + P[index[t * 3 + 2] * 3 + 1]) / 3;
  // Bottom to top, by counting sorts into thin height slices (linear in the size of the model): once over the
  // whole piece (its pace and its wire), once inside each material.
  const BINS = 2048, bin = (y: number) => Math.min(BINS - 1, Math.max(0, Math.floor(y / h * BINS)));
  const order = (keyOf: (t: number) => number, keys: number) => {
    const start = new Uint32Array(keys + 1), out = new Uint32Array(tris);
    for (let t = 0; t < tris; t++) start[keyOf(t) + 1]++;
    for (let k = 1; k <= keys; k++) start[k] += start[k - 1];
    for (let t = 0; t < tris; t++) out[start[keyOf(t)]++] = t;
    return out;
  };
  const byHeight = order(t => bin(cy[t]), BINS);
  const materials = Math.max(...parts.map(p => p.material)) + 1;
  // (Stable: within a material the triangles keep the height order.)
  const byMaterial = new Uint32Array(tris); { const start = new Uint32Array(materials + 1); for (let t = 0; t < tris; t++) start[triMat[t] + 1]++; for (let k = 1; k <= materials; k++) start[k] += start[k - 1]; for (const t of byHeight) byMaterial[start[triMat[t]]++] = t; }
  const sorted = new Uint32Array(tris * 3), heights = new Float32Array(tris), lines = new Uint32Array(tris * 6), groups: PieceData['groups'] = [];
  for (let i = 0; i < tris; i++) {
    const t = byMaterial[i]; sorted[i * 3] = index[t * 3]; sorted[i * 3 + 1] = index[t * 3 + 1]; sorted[i * 3 + 2] = index[t * 3 + 2];
    const last = groups[groups.length - 1];
    if (!last || last.material !== triMat[t]) groups.push({ material: triMat[t], start: i, heights: new Float32Array(0) });
  }
  groups.forEach((g, k) => { const end = k + 1 < groups.length ? groups[k + 1].start : tris; g.heights = new Float32Array(end - g.start); for (let i = g.start; i < end; i++) g.heights[i - g.start] = cy[byMaterial[i]]; });
  for (let i = 0; i < tris; i++) {
    const t = byHeight[i], a = index[t * 3], b = index[t * 3 + 1], c = index[t * 3 + 2], o = i * 6; heights[i] = cy[t];
    lines[o] = a; lines[o + 1] = b; lines[o + 2] = b; lines[o + 3] = c; lines[o + 4] = c; lines[o + 5] = a;
  }
  // How wide it is at each height, and its outline there.
  const radii = new Float32Array(PIECE_BINS), extents = new Float32Array(PIECE_BINS * 4).fill(NaN);
  for (let i = 0; i < verts; i++) {
    const x = P[i * 3], z = P[i * 3 + 2], k = Math.min(PIECE_BINS - 1, Math.max(0, Math.floor(P[i * 3 + 1] / h * PIECE_BINS))), e = k * 4;
    radii[k] = Math.max(radii[k], Math.hypot(x, z));
    if (!(extents[e] <= x)) extents[e] = x; if (!(extents[e + 1] >= x)) extents[e + 1] = x;
    if (!(extents[e + 2] <= z)) extents[e + 2] = z; if (!(extents[e + 3] >= z)) extents[e + 3] = z;
  }
  for (let k = 0; k < PIECE_BINS; k++) {
    if (k && !radii[k]) radii[k] = radii[k - 1];
    if (Number.isNaN(extents[k * 4])) for (let j = 0; j < 4; j++) extents[k * 4 + j] = k ? extents[(k - 1) * 4 + j] : 0;
  }
  // Parts without normals of their own get smooth ones (area weighted).
  if (needNormals.length) {
    for (let t = 0; t < tris; t++) {
      const a = index[t * 3] * 3, b = index[t * 3 + 1] * 3, c = index[t * 3 + 2] * 3;
      if (!needNormals.some(([lo, hi]) => a / 3 >= lo && a / 3 < hi)) continue;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      N[a] += nx; N[a + 1] += ny; N[a + 2] += nz; N[b] += nx; N[b + 1] += ny; N[b + 2] += nz; N[c] += nx; N[c + 1] += ny; N[c + 2] += nz;
    }
    for (const [lo, hi] of needNormals) for (let i = lo * 3; i < hi * 3; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
  }
  return { position: P, normal: N, uv: UV, index: sorted, lines, groups, heights, radii, tris, h, extents };
}
