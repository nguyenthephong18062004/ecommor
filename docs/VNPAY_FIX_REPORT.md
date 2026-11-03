# Kết quả sửa luồng VNPay

Branch: `fix/vnpay-payment-safety`. Giữ các thay đổi có sẵn của người dùng.
Không chỉnh `.env` thật, không commit và không in giá trị secret.

## Luồng sau khi sửa

| Chặng | Vị trí | Hành vi |
| --- | --- | --- |
| Tạo đơn, tính tiền | `server/src/services/vnpay.service.js:165` | Kiểm tra chủ giỏ hàng; snapshot giá DB; không tin tổng tiền client |
| Giữ kho/coupon | `server/src/services/vnpay.service.js:114` | Conditional decrement trong cùng transaction với đơn, attempt và xóa giỏ |
| Tạo URL | `server/src/services/vnpay.service.js:142` | UUID mới; VND nguyên nhân 100 bởi thư viện; GMT+7; IP từ proxy tin cậy |
| Chuyển hướng | `client/src/Pages/CheckOut/CheckOut.jsx:77` | Khóa submit và chuyển hướng cùng tab |
| Return | `server/src/routes/payments.route.js:9` | `/api/vnpay-return`; verify rồi redirect, không cập nhật thanh toán |
| IPN | `server/src/services/vnpay.service.js:211` | `/api/vnpay-ipn`; verify trước truy vấn; đối chiếu ref, amount, merchant và hai mã trạng thái |
| Kết quả | `client/src/Pages/PaymentSuccess/PaymentSuccess.jsx:61` | Hiển thị trạng thái DB; polling có cleanup; nút retry |
| Retry | `server/src/services/vnpay.service.js:250` | Xác thực chủ đơn; kiểm tra kho/coupon; mã mới, giữ lịch sử attempts |
| Hết hạn | `server/src/services/vnpay.service.js:268` | Worker 30 giây; giải phóng giữ chỗ một lần; giao dịch đến muộn cần đối soát |
| Hủy/giao hàng | `server/src/services/vnpay.service.js:281` | Chuyển trạng thái hợp lệ trong transaction; không hoàn kho hay cộng soldCount hai lần |

## Đối chiếu báo cáo trước

| Lỗi | Kết quả |
| --- | --- |
| Thiếu IPN, Return thay đổi dữ liệu | Đã bổ sung IPN; Return chỉ đọc |
| Return URL sai và thiếu cấu hình | Đã sửa route, validate và Docker env_file; cấu hình merchant còn thiếu, xem bên dưới |
| Không có đơn pending trước chuyển hướng | Đơn và attempt được lưu cùng transaction trước khi trả URL |
| Dùng tổng tiền giỏ cũ | Tính lại từ DB; snapshot sản phẩm, giá, coupon, phí ship 0 theo chính sách hiện tại |
| Coupon không kiểm tra, có thể âm | Kiểm tra thời hạn/minPrice/số lượng và giảm có điều kiện |
| Hủy/giao hàng không idempotent | Transaction và state transition; chặn hủy đơn online đã trả tiền để tránh bỏ qua refund |
| Thiếu dữ liệu đối soát | `paymentAttempts` lưu transactionNo, amount, responseCode, transactionStatus, payDate, receivedAt |
| IP hardcoded/proxy | Dùng req.ip; Nginx ghi đè forwarding header; backend trust proxy có cấu hình |
| Thiếu xử lý fail/timeout | IPN fail hoàn giữ chỗ; worker expiry; late success ghi refund_required |
| Giỏ/thông tin thay đổi trước callback | Validate và snapshot trước khi tạo URL; callback không đọc giỏ hiện tại |

## Xác minh

16/16 test pass, không skip: 5 unit test và 11 integration test trên MongoDB 7
replica set tạm, database `vnpay_test_*` riêng. Không sử dụng database `watch`.
Container test đã được dừng sau khi kiểm tra.

| Kịch bản yêu cầu | Kết quả tự động | Sandbox NCB thực tế |
| --- | --- | --- |
| Thành công | Đạt: Return read-only, IPN đánh dấu paid, snapshot và đối soát đúng | Cần xác minh |
| Khách hủy | Đạt: IPN mã 24 giải phóng kho/coupon đúng một lần | Cần xác minh |
| Sai OTP/hết giờ | Đạt: mã 13/11 và expiry; retry mã mới | Cần xác minh |
| Sửa amount | Đạt: sai hash trả 97; ký hợp lệ nhưng amount sai trả 04 | Cần xác minh |
| Sửa/xóa hash | Đạt: từ chối trước truy vấn/xử lý giao dịch | Cần xác minh |
| Replay | Đạt: lần đầu 00, các lần sau 02 | Cần xác minh |
| Callback đồng thời | Đạt: một 00, một 02; không lặp side effect | Cần xác minh |
| Đơn paid/cancelled | Đạt: chặn retry; late success không mở lại đơn, ghi cần hoàn tiền | Cần xác minh |

Các test bổ sung kiểm tra oversell đơn vị cuối, hai lần checkout đồng thời,
hai lần cancel/delivered đồng thời, rollback khi coupon/quantity sai,
chủ sở hữu retry, sản phẩm đã xóa và late callback sau một lần retry.

Lint các file frontend thay đổi: pass. Build client: pass, còn cảnh báo bundle lớn.
`docker compose config --quiet`: pass. Syntax checks và `git diff --check`: pass.
Lint toàn client: chưa pass do 20 errors và 7 warnings ở file ngoài phần sửa thanh toán.

## Cấu hình còn cần hoàn tất

### [MỨC ĐỘ: High] Chưa có cấu hình merchant VNPay trong môi trường hiện tại

- **Vị trí:** `server/src/services/vnpay.service.js:16`; `docker-compose.yaml:41` (env_file nạp `server/.env`).
- **Mô tả:** Kiểm tra chỉ sự hiện diện xác nhận thiếu `VNPAY_TMN_CODE`, `VNPAY_SECRET_KEY`, `VNPAY_URL`, `VNPAY_RETURN_URL` trong `server/.env`.
- **Cách tái hiện:** Gọi create-payment với giỏ hợp lệ và phương thức VNPAY; server trả 503 và tên biến thiếu.
- **Tác động:** Chưa tạo được giao dịch Sandbox thật; chưa thể kiểm tra thẻ NCB hoặc VNPay gọi IPN public.
- **Đề xuất sửa:** Điền riêng thông tin merchant vào môi trường triển khai; dùng hướng dẫn `docs/VNPAY.md`; đăng ký IPN public `/api/vnpay-ipn` bên VNPay. Không ghi secret vào repository.
- **Độ chắc chắn:** Chắc chắn.

| Mức độ còn tồn tại | Số lượng |
| --- | --- |
| Critical | 0 |
| High | 1 |
| Medium | 0 |
| Low | 0 |

Giao dịch `refund_required` cần operator đối soát và hoàn tiền qua VNPay; code chưa
tự gọi refund API. Các đơn VNPay cũ chưa có attempt history cần đối soát trước khi
gán paymentStatus. Đây là giới hạn vận hành được ghi rõ, không tự suy đoán đã trả tiền.
Sandbox NCB chưa được chạy nên các kết quả trên không chứng nhận kết nối merchant thật.
