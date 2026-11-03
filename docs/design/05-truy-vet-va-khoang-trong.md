# 05 — Truy vết, khoảng trống và tự kiểm tra

## Phương pháp và giới hạn

Các kết luận “Chắc chắn” là xác minh bằng code, không phải đã khai thác/tái hiện trên hệ thống đang chạy. Tất cả cách tái hiện dưới đây là kịch bản đề xuất cho môi trường test riêng. Không gửi thanh toán/mail, không chạy server hoặc thao tác MongoDB. “Cần xác minh” chỉ rõ điều kiện runtime hoặc deployment còn thiếu.

## Ma trận truy vết theo từng endpoint

Mỗi endpoint xuất hiện một dòng theo method/path duy nhất. `models` ghi theo UC bao phủ, không khẳng định mọi nhánh endpoint đều truy cập hết tất cả model trong dòng. Các trang UI gọi gián tiếp qua Provider/hook đã được ghi ở 00. Return/IPN là kênh hệ thống ngoài, không phải API button client.

| Endpoint | UC | Controller/handler | Models theo UC | Client / bên khởi phát | Sequence | Activity | Nguồn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| POST /api/blog/upload-image | UC-39 | inline |  | client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx | seq-39 | act-08, act-12 | server/src/routes/blog.routes.js:22; server/src/routes/blog.routes.js |
| POST /api/blog/create | UC-35 | controllerBlog.createBlog | blog | client/src/Pages/Admin/Components/ManagerBlog/BlogAdmin.jsx | seq-35 | act-12 | server/src/routes/blog.routes.js:23; server/src/controllers/blog.controller.js |
| GET /api/blog/get-all | UC-28 | controllerBlog.getAllBlog | blog | client/src/Pages/DetailBlog/DetailBlog.jsx | seq-28 | act-12 | server/src/routes/blog.routes.js:24; server/src/controllers/blog.controller.js |
| POST /api/blog/update | UC-35 | controllerBlog.updateBlog | blog | client/src/Pages/Admin/Components/ManagerBlog/BlogAdmin.jsx | seq-35 | act-12 | server/src/routes/blog.routes.js:25; server/src/controllers/blog.controller.js |
| POST /api/blog/delete | UC-35 | controllerBlog.deleteBlog | blog | client/src/Pages/Admin/Components/ManagerBlog/BlogAdmin.jsx | seq-35 | act-12 | server/src/routes/blog.routes.js:26; server/src/controllers/blog.controller.js |
| GET /api/blog/get-by-id | UC-28 | controllerBlog.getBlogById | blog | client/src/Pages/DetailBlog/DetailBlog.jsx | seq-28 | act-12 | server/src/routes/blog.routes.js:27; server/src/controllers/blog.controller.js |
| GET /api/brands | UC-40 | service.list | brand, products | client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx | seq-40 | act-08 | server/src/routes/brand.routes.js:8; server/src/services/brand.service.js |
| POST /api/create-cart | UC-15 | controllerCartUser.addToCart | cartUser, products | client/src/Components/CardBody/CardBody.jsx | seq-15 | act-04 | server/src/routes/cartUser.routes.js:8; server/src/controllers/cartUser.controller.js |
| GET /api/get-cart | UC-14 | controllerCartUser.getCart | cartUser, products, coupon | client/src/Pages/Cart/CartUser.jsx | seq-14 | act-04 | server/src/routes/cartUser.routes.js:9; server/src/controllers/cartUser.controller.js |
| POST /api/delete-product-cart | UC-17 | controllerCartUser.deleteProductCart | cartUser, products | client/src/Pages/Cart/CartUser.jsx | seq-17 | act-04 | server/src/routes/cartUser.routes.js:10; server/src/controllers/cartUser.controller.js |
| POST /api/update-product-cart | UC-16 | controllerCartUser.updateProductCart | cartUser, products | client/src/Pages/Cart/CartUser.jsx | seq-16 | act-04 | server/src/routes/cartUser.routes.js:11; server/src/controllers/cartUser.controller.js |
| POST /api/update-info-cart | UC-18 | controllerCartUser.updateInfoCart | cartUser, coupon | client/src/Pages/CheckOut/CheckOut.jsx | seq-18 | act-04 | server/src/routes/cartUser.routes.js:12; server/src/controllers/cartUser.controller.js |
| POST /api/create-category | UC-33 | controllerCategory.createCategory | category, products | client/src/Pages/Admin/Components/ManagerCategory/ManagerCategory.jsx | seq-33 | act-08 | server/src/routes/category.routes.js:8; server/src/controllers/category.controller.js |
| GET /api/get-all-category | UC-33 | controllerCategory.getAllCategory | category, products | client/src/Pages/Admin/Components/ManagerCategory/ManagerCategory.jsx | seq-33 | act-08 | server/src/routes/category.routes.js:9; server/src/controllers/category.controller.js |
| POST /api/update-category | UC-33 | controllerCategory.updateCategory | category, products | client/src/Pages/Admin/Components/ManagerCategory/ManagerCategory.jsx | seq-33 | act-08 | server/src/routes/category.routes.js:10; server/src/controllers/category.controller.js |
| DELETE /api/delete-category | UC-33 | controllerCategory.deleteCategory | category, products | client/src/Pages/Admin/Components/ManagerCategory/ManagerCategory.jsx | seq-33 | act-08 | server/src/routes/category.routes.js:11; server/src/controllers/category.controller.js |
| POST /api/create-coupon | UC-34 | controllerCoupon.createCoupon | coupon | client/src/Pages/Admin/Components/ManagerCoupon/CouponManagement.jsx | seq-34 | act-08 | server/src/routes/coupon.routes.js:8; server/src/controllers/coupon.controller.js |
| GET /api/coupon | UC-18 | controllerCoupon.getCoupons | cartUser, coupon | client/src/Pages/CheckOut/CheckOut.jsx | seq-18 | act-04 | server/src/routes/coupon.routes.js:9; server/src/controllers/coupon.controller.js |
| GET /api/coupons | UC-34 | controllerCoupon.getAllCoupon | coupon | client/src/Pages/Admin/Components/ManagerCoupon/CouponManagement.jsx | seq-34 | act-08 | server/src/routes/coupon.routes.js:10; server/src/controllers/coupon.controller.js |
| DELETE /api/delete-coupon | UC-34 | controllerCoupon.deleteCoupon | coupon | client/src/Pages/Admin/Components/ManagerCoupon/CouponManagement.jsx | seq-34 | act-08 | server/src/routes/coupon.routes.js:11; server/src/controllers/coupon.controller.js |
| POST /api/update-coupon | UC-34 | controllerCoupon.updateCoupon | coupon | client/src/Pages/Admin/Components/ManagerCoupon/CouponManagement.jsx | seq-34 | act-08 | server/src/routes/coupon.routes.js:12; server/src/controllers/coupon.controller.js |
| POST /api/message/create | UC-29 | messageController.createMessage | Message, user | client/src/Components/Messger/Messger.jsx | seq-29 | act-09 | server/src/routes/message.routes.js:8; server/src/controllers/message.controller.js |
| POST /api/message/create-admin | UC-30 | messageController.createMessageAdmin | Message, user | client/src/Pages/Admin/Components/Messager/Messager.jsx | seq-30 | act-09 | server/src/routes/message.routes.js:9; server/src/controllers/message.controller.js |
| GET /api/message/all | UC-30 | messageController.getAllUserMessage | Message, user | client/src/Pages/Admin/Components/Messager/Messager.jsx | seq-30 | act-09 | server/src/routes/message.routes.js:11; server/src/controllers/message.controller.js |
| GET /api/message/get-message | UC-30 | messageController.getMessage | Message, user | client/src/Pages/Admin/Components/Messager/Messager.jsx | seq-30 | act-09 | server/src/routes/message.routes.js:12; server/src/controllers/message.controller.js |
| GET /api/message/get-message-user | UC-29 | messageController.getMessageUser | Message, user | client/src/Components/Messger/Messger.jsx | seq-29 | act-09 | server/src/routes/message.routes.js:13; server/src/controllers/message.controller.js |
| GET /api/message/read-message | UC-29 | messageController.readMessage | Message, user | client/src/Components/Messger/Messger.jsx | seq-29 | act-09 | server/src/routes/message.routes.js:14; server/src/controllers/message.controller.js |
| POST /api/create-payment | UC-19, UC-20, UC-25 | controllerPayments.createPayment | cartUser, products, coupon, payments, paymentAttempts | client/src/Pages/CheckOut/CheckOut.jsx | seq-19, seq-20, seq-25 | act-04, act-05, act-13 | server/src/routes/payments.route.js:7; server/src/controllers/payments.controller.js |
| GET /api/check-payment-vnpay | UC-21 | controllerPayments.checkPaymentVnpay | paymentAttempts | client/src/Pages/PaymentSuccess/PaymentSuccess.jsx | seq-21 | act-05 | server/src/routes/payments.route.js:8; server/src/controllers/payments.controller.js |
| GET /api/vnpay-return | UC-21 | controllerPayments.checkPaymentVnpay | paymentAttempts | client/src/Pages/PaymentSuccess/PaymentSuccess.jsx | seq-21 | act-05 | server/src/routes/payments.route.js:9; server/src/controllers/payments.controller.js |
| GET /api/vnpay-ipn | UC-22 | controllerPayments.ipnVnpay | payments, paymentAttempts, products, coupon | server/src/controllers/payments.controller.js | seq-22 | act-05, act-06 | server/src/routes/payments.route.js:10; server/src/controllers/payments.controller.js |
| POST /api/retry-payment-vnpay | UC-23 | controllerPayments.retryVnpay | payments, paymentAttempts, products, coupon | client/src/Pages/PaymentSuccess/PaymentSuccess.jsx | seq-23 | act-06 | server/src/routes/payments.route.js:11; server/src/controllers/payments.controller.js |
| POST /api/reconcile-payment-vnpay | UC-24 | controllerPayments.reconcileVnpay | payments, paymentAttempts, products, coupon | client/src/Pages/PaymentSuccess/PaymentSuccess.jsx | seq-24 | act-05, act-06 | server/src/routes/payments.route.js:12; server/src/controllers/payments.controller.js |
| GET /api/check-payment-momo | UC-25 | controllerPayments.checkPaymentMomo | cartUser, products, coupon, payments | client/src/Pages/CheckOut/CheckOut.jsx | seq-25 | act-13 | server/src/routes/payments.route.js:13; server/src/controllers/payments.controller.js |
| GET /api/get-payment-success | UC-26 | controllerPayments.getPaymentSuccess | payments, products | client/src/Pages/InfoUser/OrderUser/OrderUser.jsx | seq-26 | act-04 | server/src/routes/payments.route.js:14; server/src/controllers/payments.controller.js |
| GET /api/get-order-user | UC-26 | controllerPayments.getOrderUser | payments, products | client/src/Pages/InfoUser/OrderUser/OrderUser.jsx | seq-26 | act-04 | server/src/routes/payments.route.js:15; server/src/controllers/payments.controller.js |
| POST /api/cancel-order | UC-27 | controllerPayments.cancelOrder | payments, paymentAttempts, products, coupon | client/src/Pages/InfoUser/OrderUser/OrderUser.jsx | seq-27 | act-04, act-07 | server/src/routes/payments.route.js:16; server/src/controllers/payments.controller.js |
| GET /api/get-order-admin | UC-37 | controllerPayments.getOrderAdmin | payments, paymentAttempts, products, coupon | client/src/Pages/Admin/Components/ManagerOrder/ManagerOrder.jsx | seq-37 | act-07 | server/src/routes/payments.route.js:17; server/src/controllers/payments.controller.js |
| POST /api/update-order-status | UC-37 | controllerPayments.updateOrderStatus | payments, paymentAttempts, products, coupon | client/src/Pages/Admin/Components/ManagerOrder/ManagerOrder.jsx | seq-37 | act-07 | server/src/routes/payments.route.js:18; server/src/controllers/payments.controller.js |
| POST /api/create-preview-product | UC-13 | controllerPreviewProduct.createPreviewProduct | previewProduct | client/src/Pages/InfoUser/OrderUser/OrderUser.jsx | seq-13 | Sequence bao phủ | server/src/routes/previewProduct.routes.js:8; server/src/controllers/previewProduct.controller.js |
| GET /api/get-preview-product-home | UC-12 | controllerPreviewProduct.getPreviewProductHome | products, previewProduct, user | client/src/Pages/DetailProduct/DetailProduct.jsx | seq-12 | act-04 | server/src/routes/previewProduct.routes.js:9; server/src/controllers/previewProduct.controller.js |
| POST /api/create-product | UC-32 | controllerProducts.createProduct | products, category, brand | client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx | seq-32 | act-08 | server/src/routes/products.routes.js:8; server/src/controllers/products.controller.js |
| GET /api/get-product-new | UC-10 | controllerProducts.getProductNew | products, category | client/src/Components/HomePage/ProductNew/ProductNew.jsx | seq-10 | act-04 | server/src/routes/products.routes.js:9; server/src/controllers/products.controller.js |
| GET /api/product-catalog | UC-10 | controllerProducts.getProductCatalog | products, category | client/src/Components/HomePage/ProductNew/ProductNew.jsx | seq-10 | act-04 | server/src/routes/products.routes.js:10; server/src/controllers/products.controller.js |
| GET /api/catalog-options | UC-11 | controllerProducts.getCatalogOptions | products, category, brand | client/src/Pages/Category/Category.jsx | seq-11 | act-04 | server/src/routes/products.routes.js:11; server/src/controllers/products.controller.js |
| GET /api/catalog-browse | UC-11 | controllerProducts.browseProducts | products, category, brand | client/src/Pages/Category/Category.jsx | seq-11 | act-04 | server/src/routes/products.routes.js:12; server/src/controllers/products.controller.js |
| GET /api/get-product-by-id | UC-12 | controllerProducts.getProductById | products, previewProduct, user | client/src/Pages/DetailProduct/DetailProduct.jsx | seq-12 | act-04 | server/src/routes/products.routes.js:13; server/src/controllers/products.controller.js |
| GET /api/get-product-by-category | UC-10 | controllerProducts.getProductByCategory | products, category | client/src/Components/HomePage/ProductNew/ProductNew.jsx | seq-10 | act-04 | server/src/routes/products.routes.js:14; server/src/controllers/products.controller.js |
| GET /api/get-product-manufactured | UC-10 | controllerProducts.getProductManufactured | products, category | client/src/Components/HomePage/ProductNew/ProductNew.jsx | seq-10 | act-04 | server/src/routes/products.routes.js:15; server/src/controllers/products.controller.js |
| GET /api/search | UC-11 | controllerProducts.searchProduct | products, category, brand | client/src/Pages/Category/Category.jsx | seq-11 | act-04 | server/src/routes/products.routes.js:16; server/src/controllers/products.controller.js |
| GET /api/get-all-product | UC-32 | controllerProducts.getAllProduct | products, category, brand | client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx | seq-32 | act-08 | server/src/routes/products.routes.js:18; server/src/controllers/products.controller.js |
| POST /api/update-product | UC-32 | controllerProducts.updateProduct | products, category, brand | client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx | seq-32 | act-08 | server/src/routes/products.routes.js:19; server/src/controllers/products.controller.js |
| DELETE /api/delete-product | UC-32 | controllerProducts.deleteProduct | products, category, brand | client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx | seq-32 | act-08 | server/src/routes/products.routes.js:20; server/src/controllers/products.controller.js |
| POST /api/register | UC-01 | controllerUser.register | user, otp | client/src/Pages/Register/Register.jsx | seq-01 | act-01 | server/src/routes/users.routes.js:12; server/src/controllers/users.controller.js |
| POST /api/verify-email | UC-02 | controllerUser.verifyEmail | otp, user | client/src/Pages/Register/Register.jsx | seq-02 | act-01 | server/src/routes/users.routes.js:13; server/src/controllers/users.controller.js |
| POST /api/resend-verification | UC-03 | controllerUser.resendVerification | otp | client/src/Pages/Register/Register.jsx | seq-03 | act-01 | server/src/routes/users.routes.js:14; server/src/controllers/users.controller.js |
| POST /api/login | UC-04 | controllerUser.login | user, apikey | client/src/Pages/LoginUser/LoginUser.jsx | seq-04 | act-02 | server/src/routes/users.routes.js:15; server/src/controllers/users.controller.js |
| GET /api/auth | UC-06 | controllerUser.authUser | user, apikey | client/src/store/Provider.jsx | seq-06 | act-02 | server/src/routes/users.routes.js:16; server/src/controllers/users.controller.js |
| GET /api/refresh-token | UC-06 | controllerUser.refreshToken | user, apikey | client/src/store/Provider.jsx | seq-06 | act-02 | server/src/routes/users.routes.js:17; server/src/controllers/users.controller.js |
| GET /api/logout | UC-07 | controllerUser.logout | apikey | client/src/Components/Header/Header.jsx | seq-07 | act-02 | server/src/routes/users.routes.js:18; server/src/controllers/users.controller.js |
| POST /api/login-google | UC-05 | controllerUser.loginGoogle | user, apikey | client/src/Pages/LoginUser/LoginUser.jsx | seq-05 | act-02 | server/src/routes/users.routes.js:19; server/src/controllers/users.controller.js |
| POST /api/update-user | UC-09 | controllerUser.updateUser | user | client/src/Pages/InfoUser/InfoUser.jsx | seq-09 | Sequence bao phủ | server/src/routes/users.routes.js:20; server/src/controllers/users.controller.js |
| POST /api/forgot-password | UC-08 | controllerUser.forgotPassword | user, otp | client/src/Pages/ForgotPassword/ForgotPassword.jsx | seq-08 | act-03 | server/src/routes/users.routes.js:22; server/src/controllers/users.controller.js |
| POST /api/verify-reset-password | UC-08 | controllerUser.verifyPasswordReset | user, otp | client/src/Pages/ForgotPassword/ForgotPassword.jsx | seq-08 | act-03 | server/src/routes/users.routes.js:23; server/src/controllers/users.controller.js |
| POST /api/reset-password | UC-08 | controllerUser.resetPassword | user, otp | client/src/Pages/ForgotPassword/ForgotPassword.jsx | seq-08 | act-03 | server/src/routes/users.routes.js:24; server/src/controllers/users.controller.js |
| GET /api/statistical | UC-38 | controllerUser.getStatistical | user, products, payments, previewProduct | client/src/Pages/Admin/Components/ManagerStatistical/ManagerStatistical.jsx | seq-38 | act-11 | server/src/routes/users.routes.js:26; server/src/controllers/users.controller.js |
| GET /api/users | UC-36 | controllerUser.findAllUser | user | client/src/Pages/Admin/Components/ManagerUser/ManagerUser.jsx | seq-36 | act-11 | server/src/routes/users.routes.js:27; server/src/controllers/users.controller.js |
| POST /api/update-user-admin | UC-36 | controllerUser.updateUserAdmin | user | client/src/Pages/Admin/Components/ManagerUser/ManagerUser.jsx | seq-36 | act-11 | server/src/routes/users.routes.js:28; server/src/controllers/users.controller.js |
| GET /api/admin | UC-06 | inline | user, apikey | client/src/store/Provider.jsx | seq-06 | act-02 | server/src/routes/users.routes.js:30; server/src/routes/users.routes.js |
| POST /api/chatbot | UC-31 | askQuestion | products | client/src/utils/Chatbot/Chatbot.jsx | seq-31 | act-10 | server/src/server.js:64; server/src/server.js |
| POST /api/upload-image | UC-39 | inline upload |  | client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx | seq-39 | act-08, act-12 | server/src/routes/index.js:103; server/src/routes/index.js |

