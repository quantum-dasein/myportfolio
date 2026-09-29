# Boullée's Cenotaph for Newton (1784), built for the 404 fly-in.
# Run: blender -b -P build.py -- out=cenotaph.blend
# World units are metres, Z up. Sphere Ø150 m on two planted drums, entered through a tunnel.
import bpy, bmesh, math, json, sys, random
from mathutils import Vector, Matrix, noise

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ARGS = dict(a.split('=', 1) for a in argv if '=' in a)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
R, SHELL = 75.0, 1.2
CZ = 60.0                      # sphere centre height; the arena floor is at z = 0
ARENA = 36.0
RIN = R - SHELL
D1, H1 = 112.0, 18.0           # lower drum radius / height
D2, H2 = 94.0, 14.0            # upper drum
FIG = Vector((3.2, -16.0, 0.0))  # the visitor stands in the sunbeam
HOLE = Vector((0, 0, CZ)) + Vector((-.78, .12, .62)).normalized() * (RIN - .05)
rnd = random.Random(7)


def link(o):
    sc.collection.objects.link(o)
    return o


def obj_from_bm(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me))


def smooth(o, on=True):
    for p in o.data.polygons:
        p.use_smooth = on


# ---------------------------------------------------------------- materials
class NT:
    def __init__(s, name):
        s.mat = bpy.data.materials.new(name)
        s.mat.use_nodes = True
        s.t = s.mat.node_tree
        s.t.nodes.clear()

    def n(s, typ, inputs=None, **props):
        nd = s.t.nodes.new(typ)
        for k, v in props.items():
            setattr(nd, k, v)
        for k, v in (inputs or {}).items():
            s.set(s.inp(nd, k), v)
        return nd

    @staticmethod
    def inp(nd, k):
        if isinstance(k, int):
            return nd.inputs[k]
        for i in nd.inputs:
            if i.identifier == k:
                return i
        return nd.inputs[k]

    def set(s, sock, v):
        if isinstance(v, bpy.types.NodeSocket):
            s.t.links.new(v, sock)
        elif isinstance(v, bpy.types.Node):
            s.t.links.new(v.outputs[0], sock)
        else:
            sock.default_value = v

    def m(s, op, a, b=0.0, c=None):
        nd = s.n('ShaderNodeMath', operation=op)
        s.set(nd.inputs[0], a)
        s.set(nd.inputs[1], b)
        if c is not None:
            s.set(nd.inputs[2], c)
        return nd.outputs[0]

    def v(s, op, a, b=None, scale=None):
        nd = s.n('ShaderNodeVectorMath', operation=op)
        s.set(nd.inputs[0], a)
        if b is not None:
            s.set(nd.inputs[1], b)
        if scale is not None:
            s.set(nd.inputs[3], scale)
        return nd.outputs['Value'] if op in ('LENGTH', 'DOT_PRODUCT', 'DISTANCE') else nd.outputs['Vector']

    def mr(s, x, a, b, c=0.0, d=1.0):
        nd = s.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP')
        s.set(nd.inputs[0], x)
        for i, val in enumerate((a, b, c, d)):
            nd.inputs[i + 1].default_value = val
        return nd.outputs[0]

    def xyz(s, vec):
        nd = s.n('ShaderNodeSeparateXYZ')
        s.set(nd.inputs[0], vec)
        return nd.outputs['X'], nd.outputs['Y'], nd.outputs['Z']

    def comb(s, x, y, z=0.0):
        nd = s.n('ShaderNodeCombineXYZ')
        for i, val in enumerate((x, y, z)):
            s.set(nd.inputs[i], val)
        return nd.outputs[0]

    def coords(s, kind='Object'):
        return s.n('ShaderNodeTexCoord').outputs[kind]

    def out(s, bsdf):
        o = s.n('ShaderNodeOutputMaterial')
        s.set(o.inputs['Surface'], bsdf)
        return s.mat


def masonry(t, U, V, course, block):
    row = t.m('FLOOR', t.m('DIVIDE', V, course))
    fv = t.m('FRACT', t.m('DIVIDE', V, course))
    uu = t.m('ADD', t.m('DIVIDE', U, block), t.m('MULTIPLY', row, .5))
    fu = t.m('FRACT', uu)
    gv = t.m('MULTIPLY', t.m('MINIMUM', fv, t.m('SUBTRACT', 1.0, fv)), course)
    gu = t.m('MULTIPLY', t.m('MINIMUM', fu, t.m('SUBTRACT', 1.0, fu)), block)
    groove = t.mr(t.m('MINIMUM', gu, gv), .012, .05, 1.0, 0.0)
    cell = t.n('ShaderNodeTexWhiteNoise', noise_dimensions='3D')
    t.set(cell.inputs['Vector'], t.comb(t.m('FLOOR', uu), row, 3.7))
    return groove, cell.outputs['Value']


