"""Blender 4.3: editable cottage environment, GLB export and CPU Cycles look-dev.
blender -b --python art/build_cottage.py
"""
import bpy, math, random, sys
from pathlib import Path
from mathutils import Vector, Matrix
R=random.Random(2041)
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'; OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,rough=.8,noise=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes; bs=n.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 if noise:
  tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=18;tex.inputs['Detail'].default_value=4
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=noise;bump.inputs['Distance'].default_value=.07
  m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
  ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.2;ramp.color_ramp.elements[0].color=(*(v*.45 for v in color),1);ramp.color_ramp.elements[1].position=.8;ramp.color_ramp.elements[1].color=(*color,1)
  m.node_tree.links.new(tex.outputs['Fac'],ramp.inputs['Fac']);m.node_tree.links.new(ramp.outputs['Color'],bs.inputs['Base Color'])
 return m
wood=material('Weathered oak',(.19,.115,.062),.85,.45)
plaster=material('Limewashed plaster',(.53,.48,.33),.98,.35)
stone=material('Old limestone',(.29,.30,.24),.98,.4)
earth=material('Garden soil',(.095,.12,.047),.95,.3)
leaves=[material('Leaf '+str(i),c,.75,.2) for i,c in enumerate([(.055,.12,.025),(.12,.20,.035),(.18,.25,.055),(.075,.17,.06)])]
grassm=[material('Grass '+str(i),c,.85) for i,c in enumerate([(.08,.15,.025),(.14,.20,.04),(.23,.27,.065)])]
rose=[material('Rose ivory',(.87,.82,.63),.65),material('Rose dusty pink',(.65,.31,.34),.7)]
roofm=[material('Slate '+str(i),(.10+i*.012,.12+i*.012,.105+i*.009),.9,.35) for i in range(5)]
moss=material('Roof moss',(.16,.22,.055),1,.5)
class Batch:
 def __init__(self,name,mats):self.name=name;self.mats=mats;self.v=[];self.f=[];self.mi=[]
 def face(self,vs,mi=0):
  o=len(self.v);self.v.extend(vs);self.f.append(tuple(range(o,o+len(vs))));self.mi.append(mi)
 def box(self,p,s,mi=0,rot=0):
  mat=Matrix.Rotation(rot,4,'Y');v=[Vector(p)+mat@Vector((x*s[0]/2,y*s[1]/2,z*s[2]/2)) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
  for f in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:self.face([v[i] for i in f],mi)
 def object(self):
  mesh=bpy.data.meshes.new(self.name);mesh.from_pydata(self.v,[],self.f);mesh.update();obj=bpy.data.objects.new(self.name,mesh);bpy.context.collection.objects.link(obj)
  for m in self.mats:mesh.materials.append(m)
  for p,i in zip(mesh.polygons,self.mi):p.material_index=i
  return obj
def cube(name,p,s,m,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:
  mod=o.modifiers.new('Worn edges','BEVEL');mod.width=bevel;mod.segments=2
 return o
def path(name,pts,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2
 sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
 for q,p in zip(sp.points,pts):q.co=(*p,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
def leaf(batch,p,size,angle,mi=0,wall=False):
 a=Vector((math.cos(angle),-.05,math.sin(angle))) if wall else Vector((math.cos(angle),math.sin(angle),.35))
 b=Vector((-math.sin(angle),-.08,math.cos(angle))) if wall else Vector((-math.sin(angle),math.cos(angle),.15))
 v=Vector(p)
 batch.face([v,v+a*size*.45+b*size*.38,v+a*size+Vector((0,-.015,.025)),v+a*size*.45-b*size*.38],mi)
# Continuous terrain, with a shallow basin for the pond.
terrain=Batch('Terrain',[earth]);N=60
def height(x,y):
 h=.04*math.sin(x*.7)*math.cos(y*.55)
 if ((x-7)/4)**2+((y+5)/3.4)**2<1:h=-.4
 if abs(x)<4.6 and abs(y)<4:h=0
 return h
for i in range(N):
 for j in range(N):
  x=-20+i*40/N;y=-20+j*40/N;s=40/N
  terrain.face([(x,y,height(x,y)),(x+s,y,height(x+s,y)),(x+s,y+s,height(x+s,y+s)),(x,y+s,height(x,y+s))])
terrain.object()
# Real floor, door opening and interior: no facade-only trick.
cube('Foundation',(0,0,.1),(8.3,7.3,.35),stone)
cube('Interior floor',(0,0,.3),(8,7,.12),wood)
cube('Back wall',(0,3.5,2.25),(8,.25,4),plaster)
cube('West wall',(-4,0,2.25),(.25,7,4),plaster)
cube('East wall',(4,0,2.25),(.25,7,4),plaster)
cube('Front left wall',(-2.9,-3.5,2.25),(2.2,.25,4),plaster)
cube('Front door lintel',(-1.05,-3.5,3.8),(1.5,.25,.9),plaster)
cube('Front center wall',(.55,-3.5,2.25),(1.8,.25,4),plaster)
cube('Front right pier',(3.7,-3.5,2.25),(.6,.25,4),plaster)
cube('Under front window',(2.4,-3.5,.85),(2,.25,1.3),plaster)
cube('Above front window',(2.4,-3.5,3.65),(2,.25,1.2),plaster)
for x in [-4,-1.8,-.3,1.4,3.4,4]:cube('Oak upright',(x,-3.68,2.3),(.17,.22,4.2),wood)
for z in [.45,3.2,4.3]:cube('Crossbeam',(0,-3.68,z),(8.3,.22,.18),wood)
for y in [-3.6,3.6]:
 b=Batch('Gable',[plaster]);b.face([(-4,y,4.3),(4,y,4.3),(0,y,7.05)]);b.object()
 for side in [-1,1]:
  p=[(0,y,7.15),(side*4.8,y,4.02)];path('Gable oak edge',p,.11,wood)
for x in [1.5,2.4,3.3]:cube('Window mullion',(x,-3.72,2.27),(.065,.12,1.65),wood,.01)
for z in [1.48,2.25,3.05]:cube('Window rail',(2.4,-3.72,z),(1.9,.12,.07),wood,.01)
glass=material('Antique window glass',(.48,.59,.49),.22);bs=glass.node_tree.nodes.get('Principled BSDF');bs.inputs['Transmission Weight'].default_value=.6
cube('Glass',(2.4,-3.59,2.25),(1.85,.025,1.5),glass,0)
# Slate shingles: individual relief and varied weathering, batched for runtime.
tiles=Batch('Slate roof',roofm+[moss])
for side in [-1,1]:
 for row in range(18):
  x=side*(.12+row*.275)
  for col in range(24):
   y=-4.25+col*.37+(row%2)*.15
   z=7.1-abs(x)*.65+R.uniform(-.025,.025)
   tiles.box((x,y,z),(.37,.42,.07),5 if R.random()<.2 else R.randrange(5),side*math.atan(.65))
tiles.object()
for y in [-3.7,3.7]:cube('Roof tie',(0,y,4.2),(8.4,.18,.22),wood)
cube('Chimney',(2,1.8,6.5),(.9,.85,2.4),stone)
# Moveable furniture groups with usable scale.
for name,pos,scale,mat in [('Table',(1.6,.2,.9),(1.6,1,.12),wood),('Bed mattress',(-2,1.4,.75),(1.8,2.5,.32),material('Linen',(.75,.69,.53),.95,.2)),('Bed base',(-2,1.4,.48),(2,2.7,.22),wood),('Cabinet',(2.9,2.6,1.1),(1.3,.65,1.6),wood)]:cube(name,pos,scale,mat)
for x in [1,2.2]:
 for y in [-.15,.55]:cube('Table leg',(x,y,.6),(.09,.09,.55),wood)
# Stone path to the door, separate from thick meadow.
for k in range(15):
 y=-4.2-k*.57;x=-1.05+.13*math.sin(k*.8)
 o=cube('Path stone',(x,y,.04),(.95+R.random()*.3,.48,.09),stone,.08);o.rotation_euler.z=R.uniform(-.12,.12)
# Ivy stems and thousands of individually shaped leaves.
ivy=Batch('Climbing ivy',leaves)
for stem in range(32):
 x=R.choice([-3.8,-2.2,.2,3.7])+R.uniform(-.45,.45);zmax=R.uniform(3.5,6.5)
 pts=[]
 for k in range(35):
  z=k*zmax/34;px=x+.28*math.sin(k*.25+stem);py=-3.87-.06*math.sin(k*.8)
  if z>4.1:py+=min(1,z-4.1)*.25
  pts.append((px,py,z))
  for s in [-1,1]:leaf(ivy,(px,py-.025,z),R.uniform(.15,.29),s*1.2+stem*.2,R.randrange(4),True)
 path('Ivy stem',pts,.018,wood)
for k in range(1700):
 x=R.uniform(-4.7,4.7);y=R.uniform(-4,4);z=7.12-abs(x)*.65
 if R.random()<.6 and abs(x)>.3:leaf(ivy,(x,y,z+.06),R.uniform(.12,.24),R.random()*math.tau,R.randrange(4))
for branch in range(30):
 pts=[]
 for k in range(30):
  x=-4.2+k*.29;z=.6+branch*.12+.25*math.sin(k*.4+branch)
  if -1.9<x<-.25 and z<3.3: continue
  pts.append((x,-3.98,z))
  for q in range(2):leaf(ivy,(x+R.uniform(-.12,.12),-4.01,z+R.uniform(-.15,.15)),R.uniform(.15,.3),R.random()*math.tau,R.randrange(4),True)
 if len(pts)>2:path('Rambling vine',pts,.009,wood)
ivy.object()
# Dense grass geometry, keeping the door path and pond clear.
grass=Batch('Meadow grass',grassm)
for k in range(48000):
 x=R.uniform(-13,13);y=R.uniform(-13,10)
 if (abs(x)<4.35 and abs(y)<3.9) or (abs(x+1.05)<.8 and y< -3.4) or ((x-7)/4.2)**2+((y+5)/3.6)**2<1:continue
 h=R.uniform(.16,.5);w=R.uniform(.012,.032);z=height(x,y)+.02;a=R.random()*math.tau;v=Vector((math.cos(a)*w,math.sin(a)*w,0));p=Vector((x,y,z));bend=Vector((.09*math.sin(a),.07*math.cos(a),0))
 grass.face([p-v,p+v,p+v*.55+bend*.5+Vector((0,0,h*.55)),p+bend+Vector((0,0,h)),p-v*.55+bend*.5+Vector((0,0,h*.55))],R.randrange(3))
grass.object()
# Flower shrubs, not single billboard sprites.
flowers=Batch('Garden roses',rose);shrubs=Batch('Garden foliage',leaves)
for cluster in range(75):
 x=R.uniform(-7,6);y=R.uniform(-5.3,3.5)
 if abs(x)<4.2 and abs(y)<3.8:continue
 if abs(x+1)<1 and y< -3.3:continue
 for j in range(28):
  a=R.random()*math.tau;r=R.random()*.55;z=R.uniform(.2,1.2);p=(x+r*math.cos(a),y+r*math.sin(a),z)
  leaf(shrubs,p,.2,R.random()*math.tau,R.randrange(4))
  if j%3==0:
   for ring in range(2):
    for petal in range(5):
     ang=petal*math.tau/5+ring*.4;v=Vector(p);rad=.065+ring*.045
     flowers.face([v,v+Vector((math.cos(ang-.45)*rad,math.sin(ang-.45)*rad,.035)),v+Vector((math.cos(ang)*rad*1.5,math.sin(ang)*rad*1.5,.075)),v+Vector((math.cos(ang+.45)*rad,math.sin(ang+.45)*rad,.035))],cluster%2)
shrubs.object();flowers.object()
water=material('Pond water',(.10,.22,.20),.12);bs=water.node_tree.nodes.get('Principled BSDF');bs.inputs['IOR'].default_value=1.333;bs.inputs['Transmission Weight'].default_value=.35
pond=Batch('Pond',[water]);pond.face([(7+4*math.cos(i*math.tau/96),-5+3.4*math.sin(i*math.tau/96),-.04) for i in range(96)]);pond.object()
for i in range(40):
 a=i*math.tau/40;x=7+4.1*math.cos(a);y=-5+3.5*math.sin(a)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=R.uniform(.18,.4),location=(x,y,.015));o=bpy.context.object;o.name='Pond stone';o.scale.z=.6;o.data.materials.append(stone)
# Lighting and a physically based sky.
world=bpy.data.worlds.new('Soft afternoon sky');bpy.context.scene.world=world;world.use_nodes=True;n=world.node_tree.nodes;sky=n.new('ShaderNodeTexSky');sky.sky_type='NISHITA';sky.sun_elevation=math.radians(28);sky.sun_rotation=math.radians(130);world.node_tree.links.new(sky.outputs['Color'],n.get('Background').inputs['Color']);n.get('Background').inputs['Strength'].default_value=.12
bpy.ops.object.light_add(type='SUN',location=(4,-8,10));sun=bpy.context.object;sun.name='Afternoon sun';sun.rotation_euler=(math.radians(30),math.radians(-20),math.radians(-35));sun.data.energy=2;sun.data.angle=math.radians(7)
for p in [(1,-1,2.6),(-2,1,2.8)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name='Warm interior';o.data.energy=60;o.data.color=(1,.72,.40);o.data.shape='DISK';o.data.size=2
bpy.ops.object.camera_add(location=(13,-18,9.5));cam=bpy.context.object;cam.name='Quality review camera';direction=Vector((0,-.2,2.6))-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();cam.data.lens=42;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=96;scene.cycles.use_denoising=False;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-1.8
scene.render.image_settings.file_format='JPEG';scene.render.filepath=str(ROOT/'technical_study.jpg')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'cottage_source.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'cottage_environment.glb'),export_format='GLB',export_cameras=False,export_lights=False)
bpy.ops.render.render(write_still=True)
print('COTTAGE_ASSETS_COMPLETE')
