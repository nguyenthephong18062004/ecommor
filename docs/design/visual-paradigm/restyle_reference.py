"""Restyle editable native diagrams using the user's khảo sát.vpp reference.

Reads a snapshot exported by installed Visual Paradigm, preserves sequence
messages and use case relations, and writes a separate project import file.
"""
from pathlib import Path
import copy, re, json, math, html, heapq
import xml.etree.ElementTree as E
import build_native as b

HERE=Path(__file__).resolve().parent
OUT=HERE/'restyled'
OUT.mkdir(exist_ok=True)
CYAN='Cr:122,207,245,255'
BLACK='Cr:0,0,0,255'
WHITE='Cr:255,255,255,255'

def read(path):
    root=E.parse(path).getroot()
    for e in root.iter(): e.tag=e.tag.split('}')[-1]
    return root

def prop(parent,name,value,kind='StringProperty'):
    e=next((x for x in parent if x.get('name')==name),None)
    if e is None:e=E.SubElement(parent,kind,name=name)
    e.set('value',str(value))
    return e

def box(s,x,y,w,h):
    for k,v in zip(['x','y','width','height'],[x,y,w,h]):
        s.set(k,str(round(v)))
        dp=s.find('DiagramElementProperties')
        if dp is not None:prop(dp,k,round(v),'IntegerProperty')

def points(c,pts):
    ps=c.find('Points')
    if ps is None:ps=E.SubElement(c,'Points')
    ps.clear()
    for x,y in pts:E.SubElement(ps,'Point',x=str(round(x)),y=str(round(y)))
    xs,ys=zip(*pts); box(c,min(xs),min(ys),max(1,max(xs)-min(xs)),max(1,max(ys)-min(ys)))

def bounds(s):return [int(s.get(k)) for k in ['x','y','width','height']]
def center(s):
    x,y,w,h=bounds(s); return x+w/2,y+h/2

def route_class(diagram):
    """Orthogonal visibility grid; no connector crosses an unrelated class box."""
    shapes=list(diagram.find('Shapes'));rects={s.get('id'):bounds(s) for s in shapes}
    ports={}
    for sid,(x,y,w,h) in rects.items():
        cx=round(x+w/2);cy=round(y+h/2)
        ports[sid]=[((x-24,cy),(x,cy)),((x+w+24,cy),(x+w,cy)),((cx,y-24),(cx,y)),((cx,y+h+24),(cx,y+h))]
    xs=sorted({x for pp in ports.values() for outer,inner in pp for x in [outer[0]]})
    ys=sorted({y for pp in ports.values() for outer,inner in pp for y in [outer[1]]})
    valid=set()
    for i,x in enumerate(xs):
        for j,y in enumerate(ys):
            if not any(rx-10<x<rx+rw+10 and ry-10<y<ry+rh+10 for rx,ry,rw,rh in rects.values()):valid.add((i,j))
    xi={x:i for i,x in enumerate(xs)};yi={y:i for i,y in enumerate(ys)}
    def unobstructed(a,z):
        x,y=xs[a[0]],ys[a[1]];xx,yy=xs[z[0]],ys[z[1]]
        return not any((min(x,xx)<rx+rw+10 and max(x,xx)>rx-10 and ry-10<y<ry+rh+10) if y==yy else (min(y,yy)<ry+rh+10 and max(y,yy)>ry-10 and rx-10<x<rx+rw+10) for rx,ry,rw,rh in rects.values())
    graph={v:[] for v in valid}
    for i,j in valid:
        for ni,nj,direction in [(i+1,j,0),(i-1,j,0),(i,j+1,1),(i,j-1,1)]:
            z=(ni,nj)
            if z in valid and unobstructed((i,j),z):graph[(i,j)].append((z,abs(xs[ni]-xs[i])+abs(ys[nj]-ys[j]),direction))
    usage={}
    for c in diagram.find('Connectors'):
        start=ports[c.get('from')];end=ports[c.get('to')]
        targets={(xi[o[0]],yi[o[1]]):inner for o,inner in end}
        queue=[];best={};previous={};roots={}
        for outer,inner in start:
            v=(xi[outer[0]],yi[outer[1]]);state=(v,-1);best[state]=0;roots[state]=inner
            heapq.heappush(queue,(0,state))
        found=None
        while queue:
            cost,state=heapq.heappop(queue)
            if cost!=best.get(state):continue
            v,last=state
            if v in targets:found=state;break
            for z,length,direction in graph.get(v,[]):
                key=tuple(sorted([v,z]));new=cost+length+(35 if last!=-1 and last!=direction else 0)+usage.get(key,0)*50
                ns=(z,direction)
                if new<best.get(ns,float('inf')):
                    best[ns]=new;previous[ns]=state;heapq.heappush(queue,(new,ns))
        if found is None:raise ValueError('No orthogonal route')
        nodes=[];cursor=found
        while cursor in previous:nodes.append(cursor[0]);cursor=previous[cursor]
        nodes.append(cursor[0]);nodes.reverse()
        for a,z in zip(nodes,nodes[1:]):
            key=tuple(sorted([a,z]));usage[key]=usage.get(key,0)+1
        pts=[roots[cursor]]+[(xs[i],ys[j]) for i,j in nodes]+[targets[found[0]]]
        simple=[]
        for pt in pts:
            if len(simple)>=2 and ((simple[-2][0]==simple[-1][0]==pt[0]) or (simple[-2][1]==simple[-1][1]==pt[1])):simple[-1]=pt
            else:simple.append(pt)
        points(c,simple)

