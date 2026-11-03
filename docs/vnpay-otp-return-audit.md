# Audit VNPay sau OTP - 08/10/2026

## Phạm vi và điểm dừng

Đọc AGENTS.md, rà soát code và cấu trúc thực tế, kiểm tra HTTP không có query thanh toán, đọc DB với projection giới hạn. Không sửa application code, .env hay cấu hình merchant; không khởi động tunnel, tạo giao dịch mới, nhập OTP, replay callback thật hoặc tự đánh dấu đơn paid. Integration tests chạy trên MongoDB test riêng ở cổng 27019, không dùng DB ứng dụng.

Cấu trúc liên quan đã kiểm tra:
- Backend: `server/src/routes/payments.route.js`, `controllers/payments.controller.js`, `services/vnpay.service.js`, `models/payments.model.js`, `models/paymentAttempt.model.js`, `models/products.model.js`, `auth/checkAuth.js`, `config/connectDB.js`, `server.js`.
- Frontend: `client/src/Pages/CheckOut/CheckOut.jsx`, `Pages/PaymentSuccess/PaymentSuccess.jsx`, `config/{apiBaseUrl.js,axiosClient.jsx,request.jsx,runtimeUrls.js}`, `client/vite.config.js`, `client/test/`.

## Xác minh thực tế

| Kiểm tra không có signed query | Kết quả |
| --- | --- |
| Backend `127.0.0.1:3000/api/vnpay-return` | HTTP 400, từ chối thiếu chữ ký đúng kỳ vọng |
| Vite `127.0.0.1:5173/api/vnpay-return` | HTTP 400, proxy tới backend hoạt động |
| Public domain trong ảnh, `/api/vnpay-return` | HTTP 404, header `ngrok-error-code: ERR_NGROK_3200`, body endpoint offline |
| ngrok agent API `127.0.0.1:4040/api/tunnels` | ECONNREFUSED |
| Process ngrok trên máy hiện tại | Không tìm thấy; không loại trừ agent trên máy khác |

`VNPAY_RETURN_URL` hiện trỏ đúng public domain trong ảnh và path `/api/vnpay-return`. Ba payment URL được lưu cũng mang domain/path này; reference trong URL khớp attempt DB. Không in URL đã ký, chữ ký hoặc merchant credentials.

DB read-only: ba đơn VNPay gần nhất tạo lúc 11:42:52, 11:47:54, 11:53:55 ngày 08/10/2026 (GMT+7). Lần đọc đầu có 2 pending, 1 expired; lần đọc tiếp có 1 pending, 2 expired. Cả ba attempt không có `receivedAt`, `responseCode`, `transactionStatus` được ghi nhận. Đơn expired đã giải phóng reservation. Đây là trạng thái merchant, không chứng minh provider đã hoặc chưa trừ tiền. Không ghép chắc chắn các ảnh với từng đơn vì ảnh không cung cấp đủ reference đầy đủ để đối chiếu an toàn.

### [MỨC ĐỘ: High] Return URL không tới được hệ thống vì ngrok offline
- **Vị trí:** `server/src/services/vnpay.service.js:23`, `server/src/services/vnpay.service.js:151`; route tồn tại ở `server/src/routes/payments.route.js:9`.
- **Mô tả:** Payment URL nhúng public endpoint hiện trả ERR_NGROK_3200. HTTP 404 này được sinh ở ngrok, không phải do thiếu route Express. Đây là lỗi hạ tầng chắc chắn, không phải lỗi OTP.
- **Cách tái hiện:** GET public `/api/vnpay-return` không có query; nhận 404 và header ngrok-error-code. GET cùng path qua backend/Vite nhận 400 vì thiếu chữ ký.
- **Tác động:** Người dùng không quay về màn hình đơn sau thanh toán. Nếu IPN merchant dùng cùng endpoint offline thì IPN cũng không tới được; cấu hình IPN trên merchant portal chưa được xác minh.
- **Đề xuất sửa:** Giữ đúng tunnel/domain chạy tới Vite cổng 5173 suốt phiên thanh toán; kiểm tra Return và IPN từ Internet trước một giao dịch sandbox mới. Nếu đổi domain phải cập nhật cấu hình liên quan, restart dịch vụ và không dùng lại URL đã ký với domain cũ. Không thêm route trùng hay bỏ kiểm tra chữ ký.
- **Độ chắc chắn:** Chắc chắn về Return offline; Cần xác minh cấu hình và lịch sử giao IPN.

