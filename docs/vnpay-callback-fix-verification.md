# VNPay callback - sua va xac minh 08/10/2026

## Ket qua quan trong

Da khoi phuc tunnel dung domain hien co toi `http://127.0.0.1:5173`, khong sua .env, khong cai dependency, khong tat/recreate DB. Ngrok chay nen voi request inspection tat de khong thu thap query callback co chu ky. Local frontend/backend dang co duoc giu lai.

**QUERYDR read-only dau tien da xac nhan 3 giao dich Sandbox cu thanh cong tai VNPay, trong khi local deu expired va chua ghi nhan IPN.** Khong tu danh dau paid, hoan tien, tao don moi, reserve lai kho, replay callback that hay gui IPN gia. Khong thao tac OTP trong browser vi khong co browser ket noi.

## Thay doi

- `run-vnpay-dev.ps1`: doc origin callback tu cau hinh da co, dung ngrok da cai va domain hien co, forward toi 5173. Khong thay tunnel khac dang chay. Cho toi da 120 giay khi ngrok khoi dong; chay kiem tra Return/IPN truoc khi bao routing ready. Khong doi authtoken/config cua ngrok.
- `server/scripts/check-vnpay-connectivity.cjs`: 4 probe local/public cho Return/IPN, query rong, timeout, khong theo redirect. Return gui Origin nhu browser; IPN khong gui Origin nhu server-to-server. Chi chap nhan loi chu ky dung ky vong, khong coi HTML/redirect/404/500 la healthy. Khong truy cap DB.
- `server/src/config/cors.js`: chi trong dev, cho phep exact origin cua HTTPS VNPay Return URL da cau hinh, dung path callback, khong credentials/query/hash. Production van yeu cau allowlist tuong minh; khong wildcard. HTTP va Socket.IO dang dung chung helper nay trong working tree.
- `server/scripts/check-vnpay-status.cjs`: doc toi da 3 attempt gan nhat, chi POST QUERYDR toi Sandbox. Xac minh HMAC response, merchant/reference/amount/command/type. Chi in diagnostic gioi han va alias; khong in secret, reference that, payment URL hay response body. Khong ghi DB; khong refund. Ket qua khong verify duoc thi needsReconciliation=null, khong duoc dien giai la chua thanh toan.
- Them 9 test: connectivity 4, status check 4, callback CORS 1. Khong doi code trang thai thanh toan, retry, expiry hay refund policy.

## Loi va root cause

### [MUC DO: High] Callback public bi gian doan boi ngrok offline - da khoi phuc
- **Vi tri:** `server/src/services/vnpay.service.js:151`, `run-vnpay-dev.ps1:36`.
- **Mo ta:** URL thanh toan nhung public Return URL nhung ngrok agent khong chay; public Return/IPN tra 404 ERR_NGROK_3200.
- **Cach tai hien:** Probe public `/api/vnpay-return` va `/api/vnpay-ipn` khong co query truoc khi khoi phuc tunnel.
- **Tac dong:** Return khong ve shop; IPN khong the toi endpoint nay khi offline.
- **De xuat sua:** Da khoi phuc domain hien co; dung launcher/preflight de phat hien loi truoc khi bat dau phien Sandbox. Launcher khong dam bao tunnel khong the bi ngat sau khi check.
- **Do chac chan:** Chac chan, probe truoc/sau truc tiep.

### [MUC DO: High] Origin public bi backend CORS tu choi - da sua
- **Vi tri:** `server/src/config/cors.js:5`.
- **Mo ta:** Return URL public da cau hinh nhung allowlist backend chi co origin local; request voi Origin public tra 500 Not allowed by CORS. Chi probe khong co Origin se bo sot loi nay.
- **Cach tai hien:** GET backend `/api/vnpay-return` voi Origin public truoc sua tra 500; test callback-origin moi fail truoc sua va pass sau sua.
- **Tac dong:** Browser public khong goi duoc API/checkout; Vite them CORS headers khong the sua backend status 500.
- **De xuat sua:** Da them exact configured callback origin trong dev; bo sung negative tests origin khac, scheme khac, URL malformed va production.
- **Do chac chan:** Chac chan, HTTP truc tiep va unit test red/green.