## Ma trận UC → UI / sequence / activity

| UC | Tên | API hoặc lý do không có | Client | Sequence | Activity | Nguồn |
| --- | --- | --- | --- | --- | --- | --- |
| UC-01 | Đăng ký tài khoản | /api/register | client/src/Pages/Register/Register.jsx | seq-01.puml | act-01.puml | `server/src/controllers/users.controller.js:60`; `client/src/Pages/Register/Register.jsx:1`; `server/src/routes/users.routes.js:12`; `server/src/services/otp.service.js:20`; `server/src/services/mail.service.js:21` |
| UC-02 | Xác minh email đăng ký | /api/verify-email | client/src/Pages/Register/Register.jsx | seq-02.puml | act-01.puml | `server/src/controllers/users.controller.js:522`; `client/src/Pages/Register/Register.jsx:1`; `server/src/routes/users.routes.js:13`; `server/src/services/otp.service.js:20`; `server/src/services/mail.service.js:21` |
| UC-03 | Gửi lại mã xác minh đăng ký | /api/resend-verification | client/src/Pages/Register/Register.jsx | seq-03.puml | act-01.puml | `server/src/controllers/users.controller.js:539`; `client/src/Pages/Register/Register.jsx:1`; `server/src/routes/users.routes.js:14`; `server/src/services/otp.service.js:20`; `server/src/services/mail.service.js:21` |
| UC-04 | Đăng nhập email | /api/login | client/src/Pages/LoginUser/LoginUser.jsx | seq-04.puml | act-02.puml | `server/src/controllers/users.controller.js:92`; `client/src/Pages/LoginUser/LoginUser.jsx:1`; `server/src/routes/users.routes.js:15` |
| UC-05 | Đăng nhập Google | /api/login-google | client/src/Pages/LoginUser/LoginUser.jsx | seq-05.puml | act-02.puml | `server/src/controllers/users.controller.js:92`; `client/src/Pages/LoginUser/LoginUser.jsx:1`; `server/src/routes/users.routes.js:19` |
| UC-06 | Kiểm tra và gia hạn phiên | /api/auth, /api/refresh-token, /api/admin | client/src/store/Provider.jsx | seq-06.puml | act-02.puml | `server/src/controllers/users.controller.js:166`; `client/src/store/Provider.jsx:1`; `server/src/routes/users.routes.js:16`; `server/src/routes/users.routes.js:17`; `server/src/routes/users.routes.js:30` |
| UC-07 | Đăng xuất | /api/logout | client/src/Components/Header/Header.jsx | seq-07.puml | act-02.puml | `server/src/controllers/users.controller.js:203`; `client/src/Components/Header/Header.jsx:1`; `server/src/routes/users.routes.js:18` |
| UC-08 | Khôi phục mật khẩu bằng OTP | /api/forgot-password, /api/verify-reset-password, /api/reset-password | client/src/Pages/ForgotPassword/ForgotPassword.jsx | seq-08.puml | act-03.puml | `server/src/controllers/users.controller.js:414`; `client/src/Pages/ForgotPassword/ForgotPassword.jsx:1`; `server/src/routes/users.routes.js:22`; `server/src/routes/users.routes.js:23`; `server/src/routes/users.routes.js:24`; `server/src/services/otp.service.js:20`; `server/src/services/mail.service.js:21` |
| UC-09 | Xem và cập nhật hồ sơ | /api/update-user | client/src/Pages/InfoUser/InfoUser.jsx | seq-09.puml | Có sequence riêng | `server/src/controllers/users.controller.js:218`; `client/src/Pages/InfoUser/InfoUser.jsx:1`; `server/src/routes/users.routes.js:20` |
| UC-10 | Xem catalog trang chủ | /api/get-product-new, /api/product-catalog, /api/get-product-manufactured, /api/get-product-by-category | client/src/Components/HomePage/ProductNew/ProductNew.jsx | seq-10.puml | act-04.puml | `server/src/services/product-catalog.service.js:37`; `client/src/Components/HomePage/ProductNew/ProductNew.jsx:1`; `server/src/routes/products.routes.js:9`; `server/src/routes/products.routes.js:10`; `server/src/routes/products.routes.js:14`; `server/src/routes/products.routes.js:15` |
| UC-11 | Tìm kiếm và lọc sản phẩm | /api/search, /api/catalog-options, /api/catalog-browse | client/src/Pages/Category/Category.jsx | seq-11.puml | act-04.puml | `server/src/services/catalog-browse.service.js:37`; `client/src/Pages/Category/Category.jsx:1`; `server/src/routes/products.routes.js:11`; `server/src/routes/products.routes.js:12`; `server/src/routes/products.routes.js:16` |
| UC-12 | Xem chi tiết sản phẩm và đánh giá | /api/get-product-by-id, /api/get-preview-product-home | client/src/Pages/DetailProduct/DetailProduct.jsx | seq-12.puml | act-04.puml | `server/src/controllers/products.controller.js:118`; `client/src/Pages/DetailProduct/DetailProduct.jsx:1`; `server/src/routes/previewProduct.routes.js:9`; `server/src/routes/products.routes.js:13` |
| UC-13 | Tạo đánh giá sản phẩm | /api/create-preview-product | client/src/Pages/InfoUser/OrderUser/OrderUser.jsx | seq-13.puml | Có sequence riêng | `server/src/controllers/previewProduct.controller.js:6`; `client/src/Pages/InfoUser/OrderUser/OrderUser.jsx:1`; `server/src/routes/previewProduct.routes.js:8` |
| UC-14 | Xem giỏ hàng | /api/get-cart | client/src/Pages/Cart/CartUser.jsx | seq-14.puml | act-04.puml | `server/src/controllers/cartUser.controller.js:114`; `client/src/Pages/Cart/CartUser.jsx:1`; `server/src/routes/cartUser.routes.js:9` |
| UC-15 | Thêm sản phẩm vào giỏ | /api/create-cart | client/src/Components/CardBody/CardBody.jsx | seq-15.puml | act-04.puml | `server/src/controllers/cartUser.controller.js:31`; `client/src/Components/CardBody/CardBody.jsx:1`; `server/src/routes/cartUser.routes.js:8` |
| UC-16 | Sửa số lượng giỏ | /api/update-product-cart | client/src/Pages/Cart/CartUser.jsx | seq-16.puml | act-04.puml | `server/src/controllers/cartUser.controller.js:196`; `client/src/Pages/Cart/CartUser.jsx:1`; `server/src/routes/cartUser.routes.js:11` |
| UC-17 | Xóa sản phẩm khỏi giỏ | /api/delete-product-cart | client/src/Pages/Cart/CartUser.jsx | seq-17.puml | act-04.puml | `server/src/controllers/cartUser.controller.js:160`; `client/src/Pages/Cart/CartUser.jsx:1`; `server/src/routes/cartUser.routes.js:10` |
| UC-18 | Chọn coupon và thông tin giao hàng | /api/update-info-cart, /api/coupon | client/src/Pages/CheckOut/CheckOut.jsx | seq-18.puml | act-04.puml | `server/src/controllers/cartUser.controller.js:235`; `client/src/Pages/CheckOut/CheckOut.jsx:1`; `server/src/routes/cartUser.routes.js:12`; `server/src/routes/coupon.routes.js:9` |
| UC-19 | Đặt hàng COD | /api/create-payment | client/src/Pages/CheckOut/CheckOut.jsx | seq-19.puml | act-04.puml | `server/src/services/vnpay.service.js:132`; `client/src/Pages/CheckOut/CheckOut.jsx:1`; `server/src/routes/payments.route.js:7` |
| UC-20 | Khởi tạo thanh toán VNPay | /api/create-payment | client/src/Pages/CheckOut/CheckOut.jsx | seq-20.puml | act-04.puml, act-05.puml | `server/src/services/vnpay.service.js:156`; `client/src/Pages/CheckOut/CheckOut.jsx:1`; `server/src/routes/payments.route.js:7` |
| UC-21 | Hiển thị kết quả Return VNPay | /api/check-payment-vnpay, /api/vnpay-return | client/src/Pages/PaymentSuccess/PaymentSuccess.jsx | seq-21.puml | act-05.puml | `server/src/controllers/payments.controller.js:148`; `client/src/Pages/PaymentSuccess/PaymentSuccess.jsx:1`; `server/src/routes/payments.route.js:8`; `server/src/routes/payments.route.js:9` |
| UC-22 | Xác nhận IPN VNPay | /api/vnpay-ipn | server/src/controllers/payments.controller.js | seq-22.puml | act-05.puml, act-06.puml | `server/src/services/vnpay.service.js:218`; `server/src/controllers/payments.controller.js:1`; `server/src/routes/payments.route.js:10` |
| UC-23 | Thanh toán lại VNPay | /api/retry-payment-vnpay | client/src/Pages/PaymentSuccess/PaymentSuccess.jsx | seq-23.puml | act-06.puml | `server/src/services/vnpay.service.js:179`; `client/src/Pages/PaymentSuccess/PaymentSuccess.jsx:1`; `server/src/routes/payments.route.js:11` |
| UC-24 | Đối soát trạng thái VNPay | /api/reconcile-payment-vnpay | client/src/Pages/PaymentSuccess/PaymentSuccess.jsx | seq-24.puml | act-05.puml, act-06.puml | `server/src/services/vnpay.service.js:232`; `client/src/Pages/PaymentSuccess/PaymentSuccess.jsx:1`; `server/src/routes/payments.route.js:12` |
| UC-25 | Thanh toán MoMo | /api/create-payment, /api/check-payment-momo | client/src/Pages/CheckOut/CheckOut.jsx | seq-25.puml | act-13.puml | `server/src/controllers/payments.controller.js:180`; `client/src/Pages/CheckOut/CheckOut.jsx:1`; `server/src/routes/payments.route.js:7`; `server/src/routes/payments.route.js:13` |
| UC-26 | Xem đơn hàng của mình | /api/get-payment-success, /api/get-order-user | client/src/Pages/InfoUser/OrderUser/OrderUser.jsx | seq-26.puml | act-04.puml | `server/src/controllers/payments.controller.js:269`; `client/src/Pages/InfoUser/OrderUser/OrderUser.jsx:1`; `server/src/routes/payments.route.js:14`; `server/src/routes/payments.route.js:15` |
| UC-27 | Hủy đơn hàng của mình | /api/cancel-order | client/src/Pages/InfoUser/OrderUser/OrderUser.jsx | seq-27.puml | act-04.puml, act-07.puml | `server/src/services/vnpay.service.js:327`; `client/src/Pages/InfoUser/OrderUser/OrderUser.jsx:1`; `server/src/routes/payments.route.js:16` |
| UC-28 | Đọc blog | /api/blog/get-all, /api/blog/get-by-id | client/src/Pages/DetailBlog/DetailBlog.jsx | seq-28.puml | act-12.puml | `server/src/controllers/blog.controller.js:58`; `client/src/Pages/DetailBlog/DetailBlog.jsx:1`; `server/src/routes/blog.routes.js:24`; `server/src/routes/blog.routes.js:27` |
| UC-29 | Chat với quản trị viên | /api/message/create, /api/message/get-message-user, /api/message/read-message | client/src/Components/Messger/Messger.jsx | seq-29.puml | act-09.puml | `server/src/controllers/message.controller.js:15`; `client/src/Components/Messger/Messger.jsx:1`; `server/src/routes/message.routes.js:8`; `server/src/routes/message.routes.js:13`; `server/src/routes/message.routes.js:14` |
| UC-30 | Quản trị hội thoại | /api/message/create-admin, /api/message/all, /api/message/get-message | client/src/Pages/Admin/Components/Messager/Messager.jsx | seq-30.puml | act-09.puml | `server/src/controllers/message.controller.js:42`; `client/src/Pages/Admin/Components/Messager/Messager.jsx:1`; `server/src/routes/message.routes.js:9`; `server/src/routes/message.routes.js:11`; `server/src/routes/message.routes.js:12` |
| UC-31 | Tư vấn bằng chatbot Gemini | /api/chatbot | client/src/utils/Chatbot/Chatbot.jsx | seq-31.puml | act-10.puml | `server/src/utils/chatbot.js:156`; `client/src/utils/Chatbot/Chatbot.jsx:1`; `server/src/server.js:64` |
| UC-32 | Quản lý sản phẩm | /api/create-product, /api/get-all-product, /api/update-product, /api/delete-product | client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx | seq-32.puml | act-08.puml | `server/src/controllers/products.controller.js:17`; `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx:1`; `server/src/routes/products.routes.js:8`; `server/src/routes/products.routes.js:18`; `server/src/routes/products.routes.js:19`; `server/src/routes/products.routes.js:20` |
| UC-33 | Quản lý danh mục | /api/create-category, /api/get-all-category, /api/update-category, /api/delete-category | client/src/Pages/Admin/Components/ManagerCategory/ManagerCategory.jsx | seq-33.puml | act-08.puml | `server/src/controllers/category.controller.js:40`; `client/src/Pages/Admin/Components/ManagerCategory/ManagerCategory.jsx:1`; `server/src/routes/category.routes.js:8`; `server/src/routes/category.routes.js:9`; `server/src/routes/category.routes.js:10`; `server/src/routes/category.routes.js:11` |
| UC-34 | Quản lý coupon | /api/create-coupon, /api/coupons, /api/update-coupon, /api/delete-coupon | client/src/Pages/Admin/Components/ManagerCoupon/CouponManagement.jsx | seq-34.puml | act-08.puml | `server/src/controllers/coupon.controller.js:10`; `client/src/Pages/Admin/Components/ManagerCoupon/CouponManagement.jsx:1`; `server/src/routes/coupon.routes.js:8`; `server/src/routes/coupon.routes.js:10`; `server/src/routes/coupon.routes.js:11`; `server/src/routes/coupon.routes.js:12` |
| UC-35 | Quản lý bài viết | /api/blog/create, /api/blog/update, /api/blog/delete | client/src/Pages/Admin/Components/ManagerBlog/BlogAdmin.jsx | seq-35.puml | act-12.puml | `server/src/controllers/blog.controller.js:20`; `client/src/Pages/Admin/Components/ManagerBlog/BlogAdmin.jsx:1`; `server/src/routes/blog.routes.js:23`; `server/src/routes/blog.routes.js:25`; `server/src/routes/blog.routes.js:26` |
| UC-36 | Xem người dùng và đổi quyền | /api/users, /api/update-user-admin | client/src/Pages/Admin/Components/ManagerUser/ManagerUser.jsx | seq-36.puml | act-11.puml | `server/src/controllers/users.controller.js:401`; `client/src/Pages/Admin/Components/ManagerUser/ManagerUser.jsx:1`; `server/src/routes/users.routes.js:27`; `server/src/routes/users.routes.js:28` |
| UC-37 | Xử lý đơn hàng phía quản trị | /api/get-order-admin, /api/update-order-status | client/src/Pages/Admin/Components/ManagerOrder/ManagerOrder.jsx | seq-37.puml | act-07.puml | `server/src/services/vnpay.service.js:327`; `client/src/Pages/Admin/Components/ManagerOrder/ManagerOrder.jsx:1`; `server/src/routes/payments.route.js:17`; `server/src/routes/payments.route.js:18` |
| UC-38 | Xem thống kê | /api/statistical | client/src/Pages/Admin/Components/ManagerStatistical/ManagerStatistical.jsx | seq-38.puml | act-11.puml | `server/src/controllers/users.controller.js:225`; `client/src/Pages/Admin/Components/ManagerStatistical/ManagerStatistical.jsx:1`; `server/src/routes/users.routes.js:26` |
| UC-39 | Tải ảnh sản phẩm hoặc blog | /api/upload-image, /api/blog/upload-image | client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx | seq-39.puml | act-08.puml, act-12.puml | `server/src/routes/index.js:1`; `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx:1`; `server/src/routes/blog.routes.js:22`; `server/src/routes/index.js:103` |
| UC-40 | Xem danh sách thương hiệu | /api/brands | client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx | seq-40.puml | act-08.puml | `server/src/services/brand.service.js:4`; `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx:1`; `server/src/routes/brand.routes.js:8` |
| UC-41 | Xem thông tin liên hệ | Trang Contact tĩnh, không cần backend API | client/src/Pages/Contact/Contact.jsx | seq-41.puml | Có sequence riêng | `client/src/Pages/Contact/Contact.jsx:8`; `client/src/Pages/Contact/Contact.jsx:1` |

