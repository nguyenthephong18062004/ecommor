# Sửa đồng bộ trạng thái VNPay - 13/10/2026

## Phạm vi

Đã đọc AGENTS.md, giữ các thay đổi có sẵn và không sửa .env, không cài dependency, không đổi cấu hình merchant. Cấu trúc thực tế đã kiểm tra: backend `server/src/{routes,controllers,services,models,auth,config}`, frontend `client/src/{Pages/PaymentSuccess,config}`, `server/test`, `client/test`.

Branch: `fix/vnpay-payment-reconciliation`.

### [MỨC ĐỘ: High] Thiếu đối soát khi IPN thất lạc - đã sửa cơ chế
- **Vị trí:** `server/src/services/vnpay.service.js:262`, `server/src/controllers/payments.controller.js:175`, `client/src/Pages/PaymentSuccess/PaymentSuccess.jsx:47`.
- **Mô tả:** Trước sửa, Return chỉ redirect và trang kết quả chỉ đọc DB. Khi provider đã thành công nhưng không nhận IPN, trạng thái thanh toán vẫn pending rồi expired; không có đường cập nhật qua QUERYDR trong ứng dụng.
- **Cách tái hiện:** Test trên replica set riêng: tạo checkout, không gọi IPN, provider trả QUERYDR thành công. Sau sửa, POST đối soát của chủ đơn trả paid và GET chi tiết cũng trả paid. Test route registry thực tế từng fail 404 trước khi bổ sung mount ở `server/src/routes/index.js:74`, sau đó pass.
- **Tác động:** Người dùng thấy chờ xác nhận dù provider đã thanh toán; có nguy cơ thử thanh toán lại khi trạng thái chưa đồng bộ.
- **Đề xuất sửa:** Đã thêm POST `/api/reconcile-payment-vnpay`, xác thực user/chủ đơn; QUERYDR server-side có timeout và kiểm tra HMAC, merchant, reference, số tiền, command và transaction type. Dùng chung transaction xử lý kết quả với IPN, chống ghi nhận lặp và không trừ kho lần nữa. Return vẫn chỉ đọc/redirect, không lấy query browser làm nguồn cập nhật paid.
- **Độ chắc chắn:** Chắc chắn về code và test HTTP/DB. Chưa xác minh OTP/UI end-to-end mới vì không có browser kết nối.

### [MỨC ĐỘ: High] Các đơn đã hoàn kho cần quyết định đối soát - chưa sửa dữ liệu hàng loạt
- **Vị trí:** `server/src/services/vnpay.service.js:239`, `server/src/services/vnpay.service.js:245`, `server/src/services/vnpay.service.js:314`.
- **Mô tả:** Truy vấn read-only thực tế hôm nay xác minh 3 attempt gần nhất: provider responseCode=00, transactionStatus=00, HMAC hợp lệ và dữ liệu khớp; local đều expired, inventoryReserved=false, chưa có receivedAt. Hai attempt tạo ngày 13/10 và một attempt ngày 08/10. Không in reference, chữ ký, key hoặc URL thanh toán.
- **Cách tái hiện:** `node server/scripts/check-vnpay-status.cjs` trả verified=true, paid=true, needsReconciliation=true cho cả ba; exit 1 là báo sai lệch nghiệp vụ, không phải lỗi lint/test. Integration test xác minh expired + provider paid dẫn tới refund_required và không mở lại kho.
- **Tác động:** Đổi thẳng sang paid sẽ làm sai reservation/fulfillment; tạo thanh toán mới có nguy cơ thanh toán lặp. Đây là Sandbox, không kết luận về khoản tiền thật.
- **Đề xuất sửa:** Giữ chính sách đang có: nếu chủ đơn mở trang và đối soát xác nhận paid sau khi đã hoàn kho, ghi refund_required. Chốt hoàn tiền hay tiếp tục đơn với re-reservation nguyên tử trước khi phục hồi fulfillment. Không tự gửi refund hoặc sửa batch dữ liệu cũ trong lượt này.
- **Độ chắc chắn:** Chắc chắn về ba sai lệch read-only hôm nay; cần quyết định nghiệp vụ để xử lý đơn cũ.

## Thay đổi tối thiểu

