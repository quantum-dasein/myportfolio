"""Build Gym equipment 03 for the on-demand Model Room archive.
blender -b --factory-startup --python scripts/model-room/prepare-gym.py -- "source directory"
Corona shaders do not survive the supplied FBX: this is a documented PBR interpretation.
Original meshes, UVs and metre dimensions are retained. No MAX or source photos are published.
"""
import bpy, sys, json, re, math
from pathlib import Path
from mathutils import Vector

BASE=Path(sys.argv[sys.argv.index('--')+1])
sys.path.insert(0,str(Path(__file__).resolve().parent))
from bake_ao import bake_ao
PROJECT=Path(__file__).resolve().parents[2]
OUT=PROJECT/'public/models/archive';OUT.mkdir(parents=True,exist_ok=True)
ART=PROJECT/'artifacts/gym-equipment';ART.mkdir(parents=True,exist_ok=True)
stats={}

def material(name,color,rough=.5,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True
 rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)];rgb=[x/12.92 if x<.04045 else ((x+.055)/1.055)**2.4 for x in rgb]
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m

def build(mobile):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.fbx(filepath=str(BASE/'export/Gym-equipment-03-2016-Corona-fbx.fbx'))
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
 for o in list(bpy.context.scene.objects):
  if o not in objs:bpy.data.objects.remove(o,do_unlink=True)
 for o in objs:
  mw=o.matrix_world.copy();o.parent=None;o.matrix_world=mw
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=objs[0]
 bpy.ops.object.make_single_user(type='ALL',object=True,obdata=True)
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 mats={
 'oak':material('Oak cabinet','#b88753',.65), 'rungs':material('Pale wood rungs','#cfb385',.52),
 'rubber':material('Black rubber weights','#202627',.82), 'steel':material('Brushed steel','#a4aaa7',.3,.9),
 'strap':material('Woven suspension straps','#77736b',.9), 'dark':material('Coated fittings','#333938',.42,.45),
 'brown':material('Dumbbell grips','#4a3830',.75), 'white':material('Bottle labels','#eee8da',.7),
 'bottle':material('Bottles','#70654f',.44),
 }
 img=bpy.data.images.load(str(BASE/'maps/Gym-equipment-03-002.jpg'));w,h=img.size;k=min(1,(1024 if mobile else 2048)/max(w,h));img.scale(int(w*k),int(h*k))
 oak=mats['oak'];node=oak.node_tree.nodes.new('ShaderNodeTexImage');node.image=img;oak.node_tree.links.new(node.outputs['Color'],oak.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 source_triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objs)
 for o in objs:
  for slot in o.material_slots:
   name=slot.material.name if slot.material else '';match=re.search(r'03-(\d+)',name);idx=int(match.group(1)) if match else 3
   if idx==1:key='rungs'
   elif idx==2:key='oak'
   elif idx in (4,16,19,31,33,34,36,44):key='steel'
   elif 6<=idx<=13:key='strap'
   elif idx in (18,29,30):key='brown'
   elif idx==38:key='white'
   elif idx in (39,41,42):key='bottle'
   elif idx in (3,15,17,21,22,26,27,37,43):key='rubber'
   else:key='dark'
   slot.material=mats[key]
  n=sum(len(p.vertices)-2 for p in o.data.polygons)
  if n>1800:
   dec=o.modifiers.new('Web triangle budget','DECIMATE');dec.ratio=.115 if mobile else .45;dec.use_collapse_triangulate=True
   bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=dec.name)
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
 # Join, split by material, then collapse duplicate material slots to reduce draw calls.
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join()
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
 lo=Vector([min(v.co[i] for o in objs for v in o.data.vertices) for i in range(3)])
 hi=Vector([max(v.co[i] for o in objs for v in o.data.vertices) for i in range(3)])
 offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 for o in objs:
  for v in o.data.vertices:v.co-=offset
  # Remove FBX object unit metadata: glTF output is metres.
  material_name=o.data.materials[0].name if o.data.materials else 'part'
  fresh=bpy.data.objects.new('Gym | '+material_name,o.data);bpy.context.collection.objects.link(fresh);bpy.data.objects.remove(o,do_unlink=True)
 bpy.context.scene.unit_settings.scale_length=1
 # Occlusion baked into vertex colours: depth in the shelves and between the weights, free at run time.
 bake_ao([o for o in bpy.context.scene.objects if o.type=='MESH'])
 bpy.ops.object.select_all(action='SELECT')
 filename='gym-equipment-03'+('.mobile' if mobile else '')+'.glb'
 bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_vertex_color='ACTIVE',export_all_vertex_colors=False,export_format='GLB',export_yup=True,export_apply=True,export_image_format='WEBP',export_image_quality=80,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=14,export_extras=True)
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 stats['mobile' if mobile else 'desktop']={'sourceTriangles':source_triangles,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'drawMeshes':len(meshes),'dimensionsMetres':list(hi-lo),'bytes':(OUT/filename).stat().st_size,'materialNote':'PBR interpretation; source FBX contains no texture links. Original wood image reconnected; other surfaces use semantic PBR materials.'}
 if not mobile:
  bpy.ops.wm.save_as_mainfile(filepath=str(ART/'gym-web.blend'))
  render()

def render():
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.world=bpy.data.worlds.new('Studio');s.world.color=(.23,.23,.23)
 floor=material('Studio floor','#ddd7cc',.8);bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.003));bpy.context.object.data.materials.append(floor)
 for pos,power in [((2,-3,5),420),((-3,-2,3),300),((0,3,4),420)]:
  d=bpy.data.lights.new('Softbox','AREA');d.energy=power;d.size=4;o=bpy.data.objects.new('Softbox',d);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('Camera');o=bpy.data.objects.new('Camera',d);s.collection.objects.link(o);s.camera=o;d.type='ORTHO';d.ortho_scale=2.75;o.location=(2.8,-5,2.65);o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
 s.render.resolution_x=1000;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.render.filepath=str(ART/'gym-preview.png');bpy.ops.render.render(write_still=True)

build(False);build(True)
(OUT/'gym-equipment-03.json').write_text(json.dumps(stats,indent=2),encoding='utf8');print('GYM_COMPLETE',json.dumps(stats))
