"""Add real roof planting and a continuous layered woodland to the villa.
Generated meshes share tree/fern geometry; doors, stairs and layout stay intact.
"""
import bpy,bmesh,math,random,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'cottage_source.blend'))
scene=bpy.context.scene
rng=random.Random(4118)
for obj in list(bpy.data.objects):
 if obj.name.startswith('Forest '):bpy.data.objects.remove(obj,do_unlink=True)
def material(name,c,rough=.85):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*c,1)
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough
 return m
leaf_mats=[material('Woodland leaf '+str(i),c) for i,c in enumerate([(.028,.075,.025),(.055,.125,.045),(.10,.185,.065),(.16,.225,.095)])]
moss_mats=[material('Living moss '+str(i),c) for i,c in enumerate([(.035,.075,.025),(.065,.12,.035),(.11,.17,.055)])]
bark=material('Woodland bark',(.115,.09,.065));ground_mats=[material('Woodland ground '+str(i),c) for i,c in enumerate([(.055,.095,.035),(.075,.12,.045),(.10,.145,.065)])]
ground_image=bpy.data.images.load(str(ROOT/'assets/pbr/generated_meadow.png'),check_existing=True)
for m in ground_mats:
 bs=m.node_tree.nodes.get('Principled BSDF')
 for link in list(bs.inputs['Base Color'].links):m.node_tree.links.remove(link)
 node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=ground_image
 m.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color'])
water=bpy.data.materials.get('Pond water')
if water:
 nodes=water.node_tree.nodes;links=water.node_tree.links;bs=nodes.get('Principled BSDF')
 noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=18;noise.inputs['Detail'].default_value=2
 bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.16;bump.inputs['Distance'].default_value=.04
 links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
class Mesh:
 def __init__(self,name,mats):self.name='Forest '+name;self.mats=mats;self.v=[];self.f=[];self.mi=[]
 def face(self,vs,mi=0):
  n=len(self.v);self.v.extend(vs);self.f.append(tuple(range(n,n+len(vs))));self.mi.append(mi)
 def finish(self):
  mesh=bpy.data.meshes.new(self.name);mesh.from_pydata(self.v,[],self.f);mesh.update();o=bpy.data.objects.new(self.name,mesh);bpy.context.collection.objects.link(o)
  for m in self.mats:mesh.materials.append(m)
  for face,mi in zip(mesh.polygons,self.mi):face.material_index=mi;face.use_smooth=True
  if self.name=='Forest Terrain extension':
   uv=mesh.uv_layers.new(name='UVMap')
   for loop in mesh.loops:
    v=mesh.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(v.x*.15,v.y*.15)
   bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001);bm.to_mesh(mesh);bm.free();mesh.update()
  return o
 def leaf(self,p,d,length,width,mi):
  p=Vector(p);d=Vector(d).normalized();side=d.cross(Vector((0,0,1)))
  if side.length<.01:side=d.cross(Vector((0,1,0)))
  side.normalize();n=side.cross(d).normalized()
  rows=[]
  for k in range(5):
   t=k/4;w=width*math.sin(math.pi*t)**.8;c=p+d*length*t+n*math.sin(math.pi*t)*length*.12
   rows.append([c-side*w-n*w*.2,c+n*w*.1,c+side*w-n*w*.2])
  for k in range(4):
   for j in range(2):self.face([rows[k][j],rows[k+1][j],rows[k+1][j+1],rows[k][j+1]],mi)
 def branch(self,a,b,r1,r2,mi=0):
  a=Vector(a);b=Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,1,0)))
  if u.length<.01:u=axis.cross(Vector((1,0,0)))
  u.normalize();v=axis.cross(u)
  for j in range(8):
   t=j*math.tau/8;s=(j+1)*math.tau/8
   self.face([a+(u*math.cos(t)+v*math.sin(t))*r1,a+(u*math.cos(s)+v*math.sin(s))*r1,b+(u*math.cos(s)+v*math.sin(s))*r2,b+(u*math.cos(t)+v*math.sin(t))*r2],mi)
# Extend the ground to a rolling wooded horizon, overlapping the original garden safely.
def height(x,y):
 edge=max(abs(x),abs(y));blend=max(0,min(1,(edge-20)/22));blend=blend*blend*(3-2*blend)
 hills=10*math.exp(-((x+40)**2+(y-55)**2)/1500)+17*math.exp(-((x-50)**2+(y-100)**2)/2800)+6*math.sin(x*.035+y*.02)**2
 return .04*math.sin(x*.7)*math.cos(y*.55)+blend*hills
terrain=Mesh('Terrain extension',ground_mats)
step=4
for x in range(-200,200,step):
 for y in range(-200,200,step):
  if x>=-16 and x+step<=16 and y>=-16 and y+step<=16:continue
  pts=[(u,v,height(u,v)) for u,v in [(x,y),(x+step,y),(x+step,y+step),(x,y+step)]]
  terrain.face(pts,1)
