"""Fetch official CC0 material maps through the user's existing Clash proxy.
Uses Python standard library only; never modifies projects, credentials or Git.
"""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import urllib.parse
import zipfile

API='https://api.polyhaven.com'
def download_bytes(url,proxy,expected_md5=None,expected_size=None,cache_dir=None):
    # Use curl's configured trust store instead of a separate Python CA bundle.
    # TLS and redirect verification stay enabled; never use --insecure/-k.
    cache=Path(cache_dir) if cache_dir else Path.home()/'Library/Caches/MosslightCottage/materials'
    cache.mkdir(parents=True,exist_ok=True)
    key=hashlib.sha256(url.encode()).hexdigest()
    complete=cache/(key+'.complete');partial=cache/(key+'.part')
    def valid(path):
        if not path.is_file() or path.stat().st_size>64*1024*1024:return False
        data=path.read_bytes()
        if isinstance(expected_size,int) and expected_size>0 and len(data)!=expected_size:return False
        return not expected_md5 or hashlib.md5(data).hexdigest().lower()==expected_md5.lower()
    if complete.exists():
        if valid(complete):return complete.read_bytes()
        complete.unlink()
    error='unknown download error'
    for attempt in range(5):
        if expected_md5 and valid(partial):
            partial.replace(complete);return complete.read_bytes()
        if partial.exists() and partial.stat().st_size>64*1024*1024:
            partial.unlink();raise RuntimeError('Unexpected asset larger than 64 MiB')
        offset=partial.stat().st_size if partial.exists() else 0
        if attempt or offset:
            print('  正在续传：已保存 %.1f MiB，尝试 %d/5'%(offset/1048576,attempt+1),flush=True)
        command=[
            '/usr/bin/curl','--fail','--silent','--show-error','--location','--http1.1',
            '--proto','=https','--proto-redir','=https',
            '--connect-timeout','20','--max-time','180','--speed-time','45','--speed-limit','256',
            '--max-filesize',str(64*1024*1024),'--output',str(partial),
            '--proxy',proxy,'--user-agent','MosslightCottageStudy/1.0'
        ]
        if offset:command+=['--continue-at','-']
        try:result=subprocess.run(command+[url],stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=200)
        except subprocess.TimeoutExpired:
            error='连接超时，已保留部分文件'
        else:
            if result.returncode==0:
                if valid(partial):
                    partial.replace(complete);return complete.read_bytes()
                partial.unlink(missing_ok=True)
                error='官方文件大小或校验值不匹配，重新下载'
            elif result.returncode in (33,36):
                partial.unlink(missing_ok=True)
                error='服务器未接受断点位置，重新下载此文件'
            else:
                error=result.stderr.decode('utf-8',errors='replace').strip()[-1200:]
                if result.returncode not in (5,6,7,18,28,35,52,55,56,92):
                    raise RuntimeError('系统 curl 下载失败：'+error)
        if attempt<4:time.sleep(min(2*(attempt+1),8))
    raise RuntimeError('多次连接中断，进度已保留。重新运行可继续。最后错误：'+error)

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
    def get(url,expected_md5=None,expected_size=None):
        return download_bytes(url,args.proxy,expected_md5,expected_size)
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
            expected=item.get('md5')
            print('  '+kind+' 贴图',flush=True)
            data=get(url,expected,item.get('size'))
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