def stone(t, groove, cellr, pos, base, rough=.8, dark=1.0, extra_emit=None):
    stain = t.n('ShaderNodeTexNoise', noise_dimensions='3D', inputs={'Scale': .06, 'Detail': 8.0, 'Roughness': .62})
    t.set(stain.inputs['Vector'], t.v('MULTIPLY', pos, (1.0, 1.0, .25)))
    grain = t.n('ShaderNodeTexNoise', noise_dimensions='3D', inputs={'Scale': 3.5, 'Detail': 10.0, 'Roughness': .7})
    t.set(grain.inputs['Vector'], pos)
    k = t.m('MULTIPLY', t.m('ADD', .8, t.m('MULTIPLY', cellr, .32)), t.mr(stain.outputs['Fac'], .3, .72, .8, 1.04))
    k = t.m('MULTIPLY', k, t.m('SUBTRACT', 1.0, t.m('MULTIPLY', groove, .62)))
    k = t.m('MULTIPLY', k, t.m('ADD', .88, t.m('MULTIPLY', grain.outputs['Fac'], .24)))
    streak = t.n('ShaderNodeTexNoise', noise_dimensions='3D', inputs={'Scale': .9, 'Detail': 6.0, 'Roughness': .55})
    t.set(streak.inputs['Vector'], t.v('MULTIPLY', pos, (1.0, 1.0, .04)))
    k = t.m('MULTIPLY', k, t.mr(streak.outputs['Fac'], .5, .72, 1.0, .72))
    wz = t.xyz(t.n('ShaderNodeNewGeometry').outputs['Position'])[2]
    k = t.m('MULTIPLY', k, t.mr(wz, .0, 3.5, .5, 1.0))
    col = t.v('SCALE', tuple(c * dark for c in base), scale=k)
    bump = t.n('ShaderNodeBump', inputs={'Strength': .55, 'Distance': .04})
    t.set(bump.inputs['Height'], t.m('ADD', t.m('MULTIPLY', groove, -1.0), t.m('MULTIPLY', grain.outputs['Fac'], .25)))
    b = t.n('ShaderNodeBsdfPrincipled', inputs={'Roughness': rough})
    t.set(b.inputs['Base Color'], col)
    t.set(b.inputs['Normal'], bump)
    if extra_emit is not None:
        colr, strength = extra_emit
        b.inputs['Emission Color'].default_value = colr
        t.set(b.inputs['Emission Strength'], strength)
    return b


LIME = (.74, .67, .56)


def mat_sphere():
    t = NT('SphereStone')
    P = t.coords()
    x, y, z = t.xyz(P)
    L = t.v('LENGTH', P)
    lat = t.m('ARCSINE', t.m('DIVIDE', z, L))
    lon = t.m('ARCTAN2', y, x)
    V = t.m('MULTIPLY', lat, R)
    U = t.m('MULTIPLY', t.m('MULTIPLY', lon, R), t.m('COSINE', lat))
    groove, cellr = masonry(t, U, V, 1.5, 3.1)
    # The vault is pierced: daylight through thousands of small funnels reads as stars.
    nrm = t.v('NORMALIZE', P)
    nx, ny, nz = t.xyz(nrm)
    band = t.m('EXPONENT', t.m('DIVIDE', t.m('MULTIPLY', t.m('POWER', t.v('DOT_PRODUCT', nrm, (.35, .82, .3)), 2.0), -1.0), .03))
    inside = t.m('LESS_THAN', L, R - .6)
    upper = t.mr(nz, -.45, -.12)
    emit = 0.0
    for scale, thr, gain, pw in ((95.0, .75, 1.0, 6.0), (230.0, .83, .3, 8.0)):
        vor = t.n('ShaderNodeTexVoronoi', feature='F1', voronoi_dimensions='3D', inputs={'Scale': scale, 'Randomness': .95})
        t.set(vor.inputs['Vector'], nrm)
        cr, cg, cb = t.xyz(vor.outputs['Color'])
        radius = t.m('ADD', .035, t.m('MULTIPLY', t.m('POWER', cr, 4.0), .09))
        hole = t.mr(vor.outputs['Distance'], t.m('MULTIPLY', radius, .55), radius, 1.0, 0.0) if False else None
        d = vor.outputs['Distance']
        hole = t.m('LESS_THAN', d, radius)
        pick = t.m('GREATER_THAN', cg, t.m('SUBTRACT', thr, t.m('MULTIPLY', band, .22)))
        bright = t.m('ADD', .12, t.m('MULTIPLY', t.m('POWER', cb, pw), 3.0))
        layer = t.m('MULTIPLY', t.m('MULTIPLY', hole, pick), t.m('MULTIPLY', bright, gain))
        emit = layer if emit == 0.0 else t.m('ADD', emit, layer)
    strength = t.m('MULTIPLY', t.m('MULTIPLY', emit, t.m('MULTIPLY', inside, upper)), float(ARGS.get('stars', 260)))
    b = stone(t, groove, cellr, P, LIME, extra_emit=((1.0, .9, .78, 1.0), strength))
    try:
        t.mat.cycles.emission_sampling = 'NONE'
    except Exception as e:
        print('emission_sampling', e)
    return t.out(b)


def mat_drum():
    t = NT('DrumStone')
    P = t.coords()
    x, y, z = t.xyz(P)
    r = t.v('LENGTH', t.comb(x, y, 0.0))
    U = t.m('MULTIPLY', t.m('ARCTAN2', y, x), r)
    groove, cellr = masonry(t, U, z, 1.2, 2.6)
    return t.out(stone(t, groove, cellr, P, (.7, .63, .53)))


def mat_paving(name='Paving', base=(.46, .43, .38), rough=.7, slab=2.2):
    t = NT(name)
    P = t.coords()
    x, y, z = t.xyz(P)
    groove, cellr = masonry(t, x, y, slab, slab)
    return t.out(stone(t, groove, cellr, P, base, rough=rough))


def mat_simple(name, col, rough=.8, emit=None):
    t = NT(name)
    b = t.n('ShaderNodeBsdfPrincipled', inputs={'Base Color': (*col, 1.0), 'Roughness': rough})
    if emit:
        b.inputs['Emission Color'].default_value = (*emit[0], 1.0)
        b.inputs['Emission Strength'].default_value = emit[1]
    return t.out(b)


def mat_grass():
    t = NT('Grass')
    P = t.coords('Generated') if False else t.n('ShaderNodeNewGeometry').outputs['Position']
    n1 = t.n('ShaderNodeTexNoise', noise_dimensions='3D', inputs={'Scale': .02, 'Detail': 8.0})
    t.set(n1.inputs['Vector'], P)
    n2 = t.n('ShaderNodeTexNoise', noise_dimensions='3D', inputs={'Scale': 1.3, 'Detail': 6.0})
    t.set(n2.inputs['Vector'], P)
    mix = t.n('ShaderNodeMix', data_type='RGBA')
    t.set(NT.inp(mix, 'Factor_Float'), t.m('MULTIPLY', n1.outputs['Fac'], n2.outputs['Fac']))
    NT.inp(mix, 'A_Color').default_value = (.03, .036, .016, 1)
    NT.inp(mix, 'B_Color').default_value = (.1, .082, .05, 1)
    bump = t.n('ShaderNodeBump', inputs={'Strength': .4, 'Distance': .1})
    t.set(bump.inputs['Height'], n2.outputs['Fac'])
    b = t.n('ShaderNodeBsdfPrincipled', inputs={'Roughness': .95})
    t.set(b.inputs['Base Color'], NT.inp(mix, 'Result_Color') if False else mix.outputs[2])
    t.set(b.inputs['Normal'], bump)
    return t.out(b)