### [MỨC ĐỘ: High] Hết hạn cục bộ không có đối soát provider khi IPN bị mất
- **Vị trí:** `server/src/services/vnpay.service.js:274`, `server/src/services/vnpay.service.js:280`; worker `server/src/server.js:39`.
- **Mô tả:** Sau TTL 15 phút, worker giải phóng stock/coupon và đặt expired mà không truy vấn provider. Return chỉ đọc và redirect; không cập nhật paid. Hiện các attempt gần nhất chưa ghi nhận IPN.
- **Cách tái hiện:** Integration test hiện có về expiry và late success pass; DB read-only cũng thấy đơn chuyển expired. Trường hợp provider thực sự paid trong lúc IPN mất chưa được xác minh.
- **Tác động:** Có thể merchant hiển thị expired dù provider đã thu tiền; IPN thành công tới muộn dẫn đến refund_required thay vì tự mở lại đơn. Không đủ bằng chứng nói đã xảy ra mất tiền.
- **Đề xuất sửa:** Xác minh đăng ký IPN HTTPS public `/api/vnpay-ipn`, lịch sử delivery và kết quả giao dịch trên merchant portal/QUERYDR. Đề xuất quy trình reconciliation có xác thực, idempotency và audit trail; quyết định giữ reservation hay hoàn tiền khi late success. Không tự đánh dấu paid từ ảnh hoặc Return.
- **Độ chắc chắn:** Chắc chắn về thiếu đối soát trong worker; Cần xác minh kết quả tài chính của giao dịch trong ảnh.

### [MỨC ĐỘ: Medium] URL pending có thể được dùng lại khi provider đã xử lý
- **Vị trí:** `server/src/services/vnpay.service.js:179`, `server/src/services/vnpay.service.js:264`.
- **Mô tả:** Checkout/retry trả lại payment URL cũ nếu attempt còn hạn. Khi provider đã xử lý nhưng IPN chưa ghi nhận, trạng thái local vẫn pending. Ảnh VNPay báo đơn không tồn tại hoặc đã được xử lý; chưa đủ dữ liệu để khẳng định reuse là nguyên nhân của ảnh đó.
- **Cách tái hiện:** Code xác nhận trả cùng URL; để chứng minh lỗi provider cần lịch sử transaction/session, thời hạn URL và trạng thái merchant. Không mở lại URL thật trong lượt audit này.
- **Tác động:** Người dùng có thể tiếp tục gặp trang lỗi thay vì trạng thái thanh toán; tạo reference mới ngay khi pending chưa đối soát có nguy cơ thu tiền hai lần.
- **Đề xuất sửa:** Trước retry, hiển thị trạng thái chờ xác nhận và đối soát attempt cũ. Chỉ tạo reference mới khi xác định attempt trước failed/expired an toàn. Không coi thông báo Error.html là bằng chứng OTP sai.
- **Độ chắc chắn:** Cần xác minh liên hệ với ảnh; Chắc chắn về hành vi reuse trong code.