class Project(b.Project):
    def id(self):self.i+=1;return 'REST'+f'{self.i:012x}'

def style(d):
    for s in list(d.findall('./Shapes/Shape'))+list(d.findall('./Connectors/Connector')):
        font=s.find('ElementFont')
        if font is not None:font.set('color',BLACK);font.set('name','Arial');font.set('size','12')
        line=s.find('Line')
        if line is not None:line.set('color',BLACK);line.set('weight','1.0')
        fill=s.find('FillColor')
        if fill is not None:
            typ=s.get('shapeType')
            fill.set('color',BLACK if typ in ['InitialNode','InitialPseudoState'] else WHITE if typ in ['System','CombinedFragment','InteractionOperand','NOTE','ActivityFinalNode','FinalState2'] else CYAN)
            if typ in ['CombinedFragment','InteractionOperand','System']:fill.set('transparency','100')
        dp=s.find('DiagramElementProperties')
        if dp is not None:
            prop(dp,'foreground',BLACK,'ColorProperty')
            if fill is not None:prop(dp,'background',fill.get('color'),'ColorProperty')
    prop(d.find('DiagramProperties'),'diagramBackground',WHITE,'ColorProperty')

def usecase(p,d):
    shapes=d.find('Shapes'); cons=d.find('Connectors')
    actors=[s for s in shapes if s.get('shapeType')=='Actor']
    cases=[s for s in shapes if s.get('shapeType')=='UseCase']
    system=next(s for s in shapes if s.get('shapeType')=='System')
    overview=d.get('name')=='uc-overview'
    # Three horizontal tiers; detail flows are arranged from left to right.
    cols=2 if overview or len(cases)<=6 else 3
    rows=math.ceil(len(cases)/cols)
    cellw=370; cellh=210; left=310; top=100
    right=left+cols*cellw+80
    for i,s in enumerate(cases):
        if overview:col=i//3;row=i%3
        else:row=i//cols;col=i%cols
        x=left+col*cellw;y=top+row*cellh
        box(s,x,y,260,82)
        cap=s.find('Caption');box(cap,0,0,260,82)
        s.find('ElementFont').set('size','13')
    humans=[s for s in actors if any(x in s.get('name','') for x in ['Khách','Quản trị'])]
    external=[s for s in actors if s not in humans]
    height=max(rows*cellh+80,len(external)*120+50,500)
    for side,group in [('left',humans),('right',external)]:
        for i,s in enumerate(group):
            x=80 if side=='left' else right+50
            y=90+i*max(145,(height-140)/max(1,len(group)))
            box(s,x,y,44,74)
            cap=s.find('Caption');box(cap,x-70,y+78,184,44)
    box(system,left-55,35,cols*cellw+20,height)
    cap=system.find('Caption')
    if cap is not None:box(cap,0,0,cols*cellw+20,30)
    objects={s.get('id'):s for s in shapes}
    for i,c in enumerate(cons):
        a=objects[c.get('from')];z=objects[c.get('to')]
        if c.get('shapeType')=='Extend':
            # VP stores Extend base -> extension and draws its head at the base.
            # PlantUML source uses extension ..> base; adapt native semantics.
            c.set('from',z.get('id'));c.set('to',a.get('id'))
            rm=next(m for m in p.root.iter('Model') if m.get('id')==c.get('model'))
            for key,target in [('from',z),('to',a)]:
                rp=next(q for q in p.props[rm.get('id')] if q.get('name')==key)
                rp.find('ModelRef').set('id',target.get('model'))
            rm.set('name','«extend»')
            a,z=z,a
        ax,ay=center(a);zx,zy=center(z)
        if c.get('shapeType')=='Generalization':
            points(c,[(ax,ay-37),(ax-55,ay-37),(zx-55,zy+37),(zx,zy+37)])
        elif a in actors and z in cases:
            # Route through the gutters between use case rows, never through an oval.
            leftside=ax<left; sx=ax+22 if leftside else ax-22
            gutter=zy-73-((i%3)*7)
            track=left-95-(i%5)*9 if leftside else right+10+(i%5)*8
            points(c,[(sx,ay),(track,ay),(track,gutter),(zx,gutter),(zx,zy-41)])
        else:
            if abs(ay-zy)<30:points(c,[(ax+(130 if ax<zx else -130),ay),(zx+(-130 if ax<zx else 130),zy)])
            else:points(c,[(ax+130,ay),(ax+160,ay),(ax+160,zy),(zx+130,zy)])
        cap=c.find('Caption')
        if cap is None and c.get('shapeType') in ['Include','Extend']:
            cap=E.SubElement(c,'Caption',visible='true',side='North')
        if cap is not None and cap.get('visible')=='true':
            pts=list(c.find('Points'));x=(int(pts[0].get('x'))+int(pts[-1].get('x')))/2;y=(ay+zy)/2
            box(cap,x-85,y-28,170,24)
    d.set('name','UC — Tổng quan ECOMMOR' if overview else d.get('name'))