### [MUC DO: High] Provider paid nhung local expired - chua tu sua du lieu
- **Vi tri:** `server/src/services/vnpay.service.js:274`, `server/src/services/vnpay.service.js:280`, `server/src/routes/payments.route.js:10`.
- **Mo ta:** Ba attempt cu khong co receivedAt; expiry da release reservation. QUERYDR dau tien tra HTTP 200, responseCode=00, transactionStatus=00; chu ky HMAC hop le, merchant/reference/amount khop ca ba.
- **Cach tai hien:** Doc DB voi projection gioi han va query provider bang createDate/reference duoc luu; khong replay signed Return. Lan goi CLI sau do nhan 94 (query lap trong thoi gian gioi han), exit 1; khong dien giai response nay thanh unpaid, khong ghi de ket qua verified truoc.
- **Tac dong:** Ket qua thanh toan va trang thai merchant khong nhat quan; retry luc nay co nguy co thanh toan lap. Du lieu dang la Sandbox, khong khang dinh tien that bi tru.
- **De xuat sua:** Xac nhan dang ky IPN va delivery history tren merchant portal; chot refund/re-reservation policy cho ba don truoc khi doi du lieu. Khong sua expired thanh paid don thuan vi kho da release. QUERYDR co the lam nguon doi soat nhung chua tu dong cap nhat.
- **Do chac chan:** Chac chan ve ba ket qua provider/local; can xac minh vi sao khong co IPN (chua dang ky, sai endpoint hay delivery that bai).

## HTTP truoc/sau

| Kiem tra | Truoc | Sau |
| --- | --- | --- |
| Public Return, khong signed query | 404 ERR_NGROK_3200 | 400 JSON chu ky VNPay khong hop le - dung ky vong |
| Public IPN, khong signed query | 404 ERR_NGROK_3200 | 200 JSON RspCode=97 - dung ky vong |
| Backend Return voi Origin public | 500 Not allowed by CORS | 400 signature rejection, allow-origin exact, credentials=true |
| Product API voi Origin public | 500 | 200 qua backend truc tiep va public proxy |
| Origin la qua backend | Bi chan | Van bi chan, khong co allow-origin |
| Don cu provider paid / local expired | 3 truong hop xac minh trong luot nay | 3, chua ghi DB; can quyet dinh doi soat |

400/97 o tren la **pass cua negative probe**, khong phai mot giao dich duoc xac nhan paid. Browser console/preload warnings va phien login/OTP moi chua duoc do lai.

## Bang truoc/sau lint/build/tests

Baseline: bao cao audit truoc `docs/vnpay-otp-return-audit.md`. Warning tinh theo so lan xuat hien; Vite/Mongoose khong phai ESLint rule.

| Rule/diagnostic | Error truoc | Warning truoc | Error sau | Warning sau |
| --- | ---: | ---: | ---: | ---: |
| ESLint client, tat ca rule | 0 | 0 | 0 | 0 |
| Vite large chunk | 0 | 1 | 0 | 1 |
| Mongoose reserved path collection | 0 | 7 | 0 | 7 |
| **Tong lint/build/tests** | **0** | **8** | **0** | **8** |

- Client `npm run lint`: PASS, exit 0.
- Client `npm run build`: PASS, exit 0; JS chinh 2,956.42 kB minified; 1 warning chunk size.
- Client `node --test test`: PASS 8/8, 0 fail, 0 skip.
- Server `npm test` voi MongoDB test rieng cong 27019: PASS 41/41, 0 fail, 0 skip; 7 reserved-path warnings. Baseline 32 tests, them 9 tests.
- Server khong co script lint/build; khong danh dau hai lenh khong ton tai la pass.
- Status CLI: QUERYDR lap tra 94, exit 1 dung ky vong khi ket qua khong duoc xac minh. Khong cong diagnostic doi soat nay vao tong lint/build/tests.

## Commit

