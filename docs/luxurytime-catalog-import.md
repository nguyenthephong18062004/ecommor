# Nhập sản phẩm LuxuryTime vào danh mục ECOMMOR

Ngày xác minh: 2026-10-13. Database: `watch`.

## Kết quả

| Hạng mục | Trước | Sau |
| --- | ---: | ---: |
| Sản phẩm trong `products` | 9 | 753 |
| Danh mục trong `categories` | 2 | 4 |
| Sản phẩm LuxuryTime trong danh mục | 0 | 744 |
| Dữ liệu nguồn trong `luxurytime_products` | 744 | 744 |
| Lỗi validation schema của dữ liệu ánh xạ | 0 | 0 |

Giữ nguyên 9 sản phẩm cũ. Tất cả trường nghiệp vụ trong schema `products` đều có giá trị đúng kiểu. Các giá trị thiếu bằng chứng được phân biệt bằng provenance, giá trị `Chưa xác minh`, `Theo hình ảnh sản phẩm`, hoặc `Không áp dụng`, không coi là thông tin đã được kiểm định.

744 sản phẩm mới gồm 584 Nam, 70 Nữ, 88 Unisex, 2 phụ kiện. Dùng lại ID danh mục Nam/Nữ hiện có; thêm Unisex và Phụ Kiện Đồng Hồ. Không đổi schema hoặc API/frontend để nhập dữ liệu.

## Quy tắc bổ sung

- Ưu tiên tên, Ref/mã sản phẩm, bộ máy, kích thước, vật liệu và ảnh từ bản cào. ID MongoDB xác định theo domain và ID nguồn; các biến thể cùng tên/Ref vẫn là sản phẩm riêng.
- Giữ nguyên 21 giá dương do nguồn cung cấp. 723 giá thiếu là **giá demo**, lấy trung vị nhóm cùng dòng, cùng thương hiệu, cùng nhóm chế tác/thông thường, rồi nhóm đồng hồ tham chiếu. Làm tròn 100.000 VND. Phụ kiện dùng 10% giá đồng hồ tham chiếu. Đây không phải định giá thị trường. Nhóm chế tác chỉ có một giá nguồn 86 triệu nên giá suy luận của nhóm có độ tin cậy thấp.
- `discount = 0`: giá nguồn đã là giá hiệu lực, không giảm giá lần hai. `soldCount = 0`: sản phẩm mới chưa có doanh số tại ECOMMOR.
- 525 mẫu có sẵn được gán tồn kho **demo 10**, từ trung vị tồn kho dương của đồng hồ cũ và giới hạn tối đa 10. 219 mẫu ghi hàng đặt/order có tồn kho 0, dù cờ WooCommerce chung là có hàng.
- Giới tính lấy từ tên/thông số; thiếu thì suy luận theo kích thước: <=34 mm là Nữ, >=40 mm là Nam, còn lại Unisex. Phụ kiện vào danh mục riêng.
- Chuẩn hóa kích thước có dấu phẩy thập phân. Kích thước vỏ chữ nhật dùng chiều ngắn; nhiều lựa chọn size lấy lựa chọn đầu tiên. Bản nguồn giữ nguyên các lựa chọn.
- Kính, dây, niềng và trữ cót thiếu được bổ sung theo giá trị phổ biến từ nhóm cùng dòng/thương hiệu có thông tin, rồi từ các đồng hồ nguồn. Các trường này được đánh dấu `demo`, không phải thông số đã đo đạc.
- Độ dày thiếu dùng trung vị thông số cùng thương hiệu; nếu không có, dùng độ dày hợp lý 5–20 mm của đồng hồ cũ, cuối cùng mặc định 12 mm. Kết quả là dữ liệu demo.
- Không lấy tên thương hiệu trong cột “Xuất xứ” làm quốc gia sản xuất. Xuất xứ và bảo hành quốc tế chưa xác minh được ghi rõ. Mức chống nước chỉ dùng giá trị nguồn có sẵn; không suy diễn khả năng chống nước.
- Màu mặt số chỉ lấy các cột nói rõ mặt dial; thiếu ghi `Theo hình ảnh sản phẩm`. Không lấy màu dây/vỏ làm màu mặt số.
- Phụ kiện không có mặt số/bộ máy: trường dạng số không áp dụng dùng 0, trường chữ dùng `Không áp dụng`; kích thước lắp ghép thật nằm trong mô tả nguồn.
- Toàn bộ URL ảnh nằm trong trường `images` phân cách bằng dấu phẩy, theo quy ước frontend. Không tải file ảnh.
- Mô tả được tạo lại từ text và bảng thông số đã escape HTML, kèm nguồn và danh sách trường demo. Không chèn trực tiếp HTML chưa tin cậy từ website.