def mat_cypress():
    t = NT('Cypress')
    P = t.coords()
    n1 = t.n('ShaderNodeTexNoise', noise_dimensions='3D', inputs={'Scale': 2.2, 'Detail': 12.0, 'Roughness': .7})
    t.set(n1.inputs['Vector'], P)
    k = t.mr(n1.outputs['Fac'], .3, .75, .55, 1.25)
    col = t.v('SCALE', (.022, .045, .026), scale=k)
    bump = t.n('ShaderNodeBump', inputs={'Strength': 1.0, 'Distance': .25})
    t.set(bump.inputs['Height'], n1.outputs['Fac'])
    b = t.n('ShaderNodeBsdfPrincipled', inputs={'Roughness': .9, 'Subsurface Weight': .08})
    t.set(b.inputs['Base Color'], col)
    t.set(b.inputs['Normal'], bump)
    return t.out(b)


M_SPHERE, M_DRUM, M_PAVE, M_GRASS, M_CYP = mat_sphere(), mat_drum(), mat_paving(), mat_grass(), mat_cypress()
M_TERRACE = mat_paving('Terrace', (.42, .4, .34), .85, 1.6)
M_DARK = mat_paving('Basalt', (.1, .095, .09), .35, .8)
M_SUIT = mat_simple('Suit', (.82, .83, .84), .55)
M_VISOR = mat_simple('Visor', (.9, .62, .25), .12)
M_LAMP = mat_simple('Lamp', (1, .8, .6), .5, ((1, .72, .45), 22.0))
M_SUNHOLE = mat_simple('SunHole', (1, 1, 1), .5, ((1, .93, .82), 900.0))


# ---------------------------------------------------------------- geometry
def cylinder(name, r, z0, z1, segs=256, mat=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=z1 - z0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, (z0 + z1) / 2))
    o = obj_from_bm(name, bm)
    if mat:
        o.data.materials.append(mat)
    return o


def annulus(name, r0, r1, z0, z1, segs=256, mat=None):
    bm = bmesh.new()
    rings = []
    for z in (z0, z1):
        for r in (r0, r1):
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), z)) for i in range(segs)])
    b_in, b_out, t_in, t_out = rings
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new((b_out[i], b_out[j], t_out[j], t_out[i]))
        bm.faces.new((b_in[j], b_in[i], t_in[i], t_in[j]))
        bm.faces.new((t_in[i], t_out[i], t_out[j], t_in[j]))
        bm.faces.new((b_in[j], b_out[j], b_out[i], b_in[i]))
    o = obj_from_bm(name, bm)
    if mat:
        o.data.materials.append(mat)
    return o


def arch_prism(name, width, spring, y0, y1, z0=.002, segs=24):
    """Round-arched tunnel section extruded along Y, used as a boolean cutter."""
    hw = width / 2
    prof = [(-hw, z0), (hw, z0), (hw, spring)]
    for i in range(1, segs):
        a = math.pi * i / segs
        prof.append((hw * math.cos(a), spring + hw * math.sin(a)))
    prof.append((-hw, spring))
    bm = bmesh.new()
    front = [bm.verts.new((x, y0, z)) for x, z in prof]
    back = [bm.verts.new((x, y1, z)) for x, z in prof]
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    n = len(prof)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[j], front[i], back[i], back[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm)


def boolean(target, cutter, op='DIFFERENCE'):
    md = target.modifiers.new('b', 'BOOLEAN')
    md.object = cutter
    md.operation = op
    md.solver = 'EXACT'
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=md.name)


def by_normal(o, up_mat, side_mat, floor_mat=None, floor_z=1.0):
    o.data.materials.clear()
    for m in (side_mat, up_mat, floor_mat or up_mat):
        o.data.materials.append(m)
    mw = o.matrix_world
    for p in o.data.polygons:
        c = mw @ p.center
        if p.normal.z > .7:
            p.material_index = 2 if c.z < floor_z else 1
        else:
            p.material_index = 0


# Sphere shell: a solid 1.2 m thick so booleans stay clean.
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=320, v_segments=160, radius=R)
sphere = obj_from_bm('Sphere', bm)
sphere.location = (0, 0, CZ)
sphere.data.materials.append(M_SPHERE)
smooth(sphere)
sol = sphere.modifiers.new('s', 'SOLIDIFY')
sol.thickness = SHELL
sol.offset = -1
bpy.context.view_layer.objects.active = sphere
bpy.ops.object.modifier_apply(modifier=sol.name)

# The void the drums and steps must not fill.
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=160, v_segments=80, radius=R - .5)
void = obj_from_bm('Void', bm)
void.location = (0, 0, CZ)

tunnel = arch_prism('Tunnel', 7.0, 6.0, -ARENA + 6, -140.0)
portal = [arch_prism('Portal%d' % i, 7.0 + 2.2 * i, 6.0 + 1.1 * i, -D1 + 1.6 * i - 1.8, -D1 - 3.0) for i in (1, 2, 3)]

lower = cylinder('LowerDrum', D1, 0, H1, 384)
upper = cylinder('UpperDrum', D2, H1, H1 + H2, 384)
for d in (lower, upper):
    boolean(d, void)
    boolean(d, tunnel)
for p in portal:
    boolean(lower, p)
by_normal(lower, M_TERRACE, M_DRUM, M_PAVE)
by_normal(upper, M_TERRACE, M_DRUM)
boolean(sphere, tunnel)

