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
FIG = Vector((3.4, -23.5, 0.0))  # the visitor stands in the sunbeam
HOLE = Vector((0, 0, CZ)) + Vector((-.78, .12, .62)).normalized() * (RIN - .05)
rnd = random.Random(7)
MODE = ARGS.get('mode', 'night')          # night: the vault pierced with daylight; day: Boullée's lamp
DAY = MODE == 'day'
LOOP = ARGS.get('loop') == '1'            # the living hold after the flight, camera still
LOOP_T = 240                              # frames in the loop (10 s at 24 fps)
TEXDIR = ARGS.get('tex', 'C:/Users/user/Documents/rodionbelousov/.tools/textures/')
ARM_C = Vector((0.0, 0.0, 34.0))          # the armillary lamp hangs over the tomb
F0 = 0 if LOOP else 289                   # the film's last frame is the loop's first
W_LOOP = 2 * math.pi / LOOP_T             # one turn per loop, so every motion closes on itself


def fcurves_of(idblock):
    ad = idblock.animation_data
    if hasattr(ad.action, 'fcurves'):
        return ad.action.fcurves
    from bpy_extras import anim_utils
    return anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot).fcurves


def oscillate(idblock, path, index, amp, k=1, phase=0.0):
    """Adds amp*sin(k*turn*(frame-F0)+phase) on top of a property: loops seamlessly."""
    idblock.keyframe_insert(path, index=index, frame=0)
    fc = next(f for f in fcurves_of(idblock) if f.data_path == path and f.array_index == max(index, 0))
    m = fc.modifiers.new('FNGENERATOR')
    m.function_type, m.use_additive = 'SIN', True
    m.amplitude, m.phase_multiplier = amp, W_LOOP * k
    m.phase_offset = phase - W_LOOP * k * F0


def frame_socket(tree):
    """Frames since the loop began, for shaders that breathe or twinkle."""
    v = tree.nodes.new('ShaderNodeValue')
    d = v.outputs[0].driver_add('default_value').driver
    d.type, d.expression = 'SCRIPTED', f'frame - {F0}'
    return v.outputs[0]


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


def stone(t, groove, cellr, pos, base, rough=.8, dark=1.0, extra_emit=None, sc_=None):
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
    b = t.n('ShaderNodeBsdfPrincipled', inputs={'Roughness': rough})
    if sc_ is not None:
        k = t.m('MULTIPLY', k, t.m('ADD', .35, t.m('MULTIPLY', sc_['ao'], .65)))
        t.set(b.inputs['Base Color'], t.v('SCALE', sc_['col'], scale=t.m('MULTIPLY', k, dark)))
        t.set(b.inputs['Normal'], sc_['normal'])
        t.set(b.inputs['Roughness'], t.m('ADD', .15, t.m('MULTIPLY', sc_['rough'], .85)))
    else:
        col = t.v('SCALE', tuple(c * dark for c in base), scale=k)
        bump = t.n('ShaderNodeBump', inputs={'Strength': .55, 'Distance': .04})
        t.set(bump.inputs['Height'], t.m('ADD', t.m('MULTIPLY', groove, -1.0), t.m('MULTIPLY', grain.outputs['Fac'], .25)))
        t.set(b.inputs['Base Color'], col)
        t.set(b.inputs['Normal'], bump)
    if extra_emit is not None:
        colr, strength = extra_emit
        b.inputs['Emission Color'].default_value = colr
        t.set(b.inputs['Emission Strength'], strength)
    return b


LIME = (.74, .67, .56)
_IMGS = {}


def image(name, data=False):
    if name not in _IMGS:
        im = bpy.data.images.load(TEXDIR + name)
        if data:
            im.colorspace_settings.name = 'Non-Color'
        _IMGS[name] = im
    return _IMGS[name]


