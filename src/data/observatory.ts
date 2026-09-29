import { works, type Work } from './works';

// An entrance belongs to the archive, not to the portfolio's list of client work.
const modelPortal: Work = {
  id: 'model-room', type: 'reel', title: 'The Model Room',
  img: '/portfolio/model-portal.webp', kCat: '',
  href: '/gallery/models/', hrefLabel: 'Enter the room',
  detail: { tools: 'INTERACTIVE / 3D', en: 'Step through the frame. Explore objects from every angle.', de: 'Durch den Rahmen treten. Objekte aus jedem Blickwinkel entdecken.' },
};

export const archiveRooms = [
  { id: 'atmospheres', en: 'Atmospheres', de: 'Atmosphären', color: '#d6dcdf', subtitle: { en: 'Spaces to inhabit. Light to remember.', de: 'Räume zum Verweilen. Licht, das bleibt.' }, ids: ['obsidian-residence', 'lake-como-interior-film', 'modular-lounge', 'media-wall', 'olive-still-life', 'classical-facade', 'nocturne-ceremony'] },
  { id: 'objects', en: 'Objects', de: 'Objekte', color: '#bdc8d2', subtitle: { en: 'Form, material and a different point of view.', de: 'Form, Material und ein anderer Blickwinkel.' }, ids: ['alpine-equipment-product-film', 'squidz-pos-display'] },
  { id: 'models', en: '3D Models', de: '3D-Modelle', color: '#a6d8cb', subtitle: { en: 'Step inside. Look a little closer.', de: 'Eintreten. Genauer hinsehen.' }, ids: ['model-room'] },
  { id: 'motion', en: 'Moving images', de: 'Bewegte Bilder', color: '#c6ceda', subtitle: { en: 'Small worlds. Stories in motion.', de: 'Kleine Welten. Geschichten in Bewegung.' }, ids: ['refurbed-product-ecosystem-concept', 'summer-school-georgia-2026', 'fidic-osh-first-meeting'] },
  { id: 'systems', en: 'Digital worlds', de: 'Digitale Welten', color: '#c3cdd0', subtitle: { en: 'Ideas made into places on the web.', de: 'Ideen werden zu Orten im Web.' }, ids: ['tarjima-live-lecture-translation', 'bridge', 'fidic', 'academy'] },
] as const;

export const archiveWorks = archiveRooms.flatMap((room, roomIndex) => room.ids.map(id => {
  const work = id === modelPortal.id ? modelPortal : works.find(work => work.id === id);
  if (!work) throw new Error(`Missing archive work: ${id}`);
  return { ...work, roomIndex, portalHref: id === modelPortal.id ? modelPortal.href : undefined };
}));
