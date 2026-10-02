"""Ambient occlusion baked into vertex colours, for the archive models.

The room lights these works with a couple of lamps and no global illumination, so creases, undersides and
the gaps between parts read flat. Blender's Cycles bakes the occlusion once; glTF carries it as COLOR_0 and
three.js multiplies it into the base colour. It costs nothing at run time.

Call `bake_ao(objects)` after the meshes have their final topology (decimated, joined) and before export,
and export with `export_vertex_color='ACTIVE'`.
"""
import bpy


def bake_ao(objects, samples=24, floor=.34, distance=0.0):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.render.bake.use_selected_to_active = False
    scene.render.bake.target = 'VERTEX_COLORS'
    if scene.world is None:
        scene.world = bpy.data.worlds.new('AO world')
    # How far a surface looks for occluders: 0 is unlimited.
    scene.world.light_settings.distance = distance
    done = 0
    for o in objects:
        if o.type != 'MESH' or not o.data.polygons:
            continue
        me = o.data
        for a in list(me.color_attributes):
            me.color_attributes.remove(a)
        attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        me.color_attributes.active_color = attr
        me.color_attributes.render_color_index = 0
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
        # Occlusion as a gentle multiplier: never darker than `floor`, open surfaces stay at full colour.
        for d in me.color_attributes['Col'].data:
            v = floor + (1 - floor) * min(1.0, d.color[0] * 1.08)
            d.color = (v, v, v, 1)
        done += 1
    print('AO_BAKED', done)