def scan(t, U, V, key, tile=3.0, crop=None, tint=(1.12, 1.05, .93)):
    """Photo-scanned stone (Poly Haven, CC0) laid out in metres; crop keeps only whole courses."""
    u = t.m('DIVIDE', U, tile)
    v = t.m('DIVIDE', V, tile * ((crop[1] - crop[0]) if crop else 1.0))
    if crop:
        v = t.m('ADD', crop[0], t.m('MULTIPLY', t.m('FRACT', v), crop[1] - crop[0]))
    uv = t.comb(u, v, 0.0)
    tex = {}
    for kind, data in (('diff', False), ('nor_gl', True), ('arm', True)):
        nd = t.n('ShaderNodeTexImage', interpolation='Linear')
        nd.image = image(f'{key}_{kind}_2k.jpg', data)
        t.set(nd.inputs['Vector'], uv)
        tex[kind] = nd.outputs['Color']
    hs = t.n('ShaderNodeHueSaturation', inputs={'Hue': .5, 'Saturation': .62, 'Value': 1.45, 'Fac': 1.0})
    t.set(hs.inputs['Color'], tex['diff'])
    col = t.v('MULTIPLY', hs.outputs['Color'], tint)
    nm = t.n('ShaderNodeNormalMap', inputs={'Strength': .6})
    t.set(nm.inputs['Color'], tex['nor_gl'])
    ao, rough, _ = t.xyz(tex['arm'])
    return {'col': col, 'normal': nm.outputs['Normal'], 'ao': ao, 'rough': rough}



def mat_sphere():
    t = NT('SphereStone')
    P = t.coords()
    x, y, z = t.xyz(P)
    L = t.v('LENGTH', P)
    lat = t.m('ARCSINE', t.m('DIVIDE', z, L))
    lon = t.m('ARCTAN2', y, x)
    V = t.m('MULTIPLY', lat, R)
    U = t.m('MULTIPLY', t.m('MULTIPLY', lon, R), t.m('COSINE', lat))
    S = scan(t, U, V, 'large_sandstone_blocks_01', 3.0)
    groove, cellr = 0.0, .5
    # The vault is pierced: daylight through thousands of small funnels reads as stars.
    nrm = t.v('NORMALIZE', P)
    nx, ny, nz = t.xyz(nrm)
    band = t.m('EXPONENT', t.m('DIVIDE', t.m('MULTIPLY', t.m('POWER', t.v('DOT_PRODUCT', nrm, (.35, .82, .3)), 2.0), -1.0), .03))
    inside = t.m('LESS_THAN', L, R - .6)
    upper = t.mr(nz, -.45, -.12)
    emit = 0.0
    FR = frame_socket(t.t)
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
        # Each hole twinkles at 1-3 cycles per loop, from its own phase.
        kk = t.m('ADD', 1.0, t.m('FLOOR', t.m('MULTIPLY', t.m('FRACT', t.m('MULTIPLY', cb, 7.0)), 3.0)))
        tw = t.m('SINE', t.m('ADD', t.m('MULTIPLY', t.m('MULTIPLY', FR, W_LOOP), kk), t.m('MULTIPLY', cr, 40.0)))
        bright = t.m('MULTIPLY', bright, t.m('ADD', 1.0, t.m('MULTIPLY', tw, .38)))
        layer = t.m('MULTIPLY', t.m('MULTIPLY', hole, pick), t.m('MULTIPLY', bright, gain))
        emit = layer if emit == 0.0 else t.m('ADD', emit, layer)
    strength = t.m('MULTIPLY', t.m('MULTIPLY', emit, t.m('MULTIPLY', inside, upper)), float(ARGS.get('stars', 150 if DAY else 260)))
    b = stone(t, groove, cellr, P, LIME, extra_emit=((1.0, .9, .78, 1.0), strength), sc_=S)
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
    S = scan(t, U, z, 'large_sandstone_blocks_01', 3.0, tint=(1.05, .99, .88))
    return t.out(stone(t, 0.0, .5, P, (.7, .63, .53), sc_=S))