### [MỨC ĐỘ: High] Success của attempt cũ thay đổi trạng thái cấp đơn
- **Vị trí:** `server/src/services/vnpay.service.js:233`, `server/src/services/vnpay.service.js:239`.
- **Mô tả:** Success của attempt không còn current đặt order.paymentStatus thành refund_required, kể cả khi attempt mới đã paid. Khi attempt mới pending và stock đang reserve, code giải phóng reservation và hủy attempt mới. Đây là chính sách đang có, không mặc định là lỗi cần sửa ngay.
- **Cách tái hiện:** Test late success của attempt expired với attempt mới pending pass, xác nhận hành vi hiện tại. Nhánh attempt mới đã paid được xác định qua code; chưa có test riêng tái hiện nhánh này trong lượt audit.
- **Tác động:** Có thể chặn fulfillment của đơn đã có thanh toán hợp lệ, hoặc đòi hỏi refund thủ công. Chưa thấy dữ liệu read-only chứng minh tình huống này xảy ra ở ba đơn trên.
- **Đề xuất sửa:** Quyết định refund ở cấp attempt hay chặn toàn đơn. Đề xuất giữ thanh toán hợp lệ của current attempt và ghi khoản thu dư ở attempt cũ, bổ sung test race/replay trước khi đổi hành vi.
- **Độ chắc chắn:** Chắc chắn về nhánh code; Cần xác minh yêu cầu nghiệp vụ.

## Bảng trước/sau

Không sửa code ở lượt này. Baseline tự động là lần xác minh trước đã ghi trong `docs/checkout-fix-verification.md`; cột sau là lệnh thực sự chạy lại hôm nay. Warning tính theo số lần xuất hiện, không theo số rule độc lập.

| Phạm vi/rule | Error trước | Warning trước | Error sau | Warning sau |
| --- | ---: | ---: | ---: | ---: |
| ESLint client, tất cả rule | 0 | 0 | 0 | 0 |
| Vite large-chunk warning | 0 | 1 | 0 | 1 |
| Mongoose reserved schema pathname `collection` | 0 | 7 | 0 | 7 |
| **Tổng tự động lint/build/tests** | **0** | **8** | **0** | **8** |

Vite/Mongoose là diagnostic runtime/tooling, không phải tên ESLint rule. Server package.json không có script lint/build; không bịa lệnh hoặc đánh dấu server lint/build pass.

| Phạm vi runtime/ảnh, không cộng vào tổng tự động | Trước | Sau |
| --- | --- | --- |
| Callback error/ERR_NGROK_3200 | 1 HTTP 404 trong ảnh | 1 HTTP 404 trong public probe; vẫn chưa sửa |
| Preload-not-used | 8 warning trong ảnh | Chưa đo lại browser; không tuyên bố về 0 |
| VNPay Error.html | 1 thông báo trong ảnh khác | Chưa tái hiện giao dịch/OTP; chưa xác minh nguyên nhân |

Không cộng 404 và ERR_NGROK_3200 thành hai root cause, không gom các ảnh của các giao dịch khác nhau thành một tổng browser giả.

| Lệnh chạy lại | Kết quả |
| --- | --- |
| `client: npm run lint` | PASS, exit 0, 0 error / 0 warning |
| `client: npm run build` | PASS, exit 0, 1 warning; JS chính 2,956.42 kB minified |
| `client: node --test test` | PASS 8/8, fail 0, skip 0 |
| `server: npm test` với DB test riêng | PASS 32/32, fail 0, skip 0; 7 reserved-key warnings |

Tests xác minh signing, amount, timezone, transaction, IPN replay, expiry, reservation, owner và dev proxy; không chứng minh giao dịch ngân hàng thật sau OTP đã hoàn tất.

## Commit

Lượt audit này: **0 commit mới**, chỉ thêm báo cáo này; các thay đổi có sẵn được giữ nguyên.

Các commit đã tạo ở lượt xử lý trước, không phải sửa mới cho lỗi sau OTP:
- `60bbbc8 fix(dev): allow credentialed preflight for trusted origins` - `client/vite.config.js`, `client/test/vite-cors.test.mjs`.
- `c17e2de fix(client): share same-origin tunnel URLs across HTTP and sockets` - `client/src/config/{apiBaseUrl.js,axiosClient.jsx,request.jsx}`, `client/src/hooks/useFetch.jsx`, `client/src/store/Provider.jsx`, tests URL/tunnel.
- `7201d5e fix(ui): replace deprecated Card bodyStyle` - `client/src/Components/HomePage/Blog/Blog.jsx`, `client/src/Pages/Blogs/Blogs.jsx`, `client/src/Pages/DetailBlog/DetailBlog.jsx`.

