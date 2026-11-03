# Tích hợp GHN

## Kết quả hiển thị

**Checkout:** chọn địa chỉ theo danh mục GHN, nhập số nhà/đường, nhận phí vận chuyển và giao dự kiến. Khi đổi giỏ, mã giảm giá, địa chỉ hoặc phương thức thanh toán, báo giá được tính lại. Chưa có báo giá hợp lệ thì chưa đặt hàng được.

**VNPay:** shop hỗ trợ 50% tổng cước GHN. Phần lẻ một đồng làm tròn có lợi cho khách. **COD:** khách trả toàn bộ cước. Tổng thanh toán = tiền hàng − giảm giá + phí ship khách trả. Server tự tính, không tin số tiền/phí client gửi.

**Quản trị → Quản lý đơn hàng → Xem chi tiết:**

1. Xác nhận đơn hàng. Với VNPay, chờ IPN/đối soát xác nhận đã thanh toán.
2. Xem kiện ước tính hoặc nhập cân nặng/kích thước kiện thực tế.
3. Bấm **Kiểm tra phí kiện thực tế**.
4. Bấm **Tạo vận đơn GHN**, kiểm tra phí và xác nhận.
5. Xem mã vận đơn ở bảng hoặc trong chi tiết. Bấm **Đồng bộ trạng thái GHN** để cập nhật trạng thái, giao dự kiến và lịch sử GHN trả về.

Kết quả vận chuyển cũng hiển thị tại trang kết quả thanh toán và dòng mở rộng trong danh sách đơn của khách. Theo dõi hiện dùng nút đồng bộ của admin; không tự đăng ký webhook hoặc tự chuyển trạng thái nghiệp vụ của shop.

### Ví dụ đã kiểm tra trên staging

Tuyến/kiện thử 550g, 20 × 16 × 12cm, tiền hàng 1.000.000đ, không có coupon:

| Khoản | VNPay | COD |
|---|---:|---:|
| Cước GHN trả về | 69.900đ | 69.900đ |
| Shop hỗ trợ | 34.950đ | 0đ |
| Phí ship khách trả | 34.950đ | 69.900đ |
| Tổng thanh toán | 1.034.950đ | 1.069.900đ |

Đây là một kết quả thử nghiệm, không phải bảng cước cố định. Cước phụ thuộc địa chỉ, kiện hàng, khai giá và cấu hình tài khoản GHN. API giao dự kiến của tuyến này cũng trả về kết quả.

## Cấu hình

Server đọc ba biến hiện có, không sửa `.env` thật:

- `GHN_TOKEN`: token của đúng môi trường, chỉ dùng ở backend.
- `GHN_SHOP`: Shop ID của tài khoản.
- `GHN_ENV`: `sandbox`/`staging`/`test`/`dev`/`development` dùng staging; `production` dùng GHN thực tế.

Địa chỉ lấy hàng được lấy theo shop đã đăng ký với GHN. Cần restart backend sau khi đổi cấu hình. Khi deploy Docker, phải truyền ba biến này vào container backend bằng cơ chế môi trường đang dùng; không đưa token vào biến `VITE_*` hoặc image frontend.

Đơn hàng giữ snapshot môi trường và shop. Đổi môi trường/shop không khiến các đơn cũ tự chuyển sang tài khoản khác.

## Quy cách kiện hàng

Thông số sau là **ước tính vận hành, gồm hộp bảo vệ**, không phải cân nặng do hãng đồng hồ công bố:

| Nhóm | Điều kiện | Khối lượng | Dài × rộng × cao |
|---|---|---:|---|
| Da/cao su/khác | Mặc định | 550g | 20 × 16 × 12cm |
| Dây kim loại | Chuỗi chất liệu dây nhận diện thép/steel/metal/vàng/gold | 750g | 20 × 16 × 12cm |
| Cỡ lớn | Mặt >44mm hoặc dày >14mm | 900g | 24 × 20 × 14cm |

Nhóm cỡ lớn ưu tiên hơn nhóm dây. **Quản lý sản phẩm** có 4 ô cân nặng, dài/rộng/cao để nhập kiện thực tế của mỗi sản phẩm; nhập đầy đủ sẽ thay ước tính. Đơn nhiều đồng hồ cộng khối lượng, xếp các hộp theo lưới bảo thủ trong một kiện. Admin có thể nhập lại kiện tổng thực tế trước khi tạo vận đơn. Luồng này giới hạn một kiện dưới 20kg, mỗi chiều tối đa 200cm; kiện lớn hơn cần xử lý riêng.