# Cornices and plinths, the only ornament Boullée allowed himself.
for name, r0, r1, z0, z1 in (('Cornice1', D1 - 1, D1 + 1.6, H1 - 1.1, H1 - .2), ('Cornice1b', D1 - 1, D1 + 2.3, H1 - .2, H1 + .15),
                             ('Plinth1', D1 - 1, D1 + 1.2, 0, 1.4),
                             ('Cornice2', D2 - 1, D2 + 1.3, H1 + H2 - .9, H1 + H2 - .15), ('Cornice2b', D2 - 1, D2 + 1.9, H1 + H2 - .15, H1 + H2 + .15)):
    a = annulus(name, r0, r1, z0, z1, 384, M_DRUM)
    if name.startswith(('Plinth', 'Cornice1')):
        for p in portal:
            boolean(a, p)

# Inside: a flat arena and eight colossal steps climbing the bowl.
floor = cylinder('Arena', ARENA + .5, -2.0, 0.0, 192, M_PAVE)
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
bmesh.ops.scale(bm, vec=(7.0, 60.0, 16.0), verts=bm.verts)
bmesh.ops.translate(bm, vec=(0, -ARENA - 24.0, 8.002), verts=bm.verts)
slot = obj_from_bm('Slot', bm)
steps = []
for k in range(8):
    s = annulus('Step%d' % k, ARENA + 2.5 * k, 80.0, -2.0, 1.5 * (k + 1), 256, M_DRUM)
    boolean(s, slot)
    by_normal(s, M_TERRACE, M_DRUM, M_PAVE, .5)
    steps.append(s)

# Newton's tomb: three-step podium, a dark sarcophagus.
for k, (r, h) in enumerate(((11.0, .55), (9.2, 1.1), (7.6, 1.65))):
    cylinder('Podium%d' % k, r, 0, h, 192, M_TERRACE if k < 2 else M_PAVE)
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
bmesh.ops.scale(bm, vec=(2.2, 5.2, 1.7), verts=bm.verts)
bmesh.ops.translate(bm, vec=(0, 0, 1.65 + .85), verts=bm.verts)
sarc = obj_from_bm('Sarcophagus', bm)
sarc.data.materials.append(M_DARK)
bev = sarc.modifiers.new('bv', 'BEVEL')
bev.width = .05
bev.segments = 2
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
bmesh.ops.scale(bm, vec=(2.6, 5.6, .28), verts=bm.verts)
bmesh.ops.translate(bm, vec=(0, 0, 1.65 + 1.7 + .14), verts=bm.verts)
lid = obj_from_bm('Lid', bm)
lid.data.materials.append(M_DARK)

# Ground and the processional way to the portal.
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=2500)
ground = obj_from_bm('Ground', bm)
ground.location.z = -.03
ground.data.materials.append(M_GRASS)
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
bmesh.ops.scale(bm, vec=(16, 700, .3), verts=bm.verts)
bmesh.ops.translate(bm, vec=(0, -D1 - 350 + 2, -.13), verts=bm.verts)
way = obj_from_bm('Way', bm)
way.data.materials.append(M_PAVE)

# Two long reflecting basins flank the way, doubling the sphere at dusk.
M_WATER = mat_simple('Water', (.006, .008, .01), .025)
for sx in (-1, 1):
    x0, x1, y0, y1 = 13.0, 46.0, -D1 - 30, -D1 - 430
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5)
    bmesh.ops.scale(bm, vec=(x1 - x0, y0 - y1, 1), verts=bm.verts)
    w = obj_from_bm('Basin', bm)
    w.location = (sx * (x0 + x1) / 2, (y0 + y1) / 2, -.01)
    w.data.materials.append(M_WATER)
    for (cx, cy, wx, wy) in (((x0 + x1) / 2, y0, x1 - x0 + 1.2, .6), ((x0 + x1) / 2, y1, x1 - x0 + 1.2, .6), (x0, (y0 + y1) / 2, .6, y0 - y1), (x1, (y0 + y1) / 2, .6, y0 - y1)):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(wx, wy, .32), verts=bm.verts)
        rim = obj_from_bm('Rim', bm)
        rim.location = (sx * cx, cy, .1)
        rim.data.materials.append(M_TERRACE)

# Cypresses: a few spindles, displaced into clumps, repeated around the terraces.
def cypress_mesh(seed, H=19.0, W=2.3):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=36, v_segments=56, radius=1.0)
    for v in bm.verts:
        t = (v.co.z + 1) / 2
        prof = W * (math.sin(math.pi * min(1, t * 1.02)) ** .55) * (1 - .45 * t)
        xy = Vector((v.co.x, v.co.y))
        xy = xy.normalized() * prof if xy.length > 1e-6 else xy
        v.co = Vector((xy.x, xy.y, t * H))
    bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=1, use_grid_fill=True)
    off = Vector((seed * 13.1, seed * 7.7, 0))
    for v in bm.verts:
        r = Vector((v.co.x, v.co.y, 0))
        if r.length < 1e-4:
            continue
        n = noise.fractal(v.co * Vector((.7, .7, .45)) + off, .55, 2.0, 3)
        v.co += r.normalized() * n * .42
    me = bpy.data.meshes.new('Cypress%d' % seed)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(M_CYP)
    for p in me.polygons:
        p.use_smooth = True
    return me


CYP = [cypress_mesh(i, 17 + i * 1.3, 2.0 + .15 * i) for i in range(4)]


def ring(radius, z, spacing, gap=0.0, scale=1.0):
    n = int(2 * math.pi * radius / spacing)
    for i in range(n):
        a = 2 * math.pi * i / n + math.pi / 2  # start at the back
        pos = Vector((radius * math.cos(a), radius * math.sin(a), z))
        if gap and abs(math.atan2(pos.x, -pos.y)) < gap and pos.y < 0:
            continue
        o = link(bpy.data.objects.new('Tree', rnd.choice(CYP)))
        s = scale * (.85 + .3 * rnd.random())
        o.scale = (s, s, s * (.9 + .25 * rnd.random()))
        o.location = pos
        o.rotation_euler = (0, 0, rnd.random() * 6.28)


