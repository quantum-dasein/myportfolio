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

## Atmosphere, arrival and return

`src/scripts/model-room-fx.ts` adds the room's atmosphere on top of the
architecture in `model-room-design.ts`:

- a mirrored terrazzo floor (desktop only);
- light shafts with drifting dust;
- a portal membrane in the rear frame;
- ambient occlusion and a vignette/grain finish;
- a quality guard that drops the AO pass, then lowers the mirror resolution, on
  slow GPUs.

Visitors arrive by gliding out of the rear portal while the astronaut walks
past to the exhibit. Walking back into the light, after first stepping clear
of it, fades out and returns to the entrance painting. On desktop, a click
captures the mouse for game-style looking.

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
