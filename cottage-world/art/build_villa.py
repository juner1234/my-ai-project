"""Upgrade the existing PBR cottage into a walkable two-storey garden villa.
Run once after refine_cottage.py. --render-only refreshes three lighting studies.
"""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'cottage_source.blend'))
scene=bpy.context.scene
rng=random.Random(3107)
wood=bpy.data.materials['Weathered oak'];plaster=bpy.data.materials['Limewashed plaster'];glass=bpy.data.materials['Antique window glass']
stone=bpy.data.materials['Old limestone']
def box(name,p,s,mat,bevel=.02):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name='Villa '+name;o.dimensions=s
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Worn edges','BEVEL');mod.width=bevel;mod.segments=2
 for poly in o.data.polygons:
  axes=(1,2) if abs(poly.normal.x)>.5 else (0,2) if abs(poly.normal.y)>.5 else (0,1)
  for i in poly.loop_indices:
   v=o.data.vertices[o.data.loops[i].vertex_index].co;o.data.uv_layers.active.data[i].uv=(v[axes[0]],v[axes[1]])
 return o
def mat(name,c,emission=0):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*c,1)
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=.7
 if emission:bs.inputs['Emission Color'].default_value=(*c,1);bs.inputs['Emission Strength'].default_value=emission
 return m
class Batch:
 def __init__(self,name,mats):self.name='Villa '+name;self.mats=mats;self.v=[];self.f=[];self.mi=[]
 def face(self,vs,mi=0):
  n=len(self.v);self.v.extend(vs);self.f.append(tuple(range(n,n+len(vs))));self.mi.append(mi)
 def finish(self):
  mesh=bpy.data.meshes.new(self.name);mesh.from_pydata(self.v,[],self.f);mesh.update();o=bpy.data.objects.new(self.name,mesh);bpy.context.collection.objects.link(o)
  for m in self.mats:mesh.materials.append(m)
  for p,mi in zip(mesh.polygons,self.mi):p.material_index=mi;p.use_smooth=True
  return o