terrain.finish()
horizon=Mesh('Terrain horizon',ground_mats)
horizon.face([(-2000,-2000,-2),(2000,-2000,-2),(2000,2000,-2),(-2000,2000,-2)],1)
horizon.finish()
# Darker undergrowth and clustered grass height replace the uniform yellow field.
old_terrain=bpy.data.objects.get('Terrain')
if old_terrain:
 old_terrain.data.materials[0]=ground_mats[1]
 uv=old_terrain.data.uv_layers.active or old_terrain.data.uv_layers.new(name='UVMap')
 for loop in old_terrain.data.loops:
  v=old_terrain.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(v.x*.15,v.y*.15)
grass=bpy.data.objects.get('Meadow grass')
if grass:
 for i in range(len(grass.data.materials)):grass.data.materials[i]=leaf_mats[min(i+1,3)]
 if not scene.get('forest_grass_shaped'):
  for face in grass.data.polygons:
   vs=[grass.data.vertices[i] for i in face.vertices];base=min(v.co.z for v in vs);c=face.center
   factor=.35+.65*(.5+.5*math.sin(c.x*.8+math.cos(c.y*.65)))
   for v in vs:v.co.z=base+(v.co.z-base)*factor
  grass.data.update();scene['forest_grass_shaped']=True
# Thick, irregular moss islands follow the real pitched roof, not green paint.
moss=Mesh('Roof moss beds',moss_mats);roof=Mesh('Roof living foliage',leaf_mats)
patch_count=0
for side in [-1,1]:
 for i in range(175):
  x=side*rng.uniform(.18,4.55);y=rng.uniform(-4.1,4.1)
  if rng.random()>.68+.2*math.sin(y*1.8+x):continue
  rx=rng.uniform(.18,.52);ry=rng.uniform(.2,.62);mi=rng.randrange(3)
  center=Vector((x,y,10.34-abs(x)*.65));rings=[]
  for k in range(3):
   ring=[];r=k/2
   for j in range(12):
    a=j*math.tau/12;px=x+math.cos(a)*rx*r;py=y+math.sin(a)*ry*r
    z=10.34-abs(px)*.65+.04+(1-r*r)*rng.uniform(.02,.08)
    ring.append(Vector((px,py,z)))
   rings.append(ring)
  for k in range(2):
   for j in range(12):moss.face([rings[k][j],rings[k+1][j],rings[k+1][(j+1)%12],rings[k][(j+1)%12]],mi)
  patch_count+=1
  for j in range(20):
   px=x+rng.uniform(-rx,rx);py=y+rng.uniform(-ry,ry);z=10.39-abs(px)*.65
   roof.leaf((px,py,z),(rng.uniform(-1,1),rng.uniform(-1,1),.25),rng.uniform(.09,.19),rng.uniform(.035,.065),rng.randrange(4))
  for j in range(10):
   px=x+rng.uniform(-rx,rx);py=y+rng.uniform(-ry,ry);z=10.4-abs(px)*.65;h=rng.uniform(.045,.14)
   roof.face([(px-.008,py,z),(px+.008,py,z),(px+rng.uniform(-.04,.04),py+.025,z+h)],rng.randrange(4))
# Curtain growth over the eaves and down upper wall posts, with irregular lengths.
for side in [-1,1]:
 for i in range(65):
  x=side*4.66;y=rng.uniform(-4.1,4.1);length=rng.uniform(.25,1.2)
  for k in range(12):
   t=k/11;p=(x+side*.045*math.sin(k*.7),y+.09*math.sin(k*.4+i),7.36-t*length)
   roof.leaf(p,(side*.3,(-1)**k*.8,-.2),rng.uniform(.12,.22),.065,rng.randrange(4))
# Broken patches on the gable carry greenery up from the wall to the planted roof.
for patch in range(30):
 cx=rng.uniform(-3.3,3.3);cz=rng.uniform(7.6,9.7)
 for j in range(18):
  x=cx+rng.gauss(0,.2);z=cz+rng.gauss(0,.25)
  if z>10.2 or z<7.5 or abs(x)>(10.25-z)/.6875:continue
  roof.leaf((x,-3.9,z),(rng.uniform(-1,1),-.12,rng.uniform(-.3,.7)),rng.uniform(.14,.24),.075,rng.randrange(4))
moss.finish();roof.finish()
# Three reusable full-mesh broadleaf trees: tapered branches and individually curved leaves.
masters=[]
for variant in range(3):
 tree=Mesh('Broadleaf tree '+str(variant),[bark]+leaf_mats);h=7+variant*1.3
 tree.branch((0,0,0),(.12,-.08,h*.72),.16+variant*.025,.045)
 clusters=[]
 for branch in range(17):
  angle=branch*2.4+variant;z=h*(.38+branch*.026);reach=rng.uniform(1.1,2.5)*(1-branch*.018)
  end=Vector((math.cos(angle)*reach,math.sin(angle)*reach,z+rng.uniform(.6,1.7)))
  start=Vector((.07,-.04,z));tree.branch(start,end,.055,.012)
  clusters.append(end)
  for twig in range(3):
   a=angle+(-1+twig)*.8;tip=end+Vector((math.cos(a)*.7,math.sin(a)*.7,.4));tree.branch(end,tip,.015,.003);clusters.append(tip)
 for j in range(2900):
  c=rng.choice(clusters);a=rng.random()*math.tau;r=math.sqrt(rng.random())*.8
  p=c+Vector((math.cos(a)*r,math.sin(a)*r,rng.gauss(0,.35)))
  tree.leaf(p,(math.cos(a),math.sin(a),rng.uniform(-.1,.6)),rng.uniform(.22,.38),rng.uniform(.08,.145),1+rng.randrange(4))
 master=tree.finish();masters.append(master)