- Tách QUERYDR verifier từ CLI thành `server/src/services/vnpay-query.service.js` để CLI và API dùng chung kiểm tra chữ ký, không nhân đôi thuật toán. CLI vẫn giới hạn Sandbox và chỉ đọc.
- Thêm `reconciledAt`, `nextQueryAt`, `confirmationSource` trong attempt. QUERYDR không giả mạo receivedAt của IPN.
- Dùng lease DB theo attempt để giới hạn QUERYDR tối đa một lần trong 5 phút, xuyên qua reload/tab/process. Không giữ MongoDB transaction khi chờ HTTP.
- Chỉ settle khi response query hợp lệ và transaction status là 00 (thành công) hoặc 02 (lỗi). Pending, response 94, timeout, chữ ký/dữ liệu sai không được đánh dấu paid.
- Chủ đơn được kiểm tra trước khi gọi provider. IPN/QUERYDR đồng thời dùng chung idempotency trong transaction.
- Frontend gọi API đối soát trên trang kết quả và dùng trạng thái backend trả về. Poll DB mỗi 3 giây khi pending, tối đa khoảng 10 phút để vượt được cửa sổ QUERYDR. Không gọi provider mỗi lần poll.
- Không đổi trạng thái xử lý đơn thành confirmed: paymentStatus=paid và status=pending là hợp lệ, vì cửa hàng chưa xác nhận xử lý đơn.
- Không đổi retry/expiry/refund policy có sẵn và không cấu hình IPN merchant portal.

## Xác minh

| Kiểm tra | Kết quả thật |
| --- | --- |
| Client `npm run lint` | PASS, exit 0, 0 error/0 warning |
| Client `npm run build` | PASS, exit 0; 1 cảnh báo chunk >500 kB; JS chính 2,956.82 kB |
| Client `node --test test` | PASS 8/8, fail 0, skip 0 |
| Server `npm test` với MongoDB test riêng cổng 27019 | PASS 49/49, fail 0, skip 0, gồm 2 integration suites |
| Reconciliation integration riêng | PASS 8/8; fixture chỉ ở DB test ngẫu nhiên, không dùng DB ứng dụng |
| HTTP qua registry thực tế + RSA auth | Chủ đơn POST 200 paid, GET chi tiết paid; user khác 404 và không gọi provider; thiếu login bị chặn |
| Server thật cổng 3000 và proxy 5173 | Endpoint mới tồn tại, request không login trả 401 JSON |
| Local/public Return và IPN empty-query | 4 probe PASS, trả 400/97 đúng kỳ vọng khi thiếu chữ ký |
| QUERYDR thật với DB ứng dụng, chỉ đọc | 3 kết quả paid đã verified, local expired; exit 1 báo sai lệch đúng kỳ vọng |
| Browser/OTP mới | Chưa xác minh; browser discovery không có browser kết nối |

Các test mới bao gồm: thiếu IPN, owner/ID validation, cooldown và request đồng thời, bad signature/query 94/timeout không settle, expired không mở lại kho, IPN đến trong query, real route registry/auth/details, failed payment release stock đúng một lần. Verifier unit tests cũ tiếp tục pass sau khi dùng service chung. Toàn bộ test COD, oversell, retry, expiry, IPN replay, Return read-only, timezone, amount và auth trước đó đều pass.

## Bảng trước/sau

Baseline đầy đủ trước sửa lấy từ lần xác minh trước trong `docs/vnpay-callback-fix-verification.md` (41 server tests). Đầu lượt này lệnh `npm test` không có DB test chỉ chạy 30 tests và skip integration suite, nên không dùng lần đó để tuyên bố regression đầy đủ. Sau sửa đã chạy lại với DB replica set riêng, không skip.

| Rule/diagnostic | Error trước | Warning trước | Error sau | Warning sau |
| --- | ---: | ---: | ---: | ---: |
| ESLint client, tất cả rule | 0 | 0 | 0 | 0 |
| Vite large chunk | 0 | 1 | 0 | 1 |
| Mongoose reserved schema path collection | 0 | 7 | 0 | 8 |
| **Tổng lint/build/tests** | **0** | **8** | **0** | **9** |

Vite/Mongoose là diagnostic, không phải ESLint rule. Thêm một process test import product schema nên reserved-path warning xuất hiện thêm một lần, vẫn cùng một loại cảnh báo; không suppress hoặc migration field ngoài phạm vi. Server package.json không có script lint/build; không bịa hai lệnh đó.

Tổng trên không cộng diagnostic sai lệch provider/local hoặc browser console. Không tuyên bố browser error/warning về 0; chưa đo lại browser. Rule nghiệp vụ `PAYMENT-MISSING-IPN-FALLBACK`: trước chưa có recovery, sau test recovery PASS; không đồng nghĩa đã sửa batch các đơn expired cũ.

