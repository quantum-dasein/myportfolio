# Rodion and Lida for the night scene, built on Blender Studio's realistic human base meshes (CC0,
# "Human Base Meshes" bundle v1.4.1) instead of primitives: real anatomy, their build and height, their
# hair, glasses and clothes after the photos he sent, a light smile, and an 18-bone skeleton named like
# the earlier Codex rig (Root, Hips, Spine, Chest, Neck, Head, UpperArm/Forearm/Hand, Thigh/Shin/Foot .L/.R).
# The scene poses the bones itself (night-people.ts), so no clips are baked.
#
#   blender -b <bundle>/human_base_meshes_bundle.blend --python scripts/proposal/build-people.py -- <out dir> [rodion|lida] [mobile]
import bpy, bmesh, math, os, random, sys
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:]
OUT, WHO = os.path.abspath(args[0]), args[1]
MOBILE = 'mobile' in args[2:]
random.seed(7 if WHO == 'rodion' else 11)

CFG = {
    'rodion': dict(src='GEO-body_male_realistic', height=1.80, girth=(1.07, 1.1), skin=(.93, .76, .66), iris=(.24, .14, .08),
                   hair=(.10, .065, .045), shirt=(.035, .036, .04), pants=(.06, .065, .075), shoes=(.92, .92, .9), brows=.0045),
    'lida': dict(src='GEO-body_female_realistic', height=1.52, girth=(1.02, 1.04), skin=(.96, .8, .72), iris=(.3, .22, .12),
                 hair=(.36, .25, .15), shirt=(.03, .03, .033), pants=(.035, .035, .04), shoes=(.05, .05, .055), brows=.003),
}[WHO]

def srgb(c): return tuple(pow(v, 2.2) for v in c)

# ── The body ────────────────────────────────────────────────────────────────────────────────────────────
body = bpy.data.objects[CFG['src']]
eyes = [bpy.data.objects[CFG['src'] + '.eye.L'], bpy.data.objects[CFG['src'] + '.eye.R']]
keep = {body.name, *[e.name for e in eyes]}
for o in list(bpy.data.objects):
    if o.name not in keep: bpy.data.objects.remove(o, do_unlink=True)
sc = bpy.context.scene
for o in [body, *eyes]:
    if o.name not in sc.collection.objects: sc.collection.objects.link(o)
    o.hide_viewport = o.hide_render = False; o.hide_set(False)
for e in eyes:
    m = e.matrix_world.copy(); e.parent = None; e.matrix_world = m
bpy.context.view_layer.objects.active = body
for m in list(body.modifiers):
    if m.type == 'MULTIRES':
        lv = 0 if MOBILE else 1
        m.levels = m.sculpt_levels = m.render_levels = lv
        with bpy.context.temp_override(object=body): bpy.ops.object.modifier_apply(modifier=m.name)
    else: body.modifiers.remove(m)

# Stand at the origin, feet on the floor, at their height; a little fuller than the athletic base.
def bounds(objs):
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in objs:
        for v in o.data.vertices:
            w = o.matrix_world @ v.co; lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    return lo, hi
lo, hi = bounds([body])
k = CFG['height'] / (hi.z - lo.z)
centre = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
for o in [body, *eyes]:
    o.matrix_world = Matrix.Diagonal((k * CFG['girth'][0], k * CFG['girth'][1], k, 1)) @ Matrix.Translation(-centre) @ o.matrix_world
    with bpy.context.temp_override(selected_editable_objects=[o], active_object=o, object=o):
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
H = CFG['height']
V = body.data.vertices
eyeL = eyes[0].matrix_world.translation.copy() if False else sum((v.co for v in eyes[0].data.vertices), Vector()) / len(eyes[0].data.vertices)
eyeR = sum((v.co for v in eyes[1].data.vertices), Vector()) / len(eyes[1].data.vertices)
eyeC = (eyeL + eyeR) / 2
eyeRadius = max((v.co - eyeL).length for v in eyes[0].data.vertices)
print('height', H, 'eyes', eyeL, eyeR, 'r', eyeRadius)

# ── Landmarks, measured on the mesh ─────────────────────────────────────────────────────────────────────
def slice_mean(zlo, zhi, side=0, xmin=0.0):
    pts = [v.co for v in V if zlo <= v.co.z <= zhi and (side == 0 or v.co.x * side > xmin)]
    return sum(pts, Vector()) / max(1, len(pts))
