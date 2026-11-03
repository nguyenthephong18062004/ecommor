# Kiem tra checkout VNPay - 2026-10-07

Ket luan: da sua viec Axios goi localhost khi mo website qua tunnel va launcher
ghi de cau hinh. Chua xac minh thanh toan Sandbox end-to-end. Cau hinh host,
CORS va MongoDB replica set hien van chan luong that.

## Luong da doi chieu

- client/src/Pages/CheckOut/CheckOut.jsx:92 goi POST /api/update-info-cart truoc.
- Dong 93 goi POST /api/create-payment, JSON body co cartId/typePayment.
- server/src/routes/payments.route.js:7 bat buoc authUser va asyncHandler.
- server/src/auth/checkAuth.js:13 doc cookie token; Axios gui withCredentials.
- server/src/controllers/payments.controller.js:71 goi checkout, tra 201 JSON.
- server/src/services/vnpay.service.js:168 kiem tra config truoc transaction.
- Checkout tinh gia/snapshot tu Products trong DB, khong tin totalPrice client.
- Response metadata la URL string cho VNPay, order object cho COD.
- client/src/Pages/CheckOut/CheckOut.jsx:98 dung window.location.assign(metadata).
  Khong phat hien loi field response hay React Router cho URL ben ngoai.
- Catch hien message backend, finally reset loading/submitting.
- Khong phat hien /api bi lap, rewrite hay mount sai trong request da probe.

## Bao cao loi

### [MUC DO: High] Axios bo qua proxy va goi localhost tu website public
- **Vi tri:** client/src/config/axiosClient.jsx:7; client/src/config/request.jsx:8.
- **Mo ta:** Vite dang phuc vu VITE_URL_API=http://localhost:3000. Hai Axios
  client dung truc tiep dia chi nay, ke ca khi trang o domain ngrok.
- **Cach tai hien:** mo trang bang domain ngrok; submit checkout. Request dau
  tien /api/update-info-cart duoc ghep voi localhost:3000 cua may nguoi dung.
  Da xac minh gia tri trong module Vite dang chay, khong chi doc file .env.
- **Tac dong:** request khong qua proxy; may khac khong toi backend, session
  khong cung origin. Tren may dev backend tra 500 voi Origin ngrok do CORS.
  Chua co browser trace de khang dinh mixed-content la thong bao cu the.
- **De xuat sua:** da them resolveApiBaseUrl; API loopback khi trang public
  duoc chuyen sang page.origin. Ap dung ca login va checkout de cookie dong bo.
  Local dev va backend public duoc cau hinh chu dong van giu nguyen.
- **Do chac chan:** Chac chan. URL Axios sau sua da kiem tra bang adapter mock.

### [MUC DO: High] Launcher ghi de DB va origin, checkout gap MongoDB standalone
- **Vi tri:** run-dev.ps1:25; server/src/services/vnpay.service.js:77.
- **Mo ta:** launcher cu luon dat CONNECT_DB ve standalone va hai origin ve
  localhost. DB tu server/.env da tra hello khong co setName/mongos. Transaction
  chi doc tren DB nay that bai MongoServerError code 20. Neu backend chay voi
  process override khac .env, can doi chieu topology cua URI override do.
- **Cach tai hien:** tren DB standalone, findOne trong session.withTransaction
  that bai code 20. Test mock qua controller xac nhan code nay thanh HTTP 503
  voi message Checkout requires MongoDB replica set transactions.
- **Tac dong:** POST /api/create-payment khong tao duoc don/URL; ca COD su dung
  transaction nen cung bi anh huong. Khong the sua bang bypass transaction.
- **De xuat sua:** da sua launcher giu process CONNECT_DB/DOMAIN_URL/CLIENT_URL
  co san va khong khoi dong standalone khi CONNECT_DB da duoc cung cap.
  Nguoi dung van phai cung cap URI replica set/test DB hop le; default local
  cua launcher chua tu dong chuyen DB cu sang replica set.
