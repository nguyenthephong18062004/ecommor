# Đối chiếu 4 bảng yêu cầu FR/NFR với ECOMMOR

Ngày kiểm tra: **02/11/2026**. Nguồn yêu cầu: bốn ảnh người dùng cung cấp. Phạm vi: **18 FR + 12 NFR = 30 yêu cầu**. Chỉ kiểm tra và lập báo cáo, không sửa source ứng dụng, không thay dependency, không ghi dữ liệu DB.

Đã đọc `AGENTS.md`; đối chiếu cấu trúc thật: backend có `auth`, `config`, `controllers`, `models`, `routes`, `services`, `utils`; frontend có `Components`, `Pages`, `Routes`, `config`, `hooks`, `store`, `utils`. Có test ở `server/test` và `client/test`, Dockerfile cho hai tầng, `docker-compose.yaml` và launcher PowerShell.

## Cách đọc kết quả

- **Có:** đã có luồng chính trong code và bằng chứng phù hợp với điều kiện chính trong bảng. Không đồng nghĩa đã nghiệm thu production hoặc chứng minh mọi trường hợp đều an toàn.
- **Một phần:** có phần triển khai nhưng còn thiếu ít nhất một thành phần hoặc điều kiện chấp nhận cụ thể.
- **Chưa có:** chưa tìm thấy luồng/model/API/UI đáp ứng yêu cầu trong source đã kiểm tra.
- **Chưa nghiệm thu:** mục tiêu định lượng chưa có kết quả đo đúng phương pháp yêu cầu.

Không dùng kết quả toàn bộ test suite để thay cho đo hiệu năng, đánh giá AI, WCAG, kiểm tra viewport hoặc diễn tập restore.

| Bảng | Có | Một phần | Chưa có | Chưa nghiệm thu |
| --- | ---: | ---: | ---: | ---: |
| Chức năng khách hàng — 10 FR | 6 | 3 | 1 | 0 |
| Quản trị và hỗ trợ — 8 FR | 2 | 6 | 0 | 0 |
| Trải nghiệm và vận hành — 6 NFR | 1 | 3 | 0 | 2 |
| Dữ liệu và an toàn — 6 NFR | 3 | 3 | 0 | 0 |
| **Tổng — 30** | **12** | **15** | **1** | **2** |

## 1. Chức năng dành cho khách hàng

