"""Render the surroundings from the same saved model, without changing its camera."""
import bpy,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'cottage_source.blend'))
scene=bpy.context.scene;camera=scene.camera
camera.location=(48,-60,35);camera.rotation_euler=(Vector((-8,9,2.5))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=36
scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world.mist_settings.start=80;scene.world.mist_settings.depth=200
scene.cycles.samples=72;scene.cycles.use_denoising=False
if '--draft' in sys.argv:
 scene.render.resolution_percentage=60;scene.cycles.samples=20
scene.render.filepath=str(ROOT/('landscape_overview_study.jpg' if '--draft' in sys.argv else 'landscape_overview.jpg'))
bpy.ops.render.render(write_still=True)
print('LANDSCAPE_OVERVIEW_COMPLETE')
