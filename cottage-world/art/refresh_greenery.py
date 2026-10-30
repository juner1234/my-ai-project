"""Fill the three existing tree crowns, preserving tree transforms and all flowers.
Leaf geometry stays shared across instances. Repeated execution does not multiply it.
"""
import bpy,math,random,sys,json
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'art'))
from greenery_materials import apply
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'cottage_source.blend'))
rng=random.Random(7112);seen=set();report=[]
for obj in list(bpy.data.objects):
 if obj.type!='MESH' or not obj.name.startswith('Landscape ') or 'leaves' not in obj.name or 'shrub' in obj.name:continue
 mesh=obj.data
 if mesh.as_pointer() in seen:continue
 seen.add(mesh.as_pointer())
 if mesh.get('verdant_density_version')==1:
  report.append({'mesh':mesh.name,'leaves_before':mesh['leaves_before'],'leaves_after':mesh['leaves_after']});continue
 assert len(mesh.vertices)%6==0
 leaf_count=len(mesh.vertices)//6
 components=[[] for _ in range(leaf_count)]
 for poly in mesh.polygons:
  group=poly.vertices[0]//6
  assert all(index//6==group for index in poly.vertices),'Expected connected six-vertex Sapling leaf'
  components[group].append(poly)
 verts=[];faces=[];materials=[];uvs=[]
 old_uv=mesh.uv_layers.active
 def append_leaf(group,offset,angle,scale):
  ids=list(range(group*6,group*6+6));points=[mesh.vertices[i].co.copy() for i in ids]
  centre=sum(points,Vector())/6;normal=components[group][0].normal.normalized()
  rotation=Matrix.Rotation(angle,3,normal) if normal.length>.1 else Matrix.Identity(3)
  start=len(verts)
  verts.extend(centre+rotation@((p-centre)*scale)+offset for p in points)
  for poly in components[group]:
   faces.append(tuple(start+i-group*6 for i in poly.vertices));materials.append(poly.material_index)
   uvs.append([tuple(old_uv.data[i].uv) for i in poly.loop_indices] if old_uv else None)
 added=0
 for group in range(leaf_count):
  append_leaf(group,Vector(),0,1.12)
  if rng.random()<.8:
   # Local, irregular clusters fill branch gaps without creating another tree row.
   offset=Vector((rng.uniform(-.13,.13),rng.uniform(-.13,.13),rng.uniform(-.08,.10)))
   append_leaf(group,offset,rng.uniform(-.65,.65),rng.uniform(.94,1.12));added+=1
 replacement=bpy.data.meshes.new(mesh.name+' verdant');replacement.from_pydata(verts,[],faces);replacement.update()
 for mat in mesh.materials:replacement.materials.append(mat)
 uv=replacement.uv_layers.new(name='UVMap') if old_uv else None
 for poly,index,coords in zip(replacement.polygons,materials,uvs):
  poly.material_index=index;poly.use_smooth=True
  if uv:
   for loop,coord in zip(poly.loop_indices,coords):uv.data[loop].uv=coord
 replacement['verdant_density_version']=1;replacement['leaves_before']=leaf_count;replacement['leaves_after']=leaf_count+added
 # Replace all references together: no extra draw instances or duplicate tree positions.
 for instance in bpy.data.objects:
  if instance.type=='MESH' and instance.data==mesh:instance.data=replacement
 seen.add(replacement.as_pointer())
 report.append({'mesh':replacement.name,'leaves_before':leaf_count,'leaves_after':leaf_count+added})
scene=bpy.context.scene;scene['verdant_foliage']=True;apply(scene,'day')
(ROOT/'art/greenery_report.json').write_text(json.dumps({'tree_meshes':report,'daylight_palette':True,'tree_positions_changed':False,'night_palette_preserved':True},indent=2))
bpy.ops.file.make_paths_relative();bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'cottage_source.blend'),compress=True)
print('VERDANT_FOLIAGE_COMPLETE',report)