| Mã | Kết quả | Phần đã có / phần còn thiếu | Bằng chứng |
| --- | --- | --- | --- |
| FR01 — Tài khoản | Một phần | Có đăng ký qua OTP, đăng nhập thường/Google, đăng xuất, đổi quyền admin. Chưa có trạng thái khóa/mở khóa tài khoản và kiểm tra từ chối đăng nhập tài khoản bị khóa. Validation và tính duy nhất email cũng chưa được bảo đảm đầy đủ ở schema. | `server/src/controllers/users.controller.js:139`, `:203`, `:401`, `:500`; `server/src/models/users.model.js:7`; `server/test/otp.controller.test.js:23` |
| FR02 — Hồ sơ, địa chỉ nhận hàng | Có | Hồ sơ cập nhật theo ID phiên; sổ địa chỉ lưu theo tài khoản, chọn lại tại checkout. Tên/điện thoại/địa chỉ được chụp vào đơn, thay hồ sơ không tự cập nhật đơn cũ. Lọc field nhạy cảm trong response vẫn cần xử lý theo NFR02. | `server/src/controllers/users.controller.js:218`; `server/src/services/preferences.service.js:40`; `client/src/Components/AddressBook.jsx:6`; `server/src/services/vnpay.service.js:200` |
| FR03 — Danh mục, chi tiết, thuộc tính, SKU | Một phần | Có catalog/chi tiết, thông số/model, nhãn tình trạng và xử lý mã không tồn tại. Chưa đạt đầy đủ điều kiện giá nhất quán: cùng dữ liệu hợp lệ, cách làm tròn ở giỏ và checkout có thể lệch nhau. Mã hiện là `modelNumber`; ràng buộc duy nhất xem FR09. | `server/src/controllers/products.controller.js:54`; `client/src/Pages/DetailProduct/DetailProduct.jsx:117`; `server/src/controllers/cartUser.controller.js:10`; `server/src/services/vnpay.service.js:61` |
| FR04 — Tìm kiếm/lọc/sort/phân trang | Có | Tìm tên/brand/model/bộ sưu tập có hoặc không dấu; kết hợp nhiều bộ lọc, giá hiệu lực, sort có khóa phụ `_id`, trang 20 sản phẩm. Có test trang không trùng trên fixture ổn định. | `server/src/services/catalog-browse.service.js:10`, `:40`, `:74`; `server/test/catalog-browse.test.cjs:54`, `:63`, `:74`; `server/test/storefront-upgrades.test.cjs:59` |
| FR05 — Giỏ hàng | Có | Thêm/sửa/xóa, kiểm tra số nguyên dương và đủ tồn, tính tạm tính từ dữ liệu server. Giỏ không trừ/giữ kho; giữ kho nằm ở checkout. Công thức làm tròn còn khác checkout như FR03. | `server/src/controllers/cartUser.controller.js:18`, `:33`, `:162`, `:198`; `server/src/services/vnpay.service.js:120`, `:203` |
| FR06 — Xác nhận đặt hàng/tính tiền/giữ kho | Có | Tính tiền server, snapshot hàng, kiểm tra fingerprint báo giá, tạo đơn/giữ kho/xóa giỏ trong transaction. Checkout trùng trả đơn cũ; giá/giỏ/báo giá đổi yêu cầu xác nhận lại. | `server/src/services/vnpay.service.js:71`, `:88`, `:172`; `server/src/services/shipping.service.js:87`; `server/test/vnpay.test.js:123`; `server/test/checkout-request.test.cjs:72` |
| FR07 — COD/VNPay sandbox | Có | Có COD, URL VNPay, mã attempt mới khi thử lại; kiểm tra chữ ký/số tiền/mã đơn; IPN và query có xác minh ghi trạng thái, Return URL chỉ điều hướng. Chưa chạy một giao dịch sandbox thực mới trong lượt đối chiếu này. | `server/src/services/vnpay.service.js:162`, `:211`, `:233`, `:305`; `server/src/controllers/payments.controller.js:149`; `server/test/vnpay.test.js:136`, `:157`, `:166` |
| FR08 — Lịch sử/chi tiết/hủy đơn | Có | Truy vấn theo chủ tài khoản; khách chỉ hủy đơn pending theo điều kiện thanh toán/vận đơn. Hoàn kho có cờ và transaction chống chạy lặp. Đơn online đã trả tiền cần xử lý hoàn tiền trước, chưa tự cho khách hủy. | `server/src/controllers/payments.controller.js:272`, `:324`; `server/src/services/vnpay.service.js:137`, `:335`; `server/test/vnpay.test.js:201`; `server/test/vnpay-reconcile.test.cjs:64` |
| FR14 — Hội thoại Gemini-RAG | Một phần | Có Gemini, catalog context, giới hạn/timing/retry/thông báo thiếu key hoặc lỗi dịch vụ. Hiện lấy tối đa 10 sản phẩm `stock>0`, chưa truy xuất theo bộ lọc của câu hỏi, chưa áp gate publish/xác minh, chưa đưa mã/link đối chiếu và chính sách vào ngữ cảnh. UI hiện gửi từng câu hỏi, chưa gửi lịch sử dù server hỗ trợ lịch sử. | `server/src/utils/chatbot.js:104`, `:156`, `:180`; `client/src/utils/Chatbot/Chatbot.jsx:44` |
| FR15 — Gửi/theo dõi hậu mãi | Chưa có | Chưa có yêu cầu bảo hành/đổi trả gắn với đơn và dòng hàng thuộc khách, trạng thái xử lý, kết quả kiểm tra và bước nhập lại hàng. Trang chính sách và form đặt hàng theo yêu cầu không đáp ứng chức năng này. | `client/src/config/policies.js:19`; `server/src/models/preorder.model.js:5`; `server/src/services/preorder.service.js:23`; đã rà models/routes/services và phần đơn hàng trong tài khoản |

## 2. Chức năng quản trị và hỗ trợ

