# The house for the private proposal scene: the "Commercial building 7" pavilion (a bought model, not the
# studio's own work), cleaned for the web. Imports the Corona FBX, joins the parts by material, wires the
# wood and solar-panel maps, and writes a Draco GLB with WebP textures. The scene script dresses the rest
# (glass, lit strips) in three.js.
#
#   blender -b --factory-startup --python scripts/proposal/prepare-house.py -- <folder with the FBX and textures/> <out.glb> [mobile]
import bpy, os, sys

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = os.path.abspath(args[0]), os.path.abspath(args[1])
MOBILE = 'mobile' in args[2:]
TEX = os.path.join(SRC, 'textures')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, '7191_building7_corona.fbx'))
for o in list(bpy.context.scene.objects):
    if o.type != 'MESH': bpy.data.objects.remove(o)

# One object per material: a handful of draw calls instead of fifty.
groups = {}
for o in bpy.context.scene.objects:
    groups.setdefault(o.material_slots[0].material.name if o.material_slots and o.material_slots[0].material else '', []).append(o)
for name, objs in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    bpy.context.view_layer.objects.active.name = name.replace('7191_', '')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

if MOBILE:
    for o in bpy.context.scene.objects:
        if sum(len(p.vertices) - 2 for p in o.data.polygons) > 3000:
            m = o.modifiers.new('reduce', 'DECIMATE'); m.ratio = .5; m.use_collapse_triangulate = True
            bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=m.name)

def image(name):
    path = os.path.join(TEX, name)
    if not os.path.exists(path): return None
    img = bpy.data.images.load(path)
    if MOBILE and max(img.size) > 1024: img.scale(1024, int(img.size[1] * 1024 / img.size[0]))
    elif max(img.size) > 2048: img.scale(2048, int(img.size[1] * 2048 / img.size[0]))
    return img

def principled(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return nt, bsdf

def textured(mat, base, normal, gloss, rough_fallback):
    nt, bsdf = principled(mat)
    b = image(base)
    if b:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = b; nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
    n = image(normal)
    if n:
        n.colorspace_settings.name = 'Non-Color'
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = n; nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Roughness'].default_value = rough_fallback

for mat in bpy.data.materials:
    name = mat.name.replace('7191_', '')
    if name == 'wood': textured(mat, '7191_wood3_diffuse.jpg', '7191_wood3_normal.jpg', '7191_wood3_glossiness.jpg', .55)
    elif name == 'SolarPanel': textured(mat, '7191_SolarPanel_BaseColor.jpg', '7191_SolarPanel_Normal.jpg', '7191_SolarPanel_Glossiness.jpg', .25)
    else:
        nt, bsdf = principled(mat)
        colours = {'Matte': (.82, .8, .76), 'MatteGreyLight': (.55, .55, .54), 'MatteGreyDark': (.2, .2, .2), 'Black': (.025, .025, .027), 'Glass': (.1, .12, .13)}
        bsdf.inputs['Base Color'].default_value = (*colours.get(name, (0, 0, 0)), 1)
        bsdf.inputs['Roughness'].default_value = .08 if name == 'Glass' else .6
        if name.startswith('Backlight') or name.endswith('Light') or name.endswith('Lights'):
            bsdf.inputs['Emission Color'].default_value = (1, .78, .5, 1); bsdf.inputs['Emission Strength'].default_value = 1
    mat.name = name

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', export_yup=True, export_apply=True,
    export_image_format='WEBP', export_image_quality=80, export_materials='EXPORT', export_texcoords=True, export_normals=True,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14, export_draco_normal_quantization=10, export_draco_texcoord_quantization=12,
    export_cameras=False, export_lights=False, export_animations=False)
print('WROTE', OUT, os.path.getsize(OUT), 'tris', sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects))