def sequence(p,d,models,stereos):
    shapes=d.find('Shapes');cons=d.find('Connectors')
    lives=[s for s in shapes if s.get('shapeType')=='InteractionLifeLine']
    lives.sort(key=lambda s:int(s.get('x')))
    originals={s.get('id'):bounds(s) for s in lives}
    # Compress only x coordinates, retain chronological y coordinates and all labels.
    def tx(x):return round(100+(x-164)*0.86)
    for s in shapes:
        x,y,w,h=bounds(s)
        if s in lives:
            cx=tx(x+w/2);box(s,cx-80,20,160,h)
            name=s.get('name','')
            m=models[s.get('model')]
            if s==lives[0] and any(k in name for k in ['Khách','Quản trị','Người dùng']):
                s.set('shapeType','InteractionActor');m.set('modelType','InteractionActor')
            else:
                typ='entity' if any(k in name for k in ['Mongo','Model','DB']) else 'boundary' if any(k in name for k in ['jsx','UI','axios','React','Goong']) else 'control'
                mp=m.find('ModelProperties');old=next((z for z in mp if z.get('name')=='stereotypes'),None)
                if old is not None:mp.remove(old)
                rp=E.SubElement(mp,'ModelRefsProperty',name='stereotypes');E.SubElement(rp,'ModelRef',id=stereos[typ])
            cap=s.find('Caption');box(cap,cx-125,64,250,48);cap.set('side','South')
        else:
            box(s,tx(x),y,w*0.86,h)
            cap=s.find('Caption')
            if cap is not None and s.get('shapeType')=='NOTE':box(cap,0,0,w*0.86,h)
    message_number=0
    for c in cons:
        pts=[(tx(int(q.get('x'))),int(q.get('y'))) for q in c.find('Points')]
        points(c,pts)
        cap=c.find('Caption')
        if cap is not None:
            x,y,w,h=bounds(cap);box(cap,tx(x),y,w,h)
        # Real editable execution bars are stored as Activation children of lifelines.
        if c.get('shapeType')=='Message':
            message_number+=1
            mm=models[c.get('model')];mp=mm.find('ModelProperties')
            oldtype=next((q for q in mp if q.get('name')=='type'),None)
            if oldtype is not None:mp.remove(oldtype)
            p.prop(mm,'type','Self Message' if c.get('from')==c.get('to') else 'Message')
            p.prop(mm,'sequenceNumber',str(message_number))
            if c.find('./Line/Stroke/Dashes') is not None:
                ap=E.SubElement(mp,'ModelProperty',name='actionType');ret=p.model('ActionTypeReturn','Return',ap);ret.set('composite','true')
            dest=next((s for s in lives if s.get('id')==c.get('to')),None)
            if dest is not None and dest.get('shapeType')!='InteractionActor':
                owner=models[dest.get('model')];mp=owner.find('ModelProperties')
                acts=next((z for z in mp if z.get('name')=='activations'),None)
                if acts is None:acts=E.SubElement(mp,'ModelsProperty',name='activations')
                am=p.model('Activation','Activation',acts);am.set('composite','true')
                px,py=pts[-1];p.shape(shapes,am,'Activation',px-4,py,8,24,fill=CYAN,font=12,z=45,caption=False)
    # Replace visual guard notes by native InteractionOperand / guard elements.
    fragments=[s for s in shapes if s.get('shapeType')=='CombinedFragment']
    guards=[s for s in shapes if s.get('shapeType')=='NOTE' and re.match(r'^(alt|opt|loop|par|else) \[',s.get('name',''))]
    for fs in fragments:
        fx,fy,fw,fh=bounds(fs);fm=models[fs.get('model')]
        inside=[s for s in guards if fy<=int(s.get('y'))<fy+fh and not any(g!=fs and int(g.get('y'))>fy and int(g.get('y'))<=int(s.get('y'))<int(g.get('y'))+int(g.get('height')) for g in fragments)]
        inside.sort(key=lambda s:int(s.get('y')))
        cm=fm.find('ChildModels')
        if cm is not None:fm.remove(cm)
        p.parents.pop(fm.get('id'),None)
        cm=p.children(fm)
        for i,gs in enumerate(inside):
            guard=re.sub(r'^(alt|opt|loop|par|else) \[','',gs.get('name','')).rstrip(']')
            oy=fy if i==0 else int(gs.get('y'))
            ey=int(inside[i+1].get('y')) if i+1<len(inside) else fy+fh
            om=p.model('InteractionOperand','Operand',cm)
            gp=E.SubElement(p.props[om.get('id')],'ModelProperty',name='guard')
            gm=p.model('InteractionConstraint','InteractionConstraint',gp);gm.set('composite','true');p.prop(gm,'constraint',guard)
            os=p.shape(shapes,om,'InteractionOperand',fx,oy,fw,max(40,ey-oy),fill=WHITE,font=12,z=2,caption=False)
            # Caption geometry for native guard is controlled by VP.
            shapes.remove(gs)
    dp=d.find('DiagramProperties')
    prop(dp,'showActivations','true','BooleanProperty')
    prop(dp,'displayLifeLinesAsRobustnessAnalysisIcon',0,'IntegerProperty')
    prop(dp,'showSequenceNumbers','true','BooleanProperty')
    prop(dp,'showStereotypes','false','BooleanProperty')
    for s in shapes:
        if s.get('shapeType')=='NOTE':
            x,y,w,h=bounds(s)
            target=lives[min(3,len(lives)-1)]
            box(s,int(target.get('x'))-30,y,min(w,800),h)

