# Tiến độ phân tích thiết kế ECOMMOR

- Bổ sung Visual Paradigm Desktop theo yêu cầu: đã tạo mới project “đồ án” dưới `visual-paradigm/`, đủ 87 diagram native. Mở lại và export thành công 87 PNG; đối chiếu đủ 1.391 shape và 1.262 connector, SQLite integrity OK. Xem README và verification.json trong thư mục đó cho kết quả/giới hạn. Các dòng Render bên dưới là trạng thái PlantUML compiler ở giai đoạn tài liệu ban đầu.
- Trạng thái: đã hoàn thành các giai đoạn 0–5 của bộ tài liệu as-is ngày 21/10/2026.
- Nhánh: docs/system-design, tạo từ HEAD ban đầu; người dùng cho tiếp tục sau thông báo working tree chưa sạch. Chỉ thêm/commit tài liệu dưới docs/design, không push.
- Đã xong: kiểm kê 71 endpoint, 60 wrapper API, 13 model; 41 use case; 87 sơ đồ PlantUML (9 use case, 22 class/component, 41 sequence, 13 activity, 2 state machine).
- Đã xong: ma trận truy vết, khoảng trống, so sánh SETUP_GUIDE, 25 phát hiện (1 Critical, 4 High, 20 Medium), giả định và cách xác minh.
- Đã xác minh: độ phủ route/request/model/UC, file/dòng nguồn, mã/tên/actor, các block UML cơ bản và bản nhúng Markdown khớp nguồn; rà literal secret nhận diện được, không in giá trị.
- Frontend npm run lint: PASS, exit 0; không --fix. Không chạy suite có thể khởi động HTTP hoặc truy cập MongoDB theo phạm vi nhiệm vụ.
- Render: chưa kiểm tra cú pháp bằng công cụ và chưa có SVG/PNG. Không có Java/dot/PlantUML trong PATH; thư mục jdk-21 tìm thấy không có bin/java.exe, không tìm thấy PlantUML JAR trong các vị trí đã kiểm.
- Công việc tạo tài liệu: không còn giai đoạn bắt buộc chưa thực hiện. Việc xác minh ngoài phạm vi: render và xem ảnh, chạy integration/provider/deployment trong môi trường test riêng theo README và mục Cần xác minh ở 05.
- Giả định chính: snapshot là working tree gồm thay đổi có trước nhiệm vụ; collection vật lý, dữ liệu legacy, Console/merchant/IPN/domain thực tế không được kiểm tra qua DB hay mạng.
- Tiếp tục nếu thay đổi nguồn: đọc README và 05, cập nhật use-cases.json/nguồn sinh, chạy verify_design.py, commit từng tài liệu. Không suy ra code ứng dụng đã được sửa từ các phát hiện.
