"""Validate and import a material archive without extracting arbitrary ZIP paths."""
import argparse,hashlib,json,re,stat,urllib.parse,zipfile
from pathlib import Path,PurePosixPath
ROOT=Path(__file__).resolve().parents[1]

def import_pack(archive,destination):
    staged=[]
    with zipfile.ZipFile(archive) as z:
        entries=z.infolist()
        if len(entries)>100 or sum(i.file_size for i in entries)>256*1024*1024:raise ValueError('Archive exceeds material-pack limits')
        names=[i.filename for i in entries]
        if len(set(names))!=len(names):raise ValueError('Duplicate archive entries')
        for i in entries:
            p=PurePosixPath(i.filename)
            if p.is_absolute() or '..' in p.parts or '\\' in i.filename or stat.S_ISLNK(i.external_attr>>16):raise ValueError('Unsafe archive path')
        manifest=json.loads(z.read('MANIFEST.json'))
        if not isinstance(manifest.get('files'),list):raise ValueError('Missing file manifest')
        present=set(names)-{'MANIFEST.json'}
        for item in manifest['files']:
            path=item['path']
            if path not in present:continue
            if not re.fullmatch(r'[A-Za-z0-9_-]+/(color|normal|roughness)\.(jpg|jpeg|png)',path):raise ValueError('Unsupported material path')
            if item.get('purpose') not in ('wood','plaster','moss'):raise ValueError('Unexpected material purpose')
            if not re.fullmatch(r'[a-fA-F0-9]{64}',item.get('sha256','')):raise ValueError('Missing SHA256')
            u=urllib.parse.urlparse(item['url']);host=u.hostname or ''
            if u.scheme!='https' or not (host=='polyhaven.org' or host.endswith('.polyhaven.org') or host=='polyhaven.com' or host.endswith('.polyhaven.com')):raise ValueError('Unexpected source')
            data=z.read(path)
            if len(data)!=item['bytes'] or hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('SHA256 or size mismatch: '+path)
            if item.get('md5_expected') and hashlib.md5(data).hexdigest().lower()!=item['md5_expected'].lower():raise ValueError('MD5 mismatch: '+path)
            staged.append((item,data));present.remove(path)
        if present:raise ValueError('Unlisted archive files')
    destination=Path(destination)
    for item,data in staged:
        output=destination/item['path']
        if output.exists() and output.read_bytes()!=data:raise ValueError('Refusing to overwrite a different existing texture')
    destination.mkdir(parents=True,exist_ok=True)
    report=destination/'IMPORT_REPORT.json'
    combined=json.loads(report.read_text()) if report.exists() else {'files':[]}
    by_path={f['path']:f for f in combined['files']}
    for item,data in staged:
        output=destination/item['path'];output.parent.mkdir(exist_ok=True);output.write_bytes(data)
        by_path[item['path']]=item
    combined['files']=sorted(by_path.values(),key=lambda f:f['path'])
    combined['declared_license']=manifest.get('license')
    report.write_text(json.dumps(combined,indent=2,ensure_ascii=False))
    purposes=sorted(set(f['purpose'] for f in combined['files']))
    print('Imported verified maps:',len(staged),'available material groups:',', '.join(purposes))
    return combined

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('archive',type=Path);args=p.parse_args()
    import_pack(args.archive,ROOT/'assets/pbr')
