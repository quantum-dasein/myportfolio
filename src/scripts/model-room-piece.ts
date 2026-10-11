// The author's small copy of a work: any model, made into one piece of clay for his wheel. Pure arithmetic on
// typed arrays, so it can run in a worker (model-room-piece.worker.ts) and never cost the room a frame.
//
// All the model's meshes become one geometry, scaled to stand on the wheel (no taller than his figure, no
// wider than a hand past the plate), with its triangles re-ordered bottom to top: a growing draw range then
// builds it upwards. Alongside: each triangle's height (for the line of light) and how wide the piece is at
// each height (for the band and his tool hand).

export type PiecePart = { position: Float32Array; index: Uint32Array | null; matrix: ArrayLike<number> };
export type PieceData = { position: Float32Array; normal: Float32Array; index: Uint32Array; lines: Uint32Array; heights: Float32Array; radii: Float32Array; tris: number; h: number };

export const PIECE_BINS = 40;

export function buildPiece(parts: PiecePart[], maxH: number, maxR: number): PieceData | null {
  let verts = 0, idx = 0;
  for (const p of parts) { const n = p.position.length / 3; verts += n; idx += p.index ? p.index.length : n; }
  if (!verts || idx < 3) return null;
  const P = new Float32Array(verts * 3), index = new Uint32Array(idx);
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let vo = 0, io = 0;
  for (const p of parts) {
    const e = p.matrix, src = p.position, n = src.length / 3;
    for (let i = 0; i < n; i++) {
      const x = src[i * 3], y = src[i * 3 + 1], z = src[i * 3 + 2], o = (vo + i) * 3;
      const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
      P[o] = X; P[o + 1] = Y; P[o + 2] = Z;
      if (X < minX) minX = X; if (X > maxX) maxX = X; if (Y < minY) minY = Y; if (Y > maxY) maxY = Y; if (Z < minZ) minZ = Z; if (Z > maxZ) maxZ = Z;
    }
    if (p.index) for (let i = 0; i < p.index.length; i++) index[io + i] = p.index[i] + vo;
    else for (let i = 0; i < n; i++) index[io + i] = vo + i;
    io += p.index ? p.index.length : n; vo += n;
  }
  // Stand it on the wheel, centred, at a size that fits.
  const sizeY = maxY - minY || 1, reach = Math.max(maxX - minX, maxZ - minZ) / 2 || 1;
  const s = Math.min(maxH / sizeY, maxR / reach), h = Math.max(.01, sizeY * s), cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  for (let i = 0; i < verts; i++) { P[i * 3] = (P[i * 3] - cx) * s; P[i * 3 + 1] = (P[i * 3 + 1] - minY) * s; P[i * 3 + 2] = (P[i * 3 + 2] - cz) * s; }
  // Bottom to top, by a counting sort into thin height slices (linear in the size of the model).
  const tris = Math.floor(idx / 3), cy = new Float32Array(tris), BINS = 2048, start = new Uint32Array(BINS + 1);
  const bin = (y: number) => Math.min(BINS - 1, Math.max(0, Math.floor(y / h * BINS)));
  for (let t = 0; t < tris; t++) { const y = (P[index[t * 3] * 3 + 1] + P[index[t * 3 + 1] * 3 + 1] + P[index[t * 3 + 2] * 3 + 1]) / 3; cy[t] = y; start[bin(y) + 1]++; }
  for (let k = 1; k <= BINS; k++) start[k] += start[k - 1];
  const sorted = new Uint32Array(tris * 3), heights = new Float32Array(tris);
  for (let t = 0; t < tris; t++) { const i = start[bin(cy[t])]++; sorted[i * 3] = index[t * 3]; sorted[i * 3 + 1] = index[t * 3 + 1]; sorted[i * 3 + 2] = index[t * 3 + 2]; heights[i] = cy[t]; }
  // How wide it is at each height.
  const radii = new Float32Array(PIECE_BINS);
  for (let i = 0; i < verts; i++) { const k = Math.min(PIECE_BINS - 1, Math.max(0, Math.floor(P[i * 3 + 1] / h * PIECE_BINS))); radii[k] = Math.max(radii[k], Math.hypot(P[i * 3], P[i * 3 + 2])); }
  for (let k = 1; k < PIECE_BINS; k++) if (!radii[k]) radii[k] = radii[k - 1];
  // Smooth vertex normals (area weighted), as computeVertexNormals would make them.
  const N = new Float32Array(verts * 3);
  for (let t = 0; t < tris; t++) {
    const a = sorted[t * 3] * 3, b = sorted[t * 3 + 1] * 3, c = sorted[t * 3 + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    N[a] += nx; N[a + 1] += ny; N[a + 2] += nz; N[b] += nx; N[b + 1] += ny; N[b + 2] += nz; N[c] += nx; N[c + 1] += ny; N[c + 2] += nz;
  }
  for (let i = 0; i < verts * 3; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
  // Its edges, three to a triangle in the same order (for the glowing wire ahead of the clay).
  const lines = new Uint32Array(tris * 6);
  for (let t = 0; t < tris; t++) { const a = sorted[t * 3], b = sorted[t * 3 + 1], c = sorted[t * 3 + 2], o = t * 6; lines[o] = a; lines[o + 1] = b; lines[o + 2] = b; lines[o + 3] = c; lines[o + 4] = c; lines[o + 5] = a; }
  return { position: P, normal: N, index: sorted, lines, heights, radii, tris, h };
}