ring(D1 - 8, H1, 7.5)
ring(D2 - 10, H1 + H2, 7.5, scale=.95)
ring(D1 + 16, 0, 9.0, gap=.12, scale=1.1)

t = NT('Moon')
mn = t.n('ShaderNodeTexNoise', noise_dimensions='3D', inputs={'Scale': 2.2, 'Detail': 9.0, 'Roughness': .6})
t.set(mn.inputs['Vector'], t.coords())
lw = t.n('ShaderNodeLayerWeight', inputs={'Blend': .3})
k = t.m('MULTIPLY', t.mr(mn.outputs['Fac'], .38, .62, .55, 1.0), t.m('SUBTRACT', 1.0, t.m('MULTIPLY', lw.outputs['Fresnel'], .35)))
em = t.n('ShaderNodeEmission', inputs={'Color': (1.0, .93, .82, 1.0)})
t.set(em.inputs['Strength'], t.m('MULTIPLY', k, float(ARGS.get('moonk', 2.4))))
t.out(em)
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=70)
moon = obj_from_bm('Moon', bm)
smooth(moon)
moon.data.materials.append(t.mat)
md = Vector((math.sin(math.radians(24)) * math.cos(math.radians(15)), math.cos(math.radians(24)) * math.cos(math.radians(15)), math.sin(math.radians(15))))
moon.location = Vector((0, -500, 3)) + md * 3200
moon.visible_shadow = False
for attr in ('visible_diffuse', 'visible_glossy'):
    setattr(moon, attr, attr == 'visible_glossy')

# Low hills far off, so the horizon is land rather than the edge of a plane.
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=220, y_segments=220, size=3200)
for v in bm.verts:
    r = Vector((v.co.x, v.co.y)).length
    f = max(0.0, min(1.0, (r - 950) / 700))
    v.co.z = f * f * (18 + 70 * (noise.fractal(Vector((v.co.x, v.co.y, 0)) * .0012, .5, 2.0, 5) * .5 + .5)) - .05
hills = obj_from_bm('Hills', bm)
hills.data.materials.append(M_GRASS)
smooth(hills)

# The visitor: stand-in astronaut, replaced by the site's own suit if a GLB is supplied.
def astronaut():
    if ARGS.get('astro'):
        bpy.ops.import_scene.gltf(filepath=bpy.path.abspath(ARGS['astro']))
        parts = [o for o in bpy.context.selected_objects if o.type == 'MESH']
        bpy.context.view_layer.update()
        zs = [(o.matrix_world @ Vector(c)).z for o in parts for c in o.bound_box]
        lo, hi = min(zs), max(zs)
        root = link(bpy.data.objects.new('Astronaut', None))
        for o in bpy.context.selected_objects:
            if o.parent is None:
                o.parent = root
        k = 1.85 / (hi - lo)
        root.scale = (k, k, k)
        root.location = FIG - Vector((0, 0, lo * k))
        root.rotation_euler = (0, 0, math.radians(-18))
        return
    parts = []
    def cap(p, r, h):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=1)
        for v in bm.verts:
            v.co.x *= r; v.co.y *= r
            v.co.z = v.co.z * r + (h / 2 - r) * (1 if v.co.z > 0 else -1)
        o = obj_from_bm('A', bm); o.location = p; o.data.materials.append(M_SUIT); smooth(o); parts.append(o); return o
    cap((0, 0, 1.12), .24, .72)                       # torso
    for s in (-1, 1):
        cap((.11 * s, 0, .45), .085, .9)             # legs
        a = cap((.3 * s, 0, 1.12), .07, .62); a.rotation_euler = (0, .18 * s, 0)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=.19)
    h = obj_from_bm('Helmet', bm); h.location = (0, 0, 1.64); h.data.materials.append(M_SUIT); smooth(h); parts.append(h)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=.15)
    for v in bm.verts: v.co.y = min(v.co.y, 0) * 1.0
    vz = obj_from_bm('Visor', bm); vz.location = (0, -.07, 1.645); vz.scale = (1, .8, .8); vz.data.materials.append(M_VISOR); smooth(vz); parts.append(vz)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=(.42, .22, .55), verts=bm.verts)
    pk = obj_from_bm('Pack', bm); pk.location = (0, .24, 1.2); pk.data.materials.append(M_SUIT); parts.append(pk)
    root = link(bpy.data.objects.new('Astronaut', None))
    for o in parts: o.parent = root
    root.location = FIG
    root.rotation_euler = (0, 0, math.radians(200))


astronaut()

# ---------------------------------------------------------------- light
world = bpy.data.worlds.new('Dusk')
sc.world = world
world.use_nodes = True
wn = world.node_tree
wn.nodes.clear()
sky = wn.nodes.new('ShaderNodeTexSky')
sky.sky_type = 'MULTIPLE_SCATTERING'
SUN_EL = math.radians(float(ARGS.get('sunel', 2.6)))
SUN_AZ = math.radians(float(ARGS.get('sunaz', 250)))
for k, val in (('sun_elevation', SUN_EL * .4), ('sun_rotation', SUN_AZ), ('sun_disc', False), ('altitude', 200.0),
               ('air_density', 1.2), ('aerosol_density', 2.2), ('dust_density', 2.2), ('ozone_density', 1.0)):
    if hasattr(sky, k):
        setattr(sky, k, val)
