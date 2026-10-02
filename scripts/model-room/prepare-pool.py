"""Prepare the supplied Pool 18 OBJ as a compact architectural model.
Usage: blender -b --factory-startup --python scripts/model-room/prepare-pool.py -- "source directory"
OBJ carries one black wire material. These PBR assignments reinterpret the source surfaces.
Source coordinate units are preserved in metadata; display geometry is normalized to 3.6m depth.
"""
import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector
BASE=Path(sys.argv[sys.argv.index('--')+1]);ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).resolve().parent))
from bake_ao import bake_ao
OUT=ROOT/'public/models/archive';OUT.mkdir(parents=True,exist_ok=True)
ART=ROOT/'artifacts/pool-18';ART.mkdir(parents=True,exist_ok=True)
STATS={}
def mat(name,color,rough=.6,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)];rgb=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
 p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m

def texture(m,file,limit,alpha=None):
 im=bpy.data.images.load(str(BASE/'Maps'/file),check_existing=True);w,h=im.size;k=min(1,limit/max(w,h));im.scale(int(w*k),int(h*k));nt=m.node_tree;p=nt.nodes.get('Principled BSDF');n=nt.nodes.new('ShaderNodeTexImage');n.image=im;nt.links.new(n.outputs['Color'],p.inputs['Base Color'])
 if alpha:
  a=bpy.data.images.load(str(BASE/'Maps'/alpha));a.scale(int(w*k),int(h*k));a.colorspace_settings.name='Non-Color';n=nt.nodes.new('ShaderNodeTexImage');n.image=a;nt.links.new(n.outputs['Color'],p.inputs['Alpha']);m.surface_render_method='DITHERED'

def build(mobile):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.wm.obj_import(filepath=str(BASE/'pool 18.obj'))
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH'];source=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objs)
 pts=[o.matrix_world@Vector(v) for o in objs for v in o.bound_box];lo=Vector([min(v[i] for v in pts) for i in range(3)]);hi=Vector([max(v[i] for v in pts) for i in range(3)]);scale=3.6/(hi.y-lo.y);offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 mats={'stone':mat('Limestone terrace','#d8d5c9'), 'wood':mat('Warm timber pergola','#7a5940'), 'cloth':mat('Ivory outdoor upholstery','#dfdfcc',.95),'leaf':mat('Garden foliage','#527449',.85),'palm':mat('Palm canopy','#4c6a37',.85),'bark':mat('Tree bark','#584536',.9),'water':mat('Pool water','#288f9e',.19,.32),'steel':mat('Brushed steel spillways','#aebbbb',.25,.8),'dark':mat('Graphite furniture frames','#343e3a',.4,.35),'tile':mat('Pool tiles','#99b8b6',.4),'fire':mat('Fire bowl','#433b34',.75),'soil':mat('Planting beds','#3c4935',.97)}
 limit=512 if mobile else 1024
 texture(mats['stone'],'p_concrete_tiles_Diffuse.jpg',limit)
 texture(mats['wood'],'Outdoor set - wood  d.jpg',limit)
 texture(mats['cloth'],'KW_Emmett_Settee_Fabric_2_D.jpg',limit)
 texture(mats['leaf'],'EasternRedbud_front_Summer.jpg',512,'EasternRedbud_front_Spring_Opacity.jpg')
 for o in objs:
  n=o.name;center=o.matrix_world@Vector([sum(v[i] for v in o.bound_box)/8 for i in range(3)]);size=o.dimensions
  key='stone'
  if n.startswith('EasternRedbud'):key='leaf'
  elif n.startswith('Bark'):key='bark'
  elif n=='Sample_Palm':key='palm'
  elif n.startswith('Phoenix') or n in ('Plane002','Plane003','Plane004','Plane005','Object3479','Object3490'):key='water'
  elif n in ('Line300019911','Object3437'):key='tile'
  elif n in ('Box498765','Box498766'):key='soil'
  elif n.startswith('Pattern') or n=='Box060' or n.startswith('default') or n in ('Object006','Object3482','Object3483','Object3484','Box013.001','Box498769'):key='cloth'
  elif n.startswith('Rectangle') and center.y>900: key='wood'
  elif n in ('Line003','Line219','Rectangle001') or (center.y>900 and center.z>330):key='wood'
  elif n.startswith('Rectangle') and center.y<900:key='steel'
  elif n.startswith('Cylinder') or n.startswith('Sphere') or (n.startswith('Line') and center.y<0):key='dark'
  elif n.startswith('Plane') or n in ('Forest002','Line005','Box498689'):key='fire'
  elif center.y<0 and size.x<200 and size.y<250:key='dark'
  o.data.materials.clear();o.data.materials.append(mats[key])
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  # Weld the OBJ's split vertices before decimating; palm and furniture dominate the source.
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.001);bpy.ops.object.mode_set(mode='OBJECT')
  count=sum(len(p.vertices)-2 for p in o.data.polygons)
  if count>1500:
   dec=o.modifiers.new('Web budget','DECIMATE');dec.ratio=(.035 if mobile else .16) if n=='Sample_Palm' else (.075 if mobile else .32);dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
  bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
  for v in o.data.vertices:v.co=(v.co-offset)*scale
  bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
 # Consolidate by material, keeping independently selectable surfaces.
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
 for o in bpy.context.scene.objects:
  if o.type=='MESH':o.name='Pool | '+o.data.materials[0].name
 # Occlusion baked into vertex colours (not for the water or the alpha-cut leaves, which stay clean).
 bake_ao([o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0].name not in ('Pool water','Garden foliage')])
 bpy.ops.object.select_all(action='SELECT')
 filename='pool-18'+('.mobile' if mobile else '')+'.glb'
 bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_vertex_color='ACTIVE',export_all_vertex_colors=False,export_format='GLB',export_yup=True,export_apply=True,export_image_format='WEBP',export_image_quality=78,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=14)
 STATS['mobile' if mobile else 'desktop']={'sourceTriangles':source,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'),'bytes':(OUT/filename).stat().st_size,'displayDimensions':list((hi-lo)*scale),'sourceBounds':list(hi-lo),'materialNote':'PBR reconstruction from one black OBJ material; source texture assignments were not preserved.'}
 if not mobile:
  bpy.ops.wm.save_as_mainfile(filepath=str(ART/'pool-web.blend'));render()

def render():
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.world=bpy.data.worlds.new('Studio');s.world.color=(.3,.3,.3)
 floor=mat('Studio floor','#babfb8',.8);bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));bpy.context.object.data.materials.append(floor)
 for pos,power in [((2,-3,6),650),((-4,-1,4),400),((0,4,5),650)]:
  d=bpy.data.lights.new('Softbox','AREA');d.energy=power;d.size=5;o=bpy.data.objects.new('Softbox',d);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.4))-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('Camera');o=bpy.data.objects.new('Camera',d);s.collection.objects.link(o);s.camera=o;d.type='ORTHO';d.ortho_scale=4.7;o.location=(3.4,-4.5,4.4);o.rotation_euler=(Vector((0,0,.4))-o.location).to_track_quat('-Z','Y').to_euler()
 s.render.resolution_x=1000;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.render.filepath=str(ART/'pool-preview.png');bpy.ops.render.render(write_still=True)
build(False);build(True);(OUT/'pool-18.json').write_text(json.dumps(STATS,indent=2),encoding='utf8');print('POOL_COMPLETE',json.dumps(STATS))
