# Quy ước tích hợp và xác thực

## Địa chỉ và định dạng

| Nội dung | Hiện trạng |
| --- | --- |
| Backend dev | `http://localhost:3000` |
| Frontend Vite proxy | `http://localhost:5173`, proxy `/api`, `/uploads`, `/socket.io` |
| Production | Dùng origin đã deploy và reverse proxy/cấu hình thực tế; không có domain production cố định trong tài liệu |
| API prefix | `/api`; giữ nguyên chữ hoa/thường và tên route hiện có |
| Body thường | `Content-Type: application/json` |
| Upload | `multipart/form-data`; để client tự đặt boundary |
| ID | MongoDB ObjectId; dùng ID từ môi trường thử, không dùng ID fixture như ID thật |
| Giá | Số nguyên VND, JSON number; VNPay callback nhân 100 |
| Kích thước đồng hồ | mm; kiện GHN dùng gram và cm |
| Ngày giờ | JSON date ISO 8601; frontend hiển thị `vi-VN`, timezone `Asia/Ho_Chi_Minh` |
| Ngày hàng về | Input `expectedRestockAt` là `YYYY-MM-DD`, có thể `null`/chuỗi rỗng để bỏ ngày |
| Ảnh sản phẩm | Chuỗi URL phân cách dấu phẩy; URL http(s) hoặc `/uploads/...`, không phải array |

Server không có version prefix `/v1`. Route như `get-product-manufactured`, `create-preview-product` giữ tên legacy nhưng ý nghĩa thực tế lần lượt là sản phẩm giảm giá và gửi đánh giá.

Nguồn: `client/vite.config.js:38`, `server/src/server.js:3`, `server/src/services/product-data.service.js:42`, `server/src/services/shipping-package.js:3`.

## Cookie và quyền truy cập

| Cookie | Vai trò | Thời hạn phát hành | Bảo vệ |
| --- | --- | --- | --- |
| `token` | Access JWT cho `authUser`/`authAdmin` | 15 phút | httpOnly |
| `refreshToken` | Gọi `GET /api/refresh-token` | 7 ngày | httpOnly |
| `logged` | Gợi ý trạng thái UI, không phải bằng chứng phân quyền | 7 ngày | Không httpOnly |
| `tokenResetPassword` | Bằng chứng đã xác minh OTP quên mật khẩu | 5 phút | httpOnly |

Cookie có `path=/`; dev `sameSite=Lax`, không secure; production `sameSite=Strict`, secure. Không tự đổi domain `localhost` ↔ `127.0.0.1` giữa login và request tiếp vì cookie host-only có thể không được gửi. Production cần HTTPS và kiến trúc cùng site phù hợp các flag hiện tại.

Auth dùng JWT RS256 do server verify với khóa phiên trong DB. Backend đọc `req.cookies.token`, **không đọc `Authorization: Bearer`**. Admin là tài khoản có `isAdmin=true`; cùng kiểu đăng nhập/cookie với khách. Không có header đặc biệt để tự nhận vai trò admin.

| Nhãn trong reference/source-map | Ý nghĩa |
| --- | --- |
| public | Route không có middleware `authUser`/`authAdmin`; vẫn có thể cần cookie riêng, chữ ký nhà cung cấp hoặc đang có caveat |
| user | Cookie access hợp lệ, handler lấy chủ từ session |
| admin | Cookie access hợp lệ và `isAdmin=true` theo DB |

OpenAPI dùng `sessionCookie`, `refreshCookie`, `resetCookie` dưới `securitySchemes`. Role admin được ghi ở mô tả và `x-route-auth`; cookie scheme không có cơ chế OAuth scope. Login trả token trong metadata hiện tại và đặt cookie; phía web nên dùng cookie, không thêm một cơ chế lưu token khác chỉ vì response có field đó.

Nguồn: `server/src/auth/checkAuth.js:11`, `:24`; `server/src/services/tokenSevices.js:25`; `server/src/controllers/users.controller.js:49`, `:139`, `:184`, `:570`.

## Gọi từ browser và cURL

Ví dụ dùng cookie do login đã thiết lập, chỉ đọc danh sách giỏ:

```js
const response = await fetch('http://localhost:3000/api/get-cart', {
  credentials: 'include',
});
const payload = await response.json();
if (!response.ok) throw new Error(payload.message || 'Không gọi được API');
```

Với cURL, đăng nhập từ file JSON cục bộ có trường `email`/`password` của tài khoản thử, tránh ghi mật khẩu trực tiếp vào lịch sử lệnh:

```powershell
curl.exe -sS -c .runtime/api-cookies.txt -H "Content-Type: application/json" --data-binary "@.runtime/api-login.local.json" http://localhost:3000/api/login
curl.exe -sS -b .runtime/api-cookies.txt http://localhost:3000/api/auth
```

File login/cookie jar là dữ liệu nhạy cảm cục bộ, không đưa vào bộ tài liệu hoặc commit. Thư mục `.runtime` đã được dự án bỏ qua qua gitignore. Đây là lệnh mẫu, chưa được chạy để đăng nhập trong quá trình soạn tài liệu.

CORS cho phép origin theo `DOMAIN_URL`, `CLIENT_URL`, `CLIENT_ORIGINS`; thêm origin dev theo code. Cần `credentials:include`/`withCredentials:true`; `logged` hoặc thông tin user phía client không thay được xác thực server. Postman không kiểm tra CORS như browser. Swagger UI chạy trên origin khác có thể không gửi cookie được; tài liệu này không cài hoặc host Swagger UI.

