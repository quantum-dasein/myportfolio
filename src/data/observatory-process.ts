// Making-of material shown inside the viewer. Frames come from the project's own renders,
// captured at the same timecode so the comparison lines up pixel for pixel.
type Pair = [en: string, de: string];
export type ObservatoryProcess = {
  before: string;
  after: string;
  heading: Pair;
  labels: [Pair, Pair];
  steps: Pair[];
};

export const observatoryProcess: Record<string, ObservatoryProcess> = {
  'refurbed-product-ecosystem-concept': {
    before: '/portfolio/process/refurbed-scene.webp',
    after: '/portfolio/process/refurbed-identity.webp',
    heading: ['From scene to brand.', 'Von der Szene zur Marke.'],
    labels: [['Scene', 'Szene'], ['Brand', 'Marke']],
    steps: [
      ['Base 3D shot: devices, glass, light and the camera move, still with placeholder screens.', '3D-Grundeinstellung: Geräte, Glas, Licht und Kamerafahrt, noch mit Platzhalter-Screens.'],
      ['Refurbed shop screens and brand typography composited into the same shot.', 'Refurbed-Shopscreens und Markentypografie in dieselbe Einstellung eingesetzt.'],
      ['Cut to music as the finished film above.', 'Zur Musik geschnitten: der fertige Film oben.'],
    ],
  },
};
