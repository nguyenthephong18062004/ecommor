v # ECOMMOR — Kết quả nâng cấp storefront

Ngày: **02/11/2026**. Branch: `fix/storefront-upgrades`.

Người dùng đã duyệt triển khai toàn bộ [đề xuất tham khảo website](reference-websites-upgrade-proposal.md), giữ code gọn, thêm hai dependency bảo mật và dùng Node 22 riêng cho project. Các chức năng bên dưới đã được tích hợp vào repository; chưa deploy. Những chỉnh sửa có sẵn trước phiên làm việc được giữ lại, chưa tạo commit.

## Phạm vi đã tích hợp

| Mã | Kết quả | Vị trí chính |
| --- | --- | --- |
| A1 | Allowlist HTML tại server khi ghi/đọc sản phẩm và blog; DOMPurify dùng chung ở mọi nơi render rich text. Giữ bảng/ảnh/định dạng được phép, loại script, event handler, iframe và URL nguy hiểm. Nội dung DB cũ được lọc khi trả API, không tự ghi lại DB. | `server/src/utils/richText.js`, `client/src/Components/RichText.jsx` |
| A2 | Trạng thái publish/xác minh/demo, căn cứ xác minh và cờ nhận đặt hàng rõ ràng. Server kiểm tra trước giỏ hàng/checkout; thao tác giữ kho cũng kiểm tra trạng thái. UI và structured data phản ánh điều kiện được bán. Mapper import luôn tạo dữ liệu tham khảo. | `server/src/services/product-data.service.js`, `server/src/services/vnpay.service.js`, `server/src/models/products.model.js` |
| A3 | CRUD cập nhật đầy đủ field, nhận stock 0, validate số/ngày/trạng thái, reset đúng form/editor; danh sách quản trị yêu cầu quyền admin, bỏ truy vấn danh mục trong vòng lặp. | `server/src/controllers/products.controller.js`, `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx` |
| B1 | Locale Ant Design/dayjs/TinyMCE tiếng Việt; formatter VND và ngày giờ Việt Nam; Việt hóa các luồng xác thực, OTP/email, catalog, quản trị và thông báo nghiệp vụ trong phạm vi nâng cấp. Tên riêng, model và enum API được giữ nguyên. | `client/src/main.jsx`, `client/src/utils/format.js`, `client/public/langs/vi.js`, controller/service liên quan |
| B2 | Tìm tên/thương hiệu/model/bộ sưu tập có hoặc không dấu; kết hợp danh mục/thương hiệu/bộ máy/dây/màu/kích thước/giá; sort theo giá sau giảm, phân trang 20 sản phẩm; URL lưu điều kiện, xóa lọc, lưu bộ lọc theo tài khoản. Escape regex, giới hạn input và ID. | `server/src/services/catalog-browse.service.js`, `client/src/Pages/Category/Category.jsx`, `client/src/Components/Header/Header.jsx` |
| B3 | Ảnh phóng to, bảng thông số chung, tình trạng/hộp/giấy tờ, căn cứ xác minh, ngày hàng dự kiến, hướng dẫn chọn kích thước và liên kết chính sách; số lượng mua được gửi đúng API. | `client/src/Pages/DetailProduct/DetailProduct.jsx` |
| B4 | Thống nhất tên ECOMMOR, trang mua hàng/thanh toán/giao hàng/bảo hành/đổi trả/bảo mật; bỏ huy hiệu và cam kết chung chưa có bằng chứng. Điều khoản thương mại chưa được cung cấp yêu cầu cửa hàng xác nhận theo sản phẩm. | `client/src/config/policies.js`, `client/src/Pages/Policy.jsx`, Header/Footer |
| C1 | Trang thương hiệu A–Z, giới thiệu/logo có thể quản trị, liên kết điều hướng thương hiệu/danh mục và gợi ý ngân sách trên trang chủ. Dùng chung dữ liệu tùy chọn catalog. | `client/src/Pages/Brands.jsx`, `client/src/Pages/Admin/Components/ManagerBrands.jsx`, `server/src/services/brand.service.js` |
| C2 | Nhận đặt hàng khi admin bật rõ ràng; gắn chủ yêu cầu từ phiên đăng nhập, lịch sử trạng thái/ghi chú; khách chỉ xem yêu cầu của mình, admin cập nhật theo chuyển trạng thái hợp lệ. | `server/src/services/preorder.service.js`, `client/src/Components/PreorderHistory.jsx`, `docs/preorder-flow.md` |
| C3 | Chỉ người có đơn đã thanh toán và giao thành công mới gửi đánh giá sản phẩm đã mua; giới hạn rating/nội dung, chống đánh giá trùng. Đánh giá mới chờ admin duyệt; API lọc theo sản phẩm trước phân trang. Nhãn đã mua chỉ có khi có bằng chứng đơn hàng. | `server/src/controllers/previewProduct.controller.js`, `client/src/Components/ProductReviews.jsx`, `client/src/Pages/Admin/Components/ManagerReviews.jsx` |
| D1 | Yêu thích cho khách và tài khoản, hợp nhất khi đăng nhập; so sánh tối đa 3 mẫu, đã xem 12 mẫu, lưu tối đa 10 bộ lọc và 8 địa chỉ. Preferences được server giới hạn/allowlist, lấy chủ sở hữu từ phiên; checkout chọn lại địa chỉ đã lưu. | `client/src/hooks/useShoppingLists.js`, `client/src/Pages/Collections.jsx`, `client/src/Components/AddressBook.jsx`, `server/src/services/preferences.service.js` |
| D2 | Title/description/canonical, Product và Breadcrumb JSON-LD; ảnh lazy có kích thước, request có abort/timeout/loading/error; route và panel quản trị lazy-load, error boundary. Chỉ có Offer cho dữ liệu đã publish/xác minh. | `client/src/hooks/useSeo.js`, `client/src/Components/SiteHead.jsx`, `client/src/Routes/routes.jsx`, `client/src/hooks/useFetch.jsx` |

