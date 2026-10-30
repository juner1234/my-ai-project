"""Daylight-only foliage palette; dusk/night retain the previous material colours."""
import bpy
PALETTES={
 'Woodland leaf ':[(.05,.105,.035),(.09,.175,.065),(.15,.25,.10),(.22,.31,.14)],
 'Botanical leaf ':[(.045,.10,.03),(.075,.15,.045),(.115,.195,.065),(.16,.245,.09),(.22,.30,.12)],
 'Living moss ':[(.06,.11,.035),(.10,.17,.055),(.15,.23,.08)],
}
def apply(scene,mode):
 for prefix,colours in PALETTES.items():
  for index,rgb in enumerate(colours):
   mat=bpy.data.materials.get(prefix+str(index))
   if mat is None:continue
   bs=mat.node_tree.nodes.get('Principled BSDF')
   if 'greenery_original_rgba' not in mat:mat['greenery_original_rgba']=list(bs.inputs['Base Color'].default_value)
   colour=(*rgb,1) if mode=='day' else tuple(mat['greenery_original_rgba'])
   bs.inputs['Base Color'].default_value=colour;mat.diffuse_color=colour
 if mode=='day':
  # Fill shadows gently; leave photographic sky colour and camera exposure alone.
  scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.40
  sun=next(o for o in bpy.data.objects if o.type=='LIGHT' and o.data.type=='SUN')
  sun.data.energy=1.6
