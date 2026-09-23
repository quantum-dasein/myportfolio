// Real 3D pieces for the hall. Export from Cinema 4D as glTF binary (.glb), put the file in
// public/models/, and add a line here. Nothing loads until an entry exists.

/** A work shown as a turntable object in front of its print; visitors can spin it by dragging. */
export type WorkModel = { src: string; height?: number; spin?: number };
export const workModels: Record<string, WorkModel> = {
  // 'squidz-pos-display': { src: '/models/works/squidz-pos-display.glb', height: 2.6 },
  // 'alpine-equipment-product-film': { src: '/models/works/alpine-set.glb', height: 2.8 },
};

/** The astronaut's ship, parked in the hall at the start. Positions are in metres. */
export type ShipModel = { src: string; x: number; z: number; rotation: number; height: number };
// Placeholder until Rodion's own ship is exported: 'Spaceship' by Quaternius, CC0 (poly.pizza/m/Jqfed124pQ).
export const shipModel: ShipModel | null = { src: '/models/observatory/ship.glb', x: 5.2, z: -3.6, rotation: -2.1, height: 1.1 };
// e.g. { src: '/models/observatory/ship.glb', x: 4.5, z: 3.2, rotation: -0.6, height: 2.4 }
