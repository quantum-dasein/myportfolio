/** Only publish entries whose web assets have been prepared and checked. GLBs are fetched on selection. */
export type ArchiveModel = {
  id: string; no: string; title: string; category: 'equipment' | 'architecture' | 'sculpture' | 'people' | 'objects';
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
}, {
  id: 'winter-sports', no: '012', title: 'Winter sports rack', category: 'equipment',
  description: {
    en: 'A wall rack with three pairs of skis, two snowboards and their bindings, each with its own graphics.',
    de: 'Eine Wandhalterung mit drei Paar Ski, zwei Snowboards und ihren Bindungen, jedes mit eigener Grafik.',
  },
  preview: '/models/archive/winter-sports.webp',
  src: '/models/archive/winter-sports.glb', mobileSrc: '/models/archive/winter-sports.mobile.glb',
  dimensions: '2.00 × 0.39 × 1.89 m', height: 1.89, distance: 5.2,
}, {
  id: 'soft-toys-2', no: '014', title: 'Soft toys 2', category: 'objects',
  description: {
    en: 'A plush panda, horse and hippopotamus, each in two poses, with fabric surfaces and stitched details.',
    de: 'Panda, Pferd und Nilpferd aus Plüsch, jeweils in zwei Posen, mit Stoffoberflächen und Nahtdetails.',
  },
  preview: '/models/archive/soft-toys-2.webp',
  src: '/models/archive/soft-toys-2.glb', mobileSrc: '/models/archive/soft-toys-2.mobile.glb',
  dimensions: 'Toy collection', height: 1.3124, distance: 5.6, elevation: .65,
}, {
  id: 'citizen-eco-drive', no: '015', title: 'Citizen Eco-Drive', category: 'objects',
  description: {
    en: 'A detailed wristwatch with a blue chronograph dial, a linked metal bracelet and a transparent crystal, enlarged for inspection.',
    de: 'Eine detaillierte Armbanduhr mit blauem Chronographenzifferblatt, Metallgliederarmband und transparentem Uhrglas, zur Betrachtung vergrößert.',
  },
  preview: '/models/archive/citizen-eco-drive.webp',
  src: '/models/archive/citizen-eco-drive.glb', mobileSrc: '/models/archive/citizen-eco-drive.mobile.glb',
  dimensions: 'Enlarged watch study', height: 2.2, distance: 5.5, elevation: .5,
}, {
  id: 'bedroom-wardrobe-3', no: '016', title: 'Bedroom wardrobe 3', category: 'architecture',
  description: {
    en: 'A bedroom wardrobe with hanging clothes, shelves, drawers, handbags and small accessories, presented as an interior miniature.',
    de: 'Ein Schlafzimmerschrank mit hängender Kleidung, Regalböden, Schubladen, Handtaschen und kleinen Accessoires als Interieurminiatur.',
  },
  preview: '/models/archive/bedroom-wardrobe-3.webp',
  src: '/models/archive/bedroom-wardrobe-3.glb', mobileSrc: '/models/archive/bedroom-wardrobe-3.mobile.glb',
  dimensions: 'Architectural miniature', height: 2.35, distance: 5.5,
}, {
  id: 'kids-room-8', no: '017', title: "Children's room wall", category: 'objects',
  description: {
    en: 'A built-in wardrobe for a children’s room with a lit shelf of plush toys, books and posters: a unicorn, giraffes, an elephant, a penguin, a sloth and a monkey.',
    de: 'Ein Einbauschrank fürs Kinderzimmer mit beleuchtetem Regal voller Plüschtiere, Bücher und Poster: Einhorn, Giraffen, Elefant, Pinguin, Faultier und Affe.',
  },
  preview: '/models/archive/kids-room-8.webp',
  src: '/models/archive/kids-room-8.glb', mobileSrc: '/models/archive/kids-room-8.mobile.glb',
  dimensions: '2.81 × 0.51 × 3.00 m', height: 3, distance: 6.2,
}];

export function archiveDimensions(entry: ArchiveModel, de: boolean) {
  return de ? ({ 'Architectural miniature': 'Architekturminiatur', 'Sculpture study': 'Skulpturenstudie', 'Toy collection': 'Plüschtierkollektion', 'Enlarged watch study': 'Vergrößerte Uhrenstudie' }[entry.dimensions] ?? entry.dimensions) : entry.dimensions;
}