| Mã | Kết quả | Phần đã có / phần còn thiếu | Bằng chứng |
| --- | --- | --- | --- |
| FR09 — Thương hiệu/sản phẩm/SKU/ảnh | Một phần | Có quản trị brand, sản phẩm, ảnh, thông số, publish/archive. Chưa có SKU duy nhất: schema chỉ yêu cầu `modelNumber`, controller không chặn trùng, DB được kiểm tra chỉ có index `_id`. | `server/src/services/brand.service.js:25`; `server/src/controllers/products.controller.js:17`; `server/src/models/products.model.js:8`, `:48`; `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx:291` |
| FR10 — Nhập/điều chỉnh/tra cứu kho | Một phần | Có xem/sửa `stock`, giữ/hoàn tồn khi đặt/hủy đơn. Chưa có phiếu nhập/điều chỉnh với lý do, người thao tác, lịch sử biến động và quy tắc điều chỉnh dựa trên tồn vật lý/đang giữ. Cờ giữ hiện ở đơn, không phải sổ kho độc lập. | `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx:291`; `server/src/controllers/products.controller.js:117`; `server/src/services/vnpay.service.js:120`, `:137`; `server/src/models/payments.model.js:28` |
| FR11 — Xác nhận/hủy/giao nhận | Có | State transition ở server; xác nhận điều kiện thanh toán, tạo/đồng bộ vận đơn GHN, mã vận chuyển và khóa chống tạo trùng; kiểm soát hủy khi vận đơn còn hoạt động. Tồn đã trừ lúc giữ hàng, không trừ thêm khi giao. | `server/src/services/vnpay.service.js:335`; `server/src/services/shipping.service.js:127`, `:164`; `server/test/ghn-shipping.test.cjs:137`, `:144`, `:163`; `server/test/vnpay.test.js:270` |
| FR12 — Khoản thu/hoàn tiền/xử lý muộn | Một phần | Có VNPay IPN/query đối soát, mã giao dịch, thời gian, nguồn xác nhận; kết quả trả muộn được lưu `refund_required`. Chưa có nghiệp vụ lập/duyệt/xác nhận khoản hoàn, chứng từ hoàn và trạng thái hoàn thành công; chưa có sổ khoản thu/hoàn riêng. `refund_required` chỉ là cần hoàn, chưa phải đã hoàn. | `server/src/models/paymentAttempt.model.js:4`; `server/src/services/vnpay.service.js:233`, `:271`; `server/src/models/payments.model.js:27`; `server/test/vnpay-reconcile.test.cjs:100` |
| FR13 — Báo cáo đơn/hàng bán/doanh thu/hoàn/tồn | Một phần | Có dashboard số đơn, sản phẩm, top bán và doanh thu đơn delivered. Chưa có bộ lọc thống nhất, báo cáo hoàn/tồn như yêu cầu; doanh thu hiện cộng `totalPrice` của đơn delivered theo `createdAt`, chưa xác lập đầy đủ cơ sở ngày và khoản được tính. | `server/src/controllers/users.controller.js:225`, `:260`, `:271`; `client/src/Pages/Admin/Components/ManagerStatistical/ManagerStatistical.jsx:31` |
| FR16 — Mã giảm giá | Có | Có CRUD mã, một mã mỗi giỏ/đơn; checkout kiểm tra ngày hiệu lực, giá tối thiểu, số lượt và giữ lượt nguyên tử cùng đơn. Cần tiếp tục siết validation CRUD theo NFR02, nhưng điều kiện áp dụng tại checkout đã có. | `server/src/controllers/coupon.controller.js:10`, `:74`; `server/src/services/vnpay.service.js:108`, `:128`; `server/test/vnpay.test.js:123`, `:257` |
| FR17 — Chính sách/tham số vận hành | Một phần | Có trang chính sách và cấu hình runtime/GHN; đơn có snapshot tiền, người nhận, vận chuyển. Chính sách đang là module frontend tĩnh; chưa có quản trị phiên bản, ngày hiệu lực và liên kết phiên bản chính sách với từng đơn. | `client/src/config/policies.js:1`; `client/src/Pages/Policy.jsx:1`; `server/src/services/vnpay.service.js:200`; `server/src/services/shipping.service.js:87` |
| FR18 — Nhật ký thay đổi/sự kiện | Một phần | Có log kỹ thuật Gemini, payment attempt và lịch sử preorder. Chưa có audit log tổng hợp với actor/thời gian/đối tượng/hành động cho đăng nhập, admin sửa sản phẩm/kho, đơn và thanh toán; lịch sử preorder chưa lưu người cập nhật. | `server/src/utils/chatbot.js:27`; `server/src/models/paymentAttempt.model.js:12`; `server/src/models/preorder.model.js:20`; `server/src/controllers/users.controller.js:139`; đã rà models/routes/services |

## 3. Phi chức năng về trải nghiệm và vận hành

