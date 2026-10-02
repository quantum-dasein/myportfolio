// The Model Room's footprint, in one place. The hall was 18 × 19.6 m and felt crowded once the archive
// portal took its centre; it is now 28 × 24.6 m: the side walls moved out by 5 m each and the entrance
// wall forward by 5 m. The kitchen niche (the rear wall) stays where it was.
export const ROOM = {
  /** Half the width: the side walls stand at ±halfW. */
  halfW: 14,
  /** The rear wall (behind the kitchen) and the entrance wall. */
  back: -7.6, front: 17,
  /** How far the entrance moved forward; everything that belongs to the door moved with it. */
  shift: 5,
  /** The on-demand archive stage, in the middle of the open floor. */
  stage: { x: 0, z: 8 },
} as const;
/** Where the visitor may walk: a margin inside the walls; the return portal is a recess in the entrance wall. */
export const WALK = { x: ROOM.halfW - .5, back: ROOM.back + .55, front: ROOM.front - 1.1, door: ROOM.front - .7, doorHalf: 1.3 } as const;
