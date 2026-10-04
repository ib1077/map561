from pathlib import Path
import json, hashlib, re, sys
p=Path(sys.argv[1] if len(sys.argv)>1 else 'pwa-work/智頭線_路線図ビューア_PWA一式')
version=sys.argv[2] if len(sys.argv)>2 else '13.16A'
s=(p/'index.html').read_text();s=re.sub(r'(<span id="appVersion">)Ver\.[^<]+',r'\g<1>Ver.'+version,s);(p/'index.html').write_text(s)
files={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(p.iterdir()) if f.suffix in ('.js','.css','.html','.svg','.png','.webmanifest') and f.name!='sw.js'}
build=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()[:20]
release=dict(version=version,build=build,files=files)
(p/'release.json').write_text(json.dumps(dict(version=version,build=build)))
(p/'sw.js').write_text(Path(__file__).with_name('sw-template.js').read_text().replace('__RELEASE__',json.dumps(release,separators=(',',':'))))
print(version,build,len(files),'offline files')
