"""Sinh tài liệu as-is bằng đọc tĩnh; không import/chạy code ứng dụng.
Chạy tại repository root: python docs/design/build_design.py <stage>
"""
from pathlib import Path
import re, json, sys, subprocess, shutil

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/design'
def read(p): return (ROOT / p).read_text(encoding='utf-8-sig')
def write(p,s):
    target=OUT/p; target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text('\n'.join(part.rstrip() for part in s.rstrip().splitlines())+'\n',encoding='utf-8')
def line(p,needle):
    for i,s in enumerate(read(p).splitlines(),1):
        if needle in s: return i
    raise ValueError((p,needle))
def cite(p,needle=None): return f'`{p}:{line(p,needle) if needle else 1}`'
def table(headers,rows):
    def clean(x): return str(x).replace('|','&#124;').replace('\n','<br>')
    return '\n'.join(['| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |']+['| '+' | '.join(map(clean,r))+' |' for r in rows])+'\n'
def progress(stage,remaining):
    write('PROGRESS.md',f'''# Tiến độ phân tích thiết kế ECOMMOR

- Ngày snapshot: 21/10/2026. Nhánh `docs/system-design` tạo từ HEAD hiện tại; phân tích working tree gồm thay đổi có trước nhiệm vụ.
- Ngoại lệ Git: người dùng yêu cầu tiếp tục sau thông báo working tree chưa sạch; giữ nguyên tất cả thay đổi có trước, chỉ stage `docs/design/`.
- Đã xong: {stage}.
- Đang làm / còn lại: {remaining}.
- Giả định: hành vi as-is suy ra tĩnh từ code; không xác nhận dữ liệu thực trong DB hoặc trạng thái deployment.
- Không chạy server, không truy cập MongoDB, không sửa ứng dụng/.env, không push, không cài dependency.
- Render: không tìm thấy Java/Graphviz/PlantUML trong PATH; chưa kiểm tra cú pháp bằng công cụ. Kiểm tra cấu trúc và đồng nhất nguồn sơ đồ bằng script riêng.
- Tiếp tục: đọc README, PROGRESS và `inventory.json`; nguồn sinh tài liệu là `build_design.py` + `design_content.py`; chạy từng stage từ repository root.
''')
SKIN='skinparam defaultFontName Arial\nskinparam shadowing false\nskinparam backgroundColor white\nskinparam ArrowColor #334155\nskinparam defaultFontSize 13\n'
def diagram(name,body):
    src='@startuml\n'+SKIN+body.strip()+'\n@enduml\n'
    write('uml/'+name+'.puml',src)
    return f'\nNguồn sơ đồ: [uml/{name}.puml](uml/{name}.puml). Chưa kiểm tra cú pháp bằng công cụ.\n\n```plantuml\n{src}```\n'