## Khoảng trống và code chưa nối hoàn chỉnh

- Route chưa được phân loại UC: **0**. Endpoint có handler lỗi vẫn được gắn UC mô tả as-is và có Phát hiện, không được tính là hoạt động đúng. GET /api/users đăng ký lặp tại routes/index.js nhưng chỉ tính một endpoint.
- Model thiếu class: **0**; 13 model và 13 sơ đồ class-model tương ứng. Không có model Order riêng; payments là đơn, paymentAttempts là lần thanh toán.

| Vị trí / khoảng trống | Hiện trạng có nguồn |
| --- | --- |
| Contact | `client/src/Pages/Contact/Contact.jsx:Contact`: UC-41 trang tĩnh không API; không tự bổ sung form liên hệ. |
| `/profile`, `/orders` | Cùng render InfoUser; selectedKey mặc định '1', chưa chọn tab orders theo pathname. Nguồn: `client/src/Routes/routes.jsx:1`, `client/src/Pages/InfoUser/InfoUser.jsx:InfoUser`. |
| Admin users | Chỉ list và update isAdmin; không có create/delete user API quản trị; không mô tả CRUD user đầy đủ. Nguồn: `server/src/routes/users.routes.js:1`. |
| Brand | Chỉ list qua authAdmin, options public; model brand có key unique nhưng không có API ghi. Nguồn: `server/src/routes/brand.routes.js:1`, `server/src/services/brand.service.js:list`. |
| Review khách hàng | UI gọi API authAdmin; chưa nối end-to-end cho user thường. Nguồn: UC-13 và Phát hiện bên dưới. |
| Callback MoMo | Có UI và tạo payUrl; MOMO_IPN_URL chỉ là cấu hình gửi ra, không thấy route POST IPN nhận vào; GET callback không có nhánh lỗi kết thúc. Nguồn: `server/src/controllers/payments.controller.js:createPayment`, `checkPaymentMomo`, `server/src/routes/payments.route.js:1`. |
| Hoàn tiền VNPay | refund_required được lưu và UI hiển thị, không có API hoàn tiền tự động; không mô tả là đã hoàn tiền. Nguồn: `server/src/services/vnpay.service.js:settle`, `client/src/Pages/PaymentSuccess/PaymentSuccess.jsx:paymentLabels`. |
| Lịch sử chat mới | getMessageUser yêu cầu có tin sender trước; admin ban đầu không có cũng lỗi; không có conversation model riêng. Nguồn: `server/src/controllers/message.controller.js:getMessageUser`, `createMessage`. |
| allUserOnline / userConnected | Provider có listener allUserOnline không tìm thấy emit; server có listener userConnected không thấy client emit; không thay được identity socket. Nguồn: `client/src/store/Provider.jsx:Provider`, `server/src/socket.js:initSocket`. |
| ProductByCategory | Component có hook/API nhưng HomePage không import; có thể là phần UI legacy không mounted từ trang chủ. Nguồn: `client/src/Components/HomePage/HomePage.jsx:1`, `client/src/Components/HomePage/ProductByCategory/ProductByCategory.jsx:1`. |
| uploadImages | Method rỗng không route trong products.controller; upload thực ở routes/index.js. Nguồn: `server/src/controllers/products.controller.js:uploadImages`, `server/src/routes/index.js:routes`. |
| Email legacy | register/forgotPassword/resetPassword return sang handler mới trước phần code cũ; lời gọi SendMailForgotPassword, otp-generator và nhánh JWT legacy sau return không tới được. Module mail cũ vẫn import ở đầu file. Nguồn: `server/src/controllers/users.controller.js:register`, `forgotPassword`, `resetPassword`. |
| Crypto môi trường | Không tìm thấy SECRET_CRYPTO/VITE_SECRET_CRYPTO trong code src đang dùng; không kết luận đang lộ crypto secret qua bundle hiện tại chỉ từ hướng dẫn cũ. Nguồn kiểm kê: tất cả src server/client; đối chiếu SETUP_GUIDE phía dưới. |
| config/vnpay.js | Có export cấu hình, service mới tự đọc config, không thấy consumer require config/vnpay trong src. Nguồn: `server/src/config/vnpay.js:1`, `server/src/services/vnpay.service.js:config`. |
| Ollama | Compose có profile chatbot tùy chọn; backend chatbot thực dùng Gemini, không có call Ollama trong src. Nguồn: `docker-compose.yaml:1`, `server/src/utils/chatbot.js:askQuestion`. |

