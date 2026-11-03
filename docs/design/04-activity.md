# 04 — Activity và state machine

Activity có swimlane theo trách nhiệm thực tế; không thêm fork/join khi code chạy tuần tự hoặc hai callback độc lập không có đồng bộ. Các nhánh lỗi rút gọn từ sequence tương ứng; lỗi DB sau ghi ngoài transaction có thể để lại dữ liệu một phần. Sơ đồ không có nghĩa đã chạy hệ thống.

## Đăng ký và xác minh email

**Phạm vi:** UC-01, UC-02, UC-03.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/controllers/users.controller.js:60`; `client/src/Pages/Register/Register.jsx:1`; `server/src/routes/users.routes.js:12`; `server/src/services/otp.service.js:20`; `server/src/services/mail.service.js:21`; `server/src/controllers/users.controller.js:522`; `client/src/Pages/Register/Register.jsx:1`; `server/src/routes/users.routes.js:13`; `server/src/services/otp.service.js:20`; `server/src/services/mail.service.js:21`; `server/src/controllers/users.controller.js:539`; `client/src/Pages/Register/Register.jsx:1`; `server/src/routes/users.routes.js:14`; `server/src/services/otp.service.js:20`; `server/src/services/mail.service.js:21`.

Nguồn sơ đồ: [uml/act-01.puml](uml/act-01.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Khách vãng lai|
start
:Nhập thông tin đăng ký;
|Frontend|
:Validate form; POST register;
|Backend|
if (IP/record vượt hạn?) then (Có)
 :Trả 429;
 stop
endif
if (Dữ liệu hợp lệ?) then (Không)
 :Trả 400;
 stop
endif
if (Email đã tồn tại?) then (Có)
 :Trả 202 thông báo chung;
 stop
endif
:Bcrypt password; issue OTP hash;
|Gmail|
:OAuth2 và gửi mã;
if (Gửi được?) then (Không)
 |Backend|
 :Trả 503, record OTP có thể còn;
 stop
endif
|Frontend|
:Chuyển bước OTP, countdown 60s;
|Khách vãng lai|
if (Cần gửi lại?) then (Có)
 |Backend|
 :Resend kiểm cooldown/window;
 |Gmail|
 :Gửi mã mới nếu được phép;
endif
|Khách vãng lai|
:Nhập mã;
|Backend|
:Validate email/6 chữ số và consume verifyAccount;
if (Mã đúng, chưa hết hạn, chưa consume?) then (Có)
 :Xóa OTP atomically;
 :Kiểm registration/email; tạo user;
 |Frontend|
 :Thông báo và chuyển login;
else (Không)
 |Backend|
 :Sai mã tăng attempts; hết hạn/5 lần thì xóa;
 :Trả 400;
endif
stop
@enduml
```

## Đăng nhập email/Google và quyền admin

**Phạm vi:** UC-04, UC-05, UC-06, UC-07.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/controllers/users.controller.js:92`; `client/src/Pages/LoginUser/LoginUser.jsx:1`; `server/src/routes/users.routes.js:15`; `server/src/controllers/users.controller.js:92`; `client/src/Pages/LoginUser/LoginUser.jsx:1`; `server/src/routes/users.routes.js:19`; `server/src/controllers/users.controller.js:166`; `client/src/store/Provider.jsx:1`; `server/src/routes/users.routes.js:16`; `server/src/routes/users.routes.js:17`; `server/src/routes/users.routes.js:30`; `server/src/controllers/users.controller.js:203`; `client/src/Components/Header/Header.jsx:1`; `server/src/routes/users.routes.js:18`.

Nguồn sơ đồ: [uml/act-02.puml](uml/act-02.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Khách vãng lai|
start
if (Chọn Google?) then (Có)
 |Google|
 :Popup trả credential;
 |Frontend|
 :POST login-google;
 |Backend|
 :Verify ID token/audience/email_verified;
 if (Hợp lệ?) then (Không)
  :Trả 403;
  stop
 endif
 :Tìm email, tạo user google nếu mới;
else (Email)
 |Frontend|
 :POST login email/password;
 |Backend|
 :Tìm user và bcrypt compare;
 if (Sai hoặc typeLogin google?) then (Có)
  :Trả 403;
  stop
 endif
endif
|Backend|
:Rotate RSA; ký access 15m/refresh 7d;
:Set cookie token/refreshToken/logged;
|Frontend|
:GET auth, nạp Provider và cart;
if (isAdmin=true?) then (Có)
 :Điều hướng /admin;
 :AdminRoute GET /api/admin;
 |Backend|
 :Verify token; đọc DB isAdmin;
 if (Đủ quyền?) then (Có)
  |Frontend|
  :Hiển thị AdminLayout;
 else (Không)
  |Frontend|
  :Chuyển login;
 endif
else (Không)
 |Frontend|
 :Điều hướng trang chủ;
endif
stop
@enduml
```

