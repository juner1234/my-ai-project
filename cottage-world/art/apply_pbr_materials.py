"""Apply available verified PBR sets, preserving missing materials and geometry."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'cottage_source.blend'))
manifest=json.loads((ROOT/'assets/pbr/IMPORT_REPORT.json').read_text())
groups={}
for item in manifest['files']:groups.setdefault(item['purpose'],{})[item['kind']]=item
targets={'wood':['Weathered oak'],'plaster':['Limewashed plaster'],'moss':['Old limestone']}
applied=[]
for purpose,maps in groups.items():
 if not all(kind in maps for kind in ['color','normal','roughness']):
  print('PENDING_INCOMPLETE_SET',purpose);continue
 for name in targets[purpose]:
  mat=bpy.data.materials.get(name)
  if mat is None:raise RuntimeError('Expected material missing: '+name)
  mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
  for socket_name in ['Base Color','Normal','Roughness']:
   for link in list(bs.inputs[socket_name].links):links.remove(link)
  bs.inputs['Base Color'].default_value=(1,1,1,1)
  texture_nodes={}
  for kind in ['color','normal','roughness']:
   image=bpy.data.images.load(str(ROOT/'assets/pbr'/maps[kind]['path']),check_existing=True)
   if tuple(image.size)!=(2048,2048):raise RuntimeError('Expected 2k image: '+maps[kind]['path'])
   image.colorspace_settings.name='sRGB' if kind=='color' else 'Non-Color'
   node=nodes.new('ShaderNodeTexImage');node.name='Official PBR '+kind;node.image=image;texture_nodes[kind]=node
  links.new(texture_nodes['color'].outputs['Color'],bs.inputs['Base Color'])
  links.new(texture_nodes['roughness'].outputs['Color'],bs.inputs['Roughness'])
  normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.5
  links.new(texture_nodes['normal'].outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
  mat['source_asset']=maps['color']['asset'];mat['source_url']=maps['color']['url']
  applied.append({'material':name,'asset':maps['color']['asset'],'purpose':purpose})
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=96;scene.cycles.use_denoising=False
bpy.ops.file.make_paths_relative()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'cottage_source.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/cottage_environment.glb'),export_format='GLB',export_cameras=False,export_lights=False)
(ROOT/'assets/pbr/APPLIED.json').write_text(json.dumps(applied,indent=2))
bpy.ops.render.render(write_still=True)
print('OFFICIAL_PBR_APPLIED',applied)