tip = {s: max((v.co for v in V if v.co.x * s > 0), key=lambda c: c.x * s) for s in (1, -1)}
joints = {}
for s, n in ((1, 'L'), (-1, 'R')):
    shoulder = Vector((s * .105 * H * CFG['girth'][0], eyeC.y + .085 * H / 1.8, .815 * H))
    d = (tip[s] - shoulder).normalized(); L = (tip[s] - shoulder).length
    joints['UpperArm.' + n] = (shoulder, shoulder + d * L * .43)
    joints['Forearm.' + n] = (shoulder + d * L * .43, shoulder + d * L * .76)
    joints['Hand.' + n] = (shoulder + d * L * .76, tip[s])
    knee = slice_mean(.28 * H, .29 * H, s, .01); ankle = slice_mean(.045 * H, .055 * H, s, .01)
    hip = Vector((knee.x * .92, slice_mean(.5 * H, .52 * H).y, .5 * H))
    toe = min((v.co for v in V if v.co.x * s > 0 and v.co.z < .03 * H), key=lambda c: c.y)
    joints['Thigh.' + n] = (hip, knee); joints['Shin.' + n] = (knee, ankle); joints['Foot.' + n] = (ankle, Vector((ankle.x, toe.y + .02, .012)))
spineY = lambda z: slice_mean(z - .01, z + .01).y
joints['Hips'] = (Vector((0, spineY(.53 * H), .53 * H)), Vector((0, spineY(.61 * H), .61 * H)))
joints['Spine'] = (joints['Hips'][1], Vector((0, spineY(.7 * H), .7 * H)))
joints['Chest'] = (joints['Spine'][1], Vector((0, spineY(.8 * H), .82 * H)))
joints['Neck'] = (joints['Chest'][1], Vector((0, eyeC.y + .085 * H / 1.8, eyeC.z - .085 * H / 1.8)))
joints['Head'] = (joints['Neck'][1], Vector((0, joints['Neck'][1].y, H)))

# ── The skeleton ────────────────────────────────────────────────────────────────────────────────────────
arm_data = bpy.data.armatures.new(WHO + '-rig'); rig = bpy.data.objects.new(WHO.capitalize(), arm_data); sc.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
parents = {'Hips': 'Root', 'Spine': 'Hips', 'Chest': 'Spine', 'Neck': 'Chest', 'Head': 'Neck',
           'UpperArm.L': 'Chest', 'Forearm.L': 'UpperArm.L', 'Hand.L': 'Forearm.L', 'UpperArm.R': 'Chest', 'Forearm.R': 'UpperArm.R', 'Hand.R': 'Forearm.R',
           'Thigh.L': 'Hips', 'Shin.L': 'Thigh.L', 'Foot.L': 'Shin.L', 'Thigh.R': 'Hips', 'Shin.R': 'Thigh.R', 'Foot.R': 'Shin.R'}
eb = arm_data.edit_bones
root = eb.new('Root'); root.head = (0, 0, 0); root.tail = (0, 0, .1)
for name in parents:
    b = eb.new(name); b.head, b.tail = joints[name]; b.roll = 0
for name, p in parents.items():
    eb[name].parent = eb[p]
    eb[name].use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')

# Automatic (heat) weights for the body.
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
print('vgroups', [g.name for g in body.vertex_groups])
# Heat weighting can fail on a mesh (it does on the female base). Then weigh by distance to each bone instead:
# arms only on their own side, legs likewise, a steep falloff so segments stay rigid and joints blend.
weighted = sum(1 for v in V if any(g.weight > 0 for g in v.groups))
if weighted < len(V) * .95:
    print('heat weighting failed for', len(V) - weighted, 'vertices: weighing by distance')
    for g in list(body.vertex_groups): body.vertex_groups.remove(g)
    groups = {n: body.vertex_groups.new(name=n) for n in ['Root', *parents]}
    shoulderX = abs(joints['UpperArm.L'][0].x)
    def seg(p, a, b):
        ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9))); return (p - (a + ab * t)).length
    for v in V:
        p = v.co; cands = []
        for n in parents:
            side = 1 if n.endswith('.L') else -1 if n.endswith('.R') else 0
            if side and (n.startswith('UpperArm') or n.startswith('Forearm') or n.startswith('Hand')) and p.x * side < shoulderX * .55: continue
            if side and (n.startswith('Thigh') or n.startswith('Shin') or n.startswith('Foot')) and p.x * side < -.01: continue
            d = seg(p, *joints[n]); cands.append((1 / (d ** 6 + 1e-12), n))
        cands.sort(reverse=True); cands = cands[:3]; tot = sum(w for w, _ in cands)
        for w, n in cands: groups[n].add([v.index], w / tot, 'REPLACE')


# ── A light smile: the corners of the mouth lifted a couple of millimetres ──────────────────────────────
mouthZ = eyeC.z - .077 * H / 1.8
front = lambda z, x: min((v.co.y for v in V if abs(v.co.z - z) < .006 and abs(v.co.x - x) < .006), default=eyeC.y - .1)
for s in (1, -1):
    corner = Vector((s * .024 * H / 1.8, 0, mouthZ)); corner.y = front(corner.z, corner.x)
    for v in V:
        d = (v.co - corner).length
        if d < .016: f = (1 - d / .016) ** 2; v.co.z += .0022 * f; v.co.y += .0012 * f; v.co.x += s * .0006 * f

