"""Bake procedural material color/normal maps for portable, textured GLB assets."""
import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'cottage_source.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1;scene.cycles.use_denoising=False
folder=ROOT/'assets/textures';folder.mkdir(exist_ok=True)
materials=[m for m in bpy.data.materials if m.use_nodes and m.node_tree.nodes.get('Principled BSDF') and any(n.bl_idname=='ShaderNodeValToRGB' for n in m.node_tree.nodes)]
for count,mat in enumerate(materials):
 bpy.ops.object.select_all(action='DESELECT')
 bpy.ops.mesh.primitive_plane_add(size=2,location=(1000,1000,1000))
 plane=bpy.context.object;plane.data.materials.append(mat)
 nodes=mat.node_tree.nodes;links=mat.node_tree.links
 bs=nodes.get('Principled BSDF');output=nodes.get('Material Output')
 stem=mat.name.lower().replace(' ','_')
 target=nodes.new('ShaderNodeTexImage')
 normal=bpy.data.images.new(stem+'_normal',width=512,height=512,alpha=False,is_data=True)
 target.image=normal;nodes.active=target
 bpy.ops.object.bake(type='NORMAL')
 normal.filepath_raw=str(folder/(stem+'_normal.png'));normal.file_format='PNG';normal.save()
 color=bpy.data.images.new(stem+'_color',width=512,height=512,alpha=False)
 target.image=color;nodes.active=target
 original_color=bs.inputs['Base Color'].links[0].from_socket
 emission=nodes.new('ShaderNodeEmission');links.new(original_color,emission.inputs['Color']);links.new(emission.outputs[0],output.inputs['Surface'])
 bpy.ops.object.bake(type='EMIT')
 color.filepath_raw=str(folder/(stem+'_color.png'));color.file_format='PNG';color.save()
 links.new(bs.outputs['BSDF'],output.inputs['Surface']);nodes.remove(emission)
 links.new(target.outputs['Color'],bs.inputs['Base Color'])
 nm_image=nodes.new('ShaderNodeTexImage');nm_image.image=normal
 nm=nodes.new('ShaderNodeNormalMap');links.new(nm_image.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
 bpy.data.objects.remove(plane,do_unlink=True)
 print('BAKED',count+1,len(materials),mat.name,flush=True)
# Give generated meshes portable UVs; primitive meshes already have UV maps.
for obj in bpy.context.scene.objects:
 if obj.type=='MESH' and not obj.data.uv_layers:
  uv=obj.data.uv_layers.new(name='UVMap')
  for poly in obj.data.polygons:
   axis=max(range(3),key=lambda i:abs(poly.normal[i]))
   axes=[i for i in range(3) if i!=axis]
   for loop in poly.loop_indices:
    v=obj.data.vertices[obj.data.loops[loop].vertex_index].co
    uv.data[loop].uv=(v[axes[0]]*.4,v[axes[1]]*.4)
scene.cycles.samples=96
bpy.ops.file.make_paths_relative()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'cottage_source.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/cottage_environment.glb'),export_format='GLB',export_cameras=False,export_lights=False)
print('PORTABLE_PBR_EXPORT_COMPLETE')
