# Đặt hàng theo yêu cầu

Tham khảo bố cục sản phẩm + thông tin khách hàng + ghi chú tại https://luxshopping.vn/dat-hang.aspx.

## Cách sử dụng

1. Quản trị viên chỉ bật nhận đặt hàng cho sản phẩm đã có `publicationStatus=published`, `allowPreorder=true` và `stock <= 0`. Sản phẩm cũ chưa có các cờ này không tự nhận yêu cầu.
2. Khách đăng nhập, bấm **Đặt hàng theo yêu cầu** tại sản phẩm. Trang `/dat-hang/:id` hiển thị sản phẩm, giá tham khảo, số lượng và form khách hàng.
3. Nhập họ tên, số điện thoại Việt Nam, số lượng 1–10 và đồng ý liên hệ. Email, địa chỉ dự kiến và ghi chú không bắt buộc.
4. Sau khi gửi thành công, khách nhận mã yêu cầu. Giá tạm tính được lấy từ sản phẩm trong DB, không nhận giá client.
5. Trong `/admin`, chọn **Yêu cầu đặt hàng** để lọc, đọc thông tin liên hệ, cập nhật trạng thái và ghi chú. Ghi chú xử lý được hiển thị cho khách, nên chỉ nhập nội dung có thể công khai với chủ yêu cầu.
6. Khách xem lịch sử tại mục **Đặt hàng theo yêu cầu** trong tài khoản. API `/api/preorders/mine` chỉ đọc yêu cầu thuộc phiên đăng nhập hiện tại.

## Trạng thái và dữ liệu

- `pending`: Chờ liên hệ → `contacted`, `confirmed` hoặc `cancelled`.
- `contacted`: Đã liên hệ → `confirmed` hoặc `cancelled`.
- `confirmed`: Đã xác nhận nhu cầu, kết thúc xử lý yêu cầu.
- `cancelled`: Đã hủy, kết thúc xử lý yêu cầu.

Dữ liệu lưu trong collection `preorders` với snapshot tên/model/giá sản phẩm, thông tin khách hàng, `userId` lấy từ phiên và lịch sử trạng thái. Admin đọc danh sách tổng/cập nhật trạng thái; khách chỉ đọc yêu cầu của mình. Endpoint gửi giới hạn 5 request/15 phút/IP. Hồ sơ cũ không có `userId` không tự gán cho tài khoản dựa trên email/số điện thoại.

Đây là yêu cầu cung ứng cho sản phẩm không có sẵn, chưa tạo đơn thanh toán, chưa giữ/trừ tồn kho và chưa thu tiền. Cửa hàng trao đổi nguồn hàng, giá, lịch giao và phương thức thanh toán với khách trước khi thực hiện đơn bán hàng. `expectedRestockAt` là lịch dự kiến, không phải cam kết giao hàng.

## Kiểm tra

```powershell
cd server
node --test test/preorder.test.cjs test/storefront-upgrades.test.cjs
npm test
cd ../client
npm run lint -- --quiet
npm run build
```

Chạy bằng Node 22 theo `.nvmrc`. Test preorder kiểm tra validation, giá lấy từ DB, schema, phân quyền bằng JWT RS256, phân trang, rate limit và điều kiện cập nhật nguyên tử. Test HTTP dùng model mock; integration trong `storefront-upgrades.test.cjs` dùng DB kiểm thử riêng khi có `MONGODB_TEST_URI`, kiểm tra quyền sở hữu/lịch sử và không dùng DB cửa hàng.

Khi MongoDB kiểm thử hoạt động, bật nhận đặt hàng cho một fixture có tồn kho 0 rồi gửi yêu cầu; đối chiếu mã trong admin; chuyển sang Đã liên hệ, rồi Đã xác nhận nhu cầu; kiểm tra lịch sử của đúng khách và thử tài khoản khác. Với sản phẩm còn hàng đã publish/xác minh, kiểm tra giỏ hàng/checkout thông thường. Kiểm tra form trên desktop và mobile.