# A curved tree line, then a taller, softer layer beyond it. The pond and approach stay open.
positions=[]
for i in range(47):
 x=rng.uniform(-48,48);y=rng.uniform(12,62)
 if abs(x)<8 and y<17:continue
 positions.append((x,y,rng.uniform(1.2,1.8)))
for i in range(26):positions.append((rng.uniform(-100,100),rng.uniform(60,125),rng.uniform(1.0,1.8)))
for i in range(30):positions.append((rng.uniform(-35,35),rng.uniform(22,65),rng.uniform(1.2,1.7)))
positions += [(-11,-3,1.05),(-12,5,.95),(15,5,1.2),(17,-2,.9)]
for i,(x,y,scale) in enumerate(positions):
 master=masters[i%3]
 if i<3:o=master
 else:o=bpy.data.objects.new('Forest Tree instance '+str(i),master.data);bpy.context.collection.objects.link(o)
 o.location=(x,y,height(x,y));o.scale=(scale,scale,scale*rng.uniform(.9,1.15));o.rotation_euler.z=rng.random()*math.tau
# Leafy shrubs soften the join from meadow to tree line; repeated meshes remain shared.
shrub=Mesh('Shrub',leaf_mats)
for j in range(1200):
 a=rng.random()*math.tau;r=math.sqrt(rng.random())*.9;z=max(.1,.9*(1-r*r)+rng.uniform(-.15,.2))
 shrub.leaf((math.cos(a)*r,math.sin(a)*r,z),(math.cos(a),math.sin(a),.4),rng.uniform(.14,.25),.065,rng.randrange(4))
shrub_master=shrub.finish()
shrubs=[]
for i in range(36):
 a=rng.uniform(-.1,math.pi+1);x=math.cos(a)*rng.uniform(8,17);y=5+math.sin(a)*rng.uniform(5,13)
 shrubs.append((x,y))
for i in range(100):shrubs.append((rng.uniform(-35,35),rng.uniform(9,45)))
shrubs += [(-6,-6),(-5,-8),(2,-7),(4,-9),(10,-9),(11,-3),(-6,-2),(5,4)]
for i,(x,y) in enumerate(shrubs):
 if i==0:o=shrub_master
 else:o=bpy.data.objects.new('Forest Shrub instance '+str(i),shrub_master.data);bpy.context.collection.objects.link(o)
 o.location=(x,y,height(x,y));s=rng.uniform(.7,1.3);o.scale=(s,s,s);o.rotation_euler.z=rng.random()*math.tau
fern=Mesh('Fern',leaf_mats)
for frond in range(9):
 angle=frond*2.4;d=Vector((math.cos(angle),math.sin(angle),0))
 for k in range(15):
  t=k/15;p=d*(t*.85)+Vector((0,0,.12+.8*math.sin(t*2.1)));length=.22*math.sin((t*.8+.1)*math.pi)
  for side in [-1,1]:fern.leaf(p,(math.cos(angle+side*1.1),math.sin(angle+side*1.1),.18),length,.032,(frond+k)%4)
fern_master=fern.finish()
for i in range(30):
 a=rng.random()*math.tau;r=rng.uniform(5.5,11);x=math.cos(a)*r;y=math.sin(a)*r
 if abs(x+1.05)<1 and y< -3.4:continue
 if ((x-7)/4.4)**2+((y+5)/3.8)**2<1:continue
 if i==0:o=fern_master
 else:o=bpy.data.objects.new('Forest Fern instance '+str(i),fern_master.data);bpy.context.collection.objects.link(o)
 o.location=(x,y,height(x,y));s=rng.uniform(.65,1.1);o.scale=(s,s,s);o.rotation_euler.z=a
# Ensure the template does not remain at the origin if its first candidate was skipped.
if fern_master.location.length<.1:fern_master.location=(-5.5,-4.5,.02)
scene['forest_garden']=True
(ROOT/'art/forest_report.json').write_text(json.dumps({'roof_moss_patches':patch_count,'trees':len(positions),'shrubs':len(shrubs),'terrain_extent_m':400,'shared_tree_meshes':3},indent=2))
bpy.ops.file.make_paths_relative();bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'cottage_source.blend'),compress=True)
print('FOREST_GARDEN_COMPLETE')