# ── Skin colour in vertex colours: tone, cheeks, lips, stubble ──────────────────────────────────────────
def paint(obj, fn, name='Col'):
    me = obj.data
    attr = me.color_attributes.new(name, 'FLOAT_COLOR', 'POINT')
    for i, v in enumerate(me.vertices): attr.data[i].color = (*fn(obj.matrix_world @ v.co), 1)
    me.color_attributes.active_color = attr
skin = Vector(srgb(CFG['skin']))
def skin_at(p):
    c = skin.copy()
    rel = p - eyeC; s = H / 1.8
    if abs(rel.x) > .02 * s and abs(rel.x) < .06 * s and -.06 * s < rel.z < -.02 * s and rel.y < .02: c = c.lerp(Vector(srgb((.95, .6, .58))), .22)   # cheeks
    if abs(rel.x) < .006 * s and -.05 * s < rel.z < -.01 * s and rel.y < 0: c = c.lerp(Vector(srgb((.95, .62, .58))), .12)                              # nose tip
    lip = abs(rel.z - (-.077 * s)) < .007 * s and abs(rel.x) < .024 * s and rel.y < 0
    if lip: c = c.lerp(Vector(srgb((.78, .46, .44))), .65 if WHO == 'lida' else .45)
    if WHO == 'rodion':
        # Stubble: jaw, chin and upper lip, a bluish-grey shadow with a grain.
        jaw = -.15 * s < rel.z < -.055 * s and abs(rel.x) < .075 * s and rel.y < .05 * s
        moustache = -.075 * s < rel.z < -.06 * s and abs(rel.x) < .03 * s and rel.y < 0
        if (jaw or moustache) and not lip: c = c.lerp(Vector(srgb((.55, .47, .44))), .16 + .14 * random.random())
    return tuple(c)
paint(body, skin_at)
iris, sclera = Vector(srgb(CFG['iris'])), Vector(srgb((.93, .9, .86)))
for e, centre_ in zip(eyes, (eyeL, eyeR)):
    def eye_at(p, c=centre_):
        d = (p - c).normalized(); a = math.degrees(math.acos(max(-1, min(1, -d.y))))
        if a < 9: return (.01, .01, .01)
        if a < 24: t = (a - 9) / 15; return tuple(iris.lerp(iris * .45, 1 - t) * (1 + .15 * random.random()))
        return tuple(sclera.lerp(Vector(srgb((.9, .7, .68))), max(0, (a - 60) / 60) * .5))
    paint(e, eye_at)

# ── Clothes: shells lifted off the body where the photos have them ──────────────────────────────────────
def along_arm(p, s):
    a, b = joints['UpperArm.' + ('L' if s > 0 else 'R')]
    return (p - a).dot((b - a).normalized())
def shell(name, keep_fn, offset, colour, solid=.003, rough=.8, loose=False, legs=False, smooth_all=False):
    o = body.copy(); o.data = body.data.copy(); o.name = name; sc.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(o.data)
    dead = [v for v in bm.verts if not keep_fn(v.co)]
    bmesh.ops.delete(bm, geom=dead, context='VERTS')
    # Hems: relax the cut edge so it runs smooth instead of stepping along the body's faces.
    for _ in range(12):
        moves = {}
        for v in bm.verts:
            if not v.is_boundary: continue
            ring = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
            if len(ring) == 2: moves[v] = (ring[0].co + ring[1].co) / 2
        for v, c in moves.items(): v.co = v.co.lerp(c, .6)
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * offset
    if legs:
        # Straight trousers: nothing closer to the leg's axis than a cloth radius.
        for v in bm.verts:
            if v.co.z > .47 * H: continue
            side = 'L' if v.co.x > 0 else 'R'
            for bone, r in (('Thigh.' + side, .082 * H / 1.8), ('Shin.' + side, .066 * H / 1.8)):
                a, b = joints[bone]; ab = b - a; t = max(0, min(1, (v.co - a).dot(ab) / ab.length_squared)); q = a + ab * t
                if (v.co.z - a.z) * (v.co.z - b.z) <= 0:
                    d = v.co - q; d.z = 0
                    if 0 < d.length < r: v.co = Vector((q.x, q.y, v.co.z)) + d.normalized() * r
    bm.to_mesh(o.data); bm.free()
    for a in list(o.data.color_attributes): o.data.color_attributes.remove(a)
    for mod in list(o.modifiers): o.modifiers.remove(mod)   # the rig comes back at the end
    m = o.modifiers.new('solid', 'SOLIDIFY'); m.thickness = solid; m.offset = 1
    s = o.modifiers.new('smooth', 'SMOOTH'); s.factor = .7 if (loose or smooth_all) else .5; s.iterations = 40 if smooth_all else 14 if loose else 4
    for mod in [s, m]:
        with bpy.context.temp_override(object=o): bpy.ops.object.modifier_apply(modifier=mod.name)
    # Keep the armature modifier last.
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    p = mat.node_tree.nodes['Principled BSDF']; p.inputs['Base Color'].default_value = (*srgb(colour), 1); p.inputs['Roughness'].default_value = rough
    o.data.materials.clear(); o.data.materials.append(mat)
    return o
