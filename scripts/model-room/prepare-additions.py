"""Prepare bronze FBX and fountain OBJ for the on-demand archive.
Run with Blender: --python scripts/model-room/prepare-additions.py -- bronze|fountains SOURCE
Materials are web PBR reconstructions; Corona/VRay scatter is not embedded in OBJ.
"""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
KIND,source=sys.argv[sys.argv.index('--')+1:];BASE=Path(source);ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/models/archive';ART=ROOT/'artifacts/new-models';ART.mkdir(parents=True,exist_ok=True)
ID='bronze-woman' if KIND=='bronze' else 'waterfall-fountains';STATS={}
sys.path.insert(0,str(Path(__file__).resolve().parent))
from bake_ao import bake_ao
def material(name,color,rough=.6,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)];rgb=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb];p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m

def tex(m,path,limit,slot='Base Color',bronze=False):
 im=bpy.data.images.load(str(path));w,h=im.size;k=min(1,limit/max(w,h));im.scale(round(w*k),round(h*k))
 if bronze:
  import numpy as np
  pix=np.empty(len(im.pixels),dtype=np.float32);im.pixels.foreach_get(pix);rgba=pix.reshape(-1,4);g=rgba[:,:3].mean(axis=1);patina=np.clip((.46-g)*4,0,.55)[:,None];rgba[:,:3]=np.array([.38,.205,.085])*(.65+g[:,None])*(1-patina)+np.array([.08,.23,.16])*patina;im.pixels.foreach_set(pix);im.update()
 if slot!='Base Color':im.colorspace_settings.name='Non-Color'
 im.pack();nt=m.node_tree;n=nt.nodes.new('ShaderNodeTexImage');n.image=im;nt.links.new(n.outputs['Color'],nt.nodes.get('Principled BSDF').inputs[slot])

def build(mobile):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 if KIND=='bronze':bpy.ops.import_scene.fbx(filepath=str(BASE/'export/Statuea Jenshini v bronze.FBX'))
 else:
  bpy.ops.wm.obj_import(filepath=str(BASE/'OBJ.obj'));o=bpy.context.object;bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH'];source_tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objs)
 if KIND=='fountains':
  # Buried, detached source scatter samples sit far outside the three fountains.
  for o in objs[:]:
   if o.data.materials[0].name=='wire_225088199':bpy.data.objects.remove(o,do_unlink=True);objs.remove(o)
 pts=[o.matrix_world@Vector(v) for o in objs for v in o.bound_box];lo=Vector([min(v[i] for v in pts) for i in range(3)]);hi=Vector([max(v[i] for v in pts) for i in range(3)]);scale=(2.15/(hi.z-lo.z)) if KIND=='bronze' else 3.65/(hi.x-lo.x);offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));limit=512 if mobile else 1024
 if KIND=='bronze':
  bronze=material('Aged bronze','#896537',.4,.86);tex(bronze,BASE/'maps/episcura_textures_metal_raw_9849_m_Fixed.jpg',limit,bronze=True)
 else:
  stone=material('Weathered concrete','#b9b8ac',.83);tex(stone,BASE/'TEXTURE/HS_ Concrete 3K.jpg',limit)
  water=material('Pool water','#529f9e',.2,.4)
  rim=material('Pale stone basin','#bcbeb1',.7);tex(rim,BASE/'TEXTURE/HS_ Concrete 3K.jpg',limit)
 for o in objs:
  old=o.data.materials[0].name
  m=bronze if KIND=='bronze' else (water if old in ('wire_056056242','wire_148177027','wire_007007007') else rim if old=='wire_028149177' else stone)
  o.data.materials.clear();o.data.materials.append(m)
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.00001 if KIND=='bronze' else .001);bpy.ops.object.mode_set(mode='OBJECT')
  count=sum(len(p.vertices)-2 for p in o.data.polygons)
  if count>2000:
   dec=o.modifiers.new('Web budget','DECIMATE');dec.ratio=(.23 if mobile else .95) if KIND=='bronze' else ((.018 if mobile else .07) if old=='wire_056056242' else (.22 if mobile else .72));dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
  bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
  for v in o.data.vertices:v.co=(v.co-offset)*scale
  bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35));o.name=ID+' | '+m.name
  # Drop FBX custom metadata after applying the object transform.
  for key in list(o.keys()):del o[key]
 # Occlusion baked into vertex colours: the folds of the drapery, the bowls' rims.
 bake_ao([o for o in objs if o.data.materials[0].name!='Pool water'])
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 filename=ID+('.mobile' if mobile else '')+'.glb'
 bpy.ops.export_scene.gltf(filepath=str(OUT/filename),use_selection=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False,export_format='GLB',export_yup=True,export_apply=True,export_image_format='WEBP',export_image_quality=82,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=14)
 STATS['mobile' if mobile else 'desktop']={'sourceTriangles':source_tris,'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objs),'bytes':(OUT/filename).stat().st_size,'displayDimensions':list((hi-lo)*scale),'materialNote':'PBR reconstruction from supplied geometry and textures. Corona scatter is not present in OBJ.' if KIND=='fountains' else 'Bronze PBR reconstruction using the supplied surface texture.'}
 if not mobile:render()
def render():
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.world=bpy.data.worlds.new('Studio');s.world.color=(.3,.3,.3)
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.02));bpy.context.object.data.materials.append(material('Studio floor','#b6bdb7',.8))
 for pos,power in [((2,-3,6),750),((-4,-1,4),500),((0,4,5),900)]:
  d=bpy.data.lights.new('Softbox','AREA');d.energy=power;d.size=4;o=bpy.data.objects.new('Softbox',d);s.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.8))-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('Camera');o=bpy.data.objects.new('Camera',d);s.collection.objects.link(o);s.camera=o;d.type='ORTHO';d.ortho_scale=2.8 if KIND=='bronze' else 4.4;o.location=(3,-5,2.8) if KIND=='bronze' else (1,-4.5,4.2);o.rotation_euler=(Vector((0,0,1.05 if KIND=='bronze' else .15))-o.location).to_track_quat('-Z','Y').to_euler();s.render.resolution_x=800;s.render.resolution_y=800;s.render.resolution_percentage=100;s.render.filepath=str(ART/(ID+'.png'));bpy.ops.render.render(write_still=True)
build(False);build(True);(OUT/(ID+'.json')).write_text(json.dumps(STATS,indent=2),encoding='utf-8');print('COMPLETE',json.dumps(STATS))
