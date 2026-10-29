"""Render the original 42-second animated picture-book film from a six-panel sheet.
Usage: python3 tools/render_film.py path/to/storyboard.png
Requires Pillow, numpy, scipy and ffmpeg. Music provenance: video/audio/CREDITS.md.
"""
from pathlib import Path
import sys, math, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'video'; OUT.mkdir(exist_ok=True)
W,H,FPS=720,1280,30
DURATION=42
font_path='/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc'
font=ImageFont.truetype(font_path,27)
small=ImageFont.truetype(font_path,18)
title=ImageFont.truetype(font_path,48)
sheet=Image.open(sys.argv[1]).convert('RGB')
panels=[]
for i in range(6):
    x,y=i%3,i//3
    panels.append(sheet.crop((x*sheet.width//3,y*sheet.height//2,(x+1)*sheet.width//3,(y+1)*sheet.height//2)).resize((860,860),Image.Resampling.LANCZOS))
    panels[-1].save(OUT/f'scene_{i+1:02d}.jpg',quality=95)
captions=['天快黑了，她还不想回家。','直到她捡到一颗，忘了发光的星星。','它轻轻飞起，像是记得回家的路。','于是，她坐上了开往雪夜的末班车。','原来，它等的不是天空。','而是一扇，等人点亮的窗。']
rng=np.random.default_rng(27)
snow=rng.random((100,4))

def center(draw,y,text,f,fill):
    b=draw.textbbox((0,0),text,font=f)
    draw.text(((W-b[2])/2,y),text,font=f,fill=fill)

def camera(idx,u):
    # Sample with floating-point coordinates: never round a camera position.
    ease=u*u*(3-2*u)
    z=1+.035*ease
    span=W/z
    x=(860-span)/2+(10 if idx%2 else -10)*(ease-.5)
    y=(860-span)/2-8*ease
    return panels[idx].transform((W,W),Image.Transform.AFFINE,
        (1/z,0,x,0,1/z,y),resample=Image.Resampling.BICUBIC)

def frame(t):
    idx=min(5,int(t//7)); u=(t%7)/7
    ease=u*u*(3-2*u)
    bg=camera(idx,u)
    # Cross-dissolve illustration only, leaving titles and subtitles stable.
    if idx<5 and u>6.35/7:
        f=(u*7-6.35)/.65
        bg=Image.blend(bg,camera(idx+1,0),f*f*(3-2*f))
    im=Image.new('RGB',(W,H),(32,48,72))
    im.paste(bg,(0,240))
    layer=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(layer)
    # Floating golden protagonist star and its fading curved trail.
    if idx in (0,2,4):
        sx=170+380*ease; sy=680-115*math.sin(u*math.pi)-idx*14
        if idx==4: sx=360+330*ease; sy=720-280*ease
        for k in range(24):
            q=k/24; px=sx-100*q; py=sy+20*math.sin(q*4+t)
            d.ellipse((px-2,py-2,px+2,py+2),fill=(255,219,142,int(140*(1-q))))
        glow=Image.new('RGBA',(W,H)); gd=ImageDraw.Draw(glow)
        gd.ellipse((sx-26,sy-26,sx+26,sy+26),fill=(255,190,70,120))
        layer=Image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(18)),layer)
        d=ImageDraw.Draw(layer)
        pts=[]
        for j in range(10):
            a=j*math.pi/5-math.pi/2+t*.35; r=13 if j%2==0 else 5
            pts.append((sx+r*math.cos(a),sy+r*math.sin(a)))
        d.polygon(pts,fill=(255,231,156,255))
    if idx>=3:
        for a,b,c,e in snow:
            x=(a*W+15*math.sin(t*.7+b*6))%W
            y=240+(b*720+t*(15+30*c))%720
            r=1+e*2
            d.ellipse((x-r,y-r,x+r,y+r),fill=(225,237,255,int(70+120*c)))
    # Broad light bloom and subtle window reflections remain inside the artwork.
    atmosphere=Image.new('RGBA',(W,H)); ad=ImageDraw.Draw(atmosphere)
    if idx==1:
        strength=int(22+10*math.sin(u*math.pi))
        ad.ellipse((230,540,550,840),fill=(255,185,65,strength))
    elif idx==3:
        shift=int(-240+1000*u)
        ad.polygon([(shift,240),(shift+45,240),(shift-130,960),(shift-220,960)],fill=(189,217,255,16))
    elif idx==5:
        ad.ellipse((500,440,810,740),fill=(255,181,60,int(18+36*ease)))
    atmosphere=atmosphere.filter(ImageFilter.GaussianBlur(25))
    layer=Image.alpha_composite(layer,atmosphere)
    d=ImageDraw.Draw(layer)
    for k in range(11):
        x=35+k*65; y=160+12*math.sin(k*3+t*.4)
        a=int(70+90*(.5+.5*math.sin(t*1.5+k)))
        d.line((x-3,y,x+3,y),fill=(255,219,150,a),width=1)
        d.line((x,y-4,x,y+4),fill=(255,219,150,a),width=1)
    im=Image.alpha_composite(im.convert('RGBA'),layer).convert('RGB')
    dr=ImageDraw.Draw(im)
    center(dr,67,'把星星送回家',title,(245,222,183))
    center(dr,135,'A LITTLE LIGHT, A LONG WAY HOME',small,(160,184,204))
    dr.line((80,1014,640,1014),fill=(93,113,135),width=1)
    center(dr,1051,captions[idx],font,(244,226,201))
    center(dr,1133,f'{idx+1:02d}  /  06',small,(158,179,199))
    if idx==5:
        center(dr,1190,'每一束微光，都有归处。',small,(236,204,154))
    # Only the film's opening and ending fade out; scene boundaries never blink.
    alpha=min(1,t/1.0,(DURATION-t)/1.6)
    if alpha<1: im=Image.blend(Image.new('RGB',(W,H),(32,48,72)),im,max(0,alpha))
    return im

# The source melody is an existing CC0 musical loop, not the old synth score.
subprocess.run([sys.executable,str(ROOT/'tools/build_soundtrack.py')],check=True)
cmd=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(OUT/'audio/revised_mix.wav'),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-af','loudnorm=I=-18:TP=-1.5:LRA=9','-ar','48000','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest',str(OUT/'bring_the_star_home_v2.mp4')]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for k in range(FPS*DURATION):
    im=frame(k/FPS)
    if k in [72,240,408,576,744,912]: im.save(OUT/f'v2_preview_{k:04d}.jpg',quality=92)
    p.stdin.write(im.tobytes())
    if k%(FPS*7)==0: print(f'Rendered {k//FPS}/{DURATION}s',flush=True)
p.stdin.close()
if p.wait(): raise RuntimeError('ffmpeg encode failed')
frame(38).save(OUT/'poster_v2.jpg',quality=95)
print(OUT/'bring_the_star_home_v2.mp4')