- **Do chac chan:** Chac chan voi DB trong .env va loi ghi de trong launcher;
  runtime launcher moi chua duoc kiem chung.

### [MUC DO: Medium] Origin ngrok khong nam trong CORS whitelist
- **Vi tri:** server/src/server.js:43; server/src/controllers/payments.controller.js:157.
- **Mo ta:** DOMAIN_URL/CLIENT_URL trong .env van la localhost:5173. Backend
  that tra 500 JSON Not allowed by CORS khi Origin la domain ngrok. DOMAIN_URL
  con duoc dung redirect Return ve frontend, nen localhost cung sai tren may khac.
- **Cach tai hien:** POST /api/create-payment voi body {} va Origin ngrok,
  khong gui token: 500 JSON. Khong Origin: 401 JSON Vui long dang nhap.
- **Tac dong:** request bi chan truoc auth/controller; Return co the ve localhost.
- **De xuat sua:** cap nhat DOMAIN_URL va CLIENT_URL thanh origin HTTPS ngrok,
  restart backend. Khong sua .env that, khong them wildcard vao whitelist.
- **Do chac chan:** Chac chan voi response backend dang chay.

### [MUC DO: Medium] Domain public hien bi chan boi host whitelist
- **Vi tri:** client/vite.config.js:23.
- **Mo ta:** VITE_TUNNEL_HOST khong co trong client/.env; allowedHosts phu thuoc
  bien nay. Tunnel API xac nhan forward localhost:5173; POST public tra 403
  text/plain, trong khi cung path local qua Vite tra 401 JSON tu backend.
- **Cach tai hien:** POST public /api/create-payment, JSON {}, khong cookie.
- **Tac dong:** tai thoi diem probe, request public chua toi payment controller.
- **De xuat sua:** dat VITE_TUNNEL_HOST dung hostname tunnel va restart Vite.
  Can kiem tra lai neu session chay Vite co process override khac .env.
- **Do chac chan:** Chac chan ve 403 public; can xac minh lai sau restart whitelist.

| Muc do | So luong |
| --- | --- |
| Critical | 0 |
| High | 2 |
| Medium | 2 |
| Low | 0 |

## Cau hinh can cap nhat (placeholder, khong sua .env that)

Frontend, restart Vite sau khi dat:

```dotenv
VITE_TUNNEL_HOST=<hostname-ngrok-khong-co-https>
VITE_URL_API=https://<hostname-ngrok>
```

VITE_URL_API khong them /api. Ban sua cung tu xu ly API localhost khi trang
duoc mo qua domain public. VITE_TUNNEL_HOST van can cho allowedHosts.

Backend, restart sau khi dat:

```dotenv
DOMAIN_URL=https://<hostname-ngrok>
CLIENT_URL=https://<hostname-ngrok>
VNPAY_ENV=sandbox
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://<hostname-ngrok>/api/vnpay-return
VNPAY_TMN_CODE=<merchant-Sandbox-do-VNPay-cap>
VNPAY_SECRET_KEY=<Hash-Secret-tuong-ung-do-VNPay-cap>
CONNECT_DB=mongodb://<replica-set-host>:<port>/<disposable-test-db>?replicaSet=<set-name>
```

Tat ca bien VNPay bat buoc hien co mat trong server/.env; URL gateway va path
Return hop le. Khong xac nhan merchant/secret duoc VNPay chap nhan chi tu viec
bien co mat. Test moi dung TESTCODE va secret ngau nhien trong process test,
khong gui len VNPay. Khong thay doi file test VNPay nguoi dung dang sua.

Neu dung run-dev.ps1, truyen CONNECT_DB/DOMAIN_URL/CLIENT_URL bang process env
truoc khi chay; launcher van dung default standalone neu khong truyen CONNECT_DB.
Launcher khong restart process dang chiem 3000/5173: can restart dung process
cu de nap cau hinh. Khong doi topology hay du lieu DB that tu dong.

Dang ky IPN GET https://<hostname-ngrok>/api/vnpay-ipn voi VNPay rieng.
Khong co consumer VNPAY_IPN_URL trong luong nay.

