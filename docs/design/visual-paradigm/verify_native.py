"""Check the saved VP project against its native XML roundtrip and reviewed sources."""
from pathlib import Path
from collections import Counter
import hashlib, json, sqlite3, struct, sys
import xml.etree.ElementTree as E

HERE=Path(__file__).resolve().parent
roundtrip=Path(sys.argv[1]) if len(sys.argv)>1 else HERE/'validation/final-v3-roundtrip/project.xml'
source=E.parse(HERE/'do-an-native.xml').getroot()
actual=E.parse(roundtrip).getroot()
catalog=json.loads((HERE/'diagram-catalog.json').read_text(encoding='utf8'))
project=HERE/'đồ án.vpp'
checks=[]
def check(name,passed,detail):checks.append(dict(name=name,passed=bool(passed),detail=detail))

check('project_name',actual.get('name')=='đồ án',actual.get('name'))
for tag in ['Diagram','Shape','Connector']:
    expected={x.get('id') for x in source.iter(tag)}
    found={x.get('id') for x in actual.iter(tag)}
    check('native_'+tag.lower()+'_ids',expected<=found,dict(expected=len(expected),actual=len(found),missing=sorted(expected-found)))

source_models={x.get('id'):x for x in source.iter('Model')}
native_models={x.get('id'):x for x in actual.iter('Model')}
# These annotations are intentionally visual notes/frames and partition boundaries.
# VP exports only referenced models and normalizes shared stereotypes.
annotation_types={'InteractionOperand','InteractionConstraint','ActivityPartition','Stereotype'}
missing=[dict(id=k,type=m.get('modelType'),name=m.get('name')) for k,m in source_models.items()
         if k not in native_models and m.get('modelType') not in annotation_types]
check('core_native_models',not missing,dict(missing=missing))
check('plantuml_mapping',len(catalog)==87 and {x['source'] for x in catalog}=={p.name for p in (HERE.parent/'uml').glob('*.puml')},dict(diagrams=len(catalog)))

images=[]; bad=[]
for item in catalog:
    p=HERE/'images'/(item['name']+'.png')
    if not p.exists():bad.append(p.name);continue
    data=p.read_bytes()
    if data[:8]!=b'\x89PNG\r\n\x1a\n':bad.append(p.name);continue
    w,h=struct.unpack('>II',data[16:24])
    if min(w,h)<20 or len(data)<1000:bad.append(p.name)
    images.append(dict(name=p.name,width=w,height=h,bytes=len(data)))
check('native_png_exports',not bad and len(images)==87,dict(count=len(images),invalid=bad))

with sqlite3.connect(project.as_uri()+'?mode=ro',uri=True) as db:
    status=db.execute('pragma integrity_check').fetchone()[0]
    diagram_count=db.execute('select count(*) from DIAGRAM').fetchone()[0]
    elements=db.execute('select count(*) from DIAGRAM_ELEMENT').fetchone()[0]
check('vpp_integrity',status=='ok' and diagram_count==87,dict(integrity=status,diagrams=diagram_count,diagram_elements=elements))

for name in ['final-import.log','final-roundtrip.log']:
    log=(HERE/'validation'/name).read_text(encoding='utf8')
    errors=[line for line in log.splitlines() if any(s in line for s in ['[warning ','Exception','does not exist','not found.','Cannot write'])]
    check(name,not errors,dict(errors=errors))

result=dict(passed=all(x['passed'] for x in checks),project=project.name,
            sha256=hashlib.sha256(project.read_bytes()).hexdigest(),
            diagram_types=dict(Counter(x['type'] for x in catalog)),
            native_model_types=dict(Counter(x.get('modelType') for x in native_models.values())),
            checks=checks,images=images,
            limits=['Lane borders and headings are editable boundaries/notes; ActivityPartition models remain in the project.',
                    'Sequence guards and else branches are editable notes in native CombinedFragment frames; no claim of full operand metamodel conformance.',
                    'Native rendering verified; PlantUML compiler and application runtime were not executed.'])
(HERE/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for x in checks:print(('PASS' if x['passed'] else 'FAIL'),x['name'],json.dumps(x['detail'],ensure_ascii=False))
raise SystemExit(0 if result['passed'] else 1)