## Khôi phục mật khẩu

**Phạm vi:** UC-08.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/controllers/users.controller.js:414`; `client/src/Pages/ForgotPassword/ForgotPassword.jsx:1`; `server/src/routes/users.routes.js:22`; `server/src/routes/users.routes.js:23`; `server/src/routes/users.routes.js:24`; `server/src/services/otp.service.js:20`; `server/src/services/mail.service.js:21`.

Nguồn sơ đồ: [uml/act-03.puml](uml/act-03.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Khách vãng lai|
start
:Gửi email;
|Frontend|
:POST forgot-password;
|Backend|
:Limiter IP, normalize email;
if (Tài khoản email đủ điều kiện?) then (Có)
 :Issue OTP hash, kiểm cooldown;
 if (Cooldown?) then (Có)
  :Trả 429;
  stop
 endif
 |Gmail|
 :Gửi OTP;
 |Backend|
 :Log lỗi gửi nếu có;
endif
|Backend|
:Trả 202 thông báo chung;
|Khách vãng lai|
:Nhập email/OTP;
|Backend|
:Limiter verify; consume OTP forgotPassword;
if (OTP hợp lệ và user email tồn tại?) then (Không)
 :Trả 400;
 stop
endif
:Ký proof purpose=passwordReset 5m;
:Set cookie httpOnly;
|Khách vãng lai|
:Nhập password/confirmPassword;
|Frontend|
:POST reset-password;
|Backend|
if (Body/purpose/user hợp lệ?) then (Không)
 :Trả 400;
 stop
endif
if (Chữ ký proof và thời hạn hợp lệ?) then (Không)
 :Trả 401;
 stop
endif
:Bcrypt và save password;
:Clear proof cookie, trả 200;
|Frontend|
:Chuyển login;
stop
@enduml
```

## Mua hàng từ catalog đến đơn