### Wrapper API không có consumer ngoài request.jsx

| Wrapper | Endpoint | Lưu ý |
| --- | --- | --- |
| requestRefreshToken | GET /api/refresh-token | Không đồng nghĩa endpoint chết; có thể được gọi bằng useFetch/hook trực tiếp hoặc bên ngoài |
| requestGetProductManufactured | GET /api/get-product-manufactured | Không đồng nghĩa endpoint chết; có thể được gọi bằng useFetch/hook trực tiếp hoặc bên ngoài |
| requestGetPreviewProductHome | GET /api/get-preview-product-home | Không đồng nghĩa endpoint chết; có thể được gọi bằng useFetch/hook trực tiếp hoặc bên ngoài |

## Cấu hình môi trường (chỉ tên biến)

Không chép giá trị, URL thực, token, password hoặc key. Kiểm kê tên khai báo không chứng nhận giá trị hợp lệ hay biến đã được provider cấp quyền.

| File | Tên biến đọc được |
| --- | --- |
| server/.env | CLIENT_URL, CONNECT_DB, DOMAIN_URL, GEMINI_API_KEY, GEMINI_MODEL, GHN_ENV, GHN_SHOP, GHN_TOKEN, GOOGLE_CLIENT, GOOGLE_SECRET, JWT_SECRET, MAIL_CHECK_RECIPIENT, MAIL_FROM, REDIRECT_URI, REFRESH_TOKEN, SECRET_CRYPTO, SECRET_KEY, USER_EMAIL, VNPAY_ENV, VNPAY_RETURN_URL, VNPAY_SECRET_KEY, VNPAY_TMN_CODE, VNPAY_URL |
| client/.env | VITE_CLIENT_ID, VITE_SECRET_CRYPTO, VITE_TUNNEL_HOST, VITE_URL_API, VITE_URL_IMAGE_API |

