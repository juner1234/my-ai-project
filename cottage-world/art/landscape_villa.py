"""Replace the rejected repeated tree field with a composed, extended villa landscape.
Sapling source is pinned in art/vendor; generated trees stay editable mesh assets.
"""
import bpy,ast,math,random,sys,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'art/vendor'))
import add_curve_sapling
add_curve_sapling.register()
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'cottage_source.blend'))
scene=bpy.context.scene;rng=random.Random(5104)
for obj in list(bpy.data.objects):
 if obj.name.startswith(('Forest Broadleaf tree','Forest Tree instance','Forest Shrub','Meadow grass','Landscape ')):
  bpy.data.objects.remove(obj,do_unlink=True)
leaves=[bpy.data.materials['Woodland leaf '+str(i)] for i in range(4)]
bark=bpy.data.materials['Woodland bark']
stone=bpy.data.materials['Old limestone']
def analytic_ground_height(x,y):
 edge=max(abs(x),abs(y));blend=max(0,min(1,(edge-20)/22));blend=blend*blend*(3-2*blend)
 hills=10*math.exp(-((x+40)**2+(y-55)**2)/1500)+17*math.exp(-((x-50)**2+(y-100)**2)/2800)+6*math.sin(x*.035+y*.02)**2
 return .04*math.sin(x*.7)*math.cos(y*.55)+blend*hills
# Project planting and path onto the actual exported triangle surface, not only the
# analytic height field; this prevents floating roots and interrupted path ribbons.
deps=bpy.context.evaluated_depsgraph_get()
surfaces=[]
for name in ['Terrain','Forest Terrain extension']:
 obj=bpy.data.objects.get(name)
 if obj:surfaces.append((BVHTree.FromObject(obj,deps),obj.matrix_world.copy(),obj.matrix_world.inverted()))
def ground_height(x,y):
 hits=[]
 for tree,matrix,inverse in surfaces:
  point,normal,index,distance=tree.ray_cast(inverse@Vector((x,y,500)),inverse.to_3x3()@Vector((0,0,-1)))
  if point is not None:hits.append((matrix@point).z)
 return max(hits) if hits else analytic_ground_height(x,y)
# Build branching trees with distinct silhouettes, rather than straight pole-and-crown meshes.
valid={p.identifier for p in bpy.ops.curve.tree_add.get_rna_type().properties}
def generate(preset,seed,scale,kind):
 params=ast.literal_eval(ast.parse((ROOT/'art/vendor/add_curve_sapling/presets'/f'{preset}.py').read_text()).body[0].value)
 params={k:v for k,v in params.items() if k in valid}
 params.update(seed=seed,scale=scale,scaleV=0,levels=3,branches=(0,28,10,4),segSplits=(.15,.2,.1,0),leaves=30,leafScale=.23,leafScaleX=.65,leafScaleV=.3,horzLeaves=False,bend=.35,showLeaves=True,bevel=True,bevelRes=1,resU=3)
 if kind=='willow':params.update(branches=(0,23,9,3),leaves=45,leafScale=.25,leafScaleX=.22,segSplits=(.05,.1,.1,0))
 if kind=='shrub':params.update(baseSize=.08,baseSplits=3,branches=(0,14,5,2),leaves=16,leafScale=.14,leafScaleX=.55,segSplits=(.05,.12,0,0))
 before=set(bpy.data.objects);bpy.context.scene.cursor.location=(0,0,0)
 bpy.ops.curve.tree_add(**params)
 new=list(set(bpy.data.objects)-before);parent=bpy.data.objects.new('Landscape '+kind+' template',None);bpy.context.collection.objects.link(parent)
 parts=[]
 for obj in new:
  if obj.type not in ['MESH','CURVE']:continue
  world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
  if obj.type=='CURVE':
   deps=bpy.context.evaluated_depsgraph_get();mesh=bpy.data.meshes.new_from_object(obj.evaluated_get(deps))
   replacement=bpy.data.objects.new('Landscape '+kind+' branching wood',mesh);bpy.context.collection.objects.link(replacement)
   replacement.matrix_world=obj.matrix_world;bpy.data.objects.remove(obj,do_unlink=True);obj=replacement
   obj.data.materials.append(bark)
  else:
   obj.name='Landscape '+kind+' leaves'
   for mat in leaves:obj.data.materials.append(mat)
   for face in obj.data.polygons:face.material_index=rng.choices(range(4),[4,5,3,1])[0]
  for poly in obj.data.polygons:poly.use_smooth=True
  obj.parent=parent;parts.append(obj)
 return parent,parts
