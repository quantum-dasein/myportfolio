# A small importer for FBX 6.1 files (3ds Max, around 2010), which Blender's own importer refuses.
# It reuses Blender's low-level FBX reader (any version) and rebuilds meshes, UVs, per-polygon materials
# (diffuse colour and opacity) and the model hierarchy with 3ds Max's pre-rotations and geometric offsets.
import bpy, mathutils, math
from collections import defaultdict
from io_scene_fbx import parse_fbx


def _child(elem, name):
    return next((e for e in elem.elems if e.id == name), None)


def _arr(elem):
    """FBX 7 packs arrays into one property; FBX 6 writes every value as its own property."""
    if elem is None: return []
    if len(elem.props) == 1 and not isinstance(elem.props[0], (int, float)): return list(elem.props[0])
    return list(elem.props)


def _props60(elem):
    out = {}
    block = _child(elem, b'Properties60')
    for p in block.elems if block else []:
        out[p.props[0]] = p.props[3:] if len(p.props) > 3 else ()
    return out


def _vec(props, key, default):
    v = props.get(key)
    return mathutils.Vector([float(x) for x in v[:3]]) if v and len(v) >= 3 else mathutils.Vector(default)


def _name(raw):
    return raw.split(b'\x00\x01')[0].decode('utf-8', 'replace').strip() or 'part'


def _local_matrix(props):
    """FBX transform: T * Roff * Rp * Rpre * R * Rpost^-1 * Rp^-1 * Soff * Sp * S * Sp^-1 (XYZ Euler, degrees)."""
    M = mathutils.Matrix
    T = M.Translation(_vec(props, b'Lcl Translation', (0, 0, 0)))
    Roff = M.Translation(_vec(props, b'RotationOffset', (0, 0, 0)))
    Rp = M.Translation(_vec(props, b'RotationPivot', (0, 0, 0)))
    rot = lambda key: mathutils.Euler([math.radians(a) for a in _vec(props, key, (0, 0, 0))], 'XYZ').to_matrix().to_4x4()
    Soff = M.Translation(_vec(props, b'ScalingOffset', (0, 0, 0)))
    Sp = M.Translation(_vec(props, b'ScalingPivot', (0, 0, 0)))
    s = _vec(props, b'Lcl Scaling', (1, 1, 1)); S = M.Diagonal((s.x, s.y, s.z, 1))
    return T @ Roff @ Rp @ rot(b'PreRotation') @ rot(b'Lcl Rotation') @ rot(b'PostRotation').inverted() @ Rp.inverted() @ Soff @ Sp @ S @ Sp.inverted()


def _geometric_matrix(props):
    M = mathutils.Matrix
    g = _vec(props, b'GeometricScaling', (1, 1, 1))
    return (M.Translation(_vec(props, b'GeometricTranslation', (0, 0, 0)))
            @ mathutils.Euler([math.radians(a) for a in _vec(props, b'GeometricRotation', (0, 0, 0))], 'XYZ').to_matrix().to_4x4()
            @ M.Diagonal((g.x, g.y, g.z, 1)))


def load(path):
    root, version = parse_fbx.parse(path)
    objects, connections = _child(root, b'Objects'), _child(root, b'Connections')
    models, materials = {}, {}
    for e in objects.elems:
        if e.id == b'Model' and len(e.props) > 1 and e.props[1] == b'Mesh' and _child(e, b'Vertices'): models[e.props[0]] = e
        elif e.id == b'Material': materials[e.props[0]] = e
    parent, mats_of = {}, defaultdict(list)
    for c in connections.elems if connections else []:
        if c.id != b'Connect' or c.props[0] != b'OO': continue
        a, b = c.props[1], c.props[2]
        if a in materials and b in models: mats_of[b].append(a)
        elif a in models: parent[a] = b

    made = {}
    for key, e in materials.items():
        p = _props60(e)
        m = bpy.data.materials.new(_name(key)); m.use_nodes = True
        bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        d = p.get(b'DiffuseColor') or p.get(b'Diffuse') or (.8, .8, .8)
        bsdf.inputs['Base Color'].default_value = (float(d[0]), float(d[1]), float(d[2]), 1)
        o = p.get(b'Opacity') or p.get(b'TransparencyFactor')
        if o is not None and len(o):
            alpha = float(o[0]) if p.get(b'Opacity') is not None else 1 - float(o[0])
            if alpha < .99: bsdf.inputs['Alpha'].default_value = alpha; m.blend_method = 'BLEND'
        made[key] = m

    world = {}
    def world_of(key):
        if key in world: return world[key]
        local = _local_matrix(_props60(models[key]))
        up = parent.get(key)
        world[key] = (world_of(up) if up in models else mathutils.Matrix.Identity(4)) @ local
        return world[key]

    count = 0
    for key, e in models.items():
        verts = _arr(_child(e, b'Vertices')); pvi = _arr(_child(e, b'PolygonVertexIndex'))
        faces, cur = [], []
        for i in pvi:
            if i < 0: cur.append(-i - 1); faces.append(cur); cur = []
            else: cur.append(i)
        mesh = bpy.data.meshes.new(_name(key))
        mesh.from_pydata([verts[i:i + 3] for i in range(0, len(verts), 3)], [], faces)
        uvl = _child(e, b'LayerElementUV')
        if uvl and _child(uvl, b'UV'):
            uv = _arr(_child(uvl, b'UV')); idx = _child(uvl, b'UVIndex')
            ref = _child(uvl, b'ReferenceInformationType').props[0]; mapping = _child(uvl, b'MappingInformationType').props[0]
            if mapping == b'ByPolygonVertex':
                layer = mesh.uv_layers.new(name='UVMap')
                ids = _arr(idx) if (idx and ref == b'IndexToDirect') else range(len(pvi))
                flat = []
                for j in ids: flat += uv[j * 2:j * 2 + 2] if j >= 0 else [0, 0]
                layer.data.foreach_set('uv', flat[:len(mesh.loops) * 2])
        for mk in mats_of[key]: mesh.materials.append(made[mk])
        mel = _child(e, b'LayerElementMaterial')
        if mel and mesh.materials:
            arr = _arr(_child(mel, b'Materials'))
            if _child(mel, b'MappingInformationType').props[0] == b'ByPolygon' and len(arr) == len(mesh.polygons):
                mesh.polygons.foreach_set('material_index', [min(a, len(mesh.materials) - 1) for a in arr])
        mesh.transform(_geometric_matrix(_props60(e)))
        mesh.validate(); mesh.update()
        obj = bpy.data.objects.new(_name(key), mesh); bpy.context.scene.collection.objects.link(obj)
        obj.matrix_world = world_of(key)
        count += 1
    # FBX 6 from 3ds Max is Y-up; Blender is Z-up.
    turn = mathutils.Matrix.Rotation(math.radians(90), 4, 'X')
    for o in bpy.context.scene.objects: o.matrix_world = turn @ o.matrix_world
    print('FBX6', version, 'models', count, 'materials', len(made))