Đây là ứng dụng React SPA; metadata được cập nhật phía client, chưa bổ sung SSR/prerender hay khẳng định mọi crawler đều đọc được. Các index catalog đã khai báo trong schema, chưa chạy migration index riêng trên DB cửa hàng hoặc đo query planner tại production.

## Điều kiện bật bán và dữ liệu hiện tại

Lệnh kiểm tra chỉ đọc `server/scripts/check-catalog-readiness.cjs` ghi nhận **753 sản phẩm**, trong đó **753 chưa có trạng thái xác minh/publish**, **0 đủ điều kiện mua**, **0 đủ điều kiện nhận đặt hàng theo yêu cầu**. Đây là ảnh chụp tại lúc kiểm tra, không phải dữ liệu được sửa.

Trước khi bán, admin cần kiểm tra giá VND, tồn kho, nguồn hàng, thông số, ảnh, bảo hành và cấu hình kiện hàng GHN. Để mua qua giỏ hàng, đặt `publicationStatus=published`, `verificationStatus=verified`, nhập căn cứ xác minh và `stock>0`. Căn cứ xác minh là thông tin công khai ở trang sản phẩm, không nhập tài liệu nội bộ hoặc dữ liệu cá nhân vào trường này.

Để nhận yêu cầu cung ứng, admin đặt `publicationStatus=published`, `allowPreorder=true`, `stock<=0`; ngày dự kiến có hàng là tùy chọn. Yêu cầu cung ứng chưa tạo đơn bán, thu tiền hay giữ kho. Sản phẩm archived không hiển thị tại catalog công khai.

Không tự publish hoặc xác minh hàng loạt, không đổi giá/tồn kho demo thành giá trị bán thật, không chạy migration ghi DB, không sửa `.env` thật. Các giỏ hàng cũ chứa sản phẩm chưa đủ điều kiện sẽ bị server từ chối khi thanh toán, yêu cầu kiểm tra lại sản phẩm.

## Giữ code gọn

Đối chiếu với bản source lưu trước khi sửa, JS/JSX trong `client/src` và `server/src` tăng từ **13.420 lên 13.925 dòng: +505 dòng, khoảng 3,8%**. Không tính test, tài liệu, SCSS, file build và language pack bên thứ ba. Số dòng là chỉ báo phạm vi, không phải thước đo chất lượng độc lập.

- Dùng chung validator/điều kiện bán, formatter, bảng thông số, rich text, product shelf/actions và preferences; giữ một component cho ba danh sách yêu thích/so sánh/đã xem.
- `products.controller.js`: **255 → 167 dòng**; `DetailProduct.jsx`: **342 → 138 dòng**; `ManagerProduct.jsx`: **422 → 369 dòng**.
- Không thêm framework i18n, state management, SEO hay thư viện UI mới. Chỉ thêm hai dependency trực tiếp đã duyệt: `sanitize-html@2.18.1` và `dompurify@3.4.17`; giữ nguyên phiên bản các dependency cũ trong lockfile.
- Build hiện tại có entry JS khoảng **797,52 kB** trước gzip (**266,38 kB** gzip); panel thống kê khoảng **1.201,34 kB** được tải riêng theo trang quản trị. Vite còn cảnh báo chunk trên 500 kB; chưa đo Lighthouse hay tốc độ trên thiết bị thật.

## Runtime và nguồn phụ trợ