**Phạm vi:** UC-10, UC-11, UC-12, UC-14, UC-15, UC-16, UC-17, UC-18, UC-19, UC-20, UC-26, UC-27.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/services/product-catalog.service.js:37`; `client/src/Components/HomePage/ProductNew/ProductNew.jsx:1`; `server/src/routes/products.routes.js:9`; `server/src/routes/products.routes.js:10`; `server/src/routes/products.routes.js:14`; `server/src/routes/products.routes.js:15`; `server/src/services/catalog-browse.service.js:37`; `client/src/Pages/Category/Category.jsx:1`; `server/src/routes/products.routes.js:11`; `server/src/routes/products.routes.js:12`; `server/src/routes/products.routes.js:16`; `server/src/controllers/products.controller.js:118`; `client/src/Pages/DetailProduct/DetailProduct.jsx:1`; `server/src/routes/previewProduct.routes.js:9`; `server/src/routes/products.routes.js:13`; `server/src/controllers/cartUser.controller.js:114`; `client/src/Pages/Cart/CartUser.jsx:1`; `server/src/routes/cartUser.routes.js:9`; `server/src/controllers/cartUser.controller.js:31`; `client/src/Components/CardBody/CardBody.jsx:1`; `server/src/routes/cartUser.routes.js:8`; `server/src/controllers/cartUser.controller.js:196`; `client/src/Pages/Cart/CartUser.jsx:1`; `server/src/routes/cartUser.routes.js:11`; `server/src/controllers/cartUser.controller.js:160`; `client/src/Pages/Cart/CartUser.jsx:1`; `server/src/routes/cartUser.routes.js:10`; `server/src/controllers/cartUser.controller.js:235`; `client/src/Pages/CheckOut/CheckOut.jsx:1`; `server/src/routes/cartUser.routes.js:12`; `server/src/routes/coupon.routes.js:9`; `server/src/services/vnpay.service.js:132`; `client/src/Pages/CheckOut/CheckOut.jsx:1`; `server/src/routes/payments.route.js:7`; `server/src/services/vnpay.service.js:156`; `client/src/Pages/CheckOut/CheckOut.jsx:1`; `server/src/routes/payments.route.js:7`; `server/src/controllers/payments.controller.js:269`; `client/src/Pages/InfoUser/OrderUser/OrderUser.jsx:1`; `server/src/routes/payments.route.js:14`; `server/src/routes/payments.route.js:15`; `server/src/services/vnpay.service.js:327`; `client/src/Pages/InfoUser/OrderUser/OrderUser.jsx:1`; `server/src/routes/payments.route.js:16`.

Nguồn sơ đồ: [uml/act-04.puml](uml/act-04.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Khách hàng đã đăng nhập|
start
:Xem/tìm/lọc sản phẩm và mở chi tiết;
|Frontend|
:Gửi yêu cầu thêm giỏ;
|Backend|
:authUser và validate quantity/stock;
if (Hợp lệ?) then (Không)
 :Trả 401/403;
 stop
endif
:Tạo/cập nhật giỏ, tính giá DB;
|Khách hàng đã đăng nhập|
:Xem giỏ; sửa/xóa item nếu cần;
:Nhập shipping, chọn coupon/phương thức;
|Frontend|
:Submit cartId và shipping;
|Backend|
:COD/VNPAY transaction snapshot + reserve;
if (Lỗi dữ liệu/kho/coupon/transaction?) then (Có)
 :Rollback; trả 400/409/503;
 stop
endif
:Save order, xóa cart;
if (COD?) then (Có)
 :Order pending/unpaid; trả document;
 |Frontend|
 :Mở trang đơn;
else (VNPAY)
 |Backend|
 :Lưu attempt pending và trả URL;
 |VNPay|
 :Khách thanh toán; gửi Return và IPN độc lập;
 |Backend|
 :Return redirect; IPN/querydr settle theo điều kiện;
 |Frontend|
 :Đọc order và hiển thị paymentStatus;
endif
|Quản trị viên|
:Xử lý confirmed -> shipped -> delivered nếu đủ điều kiện;
|Backend|
:Delivered tăng soldCount; COD chuyển paid;
stop
@enduml
```

## VNPay: tạo URL, Return và xác nhận