def inventory():
    routes=[]
    prefixes={'blog.routes.js':'/api/blog','message.routes.js':'/api/message','brand.routes.js':'/api/brands'}
    for p in sorted((ROOT/'server/src/routes').glob('*.js')):
        if p.name=='index.js': continue
        rel=p.relative_to(ROOT).as_posix(); s=read(rel)
        imports=dict(re.findall(r"const (\w+) = require\('([^']+)'\)",s))
        for m in re.finditer(r"router\.(get|post|put|patch|delete)\('([^']+)',\s*([^\n]+)",s):
            method,path,rest=m.groups(); path=prefixes.get(p.name,'')+('' if path=='/' and p.name in prefixes else path)
            call=re.search(r'(\w+)\.(\w+)',rest)
            handler=call.group(0) if call and call.group(1) in imports else ('service.list' if p.name=='brand.routes.js' else 'inline')
            ctrl=imports.get(handler.split('.')[0],'')
            ctrlpath=(p.parent/(ctrl+'.js')).resolve().relative_to(ROOT).as_posix() if ctrl else rel
            auth='authAdmin' if 'authAdmin' in rest else ('authUser' if 'authUser' in rest else 'Công khai')
            middleware=[x for x in ['authUser','authAdmin','otpSendLimiter','otpVerifyLimiter','asyncHandler'] if x in rest]
            if 'upload.' in rest: middleware+=['upload.single(image)']
            routes.append(dict(method=method.upper(),path=path,handler=handler,controller=ctrlpath,auth=auth,middleware=middleware,source=rel,line=s[:m.start()].count('\n')+1))
    for method,path,handler,src,mw in [('POST','/api/chatbot','askQuestion','server/src/server.js',['chatbotRateLimit']),('POST','/api/upload-image','inline upload','server/src/routes/index.js',['authAdmin','upload.array(images)'])]:
        routes.append(dict(method=method,path=path,handler=handler,controller=src,auth='authAdmin' if 'authAdmin' in mw else 'Công khai',middleware=mw,source=src,line=line(src,f"'{path}'")))
    funcs=[]; s=read('client/src/config/request.jsx')
    matches=list(re.finditer(r'export const (request\w+)\s*=',s))
    for i,m in enumerate(matches):
        block=s[m.end():matches[i+1].start() if i+1<len(matches) else s.index('let isRefreshing')]
        call=re.search(r'(request|apiClient)\.(get|post|delete|put|patch)\(([\'"`])(.+?)\3',block,re.S)
        if not call: raise ValueError(m.group(1))
        client,method,_,path=call.groups(); path=path.replace('${apiBlog}','/api/blog').replace('${apiMessage}','/api/message')
        name=m.group(1); users=[]
        for p in (ROOT/'client/src').rglob('*'):
            if p.suffix not in ('.js','.jsx') or p.name=='request.jsx': continue
            text=p.read_text(encoding='utf-8-sig')
            if re.search(r'\b'+name+r'\b',text): users.append(p.relative_to(ROOT).as_posix())
        funcs.append(dict(name=name,method=method.upper(),path=path,client=client,line=s[:m.start()].count('\n')+1,users=users))
    models=[]
    for p in sorted((ROOT/'server/src/models').glob('*.js')):
        rel=p.relative_to(ROOT).as_posix(); s=read(rel)
        name=re.search(r"mongoose\.model\('([^']+)'",s).group(1)
        models.append(dict(name=name,source=rel,fields=s))
    return dict(routes=routes,requests=funcs,models=models)

INV=inventory()
R=INV['routes']; F=INV['requests']; M=INV['models']

