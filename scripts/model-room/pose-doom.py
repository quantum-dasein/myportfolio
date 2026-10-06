"""Doctor Doom (Sketchfab "Dr Doom" by kingmoon3D, CC-BY-4.0) stands in an A-pose with no rig. This folds his
arms across his chest, the way he likes to stand: each arm is skinned to an upper-arm and a forearm segment by
distance (only vertices in front of the cape), the upper arm turned down along the body, the forearm across the
chest, the right arm over the left. Then it writes a Draco GLB with the WebP texture.

    blender -b --factory-startup --python scripts/model-room/pose-doom.py -- artifacts/sources/doom/scene.gltf public/models/gift/doom.glb
"""
import bpy, sys, math
from mathutils import Vector, Matrix, Quaternion

src, out = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in meshes:
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def seg(p, a, b):
    ab = b - a; t = max(0., min(1., (p - a).dot(ab) / ab.length_squared)); return (p - (a + ab * t)).length, t

for o in meshes:
    me = o.data
    moved = 0
    for s in (1, -1):
        # Joints (he faces -Y; the cape hangs at +Y): shoulder, elbow, wrist, fingertip.
        sh, el, wr, tip = Vector((s * .21, -.075, .33)), Vector((s * .262, -.09, .21)), Vector((s * .325, -.15, .085)), Vector((s * .36, -.18, -.005))
        up_dir, fo_dir = (el - sh).normalized(), (wr - el).normalized()
        # Where the arms go: upper arm hanging down and a little forward; forearm across the chest, rising slightly.
        up_to = Vector((s * .06, -.45, -1)).normalized()
        fo_to = Vector((-s * 1, -.32 - (.05 if s > 0 else 0), .1)).normalized()
        q_up = up_dir.rotation_difference(up_to)
        el2 = sh + q_up @ (el - sh)
        q_fo = (q_up @ fo_dir).rotation_difference(fo_to) @ q_up
        lift = Vector((0, -.035 if s > 0 else 0, .02 if s > 0 else -.01))   # right arm over the left
        for v in me.vertices:
            p = v.co.copy()
            if p.x * s < .165 or p.y > 0 or p.z < -.06 or p.z > .38: continue
            du, tu = seg(p, sh, el); df, tf = seg(p, el, tip)
            if min(du, df) > .085: continue
            # Blend in from the shoulder, and between the two segments around the elbow.
            w_arm = max(0., min(1., ((p - sh).dot(up_dir) + .02) / .07))
            a = (p - el).dot(fo_dir); w_fo = max(0., min(1., (a + .025) / .05))
            p_up = sh + q_up @ (p - sh)
            p_fo = el2 + q_fo @ (p - el) + lift
            posed = p_up.lerp(p_fo, w_fo)
            v.co = p.lerp(posed, w_arm); moved += 1
    me.update(); print('MOVED', o.name, moved)

for o in meshes:
    for m in o.data.materials:
        if m and m.use_nodes:
            pb = m.node_tree.nodes.get('Principled BSDF')
            if pb: pb.inputs['Roughness'].default_value = .55
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True, export_image_format='WEBP', export_image_quality=88,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print('DOOM_POSED', out)
