# COD/VNPay: sửa và kiểm chứng thực tế

Ngày: 2026-10-07. Không commit/push, không sửa .env hoặc CONNECT_DB.

## Thay đổi

- Runtime mongodb đã được recreate bằng service mongodb trong Compose hiện có,
  với image sẵn có, không pull/install dependency. Giữ volume
  banongho_mongodb_data; backup nằm tại .runtime/backups/ecommor-before-checkout-rs.archive.gz.
- MongoDB hiện primary rs0, publish 127.0.0.1:27017 thay cho mọi interface.
  Authorization vẫn chưa bật; production cần thiết kế credentials/keyfile riêng.
- server/src/config/connectDB.js: dev single-host loopback dùng directConnection
  để tới Docker primary qua port publish, không phụ thuộc advertised hostname
  mongodb được dùng trong Docker network. Production/remote và lựa chọn explicit
  trong URI giữ nguyên. Không thay giá trị CONNECT_DB.
- run-dev.ps1: bỏ fallback tự dựng standalone MongoDB khác và ghi đè CONNECT_DB.
  Backend tiếp tục đọc env hiện có; script không tự dựng lại DB.
- server/src/services/vnpay.service.js: nhận shipping/coupon trong cùng transaction
  checkout; nhánh tìm checkout đã commit chạy trước bước cần cart.
- client/src/Pages/CheckOut/CheckOut.jsx: COD/VNPAY gọi trực tiếp create-payment;
  chỉ MoMo giữ update-info-cart. Lỗi refresh cart sau COD không bị báo thành lỗi
  tạo đơn. Address lookup có abort/catch/fallback array; bỏ AutoComplete outer size.
- server/test/checkout-request.test.cjs, mongo-options.test.cjs: kiểm tra shipping
  mới, recovery sau cart deletion và dev/production/directConnection options.
- server/scripts/verify-checkout-live.cjs: kiểm tra real HTTP qua Vite bằng fixture
  riêng, chống dùng production VNPay, giữ provider cookies qua redirects, không
  in token/secret/payment URL. Hủy đơn và cleanup chỉ các fixture IDs tạo trong run.

## Kết quả thực tế

| Kiểm tra | COD | VNPay |
| --- | --- | --- |
| POST qua localhost:5173/api/create-payment | 201 | 201 |
| Replay cùng cartId sau commit/xóa cart | 201, cùng đơn | 201, cùng URL |
| Số đơn của checkout key | 1 | 1 |
| Giá từ DB thay cho tổng client giả | PASS | PASS |
| GET trang dữ liệu kết quả | 200 | 200 |
| Hủy fixture và hoàn stock | PASS | PASS |
| Provider landing thực tế | Không áp dụng | HTTP 200, /paymentv2/Transaction/PaymentMethod.html |
| Provider xác nhận paid/IPN thật | Không áp dụng | CHƯA KIỂM CHỨNG |

Lần probe đầu chạy khi nodemon restart nhận Vite 500; script nay chờ readiness.
Probe dùng Node fetch không giữ provider session qua redirect cũng nhận Error.html;
đây là hạn chế phép thử, không được dùng để kết luận merchant/signature sai.
Phép thử cuối dùng curl cookie engine, được sandbox đưa tới PaymentMethod.html.
Không nhập thẻ/ngân hàng/OTP, không gửi IPN giả để biến đơn thật thành paid.
Không có browser kết nối trong phiên; chưa kiểm chứng click/form UI hoặc cookie
login trong browser. HTTP authenticated fixture dùng cơ chế token thật của backend.

Sau cleanup, các collection ứng dụng giữ số record trước test:
users=6, products=9, payments=3, cartusers=2, apikeys=1, paymentattempts=0.
Không sửa/hủy đơn hay trừ stock của sản phẩm người dùng để làm phép thử.

## Kiểm tra tự động

- client npm run lint: PASS, 0 error / 0 warning.
- client npm run build: PASS, một warning chunk >500 kB.
- client node --test test: PASS, 8 tests.
- server npm test với MONGODB_TEST_URI trỏ container test replica set 27019:
  PASS, 32 tests, 0 failed, 0 skipped. Integration chạy trong DB fixture mới;
  không chạy trên watch. Bao gồm replay/concurrency IPN, stock/coupon rollback,
  oversell, cancel/expiry và COD delivered idempotency.
- Mongoose reserved collection: vẫn 7 warning occurrences trong full server suite,
  cùng một loại. Không migration field chỉ để giảm warning.

## Trước/sau

| Phạm vi | Trước | Sau |
| --- | --- | --- |
| create-payment COD/VNPAY | 503 do standalone | 201 real HTTP cho hai phương thức |
| Dev Mongo transaction | Code 20 | Replica set primary; checkout commit/replay PASS |
| Mongo publish | 0.0.0.0 và IPv6 | 127.0.0.1 |
| Checkout retry recovery | Bị chặn bởi update-info-cart | Replay trực tiếp PASS |
| Address handling | Không catch/abort | Có catch/abort và array fallback |
| AntD outer size | 1 vị trí warning | 0 vị trí; browser console chưa đo lại |
| Lint error/warning | 0/0 | 0/0 |
| Build error/warning | 0/1 | 0/1 |
| Server failed/warning | 0/7; integration skip | 0/7; 32 tests, không skip |
| Browser tổng error/warning | 7/1 theo ảnh trước | CHƯA KIỂM CHỨNG lại |

## CẦN TÔI QUYẾT ĐỊNH

| File:dòng | Rule | Vì sao chưa sửa | Phương án |
| --- | --- | --- | --- |
| server/src/services/vnpay.service.js:239 | VNPAY_MULTI_ATTEMPT_RECONCILIATION | Cần chốt policy đối soát; generic fix không quyết định tiền trùng | Giữ policy hold hiện tại hoặc giữ order paid và flag riêng attempt cũ |
| docker-compose.yaml:5 | MONGODB_AUTHORIZATION | Dev hiện giới hạn loopback nhưng chưa auth; cần credentials/keyfile và deployment plan | Thiết kế auth riêng trước production, không sửa .env hoặc tạo credentials ngoài phạm vi |
| server/src/models/products.model.js:10 | MONGOOSE_RESERVED_SCHEMA_PATH | Rename cần migration/API | Migration được duyệt hoặc chấp nhận có tài liệu |
| client/vite.config.js:23 | VITE_CHUNK_SIZE_LIMIT | Không liên quan checkout; splitting thay tải module | Task phân tích bundle riêng |
| server/src/routes/payments.route.js:10 | VNPAY_REAL_PAYMENT_IPN | Chưa nhập test bank/OTP, không có browser; không thay merchant config | Người dùng thanh toán sandbox và kiểm tra provider IPN/public tunnel, xác nhận trạng thái paid |

## Dùng và tái kiểm chứng

Website hiện chạy tại http://localhost:5173 và http://127.0.0.1:5173.
Vite proxy trỏ backend 3000. Không cần sửa URL API vì thay đổi Mongo runtime.
Trong server/, có thể chạy node scripts/verify-checkout-live.cjs để kiểm tra lại;
script tạo và cleanup fixture riêng, chỉ chạy với VNPay sandbox.
Luồng paid thực sự: tạo VNPay order từ UI, hoàn tất phương thức sandbox do provider
cung cấp, giữ public tunnel cho Return/IPN, kiểm tra order paid và IPN replay.
Không coi trang chọn phương thức hoặc callback tự dựng là đã thanh toán.