`.nvmrc` dùng **22.21.1**, `engines.node` yêu cầu **>=22.12.0**; Docker dùng Node 22. Hai launcher PowerShell chọn Node của project mà không đổi Node mặc định của máy. Đã xác nhận Node mặc định vẫn là **20.19.6**, binary kiểm thử project là **22.21.1**.

Bản `sanitize-html` được chọn theo [package chính thức](https://github.com/apostrophecms/apostrophe/tree/main/packages/sanitize-html); lọc phía client theo [DOMPurify](https://github.com/cure53/DOMPurify). Locale UI theo [Ant Design](https://ant.design/docs/react/i18n/) và [TinyMCE](https://www.tiny.cloud/docs/tinymce/latest/ui-localization/).

File `client/public/langs/vi.js` lấy từ [language pack TinyMCE 7 chính thức](https://download.tiny.cloud/tinymce/community/languagepacks/7/langs.zip), giữ nguyên nội dung vendor, kích thước **20.490 byte**, SHA-256 `46d85e4239df1904b7477387781687dbf422766b4c9d0be3433117ca39dc9928`. ESLint bỏ qua thư mục locale vendor.

## Xác minh

| Kiểm tra | Kết quả |
| --- | --- |
| Server, Node 22, MongoDB replica set kiểm thử riêng | **104/104 pass**, 5 suites, 0 fail/skip |
| Client, Node 22 | **12/12 pass**, 0 fail/skip |
| ESLint client | **Exit 0**, 0 error/warning |
| Vite production build | **Exit 0**; còn cảnh báo kích thước chunk nêu trên |
| Render smoke bằng ReactDOMServer với context/router fixture | **7/7 trang render được**; đây không phải test browser hay SSR production |
| So sánh lockfile trước/sau | Không đổi phiên bản dependency cũ; chỉ thêm hai dependency trực tiếp đã duyệt và phụ thuộc bắc cầu |
| `npm audit --omit=dev`, server | **28 cảnh báo**: 3 critical, 17 high, 8 moderate; bằng baseline trước nâng cấp |
| `npm audit --omit=dev`, client | **23 cảnh báo**: 2 critical, 19 high, 2 moderate; bằng baseline trước nâng cấp |

Hai dependency mới không có cảnh báo trong kết quả audit tại thời điểm kiểm tra. Số cảnh báo audit không chứng minh toàn bộ package đều có đường khai thác trong ứng dụng. Chưa nâng các dependency cũ ngoài phạm vi đã duyệt; các cảnh báo cũ vẫn cần được rà soát riêng, không coi bản này là đã xử lý hết bảo mật hệ thống.

Test mới tập trung vào sanitizer, dữ liệu sản phẩm đầy đủ/stock 0, quyền admin và archived, điều kiện bán/đặt hàng, tìm tiếng Việt và bộ lọc kết hợp, preferences chống IDOR/mass assignment, đánh giá theo đơn đã mua/duyệt/trùng/phân trang và lịch sử yêu cầu đúng chủ. Test hồi quy hiện có kiểm tra thêm checkout, VNPay, OTP, GHN và session trên fixture.

Log kiểm tra được lưu cục bộ ở `.runtime/upgrade-server-final-tests.log`, `.runtime/upgrade-client-final-tests.log`, `.runtime/upgrade-client-final-lint.log`, `.runtime/upgrade-client-final-build.log`; `.runtime` không được commit.

Không có browser khả dụng trong phiên nên **chưa kiểm tra giao diện trực quan, tương tác browser/mobile hoặc payload XSS trong browser thật**. Chưa build/run Docker image, chưa deploy, chưa gửi OTP thật, thanh toán VNPay thật hoặc tạo vận đơn GHN thật. Đây là những bước nghiệm thu môi trường cần làm tiếp; test mock/integration không thay thế các bước đó.

### Chạy lại trên Windows

Sau khi cài Node 22 theo `.nvmrc`, dùng `run-dev.ps1` để chạy dev bằng binary riêng. Với các lệnh kiểm tra trực tiếp, bảo đảm terminal đang dùng Node 22 hoặc gọi binary đã cài:

```powershell
. ./scripts/project-node.ps1
$projectNode = Get-ProjectNode

# Trong client/
& $projectNode --test
& $projectNode node_modules/eslint/bin/eslint.js .
& $projectNode node_modules/vite/bin/vite.js build

# Trong server/, chỉ trỏ tới DB kiểm thử riêng
$env:MONGODB_TEST_URI = 'mongodb://127.0.0.1:27019/?replicaSet=rs0&directConnection=true'
& $projectNode --test
```

Không dùng DB cửa hàng làm `MONGODB_TEST_URI`. Xem các test integration để biết yêu cầu môi trường replica set; nếu thiếu URI, cần kiểm tra các test bị skip thay vì coi đó là kết quả đầy đủ.
