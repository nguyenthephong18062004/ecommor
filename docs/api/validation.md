# Kết quả kiểm tra bộ tài liệu

Ngày: **02/11/2026**. Runtime kiểm tra: **Node 22.21.1**, Python 3.11. Dùng AJV **6.12.6** đã có trong dependencies của client; không cài thêm package, không đổi runtime mặc định của máy.

| Kiểm tra | Kết quả |
| --- | --- |
| Độ phủ OpenAPI với registration Express thực tế | **88/88 thao tác HTTP**, 86 paths; không thiếu/thừa method/path |
| Quyền middleware | **88/88 khớp**; public 31, user 26, admin 31 theo middleware, không suy diễn cookie proof/callback là không cần điều kiện |
| Nhóm nghiệp vụ | **19 nhóm**, từ tài khoản/catalog đến callback, upload, chatbot và tin nhắn |
| Operation ID, path parameter và `$ref` | Không trùng operationId; mọi path parameter bắt buộc; mọi `$ref` nội bộ giải được |
| Dẫn chứng source của operation | File tồn tại, số dòng trong phạm vi file |
| Postman Collection | **88 request**, cùng tập method/path với OpenAPI; chia nhóm, body JSON/multipart |
| Postman variables | Mọi biến được dùng đều có trong environment; body JSON parse được sau khi thay biến mẫu |
| Secret trong artifact | Password/OTP/Google ID token để trống trong environment; không có private key, connection URI hoặc token thật trong JSON tạo ra |
| OpenAPI 3.0 | **Pass schema chính thức**, JSON Schema draft-04 |
| Postman Collection 2.1 | **Pass schema chính thức**, JSON Schema draft-04 |
| Request/response JSON minh họa | **120 ví dụ hợp lệ theo schema tài liệu**; không phải 120 request nghiệp vụ đã gọi |
| Đồng bộ artifact với nguồn sinh | `python -X utf8 docs/api/build.py --check` pass |

`validate.cjs` dùng app giả để nhận các lệnh đăng ký từ `routes/index.js`, đọc Express Router stack và middleware thực tế. Không thực thi handler nghiệp vụ, không import `server.js` để mở listener/kết nối DB; khai báo chatbot trong `server.js` được kiểm tra qua source. Mongoose có cảnh báo sẵn về schema field `collection`; cảnh báo này không làm kiểm tra tài liệu thất bại.

Đây là kiểm tra tĩnh/hợp đồng, **chưa import thử qua UI Postman/Swagger**, chưa gọi HTTP thật cho từng operation, chưa chạy lại test server/client hoặc Docker trong lượt viết tài liệu. Không có dữ liệu DB, email OTP, thanh toán hoặc vận đơn nào được tạo bởi bước kiểm tra. Lỗi/hành vi legacy được ghi ở [limitations.md](limitations.md), chưa sửa khi tạo bộ tài liệu.

## Lặp lại kiểm tra

Tại root project:

```powershell
python -X utf8 docs/api/build.py --check
. ./scripts/project-node.ps1
$apiDocsNode = Get-ProjectNode
& $apiDocsNode docs/api/validate.cjs
```

Kiểm tra schema chính thức cần file cache ở `.runtime`. Cache không được commit/đóng gói cùng ứng dụng. Nếu thiếu cache hoặc AJV đã có chưa được cài cùng project, script in **SKIP**, không báo phần đó đã pass. Để tải lại đúng hai schema đã dùng (chỉ GET tài nguyên công khai):

```powershell
New-Item -ItemType Directory -Force .runtime | Out-Null
curl.exe --fail -L -o .runtime/openapi-3.0-schema.json https://spec.openapis.org/oas/3.0/schema/2024-10-18
curl.exe --fail -L -o .runtime/postman-2.1-schema.json https://schema.getpostman.com/json/collection/v2.1.0/collection.json
& $apiDocsNode docs/api/validate.cjs
```

Nguồn chuẩn định dạng: [OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3.html), [OpenAPI 3.0 JSON Schema](https://spec.openapis.org/oas/3.0/schema/2024-10-18), [Postman Collection 2.1 JSON Schema](https://schema.getpostman.com/json/collection/v2.1.0/collection.json). Phiên bản 3.0.3 được chọn cho khả năng import rộng, không khẳng định đó là OpenAPI mới nhất.

Log tại máy soạn tài liệu: `.runtime/api-docs-validation.log`. Bản ZIP chỉ đóng gói thư mục `docs/api`; các liên kết về source, setup hoặc báo cáo khác cần mở trong repository gốc.