**Phạm vi:** UC-20, UC-21, UC-22, UC-24.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/services/vnpay.service.js:156`; `client/src/Pages/CheckOut/CheckOut.jsx:1`; `server/src/routes/payments.route.js:7`; `server/src/controllers/payments.controller.js:148`; `client/src/Pages/PaymentSuccess/PaymentSuccess.jsx:1`; `server/src/routes/payments.route.js:8`; `server/src/routes/payments.route.js:9`; `server/src/services/vnpay.service.js:218`; `server/src/controllers/payments.controller.js:1`; `server/src/routes/payments.route.js:10`; `server/src/services/vnpay.service.js:232`; `client/src/Pages/PaymentSuccess/PaymentSuccess.jsx:1`; `server/src/routes/payments.route.js:12`.

Nguồn sơ đồ: [uml/act-05.puml](uml/act-05.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Khách hàng đã đăng nhập|
start
:Chọn VNPAY;
|Backend|
:Validate config và cart; transaction snapshot/reserve;
if (Hợp lệ?) then (Không)
 :Rollback và trả lỗi;
 stop
endif
:Tạo attempt 15m, save order, xóa cart;
|Frontend|
:Chuyển browser theo URL;
|VNPay|
:Khách thanh toán hoặc hủy;
note right
Return browser và IPN server-to-server độc lập.
Không có fork/join đòi hỏi cả hai cùng tới.
end note
if (Kênh đang xét là Return?) then (Có)
 |Backend|
 :Verify signature, ref và amount;
 if (Khớp?) then (Có)
  :302 tới trang đơn;
  |Frontend|
  :GET đơn; đối soát khi đến lịch;
 else (Không)
  |Backend|
  :400/404; không đổi trạng thái;
 endif
else (IPN hoặc querydr)
 |Backend|
 :Verify dữ liệu theo từng kênh;
 if (Không hợp lệ?) then (Có)
  :IPN 97/01/04; querydr giữ trạng thái;
  stop
 endif
 :Transaction đọc attempt/order;
 if (receivedAt hoặc reconciledAt đã có?) then (Có)
  :IPN RspCode=02; không ghi lại;
  stop
 endif
 if (Response=00 và TransactionStatus=00?) then (Có)
  if (Attempt hiện tại, order pending, còn reserve?) then (Có)
   :paymentStatus=paid, attempt=paid;
  else (Không)
   :refund_required; release khi còn reserve;
  endif
 else (Thất bại/hủy)
  :attempt failed; current pending thì release và order failed;
 endif
 :Save attempt/order, commit;
endif
stop
@enduml
```

## VNPay: hết hạn, retry, đối soát và callback muộn

**Phạm vi:** UC-22, UC-23, UC-24.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/services/vnpay.service.js:218`; `server/src/controllers/payments.controller.js:1`; `server/src/routes/payments.route.js:10`; `server/src/services/vnpay.service.js:179`; `client/src/Pages/PaymentSuccess/PaymentSuccess.jsx:1`; `server/src/routes/payments.route.js:11`; `server/src/services/vnpay.service.js:232`; `client/src/Pages/PaymentSuccess/PaymentSuccess.jsx:1`; `server/src/routes/payments.route.js:12`.

Nguồn worker: `server/src/server.js:runPaymentExpiry`, `server/src/services/vnpay.service.js:expirePending`, `retry`, `settle`, `reconcile`.

Nguồn sơ đồ: [uml/act-06.puml](uml/act-06.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Backend|
start
:Worker mỗi 30s khi DB ready, không chạy chồng process;
:Lấy tối đa 100 order VNPAY pending hết hạn;
while (Còn đơn trong batch?) is (Có)
 :Transaction đọc lại điều kiện;
 if (Vẫn pending và hết hạn?) then (Có)
  :Release stock/coupon; paymentStatus và attempt=expired;
  :Save/commit;
 endif
endwhile (Không)
|Khách hàng đã đăng nhập|
if (Chọn thanh toán lại?) then (Có)
 |Backend|
 :Kiểm owner/status/method;
 if (Pending attempt còn hạn?) then (Có)
  :Trả URL cũ;
 else (Không)
  if (Pending chờ worker?) then (Có)
   :409 chờ xử lý hết hạn;
   stop
  endif
  if (Failed/expired, order pending?) then (Có)
   :Reserve lại; tạo ref/attempt mới;
  else (Không)
   :409 không được thanh toán;
   stop
  endif
 endif
 |Frontend|
 :Chuyển URL VNPay;
else (Kiểm tra trạng thái)
 |Backend|
 :Lease querydr 5 phút theo attempt;
 |VNPay|
 :Trả querydr đã ký hoặc lỗi;
 |Backend|
 :Verify; chỉ settle result được chấp nhận;
endif
|Backend|
if (Confirmation mới đến muộn hoặc thuộc attempt cũ?) then (Có)
 if (Đã nhận/đối soát trước?) then (Có)
  :Bỏ lặp (IPN code 02);
 else (Không)
  :Thành công: refund_required;
  :Không tự tạo lại quyền bán hay gọi hoàn tiền;
 endif
endif
stop
@enduml
```