def fullclass(p):
    # Keep every existing domain field. Enum values are inlined for one readable map.
    source=[];data=[]
    for path in sorted(b.UML.glob('class-model-*.puml')):
        ns,_=b.parse_graph(path.read_text(encoding='utf8'));enums={n['alias']:' | '.join(n['members']) for n in ns if n['kind']=='enum'}
        n=next(n for n in ns if n['kind']=='class');members=[]
        for raw in n['members']:
            raw=re.sub(r' \{.*\}$','',raw).replace('Schema.Types.ObjectId','ObjectId').replace('mongoose.ObjectId','ObjectId')
            for alias,values in enums.items():raw=raw.replace(alias,'String')
            members.append(raw)
        data.append(dict(name=n['name'],members=members,kind='entity',doc=path.read_text(encoding='utf8')))
        source.append(path.name)
    for name,members in [('CartItem',['productId : ObjectId','quantity : Number']),('OrderItem',['productId : ObjectId','quantity : Number','unitPrice : Number','nameProduct : String','images : String']),('Registration',['fullName : String','passwordHash : String','phone : String','address : String'])]:
        data.append(dict(name=name,members=members,kind='embedded',doc='Nội dung object nhúng từ class-model và class-relations hiện có.'))
    for path in [b.UML/'class-backend-account.puml',b.UML/'class-backend-commerce.puml',b.UML/'class-backend-content.puml']:
        ns,_=b.parse_graph(path.read_text(encoding='utf8'))
        for n in ns:
            if n['members'] and n['name'] not in [v['name'] for v in data]:data.append(dict(name=n['name'],members=n['members'],kind='controller' if 'controller' in n['name'] else 'service',doc=path.read_text(encoding='utf8')))
    # One native class diagram contains all 13 prior domain models, embedded types,
    # and implementation responsibilities (controllers/services/middleware).
    path=OUT/'class-overview.puml'
    path.write_text('@startuml\n'+ '\n'.join('class "'+n['name']+'" {\n'+'\n'.join(n['members'])+'\n}' for n in data)+'\n@enduml\n',encoding='utf8')
    d,parent,shapes,cons=p.diagram(path,'ClassDiagram');d.set('name','Class — Tổng thể ECOMMOR')
    objs={};positions={}
    # Layout by functional columns, with implementation classes below domain data.
    columns=[['otp','Registration','apikey','checkAuth','tokenSevices','otp.service','mail.service'],['user','users.controller.js','Message','message.controller.js','socket','chatbot'],['cartUser','CartItem','coupon','cartUser.controller.js','coupon.controller.js'],['payments','OrderItem','paymentAttempts','payments.controller.js','vnpay.service','vnpay-query.service'],['products','previewProduct','products.controller.js','previewProduct.controller.js'],['category','brand','blog','category.controller.js','blog.controller.js']]
    for col,names in enumerate(columns):
        y=85
        for name in names:
            n=next((n for n in data if n['name']==name),None)
            if n is None:continue
            w=max(320,min(500,max([len(s)*7+30 for s in n['members']]+[320])))
            h=max(100,56+len(n['members'])*22)
            x=100+col*620
            m=p.model('Class',name,parent,doc=n['doc']);children=p.children(m)
            for member in n['members']:
                if '(' in member and member.endswith(')'):p.model('Operation',member[:-2] if member.endswith('()') else member,children)
                else:
                    pair=member.split(' : ',1);a=p.model('Attribute',pair[0],children)
                    if len(pair)>1:
                        tp=E.SubElement(p.props[a.get('id')],'TextModelProperty',name='type');E.SubElement(tp,'StringValue',value=pair[1])
                    p.prop(a,'visibility','private')
            sh=p.shape(shapes,m,'Class',x,y,w,h,fill=CYAN,font=13)
            prop(sh.find('DiagramElementProperties'),'showAttributeType','true','BooleanProperty')
            prop(sh.find('DiagramElementProperties'),'presentationOption',0,'IntegerProperty')
            objs[name]=(m,sh);positions[name]=(col,y)
            y+=h+125
    edges=[]
    for fn in ['class-relations-account.puml','class-relations-commerce.puml']:
        ns,es=b.parse_graph((b.UML/fn).read_text(encoding='utf8'));aliases={n['alias']:n['name'] for n in ns}
        for line in es:
            mt=re.match(r'(\w+)(?:\s+"([^"]*)")?\s+([^\s]+)\s+(?:"([^"]*)"\s+)?(\w+)(?:\s*:\s*(.*))?$',line)
            if not mt:continue
            a,ma,arrow,mz,z,label=mt.groups();edges.append((aliases[a],aliases[z],arrow,ma or '',mz or '',label or ''))
    responsibilities={'users.controller.js':['user','apikey','otp','tokenSevices','otp.service','mail.service','checkAuth'],'cartUser.controller.js':['cartUser','products','coupon'],'payments.controller.js':['payments','paymentAttempts','cartUser','vnpay.service'],'products.controller.js':['products','category'],'coupon.controller.js':['coupon'],'category.controller.js':['category'],'blog.controller.js':['blog'],'previewProduct.controller.js':['previewProduct'],'message.controller.js':['Message','socket'],'tokenSevices':['apikey'],'otp.service':['otp'],'vnpay.service':['payments','paymentAttempts','vnpay-query.service'],'vnpay-query.service':['paymentAttempts'],'chatbot':['products']}
    for a,targets in responsibilities.items():
        for z in targets:edges.append((a,z,'..>','','',''))
    for idx,(a,z,arrow,ma,mz,label) in enumerate(edges):
        if a not in objs or z not in objs:continue
        am,ash=objs[a];zm,zsh=objs[z]
        kind='Dependency' if '.' in arrow else 'Association'
        r=p.relation(kind,am,zm,'',parent,aggregation='Composite' if '*' in arrow else None,mults=[ma,mz])
        ax,ay,aw,ah=bounds(ash);zx,zy,zw,zh=bounds(zsh)
        if positions[a][0]==positions[z][0]:
            track=ax+max(aw,zw)+35+(idx%5)*12
            pts=[(ax+aw,ay+ah/2),(track,ay+ah/2),(track,zy+zh/2),(zx+zw,zy+zh/2)]
        else:
            # Reserve gutters below both boxes and route through inter-column space.
            right=positions[z][0]>positions[a][0]
            sx=ax+aw if right else ax;ex=zx if right else zx+zw
            lane=55+(idx%5)*12;track=sx+(lane if right else -lane)
            pts=[(sx,ay+ah/2),(track,ay+ah/2),(track,zy+zh/2),(ex,zy+zh/2)]
        pts=[(round(x),round(y)) for x,y in pts]
        c=p.connector(cons,r,kind,ash,zsh,'',pts,dashed=kind=='Dependency')
        p.prop(r,'documentation',label or 'Dépendance theo source hiện có')
    route_class(d)
    return d,data