maple=generate('japanese_maple',8,6.4,'maple')
maple2=generate('small_maple',34,7.2,'field maple')
willow=generate('weeping_willow',18,7.0,'willow')
shrub=generate('japanese_maple',25,1.6,'shrub')
def place(template,pos,scale=1,rotation=0,index=0):
 parent,parts=template
 if index==0:o=parent
 else:
  o=bpy.data.objects.new(parent.name+' group '+str(index),None);bpy.context.collection.objects.link(o)
  for part in parts:
   p=bpy.data.objects.new(part.name+' instance '+str(index),part.data);bpy.context.collection.objects.link(p);p.parent=o;p.matrix_local=part.matrix_local.copy()
 o.location=(pos[0],pos[1],ground_height(*pos));o.scale=(scale,scale,scale);o.rotation_euler.z=rotation
 return o
# Landscape groups are deliberately separated by a meadow and view corridor.
# Left garden group; right lakeside willow; rear groups step down into the valley.
tree_plan=[
 (0,(-11,3),1.1,.8),(1,(-16,8),1.15,-.3),(0,(-20,4),.85,2.1),
 (2,(13,-1),1.0,-.4),
 (1,(11,12),1.4,.3),(0,(17,17),1.05,1.4),(1,(15,24),1.25,2.4),
 (0,(-29,25),1.4,.4),(1,(-34,30),1.1,2.1),(0,(-32,37),.9,1.2),
 (1,(33,44),1.45,.3),(0,(39,48),1.2,1.8),(1,(36,57),.9,2.8)]
counts=[0,0,0]
for kind,pos,scale,rotation in tree_plan:
 place([maple,maple2,willow][kind],pos,scale,rotation,counts[kind]);counts[kind]+=1
shrub_positions=[(-5.7,-3.8),(-6.5,-2),(-8,1),(-9.4,2.8),(-12,5),(5.4,3.5),(7,7),(10,9),(12,10),(10.5,-3.5),(12,-4.8),(11.5,-6.3),(-26,24),(-28,27),(31,43),(34,47)]
for i,p in enumerate(shrub_positions):place(shrub,p,rng.uniform(.7,1.2),rng.uniform(0,math.tau),i)
# The approach path continues past the foreground, loops through the meadow and recedes.
controls=[Vector(p) for p in [(-1.05,-12.1),(-5,-18),(-15,-23),(-24,-12),(-22,8),(-27,29),(-43,58),(-58,91)]]
points=[]
for k in range(len(controls)-1):
 p0=controls[max(0,k-1)];p1=controls[k];p2=controls[k+1];p3=controls[min(len(controls)-1,k+2)]
 for j in range(48):
  t=j/48;points.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t))
points.append(controls[-1])
path_mat=bpy.data.materials.get('Natural earth path') or bpy.data.materials.new('Natural earth path');path_mat.use_nodes=True
bs=path_mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.18,.145,.095,1);bs.inputs['Roughness'].default_value=.98
verts=[];faces=[]
for i,p in enumerate(points):
 direction=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized();side=Vector((-direction.y,direction.x));width=.68+.08*math.sin(i*.4)
 for sign in [-1,1]:
  q=p+side*width*sign;verts.append((q.x,q.y,ground_height(q.x,q.y)+.075))
 if i:faces.append((2*i-2,2*i,2*i+1,2*i-1))
