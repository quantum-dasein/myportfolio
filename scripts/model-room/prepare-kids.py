"""Prepare "Kids Furniture Composition 8" (a children's room wall: lacquered furniture, books, posters and a
shelf of plush toys) for the on-demand archive.

    blender -b --factory-startup --python scripts/model-room/prepare-kids.py -- "path/to/TOYS_Room_08"

The OBJ's MTL is complete, but it maps a leather image onto every plush toy, which in Blender replaces the
toy's own colour. Plush is rebuilt as its colour with a soft sheen; lacquers get a clear coat; books and
posters keep their images; the strip light glows. Scaled to metres and stood on the floor.
"""
import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector

BASE = Path(sys.argv[sys.argv.index('--') + 1]).resolve(); ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from bake_ao import bake_ao

OUT = ROOT / 'public/models/archive'; ID = 'kids-room-8'; STATS = {}


def build(mobile):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.obj_import(filepath=str(BASE / 'TOYS_Room_08.obj'))
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    source = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    limit = 512 if mobile else 1024
    for img in bpy.data.images:
        if img.size[0] and max(img.size) > limit:
            k = limit / max(img.size); img.scale(max(1, int(img.size[0] * k)), max(1, int(img.size[1] * k)))

    for m in bpy.data.materials:
        if not m.use_nodes: continue
        nt = m.node_tree; p = nt.nodes.get('Principled BSDF')
        if not p: continue
        name = m.name.lower(); kd = tuple(m.diffuse_color[:3])
        tex = next((n for n in nt.nodes if n.type == 'TEX_IMAGE' and n.image), None)
        if 'plush' in name or 'sherst' in name:
            # The toy's own colour, soft and matte, with a velvet sheen at grazing angles.
            if tex: nt.nodes.remove(tex)
            p.inputs['Base Color'].default_value = (*kd, 1); p.inputs['Roughness'].default_value = .95
            p.inputs['Sheen Weight'].default_value = .7; p.inputs['Sheen Roughness'].default_value = .45
            p.inputs['Sheen Tint'].default_value = (1, 1, 1, 1)
        elif 'lak' in name:
            # Satin lacquer. "White" in the MTL is a mid grey (it was lit by a renderer that brightens it).
            col = (.86, .85, .82) if 'white' in name else kd
            p.inputs['Base Color'].default_value = (*col, 1); p.inputs['Roughness'].default_value = .5
            p.inputs['Coat Weight'].default_value = .25; p.inputs['Coat Roughness'].default_value = .2
        elif 'light' in name and 'plush' not in name:
            p.inputs['Base Color'].default_value = (*kd, 1)
            p.inputs['Emission Color'].default_value = (1, .78, .55, 1); p.inputs['Emission Strength'].default_value = 2
        elif tex:
            p.inputs['Roughness'].default_value = .7   # books, posters: their own images
        else:
            p.inputs['Roughness'].default_value = .55
        p.inputs['Metallic'].default_value = 0

    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # Units: the OBJ is in centimetres when its height is over 20; metres otherwise.
    pts = [v.co for o in objs for v in o.data.vertices]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    k = .01 if (hi.z - lo.z) > 20 else 1.0
    offset = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    for o in objs:
        for v in o.data.vertices: v.co = (v.co - offset) * k
    size = (hi - lo) * k
    # The wall faces sideways in the source: turn it so the side with the toys faces the visitor (-Y here, +Z in glTF).
    plush = [v.co for o in objs if any('plush' in (m.name.lower() if m else '') for m in o.data.materials) for v in o.data.vertices]
    if plush:
        c = sum(plush, Vector()) / len(plush)
        dx, dy = c.x, c.y
        import mathutils
        # The thin axis is the wall's depth; the toys stand out in front of it on that axis.
        ang = (-math.pi / 2 if dx > 0 else math.pi / 2) if size.x < size.y else (0 if dy < 0 else math.pi)
        R = mathutils.Matrix.Rotation(ang, 4, 'Z')
        for o in objs: o.data.transform(R)
        pts = [v.co for o in objs for v in o.data.vertices]
        lo2 = Vector([min(p[i] for p in pts) for i in range(3)]); hi2 = Vector([max(p[i] for p in pts) for i in range(3)])
        size = hi2 - lo2
        print('KIDS_TURN', round(math.degrees(ang)), 'toys at', round(dx, 2), round(dy, 2))
    bpy.ops.object.join()
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=.0002); bpy.ops.mesh.separate(type='MATERIAL'); bpy.ops.object.mode_set(mode='OBJECT')
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in meshes:
        o.name = ID + ' | ' + (o.data.materials[0].name if o.data.materials else 'part')
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        if mobile and sum(len(p.vertices) - 2 for p in o.data.polygons) > 2500:
            d = o.modifiers.new('Web budget', 'DECIMATE'); d.ratio = .55; d.use_collapse_triangulate = True; bpy.ops.object.modifier_apply(modifier=d.name)
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(38))
    bake_ao(meshes)
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    filename = ID + ('.mobile' if mobile else '') + '.glb'
    bpy.ops.export_scene.gltf(filepath=str(OUT / filename), use_selection=True, export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_format='GLB', export_yup=True, export_apply=True,
                              export_image_format='WEBP', export_image_quality=82, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_draco_position_quantization=14)
    STATS['mobile' if mobile else 'desktop'] = {'sourceTriangles': source, 'triangles': sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes),
        'bytes': (OUT / filename).stat().st_size, 'dimensionsMetres': list(size), 'materialNote': 'MTL colours kept; plush rebuilt with sheen, lacquers with clear coat; books and posters keep their images.'}


build(False); build(True)
(OUT / (ID + '.json')).write_text(json.dumps(STATS, indent=2), encoding='utf-8')
print('KIDS_COMPLETE', json.dumps(STATS))