Thông số thực tế nên được cân/đo trước khi dùng production. Nếu đổi kiện làm phí GHN tăng, chi phí chênh lệch do shop chịu; không sửa tổng tiền đơn đã đặt hoặc số tiền VNPay đã xác nhận.

## Quy tắc thu tiền và chống tạo trùng

- `payment_type_id=1`: shop trả phí cho GHN. Phần khách chịu được thu trong tổng đơn.
- COD: `cod_amount` bằng **tổng đơn đã chốt**, gồm phần ship khách trả. Không yêu cầu GHN thu thêm phí ship lần thứ hai.
- VNPay đã trả đủ: `cod_amount=0`.
- COD vượt giới hạn thu hộ 50 triệu bị chặn và hướng khách chọn VNPay.
- Khai giá áp dụng tối đa 5 triệu theo API đang dùng. Đơn vượt mức này có cảnh báo rõ ở checkout/quản trị, không coi toàn bộ đồng hồ đã được bảo hiểm.
- Báo giá có hạn 10 phút, gắn user, cart, phương thức, giá, số lượng và kiện. Hết hạn hoặc dữ liệu đổi thì phải lấy lại.
- Tính phí GHN trước khi tạo đơn; không gọi GHN bên trong transaction tồn kho/thanh toán. Checkout dùng báo giá đã lưu và xác minh lại snapshot trong transaction.
- Tạo vận đơn có khóa nguyên tử; `client_order_code` ổn định theo ID đơn. Timeout hoặc kết quả chưa rõ chuyển `unknown`; không tự tạo thêm. Đồng bộ tra theo mã nội bộ để phục hồi.
- Nếu GHN tạo xong nhưng DB chưa lưu được, khóa được giữ. Chờ ít nhất một phút rồi dùng Đồng bộ để lấy lại mã.
- Muốn hủy đơn đã có vận đơn: xử lý hủy tại tài khoản GHN, đồng bộ trạng thái `cancel`, sau đó hủy đơn shop. Chặn hoàn kho khi vận đơn còn hoạt động.

## API của ứng dụng

Tất cả route dưới `/api/shipping` yêu cầu đăng nhập:

- `GET /provinces`, `GET /districts?provinceId=...`, `GET /wards?districtId=...`.
- `POST /quote`: `{cartId, method, nameCoupon?, address:{provinceId,districtId,wardCode,street}}`.
- Checkout `/api/create-payment` nhận thêm `shippingQuoteId`.
- Admin: `POST /admin/orders/:id/preview`, `/create`, `/sync`. Preview/create nhận `parcel` nếu cần thay kiện; create cần `expectedFee` đúng với preview hiện tại.

Danh mục địa chỉ ba cấp là danh mục vận chuyển GHN dùng cho API phí và leadtime này. Giữ các mã GHN và tên đã xác minh trong snapshot.

## Xác minh

```powershell
cd server
node scripts/verify-ghn.cjs
# Chỉ staging: tạo một vận đơn dữ liệu thử, tra cứu hai cách, rồi hủy đúng vận đơn vừa tạo.
node scripts/verify-ghn.cjs --shipment
npm test

cd ../client
npm run lint
node --test test
npm run build
```

Đã gọi thật staging: xác thực shop; địa phương; phí và ETA; tạo vận đơn thử; GET chi tiết; GET theo mã nội bộ; hủy vận đơn thử thành công. Không tạo vận đơn production, không sửa đơn thực tế trong DB.

Unit/HTTP tests kiểm tra báo giá hết hạn, user khác, giỏ/giá đổi, hỗ trợ phí, COD không thu trùng, quyền admin, khóa tạo đồng thời, timeout và DB lỗi sau khi GHN tạo thành công. Nhóm tích hợp MongoDB cần `MONGODB_TEST_URI` trỏ tới replica set thử nghiệm. Kiểm tra thủ công giao diện với tài khoản của shop vẫn cần thực hiện trước khi vận hành production.

Đơn cũ thiếu snapshot GHN vẫn xem được, nhưng không tự suy đoán địa chỉ/mức phí để tạo vận đơn. MoMo tạm không hỗ trợ luồng GHN; chọn COD hoặc VNPay.

## Tài liệu chính thức

- [Tính phí](https://developer.ghn.vn/vi/docs/order/calculate-fee)
- [Giao dự kiến](https://developer.ghn.vn/vi/docs/order/leadtime)
- [Tạo đơn](https://developer.ghn.vn/vi/docs/order/create)
- [Tra cứu theo mã nội bộ](https://developer.ghn.vn/vi/docs/order/info-by-client-code)
- [Thông tin đơn](https://developer.ghn.vn/vi/docs/order/info)
