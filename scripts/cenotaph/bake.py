# Bakes the cenotaph interior for the real-time 404: Cycles computes the light once (sun shaft,
# fire bowls, bounce off the stone) into lightmaps, and the browser only has to look them up.
# Run after build.py:  blender -b film-night.blend -P bake.py -- mode=night out=../../public/cenotaph/live
#
# Output (per mode): interior-<mode>.glb (uv1 = lightmap UVs), lm-<mode>-<group>.jpg (light only,
# encoded as sqrt(light / scale) so an 8-bit JPEG keeps the shadows), and live-<mode>.json with
# the scales and the positions the page needs.
import bpy, bmesh, sys, os, json, math
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ARGS = dict(a.split('=', 1) for a in argv if '=' in a)
MODE = ARGS.get('mode', 'night')
OUT = bpy.path.abspath(ARGS.get('out', '//live'))
RES = int(ARGS.get('res', 2048))
SAMPLES = int(ARGS.get('samples', 256))
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
sc.frame_set(sc.frame_end)   # the film's last frame: interior light, the outside sun and sky off

# Not the drums: their outside is never seen. Cone/Torus are the bronze fire bowls and their rims.
KEEP = ('Sphere', 'Arena', 'Step', 'Podium', 'Sarcophagus', 'Lid', 'Pedestal', 'Mourner', 'Hood', 'Cone', 'Torus')
DYNAMIC = ('Astronaut', 'Flame', 'Mote', 'ShaftCone', 'SunHole', 'Haze', 'Mist', 'Sphere.0')
R_IN = 73.8
C = Vector((0, 0, 60.0))


def centre(o):
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return sum(bb, Vector()) / 8


def inside(o):
    return o.name == 'Sphere' or (centre(o) - C).length < R_IN - 1


# Props rebuilt live in the browser must not be baked into the stone as shadows or light.
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith(DYNAMIC):
        o.hide_render = True
bake_objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith(KEEP) and inside(o) and not o.hide_render]

# Nobody sees the outside of the shell from in here: drop it, and the lightmap goes to the inside.
sphere = bpy.data.objects['Sphere']
bm = bmesh.new()
bm.from_mesh(sphere.data)
out_faces = [f for f in bm.faces if f.normal.dot(f.calc_center_median()) > 0]
bmesh.ops.delete(bm, geom=out_faces, context='FACES')
bm.to_mesh(sphere.data)
bm.free()
print('BAKE', len(bake_objs), 'objects')

# The tomb gets its own map: it is what people walk up to.
TOMB = ('Podium', 'Sarcophagus', 'Lid')   # not the fire bowls: their glow would swamp the range
groups = {'vault': [o for o in bake_objs if o.name == 'Sphere'], 'tomb': [o for o in bake_objs if o.name.startswith(TOMB)],
          'floor': [o for o in bake_objs if o.name != 'Sphere' and not o.name.startswith(TOMB)]}
group_of = {o.name: g for g, objs in groups.items() for o in objs}
sc.render.engine = 'CYCLES'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'
prefs.get_devices()
for d in prefs.devices:
    d.use = d.type == 'OPTIX'
sc.cycles.device = 'GPU'
sc.render.bake.margin = 6

meta = {'mode': MODE, 'groups': {}}
for gname, objs in groups.items():
    res = RES
    img = bpy.data.images.new(f'lm-{gname}', res, res, float_buffer=True)
    for o in objs:
        if 'lightmap' not in o.data.uv_layers:
            o.data.uv_layers.new(name='lightmap')
        o.data.uv_layers.active = o.data.uv_layers['lightmap']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.003, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=.003, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in objs:
        for slot in o.material_slots:
            m = slot.material
            if not m or not m.node_tree:
                continue
            nt = m.node_tree
            n = nt.nodes.get('__bake') or nt.nodes.new('ShaderNodeTexImage')
            n.name = '__bake'
            n.image = img
            for other in nt.nodes:
                other.select = False
            n.select = True
            nt.nodes.active = n
    sc.render.bake.use_pass_direct = True
    sc.render.bake.use_pass_indirect = True
    sc.render.bake.use_pass_color = False
    bpy.ops.object.bake(type='DIFFUSE', uv_layer='lightmap', use_clear=True)
    # Encode: light / scale, square-rooted, into 8 bits. Scale sits near the bright end so pools of
    # sunlight clip softly while the dark stone keeps its gradations.
    px = np.array(img.pixels[:], dtype=np.float32).reshape(res, res, 4)
    rgb = px[..., :3]
    lum = rgb.max(axis=2)
    covered = px[..., 3] > 0
    scale = float(np.percentile(lum[covered], 99.6)) if covered.any() else 1.0
    enc = np.sqrt(np.clip(rgb / scale, 0, 1))
    out = bpy.data.images.new(f'lm8-{gname}', res, res, alpha=False)
    out_px = np.ones((res, res, 4), dtype=np.float32)
    out_px[..., :3] = enc
    out.colorspace_settings.name = 'Non-Color'
    out.pixels.foreach_set(out_px.ravel())
    out.update()
    out.file_format = 'JPEG'
    out.save(filepath=os.path.join(OUT, f'lm-{MODE}-{gname}.jpg'), quality=90)
    meta['groups'][gname] = {'scale': scale, 'objects': [o.name for o in objs]}
    print('BAKED', gname, 'scale', round(scale, 3))
    for o in objs:
        o.data.uv_layers.active = o.data.uv_layers[0]
        o.data.uv_layers['lightmap'].active_render = False

# The lightmap is the last UV set: TEXCOORD_1 where a mesh has its own UVs, TEXCOORD_0 where it has none.
bpy.ops.object.select_all(action='DESELECT')
for o in bake_objs:
    o.select_set(True)
    o.name = group_of[o.name] + '|' + o.name
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f'interior-{MODE}.glb'), use_selection=True, export_materials='NONE',
                          export_texcoords=True, export_normals=True, export_apply=True,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=8)

# Day: the armillary lamp goes to the browser as its own model, with its brass and its glowing core.
props = [o for o in bpy.data.objects if o.type == 'MESH' and (o.parent and o.parent.name in ('Armillary', 'ArmTilt') or o.name.startswith('Cylinder') and inside(o))]
if props:
    for o in props:
        o.hide_render = False
    bpy.ops.object.select_all(action='DESELECT')
    for o in props:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f'props-{MODE}.glb'), use_selection=True, export_materials='EXPORT', export_apply=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=8)
    print('PROPS', len(props))

fig = bpy.data.objects.get('Astronaut')
fires = [list(o.matrix_world.translation) for o in bpy.data.objects if o.type == 'LIGHT' and o.name.startswith('Fire') and (o.matrix_world.translation - C).length < R_IN]
hole = bpy.data.objects.get('SunHole')
meta.update({'fig': list(fig.location) if fig else None, 'fires': fires, 'hole': list(hole.location) if hole else None,
             'sphere': {'c': list(C), 'rin': R_IN}})
with open(os.path.join(OUT, f'live-{MODE}.json'), 'w') as fh:
    json.dump(meta, fh)
print('DONE')