## Xử lý trạng thái đơn hàng phía admin

**Phạm vi:** UC-27, UC-37.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/services/vnpay.service.js:327`; `client/src/Pages/InfoUser/OrderUser/OrderUser.jsx:1`; `server/src/routes/payments.route.js:16`; `server/src/services/vnpay.service.js:327`; `client/src/Pages/Admin/Components/ManagerOrder/ManagerOrder.jsx:1`; `server/src/routes/payments.route.js:17`; `server/src/routes/payments.route.js:18`.

Nguồn sơ đồ: [uml/act-07.puml](uml/act-07.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Quản trị viên|
start
:Mở tab đơn, xem snapshot và attempts;
:Chọn trạng thái do UI cho phép;
|Frontend|
:POST update-order-status;
|Backend|
:authAdmin, validate id/status;
:Transaction tìm order;
if (Không thấy?) then (Có)
 :404;
 stop
endif
if (Trạng thái không đổi?) then (Có)
 :200 không tác dụng phụ;
 stop
endif
if (Transition hợp lệ và điều kiện payment đủ?) then (Không)
 :409;
 stop
endif
if (Hủy?) then (Có)
 if (Online đã paid hoặc cần refund?) then (Có)
  :409 cần workflow hoàn tiền;
  stop
 endif
 :Release stock/coupon; cancel attempt pending;
 :VNPay paymentStatus=failed;
else (Không)
 if (Delivered?) then (Có)
  :soldCount += quantity;
  :COD paymentStatus=paid;
 endif
endif
:Save status, commit;
|Frontend|
:Reload bảng/modal;
stop
@enduml
```

## Quản lý sản phẩm, danh mục, coupon

**Phạm vi:** UC-32, UC-33, UC-34, UC-39, UC-40.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/controllers/products.controller.js:17`; `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx:1`; `server/src/routes/products.routes.js:8`; `server/src/routes/products.routes.js:18`; `server/src/routes/products.routes.js:19`; `server/src/routes/products.routes.js:20`; `server/src/controllers/category.controller.js:40`; `client/src/Pages/Admin/Components/ManagerCategory/ManagerCategory.jsx:1`; `server/src/routes/category.routes.js:8`; `server/src/routes/category.routes.js:9`; `server/src/routes/category.routes.js:10`; `server/src/routes/category.routes.js:11`; `server/src/controllers/coupon.controller.js:10`; `client/src/Pages/Admin/Components/ManagerCoupon/CouponManagement.jsx:1`; `server/src/routes/coupon.routes.js:8`; `server/src/routes/coupon.routes.js:10`; `server/src/routes/coupon.routes.js:11`; `server/src/routes/coupon.routes.js:12`; `server/src/routes/index.js:1`; `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx:1`; `server/src/routes/blog.routes.js:22`; `server/src/routes/index.js:103`; `server/src/services/brand.service.js:4`; `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx:1`; `server/src/routes/brand.routes.js:8`.

Nguồn sơ đồ: [uml/act-08.puml](uml/act-08.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Quản trị viên|
start
:Chọn đối tượng và tạo/sửa/xóa;
|Frontend|
:Tải dữ liệu; validate form;
if (Sản phẩm có ảnh mới?) then (Có)
 :POST multipart upload-image;
 |Backend|
 :authAdmin; Multer ghi filesystem;
 |Frontend|
 :Ghép URL ảnh;
endif
:Gửi mutation API;
|Backend|
:authAdmin;
if (Không đủ quyền?) then (Có)
 :401;
 stop
endif
if (Tạo mới?) then (Có)
 :Kiểm truthy field theo controller;
 if (Thiếu dữ liệu?) then (Có)
  :Coupon 400; sản phẩm/category 403;
  stop
 endif
 :Model.create/save; trả 201;
else (Sửa hoặc xóa)
 if (Xóa category?) then (Có)
  :Xóa category rồi deleteMany products;
 else (Khác)
  :findByIdAndUpdate/Delete theo whitelist handler;
 endif
 :Trả 200 hoặc error thực tế;
endif
|Frontend|
:Refresh bảng hoặc hiện lỗi;
stop
@enduml
```