def is_shirt(c):
    if c.z < .5 * H or c.z > .835 * H: return False
    if c.z > .8 * H and abs(c.x) < .058 * H * CFG['girth'][0]: return False                      # a round neckline
    s = 1 if c.x > 0 else -1
    if abs(c.x) > .1 * H * CFG['girth'][0] and along_arm(c, s) > .11 * H: return False          # short sleeves
    return True
shirt = shell('Shirt', is_shirt, .016 if WHO == 'rodion' else .013, CFG['shirt'], rough=.85, loose=True)
def is_pants(c): return .045 * H < c.z < .525 * H and not (abs(c.x) > .14 * H)
pants = shell('Pants', is_pants, .01, CFG['pants'], rough=.75, legs=True)
def is_shoe(c): return c.z < .058 * H
# Shoes: the hull of each foot, lifted a little and set on a flat sole: a smooth shoe, not a sock with toes.
shoe_me = bpy.data.meshes.new('Shoes'); sbm = bmesh.new()
for sgn in (1, -1):
    pts = [v.co.copy() for v in V if v.co.z < .06 * H and v.co.x * sgn > 0]
    tmp = bmesh.new(); vs = [tmp.verts.new(p) for p in pts]
    hull = bmesh.ops.convex_hull(tmp, input=vs)
    bmesh.ops.delete(tmp, geom=list({g for g in hull['geom_interior'] + hull['geom_unused'] if isinstance(g, bmesh.types.BMVert)}), context='VERTS')
    bmesh.ops.subdivide_edges(tmp, edges=tmp.edges[:], cuts=2, use_grid_fill=True)
    tmp.normal_update()
    for v in tmp.verts: v.co += v.normal * .006; v.co.z = max(0.0, v.co.z)
    m = bpy.data.meshes.new('tmp'); tmp.to_mesh(m); sbm.from_mesh(m); bpy.data.meshes.remove(m); tmp.free()
sbm.to_mesh(shoe_me); sbm.free()
shoes = bpy.data.objects.new('Shoes', shoe_me); sc.collection.objects.link(shoes)
for sgn, n in ((1, 'L'), (-1, 'R')):
    g = shoes.vertex_groups.new(name='Foot.' + n); g.add([v.index for v in shoe_me.vertices if v.co.x * sgn > 0], 1.0, 'REPLACE')
sm_ = shoes.modifiers.new('smooth', 'SMOOTH'); sm_.factor = .8; sm_.iterations = 6
with bpy.context.temp_override(object=shoes): bpy.ops.object.modifier_apply(modifier=sm_.name)
shoe_mat = bpy.data.materials.new('Shoes'); shoe_mat.use_nodes = True
shoe_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*srgb(CFG['shoes']), 1); shoe_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .45
shoe_me.materials.append(shoe_mat)
# The body under the clothes goes, so nothing pokes through when they move.
bm = bmesh.new(); bm.from_mesh(body.data)
inside = lambda c: (is_shirt(c) and .52 * H < c.z < .8 * H and (abs(c.x) < .1 * H or along_arm(c, 1 if c.x > 0 else -1) < .08 * H)) or (.07 * H < c.z < .54 * H and abs(c.x) < .13 * H) or c.z < .045 * H
bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(inside(v.co) for v in f.verts)], context='FACES')
bm.to_mesh(body.data); bm.free()