| Mã | Kết quả | Phần đã có / phần còn thiếu | Bằng chứng |
| --- | --- | --- | --- |
| NFR07 — Hiệu năng catalog | Chưa nghiệm thu | Có phân trang, projection, lazy load và khai báo index. Chưa có số đo p95 ≤2 giây với 20 người dùng, warm-up và đo ≥5 phút. DB được đọc index hiện chỉ có `_id`; các index khai báo trong schema chưa hiện diện ở DB này. | `server/src/services/catalog-browse.service.js:74`; `server/src/models/products.model.js:48`; `.runtime/requirements-indexes.log`; chưa tìm thấy load-test/report tương ứng |
| NFR08 — Desktop/mobile | Một phần | Có responsive CSS cho catalog, header, chi tiết, profile và admin. Chưa kiểm tra thực tế đủ viewport 360/768/1366 px để xác nhận thao tác chính không mất và trang mua hàng không tràn ngang. | `client/src/App.css:27`; `client/src/Components/Header/Header.module.scss:96`; `client/src/Pages/Category/Category.module.scss:58`; `client/src/Pages/InfoUser/InfoUser.module.scss:109` |
| NFR09 — Accessibility | Một phần | Có label, aria-label, alt ảnh, heading và table header ở nhiều thành phần. Chưa có kiểm tra contrast/bàn phím/focus/thông báo lỗi trên toàn luồng theo WCAG; chỉ đọc source chưa đủ kết luận đạt. | `client/src/Components/Header/Header.jsx:94`, `:120`; `client/src/Pages/DetailProduct/DetailProduct.jsx:70`, `:119`; chưa tìm thấy báo cáo accessibility |
| NFR10 — Bảo trì/triển khai lại | Một phần | Có phân tầng, cấu hình qua env, Docker, launcher Node riêng, tài liệu checkout/VNPay/GHN. Đã bổ sung bộ tài liệu API thống nhất theo yêu cầu tiếp theo của người dùng tại `docs/api/README.md`. Chưa có bằng chứng dựng lại trọn hệ thống từ môi trường sạch hoặc xác minh Docker production chạy hoàn chỉnh. | `server/Dockerfile:1`; `client/Dockerfile:1`; `scripts/project-node.ps1:1`; `SETUP_GUIDE.md:3`; `docs/api/README.md:1`; `docs/GHN.md:1`; `docs/VNPAY.md:1` |
| NFR11 — Chất lượng chatbot | Chưa nghiệm thu | Có system instruction, catalog context và xử lý thiếu dữ liệu/lỗi. Chưa có bộ 50 câu gắn nhãn, tiêu chí chấm, kết quả đối chiếu điều kiện/mã/thông số/giá và tỷ lệ đạt. | `server/src/utils/chatbot.js:104`, `:125`; chưa tìm thấy tập đề xuất/báo cáo đánh giá tương ứng trong test/docs |
| NFR12 — Giới hạn tài nguyên AI | Có | Server giới hạn câu hỏi 1.000 ký tự, lịch sử 10 tin, catalog 10 sản phẩm, 1.024 output tokens, timeout 30 giây/lần gọi, tối đa 2 retry; endpoint 10 request/phút, tách khỏi luồng checkout. Chưa có load test khả năng chịu tải AI đồng thời. | `server/src/utils/chatbot.js:4`, `:84`, `:180`, `:189`, `:195`, `:198`; `server/src/server.js:51`, `:65` |

## 4. Phi chức năng về dữ liệu và an toàn