def mat_paving(name='Paving', base=(.46, .43, .38), rough=.7, slab=2.2):
    t = NT(name)
    P = t.coords()
    x, y, z = t.xyz(P)
    if name == 'Basalt':
        groove, cellr = masonry(t, x, y, slab, slab)
        return t.out(stone(t, groove, cellr, P, base, rough=rough))
    S = scan(t, x, y, 'large_sandstone_blocks', slab * 1.5, crop=(.14, .81), tint=tuple(c * (2.5 if DAY else 1.9) for c in base))
    return t.out(stone(t, 0.0, .5, P, base, rough=rough, sc_=S))


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
    NT.inp(mix, 'A_Color').default_value = (.05, .07, .025, 1) if DAY else (.03, .036, .016, 1)
    NT.inp(mix, 'B_Color').default_value = (.16, .14, .07, 1) if DAY else (.1, .082, .05, 1)
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
moon.hide_render = DAY
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
        src = ARGS.get('astroanim') if LOOP and ARGS.get('astroanim') else ARGS['astro']
        bpy.ops.import_scene.gltf(filepath=bpy.path.abspath(src))
        sc.frame_set(0)
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
        # Seen from behind, a little turned: he faces the vault and the address written on it.
        root.rotation_euler = (0, 0, math.radians(float(ARGS.get('astroyaw', 160))))
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
SUN_EL = math.radians(float(ARGS.get('sunel', 15 if DAY else 2.6)))
SUN_AZ = math.radians(float(ARGS.get('sunaz', 250)))
for k, val in (('sun_elevation', SUN_EL if DAY else SUN_EL * .4), ('sun_rotation', SUN_AZ), ('sun_disc', False), ('altitude', 200.0),
               ('air_density', 1.2), ('aerosol_density', 2.2), ('dust_density', 2.2), ('ozone_density', 1.0)):
    if hasattr(sky, k):
        setattr(sky, k, val)
bg = wn.nodes.new('ShaderNodeBackground')
bg.inputs['Strength'].default_value = float(ARGS.get('skyk', .5 if DAY else .9))
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
starsky = wm('MULTIPLY', wm('MULTIPLY', dot, up.outputs[0]), 0.0 if DAY else float(ARGS.get('skystars', 4.0)))
ramp = wn.nodes.new('ShaderNodeValToRGB')
wn.links.new(wsep.outputs['Z'], ramp.inputs[0])
els = ramp.color_ramp.elements
if DAY:
    els[0].position, els[0].color = 0.0, (.95, .9, .82, 1)
    els[1].position, els[1].color = .6, (.06, .16, .48, 1)
    for pos, col in ((.05, (.62, .72, .86, 1)), (.22, (.22, .38, .72, 1))):
        e = els.new(pos); e.color = col
else:
    els[0].position, els[0].color = 0.0, (1.0, .52, .3, 1)
    els[1].position, els[1].color = .55, (.035, .05, .13, 1)
    for pos, col in ((.035, (.95, .5, .42, 1)), (.1, (.55, .36, .5, 1)), (.24, (.2, .22, .42, 1))):
        e = els.new(pos); e.color = col
sd = wn.nodes.new('ShaderNodeVectorMath'); sd.operation = 'DOT_PRODUCT'
wn.links.new(wtc.outputs['Generated'], sd.inputs[0])
sd.inputs[1].default_value = (math.sin(SUN_AZ), math.cos(SUN_AZ), .05)
glow = wm('MULTIPLY', wm('POWER', wm('MAXIMUM', sd.outputs['Value'], 0.0), 5.0), 1.2)
gcol = wn.nodes.new('ShaderNodeVectorMath'); gcol.operation = 'SCALE'
gcol.inputs[0].default_value = (.5, .45, .35) if DAY else (1.0, .45, .16); wn.links.new(glow, gcol.inputs[3])
g1 = wn.nodes.new('ShaderNodeVectorMath'); g1.operation = 'ADD'
wn.links.new(ramp.outputs[0], g1.inputs[0]); wn.links.new(gcol.outputs[0], g1.inputs[1])
sadd = wn.nodes.new('ShaderNodeVectorMath'); sadd.operation = 'ADD'
wn.links.new(g1.outputs[0], sadd.inputs[0]); wn.links.new(starsky, sadd.inputs[1])
amb = wn.nodes.new('ShaderNodeMix')
amb.data_type = 'RGBA'
wn.links.new(sadd.outputs[0], NT.inp(amb, 'A_Color'))
NT.inp(amb, 'B_Color').default_value = (.62, .56, .47, 1) if DAY else (.3, .36, .5, 1)
wn.links.new(amb.outputs[2], bg.inputs[0])
wn.links.new(bg.outputs[0], wo.inputs['Surface'])

