import { works } from './works';

export const archiveRooms = [
  { id: 'atmospheres', en: 'Atmospheres', de: 'Atmosphären', color: '#d6dcdf', subtitle: { en: 'Spaces to inhabit. Light to remember.', de: 'Räume zum Verweilen. Licht, das bleibt.' }, ids: ['obsidian-residence', 'lake-como-interior-film', 'modular-lounge', 'media-wall', 'olive-still-life', 'classical-facade', 'nocturne-ceremony'] },
  { id: 'objects', en: 'Objects', de: 'Objekte', color: '#bdc8d2', subtitle: { en: 'Form, material and a different point of view.', de: 'Form, Material und ein anderer Blickwinkel.' }, ids: ['alpine-equipment-product-film', 'squidz-pos-display'] },
  { id: 'motion', en: 'Moving images', de: 'Bewegte Bilder', color: '#c6ceda', subtitle: { en: 'Small worlds. Stories in motion.', de: 'Kleine Welten. Geschichten in Bewegung.' }, ids: ['refurbed-product-ecosystem-concept', 'summer-school-georgia-2026', 'fidic-osh-first-meeting'] },
  { id: 'systems', en: 'Digital worlds', de: 'Digitale Welten', color: '#c3cdd0', subtitle: { en: 'Ideas made into places on the web.', de: 'Ideen werden zu Orten im Web.' }, ids: ['bridge', 'fidic', 'academy'] },
] as const;

export const archiveWorks = archiveRooms.flatMap((room, roomIndex) => room.ids.map(id => {
  const work = works.find(work => work.id === id);
  if (!work) throw new Error(`Missing archive work: ${id}`);
  return { ...work, roomIndex };
}));