# ── Rodion's T-shirt print: a door open onto a starry night, stairs going up to it, clouds ─────────────
if WHO == 'rodion':
    import numpy as np
    W = 512; img = bpy.data.images.new('print', W, W, alpha=True); px = np.zeros((W, W, 4), np.float32)
    yy, xx = np.mgrid[0:W, 0:W] / W
    rng = np.random.default_rng(3)
    cloud = np.zeros((W, W))
    for _ in range(70):
        cx, cy, r = rng.uniform(.1, .9), rng.uniform(.1, .55), rng.uniform(.04, .11)
        cloud += np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (r * r))
    grain = rng.random((W, W))
    cloud /= cloud.max(); a = ((cloud > .28) & (grain < np.clip((cloud - .28) * 1.3, 0, .55))).astype(np.float32) * .95
    door = ((np.abs(xx - .55) < .09) & (yy > .45) & (yy < .9)); inner = ((np.abs(xx - .55) < .075) & (yy > .47) & (yy < .88))
    a[door & ~inner] = 1; a[inner] = 0
    stars = rng.random((W, W)) > .9985; a[inner & stars] = 1
    for i in range(12):
        y0 = .45 - i * .028; x0 = .5 - i * .012
        a[(yy > y0 - .006) & (yy < y0) & (xx > x0 - .06) & (xx < x0 + .1)] = 1
    px[..., :3] = .92; px[..., 3] = a
    img.pixels.foreach_set(px.ravel()); img.pack()
    bpy.ops.mesh.primitive_plane_add(size=1); dec = bpy.context.active_object; dec.name = 'Print'
    dec.scale = (.26 * H / 1.8, .26 * H / 1.8, 1); dec.rotation_euler = (math.pi / 2, 0, 0)
    chestZ = .69 * H; dec.location = (0, min(v.co.y for v in shirt.data.vertices if abs(v.co.z - chestZ) < .01 and abs(v.co.x) < .03) - .004, chestZ)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    sub = dec.modifiers.new('sub', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'; sub.levels = 4
    sw = dec.modifiers.new('wrap', 'SHRINKWRAP'); sw.target = shirt; sw.offset = .0015; sw.wrap_mode = 'OUTSIDE_SURFACE'
    for mod in [sub, sw]:
        with bpy.context.temp_override(object=dec): bpy.ops.object.modifier_apply(modifier=mod.name)
    mat = bpy.data.materials.new('Print'); mat.use_nodes = True; nt = mat.node_tree; p = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; nt.links.new(t.outputs['Color'], p.inputs['Base Color']); nt.links.new(t.outputs['Alpha'], p.inputs['Alpha'])
    p.inputs['Roughness'].default_value = .9
    dec.data.materials.append(mat)
    accessories_print = dec
else:
    accessories_print = None

# ── Hair ────────────────────────────────────────────────────────────────────────────────────────────────
hair_mat = bpy.data.materials.new('Hair'); hair_mat.use_nodes = True
hp = hair_mat.node_tree.nodes['Principled BSDF']; hp.inputs['Base Color'].default_value = (*srgb(CFG['hair']), 1); hp.inputs['Roughness'].default_value = .42
headTop = max(v.co.z for v in V)
headC = Vector((0, eyeC.y + .09 * H / 1.8, eyeC.z + .02 * H / 1.8))
def scalp(c, reach):
    r = c - headC
    if c.z < eyeC.z - .1 * H / 1.8: return False
    if r.y < -.035 * H / 1.8 and r.z < reach: return False                                  # the face: hair starts at the hairline
    if abs(r.x) > .06 * H / 1.8 and -.07 * H / 1.8 < r.z < -.005 * H / 1.8 and -.035 < r.y < .025: return False   # ears
    return r.z > -.075 * H / 1.8 or (r.y > .03 and c.z > eyeC.z - .1 * H / 1.8)
cap = shell('HairCap', lambda c: scalp(c, (.056 if WHO == 'lida' else .042) * H / 1.8), .0022 if WHO == 'lida' else .007, CFG['hair'], solid=.003, rough=.45)
strands = []
def tube(points, radius, taper=True, name='strand'):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = 1; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(points) - 1)
    for i, p in enumerate(points):
        sp.points[i].co = (*p, 1); sp.points[i].radius = (1 - .85 * i / (len(points) - 1)) if taper else 1
    o = bpy.data.objects.new(name, cu); sc.collection.objects.link(o); strands.append(o); return o

# Hair cards: flat locks textured with a sheet of fine strands (alpha), laid along the scalp the way the hair
# flows and lifted off it for volume. The way games draw hair: far fewer triangles than strands, and it reads as hair.
import numpy as np
from mathutils.bvhtree import BVHTree
TW, TH = 256, 1024
tex = np.zeros((TH, TW, 4), np.float32); rng = np.random.default_rng(5)
vv = np.arange(TH) / TH; idx = np.arange(TH)
for _ in range(900):
    x0 = rng.uniform(0, TW); w = rng.uniform(.6, 1.8); wob = rng.uniform(0, 6); fq = rng.uniform(1, 4); end_ = rng.uniform(.72, 1.0); tone = rng.uniform(.62, 1.0)
    xs = x0 + wob * np.sin(vv * fq * 6.28 + rng.uniform(0, 6))
    for dx in range(-2, 3):
        xi = (np.round(xs).astype(int) + dx) % TW
        a = np.clip(w - abs(dx), 0, 1) * np.clip((end_ - vv) / .12, 0, 1) * np.clip(vv / .03, 0, 1)
        tex[idx, xi, 3] = np.maximum(tex[idx, xi, 3], a)
        tex[idx, xi, :3] = np.maximum(tex[idx, xi, :3], tone)