def build():
 # Preserve all installed PBR and downstairs details; raise the actual roof and gables.
 for o in list(bpy.data.objects):
  if o.name.startswith(('Slate roof','Gable','Roof tie','Chimney','Detail Exposed rafter','Detail Roof runner')):o.location.z+=3.2
  if o.name.startswith('Bed'):o.location.x+=3;o.location.z+=3.99
 # Only roof leaves move, not the garden leaves in the same batched mesh.
 ivy=bpy.data.objects.get('Detail Curved foliage')
 if ivy:
  for poly in ivy.data.polygons:
   c=poly.center
   if c.z>4.3:
    for i in poly.vertices:ivy.data.vertices[i].co.z+=3.2
  ivy.data.update()
 # True upper floor with an open stairwell, not a facade or an inaccessible box.
 box('Upper floor main',(.875,0,4.27),(6.25,7,.16),wood)
 box('Upper floor landing',(-3.125,3.15,4.27),(1.75,.7,.16),wood)
 box('Upper floor front strip',(-3.125,-3.2,4.27),(1.75,.6,.16),wood)
 for name,p,s in [
 ('Upper west wall',(-4,0,5.925),(.25,7,3.15)),
 ('Upper back wall',(0,3.5,5.925),(8,.25,3.15)),
 ('Upper front left wall',(-2.925,-3.5,5.925),(2.15,.25,3.15)),
 ('Upper front middle wall',(.475,-3.5,5.925),(1.45,.25,3.15)),
 ('Upper front right wall',(3.7,-3.5,5.925),(.6,.25,3.15)),
 ('Upper balcony lintel wall',(-1.05,-3.5,7.2),(1.6,.25,.6)),
 ('Upper window lower wall',(2.3,-3.5,4.725),(2.2,.25,.75)),
 ('Upper window upper wall',(2.3,-3.5,7.15),(2.2,.25,.7)),
 ('Upper east lower wall',(4,0,4.575),(.25,7,.45)),
 ('Upper east upper wall',(4,0,6.975),(.25,7,1.05)),
 ('Upper east front wall',(4,-2.1,5.625),(.25,2.8,1.65)),
 ('Upper east back wall',(4,2.55,5.625),(.25,1.9,1.65))]:box(name,p,s,plaster)
 for x in [-4,-1.85,-.25,1.2,3.4,4]:box('Upper oak post',(x,-3.69,5.925),(.18,.22,3.2),wood)
 for z in [4.35,7.5]:
  box('Front storey beam',(0,-3.69,z),(8.4,.24,.23),wood)
  box('Side storey beam',(4.17,0,z),(.2,7.2,.23),wood)
 for y in [-3.5,3.5]:box('Upper side post',(4.17,y,5.9),(.2,.2,3.2),wood)
 for x in [1.3,2.3,3.3]:box('Upper window mullion',(x,-3.72,5.95),(.07,.14,1.8),wood)
 for z in [5.1,5.95,6.8]:box('Upper window frame',(2.3,-3.72,z),(2.2,.14,.09),wood)
 box('Upper front glazing',(2.3,-3.59,5.95),(2.05,.025,1.65),glass,.005)
 # Copy the crafted side window/shutters into the upper-storey opening.
 for o in list(bpy.data.objects):
  if o.name.startswith(('Detail Side window','Detail Shutter')):
   copy=o.copy();copy.data=o.data.copy();copy.name='Villa Upper '+o.name;copy.location.z+=3.2;bpy.context.collection.objects.link(copy)
 # Balcony: deck, protective railing, timber supports and a real doorway above entry.
 box('Balcony floor',(0,-4.35,4.27),(7.7,1.6,.16),wood)
 for x in [-3.7,3.7]:
  box('Porch column',(x,-5.05,2.35),(.22,.22,4.4),wood)
  box('Balcony side handrail',(x,-4.35,5.4),(.12,1.6,.12),wood)
  for y in [-4.85,-4.5,-4.15,-3.8]:box('Balcony side spindle',(x,y,4.85),(.065,.065,1),wood,.01)
 box('Balcony front handrail',(0,-5.08,5.4),(7.6,.12,.12),wood)
 for k in range(29):box('Balcony front spindle',(-3.65+k*7.3/28,-5.08,4.85),(.065,.065,1),wood,.01)
 for x in [-3,0,3]:box('Balcony flower box',(x,-5.22,4.75),(1.5,.4,.32),wood)
 # 24 real visible steps. Godot adds one smooth invisible ramp for capsule movement.
 for k in range(24):
  h=(k+1)*3.99/24;box('Stair tread',(-3.1,-2.8+(k+.5)*5.6/24,.36+h/2),(1.5,5.6/24+.015,h),wood,.01)
 for k in range(12):
  y=-2.7+k*.48;z=.36+(y+2.8)*3.99/5.6
  box('Stair baluster',(-2.3,y,z+.5),(.055,.055,1),wood,.008)
 rail=box('Stair handrail',(-2.3,0,2.855),(.09,math.hypot(5.6,3.99),.1),wood)
 rail.rotation_euler.x=math.atan2(3.99,5.6)
 for y in [-2.6,-2,-1.4,-.8,-.2,.4,1,1.6,2.2]:box('Upper stair guard',(-2.23,y,4.85),(.065,.065,1),wood,.008)
 box('Upper stair handrail',(-2.23,-.2,5.35),(.12,5.2,.12),wood)
 # Taller flowers, low borders, climbing roses, balcony drifts and lakeside accents.
 colors=[(.78,.42,.48),(.9,.73,.64),(.82,.81,.67),(.35,.29,.55),(.58,.43,.65),(.86,.64,.22)]
 petals=[mat('Garden flower '+str(i),c) for i,c in enumerate(colors)]
 greens=[mat('Garden greenery '+str(i),c) for i,c in enumerate([(.035,.085,.025),(.07,.13,.035),(.13,.2,.055)])]
 flowers=Batch('Rich flowers',petals);foliage=Batch('Curved foliage',greens);stems=Batch('Flower stems',[wood])
 count={'daisies':0,'tall_spikes':0,'balcony_flowers':0}
 def leaf(p,a,size,mi=0):
  p=Vector(p);d=Vector((math.cos(a),math.sin(a),.4));w=Vector((-math.sin(a),math.cos(a),0))*size*.28
  c=p+d*size*.45+Vector((0,0,size*.12));tip=p+d*size
  foliage.face([p,c-w,c,tip],mi);foliage.face([p,tip,c,c+w],mi)
 def daisy(p,size,color):
  p=Vector(p)
  for j in range(9):
   a=j*math.tau/9;d=Vector((math.cos(a),math.sin(a),.12));w=Vector((-math.sin(a),math.cos(a),0))*size*.25
   middle=p+d*size*.65;tip=p+d*size
   flowers.face([p,middle-w,tip+Vector((0,0,-size*.12)),middle+w],color)
  center=[p+Vector((math.cos(j*math.tau/8)*size*.22,math.sin(j*math.tau/8)*size*.22,size*.08)) for j in range(8)]
  flowers.face(center,5)
 def plant(x,y,h,color,spike=False,base=0):
  for j in range(4):
   z=base+h*j/4;leaf((x,y,z),j*2.4+rng.random(),rng.uniform(.12,.23),j%3)
  stems.face([(x-.009,y,base),(x+.009,y,base),(x+.009,y,base+h),(x-.009,y,base+h)])
  if spike:
   for k in range(7):
    a=k*2.4;p=(x+math.cos(a)*.045,y+math.sin(a)*.045,base+h-k*.055);daisy(p,.045,color)
   count['tall_spikes']+=1
  else:daisy((x,y,base+h),rng.uniform(.055,.11),color);count['daisies']+=1
 centers=[(-6,-5),(-4.9,-6),(-3,-5.8),(.5,-5.9),(3.6,-5.9),(-5.5,-2),(-5.5,1.7),(5.3,1.5),(5.5,-1),(9.8,-2),(10.8,-5.7),(7,-9),(3.7,-8.3)]
 for ci,(cx,cy) in enumerate(centers):
  for j in range(48):
   x=cx+rng.gauss(0,.48);y=cy+rng.gauss(0,.42)
   if abs(x+1.05)<.9 and y< -3.4:continue
   if abs(x)<4.3 and abs(y)<3.8:continue
   if ((x-7)/4.1)**2+((y+5)/3.5)**2<1:continue
   plant(x,y,rng.uniform(.25,.65) if ci%3 else rng.uniform(.75,1.25),ci%6,ci%3==0)
 for cx in [-3,0,3]:
  for j in range(32):
   x=cx+rng.uniform(-.68,.68);y=-5.22+rng.uniform(-.16,.16)
   plant(x,y,rng.uniform(.13,.32),j%3,False,4.94);count['balcony_flowers']+=1
 # Irregular high climbing growth follows second-storey posts, leaving doors/windows clear.
 for j in range(600):
  x=rng.choice([-3.9,-2.3,.4,3.8])+rng.gauss(0,.27);z=rng.uniform(4.4,7.6)
  if -1.95<x<-.15 or (1.2<x<3.4 and 5<z<6.9):continue
  leaf((x,-3.94,z),rng.uniform(0,math.tau),rng.uniform(.14,.25),j%3)
  if j%13==0:daisy((x,-4.04,z),.1,j%3)
 flowers.finish();foliage.finish();stems.finish()
 # Simple warm fixtures are genuinely present in both Blender and the game.
 glowmat=mat('Villa warm lamp',(1,.58,.2),3)
 for p in [(-1.95,-3.95,2.8),(-.15,-3.95,2.8),(-3,-4.6,5.9),(3,-4.6,5.9)]:
  box('Lantern bracket',p,(.14,.17,.3),wood)
  box('Lantern glow',(p[0],p[1]-.11,p[2]),(.09,.08,.19),glowmat,.01)
  bpy.ops.object.light_add(type='POINT',location=(p[0],p[1]-.25,p[2]));o=bpy.context.object;o.name='Villa warm exterior';o.data.energy=25;o.data.color=(1,.62,.3);o.data.shadow_soft_size=.3
 for p in [(-1,0,6.6),(1,1,6.5)]:
  bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name='Villa warm upper interior';o.data.energy=80;o.data.color=(1,.68,.38);o.data.size=2
 scene.camera.location=(16,-23,11);scene.camera.rotation_euler=(Vector((0,-.8,4.15))-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.lens=43
 scene['villa_upgrade']=True;scene['floor_height']=4.35
 (ROOT/'art/villa_report.json').write_text(json.dumps({'storeys':2,'upper_floor_height':4.35,'stairs':24,'balcony':True,'garden':count,'final_character':False},indent=2))
if not scene.get('villa_upgrade'):build()
# Three physically rendered studies from the same camera and unchanged geometry.
world=scene.world;nodes=world.node_tree.nodes;links=world.node_tree.links
sky=next(n for n in nodes if n.type=='TEX_SKY');background=nodes.get('Background')
sun=next(o for o in bpy.data.objects if o.type=='LIGHT' and o.data.type=='SUN')
scene.render.resolution_x=1000;scene.render.resolution_y=1100;scene.cycles.samples=72;scene.cycles.use_denoising=False
scene.view_settings.exposure=-1.1
# A procedural camera-visible sky keeps blue/daylight and rose dusk legible
# while the Nishita sky still supplies environmental lighting.
for node in list(nodes):
 if node.name.startswith('Backdrop '):nodes.remove(node)
def sky_node(kind,label):
 n=nodes.new(kind);n.name='Backdrop '+label;return n
coords=sky_node('ShaderNodeTexCoord','Direction');xyz=sky_node('ShaderNodeSeparateXYZ','Height')
links.new(coords.outputs['Normal'],xyz.inputs[0])
absolute=sky_node('ShaderNodeMath','Absolute height');absolute.operation='ABSOLUTE';links.new(xyz.outputs['Z'],absolute.inputs[0])
height=sky_node('ShaderNodeMapRange','Height range');height.inputs['From Min'].default_value=0;height.inputs['From Max'].default_value=.45
links.new(absolute.outputs[0],height.inputs['Value'])
gradient=sky_node('ShaderNodeMixRGB','Sky gradient');links.new(height.outputs[0],gradient.inputs[0])
noise=sky_node('ShaderNodeTexNoise','Cloud texture');noise.inputs['Scale'].default_value=5;noise.inputs['Detail'].default_value=3
links.new(coords.outputs['Normal'],noise.inputs['Vector'])
clouds=sky_node('ShaderNodeMapRange','Cloud mask');clouds.inputs['From Min'].default_value=.46;clouds.inputs['From Max'].default_value=.63;clouds.inputs['To Max'].default_value=.94
links.new(noise.outputs['Fac'],clouds.inputs['Value'])
cloud_mix=sky_node('ShaderNodeMixRGB','Cloud color');links.new(clouds.outputs[0],cloud_mix.inputs[0]);links.new(gradient.outputs[0],cloud_mix.inputs[1])
voronoi=sky_node('ShaderNodeTexVoronoi','Star positions');voronoi.inputs['Scale'].default_value=160;links.new(coords.outputs['Normal'],voronoi.inputs['Vector'])
stars=sky_node('ShaderNodeMath','Star points');stars.operation='LESS_THAN';stars.inputs[1].default_value=.027;links.new(voronoi.outputs['Distance'],stars.inputs[0])
star_mix=sky_node('ShaderNodeMixRGB','Stars');star_mix.blend_type='ADD';links.new(cloud_mix.outputs[0],star_mix.inputs[1]);links.new(stars.outputs[0],star_mix.inputs[2])
backdrop=sky_node('ShaderNodeBackground','Camera sky');backdrop.inputs['Strength'].default_value=.8;links.new(star_mix.outputs[0],backdrop.inputs['Color'])
camera_ray=sky_node('ShaderNodeLightPath','Camera ray');mix=sky_node('ShaderNodeMixShader','Camera background')
links.new(camera_ray.outputs['Is Camera Ray'],mix.inputs[0]);links.new(background.outputs[0],mix.inputs[1]);links.new(backdrop.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],nodes.get('World Output').inputs['Surface'])
# Depth-based atmospheric perspective joins distant terrain, tree lines and sky.
if scene.get('forest_garden'):
 scene.use_nodes=True;scene.view_layers[0].use_pass_mist=True;scene.view_layers[0].use_pass_z=True
 world.mist_settings.start=32;world.mist_settings.depth=115;world.mist_settings.falloff='QUADRATIC'
 comp=scene.node_tree;cn=comp.nodes;cl=comp.links
 for n in list(cn):
  if n.name.startswith('Forest atmosphere'):cn.remove(n)
 layers=cn.new('CompositorNodeRLayers');layers.name='Forest atmosphere layers'
 mist=cn.new('CompositorNodeMixRGB');mist.name='Forest atmosphere mix'
 geometry_mask=cn.new('CompositorNodeMath');geometry_mask.name='Forest atmosphere geometry mask';geometry_mask.operation='LESS_THAN';geometry_mask.inputs[1].default_value=10000
 cl.new(layers.outputs['Depth'],geometry_mask.inputs[0])
 fog_factor=cn.new('CompositorNodeMath');fog_factor.name='Forest atmosphere geometry mist';fog_factor.operation='MULTIPLY'
 cl.new(layers.outputs['Mist'],fog_factor.inputs[0]);cl.new(geometry_mask.outputs[0],fog_factor.inputs[1])
 cl.new(fog_factor.outputs[0],mist.inputs[0]);cl.new(layers.outputs['Image'],mist.inputs[1])
 output=next(n for n in cn if n.type=='COMPOSITE');cl.new(mist.outputs[0],output.inputs[0])
 scene.cycles.samples=96
