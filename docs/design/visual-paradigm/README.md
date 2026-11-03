# Project Visual Paradigm “đồ án”

Mở **[đồ án.vpp](đồ%20án.vpp)** trong Visual Paradigm Desktop bằng **File → Open Project** (`Ctrl+O`). File được tạo và lưu bằng CLI của Visual Paradigm 15.2 đang cài trên máy, rồi mở lại để export native XML/PNG. Không cần import PlantUML. Giao diện Desktop không kết nối được với công cụ điều khiển trong phiên này, nên việc tạo và xác minh dùng CLI của chính Visual Paradigm.

Project có **87 sơ đồ**: 9 Use Case, 22 Class/Component, 41 Sequence, 13 Activity và 2 State. Mỗi sơ đồ có package riêng theo tên nguồn. Mở Diagram Navigator để chọn sơ đồ; dùng Zoom khi xem các luồng dài. Phần tử, member và connector là dữ liệu native có thể chỉnh sửa trong Desktop.

| File | Mục đích |
| --- | --- |
| [đồ án.vpp](đồ%20án.vpp) | Project chính để mở và chỉnh sửa |
| [gallery.html](gallery.html) | Danh sách xem nhanh 87 ảnh export |
| [images/](images/) | PNG xuất từ project đã lưu bằng Visual Paradigm |
| [diagram-catalog.json](diagram-catalog.json) | Ánh xạ từng `.puml` sang diagram name/type/id |
| [verification.json](verification.json) | Kết quả mở lại, đối chiếu ID, tính toàn vẹn `.vpp`, số ảnh và SHA-256 |
| [do-an-native.xml](do-an-native.xml) | Native XML đầu vào để tái tạo vào project mới |
| [build_native.py](build_native.py) | Chuyển bộ nguồn đã rà soát sang native XML |
| [vp_command.py](vp_command.py) | Chạy CLI với đường dẫn Unicode; che dòng license trong log |
| [verify_native.py](verify_native.py) | Kiểm tra bản đã lưu với XML export lại |

Nguồn nghiệp vụ vẫn là bộ tài liệu và `../uml/*.puml`. Mỗi diagram lưu tên nguồn và toàn văn PlantUML trong documentation để đối chiếu. Các sơ đồ riêng có thể biểu diễn lại cùng một module/model theo ngữ cảnh; đây không phải thao tác lên database của ứng dụng.

Enum dùng native Class có stereotype `enumeration`; field/type/constraint và operation nằm trong member native. Lane của Activity dùng đường biên và heading native có thể sửa; model ActivityPartition nằm trong project. Điều kiện `alt/else/opt/loop` của Sequence dùng note native bên trong CombinedFragment. Không coi các note đó là sự chứng nhận đầy đủ metamodel InteractionOperand/guard. Visual Paradigm có thể chuẩn hóa kiểu nét, namespace của type và caption so với PlantUML; hai bộ không có cam kết giống từng pixel.

Đã kiểm đủ 87 diagram, 1.391 shape và 1.262 connector giữ nguyên ID sau export lại, core model không mất, 87 PNG hợp lệ và SQLite integrity của file project. Có xem ảnh đại diện cho từng họ sơ đồ; không khẳng định đã kiểm từng nhãn của mọi ảnh ở mức pixel. Đây là xác minh tài liệu, không chạy ứng dụng, MongoDB hay dịch vụ thanh toán/email.

Để tái tạo, chạy `python -X utf8 docs/design/visual-paradigm/build_native.py`, sau đó dùng `vp_command.py ImportXML -project <đường-dẫn-project-mới.vpp> -file <đường-dẫn-do-an-native.xml>`. Chọn project mới để giữ các chỉnh sửa bạn đã thực hiện trong Desktop. CLI/XML tham chiếu theo [hướng dẫn chính thức](https://www.visual-paradigm.com/support/documents/vpuserguide/124/218/6855_importingxml.html). Các lần thử và XML export lại nằm trong `validation/` được gitignore. `verify_native.py` cần XML export lại ở đường dẫn truyền vào hoặc đường dẫn mặc định trong script.