## Chat khách hàng và admin

**Phạm vi:** UC-29, UC-30.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/controllers/message.controller.js:15`; `client/src/Components/Messger/Messger.jsx:1`; `server/src/routes/message.routes.js:8`; `server/src/routes/message.routes.js:13`; `server/src/routes/message.routes.js:14`; `server/src/controllers/message.controller.js:42`; `client/src/Pages/Admin/Components/Messager/Messager.jsx:1`; `server/src/routes/message.routes.js:9`; `server/src/routes/message.routes.js:11`; `server/src/routes/message.routes.js:12`.

Nguồn sơ đồ: [uml/act-09.puml](uml/act-09.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Khách hàng đã đăng nhập|
start
:Mở chat, tải lịch sử hoặc nhập tin;
|Frontend|
:POST message/create;
|Backend|
:authUser; tìm admin đầu tiên;
if (Không có admin?) then (Có)
 :Lỗi truy cập null;
 stop
endif
:Lưu Message conversationId từ cặp id sort;
if (Admin có socket?) then (Có)
 :Emit newMessage;
endif
:Trả 201;
|Quản trị viên|
:Mở sidebar hội thoại, chọn khách;
|Frontend|
:GET all, read-message, get-message;
|Backend|
:Aggregate latest/unread; update isRead conversation;
:Trả lịch sử;
|Quản trị viên|
:Gửi trả lời;
|Backend|
:authAdmin; lưu Message;
if (Khách có socket?) then (Có)
 :Emit newMessageUser;
endif
|Frontend|
:Provider cập nhật message state;
note right
Socket được nhận diện bằng JWT cookie.
Không có sự kiện đọc hoặc giao tin bắt buộc.
end note
stop
@enduml
```

## Chatbot Gemini và nhánh lỗi

**Phạm vi:** UC-31.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/utils/chatbot.js:156`; `client/src/utils/Chatbot/Chatbot.jsx:1`; `server/src/server.js:64`.

Nguồn sơ đồ: [uml/act-10.puml](uml/act-10.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Khách vãng lai|
start
:Nhập câu hỏi;
|Frontend|
:POST chatbot;
|Backend|
if (Quá 10 request/phút/IP?) then (Có)
 :429 RATE_LIMIT;
 stop
endif
if (Question/history hợp lệ?) then (Không)
 :400 INVALID_INPUT;
 stop
endif
if (Có GEMINI_API_KEY?) then (Không)
 :503 INVALID_KEY;
 stop
endif
:Lấy 10 sản phẩm còn hàng; systemInstruction;
:Đặt attempt=0;
repeat
 |Gemini|
 :generateContent timeout 30s/lần;
 |Backend|
 :Classify lỗi hoặc kiểm safety/STOP/content;
 if (Lỗi retryable và còn lượt?) then (Có)
  :Delay 300ms hoặc 600ms; attempt++;
 endif
repeat while (Cần thử lại?) is (Có) not (Không)
if (Nội dung hợp lệ?) then (Có)
 :200 metadata text;
else (Không)
 :422/429/502/503/504 kèm errorCode;
endif
|Frontend|
:Lọc control chars, cắt 4000 ký tự, render text;
:Lỗi có nút thử lại;
stop
@enduml
```

## Thống kê và phân quyền người dùng