modes=[('day',42,1.7,.30,(1,.96,.87)),('dusk',5,.8,.18,(1,.55,.28)),('night',-12,.22,.22,(.42,.56,1))]
if '--draft' in sys.argv:
 scene.cycles.samples=24;scene.render.resolution_percentage=65
if '--day-only' in sys.argv:modes=modes[:1]
if '--remaining-modes' in sys.argv:modes=modes[1:]
for mode,elevation,energy,strength,color in modes:
 sky.sun_elevation=math.radians(elevation);background.inputs['Strength'].default_value=strength
 sun.data.angle=math.radians(9 if mode=='day' else 12)
 if scene.get('forest_garden'):
  mist.inputs[2].default_value={'day':(.42,.58,.70,1),'dusk':(.43,.30,.33,1),'night':(.025,.045,.085,1)}[mode]
 sun.rotation_euler=(math.radians(90-(38 if mode=='night' else elevation)),math.radians(-20),math.radians(-35));sun.data.energy=energy;sun.data.color=color
 palette={'day':((.55,.75,.93,1),(.10,.36,.74,1),(.9,.95,1,1)),
          'dusk':((.94,.49,.36,1),(.17,.19,.43,1),(.67,.48,.63,1)),
          'night':((.045,.075,.16,1),(.005,.012,.045,1),(.06,.08,.14,1))}[mode]
 gradient.inputs[1].default_value=palette[0];gradient.inputs[2].default_value=palette[1];cloud_mix.inputs[2].default_value=palette[2]
 star_mix.inputs[0].default_value=1 if mode=='night' else 0
 for o in bpy.data.objects:
  if o.type=='LIGHT' and o.name.startswith('Villa warm exterior'):o.data.energy=60 if mode=='night' else 35 if mode=='dusk' else 5
 if mode=='night':
  for l in list(background.inputs['Color'].links):links.remove(l)
  background.inputs['Color'].default_value=(.08,.12,.25,1)
  scene.view_settings.exposure=.3
 else:
  links.new(sky.outputs['Color'],background.inputs['Color']);scene.view_settings.exposure=-1.1
 scene.render.filepath=str(ROOT/(f'landscape_study_{mode}.jpg' if '--draft' in sys.argv else f'villa_{mode}.jpg'))
 if mode=='day' and '--draft' not in sys.argv:
  bpy.ops.file.make_paths_relative();bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'cottage_source.blend'),compress=True)
  bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/cottage_environment.glb'),export_format='GLB',export_cameras=False,export_lights=False)
 bpy.ops.render.render(write_still=True)
print('TWO_STOREY_VILLA_COMPLETE')
