/** Only publish entries whose web assets have been prepared and checked. GLBs are fetched on selection. */
export type ArchiveModel = {
  id: string; no: string; title: string; category: 'equipment' | 'architecture' | 'sculpture';
  description: { en: string; de: string }; preview: string; src: string; mobileSrc: string;
  dimensions: string; height: number; distance: number; lift?: number; elevation?: number; yaw?: number;
};

export const modelArchive: ArchiveModel[] = [{
  id: 'gym-equipment-03', no: '008', title: 'Gym equipment 03', category: 'equipment',
  description: {
    en: 'A compact home gym: wall bars, suspension rings, dumbbells and weight plates, arranged within an oak cabinet.',
    de: 'Ein kompaktes Homegym: Sprossenwand, Turnringe, Hanteln und Gewichtsscheiben in einem Eichenschrank.',
  },
  preview: '/models/archive/gym-equipment-03.webp',
  src: '/models/archive/gym-equipment-03.glb', mobileSrc: '/models/archive/gym-equipment-03.mobile.glb',
  dimensions: '2.00 × 0.74 × 2.00 m', height: 2, distance: 5.3,
}, {
  id: 'pool-18', no: '009', title: 'Pool 18', category: 'architecture',
  description: {
    en: 'A poolside retreat with a timber pergola, lounge furniture, a palm and three cascading water features.',
    de: 'Eine Poollandschaft mit Holzpergola, Loungemöbeln, Palme und drei Wasserfällen.',
  },
  preview: '/models/archive/pool-18.webp',
  src: '/models/archive/pool-18.glb', mobileSrc: '/models/archive/pool-18.mobile.glb',
  dimensions: 'Architectural miniature', height: 1.143, distance: 5.8, lift: .62, elevation: .62,
}, {
  id: 'bronze-woman', no: '010', title: 'Bronze woman', category: 'sculpture',
  description: {
    en: 'A bronze figure with flowing drapery and a finely sculpted pose, presented as a freestanding study.',
    de: 'Eine Bronzefigur mit fließendem Gewand und fein ausgearbeiteter Pose, als freistehende Studie präsentiert.',
  },
  preview: '/models/archive/bronze-woman.webp',
  src: '/models/archive/bronze-woman.glb', mobileSrc: '/models/archive/bronze-woman.mobile.glb',
  dimensions: 'Sculpture study', height: 2.15, distance: 4.6, yaw: -1.2,
}, {
  id: 'waterfall-fountains', no: '011', title: 'Three waterfall fountains', category: 'architecture',
  description: {
    en: 'Three sculptural garden fountains: a sphere, a circular cascade and a bowl with an open spillway.',
    de: 'Drei skulpturale Gartenbrunnen: eine Kugel, eine runde Kaskade und eine Schale mit offenem Überlauf.',
  },
  preview: '/models/archive/waterfall-fountains.webp',
  src: '/models/archive/waterfall-fountains.glb', mobileSrc: '/models/archive/waterfall-fountains.mobile.glb',
  dimensions: 'Architectural miniature', height: .449, distance: 5.2, lift: .64, elevation: .7,
}];

export function archiveDimensions(entry: ArchiveModel, de: boolean) {
  return de ? ({ 'Architectural miniature': 'Architekturminiatur', 'Sculpture study': 'Skulpturenstudie' }[entry.dimensions] ?? entry.dimensions) : entry.dimensions;
}