sun_dir = Vector((math.sin(SUN_AZ) * math.cos(SUN_EL), math.cos(SUN_AZ) * math.cos(SUN_EL), math.sin(SUN_EL)))  # towards the sun
sun = link(bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN')))
sun.data.energy = float(ARGS.get('sunk', 12.0 if DAY else 9.0))
sun.data.angle = math.radians(.8)
sun.data.color = (1.0, .86, .7) if DAY else (1.0, .52, .28)
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
oscillate(spot.data, 'energy', -1, spot.data.energy * .08, 1, .5)
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
breath = sh.m('ADD', 1.0, sh.m('MULTIPLY', sh.m('SINE', sh.m('ADD', sh.m('MULTIPLY', frame_socket(sh.t), W_LOOP), .5)), .08))
sh.set(em.inputs['Strength'], sh.m('MULTIPLY', sh.m('MULTIPLY', k, breath), float(ARGS.get('shaftglow', .55))))
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

mt = NT('Mote')
oi = mt.n('ShaderNodeObjectInfo')
A0 = FIG + Vector((0, 0, 1.0))
rel = mt.v('SUBTRACT', oi.outputs['Location'], tuple(A0))
off = mt.v('LENGTH', mt.v('CROSS_PRODUCT', rel, tuple(-beam_dir)))
lit = mt.mr(off, 1.35, .35)
twk = mt.m('ADD', .6, mt.m('MULTIPLY', oi.outputs['Random'], .8))
em = mt.n('ShaderNodeEmission', inputs={'Color': (1.0, .9, .76, 1.0)})
mt.set(em.inputs['Strength'], mt.m('MULTIPLY', mt.m('MULTIPLY', lit, twk), float(ARGS.get('motek', 22))))
mt.out(em)
bm = bmesh.new()
bmesh.ops.create_icosphere(bm, subdivisions=1, radius=.014)
mote_me = bpy.data.meshes.new('Mote')
bm.to_mesh(mote_me)
bm.free()
mote_me.materials.append(mt.mat)
side = Vector((1, 0, 0)).cross(beam_dir).normalized()
side2 = beam_dir.cross(side).normalized()
mr_ = random.Random(11)
for i in range(int(ARGS.get('motes', 90))):
    s_ = mr_.random() ** 1.6 * 14.0
    ang, rad = mr_.random() * 6.283, math.sqrt(mr_.random()) * 1.3
    pos = A0 - beam_dir * s_ + (side * math.cos(ang) + side2 * math.sin(ang)) * rad
    o = link(bpy.data.objects.new('Mote', mote_me))
    o.location = pos
    o.visible_shadow = False
    for axis in range(3):
        oscillate(o, 'location', axis, .15 + mr_.random() * .45, mr_.choice((1, 1, 2)), mr_.random() * 6.283)

# Day: Boullee's own lamp, an armillary sphere hung over the tomb, flooding the vault with light
# and throwing its rings across the stone.
if DAY:
    brass = mat_simple('Brass', (.95, .72, .38), .28)
    for nd in brass.node_tree.nodes:
        if nd.type == 'BSDF_PRINCIPLED':
            nd.inputs['Metallic'].default_value = 1.0
    core_m = mat_simple('Core', (1, .9, .7), .5, ((1.0, .8, .55), float(ARGS.get('corek', 55))))
    arm = link(bpy.data.objects.new('Armillary', None))
    arm.location = ARM_C
    tilt = link(bpy.data.objects.new('ArmTilt', None))
    tilt.parent = arm
    tilt.rotation_euler = (math.radians(41), 0, 0)

    def ring_(name, R_, r_, rot=(0, 0, 0), z=0.0, flat=1.0):
        bpy.ops.mesh.primitive_torus_add(major_radius=R_, minor_radius=r_, major_segments=160, minor_segments=14, location=(0, 0, z), rotation=rot)
        o = bpy.context.active_object
        o.name = name
        o.scale = (1, 1, flat)
        o.data.materials.append(brass)
        smooth(o)
        o.parent = tilt
        return o
    ring_('Equator', 7.0, .15)
    ring_('Colure1', 7.0, .13, (math.pi / 2, 0, 0))
    ring_('Colure2', 7.0, .13, (0, math.pi / 2, 0))
    ecl = ring_('Ecliptic', 6.85, .42, flat=.28)
    ecl.rotation_euler = (math.radians(23.44), 0, 0)
    for zz in (-1, 1):
        ring_('Tropic', 7.0 * math.cos(math.radians(23.44)), .07, z=zz * 7.0 * math.sin(math.radians(23.44)))
        ring_('Polar', 7.0 * math.sin(math.radians(23.44)), .06, z=zz * 7.0 * math.cos(math.radians(23.44)))
    bpy.ops.mesh.primitive_cylinder_add(radius=.08, depth=19.0, vertices=24)
    ax = bpy.context.active_object
    ax.data.materials.append(brass)
    ax.parent = tilt
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.5, segments=48, ring_count=24)
    core = bpy.context.active_object
    core.data.materials.append(core_m)
    smooth(core)
    core.parent = arm
    core.visible_shadow = False
    top = Vector((0, 0, CZ + RIN))
    bpy.ops.mesh.primitive_cylinder_add(radius=.06, depth=(top - ARM_C).length - 7.0, vertices=16, location=(ARM_C + top) / 2 + Vector((0, 0, 3.5)))
    bpy.context.active_object.data.materials.append(brass)
    lamp = link(bpy.data.objects.new('Lamp', bpy.data.lights.new('Lamp', 'POINT')))
    lamp.data.energy = float(ARGS.get('lampk', 1.6e5))
    lamp.data.shadow_soft_size = .35
    lamp.data.color = (1.0, .84, .64)
    lamp.parent = arm
    oscillate(arm, 'rotation_euler', 2, .09, 1, 0.0)
    oscillate(tilt, 'rotation_euler', 1, .035, 1, 1.7)

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

