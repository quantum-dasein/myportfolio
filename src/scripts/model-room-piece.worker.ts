// Builds the author's small copy of a work off the main thread (see model-room-piece.ts).
import { buildPiece, type PiecePart } from './model-room-piece';

self.onmessage = (event: MessageEvent<{ id: number; parts: PiecePart[]; maxH: number; maxR: number }>) => {
  const { id, parts, maxH, maxR } = event.data;
  const piece = buildPiece(parts, maxH, maxR);
  const transfer = piece ? [piece.position.buffer, piece.normal.buffer, piece.index.buffer, piece.lines.buffer, piece.heights.buffer, piece.radii.buffer] : [];
  (self as unknown as Worker).postMessage({ id, piece }, transfer);
};