## Commit

- `aec1112 fix(payments): reconcile verified VNPay results when IPN is missing`.
- File chính: `server/src/services/{vnpay.service.js,vnpay-query.service.js}`, `server/src/models/paymentAttempt.model.js`, `server/src/controllers/payments.controller.js`, `server/src/routes/{index.js,payments.route.js}`, `client/src/Pages/PaymentSuccess/PaymentSuccess.jsx`, `client/src/config/request.jsx`, `server/scripts/check-vnpay-status.cjs`, `server/test/vnpay-reconcile.test.cjs`.
- Chỉ stage hunk của lượt sửa này ở các file đã dirty; các thay đổi shipping, upload URL và dev Return redirect có sẵn vẫn giữ nguyên và không gom vào commit.
- Kết quả live/test là của working tree hiện tại; các thay đổi có sẵn không được revert. Báo cáo này chưa commit.

## CẦN TÔI QUYẾT ĐỊNH

| File:dòng | Rule | Vì sao chưa sửa | Phương án đề xuất |
| --- | --- | --- | --- |
| `server/src/services/vnpay.service.js:239` | PAYMENT-EXPIRED-PAID | Đơn đã hoàn kho; sửa thẳng paid có thể oversell/sai coupon | Chốt refund hoặc tiếp tục đơn với transaction re-reserve có kiểm tra stock/coupon; hiện đối soát ghi refund_required theo policy có sẵn |
| `server/src/routes/payments.route.js:10` | PAYMENT-IPN-REGISTRATION | Không có quyền merchant portal; endpoint reachable không chứng minh đăng ký/delivery đúng | Xác nhận IPN HTTPS và delivery log; tiếp tục dùng IPN làm đường chính, QUERYDR là fallback |
| `server/src/services/vnpay.service.js:296` | PAYMENT-RETRY-POLICY | Khi provider chưa verify được, thay retry cần chốt hành vi và quota | Không thanh toán lại đơn đã có bằng chứng provider paid; cân nhắc bắt buộc đối soát trước khi tạo attempt mới |
| `server/src/services/vnpay.service.js:245` | PAYMENT-STALE-SUCCESS | Success của attempt cũ có thể thay đổi trạng thái cấp order; đang giữ policy cũ | Chốt refund cấp attempt hay order, thêm test current paid + stale success trước đổi chính sách |
| `server/src/services/vnpay.service.js:314` | PAYMENT-BACKGROUND-RECONCILIATION | Fallback hiện kích hoạt từ trang kết quả, không phải job quét mọi order | Nếu cần phục hồi khi khách không quay lại, chốt worker/queue và quota provider trước khi thêm job |
| `server/src/models/products.model.js:10` | MONGOOSE-RESERVED-PATH | Đổi field cần migration/API compatibility | Xử lý riêng, không che warning |
| `client/vite.config.js:25` | VITE-LARGE-CHUNK | Code splitting ngoài root cause thanh toán | Tách route/admin/chart trong thay đổi riêng có regression tests |

## Tổng hợp mức độ

| Mức độ | Số lượng |
| --- | ---: |
| Critical | 0 |
| High | 2 (1 cơ chế đã sửa; 1 nhóm dữ liệu cần quyết định) |
| Medium | 0 |
| Low | 0 |

## Điểm dừng

Backend/frontend dev đang chạy tại `http://127.0.0.1:5173`, backend được nodemon reload và endpoint mới đã kiểm tra. Không tạo giao dịch mới hoặc gửi callback giả vào DB ứng dụng. Các giao dịch read-only đã đối soát trong lượt này chưa được sửa batch. Khi chủ đơn mở trang kết quả, API mới có thể ghi kết quả QUERYDR đã verify theo policy hiện tại.

Đã xác minh fix qua test HTTP/DB và provider QUERYDR thật ở chế độ chỉ đọc; **chưa khẳng định phiên OTP/UI end-to-end mới đã thành công**.

Nguồn: [VNPay QUERYDR và checksum](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html), [tài liệu trạng thái giao dịch VNPay](https://sandbox.vnpayment.vn/apis/files/VNPAY%20Payment%20Gateway_Techspec%202.1.0-VN.pdf). Theo tài liệu, query responseCode=00 chỉ chứng minh truy vấn thành công; transactionStatus phải được kiểm tra riêng.
