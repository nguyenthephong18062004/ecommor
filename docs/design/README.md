# ECOMMOR — Phân tích thiết kế hệ thống as-is

Snapshot ngày **21/10/2026**, tiếng Việt; thuật ngữ, field, route và tên hàm giữ nguyên theo source. Làm trên nhánh `docs/system-design` tạo từ HEAD khi bắt đầu. Working tree có thay đổi có trước nhiệm vụ; sau thông báo, người dùng yêu cầu tiếp tục. Tài liệu phản ánh working tree đó, không phải chỉ code đã commit. Mọi commit của nhiệm vụ chỉ chứa `docs/design/`; không push.

## Mục lục

**Visual Paradigm Desktop:** đã bổ sung project native **[đồ án.vpp](visual-paradigm/đồ%20án.vpp)** và **[hướng dẫn mở/xem ảnh](visual-paradigm/README.md)** cho toàn bộ 87 sơ đồ. Kiểm chứng native nằm trong `visual-paradigm/verification.json`; việc này độc lập với kiểm cú pháp bằng PlantUML compiler bên dưới.

| Tài liệu | Nội dung |
| --- | --- |
| [00-tong-quan.md](00-tong-quan.md) | Cây file, công nghệ/scripts, toàn bộ backend routes, model, client, API wrappers, socket và tích hợp |
| [01-use-case.md](01-use-case.md) | Actor, sơ đồ tổng quát/module và đặc tả từng UC |
| [02-class.md](02-class.md) | Từ điển mọi schema, constraint/index/ref, quan hệ và module backend/client |
| [03-sequence.md](03-sequence.md) | Luồng thành công, thay thế và lỗi cho từng UC |
| [04-activity.md](04-activity.md) | Swimlane các hành trình chính và state machine đơn/thanh toán |
| [05-truy-vet-va-khoang-trong.md](05-truy-vet-va-khoang-trong.md) | Ma trận endpoint/UC/UI/model/UML; gaps, so SETUP_GUIDE, Phát hiện, giả định và tự kiểm tra |
| [PROGRESS.md](PROGRESS.md) | Trạng thái hoàn tất và giới hạn còn lại |
| [validation.json](validation.json) | Kết quả kiểm tĩnh có cấu trúc |

## Phạm vi và giới hạn

Chỉ đọc code, không sửa ứng dụng hoặc .env, không chạy backend/Vite server, không thao tác MongoDB, không gửi mail/thanh toán/provider request. Có chạy lint frontend không --fix và script kiểm tài liệu riêng. Không chứng nhận deployment hoặc tính khả dụng dịch vụ bên ngoài. Không chạy npm audit/không cài dependency.

Phương pháp: kiểm kê → lần theo route/middleware/controller/service/model/UI → đối chiếu nguồn → đặc tả as-is → kiểm độ phủ. Phát hiện trong 05 là quan sát tĩnh hoặc giả thuyết có điều kiện, chưa khai thác runtime; có kịch bản test riêng để kiểm chứng. Source trích `path:line` hoặc `path:function`. Mã nguồn chưa commit có thể thay đổi số dòng sau này; khi cập nhật snapshot cần kiểm tra lại nguồn.

## Quy mô bộ tài liệu

| Hạng mục | Số lượng |
| --- | --- |
| Backend endpoint duy nhất | 71 |
| Hàm trong request.jsx | 60 |
| Mongoose models | 13 |
| Use case | 41 |
| Use case diagrams | 9 |
| Class/component diagrams | 22 |
| Sequence | 41 |
| Activity swimlane | 13 |
| State machine | 2 |
| Tổng .puml | 87 |
| Phát hiện | 25 |

Các sơ đồ tách theo module; mỗi `.puml` được nhúng nguyên văn đúng một lần vào tài liệu Markdown tương ứng. Class/component gồm 13 sơ đồ model, 2 quan hệ, 3 backend, 3 client và 1 kiến trúc. Diagram state machine đặt dưới tiền tố act-state để giữ hệ quy ước tên được yêu cầu.

## Xem và render PlantUML

**Chưa kiểm tra cú pháp bằng công cụ; chưa có SVG/PNG.** `java`, `dot`, `plantuml` không có trong PATH. Thư mục Java jdk-21 được tìm thấy chỉ có lib, không có bin/java.exe tại vị trí đã kiểm; không tìm thấy PlantUML JAR trong workspace hoặc VS Code extensions. Đã kiểm `@startuml/@enduml`, cân bằng các block sequence cơ bản, alias khai báo và sự khớp bản nhúng; các kiểm tra này không thay thế PlantUML compiler. Không coi không render là “pass cú pháp”.

Hai cách render khi có công cụ:

1. Mở thư mục bằng VS Code, dùng tiện ích PlantUML để preview/export các file trong `uml/` sang `images/`; chọn môi trường local có Java/Graphviz hoặc PlantUML server mà bạn cấu hình.
2. Với Java, Graphviz và PlantUML JAR đã có trên máy, chạy từ repository root (thay giá trị biến bằng đường dẫn của máy):