tex[..., :3] = np.where(tex[..., 3:4] > 0, tex[..., :3], .8) * np.array(srgb(CFG['hair']), np.float32) * 1.6   # the hair's colour, baked in
himg = bpy.data.images.new('hair_strands', TW, TH, alpha=True); himg.pixels.foreach_set(np.flipud(tex).ravel()); himg.pack()
nt = hair_mat.node_tree; hpb = nt.nodes['Principled BSDF']
ht = nt.nodes.new('ShaderNodeTexImage'); ht.image = himg
nt.links.new(ht.outputs['Color'], hpb.inputs['Base Color']); nt.links.new(ht.outputs['Alpha'], hpb.inputs['Alpha'])
cap_mat = bpy.data.materials.new('HairCap'); cap_mat.use_nodes = True
cap_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*[c * (1.25 if WHO == 'lida' else .7) for c in srgb(CFG['hair'])], 1); cap_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .6
cap.data.materials.clear(); cap.data.materials.append(cap_mat)

bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
def on_scalp(p, lift):
    d = (p - headC).normalized(); hit = bvh.ray_cast(headC + d * .4, -d)
    return (hit[0] if hit[0] else p) + d * lift
cards = bmesh.new(); uvl = cards.loops.layers.uv.new('UVMap')
def card(points, width):
    n = len(points); u0 = random.random() * .5
    rows = []
    for i, p in enumerate(points):
        t = (points[min(i + 1, n - 1)] - points[max(i - 1, 0)]).normalized()
        radial = (p - headC).normalized()
        side = t.cross(radial).normalized(); w = width * (1 - .55 * (i / (n - 1)) ** 2)
        rows.append((cards.verts.new(p - side * w / 2), cards.verts.new(p + side * w / 2)))
    for i in range(n - 1):
        f = cards.faces.new((rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0]))
        for loop, (u, v) in zip(f.loops, ((u0, i / (n - 1)), (u0 + .5, i / (n - 1)), (u0 + .5, (i + 1) / (n - 1)), (u0, (i + 1) / (n - 1)))): loop[uvl].uv = (u, v)
