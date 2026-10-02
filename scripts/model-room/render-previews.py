"""Catalogue previews for the archive models, rendered from the published GLBs.

One look for every work: a three-quarter view on a transparent ground (the catalogue card supplies its own
dark studio behind it), soft key and rim light, a shadow under the piece. 960 x 720, Cycles.

    blender -b --factory-startup --python scripts/model-room/render-previews.py -- [id ...]

Writes artifacts/archive-previews/<id>.png; encode those as WebP into public/models/archive/.
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'public/models/archive'
OUT = ROOT / 'artifacts/archive-previews'
OUT.mkdir(parents=True, exist_ok=True)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ids = args or sorted(p.name[:-4] for p in SRC.glob('*.glb') if not p.name.endswith('.mobile.glb'))
# Where the camera stands, per work (azimuth from the front, elevation), and how tightly it frames.
VIEW = {'bronze-woman': (28, 8, 1.02), 'gym-equipment-03': (-32, 14, 1.0), 'pool-18': (-38, 34, .9), 'waterfall-fountains': (-18, 30, .86)}

for name in ids:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SRC / (name + '.glb')))
    scene = bpy.context.scene
    meshes = [o for o in scene.objects if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    centre = (lo + hi) / 2; radius = (hi - lo).length / 2
    for o in meshes:
        for m in o.data.materials:
            if m and m.name.startswith('Pool water'):
                p = m.node_tree.nodes.get('Principled BSDF')
                p.inputs['Roughness'].default_value = .04; p.inputs['Emission Color'].default_value = (.03, .4, .47, 1); p.inputs['Emission Strength'].default_value = .5

    scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 96; scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 960, 720, 100
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Medium High Contrast'
    world = bpy.data.worlds.new('Studio'); scene.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.035, .05, .045, 1)

    # A ground that only catches the shadow.
    bpy.ops.mesh.primitive_plane_add(size=radius * 12, location=(centre.x, centre.y, lo.z - .001))
    bpy.context.object.is_shadow_catcher = True

    def area(loc, power, size, colour):
        d = bpy.data.lights.new('Softbox', 'AREA'); d.energy = power * radius * radius; d.size = size * radius; d.color = colour
        o = bpy.data.objects.new('Softbox', d); scene.collection.objects.link(o)
        o.location = centre + Vector(loc) * radius; o.rotation_euler = (centre - o.location).to_track_quat('-Z', 'Y').to_euler()
    area((1.6, -2.2, 2.6), 520, 2.4, (1, .93, .84))      # warm key, high and to the right
    area((-2.6, -.6, 1.2), 150, 2.2, (.75, .9, 1))        # cool fill
    area((-.6, 2.6, 1.9), 420, 1.6, (.72, 1, .86))        # mint rim from behind, the room's colour

    az, el, fit = VIEW.get(name, (-30, 22, 1))
    az, el = math.radians(az), math.radians(el)
    cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')); scene.collection.objects.link(cam); scene.camera = cam
    cam.data.lens = 70
    fov = 2 * math.atan(min(cam.data.sensor_width, cam.data.sensor_width * 720 / 960) / (2 * cam.data.lens))
    dist = radius * fit / math.sin(fov / 2)
    cam.location = centre + Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))) * dist
    cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.clip_end = dist * 4
    scene.render.filepath = str(OUT / (name + '.png'))
    bpy.ops.render.render(write_still=True)
    print('PREVIEW', name)
