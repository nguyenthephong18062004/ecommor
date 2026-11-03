"""Convert the reviewed PlantUML sources to editable VP XML diagrams.
No application source, environment or MongoDB access. No dependency installation.
"""
from pathlib import Path
import re, json, textwrap, xml.etree.ElementTree as E

HERE=Path(__file__).resolve().parent
DESIGN=HERE.parent
UML=DESIGN/'uml'
UC=json.loads((DESIGN/'use-cases.json').read_text(encoding='utf8'))
def wrap(s,n=42):
    return '\n'.join('\n'.join(textwrap.wrap(line,n,break_long_words=False,break_on_hyphens=False)) for line in s.replace('\\n','\n').split('\n'))
def node(parent,tag,**attrs):
    return E.SubElement(parent,tag,{k:str(v) for k,v in attrs.items()})

class Project:
    def __init__(self):
        self.i=0; self.root=E.Element('Project',name='đồ án',umlVersion='2.x',exporterVersion='15.2',documentationType='plainText')
        self.models=node(self.root,'Models'); self.diagrams=node(self.root,'Diagrams'); self.parents={}; self.props={}; self.catalog=[]
    def id(self): self.i+=1; return 'ECOM'+f'{self.i:012x}'
    def model(self,kind,name='',parent=None,doc=''):
        m=node(parent if parent is not None else self.models,'Model',id=self.id(),modelType=kind,name=name)
        self.props[m.get('id')]=node(m,'ModelProperties')
        if doc: node(self.props[m.get('id')],'HTMLProperty',name='documentation',plainTextValue=doc)
        return m
    def prop(self,m,name,value,kind='StringProperty'):
        return node(self.props[m.get('id')],kind,name=name,value=value)
    def refs(self,m,name,targets,many=False):
        p=node(self.props[m.get('id')],'ModelRefsProperty' if many else 'ModelRefProperty',name=name)
        for target in targets: node(p,'ModelRef',id=target.get('id') if E.iselement(target) else target)
        return p
    def children(self,m):
        if m.get('id') not in self.parents: self.parents[m.get('id')]=node(m,'ChildModels')
        return self.parents[m.get('id')]
    def diagram(self,path,kind):
        package=self.model('Package',path.stem)
        contents=self.children(package)
        title=path.stem
        if title.startswith('seq-'): title += ' — '+UC[int(title[-2:])-1]['name']
        if title.startswith('act-') and not title.startswith('act-state-'):
            titles=['Đăng ký và xác minh email','Đăng nhập và phân quyền','Khôi phục mật khẩu','Mua hàng','VNPay Return và xác nhận','VNPay hết hạn và đối soát','Xử lý đơn hàng','Quản lý catalog','Chat realtime','Chatbot Gemini','Thống kê và người dùng','Blog','MoMo legacy']
            title+=' — '+titles[int(title[-2:])-1]
        d=node(self.diagrams,'Diagram',id=self.id(),name=title,diagramType=kind,documentation='Nguồn: docs/design/uml/'+path.name+'\n\n'+path.read_text(encoding='utf8'),connectorStyle='Oblique')
        dp=node(d,'DiagramProperties'); node(dp,'ColorProperty',name='diagramBackground',value='Cr:255,255,255,255'); node(dp,'BooleanProperty',name='autoFitShapesSize',value='false')
        sd=node(package,'SubDiagrams'); node(sd,'DiagramRef',id=d.get('id'))
        shapes=node(d,'Shapes'); connectors=node(d,'Connectors')
        self.catalog.append(dict(source=path.name,name=title,type=kind,id=d.get('id')))
        return d,contents,shapes,connectors
    def shape(self,container,m,kind,x,y,w,h,fill='Cr:239,246,255,255',font=14,z=10,caption=True):
        s=node(container,'Shape',id=self.id(),shapeType=kind,model=m.get('id'),x=int(x),y=int(y),width=int(w),height=int(h),zorder=z)
        dp=node(s,'DiagramElementProperties'); node(dp,'BooleanProperty',name='requestResetCaption',value='false'); node(dp,'IntegerProperty',name='zOrder',value=z)
        node(dp,'BooleanProperty',name='requestResetCaptionSize',value='false')
        node(s,'ElementFont',name='Arial',size=font,style=0,color='Cr:15,23,42,255')
        ln=node(s,'Line',color='Cr:71,85,105,255',weight='1.2',cap=0,transparency=0); node(ln,'Stroke')
        if caption:
            if kind=='Actor': cx,cy,cw,ch=x-100,y+h+8,w+200,72
            elif kind=='InteractionLifeLine': cx,cy,cw,ch=x,y,w,64
            elif kind in ['State2','ActivityPartition','ActivityPartitionHeader','ActivitySwimLane']: cx,cy,cw,ch=x,y,w,60
            elif kind in ['Class','Component']: cx,cy,cw,ch=0,0,w,42
            elif kind=='DecisionNode': cx,cy,cw,ch=x-115,y-55,294,50
            else: cx,cy,cw,ch=0,0,w,h
            node(s,'Caption',x=int(cx),y=int(cy),width=int(cw),height=int(ch),side='South' if kind=='Actor' else 'Center',visible='true')
        node(s,'FillColor',type=1,color=fill,transparency=100 if kind in ['System','CombinedFragment','ActivitySwimLane'] else 0,style=1)
        return s
    def relation(self,kind,from_m,to_m,name='',parent=None,aggregation=None,mults=None):
        r=self.model(kind,name,parent)
        if kind in ['Association','Message']:
            self.refs(r,'endRelationshipFromMetaModelElement',[from_m]); self.refs(r,'endRelationshipToMetaModelElement',[to_m])
            for tag,target,mult in [('FromEnd',from_m,(mults or ['',''])[0]),('ToEnd',to_m,(mults or ['',''])[1])]:
                e=self.model('MessageEnd' if kind=='Message' else 'AssociationEnd','',node(r,tag)); e.set('composite','true'); self.refs(e,'EndModelElement',[target]); self.prop(e,'navigable','true')
                if mult: self.prop(e,'multiplicity',mult)
                if tag=='FromEnd' and aggregation: self.prop(e,'aggregationKind',aggregation)
        else:
            self.refs(r,'from',[from_m]); self.refs(r,'to',[to_m])
        return r
    def connector(self,container,rel,kind,a,b,label='',points=None,dashed=False):
        ax,ay,aw,ah=[int(a.get(k)) for k in ['x','y','width','height']]; bx,by,bw,bh=[int(b.get(k)) for k in ['x','y','width','height']]
        def anchor(x,y,w,h,tx,ty,kind):
            cx,cy=x+w/2,y+h/2; dx,dy=tx-cx,ty-cy
            if not dx and not dy:return (int(cx),int(cy))
            scale=1/((dx/(w/2))**2+(dy/(h/2))**2)**0.5 if kind=='UseCase' else min((w/2)/abs(dx) if dx else 1e9,(h/2)/abs(dy) if dy else 1e9)
            return int(cx+dx*scale),int(cy+dy*scale)
        pts=points or [anchor(ax,ay,aw,ah,bx+bw/2,by+bh/2,a.get('shapeType')),anchor(bx,by,bw,bh,ax+aw/2,ay+ah/2,b.get('shapeType'))]
        minx=min(p[0] for p in pts); miny=min(p[1] for p in pts)
        c=node(container,'Connector',id=self.id(),shapeType=kind,model=rel.get('id'),**{'from':a.get('id'),'to':b.get('id')},x=minx,y=miny,width=max(1,max(p[0] for p in pts)-minx),height=max(1,max(p[1] for p in pts)-miny),zorder=50,connectorStyle='Oblique')
        node(c,'ElementFont',name='Arial',size=12,style=0,color='Cr:15,23,42,255')
        ln=node(c,'Line',color='Cr:71,85,105,255',weight='1.1',cap=0,transparency=0); stroke=node(ln,'Stroke')
        if dashed:
            ds=node(stroke,'Dashes'); node(ds,'Dash',value='6'); node(ds,'Dash',value='4')
        if label:
            txt=wrap(label,55); cx=(pts[0][0]+pts[-1][0])//2; cy=(pts[0][1]+pts[-1][1])//2
            width=min(600,max(170,len(max(txt.split('\n'),key=len))*7)); ht=20*(txt.count('\n')+1)
            node(c,'Caption',x=int(cx-width//2),y=cy-ht-5,width=width,height=ht,visible='true',side='North')
        ps=node(c,'Points')
        for x,y in pts: node(ps,'Point',x=int(x),y=int(y))
        return c
    def note(self,shapes,parent,text,x,y,w=440,h=None):
        m=self.model('NOTE',wrap(text,55),parent); self.prop(m,'documentation',text)
        return self.shape(shapes,m,'NOTE',x,y,w,h or max(60,24*(wrap(text,55).count('\n')+1)),fill='Cr:255,251,235,255',font=12)

def parse_graph(src):
    nodes=[]; edges=[]; current=None
    for l in src.splitlines():
        m=re.match(r'(actor|usecase|class|enum|component|database|cloud|state)\s+"([^"]+)"\s+as\s+(\w+)(.*)',l)
        if m:
            typ,name,alias,tail=m.groups(); nodes.append(dict(kind=typ,name=name.replace('\\n','\n'),alias=alias,members=[],stereo=re.findall(r'<<([^>]+)>>',tail)))
            current=nodes[-1] if '{' in tail else None
        elif current:
            if l.strip()=='}': current=None
            elif l.strip(): current['members'].append(l.strip())
        elif re.match(r'^\w+(?:\s+"[^"]*")?\s+(?:[-.*o<|]+[->|*o]+|<-->)',l): edges.append(l)
    return nodes,edges

def usecase(p,path):
    src=path.read_text(encoding='utf8'); ns,es=parse_graph(src); d,parent,shapes,connectors=p.diagram(path,'UseCaseDiagram')
    actors=[n for n in ns if n['kind']=='actor']; cases=[n for n in ns if n['kind']=='usecase']; objs={}
    rows=len(cases); height=max(700,150*rows+120)
    sys=p.model('System','ECOMMOR',parent); p.shape(shapes,sys,'System',390,80,650,height,fill='Cr:248,250,252,255',font=18,z=0)
    for i,n in enumerate(actors):
        x=150 if i<3 else 1190; y=160+(i if i<3 else i-3)*190
        m=p.model('Actor',wrap(n['name'],25),parent); s=p.shape(shapes,m,'Actor',x,y,50,85); objs[n['alias']]=(m,s)
    for i,n in enumerate(cases):
        x=465; y=160+i*150
        m=p.model('UseCase',wrap(n['name'],30),parent); s=p.shape(shapes,m,'UseCase',x,y,500,100,fill='Cr:219,234,254,255'); objs[n['alias']]=(m,s)
    for e in es:
        match=re.match(r'(\w+)\s+([^\s]+)\s+(\w+)(?:\s*:\s*(.*))?$',e)
        if not match: continue
        a,arrow,b,label=match.groups(); label=label or ''
        if a not in objs or b not in objs: continue
        if arrow.endswith('|>'): kind='Generalization'
        elif 'extend' in label: kind='Extend'
        elif 'include' in label: kind='Include'
        else: kind='Association'
        ma,sa=objs[a]; mb,sb=objs[b]; r=p.relation(kind,ma,mb,'',parent)
        ay=int(sa.get('y'))+int(sa.get('height'))//2; by=int(sb.get('y'))+int(sb.get('height'))//2
        def side(sh):return int(sh.get('x')),int(sh.get('x'))+int(sh.get('width'))
        al,ar=side(sa); bl,br=side(sb)
        if sa.get('shapeType')=='UseCase' and sb.get('shapeType')=='UseCase': pts=[(ar,ay),(1010,ay),(1010,by),(br,by)]
        elif sa.get('shapeType')=='Actor' and sb.get('shapeType')=='UseCase':
            left=al<bl; trunk=355 if left else 1090; pts=[(ar if left else al,ay),(trunk,ay),(trunk,by),(bl if left else br,by)]
        else:pts=None
        p.connector(connectors,r,kind,sa,sb,'' if kind in ['Include','Extend'] else label,points=pts,dashed=kind in ['Include','Extend'])

def class_diagram(p,path):
    src=path.read_text(encoding='utf8'); ns,es=parse_graph(src); kind='ComponentDiagram' if path.stem=='class-architecture' else 'ClassDiagram'
    d,parent,shapes,cons=p.diagram(path,kind); objs={}
    cols=1 if len(ns)<3 else min(4,(len(ns)+2)//3)
    boxwidth=max(450,min(1200,max([len(m)*7+40 for n in ns for m in n['members']] or [450]))); rowheights=[]; y=100
    for i,n in enumerate(ns):
        if i%cols==0:
            group=ns[i:i+cols]; h=max(180,max(len(x['members']) for x in group)*27+110); rowheights.append((y,h)); y+=h+160
        yy,h=rowheights[-1]; x=100+(i%cols)*(boxwidth+120)
        modeltype={'actor':'Actor','enum':'Class','component':'Component','database':'Class','cloud':'Component'}.get(n['kind'],'Class')
        m=p.model(modeltype,n['name'],parent)
        if n['stereo']: p.prop(m,'documentation','Stereotype theo source: '+', '.join(n['stereo']))
        attrs=p.children(m); ops=attrs
        if n['kind']=='enum':
            stereo=p.model('Stereotype','enumeration',parent); p.refs(m,'stereotypes',[stereo],many=True)
            literals=p.children(m)
            for member in n['members']:p.model('EnumerationLiteral',member,literals)
        for member in ([] if n['kind']=='enum' else n['members']):
            if '(' in member and member.rstrip().endswith(')'):
                op=p.model('Operation',member[:-2] if member.endswith('()') else member,ops)
            else:
                pair=member.split(' : ',1); a=p.model('Attribute',pair[0],attrs)
                if len(pair)>1:
                    tp=node(p.props[a.get('id')],'TextModelProperty',name='type'); node(tp,'StringValue',value=pair[1])
                p.prop(a,'visibility','public')
        sh=p.shape(shapes,m,modeltype,x,yy,boxwidth,max(150,len(n['members'])*27+110),fill='Cr:239,246,255,255',font=14,caption=True)
        if modeltype=='Class':
            sp=sh.find('DiagramElementProperties')
            node(sp,'IntegerProperty',name='presentationOption',value=0); node(sp,'BooleanProperty',name='showAttributeType',value='true'); node(sp,'BooleanProperty',name='showOperationType',value='true')
        objs[n['alias']]=(m,sh)
    for e in es:
        match=re.match(r'(\w+)(?:\s+"([^"]*)")?\s+(\S+)\s+(?:"([^"]*)"\s+)?(\w+)(?:\s*:\s*(.*))?$',e)
        if not match: continue
        a,mulA,arrow,mulB,b,label=match.groups()
        if a not in objs or b not in objs: continue
        if arrow.startswith('<') and not arrow.endswith('>'): a,b=b,a; mulA,mulB=mulB,mulA
        relkind='Generalization' if '|>' in arrow else ('Dependency' if '.' in arrow else 'Association')
        ma,sa=objs[a]; mb,sb=objs[b]; r=p.relation(relkind,ma,mb,label or '',parent,aggregation='Composite' if '*' in arrow else None,mults=[mulA or '',mulB or ''])
        ax=int(sa.get('x'))+int(sa.get('width')); ay=int(sa.get('y'))+int(sa.get('height'))//2
        bx=int(sb.get('x'))+int(sb.get('width')); by=int(sb.get('y'))+int(sb.get('height'))//2
        gap=int(sa.get('y'))+int(sa.get('height'))+65
        points=[(ax,ay),(ax+45,ay),(ax+45,gap),(bx+65,gap),(bx+65,by),(bx,by)]
        p.connector(cons,r,relkind,sa,sb,label or '',points=points,dashed=relkind=='Dependency')

def sequence(p,path):
    src=path.read_text(encoding='utf8'); d,parent,shapes,cons=p.diagram(path,'InteractionDiagram')
    participants=[]
    for match in re.finditer(r'^(actor|participant|database)\s+"([^"]+)"\s+as\s+(\w+)',src,re.M): participants.append(match.groups())
    frame=p.model('Frame',path.stem,parent); p.prop(frame,'type','sd'); children=p.children(frame)
    lines=src.splitlines(); y=180; events=[]; stack=[]; fragments=[]; ordinal=0
    for l in lines:
        s=l.strip()
        start=re.match(r'^(alt|opt|loop|par)\b\s*(.*)',s)
        if start:
            f=dict(op=start[1],guard=start[2],y=y,ends=[],depth=len(stack)); stack.append(f); fragments.append(f); y+=65
        elif s.startswith('else'):
            if stack: stack[-1]['ends'].append((y,s[4:].strip()))
            y+=70
        elif s=='end':
            if stack:
                f=stack.pop(); f['height']=y-f['y']+25; f['closed']=True
            y+=45
        else:
            m=re.match(r'^(\w+)\s+(-+>|<--+|<->)\s+(\w+)\s*:\s*(.*)',s)
            if m:
                ordinal+=1; label=m[4]; events.append((m[1],m[2],m[3],label,y)); y+=max(80,30*len(textwrap.wrap(label,75)))
            elif s.startswith('note '):
                if ':' in s: events.append(('note','','',s.split(':',1)[1].strip(),y)); y+=80
    total=y+100; objs={}; spacing=380; wide=max(900,len(participants)*spacing+100)
    for i,(typ,name,alias) in enumerate(participants):
        m=p.model('InteractionLifeLine',wrap(name,28),children); sh=p.shape(shapes,m,'InteractionLifeLine',100+i*spacing,80,250,total,fill='Cr:239,246,255,255',font=14,z=5); objs[alias]=(m,sh)
    for f in fragments:
        m=p.model('CombinedFragment','',children); p.prop(m,'interactionOperator',f['op']); p.refs(m,'coveredLifeLines',[a[0] for a in objs.values()],many=True)
        operands=p.children(m)
        guards=[(f['y'],f['guard'])]+f['ends']; end=f['y']+max(80,f.get('height',100))
        for idx,(oy,guard) in enumerate(guards):
            operand=p.model('InteractionOperand','',operands); gm=p.model('InteractionConstraint','',p.children(operand)); p.prop(gm,'constraint',guard); p.refs(operand,'guard',[gm])
        # A native CombinedFragment frame and native editable guard notes retain branch structure.
        fs=p.shape(shapes,m,'CombinedFragment',65+f['depth']*15,f['y']-15,wide-30-f['depth']*30,max(80,f.get('height',100)),fill='Cr:255,255,255,255',font=12,z=1,caption=False)
        p.note(shapes,children,f['op']+' ['+f['guard']+']',85+f['depth']*15,f['y']-10,min(700,wide-100),45)
        for ey,guard in f['ends']: p.note(shapes,children,'else ['+guard+']',85+f['depth']*15,ey,min(700,wide-100),45)
    for a,arrow,b,label,yy in events:
        if a=='note': p.note(shapes,children,label,80,yy,min(850,wide-100)); continue
        if a not in objs or b not in objs: continue
        ma,sa=objs[a]; mb,sb=objs[b]; m=p.relation('Message',ma,mb,label,children); p.prop(m,'type',3 if a==b else 0,'IntegerProperty');
        xx=int(sa.get('x'))+125; bx=int(sb.get('x'))+125
        points=[(xx,yy),(bx,yy)] if a!=b else [(xx,yy),(xx+160,yy),(xx+160,yy+35),(xx,yy+35)]
        # VP 15.2 XML importer accepts Message for both normal and self messages;
        # the native model type=3 and loop points preserve a self call on reopening.
        p.connector(cons,m,'Message',sa,sb,wrap(label,max(30,abs(bx-xx)//7)),points,dashed='--' in arrow)

class ActivityBuilder:
    def __init__(self,p,path):
        self.p=p; self.path=path; self.src=path.read_text(encoding='utf8'); self.d,self.parent,self.shapes,self.cons=p.diagram(path,'ActivityDiagram')
        self.lanes=list(dict.fromkeys(re.findall(r'^\s*\|([^|]+)\|',self.src,re.M))); self.pending={}; self.lane=self.lanes[0] if self.lanes else 'Backend'; self.y=140; self.partition={}; self.nodes=[]
    def add(self,kind,text='',lane=None):
        lane=lane or self.lane; col=self.lanes.index(lane) if lane in self.lanes else 0
        x=80+col*360; h=80; w=290
        if kind in ['InitialNode','ActivityFinalNode']: w=h=28; x+=130
        elif kind in ['DecisionNode','MergeNode']: w=h=64; x+=110
        m=self.p.model(kind,wrap(text,35),self.parent); s=self.p.shape(self.shapes,m,kind,x,self.y,w,h,fill='Cr:15,23,42,255' if kind=='InitialNode' else 'Cr:255,255,255,255',font=13,caption=kind not in ['InitialNode','ActivityFinalNode'])
        self.y+=h+70; self.nodes.append((m,s,lane)); return m,s
    def edge(self,a,b,label=''):
        if not a or not b:return
        ma,sa=a; mb,sb=b; label=label or self.pending.pop(ma.get('id'),''); m=self.p.relation('ControlFlow',ma,mb,label,self.parent)
        if label:self.p.prop(m,'guard',label)
        ax=int(sa.get('x'))+int(sa.get('width'))//2; ay=int(sa.get('y'))+int(sa.get('height')); bx=int(sb.get('x'))+int(sb.get('width'))//2; by=int(sb.get('y'))
        points=[(ax,ay),(bx,by)] if ax==bx else [(ax,ay),(ax,ay+30),(bx,ay+30),(bx,by)]
        if by<ay: points=[(ax,ay),(ax+170,ay),(ax+170,by-30),(bx,by-30),(bx,by)]
        if sa.get('shapeType')=='DecisionNode' and sb.get('shapeType')=='MergeNode' and by>ay:
            points=[(ax,ay),(ax+165,ay+25),(ax+165,by-25),(bx,by)]
        c=self.p.connector(self.cons,m,'ControlFlow',sa,sb,label,points)
        cap=c.find('Caption')
        if cap is not None:
            cap.set('x',str(ax+12)); cap.set('y',str(ay+8)); cap.set('width','120'); cap.set('height','25')
    def build(self):
        prev=None; stack=[]; skip_note=False; note_text=[]
        for raw in self.src.splitlines():
            s=raw.strip()
            if skip_note:
                if s=='end note':skip_note=False
                else:note_text.append(s)
                continue
            if s.startswith('note '):skip_note=True; continue
            if s.startswith('|') and s.endswith('|'):self.lane=s.strip('|'); continue
            if s=='start':cur=self.add('InitialNode'); self.edge(prev,cur); prev=cur
            elif s=='stop':cur=self.add('ActivityFinalNode'); self.edge(prev,cur); prev=None
            elif s.startswith(':'):
                cur=self.add('ActivityAction',s[1:].rstrip(';')); self.edge(prev,cur); prev=cur
            elif s.startswith('if '):
                mt=re.match(r'if\s*\((.*?)\)\s*then\s*\((.*?)\)',s); cond=mt[1] if mt else s; yes=mt[2] if mt else 'Có'
                cur=self.add('DecisionNode',cond); self.edge(prev,cur); stack.append(dict(kind='if',decision=cur,then_end=None,else_seen=False,lane=self.lane)); prev=cur; self.pending[cur[0].get('id')]=yes; stack[-1]['yes']=yes
                self.p.prop(cur[0],'documentation',cond+'; nhánh '+yes)
            elif s.startswith('else') and stack:
                top=stack[-1]; top['then_end']=prev; top['else_seen']=True; prev=top['decision']; mt=re.search(r'\((.*?)\)',s); self.pending[prev[0].get('id')]=mt[1] if mt else 'Không'
            elif s=='endif' and stack:
                top=stack.pop(); ends=[prev,top['then_end']] if top['else_seen'] else [prev,top['decision']]
                active=[x for x in ends if x]
                if active:
                    cur=self.add('MergeNode','',top['lane'])
                    for x in active:self.edge(x,cur,('Có' if top.get('yes')=='Không' else 'Không') if x==top['decision'] else '')
                    prev=cur
                else: prev=None
            elif s.startswith('while '):
                mt=re.match(r'while\s*\((.*?)\)',s); cur=self.add('DecisionNode',mt[1] if mt else s); self.edge(prev,cur); stack.append(dict(kind='while',decision=cur,lane=self.lane)); prev=cur
            elif s.startswith('endwhile') and stack:
                top=stack.pop(); self.edge(prev,top['decision'],'Lặp'); cur=self.add('MergeNode','',top['lane']); self.edge(top['decision'],cur,'Không'); prev=cur
            elif s=='repeat':
                cur=self.add('MergeNode'); self.edge(prev,cur); stack.append(dict(kind='repeat',decision=cur,lane=self.lane)); prev=cur
            elif s.startswith('repeat while') and stack:
                top=stack.pop(); cur=self.add('DecisionNode',re.search(r'\((.*?)\)',s)[1]); self.edge(prev,cur); self.edge(cur,top['decision'],'Có'); prev=cur
        height=self.y+100
        for i,lane in enumerate(self.lanes):
            m=self.p.model('ActivityPartition',wrap(lane,30),self.parent); self.p.refs(m,'containedElements',[n[0] for n in self.nodes if n[2]==lane],many=True)
            boundary=self.p.model('System','',self.parent); self.p.shape(self.shapes,boundary,'System',50+i*360,70,360,height,fill='Cr:248,250,252,255',font=15,z=0,caption=False)
            self.p.note(self.shapes,self.parent,lane,65+i*360,75,330,45)
        if note_text:self.p.note(self.shapes,self.parent,'\n'.join(note_text),50,height+110,min(1000,360*max(1,len(self.lanes))))

def state_diagram(p,path):
    src=path.read_text(encoding='utf8'); ns,es=parse_graph(src); d,parent,shapes,cons=p.diagram(path,'StateDiagram'); objs={}
    for i,n in enumerate(ns):
        m=p.model('State2',wrap(n['name'],32),parent); s=p.shape(shapes,m,'State2',100+(i%3)*450,180+(i//3)*350,300,120); objs[n['alias']]=(m,s)
    initial=p.model('InitialPseudoState','',parent); init=p.shape(shapes,initial,'InitialPseudoState',50,60,25,25,fill='Cr:15,23,42,255'); objs['START']=(initial,init)
    final=p.model('FinalState2','',parent); fin=p.shape(shapes,final,'FinalState2',100+(len(ns)%3)*450,180+((len(ns)+2)//3)*350,30,30); objs['END']=(final,fin)
    for l in src.splitlines():
        mt=re.match(r'^(\[\*\]|\w+)\s+-->\s+(\[\*\]|\w+)(?:\s*:\s*(.*))?$',l)
        if not mt:continue
        a,b,label=mt.groups(); a='START' if a=='[*]' else a; b='END' if b=='[*]' else b
        if a not in objs or b not in objs:continue
        ma,sa=objs[a]; mb,sb=objs[b]; r=p.relation('Transition2',ma,mb,label or '',parent); c=p.connector(cons,r,'Transition2',sa,sb,label or '')
        cap=c.find('Caption')
        if cap is not None and int(sb.get('y'))>int(sa.get('y')):
            cap.set('x',str(int(sa.get('x'))-15)); cap.set('y',str(int(sa.get('y'))+int(sa.get('height'))+30)); cap.set('width','330'); cap.set('height','65')
            cap.text=None
    notes=re.findall(r'note[^\n]*\n(.*?)end note',src,re.S)
    if notes:p.note(shapes,parent,'\n'.join(notes),50,450+((len(ns)+2)//3)*350,1100)

def build(sample=False):
    p=Project(); paths=sorted(UML.glob('*.puml'))
    if sample: paths=[UML/name for name in ['uc-module-01.puml','class-model-payments.puml','seq-04.puml','act-03.puml','act-state-order.puml']]
    for path in paths:
        if path.name.startswith('uc-'):usecase(p,path)
        elif path.name.startswith('class-'):class_diagram(p,path)
        elif path.name.startswith('seq-'):sequence(p,path)
        elif path.name.startswith('act-state-'):state_diagram(p,path)
        elif path.name.startswith('act-'):ActivityBuilder(p,path).build()
    for d in p.diagrams:
        shapes=d.find('Shapes')
        if shapes is not None:shapes[:]=sorted(list(shapes),key=lambda s:int(s.get('zorder','10')))
        for e in list(d):
            if e.tag in ['Shapes','Connectors'] and not len(e):d.remove(e)
    target=HERE/('sample-native.xml' if sample else 'do-an-native.xml'); E.indent(p.root,space='  '); E.ElementTree(p.root).write(target,encoding='utf-8',xml_declaration=True)
    (HERE/('sample-catalog.json' if sample else 'diagram-catalog.json')).write_text(json.dumps(p.catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    (HERE/('sample-diagrams.txt' if sample else 'diagrams.txt')).write_text('\n'.join(x['name'] for x in p.catalog)+'\n',encoding='utf8')
    print('Generated',len(p.catalog),'native diagrams;',p.i,'identifiers;',target.name)
if __name__=='__main__':
    import sys
    build('--sample' in sys.argv)