| Biến được tham chiếu trực tiếp | Nơi dùng | Có tên trong .env kiểm kê |
| --- | --- | --- |
| CONNECT_DB | server/src/config/connectDB.js | server |
| DEV | client/src/config/runtimeUrls.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| DOMAIN_URL | server/src/controllers/payments.controller.js; server/src/services/vnpay.service.js | server |
| EMAIL_USER | server/src/utils/SendMail/sendMailForgotPassword.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| GEMINI_API_KEY | server/src/utils/chatbot.js | server |
| GEMINI_MODEL | server/src/utils/chatbot.js | server |
| GOOGLE_CLIENT | server/src/controllers/users.controller.js; server/src/utils/SendMail/sendMailForgotPassword.js | server |
| GOOGLE_SECRET | server/src/utils/SendMail/sendMailForgotPassword.js | server |
| JWT_SECRET | server/src/controllers/users.controller.js | server |
| MOMO_ACCESS_KEY | server/src/controllers/payments.controller.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| MOMO_ENDPOINT | server/src/controllers/payments.controller.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| MOMO_IPN_URL | server/src/controllers/payments.controller.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| MOMO_PARTNER_CODE | server/src/controllers/payments.controller.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| MOMO_REDIRECT_URL | server/src/controllers/payments.controller.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| MOMO_SECRET_KEY | server/src/controllers/payments.controller.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| NODE_ENV | server/src/config/connectDB.js; server/src/controllers/payments.controller.js; server/src/controllers/users.controller.js; server/src/services/vnpay.service.js; server/src/utils/chatbot.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| REDIRECT_URI | server/src/utils/SendMail/sendMailForgotPassword.js | server |
| REFRESH_TOKEN | server/src/utils/SendMail/sendMailForgotPassword.js | server |
| TRUST_PROXY | server/src/server.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| USER_EMAIL | server/src/utils/SendMail/sendMailForgotPassword.js | server |
| VITE_API_MODE | client/src/config/runtimeUrls.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| VITE_CLIENT_ID | client/src/Pages/LoginUser/LoginUser.jsx | client |
| VITE_CONTACT_EMAIL | client/src/config/contactInfo.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| VITE_CONTACT_FACEBOOK_URL | client/src/config/contactInfo.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| VITE_CONTACT_INSTAGRAM_URL | client/src/config/contactInfo.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| VITE_CONTACT_PHONE | client/src/config/contactInfo.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| VITE_CONTACT_TIKTOK_URL | client/src/config/contactInfo.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| VITE_CONTACT_YOUTUBE_URL | client/src/config/contactInfo.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| VITE_CONTACT_ZALO_URL | client/src/config/contactInfo.js | Không thấy; có thể được cấp từ môi trường chạy/default |
| VITE_URL_API | client/src/config/runtimeUrls.js | client |
| VITE_URL_IMAGE_API | client/src/config/runtimeUrls.js | client |
| VNPAY_ENV | server/src/services/vnpay.service.js | server |
| VNPAY_RETURN_URL | server/src/config/vnpay.js; server/src/services/vnpay.service.js | server |
| VNPAY_SECRET_KEY | server/src/config/vnpay.js; server/src/services/vnpay.service.js | server |
| VNPAY_TMN_CODE | server/src/config/vnpay.js; server/src/services/vnpay.service.js | server |
| VNPAY_URL | server/src/config/vnpay.js; server/src/services/vnpay.service.js | server |

Các config gián tiếp còn có: `VNPAY_TMN_CODE`, `VNPAY_SECRET_KEY`, `VNPAY_URL`, `VNPAY_RETURN_URL`, `DOMAIN_URL`, `VNPAY_ENV` trong vnpay.service.config; mail.service yêu cầu `GOOGLE_CLIENT`, `GOOGLE_SECRET`, `REDIRECT_URI`, `REFRESH_TOKEN`, `USER_EMAIL`; MoMo cần các biến `MOMO_*` liệt kê trong payments.controller.createPayment. CORS đọc `CLIENT_ORIGINS` qua đối tượng env, runtime có `NODE_ENV`/`TRUST_PROXY`; Vite có `VITE_TUNNEL_HOST` và `VITE_API_MODE`. Nguồn: các hàm/file nêu trên và `client/vite.config.js:1`, `server/src/config/cors.js:1`.

Compose hiện có `env_file: ./server/.env`, không phải bắt buộc chép thủ công mọi biến vào environment; chỉ ghi đè CONNECT_DB và TRUST_PROXY. `.gitignore` loại .env/.env.*. Không suy ra lịch sử Git chưa từng chứa secret từ .gitignore; cần kiểm history bằng quy trình không xuất secret nếu muốn audit lịch sử. Nguồn: `docker-compose.yaml:1`, `.gitignore:1`.

## Chênh lệch SETUP_GUIDE và code

| Hướng dẫn | Code as-is / kết luận | Nguồn |
| --- | --- | --- |
| Yêu cầu SECRET_CRYPTO khớp VITE_SECRET_CRYPTO và coi bắt buộc | Không có tham chiếu hai biến trong src hiện tại; JWT dùng RSA apikey. Hướng dẫn này đã cũ cho snapshot đang xét. | SETUP_GUIDE.md:58; SETUP_GUIDE.md:110; SETUP_GUIDE.md:323; server/src/services/tokenSevices.js:1 |
| EMAIL_USER được khai báo cùng USER_EMAIL | Shared mailService dùng USER_EMAIL; EMAIL_USER chỉ ở utility legacy được gọi trong code sau return. Phần Email OTP đầu guide đã mô tả đúng mailService mới nhưng mẫu env còn dư. | SETUP_GUIDE.md:5; SETUP_GUIDE.md:76; server/src/services/mail.service.js:createMailService; server/src/utils/SendMail/sendMailForgotPassword.js:1 |
| MongoDB local cơ bản | Checkout COD/VNPAY yêu cầu replica set transaction; compose hiện đã có replSet/healthcheck; không thể dùng standalone như một thay thế tương đương. | SETUP_GUIDE.md:247; server/src/services/vnpay.service.js:transaction; docker-compose.yaml:1 |
| Ví dụ Return localhost | Được dùng cho dev nếu cấu hình đúng origin/proxy; production config từ chối localhost và non-HTTPS. Không coi mọi localhost dev là bug. | SETUP_GUIDE.md:90; server/src/services/vnpay.service.js:config |
| Atlas allow all IP | Guide có chỉ dẫn 0.0.0.0/0; chưa biết project thực tế có áp dụng trong Atlas hay không. Ghi nhận rủi ro hướng dẫn, không kết luận deployment đang mở. | SETUP_GUIDE.md:263 |
| URL API/image và chạy dev | runtimeUrls mặc định dev proxy nên VITE_URL_API/VITE_URL_IMAGE_API chỉ áp dụng configured mode; guide cần mô tả VITE_API_MODE, proxy/socket/tunnel. | SETUP_GUIDE.md:104; client/src/config/apiBaseUrl.js:resolveApiBaseUrl; client/vite.config.js:1 |
| Google popup/Gmail consent | Guide đầu đã cập nhật popup không cần redirect localhost; cấu hình Console và trạng thái Gmail consent không thể xác nhận chỉ bằng repo. | SETUP_GUIDE.md:3; SETUP_GUIDE.md:237; server/src/controllers/users.controller.js:loginGoogle |

