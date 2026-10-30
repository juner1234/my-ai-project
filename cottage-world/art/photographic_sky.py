"""Photographic cloud sky with the original scene illumination; preserves the established clear night and warm lamps."""
from pathlib import Path
import bpy,math
ROOT=Path(__file__).resolve().parents[1]
def apply(scene,mode,night_socket):
 world=scene.world;nodes=world.node_tree.nodes;links=world.node_tree.links;output=nodes.get('World Output')
 if mode=='night':
  links.new(night_socket,output.inputs['Surface']);return
 def node(kind,name):
  name='Photo sky '+name;n=nodes.get(name)
  if n is None:n=nodes.new(kind);n.name=name
  return n
 coords=node('ShaderNodeTexCoord','coordinates');mapping=node('ShaderNodeMapping','rotation')
 mapping.inputs['Rotation'].default_value[2]=-2.2
 links.new(coords.outputs['Generated'],mapping.inputs['Vector'])
 lift=node('ShaderNodeVectorMath','upper hemisphere');lift.operation='ADD';lift.inputs[1].default_value=(0,0,.06)
 links.new(mapping.outputs['Vector'],lift.inputs[0])
 textures={}
 for key,filename in [('day','the_sky_is_on_fire_2k.hdr'),('dusk','the_sky_is_on_fire_2k.hdr')]:
  image=bpy.data.images.load(str(ROOT/'assets/sky'/filename),check_existing=True)
  for channel in ['lighting','camera']:
   tex=node('ShaderNodeTexEnvironment',key+' '+channel);tex.image=image;tex.projection='EQUIRECTANGULAR';tex.interpolation='Linear'
   links.new(mapping.outputs['Vector'] if channel=='lighting' else lift.outputs['Vector'],tex.inputs['Vector'])
   textures[(key,channel)]=tex
 camera_background=node('ShaderNodeBackground','camera background');lighting_background=node('ShaderNodeBackground','lighting background')
 # Match camera-visible radiance and neutral ambient light, with gentle direct sunlight.
 camera_background.inputs['Strength'].default_value=1.2 if mode=='day' else .7
 lighting_background.inputs['Strength'].default_value=1.2 if mode=='day' else .7
 saturation=node('ShaderNodeHueSaturation','natural saturation');saturation.inputs['Saturation'].default_value=.28 if mode=='day' else .85
 links.new(textures[(mode,'camera')].outputs['Color'],saturation.inputs['Color'])
 balance=node('ShaderNodeMixRGB','day white balance');balance.blend_type='MULTIPLY';balance.inputs[0].default_value=1
 balance.inputs[2].default_value=(.83,.96,1.12,1) if mode=='day' else (1,1,1,1)
 links.new(saturation.outputs['Color'],balance.inputs[1]);links.new(balance.outputs[0],camera_background.inputs['Color'])
 if mode=='day':
  # Preserve captured cloud structures, with a restrained daylight grade rather
  # than the capture's orange sunset colour cast. Geometry remains unchanged.
  luminance=node('ShaderNodeRGBToBW','cloud luminance');links.new(textures[(mode,'camera')].outputs['Color'],luminance.inputs[0])
  cloud_range=node('ShaderNodeMapRange','day cloud range');cloud_range.inputs['From Min'].default_value=.78;cloud_range.inputs['From Max'].default_value=1.85
  links.new(luminance.outputs[0],cloud_range.inputs['Value'])
  palette=node('ShaderNodeValToRGB','day cloud colour');palette.color_ramp.elements[0].color=(.20,.41,.67,1);palette.color_ramp.elements[1].color=(.95,.98,1,1)
  links.new(cloud_range.outputs[0],palette.inputs[0]);links.new(palette.outputs[0],camera_background.inputs['Color'])
 links.new(textures[(mode,'lighting')].outputs['Color'],lighting_background.inputs['Color'])
 ray=node('ShaderNodeLightPath','ray');mix=node('ShaderNodeMixShader','background mix')
 links.new(ray.outputs['Is Camera Ray'],mix.inputs[0]);links.new(nodes.get('Background').outputs[0],mix.inputs[1]);links.new(camera_background.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],output.inputs['Surface'])
 sun=next(o for o in bpy.data.objects if o.type=='LIGHT' and o.data.type=='SUN')
 sun.data.energy=1.7 if mode=='day' else .8
 if mode=='day':
  sun.data.color=(1,.96,.87);scene.view_settings.exposure=-1.1
 scene['photographic_sky']=True