bg = wn.nodes.new('ShaderNodeBackground')
bg.inputs['Strength'].default_value = float(ARGS.get('skyk', .9))
wo = wn.nodes.new('ShaderNodeOutputWorld')
wtc = wn.nodes.new('ShaderNodeTexCoord')
wsep = wn.nodes.new('ShaderNodeSeparateXYZ'); wn.links.new(wtc.outputs['Generated'], wsep.inputs[0])
wvor = wn.nodes.new('ShaderNodeTexVoronoi'); wvor.voronoi_dimensions = '3D'; wvor.inputs['Scale'].default_value = 260
wn.links.new(wtc.outputs['Generated'], wvor.inputs['Vector'])
def wm(op, a, b):
    nd = wn.nodes.new('ShaderNodeMath'); nd.operation = op
    for i, v in enumerate((a, b)):
        if isinstance(v, bpy.types.NodeSocket): wn.links.new(v, nd.inputs[i])
        else: nd.inputs[i].default_value = v
    return nd.outputs[0]
wsc = wn.nodes.new('ShaderNodeSeparateColor'); wn.links.new(wvor.outputs['Color'], wsc.inputs[0])
dot = wm('LESS_THAN', wvor.outputs['Distance'], wm('ADD', .025, wm('MULTIPLY', wm('POWER', wsc.outputs[0], 6.0), .06)))
dot = wm('MULTIPLY', dot, wm('GREATER_THAN', wsc.outputs[1], .72))
dot = wm('MULTIPLY', dot, wm('MULTIPLY', wm('POWER', wsc.outputs[2], 3.0), 1.0))
up = wn.nodes.new('ShaderNodeMapRange'); up.interpolation_type = 'SMOOTHSTEP'
wn.links.new(wsep.outputs['Z'], up.inputs[0]); up.inputs[1].default_value = .12; up.inputs[2].default_value = .55
starsky = wm('MULTIPLY', wm('MULTIPLY', dot, up.outputs[0]), float(ARGS.get('skystars', 4.0)))
ramp = wn.nodes.new('ShaderNodeValToRGB')
wn.links.new(wsep.outputs['Z'], ramp.inputs[0])
els = ramp.color_ramp.elements
els[0].position, els[0].color = 0.0, (1.0, .52, .3, 1)
els[1].position, els[1].color = .55, (.035, .05, .13, 1)
for pos, col in ((.035, (.95, .5, .42, 1)), (.1, (.55, .36, .5, 1)), (.24, (.2, .22, .42, 1))):
    e = els.new(pos); e.color = col
sd = wn.nodes.new('ShaderNodeVectorMath'); sd.operation = 'DOT_PRODUCT'
wn.links.new(wtc.outputs['Generated'], sd.inputs[0])
sd.inputs[1].default_value = (math.sin(SUN_AZ), math.cos(SUN_AZ), .05)
glow = wm('MULTIPLY', wm('POWER', wm('MAXIMUM', sd.outputs['Value'], 0.0), 5.0), 1.2)
gcol = wn.nodes.new('ShaderNodeVectorMath'); gcol.operation = 'SCALE'
gcol.inputs[0].default_value = (1.0, .45, .16); wn.links.new(glow, gcol.inputs[3])
g1 = wn.nodes.new('ShaderNodeVectorMath'); g1.operation = 'ADD'
wn.links.new(ramp.outputs[0], g1.inputs[0]); wn.links.new(gcol.outputs[0], g1.inputs[1])
sadd = wn.nodes.new('ShaderNodeVectorMath'); sadd.operation = 'ADD'
wn.links.new(g1.outputs[0], sadd.inputs[0]); wn.links.new(starsky, sadd.inputs[1])
amb = wn.nodes.new('ShaderNodeMix')
amb.data_type = 'RGBA'
wn.links.new(sadd.outputs[0], NT.inp(amb, 'A_Color'))
NT.inp(amb, 'B_Color').default_value = (.3, .36, .5, 1)
wn.links.new(amb.outputs[2], bg.inputs[0])
wn.links.new(bg.outputs[0], wo.inputs['Surface'])

sun_dir = Vector((math.sin(SUN_AZ) * math.cos(SUN_EL), math.cos(SUN_AZ) * math.cos(SUN_EL), math.sin(SUN_EL)))  # towards the sun
sun = link(bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN')))
sun.data.energy = float(ARGS.get('sunk', 9.0))
sun.data.angle = math.radians(.8)
sun.data.color = (1.0, .52, .28)
sun.rotation_euler = (-sun_dir).to_track_quat('-Z', 'Y').to_euler()

# Inside: one shaft of sun through one hole, landing on the visitor.
beam_dir = (FIG + Vector((0, 0, 1.0)) - HOLE).normalized()
spot = link(bpy.data.objects.new('Shaft', bpy.data.lights.new('Shaft', 'SPOT')))
spot.data.energy = float(ARGS.get('shaftk', 2.2e6))
spot.data.spot_size = math.radians(2.2)
spot.data.spot_blend = .35
spot.data.shadow_soft_size = .05
spot.data.color = (1.0, .9, .75)
spot.location = HOLE - beam_dir * .1
spot.rotation_euler = beam_dir.to_track_quat('-Z', 'Y').to_euler()
bm = bmesh.new()
bmesh.ops.create_circle(bm, cap_ends=True, segments=24, radius=.55)
hole = obj_from_bm('SunHole', bm)
hole.data.materials.append(M_SUNHOLE)
hole.location = HOLE + (HOLE - Vector((0, 0, CZ))).normalized() * .02
hole.rotation_euler = (Vector((0, 0, CZ)) - HOLE).to_track_quat('Z', 'Y').to_euler()

sh = NT('ShaftGlow')
lw = sh.n('ShaderNodeLayerWeight', inputs={'Blend': .5})
edge = sh.m('POWER', sh.m('SUBTRACT', 1.0, lw.outputs['Facing']), 3.5)
dust = sh.n('ShaderNodeTexNoise', noise_dimensions='3D', inputs={'Scale': .35, 'Detail': 3.0})
sh.set(dust.inputs['Vector'], sh.coords())
geo = sh.n('ShaderNodeNewGeometry')
bz = sh.xyz(geo.outputs['Position'])[2]
k = sh.m('MULTIPLY', sh.m('MULTIPLY', edge, sh.mr(dust.outputs['Fac'], .3, .7, .55, 1.15)), sh.mr(bz, 0.0, 70.0, 1.0, .35))
em = sh.n('ShaderNodeEmission', inputs={'Color': (1.0, .88, .7, 1.0)})
sh.set(em.inputs['Strength'], sh.m('MULTIPLY', k, float(ARGS.get('shaftglow', .55))))
tr = sh.n('ShaderNodeBsdfTransparent')
add = sh.n('ShaderNodeAddShader')
sh.set(add.inputs[0], tr)
sh.set(add.inputs[1], em)
sh.out(add)
try:
    sh.mat.cycles.emission_sampling = 'NONE'
    sh.mat.surface_render_method = 'BLENDED'
except Exception as e:
    print('shaft mat', e)
L = (FIG - HOLE).length
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=False, segments=48, radius1=1.15, radius2=.3, depth=L)
shaft = obj_from_bm('ShaftCone', bm)
shaft.data.materials.append(sh.mat)
smooth(shaft)
shaft.location = (HOLE + FIG) / 2
shaft.rotation_euler = (HOLE - FIG).to_track_quat('Z', 'Y').to_euler()
shaft.visible_shadow = False
for attr in ('visible_diffuse', 'visible_glossy', 'visible_transmission'):
    setattr(shaft, attr, False)