## Phát hiện

Các mục sau chỉ ghi nhận, không có sửa code. Critical/High ưu tiên tài chính và bảo mật; không coi lỗi UI/style đơn thuần là trọng tâm.

### F-01 [MỨC ĐỘ: Critical] Callback MoMo tin tham số chưa xác minh chữ ký

- **Vị trí:** `server/src/controllers/payments.controller.js:180`; `server/src/routes/payments.route.js:13`.
- **Mô tả:** Endpoint GET công khai chỉ kiểm resultCode=0, lấy cartId từ orderInfo, tạo đơn và trừ kho/coupon. Không verify signature, amount, merchant hoặc quan hệ request đã tạo với callback. Đơn mới MOMO có paymentStatus mặc định unpaid nhưng changeStatus chỉ bắt buộc paid với VNPAY.
- **Cách tái hiện:** Trong môi trường test riêng, chuẩn bị giỏ có shipping và sản phẩm; gửi GET /api/check-payment-momo với resultCode=0, orderId mới và orderInfo có cartId ở token thứ ba mà không có chữ ký. Đối chiếu order/kho. Chưa thực thi request trong nhiệm vụ.
- **Tác động:** Có thể tạo đơn online chưa trả tiền, thay đổi kho/coupon và đi tiếp quy trình giao hàng MoMo.
- **Đề xuất sửa:** Liên kết attempt/order đã tạo, verify callback HMAC và amount/merchant, dùng IPN đã xác minh + transaction/idempotency tương đương luồng VNPay.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-02 [MỨC ĐỘ: High] Upload blog công khai và không giới hạn loại/kích thước file

- **Vị trí:** `server/src/routes/blog.routes.js:22`; `server/src/routes/index.js:25`.
- **Mô tả:** Blog upload thiếu authAdmin; cả hai cấu hình Multer không có fileFilter, limits hoặc kiểm magic bytes. Tên giữ đuôi file gốc. Blog upload dùng single nhưng sản phẩm array không maxCount.
- **Cách tái hiện:** Ở môi trường test, POST multipart /api/blog/upload-image không cookie với một file HTML vô hại; kiểm response URL và Content-Type khi truy cập. Không tải file lên trong nhiệm vụ.
- **Tác động:** Người không đăng nhập ghi file, có thể làm đầy disk hoặc host nội dung chủ động cùng origin; khả năng thực thi JS cần xác minh theo MIME/proxy thực tế.
- **Đề xuất sửa:** Đặt authAdmin trước upload blog; whitelist ảnh qua MIME/extension/magic bytes, limits và tên random, phục vụ uploads bằng chính sách nội dung phù hợp.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-03 [MỨC ĐỘ: High] Static middleware công khai cả source backend

- **Vị trí:** `server/src/server.js:46`.
- **Mô tả:** express.static trỏ cả server/src thay vì chỉ uploads; các file routes/controllers/services/models trong src có thể được tải như static.
- **Cách tái hiện:** Trong môi trường test, GET /controllers/users.controller.js hoặc /services/vnpay.service.js qua backend trực tiếp. Nginx hiện không proxy các path này nên cần phân biệt đường truy cập backend.
- **Tác động:** Lộ logic backend và cấu trúc nội bộ nếu backend truy cập được; không kết luận .env ở server root bị phục vụ.
- **Đề xuất sửa:** Chỉ mount /uploads tới thư mục uploads, không dùng src làm static root.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-04 [MỨC ĐỘ: High] Response cập nhật hồ sơ trả cả password field

- **Vị trí:** `server/src/controllers/users.controller.js:218`; `server/src/controllers/users.controller.js:396`; `server/src/controllers/users.controller.js:401`.
- **Mô tả:** updateUser, findAllUser và updateUserAdmin trả Mongoose document không projection; schema password không select:false. AuthUser riêng đã whitelist nhưng không áp dụng cho các response này.
- **Cách tái hiện:** Ở môi trường test, đăng nhập rồi POST update-user; chỉ kiểm sự hiện diện field password, không in giá trị. Admin GET users và đổi quyền cũng kiểm field tương tự.
- **Tác động:** Password hash bị truyền tới browser không cần thiết, làm tăng khả năng lộ khi response/log/client bị truy cập.
- **Đề xuất sửa:** Dùng DTO whitelist hoặc projection loại password và các dữ liệu nhạy cảm trước response; không trả key/OTP.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-05 [MỨC ĐỘ: High] Reset password chưa thu hồi phiên và proof có thể dùng lại

- **Vị trí:** `server/src/controllers/users.controller.js:585`; `server/src/services/tokenSevices.js:49`.
- **Mô tả:** Reset chỉ đổi password và clear proof cookie, không xóa apikey hoặc ghi trạng thái proof đã consume. Một bản proof hợp lệ còn giữ được có thể gửi lại đến khi hết 5m. JWT phiên cũ vẫn verify bằng cặp RSA cũ.
- **Cách tái hiện:** Trong test riêng, giữ phiên A, thực hiện reset bằng B, thử API auth của A; lưu proof trong test rồi thử dùng lại sau lần reset đầu. Không xuất token ra báo cáo.
- **Tác động:** Đổi mật khẩu chưa kết thúc phiên bị chiếm; proof còn hạn chưa được thu hồi phía server.
- **Đề xuất sửa:** Thu hồi/rotate key khi reset và gắn proof với nonce/version có consume một lần; kiểm tra atomically khi đổi mật khẩu.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-06 [MỨC ĐỘ: Medium] Access token và refresh token chưa phân biệt purpose

- **Vị trí:** `server/src/services/tokenSevices.js:23`; `server/src/services/tokenSevices.js:36`; `server/src/services/tokenSevices.js:49`.
- **Mô tả:** Hai loại JWT có cùng payload id và key RS256; verifyToken không kiểm token use/purpose. Middleware authUser có thể xác minh refresh JWT nếu nó được đặt vào cookie token.
- **Cách tái hiện:** Test đơn vị với khóa giả: tạo refresh JWT rồi gọi verifyToken/authUser qua cookie token; kiểm được chấp nhận dù thời hạn access dự kiến 15m.
- **Tác động:** Ranh giới access 15m và refresh 7d không được enforce qua token purpose.
- **Đề xuất sửa:** Thêm purpose và verify riêng cho access/refresh; không tái sử dụng verifier thiếu purpose.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-07 [MỨC ĐỘ: Medium] UI đánh giá khách hàng bị chặn bởi authAdmin

- **Vị trí:** `server/src/routes/previewProduct.routes.js:8`; `client/src/Pages/InfoUser/OrderUser/OrderUser.jsx:71`.
- **Mô tả:** OrderUser cho khách gửi đánh giá, nhưng endpoint yêu cầu admin. Handler không kiểm order delivered/mua sản phẩm hoặc bound rating.
- **Cách tái hiện:** Khách thường đã đăng nhập gửi đánh giá ở đơn đủ điều kiện UI; API trả 401 Bạn không có quyền truy cập. Test admin có thể tạo mà không chứng minh đã mua.
- **Tác động:** Tính năng review khách hàng không hoạt động end-to-end; integrity rating còn thiếu.
- **Đề xuất sửa:** Nếu cho khách review: authUser cộng kiểm ownership/đơn delivered/product và validate rating/content; xác định chính sách mỗi đơn/sản phẩm.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-08 [MỨC ĐỘ: Medium] Sửa tên/thông số sản phẩm không khớp schema và form

- **Vị trí:** `server/src/controllers/products.controller.js:201`; `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx:128`.
- **Mô tả:** Form dùng nameProduct nhưng handleEdit gán name; controller update whitelist name/size không có trong schema và bỏ nameProduct/modelNumber/origin/movement cùng nhiều thông số.
- **Cách tái hiện:** Ở test UI, sửa nameProduct hoặc modelNumber rồi lưu, tải lại product để so; giá/stock có thể đổi nhưng các field bị bỏ không đổi.
- **Tác động:** Admin tưởng đã lưu thông tin nhưng dữ liệu giữ giá trị cũ.
- **Đề xuất sửa:** Đồng bộ đúng field whitelist theo schema và form, giữ validate tối thiểu cho các field sửa.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-09 [MỨC ĐỘ: Medium] Endpoint coupon legacy thiếu auth và dùng field tổng không tồn tại

- **Vị trí:** `server/src/routes/coupon.routes.js:9`; `server/src/controllers/coupon.controller.js:27`.
- **Mô tả:** Route không có authUser nhưng handler destructure req.user.id; nếu bổ sung auth vẫn dùng findCart.totalCartBefore khác schema totalPrice. UI hiện lấy coupon qua get-cart nên không cần endpoint này để checkout.
- **Cách tái hiện:** GET /api/coupon theo registered route ở test sẽ đi vào req.user undefined; tiếp theo kiểm tên field với cart schema.
- **Tác động:** Endpoint lỗi 500, không cung cấp coupon hợp lệ như tên gọi.
- **Đề xuất sửa:** Xác định loại bỏ legacy hoặc thêm authUser và tính tổng nhất quán từ giỏ; không vá UI gọi endpoint lỗi.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-10 [MỨC ĐỘ: Medium] Async blog chưa được wrapper bắt rejection trên Express 4