# ---------------------------------------------------------------- furnishings
# Fire: a flame of emissive fog-like glow with a flickering light in it; every flicker closes on the loop.
fire_rng = random.Random(23)
t = NT('Flame')
fn = t.n('ShaderNodeTexNoise', noise_dimensions='3D', inputs={'Scale': 3.0, 'Detail': 4.0})
t.set(fn.inputs['Vector'], t.coords())
fz = t.xyz(t.coords('Generated'))[2]
lwf = t.n('ShaderNodeLayerWeight', inputs={'Blend': .45})
fk = t.m('MULTIPLY', t.m('MULTIPLY', t.mr(fn.outputs['Fac'], .3, .7, .4, 1.3), t.mr(fz, 1.0, .1, 0.0, 1.0)), t.m('SUBTRACT', 1.0, t.m('MULTIPLY', lwf.outputs['Fresnel'], .8)))
fe = t.n('ShaderNodeEmission', inputs={'Color': (1.0, .52, .18, 1.0)})
t.set(fe.inputs['Strength'], t.m('MULTIPLY', fk, float(ARGS.get('flamek', 26))))
ftr = t.n('ShaderNodeBsdfTransparent')
fadd = t.n('ShaderNodeAddShader')
t.set(fadd.inputs[0], ftr)
t.set(fadd.inputs[1], fe)
t.out(fadd)
try:
    t.mat.surface_render_method = 'BLENDED'
    t.mat.cycles.emission_sampling = 'NONE'
except Exception as e:
    print('flame', e)
M_FLAME = t.mat
bronze = mat_simple('Bronze', (.2, .13, .07), .42)
for nd in bronze.node_tree.nodes:
    if nd.type == 'BSDF_PRINCIPLED':
        nd.inputs['Metallic'].default_value = .85


def flame(loc, size=1.0, energy=900.0, shadow=False):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=12, radius=1.0)
    for v in bm.verts:
        tz = (v.co.z + 1) / 2
        v.co.x *= .32 * (1 - .75 * tz ** 1.4)
        v.co.y *= .32 * (1 - .75 * tz ** 1.4)
        v.co.z = tz * 1.1
    f = obj_from_bm('Flame', bm)
    f.data.materials.append(M_FLAME)
    smooth(f)
    f.location = loc
    f.scale = (size, size, size)
    f.visible_shadow = False
    oscillate(f, 'scale', 2, size * .14, fire_rng.choice((5, 6, 7)), fire_rng.random() * 6.28)
    oscillate(f, 'scale', 0, size * .06, fire_rng.choice((7, 9)), fire_rng.random() * 6.28)
    lp = link(bpy.data.objects.new('Fire', bpy.data.lights.new('Fire', 'POINT')))
    lp.data.energy = energy
    lp.data.color = (1.0, .5, .2)
    lp.data.shadow_soft_size = .25 * size
    lp.data.use_shadow = shadow
    lp.location = Vector(loc) + Vector((0, 0, .45 * size))
    oscillate(lp.data, 'energy', -1, energy * .16, fire_rng.choice((6, 7, 8)), fire_rng.random() * 6.28)
    oscillate(lp.data, 'energy', -1, energy * .08, fire_rng.choice((13, 17)), fire_rng.random() * 6.28)
    return f


