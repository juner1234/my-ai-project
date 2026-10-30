"""Render the original 42-second animated picture-book film from a six-panel sheet.
Usage: python3 tools/render_film.py path/to/storyboard.png
Requires Pillow, numpy, scipy and ffmpeg. Music provenance: video/audio/CREDITS.md.
"""
from pathlib import Path
import sys, math, subprocess, wave, argparse
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
parser=argparse.ArgumentParser()
parser.add_argument('sheet')
parser.add_argument('--stills-only',action='store_true')
parser.add_argument('--music',type=Path,help='Verified local Reverie file; otherwise export sound-effects-only visual review')
args=parser.parse_args()
sheet=Image.open(args.sheet).convert('RGB')
panels=[]
for i in range(6):
    x,y=i%3,i//3
    panels.append(sheet.crop((x*sheet.width//3,y*sheet.height//2,(x+1)*sheet.width//3,(y+1)*sheet.height//2)).resize((860,860),Image.Resampling.LANCZOS))

captions=[('暮色落在肩上','她还不想回家'),('她捧起一颗星星','也捧起了一点温暖'),('微光轻轻向前','像是记得归途'),('末班电车穿过雪夜','带着她，也带着一个愿望'),('原来它等的','不是遥远的天空'),('而是一扇窗','和窗后，等它回家的人')]
chapters=['暮色','拾光','寻路','雪夜','归处','灯火']
font_big=ImageFont.truetype(font_path,34)
font_second=ImageFont.truetype(font_path,27)
chapter_font=ImageFont.truetype(font_path,17)
header_font=ImageFont.truetype(font_path,42)
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
    if idx!=1:
        for a,b,c,e in snow:
            x=(a*W+15*math.sin(t*.7+b*6))%W
            y=240+(b*720+t*(15+30*c))%720
            # Snow is outside the tram glass, never on the girl's indoor face.
            if idx==3 and not (x>458 and y<600+.32*(x-458)):
                continue
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
        for j,(x,y) in enumerate([(170,550),(280,620),(400,575),(530,540),(630,620)]):
            strength=int(30*min(1,max(0,(u*7-j*.8-1)/1.1)))
            ad.ellipse((x-24,y-30,x+24,y+30),fill=(255,185,65,strength))
    atmosphere=atmosphere.filter(ImageFilter.GaussianBlur(25))
    layer=Image.alpha_composite(layer,atmosphere)
    d=ImageDraw.Draw(layer)
    im=Image.alpha_composite(im.convert('RGBA'),layer).convert('RGB')
    # Fixed header, fine warm frame and a quiet storybook hierarchy.
    dr=ImageDraw.Draw(im)
    center(dr,51,'把星星送回家',header_font,(243,222,190))
    center(dr,116,'A LITTLE LIGHT · A LONG WAY HOME',small,(155,175,193))
    dr.line((46,211,674,211),fill=(102,108,111),width=1)
    # Supersampled text overlay avoids staircase motion during its gentle rise.
    text_layer=Image.new('RGBA',(W*2,610))
    td=ImageDraw.Draw(text_layer)
    age=u*7
    enter=min(1,max(0,(age-.25)/1.2))
    enter=enter*enter*(3-2*enter)
    leave=min(1,max(0,(7-age)/.6)) if idx<5 else 1
    opacity=int(255*enter*leave)
    def centered_scaled(y,words,f,color,spacing=0):
        ff=ImageFont.truetype(font_path,f*2)
        widths=[td.textlength(ch,font=ff) for ch in words]
        width=sum(widths)+spacing*2*max(0,len(words)-1)
        x=(W*2-width)/2
        for ch,ww in zip(words,widths):
            td.text((x,y*2),ch,font=ff,fill=(*color,opacity))
            x+=ww+spacing*2
    yoff=7*(1-enter)
    centered_scaled(15+yoff,f'{idx+1:02d}  /  '+chapters[idx],16,(194,163,115),3)
    reveal=140*enter
    td.line(((W/2-reveal)*2,104,(W/2+reveal)*2,104),fill=(194,163,115,int(opacity*.55)),width=1)
    # Small diamond at the divider's center, not busy particles around the text.
    cx,cy=W,104
    td.polygon([(cx,cy-6),(cx+4,cy),(cx,cy+6),(cx-4,cy)],fill=(235,211,166,opacity))
    centered_scaled(76+yoff,captions[idx][0],34,(247,230,203),2)
    centered_scaled(130+yoff,captions[idx][1],27,(200,207,211),1)
    if idx==5: centered_scaled(206,'每一束微光，都有归处。',17,(194,163,115),2)
    for k in range(6):
        x=(W/2+(k-2.5)*20)*2
        td.ellipse((x-3,534,x+3,540),fill=(*( (224,195,143) if k==idx else (82,105,126)),210))
    text_layer=text_layer.resize((W,305),Image.Resampling.LANCZOS)
    base=im.convert('RGBA');base.alpha_composite(text_layer,(0,975));im=base.convert('RGB')
    # Only the film's opening and ending fade out; scene boundaries never blink.
    alpha=min(1,t/1.0,(DURATION-t)/1.6)
    if alpha<1: im=Image.blend(Image.new('RGB',(W,H),(32,48,72)),im,max(0,alpha))
    return im

# Render stills independently for visual review; no unverified music substitution.
if args.stills_only:
    for i in range(6): frame(i*7+3).save(OUT/f'v3_scene_{i+1:02d}.jpg',quality=94)
    frame(10).save(OUT/'poster_v3.jpg',quality=95)
    sys.exit(0)
subprocess.run([sys.executable,str(ROOT/'tools/build_soundtrack.py')],check=True)
audio_path=OUT/'audio/scene_effects.wav'
if args.music:
    audio_path=OUT/'audio/v3_reverie_mix.wav'
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(args.music),'-i',str(OUT/'audio/scene_effects.wav'),'-filter_complex','[0:a]atrim=duration=42,asetpts=PTS-STARTPTS,afade=t=in:d=2,afade=t=out:st=38:d=4,volume=0.8[m];[m][1:a]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-18:TP=-1.5:LRA=9','-t','42','-ar','48000',str(audio_path)],check=True)
cmd=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(audio_path),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-ar','48000','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest',str(OUT/'bring_the_star_home_v3.mp4')]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for k in range(FPS*DURATION):
    im=frame(k/FPS)
    if k in [72,240,408,576,744,912]: im.save(OUT/f'v3_preview_{k:04d}.jpg',quality=92)
    p.stdin.write(im.tobytes())
    if k%(FPS*7)==0: print(f'Rendered {k//FPS}/{DURATION}s',flush=True)
p.stdin.close()
if p.wait(): raise RuntimeError('ffmpeg encode failed')
frame(38).save(OUT/'poster_v3.jpg',quality=95)
print(OUT/'bring_the_star_home_v3.mp4')
