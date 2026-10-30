"""Densify the real villa model with meadow flowers, layered borders and flowering vines."""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'cottage_source.blend'))
rng=random.Random(6109)
for obj in list(bpy.data.objects):
 if obj.name.startswith('Floral '):bpy.data.objects.remove(obj,do_unlink=True)
def material(name,color,rough=.65):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 bs.inputs['Specular IOR Level'].default_value=.22
 return m
mats=[material('Floral stem',(.035,.085,.025)),material('Floral ivory',(.82,.77,.66)),material('Floral blush',(.72,.42,.46)),material('Floral rose',(.48,.19,.27)),material('Floral lavender',(.34,.25,.52)),material('Floral pollen',(.54,.34,.085))]
class Mesh:
 def __init__(self,name):self.name='Floral '+name;self.v=[];self.f=[];self.mi=[];self.blooms=0
 def face(self,vs,mi):
  n=len(self.v);self.v.extend(vs);self.f.append(tuple(range(n,n+len(vs))));self.mi.append(mi)
 def stem(self,p,h):
  x,y,z=p;r=.006
  self.face([(x-r,y,z),(x+r,y,z),(x+r*.3,y,z+h),(x-r*.3,y,z+h)],0)
  self.face([(x,y-r,z),(x,y+r,z),(x,y+r*.3,z+h),(x,y-r*.3,z+h)],0)
  for j in range(3):
   a=j*2.4;x1=x+math.cos(a)*.14;y1=y+math.sin(a)*.14;zz=z+h*(.2+j*.18)
   self.face([(x,y,zz),(x1-.025,y1-.025,zz+.045),(x1,y1,zz+.1),(x1+.025,y1+.025,zz+.045)],0)
 def flower(self,p,size,color,rose=False):
  p=Vector(p);offset=rng.uniform(0,math.tau)
  rings=[(6,.28),(8,.62),(10,1)] if rose else [(8,1)]
  for ring,(count,spread) in enumerate(rings):
   for petal in range(count):
    a=offset+petal*math.tau/count+ring*.43;d=Vector((math.cos(a),math.sin(a),0));side=Vector((-d.y,d.x,0));rows=[]
    for k in range(5):
     t=k/4;radius=size*(.08+spread*t);width=size*spread*.4*math.sin(math.pi*t*.9)
     z=size*(.45-ring*.10+.45*t-.65*t*t) if rose else size*(.04+.35*t-.3*t*t)
     c=p+d*radius+Vector((0,0,z))
     rows.append([c+side*width*s+Vector((0,0,size*.12*s*s*t)) for s in [-1,0,1]])
    for k in range(4):
     for j in range(2):self.face([rows[k][j],rows[k+1][j],rows[k+1][j+1],rows[k][j+1]],color if not rose or ring else max(1,color-1))
  if not rose:
   self.face([p+Vector((math.cos(k*math.tau/10)*size*.19,math.sin(k*math.tau/10)*size*.19,size*.09)) for k in range(10)],5)
  self.blooms+=1
 def finish(self):
  mesh=bpy.data.meshes.new(self.name);mesh.from_pydata(self.v,[],self.f);mesh.update()
  for m in mats:mesh.materials.append(m)
  for p,i in zip(mesh.polygons,self.mi):p.material_index=i;p.use_smooth=True
  return mesh
# Reusable patches vary blossom heights and orientations instead of repeating a flat flower mat.
templates=[];counts=[]
for variant in range(3):
 mesh=Mesh('Meadow flowers '+str(variant))
 for j in range(18):
  a=rng.random()*math.tau;r=math.sqrt(rng.random())*.62;x=math.cos(a)*r;y=math.sin(a)*r;h=rng.uniform(.17,.43)
  mesh.stem((x,y,0),h);mesh.flower((x,y,h),rng.uniform(.055,.10),[1,2,4][variant] if j%4 else 1)
 templates.append(mesh.finish());counts.append(mesh.blooms)
for variant in range(2):
 mesh=Mesh('Rambling roses '+str(variant))
 for j in range(9):
  a=rng.random()*math.tau;r=math.sqrt(rng.random())*.48
  x=math.cos(a)*r;y=math.sin(a)*r;z=rng.uniform(-.03,.08)
  mesh.stem((x,y,-.3),.3+z)
  mesh.flower((x,y,z),rng.uniform(.10,.18),2+variant,True)
 templates.append(mesh.finish());counts.append(mesh.blooms)
mesh=Mesh('Tall flowering border')
for j in range(9):
 a=rng.random()*math.tau;r=rng.random()*.5;x=math.cos(a)*r;y=math.sin(a)*r;h=rng.uniform(.55,.9);mesh.stem((x,y,0),h)
 for k in range(7):
  angle=k*2.4;mesh.flower((x+math.cos(angle)*.04,y+math.sin(angle)*.04,h-k*.06),.038,4 if j%3 else 1)
