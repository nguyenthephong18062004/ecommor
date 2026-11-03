# Báo cáo COD/VNPay: HTTP 503 và rủi ro liên quan

Ngày kiểm tra: 2026-10-07. Phạm vi: đọc hiểu, xác minh, báo cáo và đề xuất.
Không sửa application code/config, không commit/push, không tạo đơn, cập nhật
giỏ hàng hay trừ kho trên DB thật. File này là báo cáo mới; giữ nguyên worktree
có sẵn của người dùng. Build cập nhật artifact dist như hành vi thông thường.

## Cấu trúc thực tế

- Backend: server/src/auth, config, controllers, core, models, routes, services,
  uploads, utils; server/test và server/scripts.
- Frontend: client/src/assets, Components, config, hooks, Pages, Routes, store,
  utils; client/test.
- Luồng: CheckOut.jsx -> request.jsx/axiosClient.jsx -> payments.route.js ->
  payments.controller.js -> vnpay.service.js -> payments/paymentAttempt/cartUser/
  products/coupon models.
- POST /api/create-payment yêu cầu authUser; cả COD và VNPAY gọi checkout.
  Return/IPN có route thật /api/vnpay-return và /api/vnpay-ipn; IPN không cần
  browser auth nhưng có signature/amount/order validation.

## Bằng chứng runtime và tái hiện

1. Ảnh người dùng: hai POST create-payment trả 503, hai update-info-cart trả 200;
   tổng console counter là 7 errors, có một AutoComplete warning. Không có
   response body của POST 503 trong ảnh, nên không suy diễn bảy nguyên nhân.
2. Backend listener PID 22100 trên 3000 có các connection Established tới ::1:27017.
3. hello trên localhost/127.0.0.1/IPv6 loopback không có replica set; writable=true.
4. Transaction chỉ đọc findOne trên products với ObjectId fixture không tồn tại
   thất bại code 20, thông báo về replica set/mongos. Không có lệnh ghi trong probe.
5. Container mongodb: Config.Cmd=[mongod], publish 27017 trên 0.0.0.0 và IPv6,
   hello không có setName. Runtime không tương ứng với command --replSet và
   binding loopback trong docker-compose.yaml.
6. getCmdLineOpts từ localhost không cần credentials và authorizationEnabled=false.
7. Controller/service mock với MongoDB code 20 trả đúng 503 và message
   Checkout requires MongoDB replica set transactions cho cả COD và VNPAY.
8. VNPay config từ server/.env và audit process hợp lệ; các tên biến bắt buộc
   đều có giá trị. Không in giá trị secret. Điều này không chứng minh env của
   backend process đang chạy hoặc merchant/IPN đã được cấu hình chính xác.

## Các phát hiện

### [MỨC ĐỘ: High] MongoDB standalone chặn cả COD và VNPay

- **Vị trí:** server/src/services/vnpay.service.js:75, server/src/services/vnpay.service.js:77,
  server/src/services/vnpay.service.js:171, server/src/controllers/payments.controller.js:68;
  docker-compose.yaml:5, run-dev.ps1:18.
- **Mô tả:** cả hai phương thức checkout cần transaction. MongoDB backend đang
  dùng là standalone; runtime container không áp dụng cấu hình replica set trong
  Compose. run-dev.ps1 cũng có fallback standalone, dù không có bằng chứng script
  này đã khởi động instance 27017 hiện tại.
- **Cách tái hiện:** read-only transaction probe trên instance đang dùng trả code
  20; mock controller trả 503 cho hai method. update-info-cart không dùng transaction,
  giải thích vì sao request trước đó vẫn trả 200.
- **Tác động:** không thể tạo đơn COD hoặc tạo giao dịch VNPay hợp lệ.
- **Đề xuất sửa:** kiểm kê runtime/container/volume và DB mà backend thực sự dùng;
  vận hành replica set trên dataset đúng, kiểm tra primary/advertised host và
  CONNECT_DB phù hợp với backend chạy host hay Docker. Giữ dữ liệu/volume, không
  khởi tạo nhầm DB mới, không bỏ transaction hoặc fallback ghi không nguyên tử.
- **Độ chắc chắn:** Chắc chắn về topology và lỗi transaction. Response body từng
  POST trong browser chưa được đọc; VNPay có thể còn lỗi config khác sau khi sửa DB.

### [MỨC ĐỘ: High] MongoDB runtime mở mọi interface và chưa bật authorization

