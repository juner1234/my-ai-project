"""Score the approved picture edit without re-encoding its video frames.

python3 tools/score_film.py --music /path/to/sb_reverie.mp3
"""
import argparse
from pathlib import Path
import subprocess
import wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('--music',type=Path,required=True)
p.add_argument('--start',type=float,default=0)
args=p.parse_args()
sr=48000
duration=42
def decode(path,start=0):
    raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(start),'-i',str(path),'-t',str(duration),'-ar',str(sr),'-ac','2','-f','f32le','-'])
    a=np.frombuffer(raw,dtype='<f4').reshape(-1,2).astype(np.float64)
    if len(a)<sr*duration: raise ValueError(f'Audio shorter than the picture edit: {path.name}')
    return a[:sr*duration]
subprocess.run(['python3',str(ROOT/'tools/build_soundtrack.py')],check=True)
music=decode(args.music,args.start)
effects=decode(ROOT/'video/audio/scene_effects.wav')
t=np.arange(len(music))/sr
# Preserve the source's musical dynamics; adjust only its overall level.
music*=.075/max(.001,np.sqrt(np.mean(music**2)))
envelope=np.minimum(1,t/1.8)*np.minimum(1,(duration-t)/4.2)
duck=np.ones(len(t))
for event in [8.2,14.4,21.4,35.2]:
    duck-=.16*np.exp(-((t-event)/.75)**2)
mix=music*(envelope*duck)[:,None]+effects*.72
peak=float(np.max(np.abs(mix)))
if peak>.9: mix*=.9/peak
wav=ROOT/'video/audio/reverie_mix.wav'
with wave.open(str(wav),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr)
    f.writeframes((mix*32767).astype('<i2').tobytes())
out=ROOT/'video/bring_the_star_home_v6.mp4'
subprocess.run(['ffmpeg','-y','-v','error','-i',str(ROOT/'video/bring_the_star_home_v5.mp4'),'-i',str(wav),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','loudnorm=I=-18:TP=-1.5:LRA=9','-ar','48000','-c:a','aac','-b:a','192k','-t','42','-metadata','title=把星星送回家 · Reverie 配乐版','-metadata','comment=Music: Reverie by Scott Buckley; www.scottbuckley.com.au/library. Excerpt, fades and sound-effects mix.','-movflags','+faststart',str(out)],check=True)
print(out)