capVerts = [cap.matrix_world @ v.co for v in cap.data.vertices]
crown = Vector((0, headC.y + .035 * H / 1.8, headTop))
if WHO == 'rodion':
    # Wavy, messy locks from the crown outwards: forward over the forehead, down the sides and the back.
    for count, lift0, lift1 in ((260, .004, .012), (240, .012, .026), (160, .022, .038)):
        for _ in range(count // (2 if MOBILE else 1)):
            base = random.choice(capVerts); p = on_scalp(base, lift0)
            flow = (p - crown); flow.z *= .35
            if (p - headC).y < -.02: flow += Vector((0, -.6, -.2))                     # the fringe falls forward
            flow = flow.normalized()
            front_ = (p - headC).y < -.02
            back_ = (p - headC).y > .03 and p.z < eyeC.z + .02
            length = (random.uniform(.035, .06) if front_ else random.uniform(.03, .05) if back_ else random.uniform(.05, .09)) * H / 1.8; n = 8; pts = []
            phase, freq, amp = random.uniform(0, 6.28), random.uniform(2.2, 3.6), random.uniform(.005, .011)
            q = p.copy()
            for j in range(n):
                t = j / (n - 1); radial = (q - headC).normalized()
                tang = (flow - radial * flow.dot(radial)).normalized(); side = tang.cross(radial)
                surf = on_scalp(q, 0)
                if j > 1 and (not scalp(surf, (.01 if front_ else .03) * H / 1.8) or surf.z < eyeC.z - .05 * H / 1.8): break  # hair stops at the hairline; the fringe falls a little onto the brow
                pts.append(on_scalp(q, lift0 + (lift1 - lift0) * t) + side * math.sin(phase + t * freq * 6.28) * amp)
                q = q + tang * (length / (n - 1)); flow = (flow + Vector((0, 0, -.07))).normalized()
            if len(pts) >= 3: card(pts, random.uniform(.016, .026))
else:
    # Drawn back sleek from a centre parting to a low ponytail.
    tie = Vector((0, headC.y + .092 * H / 1.8, eyeC.z - .058 * H / 1.8))
    for _ in range(300 // (2 if MOBILE else 1)):
        base = random.choice(capVerts)
        if (base - tie).length < .035: continue
        p = on_scalp(base, .006); n = 10; pts = []
        d0, d1 = (p - headC).normalized(), (tie - headC).normalized()
        for j in range(n):
            # Over the curve of the head (a great circle), not through it.
            t = j / (n - 1); up = Vector((0, .35, 1)).normalized()
            d = (d0.slerp(up, t * 2) if t < .5 else up.slerp(d1, t * 2 - 1)) if d0.y < .3 else d0.slerp(d1, t)   # over the crown
            pts.append(on_scalp(headC + d * .05, .006 + .004 * t) if t < .93 else tie)
        card(pts, random.uniform(.014, .02))
    for i in range(70 // (2 if MOBILE else 1)):
        # The tail: cards around its axis, falling to the shoulder blades, fuller in the middle.
        ang = random.uniform(0, 6.28); r0 = .008; length = random.uniform(.25, .32) * H / 1.55; n = 9; pts = []
        for j in range(n):
            t = j / (n - 1); r = r0 + .014 * math.sin(t * math.pi) + .004
            pts.append(tie + Vector((math.cos(ang) * r, .02 * t + math.sin(ang) * r * .6 + .015 * math.sin(t * 2.2), -length * t)))
        card(pts, random.uniform(.012, .018))
    bpy.ops.mesh.primitive_torus_add(major_radius=.021, minor_radius=.0085, location=tie, rotation=(math.pi / 2 - .35, 0, 0))
    scr = bpy.context.active_object; scr.name = 'Scrunchie'
    m = bpy.data.materials.new('Scrunchie'); m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .7; scr.data.materials.append(m)
    paint(scr, lambda p: (.85, .83, .8) if random.random() > .28 else (.02, .02, .02))
hair_me = bpy.data.meshes.new('Hair'); cards.to_mesh(hair_me); cards.free()
hair = bpy.data.objects.new('Hair', hair_me); sc.collection.objects.link(hair); hair_me.materials.append(hair_mat)
# Eyebrows: fine hairs along an arc over each eye.
for s, c in ((1, eyeL), (-1, eyeR)):
    for j in range(44):
        t = random.random(); x = c.x + s * (-.018 + .04 * t) * H / 1.8
        z = c.z + (.024 + .006 * math.sin(t * math.pi) - .004 * t + random.uniform(-.002, .002)) * H / 1.8
        y = front(z, x) - .001
        a = Vector((x, y, z)); b = a + Vector((s * .007, -.0015, .0015 + .002 * (1 - t)))
        tube([a, (a + b) / 2, b], CFG['brows'] * .28 * (1.2 - .5 * t), taper=True, name='brow')
bpy.ops.object.select_all(action='DESELECT')
for o in strands: o.select_set(True)
bpy.context.view_layer.objects.active = strands[0]; bpy.ops.object.convert(target='MESH'); bpy.ops.object.join()
brows = bpy.context.active_object; brows.name = 'Brows'
brow_mat = bpy.data.materials.new('Brows'); brow_mat.use_nodes = True; brow_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*[c * .8 for c in srgb(CFG['hair'])], 1)
brows.data.materials.clear(); brows.data.materials.append(brow_mat)
strands = []

# ── Glasses ─────────────────────────────────────────────────────────────────────────────────────────────
frame_mat = bpy.data.materials.new('Frame'); frame_mat.use_nodes = True
fp = frame_mat.node_tree.nodes['Principled BSDF']
if WHO == 'rodion': fp.inputs['Base Color'].default_value = (*srgb((.42, .42, .44)), 1); fp.inputs['Metallic'].default_value = 1; fp.inputs['Roughness'].default_value = .3
else: fp.inputs['Base Color'].default_value = (.01, .01, .012, 1); fp.inputs['Roughness'].default_value = .2
lens_mat = bpy.data.materials.new('Lens'); lens_mat.use_nodes = True
lp = lens_mat.node_tree.nodes['Principled BSDF']; lp.inputs['Base Color'].default_value = (.9, .95, 1, 1); lp.inputs['Alpha'].default_value = .12; lp.inputs['Roughness'].default_value = .02
parts = []
lensZ = eyeC.z + .002
lensY = min(eyeL.y, eyeR.y) - eyeRadius - .012 * H / 1.8
wire = .0011 if WHO == 'rodion' else .0026
for s, c in ((1, eyeL), (-1, eyeR)):
    # Round thin wire for him; a rounded rectangle with lifted outer corners for her.
    rx, rz = (.024, .022) if WHO == 'rodion' else (.025, .019)
    ring = []
    for j in range(49):
        a = j / 48 * math.tau
        if WHO == 'rodion': dx, dz = math.cos(a) * rx, math.sin(a) * rz
        else:
            e = 2.0 / 2.6; dx = math.copysign(abs(math.cos(a)) ** e, math.cos(a)) * rx; dz = math.copysign(abs(math.sin(a)) ** e, math.sin(a)) * rz
            if dx * s > 0 and dz > 0: dz += .004 * (dx * s / rx)
        ring.append(Vector((c.x + dx * H / 1.8, lensY, lensZ + dz * H / 1.8)))
    parts.append(tube(ring, wire, taper=False, name='rim'))
    ear = Vector((s * .072 * H / 1.8, headC.y + .01, lensZ + .004))
    hinge = Vector((c.x + s * rx * H / 1.8, lensY + .004, lensZ + .004))
    parts.append(tube([hinge, hinge.lerp(ear, .5), ear, ear + Vector((0, .012, -.012))], wire * .8, taper=False, name='temple'))
    bpy.ops.mesh.primitive_circle_add(vertices=40, radius=1, fill_type='NGON', location=(c.x, lensY + .0005, lensZ))
    lens = bpy.context.active_object; lens.scale = (rx * H / 1.8, rz * H / 1.8, 1); lens.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); lens.data.materials.append(lens_mat); lens.name = 'Lens'
    lens_objs = locals().setdefault('lens_objs', []); lens_objs.append(lens)
parts.append(tube([Vector((eyeR.x + .02 * H / 1.8, lensY, lensZ + .004)), Vector((0, lensY - .003, lensZ + .008)), Vector((eyeL.x - .02 * H / 1.8, lensY, lensZ + .004))], wire, taper=False, name='bridge'))
bpy.ops.object.select_all(action='DESELECT')
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.convert(target='MESH'); bpy.ops.object.join()
glasses = bpy.context.active_object; glasses.name = 'Glasses'; glasses.data.materials.clear(); glasses.data.materials.append(frame_mat)
bpy.ops.object.select_all(action='DESELECT')
for o in lens_objs: o.select_set(True)
bpy.context.view_layer.objects.active = lens_objs[0]; bpy.ops.object.join(); lenses = bpy.context.active_object; lenses.name = 'Lenses'

# ── Materials, rigid parts to the head, everything under the rig ────────────────────────────────────────
skin_mat = bpy.data.materials.new('Skin'); skin_mat.use_nodes = True
nt = skin_mat.node_tree; sp_ = nt.nodes['Principled BSDF']; sp_.inputs['Roughness'].default_value = .5
vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'; nt.links.new(vc.outputs['Color'], sp_.inputs['Base Color'])
body.data.materials.clear(); body.data.materials.append(skin_mat)
eye_mat = bpy.data.materials.new('Eye'); eye_mat.use_nodes = True
en = eye_mat.node_tree; ep = en.nodes['Principled BSDF']; ep.inputs['Roughness'].default_value = .05
evc = en.nodes.new('ShaderNodeVertexColor'); evc.layer_name = 'Col'; en.links.new(evc.outputs['Color'], ep.inputs['Base Color'])
for e in eyes: e.data.materials.clear(); e.data.materials.append(eye_mat)
if WHO == 'lida':
    sm = bpy.data.materials['Scrunchie']; sn = sm.node_tree; svc = sn.nodes.new('ShaderNodeVertexColor'); svc.layer_name = 'Col'; sn.links.new(svc.outputs['Color'], sn.nodes['Principled BSDF'].inputs['Base Color'])
rigid = [cap, hair, brows, glasses, lenses, *eyes] + ([bpy.data.objects['Scrunchie']] if WHO == 'lida' else [])
for o in rigid:
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    for m in list(o.modifiers): o.modifiers.remove(m)
    g = o.vertex_groups.new(name='Head'); g.add(range(len(o.data.vertices)), 1.0, 'REPLACE')
if accessories_print:
    # The print moves with the chest.
    g = accessories_print.vertex_groups.new(name='Chest'); g.add(range(len(accessories_print.data.vertices)), 1.0, 'REPLACE')
    rigid.append(accessories_print)
for o in [body, shirt, pants, shoes, *rigid]:
    o.parent = rig; o.matrix_parent_inverse.identity()
    if not any(m.type == 'ARMATURE' for m in o.modifiers):
        m = o.modifiers.new('rig', 'ARMATURE'); m.object = rig
    else:
        # Clothes copied from the body keep its armature modifier; point it at the rig.
        for m in o.modifiers:
            if m.type == 'ARMATURE': m.object = rig
    for p in o.data.polygons: p.use_smooth = True

# Weight budget: four influences per vertex, normalised, as the web wants them.
for o in [body, shirt, pants]:
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4); bpy.ops.object.vertex_group_normalize_all(lock_active=False)

# A web budget for the body.
tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
target = 16000 if MOBILE else 42000
if tris > target:
    m = body.modifiers.new('reduce', 'DECIMATE'); m.ratio = target / tris
    body.modifiers.move(len(body.modifiers) - 1, 0)
    with bpy.context.temp_override(object=body): bpy.ops.object.modifier_apply(modifier=m.name)

os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True)
for o in rig.children: o.select_set(True)
out = os.path.join(OUT, WHO + ('.mobile' if MOBILE else '') + '.glb')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_skins=True,
                          export_animations=False, export_vertex_color='ACTIVE', export_all_vertex_colors=True, export_image_format='WEBP',
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_draco_position_quantization=14,
                          export_draco_normal_quantization=10, export_draco_texcoord_quantization=12, export_draco_color_quantization=10)
print('WROTE', out, os.path.getsize(out), 'tris', sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in rig.children))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, WHO + '.blend')) if not MOBILE else None