- **Vị trí:** `server/src/routes/blog.routes.js:23`; `server/package.json:28`.
- **Mô tả:** Các blog controller async được truyền trực tiếp, không asyncHandler/try catch. Express đang khai báo 4.x nên rejected Promise không tự gọi next.
- **Cách tái hiện:** Trong test mock modelBlog.create/find reject; xác minh error middleware không được gọi. Không tạo lỗi DB thật.
- **Tác động:** Request có thể treo hoặc process gặp unhandled rejection tùy runtime.
- **Đề xuất sửa:** Bọc các handler async bằng wrapper hiện có, forward error nhất quán.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-11 [MỨC ĐỘ: Medium] NotFoundError được dùng nhưng chưa import/định nghĩa

- **Vị trí:** `server/src/controllers/category.controller.js:44`; `server/src/controllers/blog.controller.js:41`.
- **Mô tả:** Xóa category không tồn tại và update blog không tồn tại gọi identifier không được khai báo trong module; error.response cũng chưa export NotFoundError.
- **Cách tái hiện:** Mock findByIdAndDelete/findById trả null và chạy handler trong test riêng; gặp ReferenceError thay lỗi không tồn tại.
- **Tác động:** Category trả 500 qua wrapper; blog có thêm vấn đề rejection chưa wrapper.
- **Đề xuất sửa:** Dùng error class hiện có với status 404 rõ hoặc định nghĩa/import NotFoundError thống nhất.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-12 [MỨC ĐỘ: Medium] Schema dùng require thay required và thiếu ràng buộc nghiệp vụ

- **Vị trí:** `server/src/models/users.model.js:7`; `server/src/models/cartUser.model.js:7`; `server/src/models/payments.model.js:7`; `server/src/models/blog.model.js:7`.
- **Mô tả:** Nhiều field khai báo require:true, không phải validator required. products.price/stock và coupon.discount/quantity không min; review rating không bound. Một số update query không runValidators.
- **Cách tái hiện:** Tạo document trong test đơn vị với field thiếu/giá âm để kiểm schema validate; không ghi DB. So sánh options required với require.
- **Tác động:** Dữ liệu có thể thiếu/không hợp lệ nếu vượt qua validation controller hoặc đi qua update/import.
- **Đề xuất sửa:** Sửa constraint đúng theo policy và validate ở controller/query; cần kiểm dữ liệu legacy trước enforce.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-13 [MỨC ĐỘ: Medium] Ref model không nhất quán tên đăng ký

- **Vị trí:** `server/src/models/payments.model.js:10`; `server/src/models/previewProduct.model.js:7`; `server/src/models/message.model.js:7`.
- **Mô tả:** Model đăng ký user/products nhưng có refs users/User/product. Truy vấn tay hiện có không kích hoạt populate nên chưa kết luận toàn bộ request đang lỗi.
- **Cách tái hiện:** Kiểm schema.path(...).options.ref và các modelNames; test populate trên dữ liệu giả ở môi trường riêng nếu cần.
- **Tác động:** Populate có thể báo MissingSchemaError; quan hệ không được đảm bảo như ref mô tả.
- **Đề xuất sửa:** Thống nhất ref với tên model đăng ký, giữ nguyên dữ liệu id và kiểm các consumer trước đổi.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-14 [MỨC ĐỘ: Medium] Giỏ hàng đọc rồi ghi và thiếu unique userId

- **Vị trí:** `server/src/controllers/cartUser.controller.js:31`; `server/src/models/cartUser.model.js:7`.
- **Mô tả:** Add/update giỏ thao tác findOne→save/create, chưa unique userId hoặc atomic update/transaction; request đồng thời có thể tạo hai cart hoặc mất cập nhật.
- **Cách tái hiện:** Trong test concurrency riêng, gửi hai add đồng thời cho user chưa có cart rồi đếm cart theo userId; lặp update cùng item. Chưa tái hiện runtime.
- **Tác động:** Giỏ bị trùng/mất quantity; findOne có thể chọn giỏ khác mong muốn.
- **Đề xuất sửa:** Unique userId sau dọn legacy và mutation atomic hoặc transaction theo cart.
- **Độ chắc chắn:** Cần xác minh (phân tích tĩnh; chưa chạy khai thác).

### F-15 [MỨC ĐỘ: Medium] OTP window gửi theo email mất khi record bị xóa

- **Vị trí:** `server/src/services/otp.service.js:21`; `server/src/services/otp.service.js:65`; `server/src/models/otp.model.js:9`.
- **Mô tả:** SendCount/sendWindowStartedAt nằm cùng record OTP TTL 10m và consume xóa record; giới hạn 5 lần/email/type/giờ không tồn tại đủ 1 giờ sau TTL/consume. Limiter IP vẫn còn nhưng nhiều IP có thể khác.
- **Cách tái hiện:** Test dùng clock/mock Otp: issue, xóa record mô phỏng TTL hoặc consume, issue lần tiếp theo và quan sát sendCount bắt đầu lại. Kiểm thêm concurrent issue vì không unique email/type.
- **Tác động:** Giới hạn email/giờ yếu hơn hằng số/policy thể hiện; có thể gây nhiều mail nếu đổi IP.
- **Đề xuất sửa:** Tách counter gửi khỏi OTP có TTL, dùng atomic counter/unique email-type và window đủ 1h.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-16 [MỨC ĐỘ: Medium] Thống kê dùng tên field khác schema và gộp tháng qua nhiều năm

- **Vị trí:** `server/src/controllers/users.controller.js:232`; `server/src/controllers/users.controller.js:324`; `server/src/controllers/users.controller.js:279`.
- **Mô tả:** User schema là typeLogin nhưng aggregate loginType; review schema productId nhưng group product, lookup/project còn name thay nameProduct. Revenue byMonth chỉ month không year.
- **Cách tái hiện:** Test dữ liệu giả có hai typeLogin, review nhiều sản phẩm và delivered orders cùng tháng khác năm; so output facets với kỳ vọng.
- **Tác động:** Dashboard trả nhóm null, top review rỗng/sai và revenue gộp khác năm.
- **Đề xuất sửa:** Đồng bộ field schema, group year-month hoặc filter kỳ thống kê rõ.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-17 [MỨC ĐỘ: Medium] Chi tiết sản phẩm dùng danh sách review giới hạn 10 toàn hệ thống

- **Vị trí:** `client/src/Pages/DetailProduct/DetailProduct.jsx:22`; `server/src/controllers/previewProduct.controller.js:25`.
- **Mô tả:** DetailProduct hiển thị reviewsData từ endpoint home rồi filter productId, trong khi get-product-by-id cũng đã trả previewProduct đầy đủ. Một sản phẩm có review ngoài 10 record đầu không hiển thị.
- **Cách tái hiện:** Test mock home API có 10 review của sản phẩm khác, detail API có review của sản phẩm hiện tại; mở detail và so review render.
- **Tác động:** Người dùng thấy thiếu đánh giá hoặc tưởng sản phẩm chưa được đánh giá.
- **Đề xuất sửa:** Dùng review theo productId từ detail hoặc endpoint phân trang riêng; không dùng home sampling cho chi tiết.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-18 [MỨC ĐỘ: Medium] Đọc chi tiết/list sản phẩm dễ truy cập null khi quan hệ mất

- **Vị trí:** `server/src/controllers/products.controller.js:122`; `server/src/controllers/products.controller.js:191`; `server/src/controllers/previewProduct.controller.js:37`.
- **Mô tả:** getProductById dùng product.category trước kiểm product null; getAllProduct dùng category.name không kiểm category; review home dùng user/product không kiểm null và product.name khác nameProduct.
- **Cách tái hiện:** Test mock product/category/user trả null hoặc id không tồn tại, kiểm handler response; không xóa dữ liệu thật.
- **Tác động:** Một bản ghi mồ côi có thể làm cả danh sách hoặc trang chi tiết lỗi 500.
- **Đề xuất sửa:** Xử lý 404/fallback từng quan hệ, thống nhất field và integrity khi xóa.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-19 [MỨC ĐỘ: Medium] Xóa category/products chưa bảo toàn các quan hệ và file

- **Vị trí:** `server/src/controllers/category.controller.js:40`; `server/src/controllers/products.controller.js:215`.
- **Mô tả:** Xóa category rồi products bằng hai thao tác không transaction; không cleanup review/cart/upload. getCart có tự dọn item mất nhưng không phải mọi consumer có fallback.
- **Cách tái hiện:** Test mock deleteMany reject sau category delete; kiểm trạng thái từng bước. Test các consumer với product/category đã mất bằng fixture riêng.
- **Tác động:** Dữ liệu mồ côi và lỗi danh sách; file rác; đơn mới giữ snapshot nên ít phụ thuộc hơn.
- **Đề xuất sửa:** Thiết kế soft delete hoặc transaction/cơ chế bù và cleanup quan hệ có kiểm soát; không xóa snapshot đơn.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-20 [MỨC ĐỘ: Medium] Legacy search nhận regex trực tiếp và không phân trang

- **Vị trí:** `server/src/controllers/products.controller.js:237`.
- **Mô tả:** Header dùng /api/search; controller gán valueSearch vào $regex không escape, không giới hạn độ dài/limit. Service catalog-browse mới đã escape và phân trang nhưng không thay endpoint này.
- **Cách tái hiện:** Trong test mock query, gửi ký tự regex và chuỗi dài; kiểm filter được truyền và số kết quả. Không thử payload làm quá tải trên hệ thống thật.
- **Tác động:** Kết quả khác tìm văn bản thường; nguy cơ tiêu thụ CPU/response lớn tùy dữ liệu.
- **Đề xuất sửa:** Validate scalar/độ dài, escape regex, limit hoặc chuyển consumer sang browse có phân trang.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-21 [MỨC ĐỘ: Medium] Refresh queue của axios request.jsx có thể không resolve request đầu

