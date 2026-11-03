# Hiện trạng cần biết khi tích hợp

Đây là ghi chú hợp đồng API theo source đang có, **không phải các lỗi đã được sửa trong lượt viết tài liệu**. Không xem mô tả quyền/response mong muốn như tính năng backend đã thực thi. Với ba lỗi đã tái hiện ở lượt rà soát trước, xem mẫu báo cáo đầy đủ tại [ma trận yêu cầu](../requirements-implementation-matrix.md).

| Nhóm | Hiện trạng | Cách tích hợp hiện tại / phần cần xử lý riêng | Nguồn |
| --- | --- | --- | --- |
| Cookie auth | Backend đọc cookie, không nhận Bearer | Giữ cookie jar, cùng host; refresh/reset dùng cookie riêng | `server/src/auth/checkAuth.js:11`; `server/src/controllers/users.controller.js:184`, `:585` |
| Status lỗi legacy | `BadRequestError` mặc định 403; không đồng nhất 400/401/404 | Đọc cả HTTP status/message; không logout mọi 403 | `server/src/core/error.response.js:28` |
| User response | Update hồ sơ/admin list trả nguyên document, có thể có hash password | Không log/lưu/chuyển tiếp response nguyên vẹn; cần DTO/field projection ở bản sửa riêng | `server/src/controllers/users.controller.js:221`, `:397` |
| Khóa tài khoản/SKU | Chưa có khóa tài khoản; modelNumber chưa unique | Không dựng workflow khóa hoặc bảo đảm SKU duy nhất chỉ từ tài liệu | `server/src/models/users.model.js:7`; `server/src/models/products.model.js:8` |
| Tổng giỏ | Giỏ và checkout có thể làm tròn khác nhau | Hiển thị quote server ở bước xác nhận; cần dùng chung công thức ở bản sửa riêng | `server/src/controllers/cartUser.controller.js:10`; `server/src/services/vnpay.service.js:61` |
| Product.category | Admin get-all trả tên, thêm categoryId; các API khác thường trả ID gốc | Khi update, dùng categoryId thay vì gửi tên danh mục | `server/src/controllers/products.controller.js:109` |
| Dữ liệu tham khảo | Legacy/preview có thể xem catalog, chưa chắc mua được | Chỉ mua published+verified+stock>0; chỉ preorder published+allowPreorder+stock<=0 | `server/src/services/product-data.service.js:30`, `:34` |
| `/api/coupon` | Thiếu middleware authUser nhưng đọc req.user.id; còn dùng totalCartBefore | Endpoint có thể 500; dùng dataCoupon của GET get-cart | `server/src/routes/coupon.routes.js:11`; `server/src/controllers/coupon.controller.js:28`, `:41` |
| Coupon CRUD | Validation truthy/lỏng; discount là VND, khác product discount % | Client cần giá trị hợp lệ; server checkout mới kiểm tra hạn/lượt/điều kiện tiền. Danh sách `/api/coupons` hiện public | `server/src/controllers/coupon.controller.js:10`, `:74`; `server/src/services/vnpay.service.js:108` |
| MoMo | Create đã bị chặn, callback legacy còn route và chưa verify chữ ký tương đương VNPay | Chỉ tích hợp COD/VNPay. Callback được liệt kê để đủ inventory, không có mẫu thành công hoặc bộ ký callback | `server/src/controllers/payments.controller.js:71`, `:181` |
| Upload | Sản phẩm có authAdmin; blog upload hiện public, Multer chưa có giới hạn/type filter tại route | Chưa thể coi là upload đã harden; cần sửa riêng trước khi mở công khai. Schema không tự áp giới hạn runtime | `server/src/routes/index.js:29`, `:109`; `server/src/routes/blog.routes.js:22` |
| Blog async | Chưa bọc async handler Express 4; nhánh not found update dùng NotFoundError chưa import | Không bảo đảm lỗi JSON hoặc request luôn kết thúc; valid update trả document cũ, cần GET lại | `server/src/routes/blog.routes.js:25`; `server/src/controllers/blog.controller.js:39` |
| Blog missing ID | ID hợp lệ không tồn tại có thể trả 200 metadata=null | Client kiểm tra metadata trước khi render | `server/src/controllers/blog.controller.js:59` |
| Xóa danh mục | Xóa cả sản phẩm thuộc danh mục; nhánh không tồn tại dùng NotFoundError chưa import | Không dùng để ngừng bán; tránh thử trên dữ liệu cửa hàng | `server/src/controllers/category.controller.js:41` |
| Tin nhắn | User chưa gửi tin có thể lỗi get-message-user; read-message là GET ghi và đánh dấu toàn bộ hội thoại | Không coi đây là phân trang/hội thoại đa admin hoàn chỉnh; refresh HTTP sau event | `server/src/controllers/message.controller.js:76`, `:161`, `:170` |
| Chatbot | Context 10 sản phẩm còn stock; chưa retrieval theo bộ lọc/mã/link, chưa lọc publication gate | Không dùng AI làm nguồn giá/tồn/trạng thái giao dịch; thiếu key/lỗi có response thân thiện | `server/src/utils/chatbot.js:104`, `:180` |
| Refunding | refund_required chỉ là trạng thái cần xử lý | Chưa có API xác nhận khoản hoàn đã thành công; không hiển thị “Đã hoàn tiền” dựa vào cờ này | `server/src/models/payments.model.js:27`; `server/src/services/vnpay.service.js:247` |
| Đơn legacy | Đơn thiếu snapshot còn fallback tên/giá từ sản phẩm hiện tại | Bảo toàn snapshot được áp dụng rõ với đơn mới; không khẳng định đã backfill lịch sử cũ | `server/src/controllers/payments.controller.js:235`, `:282` |
| Danh sách | Nhiều API admin/blog/order/coupon/message chưa phân trang | Không tự thêm query limit/page rồi cho rằng server áp dụng | `server/src/controllers/payments.controller.js:275`, `:330`; `server/src/controllers/blog.controller.js:31` |

Các hành vi liệt kê chủ yếu được đối chiếu tĩnh, không gọi upload/callback/CRUD thật để chứng minh trong lượt soạn tài liệu. Không có secret, giá trị cookie thật hoặc payload callback giả mạo thành công trong bộ file này.

## Chưa có API, không được tự suy ra từ yêu cầu nghiệp vụ

- Khóa/mở khóa tài khoản.
- Phiếu nhập/điều chỉnh kho có lý do/người thao tác/sổ biến động.
- Ticket hậu mãi/bảo hành/đổi trả gắn đơn và dòng hàng; preorder là yêu cầu cung ứng riêng.
- Xác nhận hoàn tiền thành công và quản lý chứng từ hoàn.
- Quản trị phiên bản chính sách và audit log tổng hợp.
- Hủy vận đơn GHN trực tiếp qua API project.
- Đồng bộ server cho danh sách so sánh/đã xem; hai chức năng hiện lưu local ở client.
- Healthcheck HTTP hoặc Swagger UI/API docs được mount sẵn.

Khi bổ sung các chức năng này, phải cập nhật routes, contract và tài liệu sau khi có triển khai thật; không chỉ thêm path vào OpenAPI.
