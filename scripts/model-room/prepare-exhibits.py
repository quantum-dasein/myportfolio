# Prepares the Model Room's exhibits from Rodion's original model files.
#   blender -b --factory-startup --python scripts/model-room/prepare-exhibits.py -- <sources dir> <out dir> [name ...]
# Only meshes survive (the re-upload's text and helper objects are dropped). Parts are merged by
# material, reduced to a web budget, scaled to real size, standing on the floor and centred, then
# written as Draco-compressed GLB with WebP textures (no side larger than 2048 px).
import bpy, sys, os, math, mathutils

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT, ONLY = args[0], args[1], set(args[2:])

EXHIBITS = {
    # name: source file, which dimension to fit and its size in metres, triangle budget
    'k2so': dict(file='k2so/K-2SO Star Wars Droid 3D Model/K-2SO.fbx', fit='height', size=2.16, tris=150000,
                 pbr=dict(base='19 - Default_Base_Color.png', rough='19 - Default_Roughness.png', normal='K-2SO_19 - Default_Normal.png')),
    # The .blend was built Y-up (for a game engine): stand it up before fitting.
    'audi-ebike': dict(file='ebike/Audi e-bike Low-poly 3D model.blend', fit='length', size=1.86, tris=0, rotate_x=90,
                       decal=dict(material='bicycles_Decal', alpha='mat4_a.jpg')),
    # An FBX 6.1 house, shown as an architectural model at about 1:15.
    'abs-house': dict(file='house2/FBX.FBX', fit='length', size=1.3, tris=160000),
    # The sofa set is already in metres; the rug exists twice in the file.
    'sofa': dict(file='sofa/Vavicci_Sofa_C_FBX.FBX', fit=None, tris=160000, exclude=('Viavcci_Carpet03',)),
}
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def decal(folder, cfg):
    """Pack the decal sheet's separate alpha image into its colour image, cut out (alpha mask)."""
    import numpy as np
    m = bpy.data.materials.get(cfg['material'])
    if not m: return
    nt = m.node_tree; tex = next(n for n in nt.nodes if n.type == 'TEX_IMAGE'); bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    colour = tex.image; alpha = bpy.data.images.load(os.path.join(folder, cfg['alpha']))
    w, h = colour.size
    if tuple(alpha.size) != (w, h): alpha.scale(w, h)
    c = np.empty(w * h * 4, np.float32); colour.pixels.foreach_get(c)
    a = np.empty(w * h * 4, np.float32); alpha.pixels.foreach_get(a)
    c[3::4] = a[0::4]
    packed = bpy.data.images.new('decal_packed', w, h, alpha=True); packed.pixels.foreach_set(c); packed.file_format = 'PNG'
    tex.image = packed; nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
    m.blend_method = 'CLIP'; m.alpha_threshold = .5

def load(path, exclude=()):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if path.lower().endswith('.fbx'):
        try:
            bpy.ops.import_scene.fbx(filepath=path)
        except RuntimeError as error:
            if 'unsupported' not in str(error): raise
            import fbx6; fbx6.load(path)   # an FBX older than 2011
    else:
        with bpy.data.libraries.load(path) as (src, dst): dst.objects = src.objects
        for o in dst.objects:
            if o: bpy.context.scene.collection.objects.link(o)
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH' or o.name in exclude: bpy.data.objects.remove(o, do_unlink=True)
    # Bake parents and transforms into the meshes.
    for o in bpy.context.scene.objects:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.ops.object.select_all(action='SELECT'); bpy.context.view_layer.objects.active = bpy.context.scene.objects[0]
    # Instanced parts (wheels) share mesh data, and Blender refuses to apply transforms to shared data.
    bpy.ops.object.make_single_user(type='ALL', object=True, obdata=True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def merge_by_material():
    groups = {}
    for o in list(bpy.context.scene.objects):
        key = tuple(s.material.name if s.material else '' for s in o.material_slots)
        groups.setdefault(key[0] if len(key) == 1 else '|'.join(key), []).append(o)
    for key, objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1: bpy.ops.object.join()
        bpy.context.view_layer.objects.active.name = key.split('|')[0] or 'part'

def tri_count(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)

def reduce(budget):
    objs = list(bpy.context.scene.objects); total = sum(tri_count(o) for o in objs)
    print('TRIS before', total)
    if not budget or total <= budget: return
    ratio = budget / total
    for o in objs:
        n = tri_count(o)
        if n < 1500: continue
        m = o.modifiers.new('reduce', 'DECIMATE'); m.ratio = max(ratio, 0.08); m.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=m.name)
    print('TRIS after', sum(tri_count(o) for o in bpy.context.scene.objects))

