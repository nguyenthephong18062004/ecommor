# ECOMMOR — Tổng hợp website tham khảo và phương án nâng cấp

Ngày khảo sát: **02/11/2026**. Đây là **bản khảo sát trước triển khai**; người dùng đã duyệt toàn bộ hạng mục, hai dependency bảo mật và Node 22 riêng cho project. Kết quả hiện tại ở [báo cáo triển khai](storefront-upgrades-implementation.md).

Các số dòng, lỗi và kết quả test bên dưới ghi nhận thời điểm khảo sát, trước khi sửa; không dùng để mô tả trạng thái code hiện tại.

Đã đọc `AGENTS.md` tại thư mục gốc. Hai nguồn chính theo yêu cầu bổ sung là **Chrono24** và **WatchShop**. LuxuryTime và Luxshopping được dùng làm nguồn đối chiếu bổ sung vì đã xuất hiện trong tài liệu dự án. Các phương án bên dưới phục vụ người dùng Việt Nam.

## 1. Phạm vi và cấu trúc đã kiểm tra

```text
server/
  src/
    auth/checkAuth.js
    config/
    controllers/     products, users, payments, cartUser, previewProduct, blog...
    models/          products, brand, payments, paymentAttempt, preorder, shippingQuote...
    routes/          products, users, payments, brand, preorder, shipping...
    services/        catalog-browse, product-catalog, brand, preorder, shipping, vnpay...
    utils/
    uploads/
    server.js
  scripts/           import-luxurytime-catalog.cjs, luxurytime-mapping.cjs...
  test/
client/
  src/
    Components/      Header, Footer, HomePage, CardBody, ShippingInfo, SocialLinks...
    Pages/           Category, DetailProduct, Cart, CheckOut, PaymentSuccess,
                     PreOrder, Contact, LoginUser, Register, ForgotPassword,
                     InfoUser, Blogs, DetailBlog, Admin...
    Routes/
    config/
    hooks/
    store/
    utils/
  test/
  index.html
```

Đối chiếu bằng code hiện tại trong working tree, bao gồm các thay đổi có sẵn của người dùng. Báo cáo này không phải kết luận audit toàn bộ hệ thống.

Nội dung website được đọc qua công cụ web, có trang là bản trích xuất/cached. Chưa thao tác mua hàng, đăng ký tài khoản hoặc kiểm tra backend của website tham khảo. Trang chủ LuxuryTime trả lỗi khi mở trực tiếp; một số trang sản phẩm và kết quả tìm kiếm vẫn đọc được. Không suy luận chất lượng bảo mật hoặc hiệu quả kinh doanh chỉ từ giao diện.

## 2. Những điều học được và hướng áp dụng

Các quan sát trong cột thứ hai đến từ nguồn liên kết. Cột thứ ba là **đề xuất cho ECOMMOR**, cần kiểm chứng lợi ích sau triển khai.