mesh=bpy.data.meshes.new('Meandering path');mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new('Landscape Meadow path',mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(path_mat)
for face in mesh.polygons:face.use_smooth=True
# Shared curved grass clumps fade out organically, removing the old square lawn edge.
path_samples=points
grass_meshes=[]
for variant in range(3):
 vs=[];fs=[];mi=[]
 for j in range(85):
  a=rng.uniform(0,math.tau);r=math.sqrt(rng.random())*.8;x=math.cos(a)*r;y=math.sin(a)*r
  h=rng.uniform(.10,.34);w=rng.uniform(.012,.026);ang=rng.random()*math.tau
  side=Vector((math.cos(ang)*w,math.sin(ang)*w,0));base=Vector((x,y,0));bend=Vector((math.sin(ang)*.08,math.cos(ang)*.06,0))
  points=[base-side,base+side,base+side*.4+bend*.5+Vector((0,0,h*.55)),base+bend+Vector((0,0,h)),base-side*.4+bend*.5+Vector((0,0,h*.55))]
  offset=len(vs);vs.extend(points);fs.append(tuple(range(offset,offset+5)));mi.append(rng.choices(range(4),[4,5,2,1])[0])
 mesh=bpy.data.meshes.new('Natural meadow tuft '+str(variant));mesh.from_pydata(vs,[],fs);mesh.update()
 for m in leaves:mesh.materials.append(m)
 for f,m in zip(mesh.polygons,mi):f.material_index=m
 grass_meshes.append(mesh)
meadow_count=0
candidates=[(rng.uniform(-17,17),rng.uniform(-17,19)) for _ in range(1600)]
candidates += [(rng.uniform(-42,42),rng.uniform(-35,48)) for _ in range(1300)]
for x,y in candidates:
 distance=math.hypot(x,y)
 if distance>43 or (distance>18 and rng.random()>(43-distance)/35):continue
 if abs(x)<4.8 and -5.2<y<4.3:continue
 if abs(x+1.05)<.85 and -12.5<y< -3.5:continue
 if ((x-7)/4.35)**2+((y+5)/3.65)**2<1:continue
 if min((x-p.x)**2+(y-p.y)**2 for p in path_samples)<1.1:continue
 obj=bpy.data.objects.new('Landscape Meadow tuft '+str(meadow_count),grass_meshes[meadow_count%3]);bpy.context.collection.objects.link(obj)
 obj.location=(x,y,ground_height(x,y)+.01);obj.rotation_euler.z=rng.random()*math.tau
 scale=rng.uniform(.75,1.2);obj.scale=(scale,scale,scale);meadow_count+=1
# Low, irregular stones sit in the planting, not a formal repeated line of trees.
for i,(x,y,s) in enumerate([(-7,1,.65),(-7.7,1.5,.38),(10.7,-6,.75),(11.4,-5.8,.4),(-25,23,.6),(-26.2,23.5,.45)]):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=s,location=(x,y,ground_height(x,y)+s*.18))
 o=bpy.context.object;o.name='Landscape Embedded stone';o.scale=(1,.8,.5);o.data.materials.append(stone)
 for face in o.data.polygons:face.use_smooth=True
# Human-level framing gives the villa breathing room and reveals sky above grouped trees.
camera=scene.camera;camera.location=(18,-26,8.5);camera.rotation_euler=(Vector((0,-.4,4.2))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=43
scene['landscape_redesign']=True
(ROOT/'art/landscape_report.json').write_text(json.dumps({'hero_trees':len(tree_plan),'shared_meadow_clumps':meadow_count,'tree_forms':['spreading Japanese maple','field maple','lakeside weeping willow'],'shrub_groups':len(shrub_positions),'detailed_terrain_extent_m':400,'path_points':[list(p) for p in controls],'infinite_world':False},indent=2))
bpy.ops.file.make_paths_relative();bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'cottage_source.blend'),compress=True)
print('LANDSCAPE_REDESIGN_COMPLETE')
