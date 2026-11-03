# ECOMMOR — Bộ tài liệu API

Phiên bản tài liệu **2026.11.02**, đối chiếu source ngày **02/11/2026**. Gồm **88 thao tác HTTP trên 86 path**, phân theo 18 nhóm, cùng hợp đồng Socket.IO và tài nguyên upload. Nội dung bằng tiếng Việt; giữ nguyên tên route, field, enum và mã lỗi trong code.

## Các tài liệu

| File | Dùng để làm gì |
| --- | --- |
| [conventions.md](conventions.md) | Base URL, cookie authentication, quyền, response, status code, đơn vị, giới hạn và quy ước gọi API |
| [reference.md](reference.md) | Toàn bộ 88 thao tác: tham số, body, field, quyền, response, ví dụ và dẫn chứng source |
| [openapi.json](openapi.json) | OpenAPI 3.0.3, import vào công cụ đọc OpenAPI/Swagger hoặc công cụ sinh client |
| [postman_collection.json](postman_collection.json) | 88 request chia nhóm, multipart upload và response minh họa |
| [postman_environment.json](postman_environment.json) | Environment local mẫu; ID/thông tin đăng nhập để trống, mã địa phương bằng 0 cần thay |
| [workflows.md](workflows.md) | Luồng OTP, tài khoản, mua hàng COD/VNPay, GHN, preorder và đánh giá |
| [realtime.md](realtime.md) | Socket.IO, sự kiện nhân viên hỗ trợ, quan hệ với HTTP và `/uploads` |
| [limitations.md](limitations.md) | Hành vi legacy, điểm chưa thống nhất và chức năng chưa có API; không nhầm tài liệu với bản vá |
| [source-map.json](source-map.json) | Method/path/quyền middleware/file:dòng của từng thao tác |
| [validation.md](validation.md) | Phạm vi và kết quả xác minh bộ tài liệu |

`build.py` là nguồn sinh OpenAPI, Postman, reference và source-map. `validate.cjs` kiểm tra artifact, route Express thực tế, quyền middleware, schema và ví dụ mà không khởi động server hay kết nối DB. Hai script chỉ phục vụ tài liệu, không được nạp vào ứng dụng.

## Bắt đầu với Postman

1. Khởi động môi trường dev theo [hướng dẫn cài đặt](../../SETUP_GUIDE.md) bằng Node 22 riêng cho project. Backend trực tiếp mặc định `http://localhost:3000`; Vite proxy mặc định `http://localhost:5173`.
2. Import collection và environment, chọn environment vừa import. `baseUrl` không có `/api` ở cuối vì request đã có đầy đủ path.
3. Điền `email`, `password` của tài khoản thử tại local environment. Gọi `POST /api/login`; Postman cookie jar giữ cookie phiên. Sau đó gọi `GET /api/auth` để kiểm tra. Không chọn Bearer Auth.
4. Lấy product/category/cart/quote/order ID từ phản hồi rồi nhập các biến tương ứng. Với GHN, lấy province/district/ward từ API địa phương; không dùng mã minh họa làm dữ liệu thật. Tài khoản admin dùng đăng nhập bình thường và cookie cùng kiểu.
5. Gọi từng request theo [workflow](workflows.md). Collection chứa các thao tác gửi OTP, sửa quyền, tạo/xóa dữ liệu và tạo vận đơn; không có kịch bản chạy toàn bộ collection như một bài smoke test. Các callback do nhà cung cấp gọi, không dùng để giả lập thanh toán thành công.

Các query tùy chọn trong Postman mặc định tắt; chỉ bật khi đã nhập giá trị đúng. File upload phải chọn lại trên máy. Collection không có script tự gọi API, tự lưu token vào biến, tự cấp quyền admin hoặc ký callback. Cookie/thông tin nhập vào Postman là dữ liệu của môi trường người dùng, không nằm trong file mẫu này.

## Phạm vi và độ tin cậy

Tài liệu mô tả **hiện trạng triển khai**, bao gồm một số route còn lỗi hoặc chưa được bảo vệ đúng như mong muốn. Quyền ghi trong source-map là middleware thực tế; refresh/reset còn cần cookie riêng dù không có `authUser`. Đọc caveat của endpoint trước khi tích hợp.

Ví dụ dùng ID hư cấu, domain `example.test` và dữ liệu fixture, không phải response thu từ tài khoản/đơn hàng thật. Mã địa phương/ảnh mẫu chưa chắc tồn tại trong DB. Chưa có dữ liệu thật nào được tạo, xóa hoặc thanh toán để viết tài liệu này.

Các schema mô tả field tích hợp và giới hạn được đối chiếu ở code. Với các handler legacy còn validate lỏng, tài liệu ghi rõ chênh lệch; không coi việc import OpenAPI là backend đã tự enforce schema. Các response trả thẳng model được để mở ở chỗ chưa có DTO ổn định, không dựng ra field hợp đồng chưa có.

OpenAPI là file tĩnh, chưa thêm Swagger middleware/UI hoặc endpoint `/api/docs` vào backend. File upload và Socket.IO được mô tả riêng, không tính thành REST operation thứ 89. Không bổ sung API hậu mãi, hoàn tiền hoàn tất, phiếu kho hay audit log vì source hiện chưa có.

## Cập nhật tài liệu

Từ thư mục gốc:

```powershell
# Sinh lại artifact sau khi đối chiếu thay đổi controller/service và sửa hợp đồng trong build.py
python -X utf8 docs/api/build.py

# Kiểm tra tài liệu đã đồng bộ, không ghi file
python -X utf8 docs/api/build.py --check

# Dùng Node 22 của project, giữ nguyên Node mặc định của máy
. ./scripts/project-node.ps1
$apiDocsNode = Get-ProjectNode
& $apiDocsNode docs/api/validate.cjs
```

Nếu route thêm/bớt mà chưa khai báo trong hợp đồng, build/check sẽ báo lỗi. Controller thay đổi body hoặc response vẫn cần người đọc code và cập nhật mô tả; kiểm tra độ phủ route không thay thế review ngữ nghĩa. Validator có thể dùng schema chính thức đã cache trong `.runtime`; xem [validation.md](validation.md) để phân biệt kiểm tra offline và kiểm tra schema chính thức.

Định dạng theo [OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3.html) và [Postman Collection 2.1](https://schema.postman.com/collection/json/v2.1.0/draft-07/docs/index.html). Không cài thêm dependency để tạo tài liệu.