| Nguồn | Quan sát có bằng chứng | Bài học và áp dụng cho ECOMMOR |
| --- | --- | --- |
| [Chrono24 — tìm kiếm nâng cao](https://www.chrono24.com/search/index.htm) | Có trường model/reference và bộ lọc thương hiệu, bộ máy, giới tính, vật liệu, giá, tình trạng; có sắp xếp. | Tìm theo mã sản phẩm ngoài tên; kết hợp nhiều tiêu chí; dùng query string để giữ bộ lọc khi tải lại/chia sẻ. |
| [Chrono24 — danh sách Datejust](https://www.chrono24.com/rolex/datejust--mod45.htm) | Có nhóm mẫu, bộ lọc nhanh, phân trang và thao tác lưu tìm kiếm. | Cho người mua đi từ thương hiệu đến bộ sưu tập; thêm bộ lọc đang chọn và nút xóa; lưu tìm kiếm là hạng mục tùy chọn về sau. |
| [Chrono24 — chi tiết sản phẩm mẫu](https://www.chrono24.com/rolex/rolex-datejust-36--id49262408.htm) | Tách tình trạng, hộp/giấy tờ, mã reference, thông số, giao hàng và thông tin kiểm định; có ảnh nhiều góc. Trang nêu cơ chế đánh giá đã xác minh. | Chuẩn hóa hồ sơ sản phẩm và bằng chứng xác minh; đưa tình trạng/bảo hành/giao dự kiến gần nút mua; xây đánh giá gắn với đơn hàng thực tế. |
| [Chrono24 — Buyer Protection](https://www.chrono24.com/buyer-protection.htm) | Giải thích thanh toán, kiểm định và quy trình xử lý khi sản phẩm có vấn đề; phạm vi quyền lợi tùy loại người bán. | Công bố chính sách cụ thể của cửa hàng và quy trình hỗ trợ. Escrow/marketplace là nghiệp vụ riêng, cần được duyệt nếu mở rộng mô hình. |
| [WatchShop — trang chủ](https://www.watchshop.com/) | Có tìm kiếm sản phẩm/thương hiệu, danh sách yêu thích, theo dõi đơn và sổ địa chỉ. | Rút ngắn đường từ tìm kiếm đến mua; bổ sung yêu thích và địa chỉ nhận hàng đã lưu; tận dụng lịch sử đơn đang có. |
| [WatchShop — danh sách Tissot](https://www.watchshop.com/tissot) | Có bộ lọc giới tính, màu, giá, loại dây; sắp xếp theo giá, mới nhất, mức giảm giá; hiển thị số kết quả. | Nâng cấp trang danh mục hiện có, giữ phân trang server; định nghĩa rõ giá sau giảm khi lọc/sắp xếp. |
| [WatchShop — chi tiết Tissot PRX](https://www.watchshop.com/tissot-mens-prx-automatic-stainless-steel-analogue-watch-700299) | Có hướng dẫn kích thước, trạng thái đặt trước/ngày hàng về, thông số và mục giao hàng/đổi trả. | Bổ sung hướng dẫn chọn cỡ, trạng thái khả dụng rõ ràng và lịch dự kiến có nguồn; tận dụng form đặt theo yêu cầu và GHN đã có. |
| [WatchShop — hướng dẫn trả hàng](https://help.watchshop.com/hc/en-gb/articles/6017108350623-I-need-to-return-an-item-bought-online) | Mô tả điều kiện, từng bước gửi trả, chi phí và tiến trình hoàn tiền. | Tạo nội dung chính sách tiếng Việt với điều kiện và các bước xử lý do chủ cửa hàng duyệt. |
| [Luxshopping — danh sách Longines](https://luxshopping.vn/dong-ho-longines-451.aspx), [form đặt hàng](https://luxshopping.vn/dat-hang.aspx) | Có bộ lọc chuyên ngành và form thông tin giao hàng, ghi chú, lựa chọn thanh toán. | Tham khảo cách trình bày tiếng Việt; thống nhất thuật ngữ và hiển thị tổng tiền/phí vận chuyển rõ ràng. |
| [LuxuryTime — sản phẩm hàng đặt](https://luxurytime.vn/san-pham/dong-ho-richard-mille-rm-11-03-rose-gold-18k-full-baguette-diamonds) | Có thông số, tình trạng hàng đặt, thời gian dự kiến và liên hệ tư vấn; nội dung nguồn mô tả hàng chế tác. | Học cách nối sản phẩm với tư vấn và lịch cung ứng. Thông tin nguồn cần được phân loại và xác minh trước khi gắn cam kết chính hãng tại ECOMMOR. |

Định hướng: tiếp tục mô hình một cửa hàng hiện có, học cách tổ chức dữ liệu và hành trình mua. Các thời hạn đổi trả, cam kết kiểm định, phương thức trả góp và thông tin bảo hành phải theo chính sách ECOMMOR đã được duyệt. Cải thiện tìm kiếm và trình bày chưa chứng minh được mức tăng chuyển đổi; cần đo sau triển khai.

## 3. Những phần đã có để tận dụng

| Thành phần | Bằng chứng trong dự án | Hướng nâng cấp |
| --- | --- | --- |
| Catalog có phân trang, giới hạn 20 sản phẩm; lọc giá/tồn kho/tên và chọn danh mục hoặc thương hiệu | `server/src/services/catalog-browse.service.js:7`, `:37`, `:64`; `client/src/Pages/Category/Category.jsx:41`, `:89` | Mở rộng API và UI hiện có. Hiện backend từ chối kết hợp `category` và `brand` tại dòng 45. |
| Trang chủ có sản phẩm mới, nhóm theo giới tính/thương hiệu | `client/src/Components/HomePage/ProductNew/ProductNew.jsx:12`, `:35` | Thêm điểm vào theo ngân sách/bộ sưu tập; chỉ dùng số bán thực để lập nhóm bán chạy. |
| Chi tiết có ảnh, giá, tồn kho, bảng thông số, sản phẩm liên quan | `client/src/Pages/DetailProduct/DetailProduct.jsx:101`, `:138`, `:238`, `:324` | Bổ sung zoom, hướng dẫn cỡ, dữ liệu nguồn và chính sách theo sản phẩm. |
| Brand có model và service | `server/src/models/brand.model.js:3`; `server/src/services/brand.service.js:4` | Bổ sung nội dung giới thiệu/logo và trang thương hiệu khi được duyệt. |
| Đặt theo yêu cầu, quản trị và giới hạn gửi | `server/src/routes/preorder.routes.js:8`, `:16`, `:19`; `client/src/Routes/routes.jsx:35` | Nâng cấp trạng thái khả dụng. Code hiện yêu cầu đăng nhập; mô tả khách không cần đăng nhập trong `docs/preorder-flow.md:8` đã lệch code. Giữ yêu cầu đăng nhập hiện có trong phạm vi đề xuất. |
| Checkout tính giá từ DB, có shipping quote, transaction và giữ kho | `server/src/services/vnpay.service.js:87`, `:98`, `:175`, `:194`; `server/src/services/shipping.service.js:87` | Tận dụng luồng hiện có; thay đổi UI phải có hồi quy tổng tiền, phí ship và trạng thái. |
| Kết quả VNPay có đối soát và hiển thị trạng thái | `server/src/routes/payments.route.js:12`; `client/src/Pages/PaymentSuccess/PaymentSuccess.jsx:48`, `:71` | Chuẩn hóa thông điệp tiếng Việt và trình bày trạng thái thanh toán/vận chuyển. |

## 4. Lỗi chắc chắn đã xác minh

### [MỨC ĐỘ: High] HTML mô tả chưa được sanitize trước khi lưu và render

- **Vị trí:** `server/src/controllers/products.controller.js:64`, `:85`, `:208`; `client/src/Pages/DetailProduct/DetailProduct.jsx:233`.
- **Mô tả:** API tạo/cập nhật lưu nguyên `description`; trang công khai đưa nội dung đó vào `dangerouslySetInnerHTML`. Route ghi có `authAdmin`, vì vậy đây là đường đi qua tài khoản quản trị/nội dung quản trị, chưa chứng minh khách thường có quyền chèn HTML.
- **Cách tái hiện:** Trong VM dùng model mock, gọi `createProduct` với fixture hợp lệ có `description` chứa thẻ ảnh và thuộc tính `onerror`. Chuỗi được chuyển nguyên đến `modelProduct.create`; xác minh trang chi tiết render chính trường này dưới dạng HTML. Chỉ kiểm tra luồng dữ liệu, chưa thực thi payload trên browser.
- **Tác động:** Nội dung HTML độc hại từ tài khoản quản trị bị lạm dụng hoặc nguồn biên tập không tin cậy có thể dẫn đến stored XSS trên trang công khai. Chưa chứng minh lộ cookie/token hoặc kiểm tra CSP ở môi trường deploy.
- **Đề xuất sửa:** Sanitize theo allowlist khi ghi nội dung rich text và bảo vệ nơi render; rà soát tương tự nội dung blog. Xử lý dữ liệu cũ bằng kế hoạch riêng có preview/backup. Nếu cần dependency sanitizer, xin duyệt dependency trước khi cài.
- **Độ chắc chắn:** **Chắc chắn** về đường lưu/render HTML không sanitize đã kiểm tra; khai thác trên browser chưa chạy.

### [MỨC ĐỘ: Medium] Form và API cập nhật sản phẩm lệch tên trường/schema

- **Vị trí:** `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx:129`, `:267`; `server/src/controllers/products.controller.js:205`; `server/src/models/products.model.js:7`.
- **Mô tả:** Form khai báo `nameProduct`, nhưng khi nạp sửa dùng `name`; backend cũng lấy `name`. Backend bỏ qua các trường thông số như `movement`, `origin` khi cập nhật.
- **Cách tái hiện:** Trong VM gọi `updateProduct` với `nameProduct`, `movement`, `origin` mới; đối chiếu đối tượng chuyển tới `findByIdAndUpdate`: cả ba trường bị bỏ, handler vẫn trả response thành công. Trên UI có thể mở sản phẩm, sửa các trường tương ứng, lưu và mở lại để kiểm chứng thêm.
- **Tác động:** Quản trị không cập nhật được đầy đủ hồ sơ sản phẩm; dữ liệu phục vụ bộ lọc và nội dung bán hàng dễ sai.
- **Đề xuất sửa:** Thống nhất `nameProduct` khi nạp form và trong allowlist cập nhật; bổ sung đúng các field cần sửa theo schema, validate giá trị và bật validators cho update. Không truyền thẳng toàn bộ `req.body` vào model.
- **Độ chắc chắn:** **Chắc chắn**, đã tái hiện bằng mock.

### [MỨC ĐỘ: Medium] Không tạo được sản phẩm tồn kho bằng 0

- **Vị trí:** `server/src/controllers/products.controller.js:59`; `server/src/models/products.model.js:28`; `client/src/Pages/DetailProduct/DetailProduct.jsx:182`.
- **Mô tả:** Kiểm tra `!stock` coi `0` là thiếu, trong khi giao diện đã hỗ trợ hàng hết/nhận đặt khi `stock <= 0`.
- **Cách tái hiện:** Gọi `createProduct` trong VM với toàn bộ trường bắt buộc hợp lệ và `stock: 0`. Handler ném `BadRequestError` trước khi gọi model. Có thể tái hiện qua API `/api/create-product` bằng phiên admin trong môi trường test.
- **Tác động:** Chặn khởi tạo mặt hàng chưa có sẵn qua luồng quản trị, ảnh hưởng tính năng đặt theo yêu cầu.
- **Đề xuất sửa:** Validate `stock` là số nguyên không âm, phân biệt trường thiếu với số 0; tiếp tục chặn số âm, thập phân, chuỗi sai kiểu và giá trị quá lớn.
- **Độ chắc chắn:** **Chắc chắn**, đã tái hiện bằng mock.

### [MỨC ĐỘ: Medium] Trang chi tiết có thể bỏ sót đánh giá đã tồn tại

- **Vị trí:** `client/src/Pages/DetailProduct/DetailProduct.jsx:23`, `:33`; `server/src/controllers/previewProduct.controller.js:25`.
- **Mô tả:** Trang lấy endpoint đánh giá trang chủ, nơi lấy tối đa 10 đánh giá chung, rồi mới lọc theo sản phẩm ở client.
- **Cách tái hiện:** Fixture gồm 10 đánh giá sản phẩm A và 1 đánh giá sản phẩm B. Mock truy vấn `limit(10)` trả 10 bản ghi A; lọc theo B trả rỗng dù fixture có đánh giá B.
- **Tác động:** Người xem có thể thấy thông báo chưa có đánh giá sai thực tế.
- **Đề xuất sửa:** Tối thiểu dùng `previewProduct` đã có trong API chi tiết tại `server/src/controllers/products.controller.js:128`, `:138`, đồng thời thống nhất cấu trúc người đánh giá. Nếu số lượng lớn, bổ sung endpoint đánh giá theo sản phẩm có phân trang ở bước sau.
- **Độ chắc chắn:** **Chắc chắn**, đã tái hiện bằng mock.

### [MỨC ĐỘ: Medium] Các luồng đăng ký/khôi phục mật khẩu chưa đồng bộ tiếng Việt

- **Vị trí:** `client/src/Pages/Register/Register.jsx:23`, `:37`; `client/src/Pages/ForgotPassword/ForgotPassword.jsx:31`, `:42`; `server/src/services/vnpay.service.js:88`; `client/src/main.jsx:10`; `client/index.html:2`.
- **Mô tả:** Nhiều nhãn, validation, OTP và thông báo thành công/lỗi đang là tiếng Anh. Root chưa cấu hình locale tiếng Việt của Ant Design; HTML khai báo `lang="en"`. Một số lỗi nghiệp vụ API tiếng Anh có thể được hiển thị trực tiếp.
- **Cách tái hiện:** Mở `/register` hoặc `/forgot-password`, để trống trường và submit; quan sát tiêu đề/nhãn/thông báo. Đối chiếu static code xác nhận các chuỗi đang dùng; chưa thao tác OTP thật.
- **Tác động:** Hành trình khách Việt bị pha trộn ngôn ngữ, đặc biệt ở bước xác thực và xử lý lỗi thanh toán.
- **Đề xuất sửa:** Việt hóa frontend và thông báo nghiệp vụ API; cấu hình locale chung, formatter tiền/ngày và `lang="vi"`. Giữ nguyên key API, enum trạng thái và mã giao dịch để bảo toàn hợp đồng dữ liệu.
- **Độ chắc chắn:** **Chắc chắn** qua code; chưa chạy browser cho luồng OTP.

| Mức độ | Số lượng lỗi chắc chắn trong phạm vi này |
| --- | ---: |
| Critical | 0 |
| High | 1 |
| Medium | 4 |
| Low | 0 |

## 5. Nghi vấn cần xác minh trước khi bán thực tế

| Nội dung | Bằng chứng | Cách kiểm chứng và phương án |
| --- | --- | --- |
| Giá/tồn kho demo có thể được dùng như dữ liệu bán thực | Mapper gán giá/tồn kho demo tại `server/scripts/luxurytime-mapping.cjs:174`, `:178`; công bố trong mô tả tại `:190`. Checkout đọc `price` từ `products` tại `server/src/services/vnpay.service.js:98`. `docs/luxurytime-catalog-import.md` ghi nhận dữ liệu nhập ngày 13/10, không phải số liệu DB đã đọc lại hôm nay. | Đọc DB với projection tối thiểu, đối chiếu provenance và sản phẩm được publish; kiểm tra đường deploy. Đề xuất trường xác minh và quyền bán, gate tại server trước checkout. Chưa kết luận đang có giao dịch thật với giá demo. |
| Cam kết chính hãng/bảo hành đang hiển thị cứng cho mọi sản phẩm | `client/src/Pages/DetailProduct/DetailProduct.jsx:217`, `:225`; `client/src/Components/Footer/Footer.jsx:16`. Mapper ghi nguồn chưa được kiểm định tại `server/scripts/luxurytime-mapping.cjs:190`. | Đối chiếu hồ sơ hàng hóa, nội dung bảo hành và chính sách cửa hàng. Đề xuất hiển thị theo dữ liệu đã duyệt; trạng thái chưa xác minh phải được thể hiện rõ. |
| Huy hiệu chứng nhận trên footer cần xác minh thuộc cửa hàng | `client/src/Components/Footer/Footer.jsx:21`, `:25` dùng ảnh từ domain ngoài. | Chủ cửa hàng cung cấp trang xác minh phù hợp domain. Chỉ hiển thị huy hiệu khi có bằng chứng; không suy luận chứng nhận từ ảnh. |

Các mục này không cộng vào bảng lỗi chắc chắn. Chưa đọc `.env` thật, DB thật hoặc gửi giao dịch thanh toán trong lượt khảo sát.

## 6. Danh sách nâng cấp có thể duyệt theo mã

| Mã / ưu tiên | Hạng mục, cách tích hợp | Phạm vi chính | Điều kiện nghiệm thu |
| --- | --- | --- | --- |
| **A1 / P0** | Bảo vệ rich text: allowlist sanitize, kiểm tra các nơi render HTML, kế hoạch riêng cho nội dung cũ. | Controller sản phẩm/blog và trang chi tiết; dependency mới cần duyệt. | Chặn script/event handler/URL nguy hiểm; giữ được bảng, ảnh và định dạng hợp lệ; kiểm tra payload bằng browser test trên fixture. |
| **A2 / P0** | Làm rõ dữ liệu demo/chưa xác minh và điều kiện được bán. Bổ sung metadata xác minh/publish; kiểm soát ở API checkout; chính sách hiển thị theo dữ liệu đã duyệt. | Schema sản phẩm, service catalog/checkout, admin, card và chi tiết; migration cần preview/backup riêng. | Sản phẩm chưa đủ điều kiện không checkout được kể cả gọi API trực tiếp; hồ sơ cũ được xử lý theo kế hoạch đã duyệt; không tự chuyển giá/tồn kho demo thành dữ liệu xác thực. |
| **A3 / P1** | Sửa CRUD sản phẩm: đồng bộ field giữa schema/form/API, cho phép stock 0 và validate số. | `ManagerProduct.jsx`, `products.controller.js`, `products.model.js`. | Sửa và đọc lại được tên/thông số; tạo stock 0 thành công; dữ liệu âm/sai kiểu bị chặn. |
| **B1 / P1** | Việt hóa toàn bộ website và thông báo API, cấu hình Ant Design/dayjs, dùng formatter chung. | Root client, đăng nhập/đăng ký/OTP, storefront/admin, API có thông báo người dùng. | Không còn tiếng Anh ngoài tên riêng/thuật ngữ đã thống nhất; kiểm tra cả loading, lỗi, rỗng, toast và thành công; giữ nguyên API enum. |
| **B2 / P1** | Tìm kiếm và bộ lọc: tên + thương hiệu + model/reference, tìm tiếng Việt có/không dấu; kết hợp danh mục/thương hiệu, bộ máy, dây, kích thước, màu; sort và xóa lọc. | `Header.jsx`, `Category.jsx`, `catalog-browse.service.js`, `products.controller.js`. | URL giữ được lọc/trang; kết hợp điều kiện đúng; regex được escape, input/limit được validate; thứ tự ổn định; lọc/sort theo giá hiệu lực; đề xuất index theo truy vấn và dữ liệu thực. |
| **B3 / P1** | Chuẩn hóa trang chi tiết: ảnh zoom, bảng thông số đầy đủ, hướng dẫn chọn cỡ, nguồn/xác minh, bảo hành và giao dự kiến theo dữ liệu. | `DetailProduct.jsx`, schema sản phẩm và form admin. | Mobile dùng được; số liệu thiếu hiển thị rõ; không suy diễn kích thước/chống nước; nút mua/đặt theo yêu cầu khớp trạng thái khả dụng. |
| **B4 / P1** | Hoàn thiện chính sách/nhận diện: trang giao hàng, thanh toán, bảo hành, đổi trả, bảo mật, hướng dẫn mua; thay link `#`; chốt tên thương hiệu chung. | `Footer.jsx:35`, `Routes/routes.jsx`, nội dung trang và `contactInfo.js`. | Mỗi link có nội dung tiếng Việt đã duyệt; thông tin liên hệ thống nhất; cam kết và huy hiệu có bằng chứng. Tạm dùng ECOMMOR theo AGENTS; footer hiện ghi LuxTime. |
| **C1 / P2** | Điều hướng/trang thương hiệu/trang chủ: thương hiệu A–Z, bộ sưu tập, nhóm ngân sách; liên kết bài tư vấn với sản phẩm. | `Header.jsx`, `ProductNew.jsx`, `brand.model.js`, service brand và blog hiện có. | Tái sử dụng catalog; menu dùng được trên mobile/keyboard; nội dung quản trị được; thống kê bán chạy dựa trên dữ liệu bán thật. |
| **C2 / P2** | Đặt theo yêu cầu: tách hết hàng với được phép nhận đặt và ngừng bán; thời gian dự kiến do admin nhập; tiến trình liên hệ và lịch sử xử lý. | Model/service preorder, schema sản phẩm, `PreOrder.jsx`, `ManagerPreorder.jsx`. | Stock 0 không tự động đồng nghĩa nhận đặt; lịch chỉ hiển thị khi có nguồn; phân quyền và rate limit giữ đúng; duy trì yêu cầu đăng nhập hiện tại. |
| **C3 / P2** | Đánh giá: sửa nguồn dữ liệu chi tiết trước; sau đó cho người mua đã đủ điều kiện gửi đánh giá, có chống trùng/giới hạn và kiểm duyệt. | Controller/route/model `previewProduct`, `DetailProduct.jsx`; đối chiếu đơn hàng phía server. | Không mất đánh giá vì limit chung; không gắn nhãn đã mua nếu không có bằng chứng; rating 1–5, phân trang, bảo vệ dữ liệu cá nhân. Route ghi hiện yêu cầu admin tại `previewProduct.routes.js:8`; cần thiết kế quyền trước khi mở cho khách. |
| **D1 / P3** | Yêu thích, đã xem và so sánh tối đa 3 sản phẩm; lưu bộ lọc là tùy chọn. | `CardBody.jsx`, Header, store; model/API mới nếu đồng bộ tài khoản. | Khách lưu local chỉ ID sản phẩm, không lưu thông tin nhạy cảm; đồng bộ user có kiểm tra ownership; xử lý sản phẩm đã xóa/hết hàng/đổi giá. Đây là tính năng bổ sung đề xuất, không khẳng định cả hai nguồn đều có so sánh. |
| **D2 / P3** | SEO và hiệu năng: title/description/canonical theo trang, Product/Breadcrumb structured data từ dữ liệu thật, ảnh tối ưu, lazy load phần nặng. | `client/index.html:2`, `:9`, routes và các trang sản phẩm/danh mục/blog. | `lang=vi`; nội dung/meta đúng sản phẩm; đo bundle/Lighthouse trước-sau; ảnh có kích thước/alt; SEO rendering đánh giá riêng trước khi quyết định prerender/SSR. |

P0 → P1 → P2 → P3 là thứ tự đề xuất; không phải mức độ nghiêm trọng của mọi hạng mục. Các chức năng tài chính mới như escrow, trả góp, đặt cọc hoặc marketplace cần một phạm vi nghiệp vụ và phê duyệt riêng.

## 7. Quy ước tiếng Việt áp dụng xuyên suốt

- Giao diện, validation, thông báo API có thể hiện ra UI, email OTP, chatbot và trang quản trị dùng tiếng Việt có dấu. Log kỹ thuật có thể giữ tiếng Anh và mã lỗi ổn định.
- Locale `vi-VN`; tiền `VND`, ví dụ **12.500.000 ₫**; ngày **02/11/2026**, giờ **14:30** với timezone `Asia/Ho_Chi_Minh`. Số tiền tính bằng số nguyên VND ở server. Không mang ký hiệu GBP/USD từ trang tham khảo sang dữ liệu bán.
- Dùng thống nhất: **Giỏ hàng**, **Thanh toán**, **Yêu thích**, **Đặt hàng theo yêu cầu**, **Chờ xác nhận thanh toán**, **Đang giao hàng**, **Đánh giá từ người đã mua** khi có bằng chứng.
- Bộ máy hiển thị **Tự động (Automatic)**, **Máy pin (Quartz)** khi cần giải thích. Giữ nguyên tên thương hiệu, model, mã reference, VNPay, GHN và thuật ngữ kỹ thuật phù hợp.
- Chuẩn hóa từ điển nhãn chung và formatter dùng lại; ứng dụng một ngôn ngữ hiện tại có thể làm bằng module nội bộ. Chưa có lý do phải cài framework đa ngôn ngữ.
- Giữ nguyên key JSON, enum DB và mã lỗi máy đọc. Chỉ đổi phần trình bày/thông báo; lỗi không xác định dùng câu tiếng Việt an toàn, không hiển thị nguyên stack hoặc lỗi nội bộ.
- Test tiếng Việt có/không dấu cho tìm kiếm; kiểm tra font, độ dài nhãn trên mobile, `aria-label`, thông báo rỗng và lỗi từ thư viện.

## 8. Kết quả xác minh hiện trạng

| Kiểm tra | Kết quả thật |
| --- | --- |
| Bốn tình huống tái hiện trong Node VM, model được mock | **4/4 xác nhận hành vi lỗi**: stock 0 bị chặn; update bỏ field; HTML được chuyển nguyên tới persistence và có HTML sink; đánh giá B bị loại bởi limit chung. Không phải bốn lỗi đã sửa. |
| `cd client; node --test test` | **10/10 pass**, 0 fail/skip. Đây là test hiện có về config/proxy/auth redirect, không chứng minh các tính năng nâng cấp đã hoạt động. |
| `cd client; npm run lint` | Exit 0; **0 error, 1 warning** tại `client/src/Pages/Admin/Components/ManagerPreorder/ManagerPreorder.jsx:36`, liên quan ref trong cleanup effect. |
| Server integration suite, build, browser/mobile, giao dịch OTP/VNPay/GHN thật | **Chưa chạy trong lượt khảo sát này**. |

Tại thời điểm khảo sát, chưa sửa source code, `.env`, dữ liệu hoặc dependency; chỉ thêm báo cáo này. Việc triển khai sau phê duyệt được ghi riêng trong báo cáo triển khai.

## 9. Phạm vi đề nghị duyệt

Đề nghị bắt đầu bằng **A1 + A3 + B1**: xử lý rich text, sửa quản trị sản phẩm và Việt hóa. Đồng thời duyệt thiết kế **A2 + B4** để chốt dữ liệu được bán và chính sách. Sau đó triển khai **B2 + B3**, rồi chọn các hạng mục P2/P3 theo nhu cầu.

Trước khi sửa, đề nghị branch riêng theo nhóm việc và mỗi lỗi một commit khi được yêu cầu commit. Mọi thay đổi chỉ trong phạm vi được duyệt, có test tái hiện phù hợp và hồi quy catalog → giỏ hàng → checkout → VNPay/GHN. Dependency mới, migration dữ liệu và chính sách thương mại chưa được xem là đã duyệt cùng báo cáo.

**Phê duyệt đã nhận:** triển khai tất cả, ưu tiên code gọn; thêm `sanitize-html` và `dompurify`; dùng Node 22 riêng cho project, giữ Node mặc định của máy. Các đoạn đề nghị duyệt ở mục này được giữ như lịch sử khảo sát. Không tự chuyển dữ liệu tham khảo thành dữ liệu đã xác minh hoặc đặt ra cam kết thương mại chưa được cung cấp.
