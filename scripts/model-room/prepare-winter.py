"""Prepare "Winter sports equipment" (Rodion's model, 2023) for the on-demand archive.

    blender -b --factory-startup --python scripts/model-room/prepare-winter.py -- "source directory"

The source is an FBX 6.1 file (read with fbx6.py) whose V-Ray materials do not survive: the textures in
`maps/` are reconnected here by material name, and plastics, metals and rubber are rebuilt as web PBR.
The rack is wall-mounted in the source; a plain display wall is added behind it so it can stand on the stage.
Source units are centimetres; the export is in metres at real size.
"""
import bpy, sys, json, math, re
from pathlib import Path
from mathutils import Vector

BASE = Path(sys.argv[sys.argv.index('--') + 1]); ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import fbx6
from bake_ao import bake_ao

OUT = ROOT / 'public/models/archive'; ID = 'winter-sports'; STATS = {}


def srgb(hex_):
    rgb = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]


def build(mobile):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    fbx6.load(str(BASE / 'export/fbx.FBX'))
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
    source_tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    limit = 1024 if mobile else 2048
    made = {}

    def image(name, non_color=False):
        im = bpy.data.images.load(str(BASE / 'maps' / name), check_existing=True)
        w, h = im.size; k = min(1, limit / max(w, h))
        if k < 1: im.scale(max(1, int(w * k)), max(1, int(h * k)))
        if non_color: im.colorspace_settings.name = 'Non-Color'
        return im

    def material(name, colour='#808080', rough=.5, metal=0, tex=None, normal=None, strength=1):
        if name in made: return made[name]
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; p = nt.nodes['Principled BSDF']
        p.inputs['Base Color'].default_value = (*(colour if isinstance(colour, (list, tuple)) else srgb(colour)), 1)
        p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
        if tex:
            n = nt.nodes.new('ShaderNodeTexImage'); n.image = image(tex); nt.links.new(n.outputs['Color'], p.inputs['Base Color'])
        if normal:
            n = nt.nodes.new('ShaderNodeTexImage'); n.image = image(normal, True)
            nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = strength
            nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
        made[name] = m; return m

    def remap(old):
        """A web material for a source material (by its 3ds Max name; `_ncl1_N` are its instanced copies)."""
        if old is None: return material('Rubber straps', '#141414', .8)
        name = old.name; base = re.sub(r'_ncl1_\d+$', '', name); diffuse = list(old.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value[:3])
        if base == 'wood': return material('Oak rail', '#ffffff', .5, tex='wood yellow dif.jpg')
        if base == '01 - Default': return material('Snowboard graphic A', '#ffffff', .32, tex='s2.jpg')
        if base == '02 - Default': return material('Snowboard graphic B', '#ffffff', .32, tex='s1.jpg')
        if base == '12- Default':
            file = {'12- Default': 'Solomon.jpeg', '12- Default_ncl1_1': 'atomic.jpg', '12- Default_ncl1_2': 'scott_2014_rock_air2.jpg'}[name]
            return material('Ski topsheet ' + {'Solomon.jpeg': 'A', 'atomic.jpg': 'B', 'scott_2014_rock_air2.jpg': 'C'}[file], '#ffffff', .3, tex=file)
        if base == 'Material #56': return material('Ski base and sidewalls', '#e6e7e8', .4)
        if base == 'Material #14': return material('Boot mesh fabric', '#ffffff', .92, tex='blak.jpg')
        if name in ('Material #11_ncl1_3', 'Material #11_ncl1_6'): return material('Rubber sole', '#ffffff', .85, tex='rubber but.jpg', normal='rubber butN.jpg')
        if base == 'Material #11': return material('Boot black plastic', '#0c0c0d', .38)
        if base == 'Material #13': return material('Ribbed boot plastic', '#101011', .5, normal='line bumN.jpg', strength=.8)
        if base == 'Material #16': return material('Laces', '#161616', .85, normal='rope N.jpg')
        if base == 'chrome': return material('Galvanised buckles', '#ffffff', .38, 1, tex='zink.jpg')
        if base == 'Material #44': return material('Boot shell', '#c9ccd0', .3)
        if base == 'Material #41':
            tone = 'black' if max(diffuse) < .1 else 'green' if diffuse[1] > diffuse[0] else 'red' if diffuse[1] < .05 else 'orange'
            return material('Binding plastic, ' + tone, [max(v, .012) for v in diffuse], .3)
        if base == 'Material #42': return material('Binding black plastic', '#0b0b0c', .4)
        if base.startswith('METAL::Aluminium'): return material('Aluminium', '#8d9299', .36, .9)
        if base.startswith('METAL::Smooth'): return material('Stainless steel', '#c8ccd0', .2, 1)
        if base == 'Material #28': return material('Black steel hooks', '#0e0e0f', .42, .6)
        return material('Detail', diffuse, .5)

    for o in objs:
        if not o.material_slots: o.data.materials.append(remap(None))
        for slot in o.material_slots: slot.material = remap(slot.material)
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        if mobile and sum(len(p.vertices) - 2 for p in o.data.polygons) > 3000:
            d = o.modifiers.new('Web budget', 'DECIMATE'); d.ratio = .45; d.use_collapse_triangulate = True; bpy.ops.object.modifier_apply(modifier=d.name)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Centimetres to metres; centred on the rack, standing on the floor.
    pts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    offset = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    for o in objs:
        for v in o.data.vertices: v.co = (v.co - offset) * .01
    size = (hi - lo) * .01

    # The display wall the rack hangs on: a plain panel a little wider and taller than the gear.
    w, h, t = size.x + .3, size.z + .18, .05
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, size.y / 2 + t / 2 + .002, h / 2))
    wall = bpy.context.object; wall.scale = (w, t, h); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    wall.data.materials.append(material('Display wall', '#3a403d', .82)); objs.append(wall)

    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join()
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='MATERIAL'); bpy.ops.object.mode_set(mode='OBJECT')
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in meshes:
        o.name = ID + ' | ' + o.data.materials[0].name
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    bake_ao(meshes)
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    filename = ID + ('.mobile' if mobile else '') + '.glb'
    bpy.ops.export_scene.gltf(filepath=str(OUT / filename), use_selection=True, export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_format='GLB', export_yup=True, export_apply=True,
                              export_image_format='WEBP', export_image_quality=84, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_draco_position_quantization=14)
    STATS['mobile' if mobile else 'desktop'] = {
        'sourceTriangles': source_tris, 'triangles': sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes), 'drawMeshes': len(meshes),
        'bytes': (OUT / filename).stat().st_size, 'dimensionsMetres': [w, size.y + t, h],
        'materialNote': 'Web PBR rebuilt from the V-Ray scene; the supplied textures are reconnected by material name. The display wall is added.',
    }


build(False); build(True)
(OUT / (ID + '.json')).write_text(json.dumps(STATS, indent=2), encoding='utf-8')
print('WINTER_COMPLETE', json.dumps(STATS))