def smooth():
    for o in bpy.context.scene.objects:
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.shade_smooth_by_angle(angle=0.61)

def place(fit, size=None):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in bpy.context.scene.objects:
        if o.scale != mathutils.Vector((1, 1, 1)): raise RuntimeError('unapplied scale on ' + o.name)
    lo = mathutils.Vector((1e9,) * 3); hi = -lo
    for o in bpy.context.scene.objects:
        for v in o.data.vertices: lo = mathutils.Vector(map(min, lo, v.co)); hi = mathutils.Vector(map(max, hi, v.co))
    dim = hi - lo
    current = dim.z if fit == 'height' else max(dim.x, dim.y)
    k = size / current if fit else 1.0; offset = mathutils.Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    for o in bpy.context.scene.objects:
        for v in o.data.vertices: v.co = (v.co - offset) * k
    print('SIZE', [round(x * k, 3) for x in dim])

def pbr(folder, maps):
    def image(name, colour):
        img = bpy.data.images.load(os.path.join(folder, name))
        if max(img.size) > 2048: img.scale(2048, 2048)
        img.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
        return img
    base, rough, normal = image(maps['base'], True), image(maps['rough'], False), image(maps['normal'], False)
    for m in bpy.data.materials:
        m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial'); bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
        nt.links.new(bsdf.outputs[0], out.inputs[0])
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = base; nt.links.new(t.outputs[0], bsdf.inputs['Base Color'])
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = rough; nt.links.new(t.outputs[0], bsdf.inputs['Roughness'])
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = normal; nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(t.outputs[0], nm.inputs['Color']); nt.links.new(nm.outputs[0], bsdf.inputs['Normal'])
        bsdf.inputs['Metallic'].default_value = .6

def strip_missing_images():
    """Texture files the archive did not include: drop their nodes so the exporter keeps the plain colours."""
    for m in bpy.data.materials:
        if not m.use_nodes: continue
        for n in list(m.node_tree.nodes):
            if n.type == 'TEX_IMAGE' and (not n.image or not n.image.has_data):
                m.node_tree.nodes.remove(n)

def shrink_images():
    for img in bpy.data.images:
        if img.size[0] and max(img.size) > 2048:
            w, h = img.size; k = 2048 / max(w, h); img.scale(int(w * k), int(h * k))

for name, cfg in EXHIBITS.items():
    if ONLY and name not in ONLY: continue
    path = os.path.join(SRC, cfg['file']); print('==', name, path)
    load(path, cfg.get('exclude', ()))
    strip_missing_images()
    merge_by_material()
    if cfg.get('rotate_x'):
        turn = mathutils.Matrix.Rotation(math.radians(cfg['rotate_x']), 4, 'X')
        for o in bpy.context.scene.objects: o.data.transform(turn)
    reduce(cfg['tris'])
    smooth()
    place(cfg['fit'], cfg.get('size'))
    if 'pbr' in cfg: pbr(os.path.dirname(path), cfg['pbr'])
    if 'decal' in cfg: decal(os.path.dirname(path), cfg['decal'])
    shrink_images()
    for o in bpy.context.scene.objects: o.name = name + '_' + o.name.replace('desirefx.me', 'part').replace('desirefx_me', 'part')
    # A millimetre FBX leaves the scene's unit scale at 0.001, which the exporter would bake into every node.
    bpy.context.scene.unit_settings.scale_length = 1.0
    # Fresh objects around the finished meshes: the FBX importer leaves state on its objects that the
    # glTF exporter turns into a 0.001 node scale, even with identity transforms.
    for o in list(bpy.context.scene.objects):
        keep = o.name; fresh = bpy.data.objects.new(keep + '_new', o.data); bpy.context.scene.collection.objects.link(fresh)
        bpy.data.objects.remove(o, do_unlink=True); fresh.name = keep
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', export_yup=True, export_apply=True,
        export_image_format='WEBP', export_image_quality=82, export_materials='EXPORT', export_texcoords=True, export_normals=True,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14, export_draco_normal_quantization=10, export_draco_texcoord_quantization=12,
        export_cameras=False, export_lights=False, export_animations=False)
    print('WROTE', name, os.path.getsize(os.path.join(OUT, name + '.glb')))