def brazier(x, y, z=0.0, scale=1.0, energy=1500.0, shadow=False):
    """A bronze fire bowl on a round stone pedestal."""
    ped = cylinder('Pedestal', .38 * scale, z, z + 1.05 * scale, 32, M_DRUM)
    ped.location = (x, y, 0)
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=.26 * scale, radius2=.72 * scale, depth=.42 * scale, location=(x, y, z + 1.26 * scale))
    bowl = bpy.context.active_object
    bowl.data.materials.append(bronze)
    smooth(bowl)
    bpy.ops.mesh.primitive_torus_add(major_radius=.72 * scale, minor_radius=.05 * scale, location=(x, y, z + 1.47 * scale))
    rim = bpy.context.active_object
    rim.data.materials.append(bronze)
    flame((x, y, z + 1.36 * scale), .95 * scale, energy, shadow)


M_OBSIDIAN = mat_simple('Obsidian', (.035, .033, .036), .22)


def obelisk(x, y, h, base):
    bm = bmesh.new()
    top = base * .62
    pts = [(-base, -base, 0), (base, -base, 0), (base, base, 0), (-base, base, 0), (-top, -top, h), (top, -top, h), (top, top, h), (-top, top, h)]
    vs = [bm.verts.new(p_) for p_ in pts]
    apex = bm.verts.new((0, 0, h + top * 2.2))
    bm.faces.new((vs[3], vs[2], vs[1], vs[0]))
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((vs[i], vs[j], vs[4 + j], vs[4 + i]))
        bm.faces.new((vs[4 + i], vs[4 + j], apex))
    o = obj_from_bm('Obelisk', bm)
    o.location = (x, y, 0)
    o.data.materials.append(M_OBSIDIAN)
    plinth = cylinder('ObeliskPlinth', base * 2.1, 0, 1.2, 4, M_TERRACE)
    plinth.location = (x, y, 0)
    plinth.rotation_euler = (0, 0, math.pi / 4)


# The processional way: bronze fire bowls on both sides, obelisks at its start and before the portal.
for i, y in enumerate(range(-140, -500, -36)):
    for sx in (-1, 1):
        brazier(sx * 9.5, y, energy=float(ARGS.get('wayfire', 1800)))
# Rising out of the basins, so the water doubles them.
for y, h in ((-178, 34.0), (-455, 27.0)):
    for sx in (-1, 1):
        obelisk(sx * 29.5, y, h, 1.7)

# Inside: fire bowls round the tomb, and a ring of stone mourners on the top step, facing it.
for i in range(6):
    a = math.radians(i * 60)
    brazier(math.cos(a) * 14.5, math.sin(a) * 14.5, 0.0, 1.25, float(ARGS.get('innerfire', 2600)), shadow=i % 2 == 0)
M_STATUE = M_DRUM
mr2 = random.Random(5)
for i in range(18):
    a = math.radians(-90 + 22 + i * (360 - 44) / 17)
    k = 3
    rr, zz = ARENA + 2.5 * k + 1.3, 1.5 * (k + 1)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=28, radius1=.62, radius2=.3, depth=2.6)
    for v in bm.verts:
        v.co.x *= 1.0 + .08 * math.sin(v.co.z * 5 + i)
        v.co.z += 1.3
    body = obj_from_bm('Mourner', bm)
    body.data.materials.append(M_STATUE)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=14, radius=.34)
    for v in bm.verts:
        v.co.z *= 1.35
        if v.co.z > 0:
            v.co.y -= v.co.z * .35
    hood = obj_from_bm('Hood', bm)
    hood.data.materials.append(M_STATUE)
    hood.parent = body
    hood.location = (0, .08, 2.85)
    hood.rotation_euler = (math.radians(-18 - mr2.random() * 14), 0, 0)
    smooth(body)
    smooth(hood)
    body.location = (math.cos(a) * rr, math.sin(a) * rr, zz)
    # Face the tomb, heads a little bowed.
    body.rotation_euler = (0, 0, math.atan2(-math.sin(a), -math.cos(a)) + math.pi / 2)
    s_ = 1.9 + mr2.random() * .3   # colossal, as in Boullée's drawings
    body.scale = (s_, s_, s_)
    up = link(bpy.data.objects.new('StatueLight', bpy.data.lights.new('StatueLight', 'SPOT')))
    up.data.energy = float(ARGS.get('statuek', 240))
    up.data.color = (1.0, .6, .32)
    up.data.spot_size = math.radians(55)
    up.data.spot_blend = .9
    up.data.use_shadow = False
    tip = Vector((math.cos(a) * rr, math.sin(a) * rr, zz))
    up.location = tip - Vector((math.cos(a), math.sin(a), 0)) * 2.6 + Vector((0, 0, .3))
    up.rotation_euler = (tip + Vector((0, 0, 4.5)) - up.location).to_track_quat('-Z', 'Y').to_euler()
    oscillate(up.data, 'energy', -1, 60, fire_rng.choice((5, 7)), fire_rng.random() * 6.28)

