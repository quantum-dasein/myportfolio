"""Convert supplied Humano BLEND and toy OBJ into lazy-loaded catalog assets.
Blender --background --python scripts/model-room/prepare-catalog-pair.py -- workers|toys SOURCE
Toy OBJ omits source multi-material assignments; plush PBR materials are reconstructed.
"""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/models/archive';ART=ROOT/'artifacts/catalog-pair';ART.mkdir(parents=True,exist_ok=True)
KIND,SOURCE=sys.argv[sys.argv.index('--')+1:];SOURCE=Path(SOURCE).resolve();ID='humano-workers' if KIND=='workers' else 'soft-toys-2';STATS={}
def mat(name,color,rough=.85):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;return m
def texture(m,path,limit,normal=False):
 im=bpy.data.images.load(str(path),check_existing=True)
 if max(im.size)>limit:
  k=limit/max(im.size);im.scale(round(im.size[0]*k),round(im.size[1]*k))
 im.pack();nt=m.node_tree;t=nt.nodes.new('ShaderNodeTexImage');t.image=im;p=nt.nodes.get('Principled BSDF')
 if normal:
  im.colorspace_settings.name='Non-Color';n=nt.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.25;nt.links.new(t.outputs['Color'],n.inputs['Color']);nt.links.new(n.outputs['Normal'],p.inputs['Normal'])
 else:nt.links.new(t.outputs['Color'],p.inputs['Base Color'])
def render(height):
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.world=bpy.data.worlds.new('Catalog studio');s.world.use_nodes=True;s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.22,.25,.24,1)
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));bpy.context.object.data.materials.append(mat('Studio floor',(.42,.46,.43)))
 for pos,power in [((2,-3,6),750),((-4,-1,4),500),((0,4,5),900)]:
  d=bpy.data.lights.new('Softbox','AREA');d.energy=power;d.size=4;o=bpy.data.objects.new('Softbox',d);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,height/2))-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('Camera');o=bpy.data.objects.new('Camera',d);s.collection.objects.link(o);s.camera=o;d.type='ORTHO';d.ortho_scale=3.5 if KIND=='workers' else 4.1;o.location=(3,-6,3.5) if KIND=='workers' else (1,-6,5.5);o.rotation_euler=(Vector((0,0,height*.4))-o.location).to_track_quat('-Z','Y').to_euler();s.render.resolution_x=800;s.render.resolution_y=800;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(ART/(ID+'.png'));bpy.ops.render.render(write_still=True)
def build(mobile):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 if KIND=='workers':bpy.ops.wm.open_mainfile(filepath=str(SOURCE),use_scripts=False)
 else:
  bpy.ops.wm.obj_import(filepath=str(SOURCE));bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
 # Freeze all world transforms before removing the source hierarchy.
 transforms=[(o,o.matrix_world.copy()) for o in objs]
 for o,world in transforms:
  o.data=o.data.copy();o.data.transform(world);o.parent=None;o.matrix_world=Matrix.Identity(4)
 bpy.context.view_layer.update()
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
 sourceTris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objs)
 if KIND=='workers':
  seen=set()
  for m in {m for o in objs for m in o.data.materials if m}:
   for n in m.node_tree.nodes:
    if n.type=='TEX_IMAGE' and n.image and n.image not in seen:
     im=n.image;seen.add(im);path=SOURCE.parent/'maps'/im.filepath.replace('\\','/').rsplit('/',1)[-1]
     if not path.exists():raise FileNotFoundError(path)
     space=im.colorspace_settings.name;im=bpy.data.images.load(str(path),check_existing=False);im.colorspace_settings.name=space;n.image=im;limit=(1024 if mobile else 2048) if 'Color' in path.name else (512 if mobile else 1024)
     if max(im.size)>limit:k=limit/max(im.size);im.scale(round(im.size[0]*k),round(im.size[1]*k))
     im.pack()
 else:
  brown=mat('Brown plush',(.24,.095,.05));texture(brown,SOURCE.parent/'Maps/KonPlush_diff.jpg',512 if mobile else 1024)
  cream=mat('Blue grey plush',(.20,.30,.36));pink=mat('Soft pink fabric',(.56,.3,.29));eyes=mat('Glossy toy eyes',(.009,.006,.004),.22)
  dark=mat('Black plush',(.015,.018,.022));white=mat('Ivory plush',(.48,.45,.40))
  for m in [brown,cream,dark,white]:texture(m,SOURCE.parent/'Maps/Plush_normal.jpg',512 if mobile else 1024,True)
  for o in objs:
   old=o.data.materials[o.data.polygons[0].material_index].name
   count=sum(len(p.vertices)-2 for p in o.data.polygons)
   if old=='wire_135059008':m=eyes if count==128 else dark if count in (6216,640,544) else pink if count==512 else brown
   elif old=='wire_228214153':m=eyes if count==160 else pink if count in (244,304) else cream
   else:m=eyes if count in (128,400) else dark if count in (358,188,366,304,576,678,130) else white
   o.data.materials.clear();o.data.materials.append(m)
   for p in o.data.polygons:p.material_index=0
 pts=[o.matrix_world@Vector(v) for o in objs for v in o.bound_box];lo=Vector([min(v[i] for v in pts) for i in range(3)]);hi=Vector([max(v[i] for v in pts) for i in range(3)]);scale=2/(hi.z-lo.z) if KIND=='workers' else 3.1/max(hi.x-lo.x,hi.y-lo.y);offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 for o in objs:
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  world=o.matrix_world.copy();o.parent=None;o.matrix_world=world;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
  for v in o.data.vertices:v.co=(v.co-offset)*scale
  if mobile and KIND=='toys' and len(o.data.polygons)>300:
   d=o.modifiers.new('Mobile detail','DECIMATE');d.ratio=.48;bpy.ops.object.modifier_apply(modifier=d.name)
  for p in o.data.polygons:p.use_smooth=True
  for k in list(o.keys()):del o[k]
 # Join the toy components to keep draw calls limited to the material count.
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0]
 if KIND=='toys':bpy.ops.object.join();objs=[bpy.context.object];objs[0].name='Soft toys collection'
 if KIND=='toys':
  sys.path.insert(0,str(Path(__file__).resolve().parent));from bake_ao import bake_ao
  bake_ao(objs)
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 file=OUT/(ID+('.mobile' if mobile else '')+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(file),use_selection=True,export_vertex_color='ACTIVE',export_format='GLB',export_yup=True,export_apply=True,export_image_format='WEBP',export_image_quality=85,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=14,export_animations=False)
 STATS['mobile' if mobile else 'desktop']=dict(sourceTriangles=sourceTris,triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objs),bytes=file.stat().st_size,displayDimensions=list((hi-lo)*scale),materials='Supplied Humano PBR materials and texture maps' if KIND=='workers' else 'Plush PBR reconstruction from supplied fabric maps; OBJ omits source multi-material assignments')
 if not mobile:render((hi.z-lo.z)*scale)
build(False);build(True);(OUT/(ID+'.json')).write_text(json.dumps(STATS,indent=2),encoding='utf-8');print('COMPLETE',json.dumps(STATS))