# Haze inside the sphere, so the shaft and the star-holes read in the air.
HAZE = float(ARGS.get('haze', 0))
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=RIN - .3)
haze = obj_from_bm('Haze', bm)
haze.hide_render = HAZE <= 0
haze.location = (0, 0, CZ)
t = NT('Haze')
vol = t.n('ShaderNodeVolumePrincipled', inputs={'Density': max(HAZE, 1e-6), 'Anisotropy': .55})
vol.inputs['Color'].default_value = (1, .95, .88, 1)
o = t.n('ShaderNodeOutputMaterial')
t.set(o.inputs['Volume'], vol)
haze.data.materials.append(t.mat)

# Warm lamps down the tunnel, and a glow at the portal to draw you in.
for i, y in enumerate(range(-36, -112, -11)):
    for s in (-1, 1):
        lp = link(bpy.data.objects.new('TL', bpy.data.lights.new('TL', 'POINT')))
        lp.data.energy = 260
        lp.data.shadow_soft_size = .12
        lp.data.color = (1.0, .66, .38)
        lp.location = (s * 3.25, y, 4.6)
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=.14)
        g = obj_from_bm('Bulb', bm)
        g.location = (s * 3.4, y, 4.6)
        g.data.materials.append(M_LAMP)
glow = link(bpy.data.objects.new('PoolBounce', bpy.data.lights.new('PoolBounce', 'POINT')))
glow.data.energy = float(ARGS.get('bouncek', 900))
glow.data.shadow_soft_size = 1.2
glow.data.color = (1.0, .8, .6)
glow.location = FIG + Vector((0, 0, .35))
fill = link(bpy.data.objects.new('ArenaFill', bpy.data.lights.new('ArenaFill', 'POINT')))
fill.data.energy = float(ARGS.get('fillk', 1.4e4))
fill.data.shadow_soft_size = 14
fill.data.color = (.62, .72, 1.0)
fill.location = (0, 0, CZ + 20)

# ---------------------------------------------------------------- camera path
FPS = 24
KEYS = [  # time s, position, look-at, lens mm
    (0.0, (-2.5, -500, 3.4), (0, 0, 50), 32),
    (3.6, (-1.5, -330, 2.8), (0, -10, 42), 32),
    (6.4, (-2, -180, 2.1), (0, -100, 7), 32),
    (7.6, (0, -123, 1.8), (0, -60, 2.6), 32),
    (8.6, (0, -80, 1.75), (0, 0, 3.2), 26),
    (9.6, (0, -41, 1.75), (0, 0, 9), 17),
    (10.9, (0, -34.5, 1.8), (0, 20, 19), 15),
    (12.0, (0, -33.4, 2.0), (0, 20, 19.8), 15),
]
TOTAL = KEYS[-1][0]
NF = int(TOTAL * FPS) + 1


def hermite(t):
    ts = [k[0] for k in KEYS]
    i = max(0, min(len(KEYS) - 2, next((j for j in range(len(ts) - 1) if t <= ts[j + 1]), len(ts) - 2)))
    t0, t1 = ts[i], ts[i + 1]
    u = (t - t0) / (t1 - t0)
    def tang(j, f):
        a = KEYS[max(0, j - 1)]
        b = KEYS[min(len(KEYS) - 1, j + 1)]
        if j in (0, len(KEYS) - 1):
            return Vector((0, 0, 0)) if not isinstance(f(KEYS[j]), float) else 0.0
        return (f(b) - f(a)) / (b[0] - a[0])
    out = []
    for f in (lambda k: Vector(k[1]), lambda k: Vector(k[2]), lambda k: float(k[3])):
        p0, p1 = f(KEYS[i]), f(KEYS[i + 1])
        m0, m1 = tang(i, f) * (t1 - t0), tang(i + 1, f) * (t1 - t0)
        h00, h10, h01, h11 = 2 * u ** 3 - 3 * u ** 2 + 1, u ** 3 - 2 * u ** 2 + u, -2 * u ** 3 + 3 * u ** 2, u ** 3 - u ** 2
        out.append(p0 * h00 + m0 * h10 + p1 * h01 + m1 * h11)
    return out


IN0, IN1 = int(7.75 * 24), int(8.5 * 24)
AMB = float(ARGS.get('amb', .34))
for f, k in ((IN0, 1.0), (IN1, 0.0)):
    bg.inputs['Strength'].default_value = float(ARGS.get('skyk', .9)) * k + AMB * (1 - k)
    bg.inputs['Strength'].keyframe_insert('default_value', frame=f)
    fac = NT.inp(amb, 'Factor_Float')
    fac.default_value = 1 - k
    fac.keyframe_insert('default_value', frame=f)
    sun.data.energy = float(ARGS.get('sunk', 9.0)) * k
    sun.data.keyframe_insert('energy', frame=f)