## Theo dõi nguồn và chạy lại

`luxurytime_products.catalog` lưu `productId`, phiên bản mapper, ngày nhập, provenance từng trường và `demoFields`. `sourceData` giữ nguyên; đã so sánh SHA-256 trước/sau.

Preview, chạy từ `server/`:

```powershell
node scripts/import-luxurytime-catalog.cjs
```

Nhập dữ liệu demo theo quyền đã được người dùng cấp:

```powershell
node scripts/import-luxurytime-catalog.cjs --apply --demo-data
```

Script không cho apply khi `NODE_ENV=production`. Trước ghi có backup sản phẩm/danh mục/dữ liệu nguồn. Tạo danh mục, sản phẩm và liên kết provenance trong MongoDB transaction. `$setOnInsert` cùng ID cố định đảm bảo chạy lại không đặt lại giá, tồn kho, doanh số hay timestamp của sản phẩm đã có. Không tự sửa các bản ghi đã nhập khi thay đổi mapper.

Artifact tại `.runtime/exports/luxurytime-2026-10-13/`:

- `catalog-plan.json`: toàn bộ dữ liệu ánh xạ và quy tắc từng trường.
- `catalog-backup-1791876860941.json`: snapshot trước lần nhập đầu.
- `catalog-import-report.json`: kết quả lần nhập đầu, thêm 744, sửa sản phẩm cũ 0.
- `catalog-repeat-report.json`: lần chạy lại, thêm 0, sửa 0, tổng vẫn 753.
- `catalog-api-verification.json`: kết quả kiểm tra HTTP và ảnh mẫu.
- `verify-catalog-api.cjs`: kiểm tra danh mục hiện tại so với plan; cần backend 3000 và Vite 5173 đang chạy.

## Xác minh

- Schema validation: 744/744 pass, mọi trường nghiệp vụ có dữ liệu đúng kiểu.
- Đọc lại trong transaction: toàn bộ trường của 744 sản phẩm khớp plan; 9 sản phẩm cũ giữ nguyên.
- API qua Vite 5173: danh sách 753 sản phẩm, đối chiếu đầy đủ 744 bản nhập; 4 danh mục lọc đúng.
- API quản trị qua backend 3000: 753 sản phẩm, join danh mục hợp lệ.
- Chi tiết 6 mẫu gồm đồng hồ có giá nguồn, giá demo, hàng đặt, phụ kiện: pass. Tìm kiếm Nautilus: pass.
- 3 URL ảnh mẫu trả HTTP 200, `image/jpeg`; không khẳng định đã kiểm tra tải được toàn bộ 6.438 URL ảnh duy nhất.
- `client`: `npm run lint` pass, 0 error/0 warning; `npm run build` pass, 1 cảnh báo bundle >500 kB (main JS 2.956,82 kB).
- `client`: `node --test test`, 8/8 pass.
- `server`: `npm test` với MongoDB test replica set riêng, 57/57 pass, 2 integration suites, 0 fail/skip. Có 9 lần cảnh báo Mongoose `collection` reserved pathname từ schema cũ; test mapper thêm một process sử dụng schema này.
- Không thực hiện giao dịch OTP mới hoặc đặt hàng thật. Kiểm tra giao diện bằng API, chưa xác minh bằng browser screenshot.

## Giới hạn sử dụng

Người dùng đã cho phép tự bổ sung dữ liệu để hoàn thiện catalog. Giá/tồn kho và thông số suy luận phù hợp dữ liệu demo, cần thay bằng số liệu đã xác minh trước khi bán thực tế. Mô tả nguồn có thể chứa thông tin replica/factory/chế tác; việc nhập không xác nhận tính chính hãng.