- **Vị trí:** docker-compose.yaml:12 (binding dự kiến loopback), server/src/config/connectDB.js:6;
  bằng chứng runtime docker ps/inspect và getCmdLineOpts ở phần trên.
- **Mô tả:** container đang publish 27017 trên mọi interface, khác file Compose;
  instance nhận command đọc admin không cần credentials và không bật authorization.
- **Cách tái hiện:** docker ps/inspect xác nhận binding; MongoClient localhost gửi
  getCmdLineOpts chỉ đọc thành công. Không thực hiện scan mạng hoặc thao tác ghi.
- **Tác động:** máy khác có đường mạng qua firewall tới cổng này có thể truy cập
  MongoDB không xác thực, ảnh hưởng đơn hàng, dữ liệu người dùng và tồn kho.
- **Đề xuất sửa:** đối chiếu container với nguồn quản lý thật; giới hạn publish
  loopback/internal network và thiết kế authorization với credentials server-side.
  Không đổi volume hoặc dựng lại stack khi chưa kiểm kê nơi chứa dữ liệu.
- **Độ chắc chắn:** Chắc chắn về binding và authorization; khả năng truy cập từ
  Internet/LAN còn cần kiểm tra firewall/routing, không khẳng định đã bị xâm nhập.

### [MỨC ĐỘ: Medium] Frontend retry bị chặn trước nhánh idempotency của checkout

- **Vị trí:** client/src/Pages/CheckOut/CheckOut.jsx:93,
  server/src/controllers/cartUser.controller.js:239,
  server/src/services/vnpay.service.js:172, server/src/services/vnpay.service.js:190.
- **Mô tả:** checkout thành công xóa cart; nếu response bị mất, frontend vẫn giữ
  cartId và bắt retry phải update-info-cart trước. Cart đã bị xóa khiến update thất
  bại và không gọi lại create-payment để lấy đơn/payment URL đã có.
- **Cách tái hiện:** giả lập server đã commit đơn nhưng client nhận lỗi mạng;
  submit lại với cartId cũ. Mock updateInfoCart khi findOne=null trả Giỏ hàng không
  tồn tại. Luồng await trong frontend chặn request kế tiếp.
- **Tác động:** người dùng không khôi phục được giao dịch từ màn checkout dù
  backend có nhánh idempotency; dễ hiểu nhầm chưa đặt hàng.
- **Đề xuất sửa:** xác định chiến lược retry với cartId/checkout key ổn định;
  cho phép lấy lại kết quả checkout hiện hữu trước bước cập nhật cart, hoặc thêm
  luồng recovery trả orderId dưới kiểm tra ownership. Không bypass mọi lỗi cart.
- **Độ chắc chắn:** Chắc chắn với điều kiện response bị mất sau commit; không
  phải nguyên nhân 503 hiện tại. Cần thêm test end-to-end cho network ambiguity.

### [MỨC ĐỘ: Medium] Callback attempt cũ đưa đơn paid về refund_required

- **Vị trí:** server/src/services/vnpay.service.js:226,
  server/src/services/vnpay.service.js:233, server/src/services/vnpay.service.js:288.
- **Mô tả:** khi attempt mới đã paid, IPN success cho attempt cũ khác transactionRef
  vẫn gán paymentStatus của cả order thành refund_required. Nhánh đổi trạng thái
  chặn fulfillment của order dù attempt mới đã thanh toán.
- **Cách tái hiện:** mock order confirmed/paid với new-ref; gửi IPN được ký bằng
  fixture key cho old-ref. Kết quả RspCode=00, order paid -> refund_required,
  old attempt refund_required; không dùng key thật và không gửi request VNPay.
- **Tác động:** có thể giữ lại đơn đã trả tiền vì thanh toán trùng ở attempt cũ.
- **Đề xuất sửa:** chốt policy trước: giữ order paid và đưa riêng attempt cũ vào
  đối soát, hay cố ý giữ cả order để điều tra. Bổ sung trạng thái/audit record nếu
  cần; không tự hoàn tiền, không tự mở lại đơn đã hủy/đã hết hạn.
- **Độ chắc chắn:** Cần xác minh về policy nghiệp vụ. Chuyển trạng thái và tác
  động chặn fulfillment đã được xác minh bằng code/mock; chưa gọi đó là sai policy.

### [MỨC ĐỘ: Medium] Request gợi ý địa chỉ thiếu bắt lỗi và cleanup

- **Vị trí:** client/src/Pages/CheckOut/CheckOut.jsx:61,
  client/src/Pages/CheckOut/CheckOut.jsx:69, client/src/Pages/CheckOut/CheckOut.jsx:181.