bg.inputs['Strength'].default_value = float(ARGS.get('skyk', .9))
sun.data.energy = float(ARGS.get('sunk', 9.0))

cam = link(bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')))
sc.camera = cam
cam.data.sensor_fit = 'AUTO'
cam.data.sensor_width = 36
cam.data.clip_start = .1
cam.data.clip_end = 5000
frames = []
for f in range(NF):
    pos, look, lens = hermite(f / FPS)
    cam.location = pos
    q = (look - pos).to_track_quat('-Z', 'Y')
    cam.rotation_euler = q.to_euler()
    cam.data.lens = lens
    cam.keyframe_insert('location', frame=f + 1)
    cam.keyframe_insert('rotation_euler', frame=f + 1)
    cam.data.keyframe_insert('lens', frame=f + 1)
    frames.append({'p': [round(c, 4) for c in pos], 'q': [round(c, 6) for c in (q.w, q.x, q.y, q.z)], 'lens': round(lens, 4)})
for fc in (cam.animation_data.action.fcurves if hasattr(cam.animation_data.action, 'fcurves') else []):
    for kp in fc.keyframe_points:
        kp.interpolation = 'LINEAR'
sc.frame_start, sc.frame_end = 1, NF
sc.render.fps = FPS

meta = {'fps': FPS, 'frames': frames, 'sensor': 36, 'sphere': {'c': [0, 0, CZ], 'rin': RIN}, 'hole': list(HOLE), 'fig': list(FIG)}
with open(bpy.path.abspath(ARGS.get('meta', '//camera.json')) if bpy.data.filepath else ARGS.get('meta', 'camera.json'), 'w') as fh:
    json.dump(meta, fh)

# ---------------------------------------------------------------- render
r = sc.render
r.engine = 'CYCLES'
r.resolution_x, r.resolution_y = 1920, 1080
r.resolution_percentage = 100
r.film_transparent = False
cy = sc.cycles
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'
prefs.get_devices()
for d in prefs.devices:
    d.use = d.type == 'OPTIX'
cy.device = 'GPU'
cy.samples = int(ARGS.get('samples', 128))
cy.use_adaptive_sampling = True
cy.adaptive_threshold = .02
cy.use_denoising = True
cy.denoiser = 'OPTIX'
cy.max_bounces = 6
cy.diffuse_bounces = 3
cy.glossy_bounces = 2
cy.transmission_bounces = 2
cy.volume_bounces = 0
cy.transparent_max_bounces = 4
cy.volume_step_rate = 4.0
cy.sample_clamp_indirect = 8.0
try:
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = ARGS.get('look', 'AgX - Punchy')
except Exception as e:
    print('look', e)
sc.view_settings.exposure = float(ARGS.get('exposure', 0))
r.image_settings.file_format = 'PNG'
r.image_settings.color_depth = '8'

if ARGS.get('engine') == 'eevee':
    r.engine = 'BLENDER_EEVEE'
    ee = sc.eevee
    ee.taa_render_samples = int(ARGS.get('samples', 64))
    for k, val in (('use_raytracing', True), ('use_shadows', True), ('use_fast_gi', True), ('fast_gi_method', 'GLOBAL_ILLUMINATION'),
                   ('shadow_ray_count', 2), ('shadow_step_count', 8), ('use_volumetric_shadows', True), ('volumetric_tile_size', '4'),
                   ('clamp_surface_indirect', 10.0), ('shadow_pool_size', '1024')):
        try:
            setattr(ee, k, val)
        except Exception as e:
            print('eevee', k, e)
    try:
        ee.ray_tracing_options.resolution_scale = '1'
        ee.ray_tracing_options.use_denoise = True
    except Exception as e:
        print('rt', e)
    world.sun_threshold = 1e9

# Post: atmospheric depth from the mist pass, bloom on the bright holes, a trace of lens dispersion.
sc.view_layers[0].use_pass_mist = True
ms = world.mist_settings
ms.start, ms.depth, ms.falloff = 40.0, 1100.0, 'QUADRATIC'
ng = bpy.data.node_groups.new('Post', 'CompositorNodeTree')
ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
N = ng.nodes
rl = N.new('CompositorNodeRLayers')
fk = N.new('ShaderNodeMath'); fk.operation = 'MULTIPLY'; fk.inputs[1].default_value = float(ARGS.get('fog', .42))
ng.links.new(rl.outputs['Mist'], fk.inputs[0])
fog = N.new('ShaderNodeMix'); fog.data_type = 'RGBA'
ng.links.new(fk.outputs[0], NT.inp(fog, 'Factor_Float'))
ng.links.new(rl.outputs['Image'], NT.inp(fog, 'A_Color'))
NT.inp(fog, 'B_Color').default_value = (.42, .36, .36, 1)
gl = N.new('CompositorNodeGlare')
for k, val in (('Type', 'Bloom'), ('Quality', 'High'), ('Highlights Threshold', 1.0), ('Strength', .35), ('Size', .6)):
    try:
        gl.inputs[k].default_value = val
    except Exception as e:
        try:
            gl.inputs[k].default_value = val.upper()
        except Exception as e2:
            print('glare', k, e2)
ng.links.new(NT.inp(fog, 'Result_Color') if False else fog.outputs[2], gl.inputs['Image'])
ld = N.new('CompositorNodeLensdist')
ld.inputs['Dispersion'].default_value = .012
ng.links.new(gl.outputs[0], ld.inputs['Image'])
go = N.new('NodeGroupOutput')
ng.links.new(ld.outputs[0], go.inputs[0])
sc.compositing_node_group = ng
r.use_compositing = True
r.use_persistent_data = True

# Cutters and helpers never render.
for o in [void, tunnel, slot, *portal]:
    o.hide_render = True
    o.hide_viewport = True
bpy.ops.wm.save_as_mainfile(filepath=bpy.path.abspath(ARGS.get('out', 'cenotaph.blend')))
print('BUILT', NF, 'frames')
