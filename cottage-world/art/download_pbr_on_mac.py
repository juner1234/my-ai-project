"""Fetch official CC0 material maps through the user's existing Clash proxy.
Uses Python standard library only; never modifies projects, credentials or Git.
"""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request
import zipfile

API='https://api.polyhaven.com'
def leaves(value,keys=()):
    if isinstance(value,dict):
        if isinstance(value.get('url'),str): yield keys,value
        for key,child in value.items():
            if isinstance(child,(dict,list)): yield from leaves(child,keys+(str(key),))
    elif isinstance(value,list):
        for i,child in enumerate(value): yield from leaves(child,keys+(str(i),))

def choose_maps(data):
    selected={}
    for keys,item in leaves(data):
        label='/'.join(keys).lower();url=item['url'];text=label+' '+url.lower()
        if not ('2k' in keys or re.search(r'[/_]2k[/_.]',url.lower())): continue
        if not url.lower().split('?')[0].endswith(('.jpg','.jpeg','.png')):continue
        kind=None
        if any(term in text for term in ['diffuse','diff_','albedo']):kind='color'
        elif 'rough' in text:kind='roughness'
        elif any(term in text for term in ['nor_gl','normalgl','normal_gl']):kind='normal'
        if kind is None: continue
        score=0 if url.lower().split('?')[0].endswith(('.jpg','.jpeg')) else 1
        if kind not in selected or score<selected[kind][0]:selected[kind]=(score,item)
    return {kind:item for kind,(_,item) in selected.items()}

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--proxy',default='http://127.0.0.1:7900')
    args=p.parse_args()
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({'http':args.proxy,'https':args.proxy}))
    def get(url):
        request=urllib.request.Request(url,headers={'User-Agent':'MosslightCottageStudy/1.0'})
        with opener.open(request,timeout=90) as response:
            data=response.read(64*1024*1024+1)
        if len(data)>64*1024*1024:raise RuntimeError('Unexpected asset larger than 64 MiB')
        return data
    print('正在读取 Poly Haven 官方材质目录……',flush=True)
    catalog=json.loads(get(API+'/assets?t=textures'))
    output=Path.home()/'Downloads'/('cottage-materials-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
    output.mkdir(parents=True,exist_ok=False)
    manifest={'source':API,'license':'CC0; https://polyhaven.com/license','files':[]}
    used=set()
    for purpose,words in [('wood',('wood','plank')),('plaster',('plaster','wall')),('moss',('moss',))]:
        candidates=[]
        for asset,info in catalog.items():
            if not re.fullmatch(r'[A-Za-z0-9_-]+',asset):continue
            text=(asset+' '+json.dumps(info,ensure_ascii=False)).lower()
            if words[0] not in text or asset in used:continue
            rank=sum(word in (asset+' '+str(info.get('name',''))).lower() for word in words)
            candidates.append((-rank,-int(info.get('download_count',0) or 0),asset))
        chosen=None
        for _,_,asset in sorted(candidates)[:8]:
            maps=choose_maps(json.loads(get(API+'/files/'+urllib.parse.quote(asset))))
            if 'color' in maps and 'normal' in maps:
                chosen=(asset,maps);break
        if chosen is None:raise RuntimeError('No suitable official 2k material for '+purpose)
        asset,maps=chosen;used.add(asset)
        print('下载 '+purpose+'：'+asset,flush=True)
        for kind,item in maps.items():
            url=item['url'];parsed=urllib.parse.urlparse(url)
            host=parsed.hostname or ''
            if parsed.scheme!='https' or not any(host==domain or host.endswith('.'+domain) for domain in ['polyhaven.com','polyhaven.org']):
                raise RuntimeError('Unexpected download destination')
            data=get(url)
            expected=item.get('md5')
            if expected and hashlib.md5(data).hexdigest().lower()!=expected.lower():raise RuntimeError('Official checksum mismatch: '+asset)
            file=output/asset/(kind+Path(parsed.path).suffix.lower());file.parent.mkdir(exist_ok=True);file.write_bytes(data)
            manifest['files'].append({'asset':asset,'purpose':purpose,'kind':kind,'path':str(file.relative_to(output)),'url':url,'md5_expected':expected,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
    metadata=output/'MANIFEST.json';metadata.write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
    # Keep each transfer archive below the chat attachment limit.
    groups=[];current=[];size=0
    for item in manifest['files']:
        if current and size+item['bytes']>20*1024*1024:groups.append(current);current=[];size=0
        current.append(output/item['path']);size+=item['bytes']
    if current:groups.append(current)
    for i,files in enumerate(groups,1):
        archive=output/f'cottage_materials_{i:02d}.zip'
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
            z.write(metadata,'MANIFEST.json')
            for file in files:z.write(file,str(file.relative_to(output)))
        print('可上传素材包：'+str(archive),flush=True)
    print('完成。请将以上 ZIP 文件上传到聊天；未修改原项目，也未使用任何 AI 额度。')

if __name__=='__main__':
    try:main()
    except Exception as error:
        print('下载未完成：'+str(error))
        raise SystemExit(1)