def stage0():
    write('inventory.json',json.dumps({**INV,'models':[{k:v for k,v in m.items() if k!='fields'} for m in M]},ensure_ascii=False,indent=2))
    text='''# 00 — Tổng quan hệ thống ECOMMOR (as-is)

## Phạm vi và phương pháp

Snapshot working tree ngày 21/10/2026, gồm file untracked có trước nhiệm vụ. Các commit tài liệu không chứa code ứng dụng làm nguồn; muốn tái dựng snapshot phải giữ cả thay đổi có trước. Chỉ đọc tĩnh: đọc hiểu → đặt giả thuyết → lần theo route/controller/service/model/client → ghi nhận. Không chạy backend, mail, thanh toán hoặc DB. Các tên collection bên dưới là suy ra từ tên đăng ký Mongoose; collection vật lý cần xác minh từ DB, không truy cập trong nhiệm vụ.

## Cây file thực tế

Danh sách đầy đủ file dưới server/client, bỏ node_modules, dist, .git và nội dung .env. Upload và assets chỉ kiểm kê tên file; không suy diễn dữ liệu từ ảnh.

```text
'''
    files=[]
    for base in ['server','client']:
        for p in sorted((ROOT/base).rglob('*')):
            rel=p.relative_to(ROOT)
            if not p.is_file() or any(x in rel.parts for x in ['node_modules','dist','.git']): continue
            files.append(rel.as_posix())
    text+='\n'.join(files)+'\n```\n\n## Công nghệ và scripts\n\n'
    rows=[]
    for base in ['server','client']:
        pkg=json.loads(read(base+'/package.json'))
        rows.append([base,', '.join(f'{k}: `{v}`' for k,v in pkg['scripts'].items()),', '.join(f'{k} {v}' for k,v in pkg['dependencies'].items()),cite(base+'/package.json')])
    text+=table(['Tầng','Scripts thực tế','Dependencies khai báo (range, không phải bản đã resolve)','Nguồn'],rows)
    text+='''
Backend CommonJS: Express 4, Mongoose 8, RSA JWT, bcrypt, Socket.IO. Frontend ES modules: React 18, React Router, Vite, Ant Design, SCSS/Tailwind, TinyMCE. Không suy ra tất cả dependency được dùng chỉ từ package.json.

## Hạ tầng

Compose có mongodb replica set `rs0` với healthcheck khởi tạo; backend nạp env_file, ghi đè CONNECT_DB/TRUST_PROXY, bind cổng host loopback; nginx phục vụ `client/dist`, proxy `/api/` và `/uploads/`; ollama là profile tùy chọn, không thấy backend gọi nó. Volume MongoDB external phải có sẵn. Backend image và compose chạy npm dev; compose còn npm install lúc khởi động. Dockerfile client chạy build trước COPY source. Nginx chưa có location `/socket.io/`. Nguồn: `docker-compose.yaml:1`, `server/Dockerfile:1`, `client/Dockerfile:1`, `nginx/default.conf:1`. Các bất thường được phân loại riêng trong 05.

Vite dev bind loopback, port cố định, whitelist tunnel hostname và proxy `/api`, `/uploads`, `/socket.io` (ws). runtimeUrls chọn same-origin khi dev proxy, configured URL cho mode còn lại; uploadUrl tránh lặp `/uploads`. Nguồn: `client/vite.config.js:1`, `client/src/config/apiBaseUrl.js:1`, `client/src/config/runtimeUrls.js:1`. CORS server và socket dùng cùng getCorsOptions: whitelist DOMAIN_URL, CLIENT_URL, CLIENT_ORIGINS, dev bổ sung origin callback hợp lệ; credentials=true. Nguồn: `server/src/config/cors.js:getAllowedOrigins`, `server/src/socket.js:initSocket`.

## Danh sách đầy đủ endpoint backend

Đếm theo method + effective path, gộp đăng ký GET /api/users bị lặp trong routes/index.js. Các router root dùng app.METHOD(path, router) rồi router.METHOD cùng path: Express giữ nguyên URL cho route middleware; không nối lặp `/api`. Blog/message/brands dùng app.use(prefix). Static middleware chạy trước routes và phục vụ toàn bộ server/src (xem Phát hiện 05). Mọi API đều qua bodyParser, CORS, static và cookieParser; error middleware cuối pipeline. Nguồn: `server/src/routes/index.js:routes`, `server/src/server.js:1`.

'''
    rows=[]
    for r in R:
        models=re.findall(r"require\('\.\./models/([^']+)'\)",read(r['controller']))
        rows.append([r['method'],r['path'],', '.join(r['middleware']) or 'Không middleware riêng',r['handler'],', '.join(models) or ('brand/products qua service' if 'brands' in r['path'] else 'Xem service/luồng'),f"`{r['source']}:{r['line']}`; `{r['controller']}`"])
    text+=table(['Method','Effective path','Middleware theo thứ tự','Handler','Models trực tiếp / liên quan module','Nguồn'],rows)
    text+=f'\nTổng: **{len(R)} endpoint duy nhất**. Rate limit OTP send 5/giờ/IP và verify 15/15 phút/IP dùng hai instance chung cho các route tương ứng; chatbot 10/phút/IP. `authUser` trả 401, `authAdmin` cũng trả 401 khi không có quyền. Blog không bọc asyncHandler; xem 05. Nguồn: `server/src/routes/users.routes.js:1`, `server/src/auth/checkAuth.js:1`, `server/src/server.js:chatbotRateLimit`.\n'
    text+='\n## Model Mongoose\n\n'
    purposes={'user':'Tài khoản; isAdmin, typeLogin, trạng thái online','apikey':'Cặp khóa RSA theo user để ký/verify access và refresh token; không phải key dịch vụ bên ngoài','products':'Thông số đồng hồ, giá, tồn kho và số đã bán','category':'Danh mục tên; products.category lưu String','brand':'Tên/key thương hiệu; brand.service.list hợp nhất với products.brand','cartUser':'Giỏ và thông tin nhận hàng; danh sách sản phẩm nhúng','coupon':'Giảm trực tiếp số tiền, thời gian, số lượng và minPrice','payments':'Đơn hàng và snapshot sản phẩm; trạng thái đơn và thanh toán riêng','paymentAttempts':'Mỗi lần thanh toán VNPay; ref, hạn, kết quả IPN/querydr','otp':'OTP hash theo email/purpose; registration tạm, attempts, resend window','blog':'Bài viết HTML và ảnh','Message':'Tin nhắn, conversationId và isRead','previewProduct':'Đánh giá sản phẩm (content/rating), không phải ảnh preview'}
    text+=table(['Tên model đăng ký','Mục đích từ code','Nguồn'],[[m['name'],purposes[m['name']],cite(m['source'])] for m in M])
    text+='\n## Routes và cấu trúc client\n\n'
    s=read('client/src/Routes/routes.jsx'); client_routes=re.findall(r"path: '([^']+)'",s)
    text+=table(['Path UI','Nguồn'],[[p,cite('client/src/Routes/routes.jsx',f"path: '{p}'")] for p in client_routes])
    text+='''
`/admin` bọc AdminRoute → requestAdmin → authUser + authAdmin. Các tab quản trị là state selectedKey trong AdminLayout, không có route con `/admin/products`. `/profile` và `/orders` đều render InfoUser với tab mặc định thông tin; server vẫn bảo vệ dữ liệu cá nhân. Contact là trang tĩnh, không có API gửi liên hệ. Nguồn: `client/src/Routes/index.jsx:AdminRoute`, `client/src/Pages/Admin/index.jsx:AdminLayout`, `client/src/Pages/InfoUser/InfoUser.jsx:InfoUser`, `client/src/Pages/Contact/Contact.jsx:Contact`.

Provider giữ dataUser/dataCart/category/authLoading và hai message event, gọi auth rồi cart khi cookie logged='1', mở socket khi có userId, cleanup disconnect. Context được đọc qua useStore. useFetch tạo axios riêng, trả data/loading/error/reFetch, delay 600 ms; useDebounce cleanup timeout; useProductCatalog abort request, retry, khóa kết quả theo requestKey. Nguồn: `client/src/store/Provider.jsx:Provider`, `client/src/store/Context.jsx:1`, `client/src/hooks/userStore.jsx:useStore`, `client/src/hooks/useFetch.jsx:useFetch`, `client/src/hooks/useDebounce.jsx:useDebounce`, `client/src/hooks/useProductCatalog.js:useProductCatalog`.

### Pages/Components/hook và dependencies trực tiếp

'''
    rows=[]
    for p in sorted((ROOT/'client/src').rglob('*')):
        if p.suffix not in ['.jsx','.js'] or p.parent.name=='config': continue
        rel=p.relative_to(ROOT).as_posix(); s=read(rel)
        deps=re.findall(r"(?:from\s+|import\s*)['\"]([^'\"]+)['\"]",s)
        rows.append([rel,', '.join(x for x in deps if not x.endswith(('.scss','.css'))),cite(rel)])
    text+=table(['Module','Imports trực tiếp (giữ tên thực tế)','Nguồn'],rows)
    text+='\n## Toàn bộ request.jsx → endpoint và nơi dùng\n\n'
    text+=table(['Hàm','HTTP / path','Axios instance','Nơi tham chiếu thực tế','Nguồn'],[[f['name'],f"{f['method']} {f['path']}",f['client'],'; '.join(f['users']) or 'Không thấy consumer ngoài request.jsx',f"`client/src/config/request.jsx:{f['line']}`"] for f in F])
    text+='''
API ngoài request.jsx: useProductCatalog → GET /api/product-catalog; Category → GET /api/catalog-browse và useFetch /api/catalog-options; Header → useFetch /api/catalog-options; DetailProduct → useFetch /api/get-product-by-id; ProductByCategory → URL động get-product-by-category (component không được HomePage import). ApiClient.refreshToken/logout dùng axios trực tiếp. CheckOut gọi Goong Place AutoComplete trực tiếp (không chép key). Nguồn: các module client trong bảng dependencies, `client/src/Pages/CheckOut/CheckOut.jsx:onAddressSearch`.

## Socket.IO

'''
    text+=table(['Event','Bên gửi → bên nhận','Payload / hành vi','Nguồn'],[
        ['connection','Socket.IO → server','Đọc cookie token, verify RSA; cập nhật user online; Map userId → một socketId','server/src/socket.js:initSocket'],
        ['userConnected','Client có thể gửi → server','userId chỉ được log; không thay map identity; không thấy Provider emit','server/src/socket.js:initSocket'],
        ['newMessage','MessageController → socket admin','Document Message sau POST /api/message/create; Provider lưu newMessageAdmin','server/src/controllers/message.controller.js:createMessage; client/src/store/Provider.jsx:Provider'],
        ['newMessageUser','MessageController → socket khách','Document Message sau POST create-admin; Provider lưu newMessageUser','server/src/controllers/message.controller.js:createMessageAdmin; client/src/store/Provider.jsx:Provider'],
        ['allUserOnline','Không thấy emitter → Provider có listener','Chỉ console.log phía client; không xác định payload thực tế','client/src/store/Provider.jsx:Provider'],
        ['disconnect','Socket.IO → server','Xóa map khi socket hiện tại khớp; cập nhật isOnline=false, lastLoginAt','server/src/socket.js:initSocket']])
    text+='''
Tin nhắn được lưu bằng HTTP, socket chỉ chuyển thông báo, không có socket event gửi tin hay xác nhận đã đọc. Mark read là GET API cập nhật isRead, không emit read receipt. Nguồn: `server/src/controllers/message.controller.js:readMessage`.

## Tích hợp ngoài và tác nhân

'''
    text+=table(['Tích hợp','As-is','Nguồn'],[
        ['VNPay','SDK build URL, HMAC SHA512 verify Return/IPN; Return chỉ redirect; IPN settle; querydr đối soát có DB lease 5 phút và HTTP timeout 10s; worker 30s hết hạn tối đa 100 đơn/lượt','server/src/services/vnpay.service.js:checkout, verify, settle, reconcile, expirePending; server/src/services/vnpay-query.service.js:queryAttempt; server/src/server.js:runPaymentExpiry'],
        ['Google OAuth','Frontend GoogleLogin nhận credential; server verifyIdToken audience GOOGLE_CLIENT và email_verified; liên kết bằng email','client/src/Pages/LoginUser/LoginUser.jsx:handleSuccess; server/src/controllers/users.controller.js:loginGoogle'],
        ['Gmail OAuth2/Nodemailer','Lấy access token từ refresh token rồi gửi email qua Gmail transport (không có lệnh Gmail API messages.send); dùng USER_EMAIL','server/src/services/mail.service.js:createMailService'],
        ['Gemini','Catalog công khai tối đa 10 sản phẩm còn hàng; key server; thiếu key trả 503 INVALID_KEY; không có fallback giả thành công; 30s/lần, tối đa 2 retry','server/src/utils/chatbot.js:askQuestion'],
        ['MoMo','Có UI, tạo request HMAC SHA256 và nhận payUrl; callback GET dựa resultCode/orderInfo, không có IPN handler riêng','server/src/controllers/payments.controller.js:createPayment, checkPaymentMomo; client/src/Pages/CheckOut/CheckOut.jsx:onFinish'],
        ['Goong','Gợi ý địa chỉ trực tiếp từ browser; debounce 500 ms, tối thiểu 3 ký tự, abort cleanup','client/src/Pages/CheckOut/CheckOut.jsx:onAddressSearch'],
        ['Upload','Multer diskStorage; timestamp + đuôi tên gốc; products array(images), blogs single(image); URL /uploads/...; không thấy limits/fileFilter','server/src/routes/index.js:storage; server/src/routes/blog.routes.js:storage']])
    text+='''
Khách vãng lai dùng endpoint công khai. Khách hàng đã đăng nhập có JWT cookie token; `authUser` chỉ xác minh token, không dựa thông tin mã hóa frontend. Quản trị viên là user có isAdmin === true kiểm tra từ DB, thừa hưởng khả năng của user đã đăng nhập; typeLogin là phương thức email/google, không phải vai trò. Hệ thống ngoài: Google, Gmail, VNPay, MoMo, Gemini, Goong. Nguồn: `server/src/auth/checkAuth.js:authUser`, `authAdmin`; `server/src/models/users.model.js:1`.

## Kiến trúc tổng thể

React gọi Express qua Vite proxy hoặc Nginx/configured URL; backend đọc MongoDB và tích hợp dịch vụ ngoài. Worker thanh toán cùng process Express; realtime map chỉ trong memory process. Không mô tả microservice hoặc queue không có trong code.
'''
    text+=diagram('class-architecture','''left to right direction
actor "Khách vãng lai / Khách hàng / Quản trị viên" as UserActor
component "React Pages + Provider" as ReactApp
component "Vite proxy / Nginx" as Proxy
component "Express routes" as ExpressApp
component "Middleware xác thực / rate limit / upload" as MW
component "Controllers" as Ctrl
component "Services" as Svc
database "MongoDB (Mongoose)" as DB
component "Socket.IO + connectedUsers" as Socket
component "Worker hết hạn 30s" as Worker
cloud "VNPay" as VNP
cloud "Google / Gmail" as Google
cloud "Gemini" as Gemini
cloud "MoMo" as Momo
cloud "Goong" as Goong
UserActor --> ReactApp
ReactApp --> Proxy : HTTP + cookie
Proxy --> ExpressApp
ExpressApp --> MW
MW --> Ctrl
Ctrl --> Svc
Ctrl --> DB
Svc --> DB
Svc --> VNP
Ctrl --> Google
Svc --> Google
Ctrl --> Momo
Svc --> Gemini
ReactApp --> Goong
ReactApp <--> Socket
Ctrl --> Socket
Socket --> DB
Worker --> Svc''')
    text+='\n## Ma trận truy vết sơ bộ\n\nMa trận đầy đủ theo từng endpoint và UC nằm ở 05; bảng request/API và dependencies ở trên cung cấp liên kết nguồn ban đầu.\n\n'
    text+=table(['Nhóm','Route / controller','Model','Trang'],[
        ['Tài khoản','/api/register, login, auth, forgot-password → users.controller','user, apikey, otp','Register, LoginUser, ForgotPassword, InfoUser'],
        ['Catalog','/api/product-catalog, catalog-browse → products.controller','products, category, brand','HomePage/ProductNew, Category, Header'],
        ['Giỏ / đơn','/api/*cart → cartUser.controller; create-payment → payments.controller / vnpay.service','cartUser, products, coupon, payments, paymentAttempts','CartUser, CheckOut, PaymentSuccess, OrderUser'],
        ['Nội dung / chat','/api/blog/*; /api/message/*; /api/chatbot','blog, Message, products','Blogs, DetailBlog, Messger, Chatbot'],
        ['Admin','/api/*product/category/coupon/user/order, statistical','Các model tương ứng; previewProduct cho thống kê','AdminLayout và các Manager*']])
    text+='''
## Công cụ vận hành và import (không chạy)

`run-dev.ps1:Test-Port` kiểm cổng, khởi động backend ẩn nếu chưa có process lắng nghe, chờ `/api/catalog-options`, rồi mở Vite ẩn và kiểm ready. Script dùng đường dẫn Node/Npm cố định trên máy tác giả. `run-vnpay-dev.ps1:1` lấy callback origin từ checker, chỉ nhận hostname ngrok-free hợp lệ, đặt tạm VITE_TUNNEL_HOST/VITE_API_MODE rồi khôi phục env; quản lý tunnel riêng. Không chạy hai script này trong nhiệm vụ.

| Script | Vai trò xác minh từ code | Nguồn |
| --- | --- | --- |
| mail-check.js | Gọi shared mailService.sendCheckEmail; có thể gửi mail thật nếu chạy | server/scripts/mail-check.js:1 |
| check-vnpay-connectivity.cjs | Validate callback origin; probe Return/IPN bằng request rỗng và kiểm bị từ chối chữ ký | server/scripts/check-vnpay-connectivity.cjs:checkConnectivity |
| check-vnpay-status.cjs | Đọc order/attempt từ DB rồi querydr; không phải API route | server/scripts/check-vnpay-status.cjs:1 |
| luxurytime-mapping.cjs | Map dữ liệu catalog, chuẩn hóa thông số và escape HTML; stable id, không thêm model Mongoose | server/scripts/luxurytime-mapping.cjs:mapProducts |
| import-luxurytime-catalog.cjs | Mặc định preview nhưng vẫn connect/read DB; --apply bulkWrite category/product và staging collection luxurytime_products | server/scripts/import-luxurytime-catalog.cjs:run |
| verify-checkout-live.cjs | Tạo fixture cart/key/order/attempt và cleanup trong DB; tuyệt đối không chạy trong phạm vi này | server/scripts/verify-checkout-live.cjs:main |

### Kiểm kê test theo file (không coi là đã pass)

'''
    testrows=[]
    for base in ['server/test','client/test']:
        for p in sorted((ROOT/base).glob('*')):
            if p.suffix not in ['.js','.cjs','.mjs']: continue
            rel=p.relative_to(ROOT).as_posix(); body=read(rel)
            titles=re.findall(r"(?:test|describe)\('([^'\n]+)'",body)
            testrows.append([rel,'; '.join(titles), 'Có connect/listen trong source' if re.search(r'\.connect\(|\.listen\(',body) else 'Cần đọc phụ thuộc trước chạy',cite(rel)])
    text+=table(['Test file','Mục đích qua tên test','Lưu ý chạy','Nguồn'],testrows)
    text+='\n## Giả định / Phát hiện\n\nTên collection vật lý, Google Console, Gmail consent, VNPay merchant/IPN registration, DNS/TLS, dữ liệu legacy và deployment đều **Cần xác minh**. Phát hiện tập trung tại 05 để tránh nhầm hành vi hiện tại với đề xuất sửa.\n'
    write('00-tong-quan.md',text); progress('Giai đoạn 0 — kiểm kê','Giai đoạn 1–5 và README/kiểm tra cuối')

if __name__=='__main__':
    stage=sys.argv[1] if len(sys.argv)>1 else '0'
    if stage=='0': stage0()
    else:
        from design_content import run
        run(stage)