- **Vị trí:** `client/src/config/request.jsx:364`; `client/src/config/request.jsx:379`.
- **Mô tả:** Request đầu gặp 401 await refresh rồi flush queue trước khi chính request đó được push vào queue; sau đó Promise có thể chờ vô hạn. Chỉ áp dụng instance request; ApiClient có implementation khác.
- **Cách tái hiện:** Test axios adapter giả trả 401 rồi refresh 200, chờ requestLogin/requestCreateCart đi qua request interceptor; kiểm Promise chưa settle. Cần test mock để xác nhận runtime.
- **Tác động:** Một số call có thể treo sau access hết hạn dù refresh thành công.
- **Đề xuất sửa:** Retry request đầu trực tiếp sau refresh và chỉ queue request chờ; thống nhất interceptor sau khi xác định phạm vi.
- **Độ chắc chắn:** Cần xác minh (phân tích tĩnh; chưa chạy khai thác).

### F-22 [MỨC ĐỘ: Medium] Nginx chưa proxy đường Socket.IO

- **Vị trí:** `nginx/default.conf:16`; `client/src/store/Provider.jsx:47`.
- **Mô tả:** Nginx chỉ proxy /api và /uploads; đường /socket.io rơi vào SPA try_files. Vite dev đã proxy ws. Khi frontend/socket dùng origin Nginx thì realtime không tới backend.
- **Cách tái hiện:** Kiểm cấu hình build API_BASE_URL; nếu same-origin Nginx, thử handshake /socket.io trong môi trường test và xem response HTML. Không khởi động nginx trong nhiệm vụ.
- **Tác động:** Chat HTTP vẫn có thể lưu tin nhưng realtime lỗi trên mô hình deploy qua Nginx.
- **Đề xuất sửa:** Bổ sung proxy Socket.IO với websocket upgrade/polling phù hợp hoặc cấu hình backend origin có thể truy cập.
- **Độ chắc chắn:** Cần xác minh (phân tích tĩnh; chưa chạy khai thác).

### F-23 [MỨC ĐỘ: Medium] Dockerfile client build trước khi copy source

- **Vị trí:** `client/Dockerfile:11`; `client/Dockerfile:13`.
- **Mô tả:** Build stage mới chỉ copy package manifests rồi chạy vite build; index.html/src được copy sau. Compose hiện không build service client nên lỗi này nằm ở đường docker build client riêng.
- **Cách tái hiện:** Rà thứ tự Dockerfile; trên môi trường riêng chạy docker build client sẽ thiếu entry source ở bước build. Không build/cài dependency trong nhiệm vụ.
- **Tác động:** Đường dựng client image không hoạt động theo Dockerfile hiện có.
- **Đề xuất sửa:** COPY source trước RUN npm run build; giữ cache npm install bằng layer manifests.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-24 [MỨC ĐỘ: Medium] Chat lỗi khi chưa có lịch sử/admin và mark read quá rộng

- **Vị trí:** `server/src/controllers/message.controller.js:164`; `server/src/controllers/message.controller.js:21`; `server/src/controllers/message.controller.js:175`.
- **Mô tả:** getMessageUser đọc data.receiverId khi findOne null; createMessage đọc findAdmin.id khi không có admin; readMessage update cả hai chiều conversation thay vì chỉ tin gửi tới id hiện tại.
- **Cách tái hiện:** Test mock user chưa từng gửi hoặc không có admin; test conversation hai chiều unread và gọi readMessage một phía.
- **Tác động:** Chat mới có thể lỗi 500 và trạng thái đã đọc không đúng chiều nhận.
- **Đề xuất sửa:** Trả lịch sử rỗng/fallback admin rõ; lọc receiverId=id khi đánh dấu đã đọc.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### F-25 [MỨC ĐỘ: Medium] Goong API key được hardcode trong frontend

- **Vị trí:** `client/src/Pages/CheckOut/CheckOut.jsx:60`.
- **Mô tả:** onAddressSearch chứa literal API key trong code browser. Không chép giá trị vào tài liệu; không xác minh key còn hoạt động hoặc restriction.
- **Cách tái hiện:** Rà source/bundle và Network khi gợi ý địa chỉ trong môi trường test; chỉ xác nhận có literal và nơi sử dụng, không xuất giá trị.
- **Tác động:** Key có thể được người xem bundle sử dụng; mức ảnh hưởng phụ thuộc restriction/quota của Goong.
- **Đề xuất sửa:** Chuyển cấu hình ra source, giới hạn domain/quota; nếu key cần giữ kín thì gọi qua backend. Cần kiểm restriction và rotate khi cần.
- **Độ chắc chắn:** Chắc chắn (phân tích tĩnh; chưa chạy khai thác).

### Tổng hợp mức độ phát hiện

| Mức độ | Số lượng |
| --- | --- |
| Critical | 1 |
| High | 4 |
| Medium | 20 |
| Low | 0 |

## Giả định tổng hợp

1. “Code hiện tại” là working tree ngày 21/10/2026, gồm thay đổi chưa commit trước nhiệm vụ; bộ tài liệu được commit riêng, không tạo snapshot code ứng dụng. Người dùng yêu cầu tiếp tục sau khi được thông báo Git chưa sạch.
2. Tên model là tên Mongoose đăng ký; collection vật lý/dữ liệu legacy không được truy cập. Quan hệ là logic từ schema/controller, không bảo đảm foreign key như SQL.
3. Trang quản trị dùng một `/admin` và state tabs; không tạo route con hay API không tồn tại. Actor admin kế thừa khả năng user, typeLogin không là vai trò.
4. Status, HTTP code và payload được mô tả theo code kể cả 403 mặc định hoặc nhánh treo/rejection; không thay bằng thiết kế mong muốn.
5. Không có bằng chứng chạy provider thật; Gemini model mặc định chỉ là cấu hình trong source, không khẳng định model/provider còn khả dụng. Không tra cứu/tư vấn phiên bản SDK hiện hành vì nhiệm vụ phản ánh snapshot repo.

## Cần xác minh và cách kiểm chứng

| Điểm chưa biết | Cách xác minh ngoài phạm vi đọc code |
| --- | --- |
| Dữ liệu/schema/index legacy | Chạy kiểm tra trên bản sao DB có kiểm soát; đối chiếu model names/index, orphan/unique trước migration. |
| Google/Gmail | Đối chiếu audience/client ID, JS origins, refresh token consent/revocation và địa chỉ sender trong Console; không log token. |
| VNPay | Xác nhận merchant đã đăng ký IPN công khai HTTPS, querydr được cấp, clock đúng và callback/replay hoạt động trên sandbox. |
| MoMo | Kiểm provider contract/request-ID persistence/verify callback; không deploy luồng hiện tại trước xử lý phát hiện tài chính. |
| Goong restriction | Kiểm domain/quota/key policy trong account quản lý; không thử dùng key ngoài phạm vi. |
| Proxy/socket/cookie | Test từng mode dev proxy/configured/Nginx với origin/cookie thật, không suy từ .env name. |
| Concurrency | Dùng fixture replica set riêng kiểm checkout, retry/IPN/expiry race, cart add và OTP issue/consume. |
| Dependency vulnerabilities | Chưa chạy npm audit vì phạm vi chỉ đọc và không tra registry; không kết luận không có CVE. Có thể chạy audit riêng không --fix khi được đưa vào phạm vi. |
| PlantUML | Máy chưa có Java/dot/PlantUML trong PATH; sơ đồ chưa kiểm tra cú pháp bằng công cụ. Dùng VS Code extension hoặc môi trường PlantUML có sẵn theo README. |

## Tự kiểm tra cuối

Bảng dưới được cập nhật từ `validation.json` khi chạy `verify_design.py`. Kiểm tra cấu trúc không thay thế compiler PlantUML hay test runtime.

| Tiêu chí | Kết quả | Bằng chứng |
| --- | --- | --- |
| (a) 100% route có UC hoặc lý do | Đạt — kiểm tĩnh đã pass | 71 endpoint, ma trận từng route ở trên; /api/coupon được ghi lỗi legacy trong UC-18 |
| (b) 100% model có class | Đạt — kiểm tĩnh đã pass | 13 model, class-model-* và từ điển 02 |
| (c) Mọi UC chính có sequence/activity | Đạt — kiểm tĩnh đã pass | 41 UC có 41 sequence; 13 activity cho hành trình chính |
| (d) Actor/UC nhất quán | Đạt qua nguồn dữ liệu chung và đối chiếu | Mã/tên lấy từ use-cases.json; sequence dùng actor chính, overview actor kế thừa |
| (e) Cú pháp UML | Chưa kiểm tra cú pháp bằng công cụ | Không tìm thấy Java/dot/PlantUML trong PATH; chỉ kiểm @startuml/@enduml, block cơ bản và bản nhúng đồng nhất |
| (f) Không secret trong docs | Đạt — kiểm tĩnh đã pass | So literal của biến nhạy cảm .env và key inline đã nhận diện với tài liệu; không in literal |
| (g) Khẳng định có nguồn | Đối chiếu tĩnh + rà nội dung | Từng UC có route/handler/UI, mọi schema có source; verify file/line tồn tại. Ngữ nghĩa và thiếu sót runtime ghi rõ Cần xác minh |

Không chạy `npm test` backend hoặc các test frontend khởi động Vite vì user cấm chạy server/MongoDB. Suite hiện có integration mở HTTP/DB khi được cấu hình, nên không dùng kết quả skip để tuyên bố runtime pass. Ví dụ: `server/test/vnpay.test.js:1`, `server/test/product-catalog.test.cjs:1`, `client/test/vite-cors.test.mjs:1`. Lint nếu chạy chỉ báo baseline, không sửa hoặc --fix. Kết quả kiểm tra tài liệu và lint thực tế nằm trong README/validation.json.
