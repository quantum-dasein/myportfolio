/**
 * What each archive model is made of, counted from its full (desktop) file the way the Model Room counts it
 * (model-room-author.ts, `collect`). Rodion tells these numbers once he has built a work on his wheel; they
 * are fixed here so phones (which load lighter files) hear the same numbers, and so his recorded voice
 * matches what the card says. Recount (`?mrdebug`: `__mr.author.factsOf(__mr.archive.model())`) when a
 * model file changes.
 */
export type ArchiveFacts = { tris: number; parts: number; materials: number; textures: number; px: number; kinds: ('colour' | 'normals' | 'roughness' | 'metal' | 'glow' | 'cut-outs' | 'occlusion')[] };

export const archiveFacts: Record<string, ArchiveFacts> = {
  'gym-equipment-03': { tris: 228833, parts: 8, materials: 8, textures: 1, px: 2048, kinds: ['colour'] },
  'pool-18': { tris: 418843, parts: 12, materials: 12, textures: 4, px: 2048, kinds: ['colour'] },
  'bronze-woman': { tris: 194660, parts: 1, materials: 1, textures: 1, px: 1024, kinds: ['colour'] },
  'waterfall-fountains': { tris: 309851, parts: 6, materials: 3, textures: 1, px: 1024, kinds: ['colour'] },
  'winter-sports': { tris: 83056, parts: 24, materials: 24, textures: 12, px: 3507, kinds: ['colour', 'normals'] },
  'soft-toys-2': { tris: 164592, parts: 6, materials: 6, textures: 2, px: 1024, kinds: ['colour', 'normals'] },
  'citizen-eco-drive': { tris: 41035, parts: 4, materials: 4, textures: 9, px: 2048, kinds: ['colour', 'normals', 'roughness', 'metal'] },
  'bedroom-wardrobe-3': { tris: 463025, parts: 65, materials: 65, textures: 18, px: 2048, kinds: ['colour'] },
  'kids-room-8': { tris: 94519, parts: 56, materials: 56, textures: 4, px: 1024, kinds: ['colour', 'normals'] },
};
