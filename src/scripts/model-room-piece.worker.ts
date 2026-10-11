// Builds the author's small copy of a work off the main thread (see model-room-piece.ts).
import { buildPiece, type PiecePart } from './model-room-piece';

self.onmessage = (event: MessageEvent<{ id: number; parts: PiecePart[]; maxH: number; maxR: number }>) => {
  const { id, parts, maxH, maxR } = event.data;
  const piece = buildPiece(parts, maxH, maxR);
  const transfer: ArrayBuffer[] = [];
  if (piece) {
    for (const a of [piece.position, piece.normal, piece.uv, piece.index, piece.lines, piece.heights, piece.radii]) if (a) transfer.push(a.buffer as ArrayBuffer);
    for (const g of piece.groups) transfer.push(g.heights.buffer as ArrayBuffer);
  }
  (self as unknown as Worker).postMessage({ id, piece }, transfer);
};
