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
p.add_argument('--short',action='store_true',help='Score the 34-second release edit, remapping scene effects')
args=p.parse_args()
sr=48000
duration=34 if args.short else 42
def decode(path,start=0,seconds=None):
    seconds=seconds or duration
    raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(start),'-i',str(path),'-t',str(seconds),'-ar',str(sr),'-ac','2','-f','f32le','-'])
    a=np.frombuffer(raw,dtype='<f4').reshape(-1,2).astype(np.float64)
    if len(a)<sr*seconds: raise ValueError(f'Audio shorter than the picture edit: {path.name}')
    return a[:sr*seconds]
subprocess.run(['python3',str(ROOT/'tools/build_soundtrack.py')],check=True)
music=decode(args.music,args.start)
effects=decode(ROOT/'video/audio/scene_effects.wav',seconds=42)
if args.short:
    source=effects
    effects=np.zeros((duration*sr,2))
    for idx,start,length in [(1,0,3),(0,3,4),(2,7,5),(3,12,7),(4,19,7),(5,26,8)]:
        n=min(length,7)*sr
        clip=source[idx*7*sr:idx*7*sr+n].copy()
        ramp=np.minimum(1,np.arange(n)/(sr*.025))*np.minimum(1,(n-1-np.arange(n))/(sr*.025))
        effects[start*sr:start*sr+n]=clip*ramp[:,None]
t=np.arange(len(music))/sr
# Preserve the source's musical dynamics; adjust only its overall level.
music*=.075/max(.001,np.sqrt(np.mean(music**2)))
envelope=np.minimum(1,t/(.7 if args.short else 1.8))*np.minimum(1,(duration-t)/(3.3 if args.short else 4.2))
duck=np.ones(len(t))
for event in ([1.2,7.4,12.4,26.2] if args.short else [8.2,14.4,21.4,35.2]):
    duck-=.16*np.exp(-((t-event)/.75)**2)
mix=music*(envelope*duck)[:,None]+effects*.72
peak=float(np.max(np.abs(mix)))
if peak>.9: mix*=.9/peak
wav=ROOT/f'video/audio/reverie_mix{"_short" if args.short else ""}.wav'
with wave.open(str(wav),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr)
    f.writeframes((mix*32767).astype('<i2').tobytes())
out=ROOT/f'video/bring_the_star_home_{"v7" if args.short else "v6"}.mp4'
picture=ROOT/f'video/bring_the_star_home_{"v7_picture" if args.short else "v5"}.mp4'
subprocess.run(['ffmpeg','-y','-v','error','-i',str(picture),'-i',str(wav),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','loudnorm=I=-18:TP=-1.5:LRA=9','-ar','48000','-c:a','aac','-b:a','192k','-t',str(duration),'-metadata','title=把星星送回家 · Reverie 配乐版','-metadata','comment=Music: Reverie by Scott Buckley; www.scottbuckley.com.au/library. Excerpt, fades and sound-effects mix.','-movflags','+faststart',str(out)],check=True)
print(out)