# Mist: low over the ground outside, over the arena floor inside.
if float(ARGS.get('mist', 1)) > 0:
    t = NT('Mist')
    mn2 = t.n('ShaderNodeTexNoise', noise_dimensions='3D', inputs={'Scale': .05, 'Detail': 3.0})
    t.set(mn2.inputs['Vector'], t.coords())
    mz = t.xyz(t.n('ShaderNodeNewGeometry').outputs['Position'])[2]
    dens = t.m('MULTIPLY', t.mr(mn2.outputs['Fac'], .35, .7, .2, 1.0), t.mr(mz, 3.2, 0.0, 0.0, 1.0))
    vol = t.n('ShaderNodeVolumePrincipled', inputs={'Anisotropy': .3})
    vol.inputs['Color'].default_value = (.8, .78, .76, 1)
    t.set(vol.inputs['Density'], t.m('MULTIPLY', dens, float(ARGS.get('mistk', .05))))
    o = t.n('ShaderNodeOutputMaterial')
    t.set(o.inputs['Volume'], vol)
    for name, cx, cy, sx_, sy_ in (('MistOut', 0, -330, 150, 420), ('MistIn', 0, 0, 58, 58)):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(sx_, sy_, 3.6), verts=bm.verts)
        bmesh.ops.translate(bm, vec=(cx, cy, 1.8), verts=bm.verts)
        mo = obj_from_bm(name, bm)
        mo.data.materials.append(t.mat)

# Night: a comet low over the hills, the space the site belongs to.
if not DAY:
    t = NT('Comet')
    gen = t.coords('Generated')
    gx, gy, gz = t.xyz(gen)
    tail = t.m('MULTIPLY', t.m('POWER', gx, 2.2), t.mr(t.m('ABSOLUTE', t.m('SUBTRACT', gy, .5)), .5, 0.0, 0.0, 1.0))
    tail = t.m('MULTIPLY', tail, t.m('POWER', t.mr(t.m('ABSOLUTE', t.m('SUBTRACT', gy, .5)), .5 * 1.0, 0.0), t.m('ADD', 1.0, t.m('MULTIPLY', t.m('SUBTRACT', 1.0, gx), 6.0))))
    ce = t.n('ShaderNodeEmission', inputs={'Color': (.78, .88, 1.0, 1.0)})
    t.set(ce.inputs['Strength'], t.m('MULTIPLY', tail, .75))
    ct = t.n('ShaderNodeBsdfTransparent')
    ca = t.n('ShaderNodeAddShader')
    t.set(ca.inputs[0], ct)
    t.set(ca.inputs[1], ce)
    t.out(ca)
    try:
        t.mat.surface_render_method = 'BLENDED'
    except Exception:
        pass
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=.5)
    comet = obj_from_bm('Comet', bm)
    comet.data.materials.append(t.mat)
    cdir = Vector((-math.sin(math.radians(28)) * math.cos(math.radians(19)), math.cos(math.radians(28)) * math.cos(math.radians(19)), math.sin(math.radians(19))))
    comet.location = Vector((0, -500, 3)) + cdir * 3000
    comet.scale = (400, 140, 1)
    comet.rotation_euler = (cdir.to_track_quat('-Z', 'Y').to_euler())
    comet.rotation_euler.rotate_axis('Z', math.radians(-24))
    comet.visible_shadow = False