- **Mô tả:** timer gọi axios tới provider địa chỉ không có catch, không hủy khi
  unmount/input thay đổi, không kiểm tra predictions là array trước set state.
- **Cách tái hiện:** gõ địa chỉ trong lúc provider lỗi mạng/429/5xx hoặc trả payload
  thiếu predictions; callback có thể reject không được xử lý hoặc render map lỗi.
- **Tác động:** thêm lỗi console, stale suggestions hoặc ảnh hưởng form checkout.
- **Đề xuất sửa:** catch và fallback suggestions=[], validate array; cleanup timer/
  request, bỏ response cũ. Giữ nhập địa chỉ thủ công khi provider không khả dụng.
- **Độ chắc chắn:** Chắc chắn về thiếu xử lý trong code; lỗi provider thực tế chưa
  được kích hoạt trong browser của người dùng. Không liên quan HTTP 503 checkout.

## Warning đã quan sát, không phải root cause thanh toán

| Rule/nhãn | File:dòng | Đề xuất |
| --- | --- | --- |
| ANTD_AUTOCOMPLETE_CUSTOM_INPUT_SIZE | client/src/Pages/CheckOut/CheckOut.jsx:187 | Bỏ size ở AutoComplete; giữ size trên Input con |
| MONGOOSE_RESERVED_SCHEMA_PATH | server/src/models/products.model.js:10 | Đánh giá rename collection/migration; không chỉ tắt warning |
| VITE_CHUNK_SIZE_LIMIT | client/vite.config.js:23 | Phân tích bundle rồi lazy-load/code split; không nâng ngưỡng để che warning |

Ưu tiên hai lỗi High trước các warning UI/build. Các nhãn audit tự đặt không phải
rule ESLint. Không phát hiện lỗi ESLint trong kiểm tra này.

## Bảng trước/sau

Không sửa code nên không có cải thiện được tuyên bố. Trước là baseline đã đo của
worktree hiện có; sau là trạng thái tại điểm dừng với các lệnh chạy lại ở lượt này.
Không cộng console counter với lint/build: console có thể đếm lặp cùng request.

| Phạm vi | Trước error / warning | Sau error / warning |
| --- | --- | --- |
| client lint | 0 / 0 | 0 / 0 |
| client build | 0 / 1 | 0 / 1 |
| server tests | 0 failed / 7 warning occurrences | 0 failed / 7 warning occurrences |
| Tổng ba lệnh trên | 0 / 8 | 0 / 8 |
| Browser console trong ảnh | 7 / 1 | CHƯA KIỂM CHỨNG lại browser |
| Network create-payment trong ảnh | 2 response 503 | CHƯA KIỂM CHỨNG lại checkout browser |

| Rule/nhãn | Trước | Sau | Phân loại |
| --- | --- | --- | --- |
| MONGODB_REPLICA_SET_REQUIRED | 1 root cause ảnh hưởng COD/VNPAY | 1 | High, chắc chắn |
| MONGODB_RUNTIME_PUBLIC_NO_AUTH | 1 | 1 | High, cấu hình chắc chắn; reachability cần xác minh |
| CHECKOUT_RETRY_RECOVERY | 1 | 1 | Medium, chắc chắn có điều kiện |
| VNPAY_MULTI_ATTEMPT_RECONCILIATION | 1 | 1 | Medium, cần chốt policy |
| ADDRESS_REQUEST_HANDLING | 1 | 1 | Medium, chắc chắn thiếu handling |
| ANTD_AUTOCOMPLETE_CUSTOM_INPUT_SIZE | 1 warning trong ảnh | Chưa đo browser; code giữ nguyên | Runtime warning |
| MONGOOSE_RESERVED_SCHEMA_PATH | 7 occurrences, 1 loại | 7 occurrences, 1 loại | Test warning |
| VITE_CHUNK_SIZE_LIMIT | 1 | 1 | Build warning |
| ESLint từng rule | 0 | 0 | Không có vi phạm |

## Kết quả kiểm tra

- npm run lint (client): PASS, 0 error/0 warning.
- npm run build (client): PASS, 6642 modules, khoảng 45.64 giây; một chunk-size warning.
- node --test test (client): PASS, 8 tests.
- npm test (server): PASS, 19 tests; integration MongoDB replica set SKIP vì
  MONGODB_TEST_URI unset; 7 lần warning cùng loại Mongoose collection.
