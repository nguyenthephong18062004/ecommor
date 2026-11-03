"""Kiểm tĩnh tài liệu, không chạy/import code ứng dụng hoặc gọi dịch vụ ngoài."""
from pathlib import Path
import json,re,sys,shutil

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
def read(p): return p.read_text(encoding='utf-8-sig')
inv=json.loads(read(OUT/'inventory.json'))
ucs=json.loads(read(OUT/'use-cases.json'))
checks=[]
def check(name,ok,detail): checks.append(dict(name=name,passed=bool(ok),detail=detail))

missing=[r['method']+' '+r['path'] for r in inv['routes'] if not any(r['path'] in u['paths'] for u in ucs)]
check('route_coverage',not missing,dict(total=len(inv['routes']),missing=missing))
missing_models=[m['name'] for m in inv['models'] if not (OUT/('uml/class-model-'+m['name'].lower()+'.puml')).exists()]
check('model_coverage',not missing_models,dict(total=len(inv['models']),missing=missing_models))
missing_seq=[u['id'] for u in ucs if not (OUT/('uml/seq-'+u['id'][3:]+'.puml')).exists()]
check('sequence_coverage',not missing_seq,dict(total=len(ucs),missing=missing_seq))
reqmiss=[f['name'] for f in inv['requests'] if not any(r['method']==f['method'] and r['path'].rstrip('/')==f['path'].rstrip('/') for r in inv['routes'])]
check('request_backend_mapping',not reqmiss,dict(total=len(inv['requests']),missing=reqmiss))

mds=list(OUT.glob('*.md')); docs='\n'.join(read(p) for p in mds)
blocks=re.findall(r'```plantuml\n(.*?)```',docs,re.S)
uml=list((OUT/'uml').glob('*.puml')); unmatched=[]; invalid=[]; duplicate=[]
for p in uml:
    s=read(p)
    if sum(s==b for b in blocks)!=1: unmatched.append(p.name)
    if s.count('@startuml')!=1 or s.count('@enduml')!=1 or not s.strip().endswith('@enduml'): invalid.append(p.name)
    # Chỉ kiểm block sequence; không gọi đây là kiểm cú pháp PlantUML.
    if p.name.startswith('seq-'):
        stack=[]
        for n,l in enumerate(s.splitlines(),1):
            stripped=l.strip()
            if re.match(r'^(alt|opt|loop|par|group|critical|break)\b',stripped): stack.append(n)
            elif stripped=='end':
                if not stack: invalid.append(f'{p.name}:{n}:end')
                else: stack.pop()
        if stack: invalid.append(f'{p.name}:unclosed sequence block')
    aliases=re.findall(r'^(?:actor|participant|database|class|component|cloud|enum|usecase|state)\s+"[^"\n]*"\s+as\s+(\w+)',s,re.M)
    if len(aliases)!=len(set(aliases)): duplicate.append(p.name)
check('uml_embedded_exactly_once',not unmatched and len(blocks)==len(uml),dict(files=len(uml),embedded_blocks=len(blocks),mismatches=unmatched))
check('uml_basic_structure_only',not invalid and not duplicate,dict(errors=invalid,duplicate_aliases=duplicate,compiler_validation=False))

badrefs=[]; count=0
for p in mds:
    for match in re.finditer(r'(?<![\w/])((?:server|client|nginx)/[^\s`<>;|,)]+|SETUP_GUIDE\.md|docker-compose\.yaml|run-dev\.ps1|run-vnpay-dev\.ps1|\.gitignore):(\d+)\b',read(p)):
        path,n=match.group(1),int(match.group(2)); count+=1; target=ROOT/path
        if not target.is_file() or n<1 or n>len(read(target).splitlines()): badrefs.append(dict(document=p.name,source=path,line=n))
for u in ucs:
    path,fn=u['handler'].split(':')
    if not (ROOT/path).is_file() or fn not in read(ROOT/path): badrefs.append(dict(uc=u['id'],handler=u['handler']))
    if not (ROOT/u['page']).is_file(): badrefs.append(dict(uc=u['id'],page=u['page']))
check('source_references',not badrefs,dict(numeric_references_checked=count,errors=badrefs))

inconsistent=[]
ucdoc=read(OUT/'01-use-case.md'); seqdoc=read(OUT/'03-sequence.md')
for u in ucs:
    for p,s in [('01',ucdoc),('03',seqdoc)]:
        if u['id']+' — '+u['name'] not in s: inconsistent.append(p+':'+u['id'])
    seq=read(OUT/('uml/seq-'+u['id'][3:]+'.puml'))
    if re.search(r'\bU\s*(?:-|<)',seq) and f'actor "{u["actor"]}" as U' not in seq: inconsistent.append('actor:'+u['id'])
check('use_case_consistency',not inconsistent,dict(errors=inconsistent))

# Không lưu/in literal nhạy cảm; chỉ trả tên file nếu khớp. Bổ sung key Goong inline.
literals=[]
for path in ['server/.env','client/.env']:
    p=ROOT/path
    if p.exists():
        for l in read(p).splitlines():
            m=re.match(r'\s*([A-Za-z_]\w*)\s*=\s*(.*?)\s*$',l)
            if m and re.search(r'SECRET|TOKEN|KEY|CLIENT_ID|GOOGLE_CLIENT',m[1]):
                value=m[2].strip('"\'')
                if len(value)>=10 and not value.startswith(('your_','<')): literals.append(value)
checkout=read(ROOT/'client/src/Pages/CheckOut/CheckOut.jsx')
literals+=re.findall(r"api_key:\s*['\"]([^'\"]+)['\"]",checkout)
leaks=[]
for p in OUT.rglob('*'):
    if not p.is_file() or '__pycache__' in p.parts or p.suffix not in ['.md','.puml','.json','.py']: continue
    s=read(p)
    if any(v in s for v in literals): leaks.append(p.relative_to(OUT).as_posix())
    if re.search(r'-----BEGIN (?:RSA )?PRIVATE KEY-----|AIza[0-9A-Za-z_-]{30,}|\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}',s): leaks.append(p.relative_to(OUT).as_posix())
check('known_secret_literals_absent',not leaks,dict(files_with_matches=sorted(set(leaks)),scope='Sensitive env literals and identified inline Goong key; pattern scan, no values printed'))

result=dict(date='2026-10-21',mode='static documentation validation',checks=checks,
            plantuml_compiler=dict(available=False,status='Chưa kiểm tra cú pháp bằng công cụ',note='Không có java/dot/plantuml trong PATH; thư mục Java jdk-21 chỉ thấy lib, không có bin/java.exe; không tìm thấy PlantUML jar trong workspace/VS Code extensions.'),
            lint=json.loads(read(OUT/'lint-result.json')),
            runtime_tests=dict(status='NOT RUN',reason='User cấm chạy server/MongoDB; suites có integration khởi động HTTP/DB'),
            counts=dict(routes=len(inv['routes']),requests=len(inv['requests']),models=len(inv['models']),use_cases=len(ucs),diagrams=len(uml),
                        sequences=sum(p.name.startswith('seq-') for p in uml),
                        activities=sum(p.name.startswith('act-') and not p.name.startswith('act-state-') for p in uml),
                        state_machines=sum(p.name.startswith('act-state-') for p in uml)))
(OUT/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'checks':[{k:v for k,v in c.items() if k!='detail'} for c in checks],'counts':result['counts']},ensure_ascii=True,indent=2))
sys.exit(0 if all(c['passed'] for c in checks) else 1)
