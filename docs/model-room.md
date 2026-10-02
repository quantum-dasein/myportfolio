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

The personal gift has been retired: the mini astronauts, safe and secret portal are no longer
mounted. The private `/gallery/night/` route and `public/models/night/` assets were moved to
`artifacts/retired-gift/`, outside the build. The main museum guide remains.

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

### Selectable model archive

The entrance terminal and the **Model archive** button open a searchable EN/DE
catalogue. Available works are Gym equipment 03 and Pool 18. Selecting one downloads
one GLB and reveals it inside the central portal at (1, 0, 5.9),
and switches to orbit inspection. Reduced-motion visitors see it immediately.
**Clear stage** removes it. The seven permanent exhibits keep their positions.

- `src/data/model-archive.ts` holds catalogue metadata and desktop/mobile URLs.
- `src/scripts/model-room-catalog.ts` owns the native modal, search, status,
  cancellation and keyboard focus.
- `src/scripts/model-room-archive.ts` owns the display, reveal, selection and
  resource disposal. It keeps one current model and, during replacement, one
  incoming model. A newer selection aborts the previous download; stale parsed
  results are disposed before they can enter the scene.
- `public/models/archive/` contains the prepared assets and conversion statistics.

The catalogue loads image previews, not the whole 3D collection. Adding more
entries requires preparing their assets first. The portal has a 4 m aperture.
Large scenes are normalized to miniature scale before export; the pool measures
2.32 × 3.60 × 1.14 m in display space. Colliders follow the active object.
The astronaut takes the east aisle to avoid walking through the portal.

`model-room-portal.ts` builds the floor rings, suspended scanner, instanced
markers and reveal curtain. The cabinet floats 22 cm above the floor; the pool
is raised 62 cm for a model-table view. The catalogue and tablet both use the
room’s RB Space typeface. Reduced-motion mode stops scanner rotation, particles
and the pool’s subtle water ripples.

| Gym equipment 03 | Triangles | GLB bytes | Meshes |
| --- | ---: | ---: | ---: |
| Source FBX | 508,570 | — | 31 |
| Desktop | 134,754 | 814,336 | 8 |
| Mobile | 58,456 | 463,204 | 8 |

The FBX contains no usable Corona texture links. Its wood image was reconnected,
and rubber, metal, fabric and the other surfaces were rebuilt as web PBR
materials. This is an interpretation of the supplied model's materials.
Source files remain outside the public website.

Rebuild with Blender (the source directory must contain `export/` and `maps/`):

```powershell
blender --background --factory-startup --python scripts/model-room/prepare-gym.py -- 'path/to/Gym equipment 03 - 3D Model'
python -c "from PIL import Image; Image.open('artifacts/gym-equipment/gym-preview.png').resize((800,800), Image.Resampling.LANCZOS).save('public/models/archive/gym-equipment-03.webp', quality=86)"
```

Pool 18 is converted from the supplied OBJ (1,693,305 triangles). Its MTL
contains only a black wire material, so surfaces were reconstructed using the
supplied textures and named objects. OBJ units are unspecified; no real-world
site dimensions are claimed. The current exports are 236,862 triangles /
2,731,396 bytes on desktop and 113,764 triangles / 1,428,816 bytes on mobile.

```powershell
blender --background --factory-startup --python scripts/model-room/prepare-pool.py -- 'path/to/Pool 18'
python -c "from PIL import Image; Image.open('artifacts/pool-18/pool-preview.png').resize((800,800), Image.Resampling.LANCZOS).save('public/models/archive/pool-18.webp', quality=86)"
```

Run the archive browser check against a running local site (installed Edge):

```powershell
$env:TEST_SITE_URL='http://127.0.0.1:4344'
node scripts/check-model-archive.mjs
```

It covers lazy loading, search, modal focus, inspection, wireframe, repeated
load/dispose, failed downloads and retry, cancellation, the mobile asset, and
the animated reveal. Screenshots and results go to
`artifacts/model-archive-check/`. GPU geometry and texture counts are checked
after three load/remove cycles; this is not a performance benchmark for a
fully populated archive.

### Full site and original room checks

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

### Additional archive models and contact

Bronze woman: 112,698 triangles / 1,189,460 bytes desktop; 47,128 / 438,944 mobile.
Three waterfall fountains: 202,761 triangles / 1,393,632 bytes desktop; 82,854 / 678,884 mobile.
The fountains OBJ contains the three fountains and water geometry, not the Corona Scatter
vegetation shown in source settings. Both models use reconstructed web PBR materials.
`prepare-additions.py -- bronze|fountains SOURCE` produces GLBs and PNG previews; encode
those previews as WebP in `public/models/archive/`.

The portal's outer hardware has a 2.34 m conservative radius. It clears the SVJ's
2.75 m turntable by 1.24 m. The kiosk is at (-2.15, 0, 8.15), outside both display
areas. The suspended scanner fades after the reveal to keep the work visible.

The catalogue links to `/contact/?project=modeling` or `/de/kontakt/?project=modeling`.
The form offers custom 3D modeling in both languages and reads the existing project parameter.
Run `node scripts/check-model-additions.mjs` against port 4337 (or `TEST_SITE_URL`) for
new-model desktop/mobile loading, clearance, form preselection and removal of the private route.