# Bronze sconces with live flames down the tunnel.
for i, y in enumerate(range(-36, -112, -11)):
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=.08, radius2=.2, depth=.26, location=(sx * 3.3, y, 4.35))
        cup = bpy.context.active_object
        cup.data.materials.append(bronze)
        flame((sx * 3.3, y, 4.46), .42, 320, shadow=False)
glow = link(bpy.data.objects.new('PoolBounce', bpy.data.lights.new('PoolBounce', 'POINT')))
glow.data.energy = float(ARGS.get('bouncek', 900))
glow.data.shadow_soft_size = 1.2
glow.data.color = (1.0, .8, .6)
glow.location = FIG + Vector((0, 0, .35))
fill = link(bpy.data.objects.new('ArenaFill', bpy.data.lights.new('ArenaFill', 'POINT')))
fill.data.energy = float(ARGS.get('fillk', 0 if DAY else 4.2e4))
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
AMB = float(ARGS.get('amb', .8 if DAY else 1.1))
for f, k in (() if LOOP else ((IN0, 1.0), (IN1, 0.0))):
    bg.inputs['Strength'].default_value = float(ARGS.get('skyk', .5 if DAY else .9)) * k + AMB * (1 - k)
    bg.inputs['Strength'].keyframe_insert('default_value', frame=f)
    fac = NT.inp(amb, 'Factor_Float')
    fac.default_value = 1 - k
    fac.keyframe_insert('default_value', frame=f)
    sun.data.energy = float(ARGS.get('sunk', 12.0 if DAY else 9.0)) * k
    sun.data.keyframe_insert('energy', frame=f)
bg.inputs['Strength'].default_value = AMB if LOOP else float(ARGS.get('skyk', .5 if DAY else .9))
sun.data.energy = 0.0 if LOOP else float(ARGS.get('sunk', 12.0 if DAY else 9.0))
if LOOP:
    NT.inp(amb, 'Factor_Float').default_value = 1.0

cam = link(bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')))
sc.camera = cam
cam.data.sensor_fit = 'AUTO'
cam.data.sensor_width = 36
cam.data.clip_start = .1
cam.data.clip_end = 5000
frames = []
for f in (range(NF) if not LOOP else []):
    pos, look, lens = hermite(f / FPS)
    cam.location = pos
    q = (look - pos).to_track_quat('-Z', 'Y')
    cam.rotation_euler = q.to_euler()
    cam.data.lens = lens
    cam.keyframe_insert('location', frame=f + 1)
    cam.keyframe_insert('rotation_euler', frame=f + 1)
    cam.data.keyframe_insert('lens', frame=f + 1)
    frames.append({'p': [round(c, 4) for c in pos], 'q': [round(c, 6) for c in (q.w, q.x, q.y, q.z)], 'lens': round(lens, 4)})
for fc in (fcurves_of(cam) if cam.animation_data else []):
    for kp in fc.keyframe_points:
        kp.interpolation = 'LINEAR'
sc.frame_start, sc.frame_end = 1, NF
if LOOP:
    pos, look, lens = hermite(TOTAL)
    cam.location, cam.data.lens = pos, lens
    cam.rotation_euler = (look - pos).to_track_quat('-Z', 'Y').to_euler()
    sc.frame_start, sc.frame_end = 0, LOOP_T - 1
sc.render.fps = FPS

meta = {'fps': FPS, 'frames': frames, 'sensor': 36, 'sphere': {'c': [0, 0, CZ], 'rin': RIN}, 'hole': list(HOLE), 'fig': list(FIG)}
if not LOOP:
    with open(ARGS.get('meta', 'camera.json'), 'w') as fh:
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
fk = N.new('ShaderNodeMath'); fk.operation = 'MULTIPLY'; fk.inputs[1].default_value = float(ARGS.get('fog', .2 if DAY else .42))
ng.links.new(rl.outputs['Mist'], fk.inputs[0])
fog = N.new('ShaderNodeMix'); fog.data_type = 'RGBA'
ng.links.new(fk.outputs[0], NT.inp(fog, 'Factor_Float'))
ng.links.new(rl.outputs['Image'], NT.inp(fog, 'A_Color'))
NT.inp(fog, 'B_Color').default_value = (.66, .72, .8, 1) if DAY else (.42, .36, .36, 1)
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