| Mã | Kết quả | Phần đã có / phần còn thiếu | Bằng chứng |
| --- | --- | --- | --- |
| NFR01 — Quyền backend/chủ sở hữu | Có | Backend dùng `isAdmin` chung cho admin, đúng điều kiện hai admin cùng tập quyền trong ảnh; route quản trị có middleware, đơn/giỏ/preferences theo chủ từ session. Không suy diễn yêu cầu phân quyền theo từng chức vụ. Chưa coi đây là kết luận audit mọi endpoint, đặc biệt các luồng legacy ngoài COD/VNPay. | `server/src/auth/checkAuth.js:11`, `:24`; `server/src/routes/users.routes.js:27`; `server/src/routes/payments.route.js:14`; `server/src/controllers/payments.controller.js:275`; `server/test/customer-auth.test.cjs:11` |
| NFR02 — Mật khẩu/key/truyền/input | Một phần | Có bcrypt, JWT RS256, cookie httpOnly theo môi trường, nhiều validator/sanitizer. Chưa đạt bảo vệ response tài khoản: update hồ sơ và danh sách user trả nguyên document có `password`. Validation tài khoản chưa đầy đủ; chưa nghiệm thu HTTPS/cấu hình production. Không tìm thấy chỗ dùng `VITE_SECRET_CRYPTO` trong source frontend hiện tại. | `server/src/controllers/users.controller.js:150`, `:218`, `:396`; `server/src/models/users.model.js:7`; `server/src/services/tokenSevices.js:31`; `server/src/services/product-data.service.js:42`; `.runtime/requirements-check.log` |
| NFR03 — Nhất quán đơn/kho/chống lặp | Có | COD/VNPay dùng transaction, trừ tồn có điều kiện và khóa checkoutKey, cờ hoàn kho, callback idempotent. Test hai khách tranh SKU cuối chỉ một đơn thành công, stock không âm. Cần MongoDB replica set; không có bảo đảm tương tự cho sửa kho thủ công như FR10. | `server/src/services/vnpay.service.js:71`, `:120`, `:137`, `:172`; `server/src/models/payments.model.js:26`; `server/test/vnpay.test.js:123`, `:248` |
| NFR04 — Lịch sử giá/giao dịch | Có | Đơn mới lưu tên/giá/số lượng/ảnh/người nhận/địa chỉ; đọc ưu tiên snapshot. Sửa/xóa sản phẩm không đổi snapshot đơn mới; giao dịch trả muộn lưu attempt và `refund_required`. Đơn legacy thiếu snapshot vẫn phải fallback, chưa có migration bổ sung lịch sử chính xác. | `server/src/services/vnpay.service.js:104`, `:200`, `:243`; `server/src/controllers/payments.controller.js:282`; `server/test/vnpay.test.js:186`, `:214`, `:270` |
| NFR05 — Dữ liệu cá nhân trong AI/log | Một phần | Catalog gửi AI chỉ chọn các field sản phẩm, log Gemini ghi metadata/che một số token và không log toàn bộ câu hỏi. Nhưng câu hỏi/lịch sử người dùng được gửi model nguyên văn, chưa loại dữ liệu cá nhân không cần thiết; chưa có kiểm tra bảo vệ log toàn hệ thống và nội dung chính sách công khai trong RAG. | `server/src/utils/chatbot.js:19`, `:104`, `:172`, `:200`; `client/src/utils/Chatbot/Chatbot.jsx:44` |
| NFR06 — Phục hồi/theo dõi lỗi | Một phần | Có backup cục bộ được ghi nhận trước thay đổi DB, backup catalog khi import, requestId và log lỗi Gemini. Chưa có bằng chứng restore thành công vào môi trường riêng hoặc correlation ID xuyên suốt API/đơn/thanh toán để tái dựng lỗi tích hợp. | `docs/checkout-fix-verification.md:9`; `server/scripts/import-luxurytime-catalog.cjs:90`; `server/src/utils/chatbot.js:172`; đã xác nhận file backup tồn tại, không mở nội dung |

## 5. Xác minh bổ sung trong lượt đối chiếu

- Đọc log lần chạy gần nhất: server **104/104 pass**, client **12/12 pass**, không skip. Không chạy lại toàn bộ suite trong lượt này; các test hiện có chưa bao phủ đủ 30 yêu cầu.
- Chạy ba chẩn đoán chỉ dùng phép tính/schema/mocks: **3/3 xác nhận được hiện trạng chưa đạt** về làm tròn, response `password`, ràng buộc modelNumber. Đây là tái hiện lỗi, không phải ba lỗi đã sửa. Lệnh: Node 22 `--test .runtime/requirements-check.cjs`; log `.runtime/requirements-check.log`.
- Đọc danh sách index collection `products` với `autoIndex=false`, `autoCreate=false`, không ghi DB: hiện chỉ có index `_id` (unique); không có index unique modelNumber/SKU. Log `.runtime/requirements-indexes.log`.
- Không gọi Gemini, gửi OTP, thanh toán, tạo vận đơn, ghi DB hay kiểm tra UI browser trong lượt này. Không đọc/in nội dung backup hoặc giá trị secret.

## 6. Ba lỗi chắc chắn liên quan trực tiếp điều kiện chấp nhận

