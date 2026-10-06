"""Prepare Citizen watch and wardrobe FBX assets for the tablet.
Blender --background --python scripts/model-room/prepare-watch-wardrobe.py -- watch|wardrobe SOURCE_FBX
Source textures stay embedded. V-Ray materials are reconstructed as web PBR.
"""
import bpy, sys, re, json, math
from pathlib import Path
from mathutils import Vector, Matrix
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/models/archive'
sys.path.insert(0, str(Path(__file__).resolve().parent))
from bake_ao import bake_ao
KIND, source = sys.argv[sys.argv.index('--') + 1:]
SOURCE = Path(source).resolve()
ID = 'citizen-eco-drive' if KIND == 'watch' else 'bedroom-wardrobe-3'
STATS = {}

def build(mobile):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(SOURCE))
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    transforms = [(o, o.matrix_world.copy()) for o in objs]
    turn = (Matrix.Rotation(math.radians(70), 4, 'X') @ Matrix.Rotation(math.radians(-90), 4, 'Z')) if KIND == 'watch' else Matrix.Identity(4)
    for o, world in transforms:
        o.data = o.data.copy(); o.data.transform(turn @ world); o.parent = None; o.matrix_world = Matrix.Identity(4)
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.view_layer.update()
    source_tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    pts = [o.matrix_world @ Vector(v) for o in objs for v in o.bound_box]
    lo = Vector([min(v[i] for v in pts) for i in range(3)]); hi = Vector([max(v[i] for v in pts) for i in range(3)])
    scale = min(2.2 / (hi.z - lo.z), 2.8 / (hi.x - lo.x), 2.8 / (hi.y - lo.y)) if KIND == 'watch' else 2.35 / (hi.z - lo.z)
    offset = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    made, images = {}, {}
    limit = 1024 if mobile else 2048

    def image(name, non_color=False):
        key = (name, non_color)
        if key in images: return images[key]
        p = SOURCE.parent / name
        if not p.is_file(): raise FileNotFoundError(p)
        im = bpy.data.images.load(str(p), check_existing=False)
        if non_color: im.colorspace_settings.name = 'Non-Color'
        size = min(limit, 512 if mobile else 1024) if non_color else limit
        if max(im.size) > size:
            k = size / max(im.size); im.scale(round(im.size[0] * k), round(im.size[1] * k))
        if non_color and name.endswith('_g.jpg'):
            # The supplied g maps are gloss; glTF expects roughness.
            import numpy as np
            pixels = np.empty(len(im.pixels), dtype=np.float32); im.pixels.foreach_get(pixels)
            rgba = pixels.reshape(-1, 4); rgba[:, :3] = .04 + .85 * (1 - rgba[:, :3])
            im.pixels.foreach_set(pixels); im.update()
        im.pack(); images[key] = im
        return im

    def material(name, color, rough=.65, metal=0, tex=None, normal=None, roughmap=None, alpha=1):
        if name in made: return made[name]
        m = bpy.data.materials.new(name); m.use_nodes = True
        nt = m.node_tree; p = nt.nodes['Principled BSDF']
        p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Metallic'].default_value = metal
        p.inputs['Roughness'].default_value = rough; p.inputs['Alpha'].default_value = alpha
        if alpha < 1: m.surface_render_method = 'DITHERED'
        for filename, slot in [(tex, 'Base Color'), (roughmap, 'Roughness')]:
            if filename:
                n = nt.nodes.new('ShaderNodeTexImage'); n.image = image(filename, slot != 'Base Color'); nt.links.new(n.outputs['Color'], p.inputs[slot])
        if normal:
            n = nt.nodes.new('ShaderNodeTexImage'); n.image = image(normal, True)
            nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = .5
            nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
        made[name] = m
        return m

    def remap(old):
        name = re.sub(r'\.\d+$', '', old.name); low = name.lower()
        if KIND == 'watch':
            if name == 'Glass': return material('Sapphire crystal', (.03, .04, .05), .08, .05, alpha=.035)
            if name == 'Band': return material('Citizen metal bracelet', (1, 1, 1), .32, .8, 'mat0_c.jpg', 'mat0_n.jpg', 'mat0_g.jpg')
            if name == 'Rim': return material('Citizen steel case', (.44, .48, .52), .24, .95, tex='mat2_r.jpg', normal='mat2_n.jpg', roughmap='mat2_g.jpg')
            return material('Citizen blue dial', (1, 1, 1), .45, .25, 'mat3_c.jpg', 'mat3_n.jpg', 'mat3_g.jpg')
        if 'glass' in low or 'steklo' in low:
            return material('Tinted cabinet glass' if 'steklo' in low else 'Accessory glass', (.03, .04, .04), .18, .08, alpha=.055)
        if 'metall' in low or 'chrome' in low or 'gold' in low:
            return material('Brushed metal fittings' if 'gold' not in low else 'Warm metal fittings', (.28, .3, .31) if 'gold' not in low else (.5, .3, .09), .3, .8)
        if name == 'Wood2': return material('Charcoal cabinet frame', (.045, .049, .044), .55)
        if name == 'Lampi shkafa':
            m = material('Warm cabinet lights', (.65, .45, .22), .5)
            p = m.node_tree.nodes['Principled BSDF']; p.inputs['Emission Color'].default_value = (1, .66, .3, 1); p.inputs['Emission Strength'].default_value = 1.5
            return m
        tex = None
        p = old.node_tree.nodes.get('Principled BSDF') if old.use_nodes else None
        if p and p.inputs['Base Color'].is_linked:
            n = p.inputs['Base Color'].links[0].from_node
            if n.type == 'TEX_IMAGE' and n.image:
                candidate = n.image.filepath.replace('\\', '/').rsplit('/', 1)[-1]
                if (SOURCE.parent / candidate).is_file(): tex = candidate
        # Missing procedural maps get a restrained, material-specific base colour.
        c = tuple(max(.012, min(.65, v)) for v in old.diffuse_color[:3])
        if low in ('white', 'wheit_pp'): c = (.65, .63, .59)
        if low == 'shov': c = (.06, .04, .035)
        if tex and any(x in tex.lower() for x in ('bamp', 'bump', 'refl', 'mask')): tex = None
        if low == 'wood1' or name == 'wood2': tex = 'QBK 794 W_Ogon Oak.jpg'
        return material('Wardrobe | ' + name, c, .82 if any(x in low for x in ('fabrik', 'palto', 'platie', 'fetr')) else .55, tex=tex)

    for o in objs:
        mapped = [remap(m) if m else material('Neutral fabric', (.08, .08, .08)) for m in o.data.materials]
        for i, m in enumerate(mapped): o.data.materials[i] = m
        for v in o.data.vertices: v.co = (v.co - offset) * scale
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        count = sum(len(p.vertices) - 2 for p in o.data.polygons)
        if KIND == 'wardrobe' and count > 1800:
            # Preserve cabinet edges, spend the reduction on dense garments and jewellery.
            ratio = min(1, (9000 if mobile else 20000) / count, .22 if mobile else .48)
            if o.name.startswith(('ChamferBox', 'Box')): ratio = .65 if mobile else 1
            if ratio < 1:
                d = o.modifiers.new('Web detail budget', 'DECIMATE'); d.ratio = ratio; d.use_collapse_triangulate = True
                bpy.ops.object.modifier_apply(modifier=d.name)
        for key in list(o.keys()): del o[key]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join()
    joined = bpy.context.object; joined.name = ID
    if KIND == 'wardrobe': bake_ao([joined], samples=16)
    bpy.ops.object.select_all(action='DESELECT'); joined.select_set(True)
    file = OUT / (ID + ('.mobile' if mobile else '') + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(file), use_selection=True, export_format='GLB', export_yup=True, export_apply=True, export_vertex_color='ACTIVE', export_image_format='WEBP', export_image_quality=88, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_draco_position_quantization=14, export_animations=False)
    STATS['mobile' if mobile else 'desktop'] = dict(sourceTriangles=source_tris, triangles=sum(len(p.vertices) - 2 for p in joined.data.polygons), bytes=file.stat().st_size, displayDimensions=list((hi-lo)*scale), materialNote='Web PBR reconstruction using supplied material names, UVs and texture maps.')
    print('EXPORTED', ID, mobile, STATS['mobile' if mobile else 'desktop'], flush=True)

build(False); build(True)
(OUT / (ID + '.json')).write_text(json.dumps(STATS, indent=2), encoding='utf-8')
