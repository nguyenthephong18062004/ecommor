# ECOMMOR — Trình bày theo mẫu khảo sát

Mở **[ECOMMOR-trinh-bay-theo-mau.vpp](ECOMMOR-trinh-bay-theo-mau.vpp)** bằng Visual Paradigm. Đây là bản bàn giao; các file `layout-v*`, `*-final.vpp`, `preview*` và `images/` là các lần thử trong quá trình kiểm tra.

Xem nhanh toàn bộ ảnh: **[gallery.html](gallery.html)**. Ảnh bản cuối nằm trong **[final-images/](final-images/)**.

## Nội dung

- **9 Use Case:** sơ đồ tổng quan `UC — Tổng quan ECOMMOR` và 8 sơ đồ chức năng chi tiết.
- **1 Class:** `Class — Tổng thể ECOMMOR`, gồm 33 lớp. Gom các model, object nhúng, controller, service và middleware của bộ nội dung cũ vào một bản tổng thể. Các file component/module cũ không còn là các diagram riêng trong bản này. Thuộc tính đầy đủ và các chi tiết ràng buộc nguồn vẫn có trong documentation của lớp; enum được trình bày bằng kiểu String để giảm số hộp.
- **41 Sequence:** giữ các bên tham gia, nội dung và hướng message, self-call, nhánh và điều kiện. Thêm số thứ tự, ký hiệu actor/boundary/control/entity, activation màu cyan; response dùng nét đứt. Các guard dùng native InteractionOperand / InteractionConstraint.
- **13 Activity và 2 State:** giữ nội dung, đổi màu và nét theo mẫu.

Mẫu được đọc từ `C:\Users\Latop\OneDrive\Tài liệu\VPProjects\khảo sát.vpp`: nền trắng, cyan `#7ACFF5`, chữ Arial và đường viền đen. Bố trí được áp dụng phù hợp với số phần tử của ECOMMOR; các luồng dài có kích thước lớn để giữ chữ đọc được khi zoom.

## Xác minh

Đã mở lại bằng CLI Visual Paradigm 15.2 và export native XML cùng 66 PNG. `verify_restyled.py` đối chiếu với snapshot của `đồ án.vpp` trước khi làm: 59 kiểm tra PASS, gồm quan hệ use case, toàn bộ message của 41 sequence, guard, ID diagram/shape/connector, số ảnh và SQLite integrity. Chi tiết ở [verification.json](verification.json).

Đã xem ảnh tổng quan, use case chi tiết, class, sequence đăng nhập, sequence thanh toán có nhánh lồng nhau và activity OTP. Không khẳng định đã đọc từng nhãn của cả 66 ảnh ở mức pixel. Không chạy ứng dụng hoặc dịch vụ email/thanh toán vì đây là thay đổi tài liệu sơ đồ.

File tham khảo và file `đồ án.vpp` ban đầu được giữ nguyên. Bộ `.puml` cũ vẫn giữ nội dung ban đầu; bản `.vpp` trong thư mục này là bản trình bày mới có thể chỉnh sửa trực tiếp.