**Phạm vi:** UC-36, UC-38.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/controllers/users.controller.js:401`; `client/src/Pages/Admin/Components/ManagerUser/ManagerUser.jsx:1`; `server/src/routes/users.routes.js:27`; `server/src/routes/users.routes.js:28`; `server/src/controllers/users.controller.js:225`; `client/src/Pages/Admin/Components/ManagerStatistical/ManagerStatistical.jsx:1`; `server/src/routes/users.routes.js:26`.

Nguồn sơ đồ: [uml/act-11.puml](uml/act-11.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Quản trị viên|
start
:Chọn dashboard hoặc tab users;
|Frontend|
:GET statistical hoặc users;
|Backend|
:authAdmin từ DB;
if (Đủ quyền?) then (Không)
 :401;
 stop
endif
if (Thống kê?) then (Có)
 :Aggregate users;
 :Aggregate products;
 :Aggregate orders;
 :Aggregate delivered revenue;
 :Aggregate reviews;
 if (Query lỗi?) then (Có)
  :500 với message/error;
  stop
 endif
 :200 metadata;
 |Frontend|
 :Hiển thị cards/charts;
else (Users)
 |Backend|
 :Find all users, trả document;
 |Quản trị viên|
 if (Đổi quyền?) then (Có)
  |Frontend|
  :POST update-user-admin id/isAdminUser;
  |Backend|
  :authAdmin; gán isAdmin theo body;
  :200 document user;
 endif
endif
stop
@enduml
```

## Blog, upload và đọc nội dung

**Phạm vi:** UC-28, UC-35, UC-39.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/controllers/blog.controller.js:58`; `client/src/Pages/DetailBlog/DetailBlog.jsx:1`; `server/src/routes/blog.routes.js:24`; `server/src/routes/blog.routes.js:27`; `server/src/controllers/blog.controller.js:20`; `client/src/Pages/Admin/Components/ManagerBlog/BlogAdmin.jsx:1`; `server/src/routes/blog.routes.js:23`; `server/src/routes/blog.routes.js:25`; `server/src/routes/blog.routes.js:26`; `server/src/routes/index.js:1`; `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx:1`; `server/src/routes/blog.routes.js:22`; `server/src/routes/index.js:103`.

Nguồn sơ đồ: [uml/act-12.puml](uml/act-12.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Quản trị viên|
start
:Soạn bài, chọn ảnh tùy chọn;
|Frontend|
if (Có ảnh mới?) then (Có)
 :POST blog/upload-image;
 |Backend|
 :Multer single(image), chưa authAdmin;
 :Ghi filesystem, trả URL;
endif
|Frontend|
:POST blog/create hoặc update;
|Backend|
:authAdmin, lưu title/content/image;
note right
Async handler chưa wrapper trên Express 4.
Không bảo đảm lỗi DB được chuyển thành JSON.
end note
|Khách vãng lai|
:Mở blog;
|Frontend|
:GET get-all/get-by-id;
|Backend|
:Đọc blog trả metadata;
|Frontend|
:Render HTML bằng dangerouslySetInnerHTML;
stop
@enduml
```

## MoMo legacy và callback

**Phạm vi:** UC-25.

**Mô tả:** Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.

**Nguồn:** `server/src/controllers/payments.controller.js:180`; `client/src/Pages/CheckOut/CheckOut.jsx:1`; `server/src/routes/payments.route.js:7`; `server/src/routes/payments.route.js:13`.

