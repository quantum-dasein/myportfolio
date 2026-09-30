# The Model Room

The archive's fifth section, **3D Models**, contains one entrance painting.
The original sixteen works keep their order and URLs.

- `/gallery/model-room/` opens the archive at the entrance.
- `/gallery/models/` opens the separate room.
- The return link leads back to the entrance painting.

The room is a first exhibition space, ready for a later architectural design
pass. It currently contains Kitchen Modern 25, with walking, object selection,
orbit inspection, zoom, wireframe and touch controls. Materials are a neutral
study, not a reproduction of the Corona/V-Ray render.

## Assets and source

`public/models/exhibits/kitchen-modern-25.glb` was converted from the OBJ in the
user-supplied `Kitchen Modern - white and Wood 25 - 3D Model.rar`. Its geometry
and UVs are retained, coincident vertices are indexed, and objects stay separate
for selection. The input MTL has seven simple colours and no texture mappings.
No files linked from the archive's promotional documents are used.

To rebuild the model from an extracted source:

```powershell
node scripts/prepare-kitchen-model.mjs 'path/to/kitchen-Modern25.obj'
```

The script writes an uncompressed GLB (about 9.6 MB). The published file is that
GLB re-exported through Blender's glTF exporter with Draco mesh compression
(about 1.4 MB). It is decoded with `public/draco/`. Re-run that export after
rebuilding.

The archive only downloads the entrance image. When a visitor opens the
entrance painting, the archive prefetches the room page and exhibit during the
jump. Source OBJ, MAX files and the RAR are not public assets.

## The collection

`src/scripts/model-room-exhibits.ts` holds the pieces beyond the kitchen. Each
is shown the way its kind is shown in the world:

- **Exhibit 002, the Audi e-bike:** on a showroom turntable, under two light
  boxes.
- **Exhibit 003, K-2SO:** on a museum pedestal, with a spot from above and a
  green rim light.
- **Exhibit 004, ABS House V176:** three variants shown as a white
  architectural model at about 1:15, on a model table under a glass vitrine.
- **Exhibit 005, the lounge:** the Vavicci Sofa C set by the entrance, dressed
  in the room's palette because its textures were not in the archive.

Since 2026-09-30 the collection is:

1. the kitchen (001);
2. Rodion's Aventador SVJ Roadster on the showroom turntable (002);
3. K-2SO, facing the door (003);
4. the e-bike on a wall mount (004);
5. the ABS House model (005);
6. the lounge (006);
7. the hanging planter over it (007).

The archive terminal by the entrance (`src/scripts/model-room-kiosk.ts`)
wakes as you approach. It counts up to the 1,000+ models of
`projectFacts.modelsBuilt` and opens a panel about the rest of the archive.

**Performance.** The room compiles every shader while the loading glow covers
it. The target must be `composer.readBuffer`, not the canvas, or the work is
wasted. Exhibits are compiled before they join the scene. The printing reveal
is a shader uniform, because `compileAsync` does not see per-material clipping
planes. Exhibits cast no real-time shadows.

Phones load `<name>.mobile.glb`, built with `prepare-exhibits.py … mobile`:

- textures at most 1024 px;
- about half the triangles;
- sparser foliage;
- fewer lamps.

`src/scripts/model-room-guide.ts` makes the astronaut a visitor. He tours the
pieces along fixed paths and reacts to each one:

- he crouches at the e-bike's wheel;
- photographs the kitchen;
- is startled by K-2SO, then waves at it;
- leans over the house model.

Then he sits on the sofa and waits impatiently: checks his tablet, looks for
you, dozes, and waves when you come close. Reactions show as a hologram bubble
over his helmet and in his visor colour. He stops if you stand in his way.

**Small reactions** (`model-room-exhibits.ts`, sounds in `model-room-sound.ts`):

- the SVJ idles with a low V12 growl as you walk up; clicked, it flashes its headlamps and indicators and blips the throttle;
- K-2SO's eyes come on, with a flicker and a servo whine, when you stand close;
- the e-bike's wheels turn while you point at it (or stand in front of it on touch). They are cut out of
  the welded mesh at load time: every triangle inside a tyre's radius and width goes to its own axle;