## Response thực tế

Phần lớn API dùng envelope:

```json
{
  "message": "Thông báo từ server",
  "statusCode": 200,
  "metadata": {}
}
```

Các ngoại lệ cần xử lý riêng:

| Nhóm | Body |
| --- | --- |
| Coupon list `/api/coupons` | `{ "success": true, "coupons": [] }` |
| Coupon create/update/delete | `{ "message": "..." }` |
| Upload sản phẩm | `{ "message": "...", "images": ["/uploads/products/..."] }` |
| Upload blog | Envelope, `metadata` là một đường dẫn string |
| Kiểm tra admin | `{ "message": true }` |
| Dashboard statistical | `{ "success": true, "message": "...", "metadata": {} }`; không có statusCode ở body |
| Chatbot | `{ "message": "...", "statusCode": 200, "requestId": "...", "metadata": "text" }` |
| VNPay Return | HTTP 302 với Location; không phải JSON paid |
| VNPay IPN | HTTP 200 với `{ "RspCode": "00", "Message": "..." }`; phải đọc RspCode và trạng thái đơn |

Checkout `POST /api/create-payment` trả HTTP **201**: `metadata` là **Order object** cho COD hoặc **URL string** cho VNPay. Frontend tự điều hướng đến URL; không chờ backend HTTP 302 từ endpoint checkout.

Lỗi qua middleware toàn cục thường là `{ "success": false, "message": "..." }`. Rate limiter có thể chỉ trả `message`. Chatbot thêm `errorCode`/`requestId` ở một số lỗi. Không dựa vào duy nhất `statusCode` trong body vì không phải route nào cũng có.

## HTTP status và lỗi nghiệp vụ

| Status | Cách hiểu trong project |
| --- | --- |
| 200 | Đọc/cập nhật thành công; riêng IPN phải đọc RspCode |
| 201 | Tạo sản phẩm/giỏ mới/đơn/review/preorder/tin nhắn; đăng ký đã nhận yêu cầu OTP |
| 202 | Thông báo chung gửi/resend OTP; chưa chứng minh email tồn tại hoặc thư đã chuyển phát |
| 302 | Return URL VNPay/nhánh MoMo legacy điều hướng |
| 400 | Validator có khai báo rõ, dữ liệu/callback sai |
| 401 | Thiếu/sai/hết hạn access cookie; một số cookie proof/refresh sai |
| 403 | Không đủ quyền **hoặc** lỗi nghiệp vụ legacy: `BadRequestError` mặc định là 403, gồm sai mật khẩu và nhiều lỗi giỏ |
| 404 | Những handler chủ động trả not found; không áp dụng đồng nhất toàn bộ API |
| 409 | Xung đột tồn/giá/trạng thái, review trùng, cập nhật đồng thời |
| 422 | Chatbot bị bộ lọc an toàn chặn |
| 429 | Rate limit/cooldown |
| 500 | Lỗi nội bộ; route async legacy có thể chưa đưa lỗi tới middleware đúng cách |
| 502/503/504 | Theo nhóm nhà cung cấp/cấu hình/timeout; GHN hiện thường gộp lỗi upstream thành 503, chatbot phân loại chi tiết hơn |

Mã trong reference là các nhánh đã có hoặc lỗi chung liên quan, không bảo đảm mọi lỗi của legacy handler đều trả đúng envelope. Không biến toàn bộ 403 thành “logout”: cần phân biệt lỗi nghiệp vụ với phiên hết hạn 401. Route không tồn tại có thể trả trang 404 HTML mặc định Express vì chưa có JSON not-found handler; kiểm tra Content-Type trước khi parse JSON khi gọi path tự nhập.

Nguồn: `server/src/core/error.response.js:28`, `server/src/core/success.response.js:6`, `server/src/server.js:99`, `server/src/services/ghn.client.js:16`.

## Phân trang, retry và giới hạn

| API | Quy tắc |
| --- | --- |
| catalog-browse | 20/trang, `page` số nguyên dương; vượt cuối về trang cuối |
| product-catalog | 10/trang; type=new luôn trang 1 và có sections |
| reviews/moderation | 10/trang, page ≤100.000 |
| preorders/mine/admin | page mặc định 1, limit mặc định 20, tối đa 100; page ≤100.000 |
| Các danh sách admin/blog/coupon/đơn/tin nhắn còn lại | Chưa có phân trang trong handler hiện tại |
| Gửi OTP | Middleware chung 5/giờ/IP; thêm cooldown 60 giây, tối đa 5 mã/giờ/email+mục đích |
| Verify OTP | 15 request/15 phút/IP; OTP tối đa 5 lần sai, sống 10 phút |
| Preorder | 5 request/15 phút/IP |
| Review mới | 10 request/giờ/IP |
| Shipping | 60 request/phút/IP chung cho router |
| Chatbot | 10 request/phút/IP; câu hỏi 1.000 ký tự, lịch sử 10 tin, output tối đa 1.024 tokens |

Chỉ checkout/giữ kho/callback và một số thao tác vận đơn có cơ chế chống lặp cụ thể. Không suy diễn các POST CRUD, upload, tin nhắn, review và preorder đều idempotent. GET logout/read-message có tác dụng ghi; GET get-cart có thể làm sạch dữ liệu giỏ.

Một số route chưa bảo đảm các giới hạn an toàn mong muốn như upload và validation tài khoản. Xem [giới hạn hiện trạng](limitations.md); tài liệu không tự sửa các giới hạn này.
