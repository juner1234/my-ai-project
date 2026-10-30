"""Existing MDN CC0 lo-fi sample + original, scene-timed sound design."""
from pathlib import Path
import subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT=Path(__file__).resolve().parents[1]
SR=44100
N=42*SR
rng=np.random.default_rng(417)
raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(ROOT/'video/audio/rnb-lofi-melody-loop.wav'),'-f','f32le','-ar',str(SR),'-ac','2','-'])
sample=np.frombuffer(raw,dtype='<f4').reshape(-1,2).astype(float)
# The source is a complete 7.5-second musical loop; preserve its beat alignment.
music=np.tile(sample,(int(np.ceil(N/len(sample))),1))[:N]
music*=.24/max(.01,np.max(np.abs(music)))
sfx=np.zeros((N,2))
def add(start,signal,gain=1,pan=0):
    if signal.ndim==1: signal=np.column_stack((signal*np.sqrt((1-pan)/2),signal*np.sqrt((1+pan)/2)))
    pos=int(start*SR); end=min(N,pos+len(signal))
    if end>pos:sfx[pos:end]+=gain*signal[:end-pos]
def noise(seconds,lo,hi):
    return sosfilt(butter(2,[lo,hi],btype='bandpass',fs=SR,output='sos'),rng.normal(size=int(seconds*SR)))
def bell(freq,seconds=1.7):
    q=np.arange(int(seconds*SR))/SR
    return (np.sin(2*np.pi*freq*q)+.18*np.sin(2*np.pi*freq*2.76*q))*np.exp(-q*3.4)*np.minimum(1,q/.008)
# Distant breeze and city texture, no competing melody.
wind=noise(42,100,900); q=np.arange(N)/SR
add(0,wind,.023)
# Walking, then running through the alley; alternate stereo placement.
for start,end,step,level in [(1.1,5.8,.72,.07),(14.6,20.3,.38,.085),(29,33.2,.8,.06)]:
    for j,t in enumerate(np.arange(start,end,step)):
        dur=.13; v=noise(dur,120,2200); a=np.arange(len(v))/SR
        v*=np.exp(-a*35)*np.minimum(1,a/.006)
        add(t,v,level,(-1 if j%2 else 1)*.18)
# Delicate star discovery and a second upward sparkle on departure.
for base in [8.2,14.4]:
    for j,f in enumerate([784,988,1175]):add(base+j*.16,bell(f),.052,(-.3+j*.3))
# Tram arrival: low motor, soft wheel joints, and one restrained station bell.
tram=noise(7,55,550); tq=np.arange(len(tram))/SR
tram*=np.sin(np.pi*tq/7)**1.2
add(21,tram,.15)
for t in np.arange(21.5,27.2,.8):
    v=noise(.12,65,350); v*=np.exp(-np.arange(len(v))/SR*35)
    add(t,v,.1)
add(21.4,bell(659),.035,-.25)
add(21.7,bell(523),.03,.25)
# A broad, quiet exhale as the last window warms up.
v=noise(3,350,2600); v*=np.sin(np.linspace(0,np.pi,len(v)))**2
add(34.8,v,.035)
for j,f in enumerate([523.25,659.25,783.99,1046.5]):add(35.2+j*.27,bell(f,2.6),.045,-.45+j*.3)
# Tiny stereo echo keeps sparkles soft instead of sharp.
delay=int(.19*SR)
sfx[delay:]+=sfx[:-delay,::-1]*.18
music_env=np.ones(N)
for t in [8.2,14.4,21.4,35.2]:
    music_env-=.18*np.exp(-((q-t)/.8)**2)
mix=music*music_env[:,None]+sfx
fade=np.minimum(1,q/1.5)*np.minimum(1,(42-q)/3)
with wave.open(str(ROOT/'video/audio/scene_effects.wav'),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
    f.writeframes((np.clip(sfx*fade[:,None]*2,-.9,.9)*32767).astype('<i2').tobytes())
mix*=fade[:,None]
peak=np.max(np.abs(mix))
if peak>.88:mix*=.88/peak
path=ROOT/'video/audio/revised_mix.wav'
with wave.open(str(path),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
    f.writeframes((mix*32767).astype('<i2').tobytes())
print(f'Audio: peak {np.max(np.abs(mix)):.3f}, RMS {np.sqrt(np.mean(mix**2)):.3f}')