- a click on the house model lights its windows, and puts them out again.

If you stand still for 15 s while the astronaut waits on the sofa, he gets up, walks over (only along floor
the colliders leave free), waves, and goes back to his seat.

`model-room-secrets.ts` hides three golden mini astronauts: on the e-bike's wall mount, inside the house
vitrine and behind K-2SO's feet. A click collects one; with all three, the wall safe by the lounge slides
open onto a golden trophy and confetti falls.

`scripts/model-room/fbx6.py` reads FBX 6.1 files (3ds Max, around 2010), which
Blender's importer refuses. It reuses Blender's low-level FBX reader to rebuild
meshes, UVs, materials and 3ds Max transforms. `prepare-exhibits.py` falls back
to it on its own.

Every stand has a lit lectern, a green floor halo and a contact shadow.

The pieces stream in after the arrival. Each one has its textures uploaded and
shaders compiled first, then it is printed into the room by a rising green scan
line (a clipping plane). While walking, the caption follows the piece you look
at. Picking a part opens the inspection orbit around that piece and holds its
turntable still.

The exhibit files are built from the author's original model files with Blender:

```powershell
blender -b --factory-startup --python scripts/model-room/prepare-exhibits.py -- <sources> <out> [k2so] [audi-ebike]
```

The script:

- keeps only meshes, dropping the re-upload's text and helper objects;
- merges parts by material;
- reduces triangles to a web budget;
- scales each piece to real size and stands it on the floor;
- wires K-2SO's PBR maps and packs the e-bike's decal alpha;
- writes Draco GLB with WebP textures.

Only models the site owner made belong here. Check new files for embedded
copyright notices (plate textures, readmes, logos) before adding them.

## Atmosphere, arrival and return

The archive entrance is a living painting (`src/scripts/model-portal-painting.ts`):

- a drifting tunnel of frames and a turning wireframe gem;
- invitation lines that cycle, with the text set in `observatory.ts`;
- on entry the painting burns open from the gem into a green vortex, and the
  camera flies into it. The contact portal only lends its walk-and-dive
  choreography and a green corona.

`src/scripts/model-room-fx.ts` adds the room's atmosphere on top of the
architecture in `model-room-design.ts`:

- a mirrored terrazzo floor (desktop only);
- three hanging downlights with soft spot pools, and drifting dust;
- a portal membrane in the rear frame;
- ambient occlusion and a vignette/grain finish;
- a quality guard that drops the AO pass, then lowers the mirror resolution, on
  slow GPUs.

Visitors arrive by gliding out of the rear portal while the astronaut walks
past to the exhibit. Walking back into the light, after first stepping clear
of it, fades out and returns to the entrance painting. On desktop, a click
captures the mouse for game-style looking.

`src/scripts/model-room-sound.ts` gives the room its own synthesised score. It
follows the site's sound switch and mutes the studio drone while the room plays:

- a slow pad in A with occasional bells;
- a portal hum that grows as you approach.

Footsteps, the arrival and exit shimmers, and selection sounds play whenever
the visitor acts.

`src/data/observatory.ts` owns the entrance. `src/pages/gallery/models.astro`,
`src/scripts/model-room.ts` and `src/styles/model-room.css` own the new room.
There is no dependency from the existing hall to the room's rendering code.
`public/portfolio/model-portal.svg` is the editable entrance artwork; its WebP
is used in the gallery.

## Verification

```powershell
$env:ASTRO_TELEMETRY_DISABLED='1'
npm run verify
node serve.mjs
# In another terminal (requires installed Chrome):
node scripts/check-model-room.mjs
```

The browser check covers the original film viewer, the added section, lazy
loading, movement and collision, inspection controls, return navigation,
browser history, touch layout, German copy, full-motion entry and a failed
model download. Screenshots and a report are written to
`artifacts/model-room-check/`.

Before this change, existing edited sources and a Git diff were copied into
`artifacts/model-portal-backup/`. These are inspection snapshots, not a command
to overwrite later work. No deployment is part of these scripts.