def build():
    old=read(HERE/'original-export/project.xml');ref=read(HERE/'reference-export/project.xml')
    p=Project()
    for path in sorted(b.UML.glob('*.puml')):
        if path.name.startswith('uc-'):b.usecase(p,path)
        elif path.name.startswith('seq-'):b.sequence(p,path)
        elif path.name.startswith('act-state-'):b.state_diagram(p,path)
        elif path.name.startswith('act-'):b.ActivityBuilder(p,path).build()
    # Rebuild geometry with the proven minimal XML vocabulary. Exported desktop
    # XML also includes cached bounds/pins; importing those can clip connectors.
    old=p.root
    old.set('name','ECOMMOR — Phong cách khảo sát')
    info=old.find('ProjectInfo')
    if info is not None:old.remove(info)
    removed={d.get('id') for d in p.diagrams if d.get('diagramType') in ['ClassDiagram','ComponentDiagram']}
    for d in list(p.diagrams):
        if d.get('id') in removed:p.diagrams.remove(d)
    for m in list(p.models):
        if m.get('modelType')=='Package' and m.get('name','').startswith('class-'):p.models.remove(m)
    p.props={m.get('id'):m.find('ModelProperties') for m in old.iter('Model')}
    models={m.get('id'):m for m in old.iter('Model')}
    for d in p.diagrams:
        for s in list(d.findall('./Shapes/Shape'))+list(d.findall('./Connectors/Connector')):
            s.set('name',models[s.get('model')].get('name',''))
    stereos={}
    for m in ref.iter('Model'):
        if m.get('modelType')=='Stereotype' and m.get('name') in ['boundary','control','entity']:
            copied=copy.deepcopy(m);p.models.append(copied);stereos[m.get('name')]=m.get('id')
    for d in p.diagrams:
        if d.get('diagramType')=='UseCaseDiagram':usecase(p,d)
        elif d.get('diagramType')=='InteractionDiagram':sequence(p,d,models,stereos)
        style(d)
    cd,data=fullclass(p);style(cd)
    # Keep the overview at the front of Diagram Navigator.
    ds=list(p.diagrams);ds.sort(key=lambda d:0 if d.get('name').startswith('UC —') else 1 if d.get('diagramType')=='UseCaseDiagram' else 2 if d.get('diagramType')=='ClassDiagram' else 3)
    p.diagrams[:]=ds
    for d in p.diagrams:
        sh=d.find('Shapes')
        if sh is not None:sh[:]=sorted(sh,key=lambda s:int(s.get('zorder','10')))
    E.indent(old,space='  ');E.ElementTree(old).write(OUT/'restyled.xml',encoding='utf-8',xml_declaration=True)
    catalog=[dict(name=d.get('name'),type=d.get('diagramType'),id=d.get('id')) for d in p.diagrams]
    (OUT/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf8')
    (OUT/'diagrams.txt').write_text('\n'.join(d['name'] for d in catalog),encoding='utf8')
    print('Wrote',len(catalog),'diagrams; class boxes',len(cd.findall('./Shapes/Shape')))

if __name__=='__main__':build()