### [MỨC ĐỘ: Medium] Giỏ hàng và checkout làm tròn giá khác nhau
- **Vị trí:** `server/src/controllers/cartUser.controller.js:10`; `server/src/services/vnpay.service.js:61`.
- **Mô tả:** Giỏ tính giảm giá trên tổng dòng bằng số thực; checkout làm tròn đơn giá VND trước khi nhân số lượng.
- **Cách tái hiện:** Giá 100.005 VND, giảm 10%, số lượng 2. Hàm giỏ trả 180.009 VND, checkout trả 180.010 VND. Chẩn đoán dùng trực tiếp hàm trích từ source và `unitPrice`, không cần DB.
- **Tác động:** Giá tạm tính và số tiền xác nhận khác nhau với cùng dữ liệu; FR03 chưa đạt nhất quán giá. Không có bằng chứng client sửa được số tiền server.
- **Đề xuất sửa:** Dùng chung một phép tính đơn giá VND và quy tắc làm tròn tại mọi bước giỏ/báo giá/checkout; thêm test hồi quy cho số lượng nhiều hơn 1.
- **Độ chắc chắn:** Chắc chắn, đã tái hiện.

### [MỨC ĐỘ: Medium] Chưa bảo đảm mã SKU/model duy nhất
- **Vị trí:** `server/src/models/products.model.js:8`; `server/src/controllers/products.controller.js:17`.
- **Mô tả:** `modelNumber` chỉ required, chưa có trường SKU/ràng buộc unique; controller create không kiểm tra trùng. Kiểm tra DB hiện không có unique index ngoài `_id`.
- **Cách tái hiện:** Đối chiếu schema/index DB và luồng create; hai sản phẩm khác `_id` có thể dùng cùng `modelNumber` theo ràng buộc hiện tại. Chưa gửi hai POST ghi DB thật.
- **Tác động:** Chưa đáp ứng điều kiện SKU duy nhất của FR09; khó phân biệt hàng khi tra cứu/đối soát. Chưa khẳng định DB hiện đã có bản ghi trùng.
- **Đề xuất sửa:** Chốt `modelNumber` có phải SKU hay thêm SKU riêng cho biến thể; chuẩn hóa mã, preview dữ liệu trùng, sau đó tạo unique index và xử lý lỗi trùng 409. Không tự áp index/migration khi chưa kiểm tra dữ liệu.
- **Độ chắc chắn:** Chắc chắn về thiếu ràng buộc; tình trạng dữ liệu trùng cần xác minh riêng.

### [MỨC ĐỘ: Medium] Response hồ sơ/danh sách user chứa trường mật khẩu
- **Vị trí:** `server/src/controllers/users.controller.js:221`; `server/src/controllers/users.controller.js:397`; `server/src/models/users.model.js:10`.
- **Mô tả:** Query không loại `password`, controller trả trực tiếp document; schema chưa mặc định ẩn field. Mật khẩu được bcrypt hash, nhưng hash vẫn là dữ liệu nhạy cảm không cần trả về UI.
- **Cách tái hiện:** Mock query trả document fixture có field `password`; gọi handler cập nhật hồ sơ và danh sách admin, xác nhận response vẫn có field đó. Không dùng tài khoản hoặc hash thật.
- **Tác động:** Tăng dữ liệu nhạy cảm tại client/DevTools/log phía client; NFR02 chưa đạt đầy đủ. Hai API vẫn có kiểm soát phiên/quyền, chưa kết luận người ngoài đọc được danh sách user.
- **Đề xuất sửa:** Trả DTO allowlist và loại mật khẩu/field xác thực tại schema hoặc query; cập nhật truy vấn đăng nhập để chọn hash rõ ràng nếu dùng `select:false`; thêm test response không chứa field nhạy cảm.
- **Độ chắc chắn:** Chắc chắn, đã tái hiện với mocks.

| Mức độ | Số lỗi chắc chắn báo trong lượt đối chiếu này |
| --- | ---: |
| Critical | 0 |
| High | 0 |
| Medium | 3 |
| Low | 0 |

Bảng mức độ chỉ tính ba lỗi được tái hiện/xác minh ở trên, không có nghĩa hệ thống không còn lỗi nghiêm trọng ở các phạm vi khác. Các phần thiếu FR01/FR10/FR12/FR13/FR14/FR15/FR17/FR18 là khoảng trống yêu cầu được ghi riêng trong ma trận, chưa triển khai hoặc sửa trong lượt này.