## CẦN TÔI QUYẾT ĐỊNH

Rule bên dưới là mã audit mô tả hành vi, không phải ESLint rule.

| File:dòng | Rule | Vì sao chưa sửa | Phương án đề xuất |
| --- | --- | --- | --- |
| `server/src/services/vnpay.service.js:23` | PAYMENT-CALLBACK-AVAILABILITY | Cần quyết định domain/tunnel, không được sửa .env thật; lượt này chỉ báo cáo | Giữ domain hiện tại chạy tới 5173 hoặc chọn endpoint HTTPS ổn định; xác minh public Return trước giao dịch mới |
| `server/src/routes/payments.route.js:10` | PAYMENT-IPN-DELIVERY | Route có nhưng không truy cập được cấu hình merchant portal hay delivery history | Xác nhận IPN public `/api/vnpay-ipn`, lấy delivery status và kết quả provider; không gửi IPN giả vào DB thật |
| `server/src/services/vnpay.service.js:274` | PAYMENT-RECONCILIATION | Thay expiry/reservation là thay nghiệp vụ, cần xác thực trạng thái tiền | Chốt QUERYDR/reconciliation, timeout và refund policy; đối soát đơn hiện tại trước retry |
| `server/src/services/vnpay.service.js:264` | PAYMENT-RETRY-REUSE | Tạo reference mới khi attempt cũ chưa xác nhận có thể thu tiền hai lần | Chờ xác nhận/đối soát trước retry; điều tra URL/session đã dùng với merchant |
| `server/src/services/vnpay.service.js:239` | PAYMENT-STALE-SUCCESS-POLICY | Có nguy cơ đổi fulfillment/refund và hành vi test hiện tại | Chốt refund cấp attempt hay cấp order; thêm test current paid + stale success trước đổi code |
| `server/src/models/products.model.js:10` | MONGOOSE-RESERVED-PATH | Đổi tên field ảnh hưởng dữ liệu và API; suppress warning chỉ che diagnostic | Kiểm tra việc dùng field, lên migration có tương thích; chưa refactor trong audit thanh toán |
| `client/vite.config.js:25` | VITE-LARGE-CHUNK | Code splitting cần kiểm tra route/loading, không liên quan root cause OTP | Tách route/admin/chart sau ưu tiên thanh toán; không chỉ nâng warning limit |

## Tổng hợp mức độ

| Mức độ | Số lượng |
| --- | ---: |
| Critical | 0 |
| High | 3 |
| Medium | 1 |
| Low | 0 |

Bao gồm các rủi ro/chính sách đã ghi rõ độ chắc chắn; không diễn giải tất cả thành lỗi tài chính đã xảy ra.

## Nguồn chính thức

- [ngrok ERR_NGROK_3200](https://ngrok.com/docs/errors/err_ngrok_3200): endpoint offline; agent không chạy/crash hoặc sai endpoint là các nguyên nhân có thể.
- [VNPay FAQ](https://sandbox.vnpayment.vn/apis/docs/faqs/): Return để hiển thị, IPN cập nhật kết quả; hỗ trợ QUERYDR/REFUND.
- [VNPay bảng mã lỗi](https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/): OTP sai có response code 13, hết hạn 11. Ảnh không cung cấp các mã này đầy đủ, không đủ căn cứ quy lỗi cho OTP.

**Điểm dừng:** Root cause public Return offline đã xác minh; kết quả tiền tại VNPay và cấu hình IPN còn cần đối soát. Không tuyên bố luồng sau OTP đã sửa xong hoặc thanh toán thành công.
