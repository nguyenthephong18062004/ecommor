# Sử dụng Tiny Cloud Free cho editor quản trị

## Nguyên nhân cảnh báo

Thông báo `This domain is not registered in the TinyMCE Customer Portal` nghĩa là hostname tải editor chưa nằm trong Approved domains của API key đang dùng. Cảnh báo này không xác nhận tài khoản đã hết quota.

Cả editor bài viết và mô tả sản phẩm đã hỗ trợ `VITE_TINYMCE_API_KEY`. Nếu chưa cấu hình biến này, từng editor vẫn dùng key cũ để giữ hành vi hiện tại. Các key cũ thuộc tài khoản nào và quota còn bao nhiêu phải kiểm tra trong Tiny Cloud; không thể xác định từ source code.

## Thiết lập gói miễn phí

1. Đăng nhập hoặc tạo tài khoản của bạn tại https://www.tiny.cloud/auth/signup/ và xác minh email. Chọn gói **Free**, kiểm tra gói hiện tại và Usage/Billing trong tài khoản.
2. Mở API key của tài khoản, tìm **Approved domains**. Thêm hostname chính xác mà bạn dùng để mở trang admin, ví dụ `shop.example.com` hoặc hostname ngrok được cấp. Nhập hostname, không kèm `https://`, cổng hay `/admin`. `localhost` được hỗ trợ sẵn cho phát triển local theo tài liệu TinyMCE.
3. Dùng key của chính tài khoản đã thêm domain. Có thể cấu hình bằng biến môi trường trong PowerShell, không cần sửa `.env` thật:

   ```powershell
   cd 'D:\đồ án - test\watch-shop\client'
   $env:VITE_TINYMCE_API_KEY = '<API key từ tài khoản Tiny Cloud của bạn>'
   npm run dev
   ```

   Nếu dùng `run-dev.ps1` hoặc deployment, truyền biến này vào đúng process chạy Vite hoặc build frontend. Vite đọc biến lúc khởi động/build; cần restart dev server hoặc build và deploy lại sau khi đổi key.

4. Reload trang admin, mở **Thêm bài viết mới → Nội dung**, rồi kiểm tra editor mô tả sản phẩm. Thử nhập, định dạng, lưu và mở lại bài viết thử của bạn. Cảnh báo domain phải biến mất sau khi cấu hình được Tiny Cloud áp dụng.

Tiny Cloud Free hiện công bố **1.000 editor loads/tháng**, một domain cùng subdomain. Đây là số lần khởi tạo editor, không phải số bài viết hoặc request API của shop. Phần sử dụng vượt hạn mức có thể tính phí theo điều khoản tài khoản; kiểm tra Usage/Billing để giữ trong hạn mức miễn phí. Đổi key không làm bỏ qua quota hay yêu cầu đăng ký domain.

Khi hostname ngrok thay đổi, kiểm tra lại Approved domains và giới hạn domain của gói. Dùng hostname ổn định sẽ tránh việc phải cập nhật cấu hình này thường xuyên.

## Nếu đã thêm domain nhưng vẫn có cảnh báo

- Kiểm tra cả hai editor đang sử dụng key của đúng tài khoản vừa đăng ký domain; cấu hình `VITE_TINYMCE_API_KEY` sẽ dùng chung key đó cho cả hai.
- Trong DevTools → Network, xem request tải TinyMCE và `Referer` để đối chiếu hostname thực tế. Không đăng công khai ảnh chụp chứa key.
- Kiểm tra proxy hoặc `Referrer-Policy` có chặn header mà Tiny Cloud dùng để kiểm tra domain hay không.
- Không ẩn thông báo bằng CSS, giả `Referer` hoặc dùng key của tài khoản khác để né kiểm tra domain/quota.

TinyMCE Cloud API key là định danh dùng trong frontend và có thể thấy trong bundle. Không dùng biến `VITE_*` để chứa JWT secret, mật khẩu hoặc secret backend.

## Nguồn chính thức

- Cảnh báo domain và chẩn đoán: https://www.tiny.cloud/docs/tinymce/latest/cloud-troubleshooting/
- Localhost và Approved domains: https://www.tiny.cloud/docs/tinymce/latest/cloud-quick-start/
- Giới hạn gói Free: https://www.tiny.cloud/pricing/

Chưa xác minh trạng thái tài khoản Tiny Cloud hoặc Approved domains thực tế. Build/lint chỉ kiểm tra tích hợp code, không thay thế kiểm tra editor trên domain của bạn.