## Ky request va gioi han

Doi chieu tai lieu chinh thuc:
https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html

- API 2.1.0, pay, VND, sort query va HMAC SHA512 duoc doi chieu.
- Service truyen so VND vao thu vien vnpay; thu vien nhan 100 mot lan.
  Test 180000 VND thanh vnp_Amount=18000000, khong in URL giao dich.
- GMT+7, rollover midnight, expire 15 phut va reference UUID 32 ky tu da test.
- Return dung config server, khong dung host/request do client tu cung cap.
- IP lay req.ip/remoteAddress, validate net.isIP; khong bat trust proxy=true.
  Khi trust proxy chua cau hinh, IP co the la loopback cua proxy. Chua co bang
  chung VNPay tu choi vi IP nay; chua sua trust proxy hay thuat toan ky.
- Trang thai paid khong duoc gan khi tao URL/redirect. Return chi doc; IPN verify
  chu ky/amount/status. DB integration ve stock/idempotency da skip, khong ket
  luan nhung workflow nay PASS tu unit test.
- Gioi han Numeric[1,12] cua vnp_Amount can luu y neu catalog co tong tien rat
  lon; chua co bang chung day la nguyen nhan giao dich hien tai.

## Ket qua kiem tra

| Kiem tra | Ket qua |
| --- | --- |
| Backend npm test | PASS: 15 tests, replica-set integration suite SKIP |
| Frontend node --test test/apiBaseUrl.test.mjs | PASS: 2 tests |
| Client npm run lint | PASS |
| Client npm run build | PASS, co warning bundle size |
| PowerShell parser run-dev.ps1; git diff --check | PASS |
| Axios that voi adapter mock, local va ngrok | PASS: POST JSON, credentials, path dung |
| Controller + signing that, DB mock | PASS: 201 metadata URL; COD order unpaid |
| Mock standalone failure qua controller | PASS: 503, session cleanup |
| Backend that, khong cookie/Origin | PASS: 401 application/json |
| Backend that, Origin ngrok | FAIL: 500 Not allowed by CORS |
| Local Vite /api/create-payment, khong cookie | PASS: 401 JSON, khong HTML fallback |
| Domain ngrok /api/create-payment | FAIL: 403 text/plain |
| DB trong .env, transaction chi doc | FAIL: MongoDB code 20 |
| Runtime launcher moi bang process mock | CHUA KIEM CHUNG: automatic approval rejected, blocked by policy |
| Browser click/login va VNPay chap nhan merchant | CHUA KIEM CHUNG |

Khong tao don/giao dich tren DB that. COD/login/cart duoc bao phu boi mock
va cac test hien co; chua phai browser end-to-end. Khong khoi dong backend moi
vi expiry job co the cap nhat don dang cho trong DB that.

## Test lai tu click den VNPay

1. Dung disposable replica-set DB va merchant Sandbox that. Dat cac bien tren,
   restart backend/Vite; giu ngrok forward 5173 va hostname allowedHosts dung.
2. Mo domain ngrok, dang nhap lai tren domain nay de tao cookie cung origin.
   Chi test khi public API tra JSON; 403 host phai duoc giai quyet truoc.
3. Them san pham vao gio, nhap du thong tin giao hang, chon VNPAY va bam Dat hang.
4. Network phai co POST cung origin /api/update-info-cart -> 200 JSON, sau do
   /api/create-payment -> 201 JSON voi metadata la URL string. Khong gui URL
   day du/cookie/token khi bao loi; chi gui path/status/message da loc.
5. Trinh duyet chuyen toan trang sang sandbox.vnpayment.vn va hien trang chon
   phuong thuc thanh toan. Neu gateway tu choi, ghi ma loi; khong ket luan
   signature/merchant hop le chi vi API tao URL thanh cong.
6. Chi sau buoc 5 moi test thanh toan Sandbox, Return va IPN. Tao URL hoac
   redirect thanh cong khong dong nghia don da paid.
