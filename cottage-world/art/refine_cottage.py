"""Incremental geometry pass. Preserves verified PBR, furniture and door opening.
Run after apply_pbr_materials.py; rerunning replaces only this pass's objects.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'cottage_source.blend'))
rng=random.Random(2718)
PREFIX='Detail '
for obj in list(bpy.data.objects):
 if obj.name.startswith((PREFIX,'Climbing ivy','Ivy stem','Rambling vine','Garden roses','Garden foliage','East wall')):
  bpy.data.objects.remove(obj,do_unlink=True)
def material(name,color,rough=.7):
 mat=bpy.data.materials.get(name) or bpy.data.materials.new(name)
 mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 mat.diffuse_color=(*color,1)
 return mat
leaf_mats=[material('Botanical leaf '+str(i),c) for i,c in enumerate([
 (.025,.065,.019),(.045,.105,.027),(.075,.135,.038),(.115,.17,.055),(.16,.19,.07)])]
petal_mats=[material('Petal '+str(i),c,.55) for i,c in enumerate([
 (.78,.63,.55),(.56,.28,.30),(.84,.78,.63),(.92,.85,.72)])]
wood=bpy.data.materials['Weathered oak'];plaster=bpy.data.materials['Limewashed plaster']
glass=bpy.data.materials['Antique window glass'];stone=bpy.data.materials['Old limestone']
class Mesh:
 def __init__(self,name,mats):self.name=PREFIX+name;self.mats=mats;self.v=[];self.f=[];self.mi=[]
 def face(self,verts,mi=0):
  start=len(self.v);self.v.extend(verts);self.f.append(tuple(range(start,start+len(verts))));self.mi.append(mi)
 def finish(self):
  mesh=bpy.data.meshes.new(self.name);mesh.from_pydata(self.v,[],self.f);mesh.update()
  obj=bpy.data.objects.new(self.name,mesh);bpy.context.collection.objects.link(obj)
  for mat in self.mats:mesh.materials.append(mat)
  for face,mi in zip(mesh.polygons,self.mi):face.material_index=mi;face.use_smooth=True
  # A consistent local UV projection for new wood/plaster and optional later leaf atlases.
  uv=mesh.uv_layers.new(name='UVMap')
  for poly in mesh.polygons:
   axes=(0,2) if abs(poly.normal.y)>.5 else (1,2) if abs(poly.normal.x)>.5 else (0,1)
   for index in poly.loop_indices:
    p=mesh.vertices[mesh.loops[index].vertex_index].co;uv.data[index].uv=(p[axes[0]],p[axes[1]])
  return obj
foliage=Mesh('Curved foliage',leaf_mats);blooms=Mesh('Layered roses and hydrangeas',petal_mats)
def leaf(at,direction,length,width,mi):
 """Folded blade with pointed tip, central ridge, and irregular serrated margins."""
 p=Vector(at);axis=Vector(direction).normalized();side=axis.cross(Vector((0,0,1)))
 if side.length<.1:side=axis.cross(Vector((0,1,0)))
 side.normalize();normal=side.cross(axis).normalized();rows=[]
 for k in range(7):
  t=k/6;shape=math.sin(math.pi*t)**.8;serration=1 if k%2 else .84
  middle=p+axis*length*t+normal*(math.sin(t*math.pi)*length*.13+t*t*length*.12)
  w=width*shape*serration
  rows.append([middle-side*w-normal*w*.24,middle+normal*w*.12,middle+side*w-normal*w*.24])
 for k in range(6):
  for j in range(2):foliage.face([rows[k][j],rows[k+1][j],rows[k+1][j+1],rows[k][j+1]],mi)
def stem(name,pts,radius=.012):
 curve=bpy.data.curves.new(PREFIX+name,'CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=1
 spline=curve.splines.new('POLY');spline.points.add(len(pts)-1)
 for point,co in zip(spline.points,pts):point.co=(*co,1)
 obj=bpy.data.objects.new(curve.name,curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(wood)
def rose(at,size,pink=False):
 p=Vector(at);offset=rng.random()*math.tau
 for ring,(count,spread) in enumerate([(5,.2),(7,.42),(9,.7),(11,1)]):
  for j in range(count):
   angle=offset+j*math.tau/count+ring*.7;axis=Vector((math.cos(angle),math.sin(angle),0));side=Vector((-axis.y,axis.x,0))
   rows=[]
   for k in range(5):
    t=k/4;rad=size*(.08+spread*t);w=size*spread*.48*math.sin(math.pi*t*.9)
    center=p+axis*rad+Vector((0,0,size*(.65-ring*.08+.45*t-.72*t*t)))
    rows.append([center+side*w*s+Vector((0,0,size*.17*s*s*t)) for s in [-1,0,1]])
   for k in range(4):
    for q in range(2):blooms.face([rows[k][q],rows[k+1][q],rows[k+1][q+1],rows[k][q+1]],0 if pink and ring<2 else 1 if pink else 2 if ring<2 else 3)
def hydrangea(at,size):
 p=Vector(at)
 for j in range(65):
  z=rng.uniform(-.2,1);angle=rng.random()*math.tau;r=math.sqrt(1-z*z)
  normal=Vector((r*math.cos(angle),r*math.sin(angle),z));center=p+normal*size
  right=normal.cross(Vector((0,0,1)))
  if right.length<.05:right=Vector((1,0,0))
  right.normalize();up=normal.cross(right)
  for k in range(4):
   a=k*math.pi/2;axis=right*math.cos(a)+up*math.sin(a);side=normal.cross(axis);l=size*.2
   blooms.face([center,center+axis*l*.6-side*l*.5+normal*l*.15,center+axis*l+normal*l*.3,center+axis*l*.6+side*l*.5+normal*l*.15],3 if j%3 else 2)
# A true opening in the east wall, including sill, glazing and shutters.
def box(name,pos,size,mat,bevel=.02):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);obj=bpy.context.object;obj.name=PREFIX+name;obj.dimensions=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);obj.data.materials.append(mat)
 mod=obj.modifiers.new('Soft worn edges','BEVEL');mod.width=bevel;mod.segments=2
 # Project UVs by dominant face so PBR does not stretch over resized unit cubes.
 for poly in obj.data.polygons:
  axes=(1,2) if abs(poly.normal.x)>.5 else (0,2) if abs(poly.normal.y)>.5 else (0,1)
  for i in poly.loop_indices:
   v=obj.data.vertices[obj.data.loops[i].vertex_index].co;obj.data.uv_layers.active.data[i].uv=(v[axes[0]],v[axes[1]])
 return obj
for name,pos,size in [
 ('East wall lower',(4,0,.93),(.25,7,1.35)),
 ('East wall upper',(4,0,3.75),(.25,7,1)),
 ('East wall front',(4,-2.1,2.42),(.25,2.8,1.63)),
 ('East wall back',(4,2.55,2.42),(.25,1.9,1.63))]:box(name,pos,size,plaster)
for y in [-.7,.45,1.6]:box('Side window mullion',(4.16,y,2.42),(.14,.065,1.72),wood)
for z in [1.6,2.42,3.25]:box('Side window frame',(4.16,.45,z),(.16,2.45,.09),wood)
box('Side window glass',(4.02,.45,2.42),(.022,2.2,1.56),glass,.005)
box('Side window sill',(4.25,.45,1.56),(.55,2.65,.15),wood)
for y in [-1.2,2.1]:
 for j in range(4):box('Shutter plank',(4.23,y+(j-1.5)*.12,2.42),(.10,.11,1.66),wood,.008)
 for z in [1.85,3]:box('Shutter strap',(4.31,y,z),(.06,.54,.06),wood,.008)
for y in [-3.45,3.45]:box('Side corner post',(4.18,y,2.3),(.20,.20,4.1),wood)
for z in [.5,4.2]:box('Side timber rail',(4.17,0,z),(.17,7,.18),wood)
box('Front flower box',(2.4,-3.95,1.25),(2.1,.48,.35),wood)
for y in [-3.9,3.9]:
 for k in range(8):
  x=-3.8+k*1.08;z=7.05-abs(x)*.65
  stem('Exposed rafter',[(x,y-.18,z-.2),(x,y+.18,z-.2)],.085)
# Ivy clings to the walls and roof instead of standing in upright sheets above eaves.
for i in range(24):
 start=rng.choice([-3.75,-2.5,.45,3.7])+rng.uniform(-.3,.3);top=rng.uniform(3.2,4.25);pts=[]
 for j in range(30):
  t=j/29;x=start+.25*math.sin(t*7+i);z=.15+top*t;pts.append((x,-3.92,z))
  for side in [-1,1]:
   if (-1.95<x<-.15 and z<3.38) or (1.45<x<3.35 and 1.45<z<3.15):continue
   leaf((x,-3.96,z),(side*.7,-.25,rng.uniform(-.1,.7)),rng.uniform(.18,.29),rng.uniform(.07,.115),rng.randrange(5))
 # Only contiguous segments outside the doorway: no vines stretched across the entrance.
 segment=[]
 for p in pts:
  if -1.95<p[0]<-.15 and p[2]<3.38:
   if len(segment)>1:stem('Wall ivy stem',segment)
   segment=[]
  else:segment.append(p)
 if len(segment)>1:stem('Wall ivy stem',segment)
# Hanging and rambling roof growth, clustered around three broad trails.
for trail in range(9):
 side=rng.choice([-1,1]);y0=rng.uniform(-4,3.5);pts=[]
 for j in range(35):
  x=side*(.3+j*.128);y=y0+.32*math.sin(j*.18+trail);z=7.16-abs(x)*.65;pts.append((x,y,z))
  for q in range(3):leaf((x+rng.uniform(-.12,.12),y+rng.uniform(-.18,.18),z+.03),(side,rng.uniform(-1,1),.12),rng.uniform(.17,.3),rng.uniform(.065,.11),rng.randrange(5))
 stem('Roof runner',pts,.014)
# Irregular growth patches break up repeated upright vines and parallel roof runners.
for patch in range(65):
 side_wall=patch%3==0
 center=Vector((4.2,rng.uniform(-3.3,3.3),rng.uniform(.45,4.05))) if side_wall else Vector((rng.uniform(-4.05,4.05),-3.98,rng.uniform(.3,4.3)))
 for j in range(rng.randrange(16,35)):
  p=center+Vector((0,rng.gauss(0,.28),rng.gauss(0,.32))) if side_wall else center+Vector((rng.gauss(0,.35),0,rng.gauss(0,.35)))
  if p.z<.2 or p.z>4.3:continue
  if side_wall:
   if -.85<p.y<1.7 and 1.45<p.z<3.4:continue
   direction=(.1,rng.uniform(-1,1),rng.uniform(-.3,.8))
  else:
   if (-1.95<p.x<-.15 and p.z<3.4) or (1.4<p.x<3.4 and 1.4<p.z<3.2):continue
   direction=(rng.uniform(-1,1),-.15,rng.uniform(-.3,.8))
  leaf(p,direction,rng.uniform(.12,.24),rng.uniform(.045,.085),rng.randrange(5))
for patch in range(45):
 cx=rng.uniform(-4.5,4.5);cy=rng.uniform(-4.05,4.05)
 for j in range(rng.randrange(15,35)):
  x=cx+rng.gauss(0,.25);y=cy+rng.gauss(0,.35)
  if abs(x)>4.7 or abs(y)>4.3:continue
  leaf((x,y,7.18-abs(x)*.65),(rng.uniform(-1,1),rng.uniform(-1,1),.15),rng.uniform(.13,.24),rng.uniform(.045,.085),rng.randrange(5))
# Flowering shrubs in coherent, branched clumps around the cottage, clear of entry/pond.
centers=[(-5.3,-4.4),(-3.9,-4.8),(-2.7,-4.6),(.6,-4.7),(3.8,-4.7),(4.75,-2.2),(4.8,.3),(4.7,2.3),(-5,1),(-5,-1.8)]
for ci,(cx,cy) in enumerate(centers):
 for branch in range(12):
  a=rng.random()*math.tau;reach=rng.uniform(.3,.8);h=rng.uniform(.65,1.55)
  tip=Vector((cx+math.cos(a)*reach,cy+math.sin(a)*reach,h))
  pts=[Vector((cx,cy,.04)),Vector((cx,cy,h*.42)),tip]
  stem('Shrub branch',pts,.009)
  for k in range(12):
   t=.25+k*.06;p=pts[1].lerp(tip,t);a2=a+k*2.4
   for side in [-1,1]:leaf(p,(math.cos(a2)*side,math.sin(a2)*side,.35),rng.uniform(.18,.3),rng.uniform(.05,.10),rng.randrange(5))
  if branch%2==0:
   if ci%3==0:hydrangea(tip,.16+rng.random()*.07)
   else:rose(tip,.12+rng.random()*.05,ci%2==0)
# Smaller trailing flowers on the window box and climbing branches.
for i in range(18):
 p=(1.5+rng.random()*1.8,-4.03,1.48+rng.uniform(0,.22));leaf(p,(rng.uniform(-1,1),-.5,.6),.22,.08,rng.randrange(5))
 if i%2==0:rose(p,.085,True)
for i in range(35):
 x=rng.choice([-3.6,-2.5,.5,3.7])+rng.uniform(-.3,.3);z=rng.uniform(1,4.2)
 rose((x,-4.1,z),rng.uniform(.09,.14),True)
foliage.finish();blooms.finish()
# Lower, human-height review framing; a second camera retains the overall view.
scene=bpy.context.scene
camera=scene.camera;camera.location=(13,-18,7.5);camera.rotation_euler=(Vector((0,-.25,2.7))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=45
scene.cycles.samples=96;scene.cycles.use_denoising=False
scene['geometry_pass']='curved foliage, layered blooms, clear entry, opening side window'
bpy.ops.file.make_paths_relative()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'cottage_source.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/cottage_environment.glb'),export_format='GLB',export_cameras=False,export_lights=False)
report={'leaves_faces':len(foliage.f),'flower_faces':len(blooms.f),'objects':len(bpy.data.objects),'status':'geometry study; final character and reference-quality art pending'}
(ROOT/'art/geometry_report.json').write_text(json.dumps(report,indent=2))
bpy.ops.render.render(write_still=True)
print('COTTAGE_REFINEMENT_COMPLETE',report)
