// Usage: node scripts/prepare-model-room-textures.mjs path/to/extracted/Textures
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
if (!process.argv[2]) throw new Error('Pass the extracted Textures directory.');
await mkdir('public/models/exhibits/textures', { recursive: true });
for (const [source, target] of [['Wood-discover.jpg','oak'],['Marble-calca.jpg','marble'],['oldsurf.jpg','stone']]) {
  await sharp(join(process.argv[2], source)).rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toFile(`public/models/exhibits/textures/${target}.webp`);
}