Nguồn sơ đồ: [uml/act-13.puml](uml/act-13.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
|Khách hàng đã đăng nhập|
start
:Chọn MOMO;
|Frontend|
:Lưu shipping vào cart; gọi create-payment;
|Backend|
:authUser; đọc cart/total/coupon;
:Ký HMAC SHA256 request;
|MoMo|
:Nhận request và trả payUrl;
|Frontend|
:Chuyển browser;
|MoMo|
:Callback GET về server;
|Backend|
if (resultCode=0?) then (Không)
 :Không có nhánh kết thúc response;
 stop
endif
note right
Không thấy verify callback signature/amount.
end note
if (transactionRef đã có?) then (Có)
 :Redirect đơn cũ;
 stop
endif
:Đọc cartId từ orderInfo;
:Reserve kho có bù khi reserve/save lỗi;
if (Save đơn được?) then (Không)
 :Bù kho, throw lỗi;
 stop
endif
:Trừ coupon; xóa cart;
:Redirect trang đơn;
stop
@enduml
```

## State machine đơn hàng

Đây là transitions thực sự được khai báo trong vnpay.service; guard payment/ownership nằm trong changeStatus, không phải enum tự enforce chuyển trạng thái. Nguồn: `server/src/services/vnpay.service.js:transitions`, `changeStatus`; `client/src/Pages/Admin/Components/ManagerOrder/ManagerOrder.jsx:statusChoices`.

Nguồn sơ đồ: [uml/act-state-order.puml](uml/act-state-order.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
state "Chờ xác nhận (pending)" as Pending
state "Đã xác nhận (confirmed)" as Confirmed
state "Đang giao (shipped)" as Shipped
state "Đã giao (delivered)" as Delivered
state "Đã hủy (cancelled)" as Cancelled
[*] --> Pending : checkout
Pending --> Confirmed : admin; VNPAY phải paid
Pending --> Cancelled : user sở hữu hoặc admin; đủ điều kiện hủy
Confirmed --> Shipped : admin; VNPAY phải paid
Confirmed --> Cancelled : admin; chặn online paid/refund_required
Shipped --> Delivered : admin / soldCount tăng; COD paid
Delivered --> [*]
Cancelled --> [*]
note right of Pending
Status không đổi: no-op.
VNPAY refund_required chặn chuyển trạng thái.
Không có confirmed -> pending hoặc shipped -> cancelled.
end note
@enduml
```

## State machine paymentStatus

Tách trạng thái thanh toán khỏi status giao hàng. Sơ đồ thể hiện các đường ghi trong checkout/settle/retry/expirePending/changeStatus, không suy diễn hệ thống hoàn tiền. Nguồn: `server/src/services/vnpay.service.js:checkout`, `settle`, `retry`, `expirePending`, `changeStatus`; `server/src/models/paymentAttempt.model.js:1`.

Nguồn sơ đồ: [uml/act-state-payment.puml](uml/act-state-payment.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
state "Chưa thanh toán COD (unpaid)" as Unpaid
state "Chờ VNPay (pending)" as Pending
state "Đã thanh toán (paid)" as Paid
state "Thất bại (failed)" as Failed
state "Hết hạn (expired)" as Expired
state "Cần hoàn tiền (refund_required)" as Refund
[*] --> Unpaid : checkout COD
[*] --> Pending : checkout VNPAY
Unpaid --> Paid : COD delivered
Pending --> Paid : confirmation hợp lệ, current, còn reserve
Pending --> Failed : confirmation thất bại current hoặc hủy đơn
Pending --> Expired : worker quá expiresAt / release
Failed --> Pending : retry đủ điều kiện / reserve lại
Expired --> Pending : retry đủ điều kiện / reserve lại
Pending --> Refund : success attempt cũ/đơn không đủ điều kiện
Failed --> Refund : success đến sau release, chưa có confirmation trước
Expired --> Refund : success đến sau hết hạn, chưa có confirmation trước
Paid --> Refund : success của attempt cũ chưa được ghi nhận trước
note bottom of Refund
Không có API hoàn tiền tự động hoặc transition trở lại paid.
Callback có receivedAt/reconciledAt trước: bỏ lặp.
Sơ đồ paymentStatus order; attempt còn trạng thái cancelled riêng.
MoMo dùng default unpaid và đường callback riêng.
end note
@enduml
```

## Giả định và giới hạn

VNPay Return/IPN có thể tới theo bất kỳ thứ tự nào; code không bảo đảm cả hai sẽ đến. Hủy phía provider là confirmation không thành công; bỏ browser không tự phát callback, worker sẽ hết hạn. Đồng hồ/server/DB, IPN merchant setup và kết quả settlement thật đều cần xác minh bằng môi trường kiểm thử riêng. Không chạy thử trong nhiệm vụ.