```powershell
$PlantUmlJar = 'C:\tools\plantuml.jar'
java -jar $PlantUmlJar -checkonly docs/design/uml
java -jar $PlantUmlJar -charset UTF-8 -tsvg -o ../images docs/design/uml
```

`-o ../images` được tính tương đối với thư mục nguồn `uml/`. Sau khi render thành công, mở ảnh kiểm layout/chữ tiếng Việt và chèn vào Markdown của từng sơ đồ, ví dụ:

```markdown
![Sequence đăng ký](images/seq-01.svg)
```

Hiện không chèn link ảnh giả hoặc tuyên bố có ảnh chưa được tạo. Giữ `.puml` và code block nhúng khi thêm ảnh. Nếu chỉnh `.puml` thủ công, đồng bộ code block Markdown trước chạy verifier.

## Quy ước đặt tên và mã

- `UC-01`…`UC-41` theo danh sách cố định trong 01 và `use-cases.json`; không tái đánh số khi chỉ sửa mô tả.
- `uc-overview`, `uc-module-*`: sơ đồ use case; actor kế thừa chỉ thể hiện năng lực theo quyền thật. include/extend không dùng thay cho việc chia sẻ helper/middleware; resend và upload tùy chọn được thể hiện extend.
- `class-model-*`, `class-relations-*`, `class-backend-*`, `class-client-*`, `class-architecture`: schema và phụ thuộc module có stereotype.
- `seq-NN` tương ứng `UC-NN`; `act-01`…`act-13` theo hành trình; `act-state-order/payment` tách hai máy trạng thái.
- Actor, use case và hoạt động dùng tiếng Việt; class, route, hàm và field giữ nguyên English identifiers. Alias chỉ trong phạm vi một sơ đồ.
- Không có model Order/Conversation/Upload hoặc API hoàn tiền/brand CRUD được tự thêm. Các trạng thái/schema bất thường giữ nguyên để phản ánh as-is, đề xuất sửa chỉ trong Phát hiện 05.

## Tự kiểm tra đã chạy

| Tiêu chí | Kết quả |
| --- | --- |
| 71/71 backend endpoint có UC hoặc lý do | Đạt |
| 60/60 request wrapper có endpoint backend | Đạt |
| 13/13 model có class và từ điển | Đạt |
| 41/41 UC có sequence | Đạt |
| 87/87 nguồn UML khớp bản nhúng Markdown | Đạt |
| Nguồn file/dòng và mã/tên/actor UC | Đạt kiểm tĩnh; không chứng nhận ngữ nghĩa runtime |
| Không có literal secret được nhận diện trong bộ tài liệu | Đạt kiểm tĩnh; chỉ tên biến/field |
| PlantUML compiler / render ảnh | Chưa kiểm tra cú pháp bằng công cụ |
| Frontend npm run lint | PASS, exit 0; không --fix |
| Runtime integration/server/DB | Không chạy theo giới hạn nhiệm vụ |

Chi tiết máy đọc được: [validation.json](validation.json); kết quả lint đã quan sát: [lint-result.json](lint-result.json). `verify_design.py` đọc lại lint-result, không tự chạy lint. Có thể chạy lại kiểm tra tài liệu mà không khởi động ứng dụng:

```powershell
python -X utf8 docs/design/verify_design.py
```

Nguồn hỗ trợ dưới docs/design: `build_design.py` và `design_content.py` sinh tài liệu bằng đọc tĩnh; `inventory.json`, `use-cases.json`, `findings.json` giữ các bảng dữ liệu đã đối chiếu. Không import module ứng dụng trong các script tài liệu. Khi cần cập nhật snapshot, chạy lần lượt `python -X utf8 docs/design/build_design.py 0` đến `5`, chạy verifier, rồi cập nhật README/progress; giữ nguyên phiên bản lint-result nếu chưa chạy lại lint. Nên đọc và rà nội dung thủ công khi code nguồn đổi, vì kịch bản UML có phần biên soạn theo snapshot này.

## Giả định lớn và phát hiện ưu tiên

Nguồn chi tiết, mức độ và kịch bản test đều ở [05](05-truy-vet-va-khoang-trong.md):

- Callback MoMo chưa verify chữ ký/amount/request đã tạo; có khả năng tạo đơn mà chưa thanh toán (Critical theo phân tích code).
- Upload blog công khai, không filter/limits; static root phục vụ cả server/src; response user chưa loại password (High).
- Reset password chưa thu hồi key phiên hoặc consume proof phía server (High).
- UI review khách bị authAdmin chặn; sửa thông số sản phẩm không khớp schema; OTP window/các thống kê và proxy/socket còn bất thường được ghi riêng.

Không suy ra cấu hình Google/Gmail/merchant/Atlas đang có từ guide; không coi `.env` tồn tại hoặc model có schema là deployment hoạt động. Tài liệu phản ánh code hiện tại, bao gồm MoMo riêng và các endpoint legacy. Để hoàn tất xác minh ngoài phạm vi đọc tĩnh: render sơ đồ, kiểm provider/deployment và chạy kịch bản test trong môi trường riêng. Không có thay đổi sửa lỗi ứng dụng trong bộ tài liệu này.