Branch `fix/vnpay-callback-availability`:
- `169e110 fix(dev): restore and verify VNPay callback tunnel` - `run-vnpay-dev.ps1`, `server/scripts/check-vnpay-connectivity.cjs`, `server/test/vnpay-connectivity.test.cjs`.
- `2bb3cec fix(cors): allow configured VNPay callback origin in dev` - `server/src/config/cors.js`, `server/test/origins.test.cjs`.
- `ff2bfa9 fix(payments): verify read-only sandbox reconciliation results` - `server/scripts/check-vnpay-status.cjs`, `server/test/vnpay-status-check.test.cjs`.

Working tree da co nhieu thay doi tu cac luot truoc; khong gom cac thay doi do vao commit moi va khong revert. Ket qua live/tests o day thuoc **toan working tree hien tai**, khong khang dinh checkout rieng ba commit tren nen HEAD cu se co du moi thay doi truoc do. Bao cao nay duoc luu rieng, chua commit.

## CAN TOI QUYET DINH

| File:dong | Rule | Vi sao chua sua | Phuong an de xuat |
| --- | --- | --- | --- |
| `server/src/routes/payments.route.js:10` | PAYMENT-IPN-REGISTRATION | Khong co quyen vao merchant portal; endpoint reachable khong chung minh da dang ky | Xac nhan IPN URL HTTPS dung domain hien tai va lay delivery log; khong gui IPN gia |
| `server/src/services/vnpay.service.js:274` | PAYMENT-RECONCILIATION | Ba don Sandbox provider paid/local expired, kho da release; auto-paid co the lam sai ton kho | Chot refund hay tiep tuc don voi transaction re-reserve stock/coupon; doi soat tung attempt va audit trail |
| `server/src/services/vnpay.service.js:264` | PAYMENT-RETRY-REUSE | Thay retry khi provider status chua xac dinh co the tao thanh toan lap | Chot chan retry/QUERYDR truoc khi tao attempt moi; tam khong mo lai URL cu |
| `server/src/services/vnpay.service.js:239` | PAYMENT-STALE-SUCCESS | Success cu co the chuyen ca order sang refund_required; thay doi lien quan fulfillment | Chot refund theo attempt hay order va them test current paid + stale success |
| `server/src/models/products.model.js:10` | MONGOOSE-RESERVED-PATH | Doi field can migration/API compatibility | Xu ly sau thanh toan, khong suppress chi de giam warning |
| `client/vite.config.js:25` | VITE-LARGE-CHUNK | Code splitting ngoai root cause, can regression routes/loading | Tach route/admin/chart co test; khong chi nang warning limit |

## Cach chay lai

Tu root PowerShell: `.\run-vnpay-dev.ps1` (khong thay .env). Kiem tra rieng: `node server/scripts/check-vnpay-connectivity.cjs`.

Doi soat read-only: `node server/scripts/check-vnpay-status.cjs`. Khong lap lien tuc; neu responseCode=94, cho het cua so rate limit (tai lieu VNPay neu 5 phut). Exit 1 co nghia co sai lech, ket qua chua verify duoc hoac query fail; khong co nghia thanh toan chac chan that bai.

Shop dang phuc vu tai `http://127.0.0.1:5173` va public domain ngrok hien co. Giu cac process chay. Chua tao them giao dich truoc khi doi soat ba attempt cu va xac nhan IPN registration. Sau do can mot phien Sandbox moi de xac nhan provider -> IPN -> DB paid -> Return UI; khong lay HTTP probe thay cho ket qua end-to-end.

## Tong hop

| Muc do | So luong |
| --- | ---: |
| Critical | 0 |
| High | 3 (2 da sua/khoi phuc, 1 cho doi soat) |
| Medium | 0 |
| Low | 0 |

## Nguon

- [ngrok ERR_NGROK_3200](https://ngrok.com/docs/errors/err_ngrok_3200): endpoint offline.
- [VNPay QUERYDR](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html): API truy van, format checksum, phan biet query response voi transaction status.
- [VNPay FAQ](https://sandbox.vnpayment.vn/apis/docs/faqs/): Return hien thi, IPN cap nhat ket qua.
- [VNPay bang ma loi](https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/): QUERYDR 94 la truy van lap trong cua so gioi han.

**Chua tuyen bo toan bo luong thanh toan da hoan tat.** Da xac minh va khoi phuc routing/CORS; trang thai ba giao dich cu va merchant IPN registration can duoc xu ly tiep theo quyet dinh nghiep vu.
