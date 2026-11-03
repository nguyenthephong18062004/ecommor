"""Check restyled project, native roundtrip, preserved content and PNG exports."""
from pathlib import Path
from collections import Counter
import xml.etree.ElementTree as E
import json, sqlite3, hashlib, struct, re, html
from urllib.parse import quote

HERE=Path(__file__).resolve().parent
OUT=HERE/'restyled'
PROJECT=OUT/'ECOMMOR-trinh-bay-theo-mau.vpp'

def read(path):
    r=E.parse(path).getroot()
    for e in r.iter():e.tag=e.tag.split('}')[-1]
    return r
def norm(s):return re.sub(r'\s+',' ',s or '').strip()
def diagram_key(d):return 'uc-overview' if d.get('name').startswith('UC —') else d.get('name').split(' — ')[0]
def content(d,native_extend=False):
    shapes={s.get('id'):norm(s.get('name')) for s in d.findall('./Shapes/Shape')}
    result=[]
    for c in d.findall('./Connectors/Connector'):
        kind=c.get('shapeType');a=shapes.get(c.get('from'));z=shapes.get(c.get('to'));label=norm(c.get('name'))
        if kind=='Extend' and native_extend:a,z=z,a;label=''
        result.append((kind,a,z,label))
    return Counter(result)

def main():
    original=read(HERE/'original-export/project.xml');actual=read(OUT/'final-images/project.xml');source=read(OUT/'restyled.xml')
    ds=actual.findall('./Diagrams/Diagram');orig={diagram_key(d):d for d in original.findall('./Diagrams/Diagram')}
    checks=[]
    def check(name,ok,details=None):checks.append(dict(name=name,passed=bool(ok),details=details))
    counts=Counter(d.get('diagramType') for d in ds)
    check('diagram_counts',counts==dict(UseCaseDiagram=9,ClassDiagram=1,InteractionDiagram=41,ActivityDiagram=13,StateDiagram=2),dict(counts))
    check('overview_present',any(d.get('name')=='UC — Tổng quan ECOMMOR' for d in ds))
    for d in ds:
        if d.get('diagramType') in ['UseCaseDiagram','InteractionDiagram']:
            before=content(orig[diagram_key(d)]);after=content(d,native_extend=True)
            check('preserved_content:'+diagram_key(d),before==after,dict(before=sum(before.values()),after=sum(after.values()),missing=list((before-after).elements()),added=list((after-before).elements())))
    for tag in ['Diagram','Shape','Connector']:
        expected={e.get('id') for e in source.iter(tag)};found={e.get('id') for e in actual.iter(tag)}
        check('roundtrip_'+tag,expected<=found,dict(expected=len(expected),actual=len(found),missing=sorted(expected-found)))
    beforeguards=[]
    for d in original.findall('./Diagrams/Diagram'):
        if d.get('diagramType')=='InteractionDiagram':
            for s in d.findall('./Shapes/Shape'):
                if s.get('shapeType')=='NOTE' and re.match(r'^(alt|opt|loop|par|else) \[',s.get('name','')):beforeguards.append(norm(re.sub(r'^(alt|opt|loop|par|else) \[','',s.get('name')).rstrip(']')))
    guards=[norm(p.get('value')) for m in actual.iter('Model') if m.get('modelType')=='InteractionConstraint' for p in m.findall('ModelProperties/*') if p.get('name')=='constraint']
    check('sequence_guards_preserved',Counter(beforeguards)==Counter(guards),dict(before=len(beforeguards),after=len(guards),missing=list((Counter(beforeguards)-Counter(guards)).elements())))
    check('activations_native',sum(s.get('shapeType')=='Activation' for d in ds for s in d.findall('./Shapes/Shape'))>0)
    images=[];bad=[]
    for d in ds:
        file=OUT/'final-images'/d.get('imageFileName',d.get('name')+'.png')
        data=file.read_bytes() if file.exists() else b''
        if len(data)<1000 or data[:8]!=b'\x89PNG\r\n\x1a\n':bad.append(str(file));continue
        w,h=struct.unpack('>II',data[16:24]);images.append(dict(name=d.get('name'),file=file.name,width=w,height=h))
    check('png_exports',len(images)==66 and not bad,bad)
    with sqlite3.connect(PROJECT.as_uri()+'?mode=ro',uri=True) as db:
        integrity=db.execute('pragma integrity_check').fetchone()[0];count=db.execute('select count(*) from DIAGRAM').fetchone()[0]
    check('sqlite_integrity',integrity=='ok' and count==66,dict(integrity=integrity,diagrams=count))
    report=dict(passed=all(c['passed'] for c in checks),project=PROJECT.name,sha256=hashlib.sha256(PROJECT.read_bytes()).hexdigest(),checks=checks,images=images)
    (OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    cards=''.join('<article><a href="final-images/'+quote(i['file'])+'" target="_blank"><h2>'+html.escape(i['name'])+'</h2><img loading="lazy" src="final-images/'+quote(i['file'])+'"></a><p>'+str(i['width'])+' × '+str(i['height'])+'</p></article>' for i in images)
    (OUT/'gallery.html').write_text('<!doctype html><html lang="vi"><meta charset="utf-8"><title>ECOMMOR — Sơ đồ theo mẫu khảo sát</title><style>body{font:16px Arial;margin:32px;background:#f4f7f9;color:#16242e}h1{margin-bottom:8px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(460px,1fr));gap:24px}article{background:white;padding:16px;border:1px solid #bccbd1;border-radius:6px}h2{font-size:17px}a{color:inherit;text-decoration:none}img{width:100%;height:330px;object-fit:contain}p{color:#536773}</style><h1>ECOMMOR — Sơ đồ theo mẫu khảo sát</h1><p>9 Use Case · 1 Class tổng thể · 41 Sequence · 13 Activity · 2 State. Bấm ảnh để xem kích thước đầy đủ.</p><main>'+cards+'</main></html>',encoding='utf8')
    for c in checks:
        if not c['passed']:print('FAIL',c['name'],json.dumps(c['details'],ensure_ascii=False))
    print(('PASS' if report['passed'] else 'FAIL'),len(checks),'checks;',len(images),'native PNGs')
    raise SystemExit(0 if report['passed'] else 1)

if __name__=='__main__':main()