- Mock COD/VNPAY 201 và code 20 -> 503: PASS, theo test hiện có và probe riêng.
- Signature/amount tamper validation, local signing và Return redirect: test PASS.
- Read-only transaction trên Mongo đang chạy: FAIL code 20, đúng nguyên nhân hạ tầng.
- Probe paid/new attempt + success/old attempt: xác nhận paid -> refund_required.
- Thực tế COD 201, VNPay redirect gateway/merchant IPN, replay concurrency/oversell
  trên replica set dùng cho ứng dụng, và browser login/checkout: CHƯA KIỂM CHỨNG.

Không chạy integration trên dữ liệu thật, không đổi sang container checkout-test
để làm backend xanh: container test không chứng minh dataset ứng dụng đã được sửa.

## Commit và thay đổi

Không tạo commit trong lượt audit; không sửa file application/config/test.
Chỉ tạo docs/checkout-cod-vnpay-audit.md. Các commit từ lượt sửa ngrok trước đó
không phải fix cho lỗi checkout và không được tính là commit của lượt này.

## CẦN TÔI QUYẾT ĐỊNH

| File:dòng | Rule | Vì sao chưa sửa | Phương án đề xuất |
| --- | --- | --- | --- |
| server/src/services/vnpay.service.js:77; docker-compose.yaml:5; run-dev.ps1:18 | MONGODB_REPLICA_SET_REQUIRED | Cần chốt topology/runtime và volume dữ liệu; không được tự đổi DB/config hoặc bỏ transaction | Vận hành replica set đúng dataset, kiểm tra primary/host quảng bá và CONNECT_DB; giữ volume, sau đó test COD/VNPAY sandbox |
| docker-compose.yaml:12; server/src/config/connectDB.js:6 | MONGODB_RUNTIME_PUBLIC_NO_AUTH | Binding runtime khác file, sửa sẽ tác động container/network/credentials | Kiểm kê container, hạn chế expose loopback/internal và thiết kế authorization |
| client/src/Pages/CheckOut/CheckOut.jsx:93; server/src/services/vnpay.service.js:172 | CHECKOUT_RETRY_RECOVERY | Cần chọn UX recovery và giao kèo API; chỉ được báo cáo ở lượt này | Retry theo checkout key hoặc endpoint recovery có ownership; test response lost |
| server/src/services/vnpay.service.js:233 | VNPAY_MULTI_ATTEMPT_RECONCILIATION | Cần chốt policy đối soát tiền trùng; không tự thay trạng thái tài chính | Giữ paid của order và flag attempt cũ, hoặc xác nhận cố ý giữ fulfillment |
| client/src/Pages/CheckOut/CheckOut.jsx:61 | ADDRESS_REQUEST_HANDLING | Sửa thay hành vi gợi ý địa chỉ; lượt này chỉ báo cáo | Catch/fallback, cleanup và chống stale response; cho nhập tay |
| client/src/Pages/CheckOut/CheckOut.jsx:187 | ANTD_AUTOCOMPLETE_CUSTOM_INPUT_SIZE | Warning UI; ưu tiên lỗi High và chưa có yêu cầu sửa | Bỏ size outer, giữ Input size |
| server/src/models/products.model.js:10 | MONGOOSE_RESERVED_SCHEMA_PATH | Rename cần migration/đồng bộ API; tắt warning không sửa nguyên nhân | Chốt migration field hoặc chấp nhận rủi ro có tài liệu |
| client/vite.config.js:23 | VITE_CHUNK_SIZE_LIMIT | Code splitting ảnh hưởng cách tải module, ngoài root cause 503 | Phân tích bundle và tách route nặng trong task riêng |
| server/src/routes/payments.route.js:10; server/src/services/vnpay.service.js:168 | VNPAY_PUBLIC_IPN_CONFIGURATION | Không truy cập merchant config và không phát sinh giao dịch thật | Kiểm tra provider đã đăng ký IPN /api/vnpay-ipn trên public origin, tunnel hoạt động và backend logs đã nhận IPN sau khi sửa DB |

## Tổng hợp mức độ

| Mức độ | Số lượng |
| --- | --- |
| Critical | 0 |
| High | 2 |
| Medium | 3 (bao gồm 1 nghi vấn cần chốt policy) |
| Low | 0 |

Ba warning quan sát được trình bày riêng, không trộn vào số lỗi nghiệp vụ.
Điểm dừng: đã kiểm chứng và chạy lại lint/build/test; chưa sửa, chưa xác nhận
luồng thanh toán thực tế hoạt động.