templates.append(mesh.finish());counts.append(mesh.blooms)
deps=bpy.context.evaluated_depsgraph_get();surfaces=[BVHTree.FromObject(bpy.data.objects[n],deps) for n in ['Terrain','Forest Terrain extension']]
def height(x,y):
 hits=[tree.ray_cast(Vector((x,y,300)),Vector((0,0,-1)))[0] for tree in surfaces]
 return max(p.z for p in hits if p is not None)
stats={'meadow':0,'house_borders':0,'climbing_roses':0,'balcony_and_window_boxes':0,'roof_vines':0};instances=0
def place(kind,p,scale,category,rotation=(0,0,0)):
 global instances
 obj=bpy.data.objects.new('Floral '+category+' '+str(instances),templates[kind]);bpy.context.collection.objects.link(obj)
 obj.location=p;obj.scale=(scale,scale,scale);obj.rotation_euler=rotation
 stats[category]+=counts[kind];instances+=1
# Loose ribbons of wildflowers in front of the house and along the lake and approach.
centers=[(-6.6,-5.7),(-4.5,-8.3),(-2.7,-9),(.8,-8.2),(2.9,-9.8),(5.3,-10),(8.7,-9.7),(11.3,-7.3),(11.5,-3.1),(-7.8,-2.5),(-7.5,1.2),(5.5,3.8)]
for ci,(cx,cy) in enumerate(centers):
 for j in range(10):
  x=cx+rng.gauss(0,.8);y=cy+rng.gauss(0,.65)
  if abs(x+1.05)<1.1 and y< -3.5:continue
  if ((x-7)/4.5)**2+((y+5)/3.9)**2<1:continue
  if abs(x)<4.7 and -5.1<y<4.1:continue
  place(ci%3,(x,y,height(x,y)+.015),rng.uniform(.8,1.2),'meadow',(0,0,rng.random()*math.tau))
# Fuller flowers at the building's base, with a few taller purple/ivory accents behind.
for ci,(cx,cy) in enumerate([(-3.4,-5.1),(-2.4,-5.35),(.5,-5.4),(1.4,-5.5),(3.3,-5.3),(4.7,-2.5),(4.8,2.2),(-5.1,-1)]):
 for j in range(4):
  x=cx+rng.uniform(-.4,.4);y=cy+rng.uniform(-.3,.3)
  if -2<x<-.1 and y< -3.5:continue
  h=rng.uniform(.32,.65)
  place(3+ci%2,(x,y,height(x,y)+h),rng.uniform(.8,1.2),'house_borders',(rng.uniform(-.3,.3),rng.uniform(-.3,.3),rng.random()*math.tau))
 place(5,(cx,cy+.25,height(cx,cy+.25)),rng.uniform(.85,1.1),'house_borders',(0,0,rng.random()*math.tau))
# Flower-bearing vines follow the facade's existing green trails, keeping openings usable.
for x in [-3.75,-2.5,.45,3.75]:
 for k in range(7):
  z=.8+k*.93+rng.uniform(-.2,.2);px=x+rng.uniform(-.2,.2)
  place(3+k%2,(px,-4.04,z),rng.uniform(.7,1.0),'climbing_roses',(math.pi/2,0,rng.uniform(-.35,.35)))
for y in [-3.25,2.8]:
 for k in range(5):place(3+k%2,(4.25,y,1.2+k*1.3),.8,'climbing_roses',(0,math.pi/2,rng.uniform(-.2,.2)))
# Flower chains bridge the planted eaves and roof ridge, leaving slate readable.
for i in range(18):
 x=rng.uniform(-3.8,3.8);y=rng.uniform(-4,3.3);z=10.42-abs(x)*.65
 place(3+i%2,(x,y,z),rng.uniform(.6,.85),'roof_vines',(0,(-1 if x<0 else 1)*math.atan(.65),rng.random()*math.tau))
for i in range(10):
 x=-3.5+i*.77;z=10.16-abs(x)*.65
 place(3+i%2,(x,-3.98,z),.65,'roof_vines',(math.pi/2,0,rng.uniform(-.3,.3)))
# Window-box and balcony flowers trail over their edges instead of forming a straight row.
for cx in [-3,0,3]:
 for j in range(3):place(3+j%2,(cx+rng.uniform(-.5,.5),-5.42,4.9+rng.uniform(-.15,.25)),.55,'balcony_and_window_boxes',(math.pi/3,0,rng.uniform(-.3,.3)))
for j in range(5):place(3+j%2,(1.6+j*.38,-4.15,1.48+rng.uniform(0,.2)),.4,'balcony_and_window_boxes',(math.pi/3,0,rng.uniform(-.2,.2)))
scene=bpy.context.scene;scene['flower_garden']=True
(ROOT/'art/flower_report.json').write_text(json.dumps({'added_blossoms':stats,'added_instances':instances,'shared_templates':len(templates),'palette':'ivory, blush, dusty rose, lavender'},indent=2))
bpy.ops.file.make_paths_relative();bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'cottage_source.blend'),compress=True)
print('FLOWER_GARDEN_COMPLETE',stats)
