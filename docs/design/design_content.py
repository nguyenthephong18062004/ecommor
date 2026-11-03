"""Nội dung phân tích thủ công, gắn với kiểm kê đọc tĩnh trong build_design.py."""
from build_design import *

U=[]
def uc(name,actor,paths,models,page,handler,steps,rules,errors,external='Không',alt='Không có nhánh thay thế riêng.',post='Response thành công theo handler; client cập nhật state hoặc chuyển trang.',pre='Ứng dụng được cấu hình và có thể truy cập API.',relation='Không xác lập include/extend từ việc chỉ dùng chung middleware.',module='Tài khoản'):
    U.append(dict(id=f'UC-{len(U)+1:02}',name=name,actor=actor,paths=paths.split(),models=models.split(),page=page,handler=handler,steps=steps.split(' ~ '),rules=rules,errors=errors,external=external,alt=alt,post=post,pre=pre,relation=relation,module=module))

uc('Đăng ký tài khoản','Khách vãng lai','/api/register','user otp','client/src/Pages/Register/Register.jsx','server/src/controllers/users.controller.js:registerWithVerification',
'Khách nhập họ tên, email, phone, address và password rồi submit. ~ Frontend gọi requestRegister và chuyển sang bước nhập OTP khi request thành công. ~ Backend normalize email, kiểm tra dữ liệu và email đã tồn tại. ~ Backend bcrypt password, ghi pending registration vào otp rồi gửi email.',
'Server kiểm tra truthy các trường và regex email; bcrypt cost 10. UI password tối thiểu 6 và confirm khớp nhưng server chưa kiểm tra độ dài/confirm. Limiter gửi chung 5/giờ/IP, cooldown email/type 60s.',
'400 Registration information is invalid; 429 COOLDOWN/RATE_LIMIT; 503 Email delivery is unavailable.',external='Gmail',alt='Email đã tồn tại trả 202 thông báo chung; email đủ điều kiện trả 201. Chưa tạo user trước verify.',post='OTP pending được tạo/thay thế; user chỉ được tạo ở UC-02. Thất bại gửi mail có thể vẫn còn record OTP.')
uc('Xác minh email đăng ký','Khách vãng lai','/api/verify-email','otp user','client/src/Pages/Register/Register.jsx','server/src/controllers/users.controller.js:verifyEmail',
'Khách nhập mã 6 chữ số. ~ UI gửi email và otp. ~ Backend consume OTP verifyAccount, xóa atomically khi khớp. ~ Backend lấy registration, kiểm tra email chưa có rồi tạo user email. ~ UI báo hoàn tất và chuyển /login.',
'TTL 10 phút được kiểm tra bằng code và TTL index; tối đa 5 lần sai; limiter verify chung 15/15 phút/IP. Không tự đăng nhập.',
'400 Email or verification code is invalid; 400 Verification code is invalid or expired (có biến thể dấu chấm từ service).',pre='Có registration pending chưa hết hạn.',post='200 và user được tạo; lỗi sau consume có thể đã mất OTP.',relation='UC-03 extend quá trình xác minh khi cần gửi lại.')
uc('Gửi lại mã xác minh đăng ký','Khách vãng lai','/api/resend-verification','otp','client/src/Pages/Register/Register.jsx','server/src/controllers/users.controller.js:resendVerification',
'Khách chọn gửi lại sau countdown. ~ UI gửi email. ~ Backend kiểm tra pending registration, issue lại mã và giữ registration. ~ Gmail nhận yêu cầu gửi; UI đặt lại 60s.',
'5/giờ/IP chung với register/forgot; issue kiểm tra 60s và 5 lần/email/type trong cửa sổ lưu ở record.',
'429 Please wait before requesting a new code.; 503 Email delivery is unavailable.',external='Gmail',alt='Không có pending cũng trả 202 thông báo chung.',relation='extend UC-02 tại bước chờ mã.')
uc('Đăng nhập email','Khách vãng lai','/api/login','user apikey','client/src/Pages/LoginUser/LoginUser.jsx','server/src/controllers/users.controller.js:login',
'Khách nhập email/password. ~ Backend tìm user theo email, chặn typeLogin google, bcrypt compare. ~ Backend rotate cặp RSA theo user, ký token 15m và refresh 7d. ~ Response 200 đặt cookie; UI gọi auth, tải cart rồi điều hướng admin hoặc trang chủ.',
'Cookie token/refreshToken httpOnly; logged có thể đọc từ JS; production secure + Strict, dev Lax. Login không có rate limiter riêng.',
'403 Tài khoản hoặc mật khẩu không chính xác !!!; 403 Vui lòng đăng nhập bằng Google. Lỗi bcrypt/cast không chuẩn hóa có thể thành 500.',post='Cookie phiên và dữ liệu auth/cart; đăng nhập mới thay cặp key cũ.')
uc('Đăng nhập Google','Khách vãng lai','/api/login-google','user apikey','client/src/Pages/LoginUser/LoginUser.jsx','server/src/controllers/users.controller.js:loginGoogle',
'Khách chọn GoogleLogin popup. ~ Frontend gửi credential. ~ Server verifyIdToken với audience GOOGLE_CLIENT và email_verified. ~ Server tìm theo email, dùng user sẵn có hoặc tạo user google. ~ Server rotate RSA, đặt cookie giống email login; UI xác định trang theo isAdmin.',
'Không tin name/email do client tự gửi; cần credential và GOOGLE_CLIENT. Account cùng email được liên kết trực tiếp.',
'403 Không thể xác thực Google; Google credential không hợp lệ; Email Google chưa được xác minh.',external='Google',alt='Email đã có: không tạo user mới; email mới: lưu name/email/typeLogin google.')
uc('Kiểm tra và gia hạn phiên','Khách hàng đã đăng nhập','/api/auth /api/refresh-token /api/admin','user apikey','client/src/store/Provider.jsx','server/src/controllers/users.controller.js:authUser',
'Provider thấy cookie logged và yêu cầu auth; AdminRoute còn yêu cầu admin. ~ authUser middleware verify JWT RSA qua key theo id; authAdmin kiểm tra isAdmin từ DB. ~ Handler auth chỉ trả các trường hồ sơ được chọn. ~ Nếu API trả 401, ApiClient dùng refresh cookie để lấy access cookie mới rồi retry; lỗi refresh thì logout và chuyển /login.',
'Access 15m/refresh 7d dùng cùng cặp RSA và verifyToken. /api/admin chạy authUser rồi authAdmin. logged chỉ là dấu hiệu để UI thử request.',
'401 Vui lòng đăng nhập / Vui lòng đăng nhập lại / Bạn không có quyền truy cập; 403 Tài khoản không tồn tại từ refresh nếu user bị xóa.',alt='request.jsx có interceptor khác ApiClient; nhánh queue đầu tiên có bất thường ghi ở 05, không coi retry luôn thành công.')
uc('Đăng xuất','Khách hàng đã đăng nhập','/api/logout','apikey','client/src/Components/Header/Header.jsx','server/src/controllers/users.controller.js:logout',
'Khách/admin chọn đăng xuất. ~ Client gọi GET logout. ~ Nếu access token verify được, backend xóa key theo userId. ~ Backend clear token/refreshToken/logged với cùng flags. ~ Header clearAuth hoặc admin chuyển /login.',
'Không có auth middleware nên vẫn clear cookie khi access hết hạn; chỉ xóa key nếu access verify được.',
'200 Đăng xuất thành công; lỗi DB xóa key bị catch trong khối verify/xóa.',post='Cookie phía browser được clear; key chỉ bị thu hồi ở nhánh verify thành công.')
uc('Khôi phục mật khẩu bằng OTP','Khách vãng lai','/api/forgot-password /api/verify-reset-password /api/reset-password','user otp','client/src/Pages/ForgotPassword/ForgotPassword.jsx','server/src/controllers/users.controller.js:requestPasswordResetOtp',
'Khách gửi email, UI chờ mã. ~ Server tìm tài khoản email hợp lệ, issue OTP rồi gửi Gmail; trả thông báo chung 202. ~ Khách gửi email/otp, backend consume đúng purpose rồi đặt cookie proof 5m. ~ Khách nhập password/confirmPassword, server verify proof purpose=passwordReset và user email. ~ Backend bcrypt password, save user, clear proof; UI chuyển /login.',
'OTP TTL 10m, 5 lần sai, resend 60s; rate send 5/giờ/IP và verify 15/15m/IP. Reset yêu cầu password truthy, confirm khớp; min 6 chỉ UI.',
'429 cooldown; 400 mã không hợp lệ; 401 Password reset session has expired. Verify the code again.; 400 Password reset request is invalid.',external='Gmail',alt='Email không tồn tại/google/không hợp lệ đều 202; lỗi mail reset được log và vẫn 202 (trừ cooldown).',post='Mật khẩu thay đổi; key phiên đang có không bị xóa; proof chỉ clear cookie, chưa có record consume proof.')
uc('Xem và cập nhật hồ sơ','Khách hàng đã đăng nhập','/api/update-user','user','client/src/Pages/InfoUser/InfoUser.jsx','server/src/controllers/users.controller.js:updateUser',
'Khách mở profile và chọn chỉnh sửa. ~ UI nạp dữ liệu từ Provider, validate form. ~ Backend lấy id từ JWT, chỉ cập nhật fullName/address/phone. ~ UI gọi auth để nạp lại hồ sơ.',
'authUser; không nhận id hoặc isAdmin từ body để sửa chính mình; không có runValidators ở query update.',
'401 nếu không có phiên; lỗi cast/DB chuyển error middleware.',post='200 Cập nhật thông tin thành công; response hiện trả nguyên user document (xem 05).')
uc('Xem catalog trang chủ','Khách vãng lai','/api/get-product-new /api/product-catalog /api/get-product-manufactured /api/get-product-by-category','products category','client/src/Components/HomePage/ProductNew/ProductNew.jsx','server/src/services/product-catalog.service.js:catalog',
'Khách mở trang chủ. ~ useProductCatalog lấy section mới và danh sách section gender/brand. ~ Service chọn tối đa 10 sản phẩm mới còn hàng, đếm section đồng hồ theo category tên chuẩn hóa. ~ CatalogSection tải khi thấy trong viewport và phân trang theo section. ~ UI hiển thị card hoặc loading/error/retry.',
'PAGE_SIZE 10; sort createdAt/_id giảm; page nguyên dương và clamp về totalPages; new chỉ 1 trang. Legacy manufactured lọc discount >=10; by-category còn bộ lọc cũ.',
'400 Invalid page/section type/section value/gender/brand.',module='Catalog',alt='Legacy API get-product-new/manufactured/by-category vẫn có dù không phải đường gọi chính mới.')
uc('Tìm kiếm và lọc sản phẩm','Khách vãng lai','/api/search /api/catalog-options /api/catalog-browse','products category brand','client/src/Pages/Category/Category.jsx','server/src/services/catalog-browse.service.js:browse',
'Khách nhập tìm kiếm Header hoặc chọn category/brand/giá/tồn kho. ~ Header debounce gọi search; Category giữ filter/page trong query string và abort request cũ. ~ Backend browse validate, escape regex search, tính giá sau discount trong query. ~ Backend đếm, clamp page và trả 20 item/trang. ~ UI hiển thị tổng/trang và chọn lại filter.',
'Không chọn đồng thời category và brand; stock all/in/order; min/max là số nguyên không âm, min<=max; search tối đa 100. Legacy /api/search dùng regex trực tiếp chưa escape.',
'400 Choose category or brand / Invalid stock / Invalid price range / Invalid search; lỗi regex legacy có thể 500.',module='Catalog')
uc('Xem chi tiết sản phẩm và đánh giá','Khách vãng lai','/api/get-product-by-id /api/get-preview-product-home','products previewProduct user','client/src/Pages/DetailProduct/DetailProduct.jsx','server/src/controllers/products.controller.js:getProductById',
'Khách mở /product/:id. ~ useFetch yêu cầu sản phẩm theo id. ~ Controller đọc product, tìm tối đa 8 sản phẩm cùng category và các previewProduct. ~ Controller tra tên user cho từng đánh giá. ~ UI hiển thị thông số, ảnh, giá và rating.',
'Public read. get-preview-product-home lấy 10 record không sort; tra user/product từng record.',
'ID không hợp lệ hoặc product/user đã xóa có thể thành 500 do truy cập null; không có nhánh 404 chuẩn trong handler.',module='Catalog',alt='Endpoint đánh giá trang chủ có wrapper nhưng không thấy consumer ngoài request.jsx.')
uc('Tạo đánh giá sản phẩm','Quản trị viên','/api/create-preview-product','previewProduct','client/src/Pages/InfoUser/OrderUser/OrderUser.jsx','server/src/controllers/previewProduct.controller.js:createPreviewProduct',
'UI OrderUser cho phép nhập rating/comment cho sản phẩm trong đơn. ~ Client gửi productId/content/rating. ~ Route yêu cầu authAdmin. ~ Controller lấy userId từ JWT và tạo previewProduct, trả 201.',
'As-is chỉ admin gọi được API; không kiểm tra đã mua/giao hàng, không giới hạn rating ở schema. UI khách hàng tồn tại nhưng bị server từ chối.',
'401 Bạn không có quyền truy cập với khách thường; lỗi schema/DB có thể 500.',module='Catalog',post='Admin có thể tạo đánh giá; luồng khách hàng dở dang được ghi tại 05.')
uc('Xem giỏ hàng','Khách hàng đã đăng nhập','/api/get-cart','cartUser products coupon','client/src/Pages/Cart/CartUser.jsx','server/src/controllers/cartUser.controller.js:getCart',
'Provider/khách yêu cầu giỏ. ~ Server tìm cart theo id JWT. ~ Nếu có giỏ, server bỏ item có productId không hợp lệ/sản phẩm đã xóa, tính lại tổng từ giá hiện tại. ~ Server lưu giỏ đã sửa nếu cần và tìm coupon theo tổng, date, quantity. ~ UI nhận cartId, cartItems, totalPrice, dataCoupon.',
'authUser; GET có thể ghi sửa giỏ; không có cart trả 200 mảng rỗng và total=0.',
'401 phiên; lỗi DB/cast thành 500.',module='Giỏ hàng',post='Giỏ được phản ánh giá hiện tại; không reserve kho ở bước này.')
uc('Thêm sản phẩm vào giỏ','Khách hàng đã đăng nhập','/api/create-cart','cartUser products','client/src/Components/CardBody/CardBody.jsx','server/src/controllers/cartUser.controller.js:addToCart',
'Khách bấm thêm ở card/chi tiết. ~ Client gửi productId/quantity. ~ Server kiểm tra sản phẩm và số nguyên dương <= stock, kể cả tổng quantity cũ+mới. ~ Server tạo giỏ hoặc push/tăng item, tính tổng từ DB rồi save. ~ UI gọi getCart.',
'authUser; chưa reserve stock; thao tác read/save giỏ không transaction; quantityProduct không dùng giá client.',
'403 Số lượng sản phẩm không hợp lệ / Sản phẩm không tồn tại / Số lượng sản phẩm không đủ / Missing required fields.',module='Giỏ hàng',post='Giỏ mới 201 hoặc giỏ cũ 200.')
uc('Sửa số lượng giỏ','Khách hàng đã đăng nhập','/api/update-product-cart','cartUser products','client/src/Pages/Cart/CartUser.jsx','server/src/controllers/cartUser.controller.js:updateProductCart',
'Khách tăng/giảm số lượng. ~ Backend validate quantityProduct. ~ Server tìm cart của JWT và item, lấy giá hiện tại. ~ Trừ thành tiền cũ, cộng thành tiền mới rồi save. ~ UI nạp lại giỏ.',
'Số nguyên dương không vượt stock; quantity=0 không phải thao tác xóa.',
'403 Giỏ hàng không tồn tại / Sản phẩm không tồn tại trong giỏ hàng / Số lượng sản phẩm không đủ.',module='Giỏ hàng')
uc('Xóa sản phẩm khỏi giỏ','Khách hàng đã đăng nhập','/api/delete-product-cart','cartUser products','client/src/Pages/Cart/CartUser.jsx','server/src/controllers/cartUser.controller.js:deleteProductCart',
'Khách chọn xóa item. ~ Server tìm giỏ theo JWT và item theo productId. ~ Server đọc product hiện tại để tính tiền trừ. ~ Server filter item, save cart, trả 200. ~ UI tải lại giỏ.',
'authUser; nếu product đã xóa, deleteProductCart từ chối; getCart mới có cơ chế dọn item mất.',
'403 Giỏ hàng không tồn tại / Sản phẩm không tồn tại trong giỏ hàng / Không tìm thấy thông tin sản phẩm.',module='Giỏ hàng')
uc('Chọn coupon và thông tin giao hàng','Khách hàng đã đăng nhập','/api/update-info-cart /api/coupon','cartUser coupon','client/src/Pages/CheckOut/CheckOut.jsx','server/src/controllers/cartUser.controller.js:updateInfoCart',
'Khách nhập fullName/phone/address/note và chọn coupon từ dataCoupon trong getCart. ~ UI giữ nameCoupon là id coupon và hiển thị tổng dự kiến. ~ COD/VNPay gửi thông tin trực tiếp create-payment; MoMo gọi update-info-cart trước. ~ updateInfoCart gán thông tin vào cart, trả 200; checkout COD/VNPay kiểm lại coupon ở server.',
'UI phone 10 chữ số; checkout server kiểm shipping string dài <=500, coupon quantity/date/minPrice. /api/coupon là endpoint legacy lỗi req.user vì route thiếu auth, không phải nguồn coupon của UI hiện tại.',
'403 Giỏ hàng không tồn tại; checkout 400 Coupon is invalid, expired or unavailable; /api/coupon thường 500.',external='Goong (gợi ý địa chỉ tùy chọn)',module='Giỏ hàng',alt='Gợi ý địa chỉ sau 3 ký tự và debounce 500ms; lỗi Goong xóa gợi ý, vẫn nhập tay được.')
uc('Đặt hàng COD','Khách hàng đã đăng nhập','/api/create-payment','cartUser products coupon payments','client/src/Pages/CheckOut/CheckOut.jsx','server/src/services/vnpay.service.js:checkout',
'Khách chọn COD và submit; UI chặn submit lặp bằng ref. ~ Server validate cartId và quyền sở hữu; tìm đơn theo checkoutKey để tái sử dụng. ~ Trong transaction server snapshot giá/ảnh/tên, tính subtotal-discount, shipping=0. ~ Server trừ stock có điều kiện và reserve coupon, save order pending/unpaid rồi xóa cart. ~ Response 201 document đơn; UI tới /payments/:id và nạp lại giỏ.',
'Replica set transaction bắt buộc. checkoutKey unique sparse; không tin totalPrice từ client. unitPrice làm tròn VND bằng BigInt. Giá giảm hợp lệ 0..100%, số tiền safe integer.',
'400 Cart is empty / Invalid cartId / Insufficient stock; 409 Cart already checked out; 503 Checkout requires MongoDB replica set transactions.',module='Thanh toán',post='Đơn pending/unpaid, inventory/coupon reserved và cart xóa atomically; lỗi rollback transaction.')
uc('Khởi tạo thanh toán VNPay','Khách hàng đã đăng nhập','/api/create-payment','cartUser products coupon payments paymentAttempts','client/src/Pages/CheckOut/CheckOut.jsx','server/src/services/vnpay.service.js:newAttempt',
'Khách chọn VNPAY và submit. ~ Checkout tính snapshot và reserve trong transaction như COD. ~ Server validate cấu hình gateway/Return/client URL và IP, tạo ref ngẫu nhiên. ~ SDK build URL có hạn 15m, lưu paymentAttempt và order pending. ~ Trả 201 metadata URL; browser chuyển sang VNPay.',
'Gateway allowlist; production callback/client bắt buộc HTTPS công khai; không tạo URL khi tổng bằng 0. SDK nhận VND; callback amount đối chiếu *100. Retry checkout cùng cartId trả URL attempt pending còn hạn.',
'400 Invalid VNPay amount / Invalid client IP; 503 thiếu/cấu hình sai biến; 409 Use the order page to check payment status or retry.',external='VNPay',module='Thanh toán',post='Cart xóa, đơn và attempt pending được lưu trước chuyển hướng; chưa phải đã thanh toán.')
uc('Hiển thị kết quả Return VNPay','Khách hàng đã đăng nhập','/api/check-payment-vnpay /api/vnpay-return','paymentAttempts','client/src/Pages/PaymentSuccess/PaymentSuccess.jsx','server/src/controllers/payments.controller.js:checkPaymentVnpay',
'VNPay đưa browser về Return URL. ~ Server verify HMAC/params, tìm attempt theo TxnRef và so amount. ~ Server redirect 302 /payments/:orderId (absolute client URL ở production, relative khi dev). ~ Trang kết quả đọc đơn có auth/ownership và có thể đối soát.',
'Return endpoint công khai nhưng không cập nhật paid. Không phụ thuộc cookie trên request callback; trang kết quả cần phiên của chủ đơn.',
'400 Dữ liệu hoặc chữ ký VNPay không hợp lệ / Số tiền thanh toán không khớp; 404 Không tìm thấy giao dịch.',external='VNPay',module='Thanh toán')
uc('Xác nhận IPN VNPay','VNPay','/api/vnpay-ipn','payments paymentAttempts products coupon','server/src/controllers/payments.controller.js','server/src/services/vnpay.service.js:ipn',
'VNPay gửi GET IPN. ~ Service verify chữ ký và trường bắt buộc. ~ Trong transaction tìm attempt/order, kiểm method, amount và orderInfo. ~ Callback đã nhận/đối soát trả 02; success hiện tại cập nhật paid. ~ Thất bại release kho/coupon; success đến muộn/attempt cũ ghi refund_required. ~ Trả HTTP 200 với RspCode nghiệp vụ.',
'Thành công cần responseCode=00 và transactionStatus=00; idempotency qua receivedAt/reconciledAt trong transaction. Callback trễ không tự bán lại hàng hoặc tự hoàn tiền.',
'RspCode 97 chữ ký/params; 01 không khớp đơn; 04 amount; 02 đã xác nhận; 99 unknown error; 00 confirm success.',external='Không',module='Thanh toán',post='paid/failed/refund_required hoặc không đổi nếu reject/replay; không có API hoàn tiền thực tế.')
uc('Thanh toán lại VNPay','Khách hàng đã đăng nhập','/api/retry-payment-vnpay','payments paymentAttempts products coupon','client/src/Pages/PaymentSuccess/PaymentSuccess.jsx','server/src/services/vnpay.service.js:retry',
'Khách chọn thanh toán lại ở đơn pending. ~ Server kiểm ownership, method VNPAY và paymentStatus pending/failed/expired. ~ Pending còn hạn tái dùng URL; pending đã quá hạn yêu cầu chờ worker. ~ Failed/expired reserve lại stock/coupon và tạo attempt mới trong transaction. ~ UI chuyển URL mới.',
'Đơn status phải pending; không được retry paid/refund_required/cancelled; snapshot giá đơn được giữ.',
'409 Order cannot be paid / Payment is awaiting expiry processing; retry shortly; 400 Insufficient stock/coupon; 401 phiên.',external='VNPay',module='Thanh toán')
uc('Đối soát trạng thái VNPay','Khách hàng đã đăng nhập','/api/reconcile-payment-vnpay','payments paymentAttempts products coupon','client/src/Pages/PaymentSuccess/PaymentSuccess.jsx','server/src/services/vnpay.service.js:reconcile',
'Trang kết quả đọc đơn và gọi reconcile cho pending/expired/failed khi đến lịch. ~ Server kiểm ownership, method và lấy DB lease nextQueryAt 5 phút. ~ Server ký querydr gửi VNPay ngoài transaction, timeout 10s. ~ Service verify response; chỉ code=00, status=00/02 mới settle vào transaction. ~ UI cập nhật paymentStatus/nextCheckAt; polling đọc đơn mỗi 3s khi pending, tối đa 200 lần hẹn.',
'Lease hạn chế nhiều tab/worker; lỗi mạng giữ trạng thái cũ và lịch query; không tin query string browser để paid.',
'400 Invalid order ID; 404 Order not found; provider lỗi trả summary cũ (không throw về UI).',external='VNPay',module='Thanh toán',alt='paid/refund_required/unpaid trả summary ngay; đang lease trả nextQueryAt hiện tại.')
uc('Thanh toán MoMo','Khách hàng đã đăng nhập','/api/create-payment /api/check-payment-momo','cartUser products coupon payments','client/src/Pages/CheckOut/CheckOut.jsx','server/src/controllers/payments.controller.js:checkPaymentMomo',
'Khách chọn MOMO, UI lưu shipping vào cart rồi gọi create-payment. ~ Server lấy cart, tính amount từ totalPrice và coupon, ký HMAC SHA256 gửi endpoint cấu hình để nhận payUrl. ~ Browser chuyển MoMo rồi callback GET về server. ~ Với resultCode=0 server lấy cartId từ orderInfo, reserveInventory, tạo đơn và trừ coupon/xóa cart. ~ Redirect DOMAIN_URL/payments/:id.',
'Đường xử lý legacy riêng, không dùng snapshot/transaction/attempt như VNPay. Chỉ kiểm transactionRef unique để chống lặp; chưa verify callback chữ ký.',
'Thiếu cấu hình throw Error →500; callback resultCode khác 0 không kết thúc response; reserve lỗi 403.',external='MoMo',module='Thanh toán',post='Có nhánh tạo đơn MOMO status pending, paymentStatus default unpaid; tính an toàn bị hạn chế, xem Phát hiện 05.')
uc('Xem đơn hàng của mình','Khách hàng đã đăng nhập','/api/get-payment-success /api/get-order-user','payments products','client/src/Pages/InfoUser/OrderUser/OrderUser.jsx','server/src/controllers/payments.controller.js:getOrderUser',
'Khách mở lịch sử hoặc /payments/:id. ~ Server lọc userId từ JWT và idPayment nếu xem chi tiết. ~ Server dựng sản phẩm từ snapshot; fallback product hiện tại cho đơn legacy. ~ UI hiển thị trạng thái đơn, phương thức và paymentStatus.',
'Ownership phía server; order mới độc lập giá hiện tại; ảnh/tên legacy có fallback sản phẩm đã xóa.',
'403 Không tìm thấy đơn hàng / Có lỗi xảy ra khi lấy đơn hàng; 401 phiên.',module='Đơn hàng')
uc('Hủy đơn hàng của mình','Khách hàng đã đăng nhập','/api/cancel-order','payments paymentAttempts products coupon','client/src/Pages/InfoUser/OrderUser/OrderUser.jsx','server/src/services/vnpay.service.js:changeStatus',
'Khách chọn hủy đơn pending. ~ Server kiểm ownership và transition. ~ Đơn online đã paid/unpaid legacy hoặc refund_required bị chặn theo rule. ~ Trong transaction release inventory/coupon, cancel attempt pending, đổi order status cancelled; VNPay paymentStatus failed. ~ UI nạp lại danh sách.',
'User chỉ được hủy pending; cùng status trả ngay không cộng kho lần nữa. COD có thể hủy trước confirmed đối với user.',
'400 Invalid order status or ID; 404 Order not found; 409 Invalid order status transition / Paid online orders require a refund workflow.',module='Đơn hàng')
uc('Đọc blog','Khách vãng lai','/api/blog/get-all /api/blog/get-by-id','blog','client/src/Pages/DetailBlog/DetailBlog.jsx','server/src/controllers/blog.controller.js:getBlogById',
'Khách mở danh sách hoặc chọn bài. ~ UI lấy get-all/get-by-id và bài liên quan từ get-all. ~ Backend find/findById, trả metadata. ~ UI render title/image/content HTML.',
'Public read, không pagination; HTML render bằng dangerouslySetInnerHTML.',
'Không có nhánh not found rõ ở get-by-id; lỗi query trong async handler không có wrapper (xem 05).',module='Nội dung')
uc('Chat với quản trị viên','Khách hàng đã đăng nhập','/api/message/create /api/message/get-message-user /api/message/read-message','Message user','client/src/Components/Messger/Messger.jsx','server/src/controllers/message.controller.js:createMessage',
'Khách mở khung chat ở trang chủ và tải lịch sử. ~ UI gửi text bằng HTTP; backend chọn user admin đầu tiên, tạo conversationId từ hai id đã sort. ~ Backend lưu Message và emit newMessage tới socket admin nếu online. ~ Provider nhận newMessageUser cho trả lời, UI nối message. ~ GET read-message có thể đặt isRead=true cho cả conversation.',
'authUser; sender lấy từ JWT; socket identity từ token đã verify. Không queue giao nhận realtime, lịch sử trong DB.',
'Không có admin hoặc khách chưa từng gửi tin khiến truy cập null ở controller →500; lỗi socket có thể sau khi DB đã ghi.',module='Chat')
uc('Quản trị hội thoại','Quản trị viên','/api/message/create-admin /api/message/all /api/message/get-message','Message user','client/src/Pages/Admin/Components/Messager/Messager.jsx','server/src/controllers/message.controller.js:createMessageAdmin',
'Admin mở tab tin nhắn, GET all aggregate sidebar/unread. ~ Admin chọn khách, GET read-message và get-message. ~ Admin gửi receiverId/text qua create-admin. ~ Backend lưu Message rồi emit newMessageUser nếu socket khách online. ~ ChatWindow cập nhật state; sidebar tải lại khi newMessage.',
'authAdmin cho all/get-message/create-admin; read-message dùng authUser. get-message lấy sender/receiver từ query, không ràng buộc admin hiện tại.',
'401 quyền; cast/DB lỗi có thể 500; receiver offline chỉ bỏ push, vẫn lưu DB.',module='Chat')
uc('Tư vấn bằng chatbot Gemini','Khách vãng lai','/api/chatbot','products','client/src/utils/Chatbot/Chatbot.jsx','server/src/utils/chatbot.js:askQuestion',
'Khách nhập câu hỏi tối đa 1000 ký tự. ~ Server rate-limit, validate question/history, tạo requestId. ~ Service kiểm key, đọc tối đa 10 sản phẩm còn hàng và dựng systemInstruction. ~ Gemini generateContent, retry tối đa 2 lần cho quota/network/503. ~ Backend kiểm safety/finishReason/text và trả string metadata. ~ UI sanitize control chars, cắt 4000 ký tự, render text và cho thử lại khi lỗi.',
'10/phút/IP; history tối đa 10 message role user/model, mỗi text<=1000; UI hiện chỉ gửi question, không history; timeout SDK 30s mỗi lần.',
'400 INVALID_INPUT; 429 RATE_LIMIT/QUOTA_429; 503 INVALID_KEY/NETWORK/UNAVAILABLE_5xx; 504 TIMEOUT; 502 MODEL_NOT_FOUND/EMPTY_RESPONSE/UNKNOWN; 422 BLOCKED_BY_SAFETY.',external='Gemini',module='Chat')
uc('Quản lý sản phẩm','Quản trị viên','/api/create-product /api/get-all-product /api/update-product /api/delete-product','products category brand','client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx','server/src/controllers/products.controller.js:createProduct',
'Admin mở tab, tải toàn bộ sản phẩm, danh mục và thương hiệu. ~ Admin nhập form/TinyMCE và upload ảnh nếu mới. ~ Tạo: backend kiểm các trường truthy rồi createProduct. ~ Sửa: backend chỉ gán name/price/discount/description/category/size/stock/images/brand. ~ Xóa: backend findByIdAndDelete. ~ UI đóng modal và tải lại bảng.',
'Ghi yêu cầu authAdmin; get-all public. Không có brand CRUD. Update dùng name/size không có trong schema, không cập nhật toàn bộ thông số tạo.',
'403 Vui lòng nhập đầy đủ thông tin bắt buộc / Sản phẩm không tồn tại; get-all có category null →500.',module='Quản trị',relation='include UC-38 chỉ tại nhánh có ảnh mới; các lần không upload không bắt buộc bước này.')
uc('Quản lý danh mục','Quản trị viên','/api/create-category /api/get-all-category /api/update-category /api/delete-category','category products','client/src/Pages/Admin/Components/ManagerCategory/ManagerCategory.jsx','server/src/controllers/category.controller.js:deleteCategory',
'Admin xem bảng danh mục. ~ Admin tạo/sửa tên hoặc chọn xóa. ~ Server kiểm name khi tạo; create/update category. ~ Khi xóa server xóa category rồi deleteMany sản phẩm cùng category. ~ UI tải lại danh sách.',
'Read public; write authAdmin; xóa cứng cascade products, không transaction/cascade cart/review/upload.',
'403 Vui lòng nhập đầy đủ thông tin; category không tồn tại gọi NotFoundError chưa import →500.',module='Quản trị')
uc('Quản lý coupon','Quản trị viên','/api/create-coupon /api/coupons /api/update-coupon /api/delete-coupon','coupon','client/src/Pages/Admin/Components/ManagerCoupon/CouponManagement.jsx','server/src/controllers/coupon.controller.js:createCoupon',
'Admin tải tất cả coupon. ~ Admin nhập nameCoupon/discount/quantity/startDate/endDate/minPrice. ~ Tạo: backend kiểm truthy và save. ~ Sửa hoặc xóa theo id; backend update/delete. ~ UI thông báo và tải lại.',
'GET coupons public; write authAdmin; discount là số tiền, không phần trăm. Schema required nhưng thiếu min/max; query update không runValidators.',
'400 Vui lòng nhập đầy đủ thông tin (dấu Unicode trong code); delete catch trả 500 message error.',module='Quản trị')
uc('Quản lý bài viết','Quản trị viên','/api/blog/create /api/blog/update /api/blog/delete','blog','client/src/Pages/Admin/Components/ManagerBlog/BlogAdmin.jsx','server/src/controllers/blog.controller.js:createBlog',
'Admin tải blog bằng get-all. ~ Admin nhập title/content TinyMCE và upload ảnh tùy chọn. ~ Server tạo/sửa/xóa blog theo body. ~ UI hiển thị preview HTML, đóng modal và refresh.',
'authAdmin cho write; handlers async không bọc asyncHandler trên Express 4; schema dùng require thay required.',
'Update không tìm thấy bài gọi NotFoundError chưa import; promise rejection không được forward nhất quán.',module='Quản trị')
uc('Xem người dùng và đổi quyền','Quản trị viên','/api/users /api/update-user-admin','user','client/src/Pages/Admin/Components/ManagerUser/ManagerUser.jsx','server/src/controllers/users.controller.js:updateUserAdmin',
'Admin tải danh sách users. ~ UI hiển thị bảng và switch quyền. ~ Backend nhận id/isAdminUser, gán isAdmin true hoặc false. ~ UI cập nhật/tải lại danh sách.',
'authAdmin; không có endpoint CRUD user đầy đủ; không kiểm giữ ít nhất một admin, findAdmin được đọc nhưng không dùng.',
'401 quyền; cast/DB lỗi 500; user không tồn tại có thể metadata null.',module='Quản trị',post='200 với document user; response chứa cả password field, xem 05.')
uc('Xử lý đơn hàng phía quản trị','Quản trị viên','/api/get-order-admin /api/update-order-status','payments paymentAttempts products coupon','client/src/Pages/Admin/Components/ManagerOrder/ManagerOrder.jsx','server/src/services/vnpay.service.js:changeStatus',
'Admin tải orders cùng snapshot/attempts. ~ UI chỉ hiện statusChoices phù hợp trạng thái/phương thức. ~ Backend kiểm transition và điều kiện thanh toán trong transaction. ~ Hủy thì release; delivered tăng soldCount và COD paymentStatus paid. ~ UI tải lại bảng và chi tiết modal.',
'pending→confirmed/cancelled; confirmed→shipped/cancelled; shipped→delivered; delivered/cancelled terminal. VNPAY muốn tiếp tục phải paid, refund_required bị chặn.',
'400 id/status sai; 404 Order not found; 409 Invalid order status transition / Payment has not been confirmed or requires reconciliation.',module='Quản trị')
uc('Xem thống kê','Quản trị viên','/api/statistical','user products payments previewProduct','client/src/Pages/Admin/Components/ManagerStatistical/ManagerStatistical.jsx','server/src/controllers/users.controller.js:getStatistical',
'Admin mở dashboard. ~ UI gọi statistical và kiểm admin. ~ Backend chạy aggregate users, products, orders, revenue và reviews lần lượt. ~ Revenue chỉ match delivered, nhóm theo tháng và 7 ngày gần nhất. ~ UI hiển thị tổng, biểu đồ và top sản phẩm.',
'authAdmin; không có filter năm; byLoginType dùng loginType khác schema typeLogin, review group dùng product khác productId (xem 05).',
'500 Đã xảy ra lỗi khi lấy dữ liệu thống kê; body có error.message.',module='Quản trị')
uc('Tải ảnh sản phẩm hoặc blog','Quản trị viên','/api/upload-image /api/blog/upload-image','','client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx','server/src/routes/index.js:routes',
'Admin chọn ảnh trong form; component tạo FormData. ~ Multer ghi file xuống src/uploads/products hoặc blogs với timestamp và extname gốc. ~ Server trả URL tương đối; frontend ghép vào product.images hoặc blog.image. ~ Khi lưu entity thất bại, file đã upload vẫn còn.',
'Products có authAdmin rồi array(images); blog single(image) không có authAdmin nên thực tế khách vãng lai cũng upload được. Không thấy limits/fileFilter/maxCount.',
'Products không có file trả 400 No file uploaded nếu req.files falsy (mảng rỗng vẫn truthy); Blog không có file forward BadRequestError mặc định 403.',module='Quản trị',alt='Blog uploadImage trả metadata string; sản phẩm trả images array ngoài metadata.',post='File trên filesystem, không có model Upload; không có bước dọn file khi entity xóa.')
uc('Xem danh sách thương hiệu','Quản trị viên','/api/brands','brand products','client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx','server/src/services/brand.service.js:list',
'Admin mở form sản phẩm. ~ Client gọi requestGetBrands. ~ Backend list hợp nhất brand đã lưu và aggregate products.brand không rỗng theo tên lowercase/trim. ~ Backend tính productCount và sort vi. ~ UI đưa tên vào gợi ý brand.',
'GET /api/brands authAdmin; catalog-options public gọi cùng list nhưng chỉ trả mảng tên. Không có create/update/delete brand route.',
'401 quyền; lỗi DB 500.',module='Quản trị')

uc('Xem thông tin liên hệ','Khách vãng lai','','','client/src/Pages/Contact/Contact.jsx','client/src/Pages/Contact/Contact.jsx:Contact',
'Khách mở /contact. ~ Frontend lấy địa chỉ, phone, email và socialLinks từ contactInfo.js. ~ Trang hiển thị liên kết tel/mailto/bản đồ/mạng xã hội khi có cấu hình, nếu thiếu hiện trạng thái đang cập nhật.',
'Không có API gửi form liên hệ, không ghi DB. Liên kết ngoài mở tab với noopener noreferrer.',
'Không có HTTP lỗi nghiệp vụ riêng vì trang chỉ render cấu hình.',external='Google Maps và các kênh liên hệ (liên kết ngoài)',module='Nội dung',post='Hiển thị thông tin; click liên kết có thể mở ứng dụng/kênh bên ngoài.')
U[11]['alt']='DetailProduct còn gọi get-preview-product-home qua useFetch rồi lọc theo productId; API chỉ trả tối đa 10 review toàn hệ thống. Wrapper requestGetPreviewProductHome không có consumer ngoài request.jsx.'
U[31]['relation']='UC-39 mở rộng tùy chọn khi có ảnh mới, không phải include bắt buộc.'

def routes_for(u): return [r for r in R if r['path'] in u['paths']]
def sources(u):
    handlerpath,fn=u['handler'].split(':')
    refs=[cite(handlerpath,fn),cite(u['page'])]
    refs += [f"`{r['source']}:{r['line']}`" for r in routes_for(u)]
    if u['id'] in ['UC-01','UC-02','UC-03','UC-08']: refs += [cite('server/src/services/otp.service.js','createOtpService'),cite('server/src/services/mail.service.js','createMailService')]
    return '; '.join(dict.fromkeys(refs))

def stage1():
    text='''# 01 — Use case as-is

## Tác nhân và quy ước

Khách vãng lai là browser chưa có phiên; Khách hàng đã đăng nhập là user có token xác minh được; Quản trị viên là user có isAdmin=true ở DB. Các public API cũng dùng được khi đăng nhập; kế thừa actor là cách biểu diễn năng lực, không phải một trường role mới. Actor hệ thống ngoài không được coi là user trong DB. Nguồn: `server/src/auth/checkAuth.js:authUser`, `authAdmin`; `server/src/models/users.model.js:1`.

Danh sách UC dưới đây đặc tả cả các nhánh tồn tại nhưng lỗi/không đầy đủ; không khẳng định luồng đó thành công trong vận hành. Các endpoint legacy được gắn rõ vào UC hoặc phần khoảng trống. CRUD được nhóm thành một UC theo đối tượng với các nhánh tạo/sửa/xóa, không suy diễn user CRUD khi chỉ có đổi quyền.

'''
    text+=table(['Mã','Tên','Tác nhân chính','Module'],[[u['id'],u['name'],u['actor'],u['module']] for u in U])
    text+='\n## Sơ đồ tổng quát\n\nCác nhóm chức năng là package phân loại, không phải endpoint mới. Google/Gmail/VNPay/MoMo/Gemini/Goong chỉ tham gia nơi code có tích hợp.\n'
    body='''left to right direction
actor "Khách vãng lai" as Guest
actor "Khách hàng đã đăng nhập" as Customer
actor "Quản trị viên" as Admin
actor "Google" as Google
actor "Gmail" as Gmail
actor "VNPay" as VNPay
actor "MoMo" as MoMo
actor "Gemini" as Gemini
actor "Goong" as Goong
Customer --|> Guest
Admin --|> Customer
rectangle "ECOMMOR" {
usecase "Tài khoản và phiên" as Account
usecase "Tra cứu catalog và blog" as Catalog
usecase "Giỏ hàng và giao hàng" as Cart
usecase "Đặt hàng và thanh toán" as Payment
usecase "Hỗ trợ trực tuyến" as Chat
usecase "Quản trị và thống kê" as Management
}
Guest --> Account
Guest --> Catalog
Guest --> Chat
Customer --> Cart
Customer --> Payment
Customer --> Chat
Admin --> Management
Google --> Account
Gmail --> Account
VNPay --> Payment
MoMo --> Payment
Gemini --> Chat
Goong --> Cart'''
    text+=diagram('uc-overview',body)
    for index,module in enumerate(dict.fromkeys(u['module'] for u in U),1):
        members=[u for u in U if u['module']==module]
        actors=list(dict.fromkeys(u['actor'] for u in members)); ext=[]
        for u in members:
            if u['external']!='Không': ext += [u['external'].split(' (')[0]]
        actors=list(dict.fromkeys(actors+ext))
        body='left to right direction\n'
        aliases={a:'A'+str(i) for i,a in enumerate(actors)}
        for a,alias in aliases.items(): body+=f'actor "{a}" as {alias}\n'
        body+=f'rectangle "{module}" {{\n'
        for u in members: body+=f'usecase "{u["id"]}\\n{u["name"]}" as {u["id"].replace("-","")}\n'
        body+='}\n'
        for u in members:
            alias=u['id'].replace('-',''); body+=f'{aliases[u["actor"]]} --> {alias}\n'
            if u['external']!='Không': body+=f'{aliases[u["external"].split(" (")[0]]} --> {alias}\n'
        if module=='Tài khoản': body+='UC03 ..> UC02 : <<extend>>\n'
        if module=='Quản trị': body+='UC39 ..> UC32 : <<extend>>\nUC39 ..> UC35 : <<extend>>\n'
        text+=f'\n### Module {module}\n\nSơ đồ liên kết các UC của module; nguồn chi tiết nằm ở từng đặc tả ngay dưới.\n'+diagram(f'uc-module-{index:02}',body)
    text+='''
Quan hệ include không được thêm chỉ vì hai UC gọi chung service hoặc middleware. Ví dụ COD và VNPay dùng chung checkout nhưng là hai lựa chọn phương thức; không có UC xác thực độc lập bắt buộc phải gọi mỗi request ngoài JWT middleware. Upload ảnh là mở rộng tùy chọn của quản lý sản phẩm/blog khi có ảnh mới (không include bắt buộc). Xác minh email và reset OTP là bước tuần tự trong hành trình, không tự động suy ra extend giữa hai mục tiêu độc lập. Nguồn: `client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx:handleSubmit`, `server/src/services/vnpay.service.js:checkout`.

## Đặc tả chi tiết

Mọi HTTP status không chỉ định trong throw BadRequestError mặc định là **403**, không tự chuyển thành 400 theo ý nghĩa tên class. BadUserRequestError mặc định **401**. Lỗi chưa xử lý có thể thành 500 ở error middleware; riêng async blog trên Express 4 có thể không tới middleware. Nguồn: `server/src/core/error.response.js:BadRequestError`, `server/src/core/success.response.js:SuccessResponse`, `server/src/server.js:1`.
'''
    for u in U:
        text+=f'''\n### {u['id']} — {u['name']}

- **Tên / Mã:** {u['name']} / {u['id']}.
- **Tác nhân chính:** {u['actor']}.
- **Tác nhân phụ:** {u['external']}.
- **Mô tả:** {u['name']} theo hành vi hiện có trong handler và UI được dẫn nguồn.
- **Điều kiện kích hoạt:** {u['steps'][0]}
- **Tiền điều kiện:** {u['pre']} {'Có cookie token hợp lệ; authAdmin kiểm tra DB khi route ghi yêu cầu admin.' if u['actor'] in ['Khách hàng đã đăng nhập','Quản trị viên'] else ''}
- **Hậu điều kiện thành công:** {u['post']}
- **Hậu điều kiện thất bại:** Không đạt mục tiêu UC; trạng thái có thể đã thay đổi ở bước ghi trước lỗi nếu không có transaction. Các trường hợp cụ thể được ghi trong luồng và 05.

**Luồng sự kiện chính**

'''
        text+='\n'.join(f'{i}. {s}' for i,s in enumerate(u['steps'],1))+'\n'
        text+=f'''
- **Luồng thay thế:** {u['alt']}
- **Luồng ngoại lệ:** {u['errors']}
- **Quy tắc nghiệp vụ và ràng buộc:** {u['rules']}
- **Quan hệ include/extend:** {u['relation'] if u['id']!='UC-32' else 'UC-39 mở rộng tùy chọn khi có ảnh mới; không bắt buộc upload ở mọi thao tác.'}
- **API:** {', '.join(f"{r['method']} {r['path']}" for r in routes_for(u))}.
- **Nguồn code:** {sources(u)}.
'''
    write('01-use-case.md',text)
    write('use-cases.json',json.dumps(U,ensure_ascii=False,indent=2))
    progress(f'Giai đoạn 0 và 1 — {len(U)} UC gắn nguồn','Giai đoạn 2–5, README và kiểm tra cuối')

def splitjs(s):
    parts=[]; start=0; stack=[]; quote=None; escaped=False
    for i,c in enumerate(s):
        if quote:
            if escaped: escaped=False
            elif c=='\\': escaped=True
            elif c==quote: quote=None
            continue
        if c in "'\"`": quote=c
        elif c in '{[(': stack.append(c)
        elif c in '}])':
            if stack: stack.pop()
        elif c==',' and not stack: parts.append(s[start:i].strip()); start=i+1
    if s[start:].strip(): parts.append(s[start:].strip())
    return parts

def schema_fields(m):
    s=re.sub(r'//[^\n]*','',m['fields'])
    start=s.index('{',s.index('new ')); stack=0; end=None; quote=None
    for i in range(start,len(s)):
        c=s[i]
        if quote:
            if c==quote and s[i-1]!='\\': quote=None
        elif c in "'\"": quote=c
        elif c=='{': stack+=1
        elif c=='}':
            stack-=1
            if stack==0: end=i; break
    result=[]
    def walk(obj,prefix=''):
        for entry in splitjs(obj):
            if ':' not in entry: continue
            name,value=entry.split(':',1); name=name.strip(); value=' '.join(value.split())
            path=prefix+name
            if value.startswith('['):
                result.append((path,'Array<subdocument>','Nhúng; _id tự sinh theo mặc định Mongoose'))
                inner=value[1:-1].strip()
                if inner.startswith('{'): walk(inner[1:-1],path+'[].')
            elif value.startswith('{'):
                opts=value[1:-1].strip()
                if re.match(r'type\s*:',opts):
                    typ=re.search(r'type:\s*([^,]+)',opts).group(1).strip()
                    result.append((path,typ,opts))
                else:
                    result.append((path,'Object nhúng','Không phải ref'))
                    walk(opts,path+'.')
            else: result.append((path,value,'Không khai báo constraint riêng'))
    walk(s[start+1:end])
    return result

def stage2():
    text='''# 02 — Mô hình dữ liệu và cấu trúc module

## Quy ước

Các class `<<Model>>` là schema Mongoose, không phải service domain được suy diễn. Thuộc tính là tên thực tế; `require: true` được chép nguyên và **không tương đương** `required: true`. Không thêm required, min/max, index hay khóa ngoại không có. Mongoose mặc định tạo `_id` và `__v`; timestamps=true thêm createdAt/updatedAt; Message chỉ có createdAt khai báo và timestamps=false. Nguồn: từng file schema bên dưới. Collection vật lý cần xác minh, không truy cập MongoDB.

## Từ điển dữ liệu và sơ đồ cho mọi schema

'''
    for m in M:
        fs=schema_fields(m); name=m['name']; alias='M_'+name
        text+=f'\n### Model `{name}`\n\nNguồn: {cite(m["source"])}.\n\n'
        text+=table(['Field','Kiểu khai báo','Options thực tế / ràng buộc'],fs)
        indexes=re.findall(r'(?:modelPayments\.index\([^;]+;)',m['fields'])
        timestamp='true' if re.search(r'timestamps:\s*true',m['fields']) else 'false'
        text+=f'\nOptions: timestamps={timestamp}. Index trong field xem cột options; index compound: '+('; '.join(indexes) or 'không khai báo thêm')+'. Không có hook, method hoặc static tự định nghĩa trong schema này.\n'
        body=f'class "{name}" as {alias} <<Model>> {{\n'
        enums=[]
        for idx,(field,typ,opts) in enumerate(fs):
            enum=re.search(r'enum:\s*\[([^]]+)\]',opts)
            if enum:
                en=alias+'_Enum'+str(idx); enums.append((en,[v.strip().strip("'\"") for v in enum.group(1).split(',')]))
                typ=en
            qualifiers=[]
            for key in ['required','require','default','unique','min','max','select','trim','lowercase','sparse','index','ref']:
                match=re.search(r'\b'+key+r':\s*(\{[^}]*\}|[^,]+)',opts)
                if match: qualifiers.append(key+'='+match.group(1).strip())
            body+='  '+field+' : '+typ+(' {'+'; '.join(qualifiers)+'}' if qualifiers else '')+'\n'
        body+='  _id : ObjectId\n  __v : Number\n'
        if timestamp=='true': body+='  createdAt : Date\n  updatedAt : Date\n'
        body+='}\n'
        for en,values in enums:
            body+=f'enum "{en.replace(alias+"_", "")}" as {en} <<enumeration>> {{\n'+'\n'.join('  '+v for v in values)+'\n}\n'+alias+' --> '+en+'\n'
        text+=diagram('class-model-'+name.lower(),body)
    text+='''
## Quan hệ, bội số và toàn vẹn

Mỗi association có bội số **logic mong muốn từ id**, không chứng nhận DB luôn có parent; MongoDB không tự enforce foreign key. Tên ref sai vẫn được biểu diễn nguyên trạng, vì controller thường truy vấn thủ công chứ không populate.
'''
    text+=diagram('class-relations-commerce','''class "user" as U <<Model>>
class "cartUser" as C <<Model>>
class "CartItem" as CI <<Embedded>>
class "products" as P <<Model>>
class "payments" as O <<Model>>
class "OrderItem" as OI <<Embedded>>
class "paymentAttempts" as A <<Model>>
class "coupon" as CP <<Model>>
class "category" as CT <<Model>>
class "brand" as B <<Model>>
U "0..1" <-- "0..*" C : userId String ref=user
U "0..1" <-- "0..*" O : userId ref=users
C "1" *-- "0..*" CI : product[]
O "1" *-- "0..*" OI : product[] + snapshot
CI "0..*" --> "0..1" P : productId ref=product
OI "0..*" --> "0..1" P : productId ref=product
O "0..1" <-- "0..*" A : orderId ref=payments
C "0..*" ..> "0..1" CP : nameCoupon String id (không ref)
O "0..*" ..> "0..1" CP : nameCoupon String id (không ref)
P "0..*" ..> "0..1" CT : category String id (không ref)
P "0..*" ..> "0..1" B : brand String name (không ref)
note bottom of U
Không có unique userId trên cartUser;
không khẳng định một user chỉ một giỏ trong DB.
end note''')
    text+=diagram('class-relations-account','''class "user" as U <<Model>>
class "apikey" as K <<Model>>
class "otp" as OTP <<Model>>
class "Registration" as Reg <<Embedded>>
class "previewProduct" as Rev <<Model>>
class "products" as Prod <<Model>>
class "Message" as Msg <<Model>>
class "blog" as Blog <<Model>>
U "0..1" <-- "0..1" K : userId unique String ref=user
OTP "1" *-- "0..1" Reg : registration
OTP "0..*" ..> "0..1" U : email String ref=user (không phải _id)
Rev "0..*" --> "0..1" U : userId ref=users
Rev "0..*" --> "0..1" Prod : productId ref=products
Msg "0..*" --> "0..1" U : senderId ref=User
Msg "0..*" --> "0..1" U : receiverId ref=User
note bottom of Blog
Không có authorId, không thêm quan hệ User-Blog.
end note''')
    text+='''
- `user` là tên model đăng ký, nhưng payments/previewProduct dùng ref `users`, Message dùng `User`; cart/order item dùng `product` trong khi model là `products`. Các đường truy vấn thủ công trong controller vẫn có thể chạy; `populate` theo các ref sai cần xác minh trước sử dụng. Nguồn: `server/src/models/users.model.js:1`, `message.model.js:1`, `payments.model.js:1`, `previewProduct.model.js:1`, `cartUser.model.js:1` (cùng thư mục server/src/models).
- Order chính là `payments`, không có model Order riêng. Mỗi order giữ snapshot unitPrice/nameProduct/images và nhiều paymentAttempts; order.transactionRef chỉ attempt hiện tại. `checkoutKey`, transactionRef và attempt.transactionRef có unique index; transaction yêu cầu replica set. Nguồn: `server/src/models/payments.model.js:1`, `server/src/models/paymentAttempt.model.js:1`, `server/src/services/vnpay.service.js:transaction`, `snapshot`, `newAttempt`.
- Stock/coupon reserve và release của COD/VNPAY nằm trong transaction; shipped/delivered kiểm transition; tăng soldCount khi delivered. MoMo là đường riêng có bù trừ reserveInventory nhưng chưa transaction cho toàn bộ thao tác. Nguồn: `server/src/services/vnpay.service.js:reserve`, `release`, `changeStatus`; `server/src/controllers/payments.controller.js:checkPaymentMomo`.
- Không có unique email trên user, unique email/type trên OTP, unique userId trên cart; luồng đọc rồi tạo không thay thế được constraint. Xóa category cascade products nhưng không xóa review, cart item, upload; đơn mới giữ snapshot. Nguồn: schema tương ứng; `server/src/controllers/category.controller.js:deleteCategory`.

## Cấu trúc backend

Routes và controllers là module/class JavaScript thực tế; stereotype chỉ chức năng kiến trúc. Hàm phụ trợ không nhất thiết là class. Nguồn: `server/src/routes/index.js:routes`, các routes/controller/service được liệt kê trong 00.
'''
    for label,names in [('account',['users']),('commerce',['products','cartUser','payments','category','coupon']),('content',['blog','message','previewProduct'])]:
        body='left to right direction\nclass "checkAuth" as Auth <<Middleware>> {\n  authUser()\n  authAdmin()\n  asyncHandler()\n}\n'
        for idx,name in enumerate(names):
            cp=f'server/src/controllers/{name}.controller.js'; ops=re.findall(r'async (\w+)\(',read(cp))
            routefile='payments.route.js' if name=='payments' else name+'.routes.js'
            body+=f'class "{routefile}" as R{idx} <<Router>>\nclass "{name}.controller.js" as C{idx} <<Controller>> {{\n'+'\n'.join('  '+x+'()' for x in ops)+'\n}\n'
            body+=f'R{idx} --> Auth\nR{idx} --> C{idx}\n'
            models=re.findall(r"require\('\.\./models/([^']+)'\)",read(cp))
            for j,model in enumerate(dict.fromkeys(models)):
                alias=f'M{idx}_{j}'; body+=f'class "{model}" as {alias} <<Model>>\nC{idx} --> {alias}\n'
        if label=='account':
            for i,(s,ops) in enumerate([('tokenSevices','createApiKey / createToken / createRefreshToken / verifyToken'),('otp.service','issue / consume / hasPendingRegistration'),('mail.service','sendOtpEmail / sendCheckEmail')]):
                body+=f'class "{s}" as S{i} <<Service>> {{\n  {ops}()\n}}\nC0 --> S{i}\n'
        if label=='commerce':
            body+='class "vnpay.service" as VNP <<Service>> {\n checkout()\n retry()\n ipn()\n reconcile()\n expirePending()\n changeStatus()\n}\nclass "vnpay-query.service" as Q <<Service>> {\n queryAttempt()\n}\nclass "product-catalog.service" as PC <<Service>>\nclass "catalog-browse.service" as CB <<Service>>\nclass "brand.service" as BS <<Service>>\nC2 --> VNP\nVNP --> Q\nC0 --> PC\nC0 --> CB\nCB --> BS\n'
            body+='class "brand.routes.js" as BrandR <<Router>>\nBrandR --> Auth\nBrandR --> BS\nclass "Multer / routes/index.js" as Upload <<Middleware>>\nUpload --> Auth\n'
        if label=='content': body+='class "socket" as Socket <<Service>> {\n initSocket()\n getIO()\n}\nclass "chatbot" as Bot <<Service>> {\n askQuestion()\n}\nclass "server.js" as Server <<EntryPoint>>\nServer --> Bot\nServer --> Socket\nC1 --> Socket\n'
        text+=f'\n### Backend {label}\n\nPhụ thuộc được lấy từ require/import của các module tương ứng, không thêm service layer cho controller thao tác DB trực tiếp.\n'+diagram('class-backend-'+label,body)
    text+='''
Upload là Multer middleware trong routes/index.js và blog.routes.js, không có upload.service. `utils/SendMail/sendMailForgotPassword.js` là nhánh legacy được import nhưng các lời gọi nằm sau return không tới được; mail.service mới xử lý luồng đang dùng. `config/vnpay.js` chỉ export cấu hình, không thấy nơi import trong src. Nguồn: các file và `server/src/controllers/users.controller.js:forgotPassword`, `resetPassword`.

## Cấu trúc client

Nguồn imports trực tiếp của mọi Pages/Components có trong bảng 00; các sơ đồ dưới tách module để đọc được. Ant Design/TinyMCE là thư viện UI, không phải backend.
'''
    text+=diagram('class-client-core','''class "main.jsx / publicRoutes" as Main <<EntryPoint>>
class "AdminRoute" as Guard <<Component>>
class "Provider" as Provider <<ContextProvider>> {
 getAuthUser()
 getCart()
 clearAuth()
}
class "Context / useStore" as Context <<Context>>
class "request.jsx" as Req <<API>>
class "ApiClient" as API <<API>> {
 setupInterceptors()
 refreshToken()
 processQueue()
 logout()
}
class "runtimeUrls / apiBaseUrl" as URLs <<Config>>
class "useFetch" as Fetch <<Hook>>
class "useDebounce" as Debounce <<Hook>>
class "useProductCatalog" as Catalog <<Hook>>
class "Socket.IO client" as Socket <<Transport>>
Main --> Provider
Main --> Guard
Guard --> Req
Provider --> Context
Provider --> Req
Provider --> Socket
Req --> API
Req --> URLs
API --> URLs
Fetch --> URLs
Catalog --> API''')
    text+=diagram('class-client-storefront','''class "App / HomePage" as App <<Page>>
class "Header / Footer" as Layout <<Component>>
class "ProductNew / CatalogSection" as New <<Component>>
class "CardBody" as Card <<Component>>
class "Category" as Cat <<Page>>
class "DetailProduct" as Detail <<Page>>
class "CartUser / CheckOut" as Cart <<Page>>
class "PaymentSuccess / OrderUser" as Order <<Page>>
class "LoginUser / Register / ForgotPassword / InfoUser" as Account <<Page>>
class "Blogs / DetailBlog" as Blog <<Page>>
class "Contact" as Contact <<Page>>
class "Messger / Chatbot" as Chat <<Component>>
class "request.jsx / ApiClient" as Req <<API>>
class "useStore / useFetch / useDebounce / useProductCatalog" as Hooks <<Hook>>
App --> Layout
App --> New
App --> Chat
New --> Card
New --> Hooks
Cat --> Card
Cat --> Hooks
Cat --> Req
Detail --> Hooks
Detail --> Req
Cart --> Hooks
Cart --> Req
Order --> Req
Account --> Req
Blog --> Req
Chat --> Req
Layout --> Req''')
    text+=diagram('class-client-admin','''class "AdminLayout" as Admin <<Page>>
class "ManagerProduct" as Product <<Component>>
class "ManagerCategory" as Category <<Component>>
class "CouponManagement" as Coupon <<Component>>
class "BlogAdmin" as Blog <<Component>>
class "ManagerUser" as User <<Component>>
class "ManagerOrder" as Order <<Component>>
class "ManagerStatistical" as Stats <<Component>>
class "Messager" as Chat <<Component>>
class "UserSidebar" as Sidebar <<Component>>
class "ChatWindow" as Window <<Component>>
class "request.jsx" as Req <<API>>
Admin --> Product
Admin --> Category
Admin --> Coupon
Admin --> Blog
Admin --> User
Admin --> Order
Admin --> Stats
Admin --> Chat
Chat *-- Sidebar
Chat *-- Window
Product --> Req
Category --> Req
Coupon --> Req
Blog --> Req
User --> Req
Order --> Req
Stats --> Req
Chat --> Req
Window --> Req''')
    text+='\n## Giả định và Phát hiện\n\nBội số thể hiện khả năng lưu trữ/khóa hiện tại, không dựa sample DB. Không suy ra collection có dữ liệu chỉ vì model tồn tại. Các thiếu constraint/ref sai và khác biệt UI/schema được tổng hợp tại 05.\n'
    for basename in ['message.model.js','payments.model.js','previewProduct.model.js','cartUser.model.js']:
        text=text.replace('`'+basename+':1`','`server/src/models/'+basename+':1`')
    write('02-class.md',text); progress(f'Giai đoạn 0–2 — kiểm kê, {len(U)} UC và 13 schema','Giai đoạn 3–5, README và kiểm tra cuối')

FLOW={
1:'''U -> UI : Nhập thông tin và submit
UI -> A : requestRegister(body)
A -> R : POST /api/register
R -> W : otpSendLimiter
alt Quá giới hạn IP
W --> A : 429
else Được xử lý
W -> C : registerWithVerification()
alt Dữ liệu thiếu hoặc email sai
C --> A : 400 Registration information is invalid
else Dữ liệu hợp lệ
C -> DB : user.findOne(email chuẩn hóa)
alt Email đã có
C --> A : 202 thông báo chung
else Email chưa có
C -> S : issue(verifyAccount, registration đã bcrypt)
S -> DB : Đọc otp; kiểm cooldown/window; update/create mã đã hash
alt Cooldown/rate record
S --> A : 429
else Đã issue
C -> E : mailService.sendOtpEmail()
alt Mail thất bại
E --> A : 503 Email delivery is unavailable.
else Mail được chấp nhận
C --> A : 201 Registration created...
end
end
end
end
end
A --> UI : Response hoặc lỗi
UI -> UI : Thành công: bước nhập OTP; lỗi: message.error''',
2:'''U -> UI : Nhập OTP
UI -> A : requestVerifyEmail(email, otp)
A -> R : POST /api/verify-email
R -> W : otpVerifyLimiter
alt IP vượt hạn
W --> A : 429
else Cho phép
W -> C : verifyEmail()
C -> C : assertOtpInput()
C -> S : consume(verifyAccount)
S -> DB : findOne(email, type)
alt Hết hạn / attempts >=5 / không có record
opt Có record
S -> DB : deleteOne()
end
S --> A : 400 Verification code is invalid or expired.
else Sai mã
S -> DB : attempts +=1
S --> A : 400 Verification code is invalid or expired.
else Đúng mã
S -> DB : findOneAndDelete(_id, otp)
alt Record đã bị consume hoặc thiếu registration/user đã có
C --> A : 400
else Có registration hợp lệ
C -> DB : user.create(passwordHash, typeLogin=email)
C --> A : 200 Email verification completed...
end
end
end
A --> UI : Kết quả
UI -> UI : Thành công chuyển /login''',
3:'''U -> UI : Chọn gửi lại sau countdown
UI -> A : requestResendVerification(email)
A -> R : POST /api/resend-verification
R -> W : otpSendLimiter
W -> C : resendVerification()
C -> S : hasPendingRegistration(email)
S -> DB : otp.findOne(email, verifyAccount)
alt Không có pending
C --> A : 202 thông báo chung
else Có pending
C -> S : issue(email, verifyAccount)
S -> DB : Kiểm cooldown/window; thay mã, giữ registration
alt Cooldown/rate limit
S --> A : 429
else Được cấp mã
C -> E : Gửi OTP qua Gmail OAuth2
alt Lỗi mail
E --> A : 503
else Chấp nhận
C --> A : 202 thông báo chung
end
end
end
A --> UI : Thành công: countdown=60; lỗi: message.error
note over W,S : Limiter IP và record email/type là hai tầng khác nhau''',
4:'''U -> UI : Email/password
UI -> A : requestLogin()
A -> R : POST /api/login
R -> C : login()
C -> DB : user.findOne(email)
alt Không có user / google-only / password sai
C --> A : 403 thông báo đăng nhập tương ứng
else bcrypt.compare khớp
C -> S : createApiKey(userId)
S -> DB : Upsert cặp RSA mới
C -> S : createToken(15m), createRefreshToken(7d)
S -> DB : Đọc privateKey theo userId
C --> A : 200 + Set-Cookie token, refreshToken, logged
A --> UI : Thành công
UI -> A : requestAuth(); getAuthUser(); getCart()
UI -> UI : isAdmin=true ? /admin : /
end
note over R,C : Không có rate limiter login riêng''',
5:'''U -> E : GoogleLogin popup
E --> UI : credential
UI -> A : requestLoginGoogle(credential)
A -> R : POST /api/login-google
R -> C : loginGoogle()
alt Thiếu credential/GOOGLE_CLIENT
C --> A : 403 Không thể xác thực Google
else Có cấu hình
C -> E : verifyIdToken(audience GOOGLE_CLIENT)
alt Token sai / email chưa verified
C --> A : 403 Google credential không hợp lệ / email chưa xác minh
else Token được xác minh
C -> DB : user.findOne(email)
opt Email mới
C -> DB : user.create(typeLogin=google)
end
C -> S : Rotate RSA; ký access/refresh
S -> DB : apikey upsert/read
C --> A : 200 + cookie phiên
UI -> A : Auth + cart
UI -> UI : Điều hướng theo isAdmin
end
end''',
6:'''UI -> A : requestAuth() / requestAdmin()
A -> R : GET /api/auth hoặc /api/admin
R -> W : authUser; admin thêm authAdmin
W -> S : verifyToken(cookie token)
S -> DB : apikey.findOne(userId decode)
alt JWT hợp lệ và quyền đủ
opt Admin
W -> DB : user.findById; isAdmin === true
end
W -> C : Handler
C -> DB : authUser đọc hồ sơ được chọn
C --> A : 200 metadata.auth hoặc message=true
else Token/quyền không hợp lệ
W --> A : 401
alt ApiClient và logged=1
A -> R : GET /api/refresh-token bằng axios trực tiếp
R -> C : refreshToken()
C -> S : verifyToken(refreshCookie)
S -> DB : publicKey theo userId
alt Refresh hợp lệ, user tồn tại
C -> S : createToken()
C --> A : 200 + access cookie
A -> R : Retry original request; giải phóng queue
else Refresh thất bại
A -> R : GET /api/logout
A -> UI : Xóa logged, chuyển /login
end
else Không logged / instance khác
A --> UI : Lỗi hoặc interceptor request.jsx (xem Phát hiện)
end
end''',
7:'''U -> UI : Chọn đăng xuất
UI -> A : requestLogout()
A -> R : GET /api/logout
R -> C : logout()
opt Có access token
C -> S : verifyToken()
alt Verify thành công
S -> DB : Đọc key
C -> DB : apikey.deleteMany(userId)
else Verify lỗi / access hết hạn
C -> C : catch; tiếp tục clear cookie
end
end
C --> A : 200 + Clear-Cookie token/refreshToken/logged
A --> UI : ClearAuth hoặc chuyển /login
note over C,DB : Không verify refresh để thu hồi key khi access hết hạn''',
8:'''U -> UI : Gửi email
UI -> A : requestForgotPassword()
A -> R : POST /api/forgot-password
R -> W : otpSendLimiter
W -> C : requestPasswordResetOtp()
C -> DB : user.findOne(email chuẩn hóa, typeLogin=email)
opt Email đủ điều kiện
C -> S : issue(forgotPassword)
S -> DB : OTP hash + TTL/attempts/window
alt Cooldown
C --> A : 429
else Được issue
C -> E : Gmail gửi OTP
opt Mail lỗi
C -> C : Log mã lỗi; vẫn trả response chung
end
end
end
C --> A : 202 thông báo chung (trừ cooldown)
U -> UI : Nhập OTP
UI -> A : requestVerifyResetPassword(email,otp)
A -> R : POST /api/verify-reset-password
R -> W : otpVerifyLimiter
W -> C : verifyPasswordReset()
C -> S : consume(forgotPassword)
S -> DB : Kiểm hạn/attempts, compare và xóa OTP
alt Mã sai/hết hạn
C --> A : 400
else Mã đúng và user email tồn tại
C --> A : 200 + cookie tokenResetPassword purpose=passwordReset, 5m
U -> UI : Nhập password/confirmPassword
UI -> A : requestResetPassword()
A -> R : POST /api/reset-password
R -> C : resetPasswordAfterVerification()
alt Thiếu cookie / password không khớp / purpose sai
C --> A : 400 Password reset request is invalid
else Proof hết hạn/sai chữ ký
C --> A : 401 Password reset session has expired...
else Proof và user hợp lệ
C -> DB : bcrypt password rồi user.save()
C --> A : 200 + clear proof cookie
A --> UI : Chuyển /login
end
end''',
9:'''U -> UI : Chỉnh sửa fullName/address/phone
UI -> A : requestUpdateUser(body)
A -> R : POST /api/update-user
R -> W : authUser
alt Phiên không hợp lệ
W --> A : 401
else Có phiên
W -> C : updateUser(req.user.id)
C -> DB : findByIdAndUpdate(id, whitelist fields, new=true)
C --> A : 200 metadata=user document
UI -> A : requestAuth() để nạp lại hồ sơ
end
note over C,DB : Document chưa loại password; không nhận role từ body''',
10:'''U -> UI : Mở trang chủ / chọn trang section
UI -> A : useProductCatalog(type,value,page)
A -> R : GET /api/product-catalog
R -> C : getProductCatalog()
C -> S : catalog(query)
alt Query không hợp lệ
S --> A : 400 Invalid page/section/gender/brand
else Query hợp lệ
S -> DB : category.find(); nhận diện tên đồng hồ
alt type=new
S -> DB : aggregate facet latest/genderCounts/brandCounts
else gender hoặc brand
S -> DB : countDocuments(); find sort/skip/limit 10
end
S --> C : items + page metadata + sections nếu new
C --> A : 200 metadata
A --> UI : Card/loading/error/retry
end
opt Section chưa visible
UI -> UI : Chờ IntersectionObserver trước tải
end''',
11:'''U -> UI : Nhập search / chọn filter category-brand-giá-stock
alt Header search legacy
UI -> A : requestSearch(valueSearch) sau debounce
A -> R : GET /api/search
R -> C : searchProduct()
C -> DB : find nameProduct regex trực tiếp, không limit
C --> A : 200 danh sách
else Category browse
UI -> A : useFetch catalog-options; GET catalog-browse với AbortSignal
A -> R : GET /api/catalog-options và /api/catalog-browse
R -> C : getCatalogOptions / browseProducts
C -> S : options / browse
alt Query sai
S --> A : 400 Invalid stock/price/search hoặc Choose category or brand
else Query hợp lệ
S -> DB : Options: category + brand/product counts + priceMax
S -> DB : Browse: count; find giá sau giảm, escaped regex; limit 20
S --> C : Options hoặc items/page/total
C --> A : 200
end
end
A --> UI : Render hoặc thông báo lỗi; abort request cũ khi đổi filter''',
12:'''U -> UI : Mở /product/:id
UI -> A : useFetch(get-product-by-id?id)
A -> R : GET /api/get-product-by-id
R -> C : getProductById()
C -> DB : products.findById(id)
alt Product null / id sai
C --> A : 500 CastError/TypeError qua asyncHandler
else Có sản phẩm
C -> DB : Related category, loại id; limit 8
C -> DB : previewProduct.find(productId)
loop Mỗi đánh giá
C -> DB : user.findById(userId)
alt User mất
C --> A : 500 truy cập fullName
else User còn
C -> C : Ghép tên user
end
end
C --> A : 200 product/relatedProducts/previewProduct
A --> UI : Render chi tiết
end
note over C,DB : API get-preview-product-home riêng lấy 10 review; không sort''',
13:'''U -> UI : Gửi rating/comment cho sản phẩm trong đơn
UI -> A : requestCreatePreviewProduct()
A -> R : POST /api/create-preview-product
R -> W : authAdmin
alt User thường hoặc thiếu phiên
W --> A : 401 Bạn không có quyền truy cập
else Admin
W -> C : createPreviewProduct()
C -> DB : previewProduct.create(userId từ JWT, body fields)
C --> A : 201 Tạo đánh giá sản phẩm thành công
end
A --> UI : Response hoặc rejected Promise
note over W,DB : Chưa kiểm đơn delivered/ownership, chưa bound rating;
note over UI,A : Luồng khách thường ở UI chưa hoàn chỉnh''',
14:'''UI -> A : requestGetCart()
A -> R : GET /api/get-cart
R -> W : authUser
W -> C : getCart()
C -> DB : cartUser.findOne(userId JWT)
alt Không có giỏ
C --> A : 200 cartItems=[], totalPrice=0, dataCoupon=[]
else Có giỏ
loop Mỗi item (Promise.all)
C -> DB : products.findById nếu id hợp lệ
end
C -> C : Bỏ item mất; tính lại giá hiện tại
opt Khác item hoặc totalPrice
C -> DB : cart.save()
end
C -> DB : coupon.find(date,quantity,minPrice)
C --> A : 200 cartId/cartItems/totalPrice/dataCoupon
end
A --> UI : Provider cập nhật dataCart
note over W,C : Middleware lỗi: 401; query/DB lỗi: 500''',
15:'''U -> UI : Chọn thêm quantity
UI -> A : requestCreateCart(productId,quantity)
A -> R : POST /api/create-cart
R -> W : authUser
W -> C : addToCart()
C -> DB : Đọc product, quantityProduct()
alt Quantity không nguyên dương / vượt stock / product mất
C --> A : 403 thông báo số lượng/sản phẩm
else Quantity hợp lệ
C -> DB : cart.findOne(userId)
alt Có giỏ
C -> C : Tăng item hoặc push; kiểm tổng quantity nếu có item
loop Mỗi item
C -> DB : Đọc giá/discount product để tính tổng
end
C -> DB : cart.save()
C --> A : 200
else Chưa có giỏ
C -> DB : cart.create(item,total)
C --> A : 201
end
UI -> A : getCart()
end
note over C,DB : Read/save chưa transaction; không reserve kho''',
16:'''U -> UI : Thay số lượng
UI -> A : requestUpdateProductCart()
A -> R : POST /api/update-product-cart
R -> W : authUser
W -> C : updateProductCart()
C -> DB : quantityProduct(productId,quantity)
alt Invalid quantity / thiếu stock
C --> A : 403
else Số lượng hợp lệ
C -> DB : cart.findOne(userId), product.findById
alt Giỏ hoặc item không tồn tại
C --> A : 403 thông báo tương ứng
else Có item
C -> C : total = total - oldItemPrice + newItemPrice
C -> DB : save quantity và total
C --> A : 200 Cập nhật số lượng sản phẩm thành công
UI -> A : getCart()
end
end''',
17:'''U -> UI : Xóa item
UI -> A : requestDeleteProductCart()
A -> R : POST /api/delete-product-cart
R -> W : authUser
W -> C : deleteProductCart()
C -> DB : cart.findOne(userId), product.findById
alt Không có giỏ/item/product
C --> A : 403 thông báo tương ứng
else Có đủ dữ liệu
C -> C : filter item, trừ thành tiền theo giá hiện tại
C -> DB : cart.save()
C --> A : 200 Xóa sản phẩm khỏi giỏ hàng thành công
UI -> A : getCart()
end''',
18:'''U -> UI : Nhập shipping và chọn coupon
opt Địa chỉ >=3 ký tự sau debounce 500ms
UI -> E : Goong AutoComplete qua axios trực tiếp
alt Thành công
E --> UI : predictions
else Lỗi/abort
UI -> UI : Bỏ gợi ý; vẫn cho nhập tay
end
end
UI -> UI : Gán nameCoupon=id, tổng tiền dự kiến
alt MoMo
UI -> A : requestUpdateInfoCart()
A -> R : POST /api/update-info-cart
R -> W : authUser
W -> C : updateInfoCart()
C -> DB : find cart user; gán shipping/nameCoupon; save
C --> A : 200 hoặc 403 thiếu cart
else COD/VNPay
UI -> A : Gửi shipping/nameCoupon trong create-payment
A -> S : checkout snapshot kiểm lại coupon từ DB
end
note over R,C : GET /api/coupon legacy thiếu authUser, req.user undefined ->500;
note over UI,A : UI thực dùng dataCoupon từ get-cart''',
19:'''U -> UI : Chọn COD và đặt hàng
UI -> A : requestCreatePayment(cartId,shipping,typePayment=COD)
A -> R : POST /api/create-payment
R -> W : authUser
W -> C : createPayment()
C -> S : checkout(req)
S -> DB : init unique indexes; start transaction
alt checkoutKey của user đã có
S -> DB : Đọc order có sẵn
alt Khác method hoặc cancelled
S --> A : 409 Cart already checked out
else Cùng COD còn hiệu lực
S --> A : 201 order cũ
end
else Chưa checkout
S -> DB : Cart theo cartId + userId; đọc products và coupon
S -> S : snapshot giá làm tròn VND; shippingFee=0
loop Mỗi item
S -> DB : update stock với stock >= quantity
end
opt Có coupon
S -> DB : Update quantity với điều kiện date/minPrice/quantity
end
alt Dữ liệu/kho/coupon không hợp lệ
S -> DB : Abort transaction
S --> A : 400 hoặc 503 nếu không có replica set
else Hợp lệ
S -> DB : save pending/unpaid order; delete cart; commit
S --> A : 201 metadata order
UI -> UI : Navigate /payments/:id
UI -> A : getCart()
end
end''',
20:'''U -> UI : Chọn VNPAY và đặt hàng
UI -> A : requestCreatePayment(typePayment=VNPAY)
A -> R : POST /api/create-payment
R -> W : authUser
W -> C : createPayment()
C -> S : checkout(req)
S -> S : config gateway/Return/client URLs; validate IP
alt Cấu hình thiếu/sai
S --> A : 503; IP/amount sai 400
else Cấu hình hợp lệ
S -> DB : Transaction: cart ownership + snapshot + reserve stock/coupon
alt Checkout đã có pending attempt chưa hết hạn
S -> DB : select +paymentUrl
S --> A : 201 URL cũ
else Đơn mới
S -> S : newAttempt(), UUID ref; SDK buildPaymentUrl(), TTL 15m
S -> DB : Create attempt + save order + delete cart; commit
S --> A : 201 metadata URL
end
A --> UI : URL đã ký
UI -> E : Browser chuyển đến VNPay
end
note over S,DB : Lỗi snapshot/reserve rollback; attempt chưa đồng nghĩa paid''',
21:'''E -> R : Browser GET /api/vnpay-return hoặc check-payment-vnpay
R -> C : checkPaymentVnpay(query)
C -> S : verify(query)
alt Sai chữ ký/params
C --> E : 400 Dữ liệu hoặc chữ ký VNPay không hợp lệ
else Verify hợp lệ
C -> DB : attempt.findOne(transactionRef)
alt Không tìm thấy
C --> E : 404 Không tìm thấy giao dịch
else Amount không khớp attempt *100
C --> E : 400 Số tiền thanh toán không khớp
else Khớp
C --> UI : 302 /payments/:orderId; production absolute client URL
UI -> A : get-payment-success (auth/ownership)
opt Trạng thái pending/failed/expired và đến lịch
UI -> A : reconcile-payment-vnpay
end
end
end
note over C,DB : Return không settle hoặc đánh dấu paid''',
22:'''E -> R : GET /api/vnpay-ipn (query signed)
R -> C : ipnVnpay()
C -> S : ipn -> verify()
alt Chữ ký/params sai
S --> E : HTTP 200 RspCode=97
else Verify hợp lệ
S -> DB : Transaction: attempt + order
alt Không khớp order/method/orderInfo
S --> E : HTTP 200 RspCode=01
else Amount khác attempt*100 hoặc totalPrice
S --> E : HTTP 200 RspCode=04
else receivedAt hoặc reconciledAt đã có
S --> E : HTTP 200 RspCode=02
else Callback mới
S -> DB : Ghi response fields, receivedAt, source=ipn
alt code=00,status=00 và attempt hiện tại, đơn pending còn reserved
S -> DB : attempt.status=paid; order.paymentStatus=paid
else Thành công nhưng muộn/attempt cũ/đơn không đủ điều kiện
S -> DB : refund_required; release nếu còn reserve và pending
else Thanh toán thất bại/hủy
S -> DB : attempt.failed; nếu current pending: release, order.failed
end
S -> DB : save attempt/order; commit
S --> E : HTTP 200 RspCode=00
end
end
opt Exception
C --> E : HTTP 200 RspCode=99
end''',
23:'''U -> UI : Thanh toán lại
UI -> A : requestRetryVnpay(idOrder)
A -> R : POST /api/retry-payment-vnpay
R -> W : authUser
W -> C : retryVnpay()
C -> S : retry(req)
S -> DB : Transaction; order thuộc user, VNPAY, status pending
alt Không đủ điều kiện / paymentStatus ngoài pending-failed-expired
S --> A : 409 Order cannot be paid
else paymentStatus=pending
S -> DB : Read attempt với +paymentUrl
alt Attempt còn hạn
S --> A : 200 URL hiện tại
else Đã quá hạn nhưng worker chưa xử lý
S --> A : 409 Payment is awaiting expiry processing; retry shortly
end
else paymentStatus failed/expired
S -> DB : Reserve kho/coupon theo snapshot
alt Thiếu kho/coupon
S -> DB : Rollback
S --> A : 400
else Reserve thành công
S -> S : newAttempt() ref mới
S -> DB : Save attempt và order pending; commit
S --> A : 200 URL mới
end
end
A --> UI : URL hoặc message.error
opt Có URL
UI -> E : Browser chuyển VNPay
end''',
24:'''UI -> A : requestReconcileVnpay(idOrder)
A -> R : POST /api/reconcile-payment-vnpay
R -> W : authUser
W -> C : reconcileVnpay()
C -> S : reconcile(idOrder,userId)
S -> DB : Find order đúng owner/VNPAY
alt ID sai / không có đơn
S --> A : 400 / 404
else Không ở pending/expired/failed
S --> A : 200 summary hiện tại
else Cần query
S -> DB : findOneAndUpdate lease nextQueryAt +5 phút
alt Đang lease hoặc đã nhận confirmation
S --> A : 200 trạng thái cũ + lịch query
else Lấy được lease
S -> E : queryAttempt HMAC querydr, timeout 10s, redirect=error
alt Mạng/provider lỗi hoặc response không verified
S --> A : 200 summary cũ + lịch query
else verified và responseCode=00, transactionStatus=00/02
S -> DB : settle transaction (giống IPN), source=querydr
S -> DB : Đọc paymentStatus mới
S --> A : 200 summary
else Response khác
S -> DB : Đọc lại trạng thái, không settle
S --> A : 200 summary
end
end
end
A --> UI : paymentStatus và nextCheckAt''',
25:'''U -> UI : Chọn MOMO
UI -> A : update-info-cart rồi create-payment
A -> R : POST /api/create-payment (MOMO)
R -> W : authUser
W -> C : createPayment()
C -> DB : Đọc cart; coupon cho totalPrice
C -> C : requireConfig + HMAC SHA256 request
C -> E : POST MOMO_ENDPOINT
E --> C : payUrl
C --> A : 201 metadata payUrl
A --> UI : URL
UI -> E : Chuyển browser
E -> R : GET /api/check-payment-momo
R -> C : checkPaymentMomo(query)
alt resultCode=0
C -> DB : Tìm transactionRef MOMO:orderId
alt Đã tồn tại
C --> UI : 302 đơn cũ
else Chưa có
C -> DB : Cart theo orderInfo.split()[2]
C -> DB : reserveInventory từng item
alt save order lỗi
C -> DB : Bù kho reserved
C --> A : Error middleware
else save được
C -> DB : Trừ coupon; xóa cart
C --> UI : 302 /payments/:id
end
end
else resultCode khác 0
note over C : Không có nhánh kết thúc response
end
note over R,C : Chưa verify chữ ký callback hoặc amount''',
26:'''U -> UI : Mở lịch sử /payments/:id
UI -> A : requestGetOrderUser hoặc requestGetPaymentSuccess
A -> R : GET /api/get-order-user hoặc get-payment-success
R -> W : authUser
W -> C : getOrderUser / getPaymentSuccess
C -> DB : Find orders với userId JWT, thêm _id nếu detail
alt Detail không thấy đơn thuộc user
C --> A : 403 Không tìm thấy đơn hàng
else Có dữ liệu
loop Mỗi item của mỗi đơn
C -> DB : Đọc product hiện tại cho legacy fallback
C -> C : Ưu tiên snapshot unitPrice/nameProduct/images
end
C --> A : 200 thông tin đơn và paymentStatus
A --> UI : Hiển thị bảng/chi tiết
end''',
27:'''U -> UI : Hủy đơn
UI -> A : requestCancelOrder(idOrder)
A -> R : POST /api/cancel-order
R -> W : authUser
W -> C : cancelOrder()
C -> S : changeStatus(idOrder,cancelled,userId)
S -> DB : Transaction tìm order theo owner
alt Không tồn tại
S --> A : 404 Order not found
else Đã cancelled
S --> A : 200 không release lần nữa
else Không pending / online paid hoặc refund_required
S --> A : 409 theo rule trạng thái/thanh toán
else Được hủy
S -> DB : Release kho/coupon, cancel attempt pending nếu VNPAY
S -> DB : status=cancelled; VNPAY paymentStatus=failed; commit
C --> A : 200 Đơn hàng đã được hủy bỏ
UI -> A : Tải lại order-user
end''',
28:'''U -> UI : Mở blog / chọn bài
UI -> A : requestGetAllBlog / requestGetBlogById
A -> R : GET /api/blog/get-all hoặc get-by-id
R -> C : getAllBlog / getBlogById (không wrapper)
C -> DB : find / findById
alt Query thành công
C --> A : 200 metadata blogs/blog hoặc null
A --> UI : Render content HTML
else Promise rejected
note over R,C : Express 4 không tự chuyển rejected Promise;
note over UI,C : Không đảm bảo JSON error; client có thể nhận lỗi mạng/treo
end''',
29:'''U -> UI : Mở khung chat / nhập text
UI -> A : GET get-message-user
A -> R : /api/message/get-message-user
R -> W : authUser
W -> C : getMessageUser()
C -> DB : findOne(senderId JWT); find conversation
alt Chưa từng gửi tin
C --> A : 500 khi đọc data.receiverId
else Có conversation
C --> A : 200 lịch sử
end
UI -> A : requestCreateMessage(text)
A -> R : POST /api/message/create
R -> W : authUser
W -> C : createMessage()
C -> DB : findOne admin; Message.create
alt Có socket admin
C -> Sock : emit newMessage(document)
Sock --> UI : Provider admin nhận newMessageAdmin
else Admin offline
C -> C : Log; DB vẫn đã lưu
end
C --> A : 201 metadata Message
Sock --> UI : newMessageUser khi admin trả lời
note over C,DB : Thiếu admin có thể null ->500 trước ghi''',
30:'''U -> UI : Mở tab tin nhắn và chọn khách
UI -> A : requestGetAllMessage()
A -> R : GET /api/message/all
R -> W : authAdmin
W -> C : getAllUserMessage()
C -> DB : Aggregate latest sender + unread + users
C --> A : 200 sidebar
UI -> A : read-message + get-message(senderId,receiverId)
A -> R : GET /api/message/read-message, get-message
R -> C : readMessage (authUser) / getMessage (authAdmin)
C -> DB : updateMany isRead; find conversation
C --> A : 200
U -> UI : Nhập trả lời
UI -> A : requestCreateMessageAdmin(receiverId,text)
A -> R : POST /api/message/create-admin
R -> W : authAdmin
W -> C : createMessageAdmin()
C -> DB : Message.create
opt Khách online trong map
C -> Sock : emit newMessageUser
Sock --> UI : Provider khách nhận
end
C --> A : 201
note over C,DB : readMessage đánh dấu cả conversation, không chỉ tin nhận;
note over UI,Sock : Không có socket read receipt; auth lỗi 401, DB/cast lỗi 500''',
31:'''U -> UI : Gửi câu hỏi
UI -> A : requestChatbot({question})
A -> R : POST /api/chatbot
R -> W : chatbotRateLimit 10/phút/IP
alt Quá hạn IP
W --> A : 429 RATE_LIMIT
else Được phép
R -> C : Validate question/history và tạo requestId
alt Input sai
C --> A : 400 INVALID_INPUT
else Input hợp lệ
C -> S : askQuestion()
alt Thiếu GEMINI_API_KEY
S --> A : 503 INVALID_KEY
else Key được cấu hình
S -> DB : Products stock>0, limit 10, lean
S -> S : Dựng systemInstruction catalog công khai
loop Tối đa 3 lần gọi; chỉ retry quota/network/503
S -> E : generateContent, timeout 30s/lần
alt Retryable và còn lượt
S -> S : Delay 300ms rồi 600ms
else Không retry hoặc đã hết lượt
S -> S : Kiểm safety/STOP/text hoặc classifyError
end
end
alt Nội dung hợp lệ
S --> A : 200 metadata string
else Lỗi cuối
S --> A : 422/429/502/503/504 + errorCode/requestId
end
end
end
end
A --> UI : Render text đã lọc control chars; lỗi có nút thử lại''',
32:'''U -> UI : Mở quản lý sản phẩm
UI -> A : get-all-product, get-all-category, brands
A -> R : GET các danh sách
R -> C : getAllProduct / category / brand
C -> DB : Product.find + category từng product
C --> A : 200 hoặc 500 nếu category mất
U -> UI : Tạo / sửa / xóa
opt Có ảnh mới
UI -> A : Upload FormData images (UC-39)
end
UI -> A : requestCreateProduct / UpdateProduct / DeleteProduct
A -> R : POST create/update; DELETE delete
R -> W : authAdmin
alt Không đủ quyền
W --> A : 401
else Admin
W -> C : Handler tương ứng
alt Create
C -> C : Kiểm trường truthy
C -> DB : createProduct đủ thông số
C --> A : 201 hoặc 403 thiếu field
else Update
C -> DB : findByIdAndUpdate whitelist cũ name/size/giá/stock/brand...
C --> A : 200 (không cập nhật nameProduct)
else Delete
C -> DB : findByIdAndDelete
C --> A : 200 hoặc 403 không có product
end
end
A --> UI : Refresh bảng / message.error''',
33:'''U -> UI : Tạo / sửa / xóa danh mục
UI -> A : requestGetAllCategory và mutation
A -> R : GET get-all-category; POST create/update; DELETE delete
alt Read
R -> C : getAllCategory (public)
C -> DB : find()
C --> A : 200
else Mutation
R -> W : authAdmin
W -> C : Handler
alt Tạo thiếu name
C --> A : 403 Vui lòng nhập đầy đủ thông tin
else Create/update hợp lệ
C -> DB : create hoặc findByIdAndUpdate
C --> A : 201 hoặc 200
else Delete
C -> DB : findByIdAndDelete category
alt Không tồn tại
C --> A : 500 NotFoundError chưa import
else Tồn tại
C -> DB : products.deleteMany(category=id)
C --> A : 200
end
end
end
note over C,DB : Không transaction khi xóa category + products;
A --> UI : Tải lại bảng''',
34:'''U -> UI : Mở bảng / tạo-sửa-xóa coupon
UI -> A : requestGetAllCoupon hoặc mutation
A -> R : GET /api/coupons; POST create/update; DELETE delete
alt List public
R -> C : getAllCoupon()
C -> DB : coupon.find()
C --> A : 200 {success,coupons}
else Write admin
R -> W : authAdmin
W -> C : Handler
alt Create thiếu field truthy
C --> A : 400 thông báo thiếu thông tin
else Create hợp lệ
C -> DB : new coupon + save
C --> A : 201 thông báo tạo
else Update
C -> DB : findByIdAndUpdate(_id, fields)
C --> A : 200 thông báo cập nhật
else Delete
C -> DB : findByIdAndDelete(id)
C --> A : 200 hoặc 500 message=error
end
end
A --> UI : Cập nhật bảng/thông báo''',
35:'''U -> UI : Soạn/sửa/xóa bài viết
UI -> A : get-all; upload ảnh nếu có; create/update/delete blog
A -> R : /api/blog/*
opt Mutation bài viết
R -> W : authAdmin
end
R -> C : Async handler không có wrapper
alt Create
C -> DB : blog.create(title,content,image)
C --> A : 201
else Update
C -> DB : findById(id)
alt Không có bài
C -> C : next(new NotFoundError chưa import)
else Có bài
C -> DB : findByIdAndUpdate
C --> A : 200 metadata document trước update
end
else Delete
C -> DB : findByIdAndDelete
C --> A : 200
end
note over R,C : Rejection có thể không tới error middleware Express 4
A --> UI : Refresh/preview content HTML''',
36:'''U -> UI : Mở users / đổi switch quyền
UI -> A : requestGetAllUser()
A -> R : GET /api/users
R -> W : authAdmin
W -> C : findAllUser()
C -> DB : user.find() không projection
C --> A : 200 users gồm password field
U -> UI : Đổi isAdminUser
UI -> A : requestUpdateUserAdmin(id,isAdminUser)
A -> R : POST /api/update-user-admin
R -> W : authAdmin
W -> C : updateUserAdmin()
C -> DB : findOne admin (không dùng kết quả); update isAdmin
C --> A : 200 metadata user document
note over C,DB : Không bảo vệ admin cuối cùng; DB/cast lỗi 500
A --> UI : Refresh bảng''',
37:'''U -> UI : Mở orders; chọn trạng thái tiếp theo
UI -> A : get-order-admin rồi update-order-status
A -> R : GET /api/get-order-admin; POST /api/update-order-status
R -> W : authAdmin
W -> C : getOrderAdmin / updateOrderStatus
C -> DB : List orders + product snapshots + attempts
C -> S : changeStatus(id,status)
S -> DB : Transaction đọc order
alt ID/status sai hoặc không thấy
S --> A : 400 / 404
else Trạng thái không đổi
S --> A : 200, không tăng/hoàn kho lặp
else Transition sai / VNPAY chưa paid hoặc refund_required
S --> A : 409
else Transition hợp lệ
alt Hủy
S -> DB : Release stock/coupon; cancel pending attempt
else Delivered
S -> DB : soldCount += quantity; COD paymentStatus=paid
else Confirmed/shipped
S -> S : Đổi status
end
S -> DB : save order; commit
C --> A : 200 Cập nhật trạng thái đơn hàng thành công
end
A --> UI : Refresh bảng và modal''',
38:'''U -> UI : Mở dashboard
UI -> A : requestStatistical()
A -> R : GET /api/statistical
R -> W : authAdmin
W -> C : getStatistical()
C -> DB : aggregate users facets
C -> DB : aggregate products total/category/topSelling
C -> DB : aggregate orders status/paymentMethod
C -> DB : aggregate delivered revenue total/month/7 days
C -> DB : aggregate reviews total/average/bestRated
alt Các query thành công
C --> A : 200 metadata kết quả
A --> UI : Cards/biểu đồ/bảng
else Query lỗi
C --> A : 500 message + error.message
end
note over C,DB : Các aggregate chạy tuần tự; không dùng par;
note over C,DB : loginType/product/name khác field schema thực tế (xem 05)''',
39:'''U -> UI : Chọn file
UI -> A : FormData images[] hoặc image
alt Product upload
A -> R : POST /api/upload-image
R -> W : authAdmin rồi Multer array(images)
else Blog upload
A -> R : POST /api/blog/upload-image
R -> W : Multer single(image), không authAdmin
end
W -> DB : Ghi filesystem src/uploads (không phải MongoDB)
W -> C : req.files hoặc req.file
alt Không có file
C --> A : Product 400 nếu files falsy; blog 403 qua next
else Có file
C --> A : Product 200 images[]; blog 200 metadata URL
A --> UI : Lưu URL vào payload entity
end
note over W,DB : Không fileFilter/limits; Date.now + extname gốc;
note over C,DB : Không cleanup file khi entity lưu thất bại''',
40:'''U -> UI : Mở form sản phẩm
UI -> A : requestGetBrands()
A -> R : GET /api/brands
R -> W : authAdmin
alt Không đủ quyền
W --> A : 401
else Admin
W -> S : brandService.list()
S -> DB : Promise.all: brands.find + products.aggregate brand counts
S -> S : Merge lowercase/trim; cộng count; sort locale vi
S --> R : [{name,productCount}]
R --> A : 200 metadata
A --> UI : Gợi ý thương hiệu
end
note over S,DB : Catalog-options public dùng list nhưng chỉ lấy name;
note over R,S : Không có endpoint ghi thương hiệu'''
}

FLOW[12]=FLOW[12].replace('UI -> A : useFetch(get-product-by-id?id)','UI -> A : useFetch(get-product-by-id?id) và useFetch(get-preview-product-home)')
FLOW[12]+='\nUI -> UI : reviewsData từ home API lọc productId; giới hạn 10 toàn hệ thống'
FLOW[41]='''U -> UI : Mở /contact
UI -> UI : Đọc config/contactInfo.js và render
alt Có phone/email/social link
UI --> U : Hiển thị liên kết
opt Người dùng click
U -> E : Mở tel/mailto/bản đồ/mạng xã hội
end
else Chưa cấu hình
UI --> U : Đang cập nhật / liên kết chưa có
end
note over UI : Không gọi API backend hoặc ghi dữ liệu'''

def stage3():
    text='''# 03 — Sequence theo luồng hiện tại

Mỗi sơ đồ ứng với một UC trong 01. Tên participant là alias kiến trúc: `Controller`/`Service` tham chiếu handler/service được dẫn nguồn, không giả định mọi handler có thêm service. `Model / MongoDB` chỉ nơi truy cập persistence; riêng upload ghi filesystem được ghi rõ trong mũi tên. Actor bên ngoài phù hợp từng UC; các participant không tham gia đã được bỏ khỏi sơ đồ.

Các lỗi chung: authUser/authAdmin 401; BadRequestError không truyền status mặc định 403; exception DB/query chưa xử lý trả 500 qua asyncHandler. Blog không có wrapper nên không bảo đảm đi tới error middleware. Nguồn: `server/src/auth/checkAuth.js:1`, `server/src/core/error.response.js:1`, `server/src/routes/blog.routes.js:1`. Mỗi sơ đồ ghi thêm các nhánh riêng; không mô phỏng sự cố mạng/DB chưa chạy thực tế.
'''
    rows=[]
    for i,u in enumerate(U,1):
        body=FLOW[i]
        allparts=[('actor',u['actor'],'U'),('participant',Path(u['page']).name,'UI'),('participant','axios / request.jsx','A'),('participant','Express route','R'),('participant','Middleware','W'),('participant','Controller','C'),('participant','Service','S'),('database','Model / MongoDB','DB'),('participant',u['external'] if u['external']!='Không' else 'VNPay','E'),('participant','Socket.IO','Sock')]
        used=set(re.findall(r'\b(?:U|UI|A|R|W|C|S|DB|E|Sock)\b',body))
        participants='\n'.join(f'{kind} "{name}" as {alias}' for kind,name,alias in allparts if alias in used)
        name=f'seq-{i:02}'
        rows.append([u['id'],u['name'],name+'.puml'])
        text+=f'\n## {u["id"]} — {u["name"]}\n\n**Mô tả:** {u["rules"]}\n\n**Tiền điều kiện:** {u["pre"]}\n\n**Nguồn:** {sources(u)}.\n'
        text+=diagram(name,'autonumber\n'+participants+'\n'+body)
        text+=f'\n**Nhánh thay thế / giới hạn:** {u["alt"]} {u["errors"]}\n'
    text+='\n## Chỉ mục\n\n'+table(['UC','Luồng','Nguồn UML'],rows)
    write('03-sequence.md',text); progress('Giai đoạn 0–3 — 40 sequence theo 40 UC','Giai đoạn 4–5, README và kiểm tra cuối')

ACTS=[
('act-01','Đăng ký và xác minh email',[1,2,3],'''|Khách vãng lai|
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
stop'''),
('act-02','Đăng nhập email/Google và quyền admin',[4,5,6,7],'''|Khách vãng lai|
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
stop'''),
('act-03','Khôi phục mật khẩu',[8],'''|Khách vãng lai|
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
stop'''),
('act-04','Mua hàng từ catalog đến đơn',[10,11,12,14,15,16,17,18,19,20,26,27],'''|Khách hàng|
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
|Khách hàng|
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
stop'''),
('act-05','VNPay: tạo URL, Return và xác nhận',[20,21,22,24],'''|Khách hàng|
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
stop'''),
('act-06','VNPay: hết hạn, retry, đối soát và callback muộn',[22,23,24],'''|Backend|
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
|Khách hàng|
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
stop'''),
('act-07','Xử lý trạng thái đơn hàng phía admin',[27,37],'''|Quản trị viên|
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
stop'''),
('act-08','Quản lý sản phẩm, danh mục, coupon',[32,33,34,39,40],'''|Quản trị viên|
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
stop'''),
('act-09','Chat khách hàng và admin',[29,30],'''|Khách hàng|
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
stop'''),
('act-10','Chatbot Gemini và nhánh lỗi',[31],'''|Khách vãng lai|
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
stop'''),
('act-11','Thống kê và phân quyền người dùng',[36,38],'''|Quản trị viên|
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
stop'''),
('act-12','Blog, upload và đọc nội dung',[28,35,39],'''|Quản trị viên|
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
stop'''),
('act-13','MoMo legacy và callback',[25],'''|Khách hàng|
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
stop''')]

ORDER_STATE='''state "Chờ xác nhận (pending)" as Pending
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
end note'''
PAY_STATE='''state "Chưa thanh toán COD (unpaid)" as Unpaid
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
end note'''

def stage4():
    text='''# 04 — Activity và state machine

Activity có swimlane theo trách nhiệm thực tế; không thêm fork/join khi code chạy tuần tự hoặc hai callback độc lập không có đồng bộ. Các nhánh lỗi rút gọn từ sequence tương ứng; lỗi DB sau ghi ngoài transaction có thể để lại dữ liệu một phần. Sơ đồ không có nghĩa đã chạy hệ thống.
'''
    for name,title,ids,body in ACTS:
        text+=f'\n## {title}\n\n**Phạm vi:** '+', '.join(f'UC-{i:02}' for i in ids)+'.\n\n'
        text+='**Mô tả:** '+('Luồng điều khiển theo các handler/điều kiện trong code; các nhánh thành công, từ chối và lỗi được thể hiện ở các decision tương ứng.')+'\n\n**Nguồn:** '+'; '.join(dict.fromkeys(sources(U[i-1]) for i in ids))+'.\n'
        if name=='act-06': text+='\nNguồn worker: `server/src/server.js:runPaymentExpiry`, `server/src/services/vnpay.service.js:expirePending`, `retry`, `settle`, `reconcile`.\n'
        text+=diagram(name,body.replace('|Khách hàng|','|Khách hàng đã đăng nhập|'))
    text+='\n## State machine đơn hàng\n\nĐây là transitions thực sự được khai báo trong vnpay.service; guard payment/ownership nằm trong changeStatus, không phải enum tự enforce chuyển trạng thái. Nguồn: `server/src/services/vnpay.service.js:transitions`, `changeStatus`; `client/src/Pages/Admin/Components/ManagerOrder/ManagerOrder.jsx:statusChoices`.\n'+diagram('act-state-order',ORDER_STATE)
    text+='\n## State machine paymentStatus\n\nTách trạng thái thanh toán khỏi status giao hàng. Sơ đồ thể hiện các đường ghi trong checkout/settle/retry/expirePending/changeStatus, không suy diễn hệ thống hoàn tiền. Nguồn: `server/src/services/vnpay.service.js:checkout`, `settle`, `retry`, `expirePending`, `changeStatus`; `server/src/models/paymentAttempt.model.js:1`.\n'+diagram('act-state-payment',PAY_STATE)
    text+='\n## Giả định và giới hạn\n\nVNPay Return/IPN có thể tới theo bất kỳ thứ tự nào; code không bảo đảm cả hai sẽ đến. Hủy phía provider là confirmation không thành công; bỏ browser không tự phát callback, worker sẽ hết hạn. Đồng hồ/server/DB, IPN merchant setup và kết quả settlement thật đều cần xác minh bằng môi trường kiểm thử riêng. Không chạy thử trong nhiệm vụ.\n'
    write('04-activity.md',text); progress('Giai đoạn 0–4 — 13 activity và 2 state machine','Giai đoạn 5, README và kiểm tra cuối')

FINDINGS=[]
def finding(level,title,refs,description,repro,impact,fix,certainty='Chắc chắn'):
    FINDINGS.append(dict(level=level,title=title,refs=refs,description=description,repro=repro,impact=impact,fix=fix,certainty=certainty))

finding('Critical','Callback MoMo tin tham số chưa xác minh chữ ký',
[('server/src/controllers/payments.controller.js','async checkPaymentMomo'),('server/src/routes/payments.route.js',"'/api/check-payment-momo'")],
'Endpoint GET công khai chỉ kiểm resultCode=0, lấy cartId từ orderInfo, tạo đơn và trừ kho/coupon. Không verify signature, amount, merchant hoặc quan hệ request đã tạo với callback. Đơn mới MOMO có paymentStatus mặc định unpaid nhưng changeStatus chỉ bắt buộc paid với VNPAY.',
'Trong môi trường test riêng, chuẩn bị giỏ có shipping và sản phẩm; gửi GET /api/check-payment-momo với resultCode=0, orderId mới và orderInfo có cartId ở token thứ ba mà không có chữ ký. Đối chiếu order/kho. Chưa thực thi request trong nhiệm vụ.',
'Có thể tạo đơn online chưa trả tiền, thay đổi kho/coupon và đi tiếp quy trình giao hàng MoMo.',
'Liên kết attempt/order đã tạo, verify callback HMAC và amount/merchant, dùng IPN đã xác minh + transaction/idempotency tương đương luồng VNPay.')
finding('High','Upload blog công khai và không giới hạn loại/kích thước file',
[('server/src/routes/blog.routes.js',"router.post('/upload-image'"),('server/src/routes/index.js','var upload = multer')],
'Blog upload thiếu authAdmin; cả hai cấu hình Multer không có fileFilter, limits hoặc kiểm magic bytes. Tên giữ đuôi file gốc. Blog upload dùng single nhưng sản phẩm array không maxCount.',
'Ở môi trường test, POST multipart /api/blog/upload-image không cookie với một file HTML vô hại; kiểm response URL và Content-Type khi truy cập. Không tải file lên trong nhiệm vụ.',
'Người không đăng nhập ghi file, có thể làm đầy disk hoặc host nội dung chủ động cùng origin; khả năng thực thi JS cần xác minh theo MIME/proxy thực tế.',
'Đặt authAdmin trước upload blog; whitelist ảnh qua MIME/extension/magic bytes, limits và tên random, phục vụ uploads bằng chính sách nội dung phù hợp.')
finding('High','Static middleware công khai cả source backend',
[('server/src/server.js','app.use(express.static')],
'express.static trỏ cả server/src thay vì chỉ uploads; các file routes/controllers/services/models trong src có thể được tải như static.',
'Trong môi trường test, GET /controllers/users.controller.js hoặc /services/vnpay.service.js qua backend trực tiếp. Nginx hiện không proxy các path này nên cần phân biệt đường truy cập backend.',
'Lộ logic backend và cấu trúc nội bộ nếu backend truy cập được; không kết luận .env ở server root bị phục vụ.',
'Chỉ mount /uploads tới thư mục uploads, không dùng src làm static root.')
finding('High','Response cập nhật hồ sơ trả cả password field',
[('server/src/controllers/users.controller.js','async updateUser('),('server/src/controllers/users.controller.js','async findAllUser('),('server/src/controllers/users.controller.js','async updateUserAdmin(')],
'updateUser, findAllUser và updateUserAdmin trả Mongoose document không projection; schema password không select:false. AuthUser riêng đã whitelist nhưng không áp dụng cho các response này.',
'Ở môi trường test, đăng nhập rồi POST update-user; chỉ kiểm sự hiện diện field password, không in giá trị. Admin GET users và đổi quyền cũng kiểm field tương tự.',
'Password hash bị truyền tới browser không cần thiết, làm tăng khả năng lộ khi response/log/client bị truy cập.',
'Dùng DTO whitelist hoặc projection loại password và các dữ liệu nhạy cảm trước response; không trả key/OTP.')
finding('High','Reset password chưa thu hồi phiên và proof có thể dùng lại',
[('server/src/controllers/users.controller.js','async resetPasswordAfterVerification'),('server/src/services/tokenSevices.js','const verifyToken')],
'Reset chỉ đổi password và clear proof cookie, không xóa apikey hoặc ghi trạng thái proof đã consume. Một bản proof hợp lệ còn giữ được có thể gửi lại đến khi hết 5m. JWT phiên cũ vẫn verify bằng cặp RSA cũ.',
'Trong test riêng, giữ phiên A, thực hiện reset bằng B, thử API auth của A; lưu proof trong test rồi thử dùng lại sau lần reset đầu. Không xuất token ra báo cáo.',
'Đổi mật khẩu chưa kết thúc phiên bị chiếm; proof còn hạn chưa được thu hồi phía server.',
'Thu hồi/rotate key khi reset và gắn proof với nonce/version có consume một lần; kiểm tra atomically khi đổi mật khẩu.')
finding('Medium','Access token và refresh token chưa phân biệt purpose',
[('server/src/services/tokenSevices.js','const createToken'),('server/src/services/tokenSevices.js','const createRefreshToken'),('server/src/services/tokenSevices.js','const verifyToken')],
'Hai loại JWT có cùng payload id và key RS256; verifyToken không kiểm token use/purpose. Middleware authUser có thể xác minh refresh JWT nếu nó được đặt vào cookie token.',
'Test đơn vị với khóa giả: tạo refresh JWT rồi gọi verifyToken/authUser qua cookie token; kiểm được chấp nhận dù thời hạn access dự kiến 15m.',
'Ranh giới access 15m và refresh 7d không được enforce qua token purpose.',
'Thêm purpose và verify riêng cho access/refresh; không tái sử dụng verifier thiếu purpose.')
finding('Medium','UI đánh giá khách hàng bị chặn bởi authAdmin',
[('server/src/routes/previewProduct.routes.js',"router.post('/api/create-preview-product'"),('client/src/Pages/InfoUser/OrderUser/OrderUser.jsx','requestCreatePreviewProduct(data)')],
'OrderUser cho khách gửi đánh giá, nhưng endpoint yêu cầu admin. Handler không kiểm order delivered/mua sản phẩm hoặc bound rating.',
'Khách thường đã đăng nhập gửi đánh giá ở đơn đủ điều kiện UI; API trả 401 Bạn không có quyền truy cập. Test admin có thể tạo mà không chứng minh đã mua.',
'Tính năng review khách hàng không hoạt động end-to-end; integrity rating còn thiếu.',
'Nếu cho khách review: authUser cộng kiểm ownership/đơn delivered/product và validate rating/content; xác định chính sách mỗi đơn/sản phẩm.')
finding('Medium','Sửa tên/thông số sản phẩm không khớp schema và form',
[('server/src/controllers/products.controller.js','async updateProduct'),('client/src/Pages/Admin/Components/ManagerProduct/ManagerProduct.jsx','name: record.name')],
'Form dùng nameProduct nhưng handleEdit gán name; controller update whitelist name/size không có trong schema và bỏ nameProduct/modelNumber/origin/movement cùng nhiều thông số.',
'Ở test UI, sửa nameProduct hoặc modelNumber rồi lưu, tải lại product để so; giá/stock có thể đổi nhưng các field bị bỏ không đổi.',
'Admin tưởng đã lưu thông tin nhưng dữ liệu giữ giá trị cũ.',
'Đồng bộ đúng field whitelist theo schema và form, giữ validate tối thiểu cho các field sửa.')
finding('Medium','Endpoint coupon legacy thiếu auth và dùng field tổng không tồn tại',
[('server/src/routes/coupon.routes.js',"router.get('/api/coupon'"),('server/src/controllers/coupon.controller.js','async getCoupons')],
'Route không có authUser nhưng handler destructure req.user.id; nếu bổ sung auth vẫn dùng findCart.totalCartBefore khác schema totalPrice. UI hiện lấy coupon qua get-cart nên không cần endpoint này để checkout.',
'GET /api/coupon theo registered route ở test sẽ đi vào req.user undefined; tiếp theo kiểm tên field với cart schema.',
'Endpoint lỗi 500, không cung cấp coupon hợp lệ như tên gọi.',
'Xác định loại bỏ legacy hoặc thêm authUser và tính tổng nhất quán từ giỏ; không vá UI gọi endpoint lỗi.')
finding('Medium','Async blog chưa được wrapper bắt rejection trên Express 4',
[('server/src/routes/blog.routes.js',"router.post('/create'"),('server/package.json','"express"')],
'Các blog controller async được truyền trực tiếp, không asyncHandler/try catch. Express đang khai báo 4.x nên rejected Promise không tự gọi next.',
'Trong test mock modelBlog.create/find reject; xác minh error middleware không được gọi. Không tạo lỗi DB thật.',
'Request có thể treo hoặc process gặp unhandled rejection tùy runtime.',
'Bọc các handler async bằng wrapper hiện có, forward error nhất quán.')
finding('Medium','NotFoundError được dùng nhưng chưa import/định nghĩa',
[('server/src/controllers/category.controller.js','new NotFoundError'),('server/src/controllers/blog.controller.js','new NotFoundError')],
'Xóa category không tồn tại và update blog không tồn tại gọi identifier không được khai báo trong module; error.response cũng chưa export NotFoundError.',
'Mock findByIdAndDelete/findById trả null và chạy handler trong test riêng; gặp ReferenceError thay lỗi không tồn tại.',
'Category trả 500 qua wrapper; blog có thêm vấn đề rejection chưa wrapper.',
'Dùng error class hiện có với status 404 rõ hoặc định nghĩa/import NotFoundError thống nhất.')
finding('Medium','Schema dùng require thay required và thiếu ràng buộc nghiệp vụ',
[('server/src/models/users.model.js','fullName:'),('server/src/models/cartUser.model.js','userId:'),('server/src/models/payments.model.js','userId:'),('server/src/models/blog.model.js','title:')],
'Nhiều field khai báo require:true, không phải validator required. products.price/stock và coupon.discount/quantity không min; review rating không bound. Một số update query không runValidators.',
'Tạo document trong test đơn vị với field thiếu/giá âm để kiểm schema validate; không ghi DB. So sánh options required với require.',
'Dữ liệu có thể thiếu/không hợp lệ nếu vượt qua validation controller hoặc đi qua update/import.',
'Sửa constraint đúng theo policy và validate ở controller/query; cần kiểm dữ liệu legacy trước enforce.')
finding('Medium','Ref model không nhất quán tên đăng ký',
[('server/src/models/payments.model.js',"ref: 'product'"),('server/src/models/previewProduct.model.js',"ref: 'users'"),('server/src/models/message.model.js',"ref: 'User'")],
'Model đăng ký user/products nhưng có refs users/User/product. Truy vấn tay hiện có không kích hoạt populate nên chưa kết luận toàn bộ request đang lỗi.',
'Kiểm schema.path(...).options.ref và các modelNames; test populate trên dữ liệu giả ở môi trường riêng nếu cần.',
'Populate có thể báo MissingSchemaError; quan hệ không được đảm bảo như ref mô tả.',
'Thống nhất ref với tên model đăng ký, giữ nguyên dữ liệu id và kiểm các consumer trước đổi.')
finding('Medium','Giỏ hàng đọc rồi ghi và thiếu unique userId',
[('server/src/controllers/cartUser.controller.js','async addToCart'),('server/src/models/cartUser.model.js','userId:')],
'Add/update giỏ thao tác findOne→save/create, chưa unique userId hoặc atomic update/transaction; request đồng thời có thể tạo hai cart hoặc mất cập nhật.',
'Trong test concurrency riêng, gửi hai add đồng thời cho user chưa có cart rồi đếm cart theo userId; lặp update cùng item. Chưa tái hiện runtime.',
'Giỏ bị trùng/mất quantity; findOne có thể chọn giỏ khác mong muốn.',
'Unique userId sau dọn legacy và mutation atomic hoặc transaction theo cart.',certainty='Cần xác minh')
finding('Medium','OTP window gửi theo email mất khi record bị xóa',
[('server/src/services/otp.service.js','async function issue'),('server/src/services/otp.service.js','findOneAndDelete'),('server/src/models/otp.model.js','expires: 600')],
'SendCount/sendWindowStartedAt nằm cùng record OTP TTL 10m và consume xóa record; giới hạn 5 lần/email/type/giờ không tồn tại đủ 1 giờ sau TTL/consume. Limiter IP vẫn còn nhưng nhiều IP có thể khác.',
'Test dùng clock/mock Otp: issue, xóa record mô phỏng TTL hoặc consume, issue lần tiếp theo và quan sát sendCount bắt đầu lại. Kiểm thêm concurrent issue vì không unique email/type.',
'Giới hạn email/giờ yếu hơn hằng số/policy thể hiện; có thể gây nhiều mail nếu đổi IP.',
'Tách counter gửi khỏi OTP có TTL, dùng atomic counter/unique email-type và window đủ 1h.')
finding('Medium','Thống kê dùng tên field khác schema và gộp tháng qua nhiều năm',
[('server/src/controllers/users.controller.js',"_id: '$loginType'"),('server/src/controllers/users.controller.js',"_id: '$product'"),('server/src/controllers/users.controller.js',"_id: { $month: '$createdAt' }")],
'User schema là typeLogin nhưng aggregate loginType; review schema productId nhưng group product, lookup/project còn name thay nameProduct. Revenue byMonth chỉ month không year.',
'Test dữ liệu giả có hai typeLogin, review nhiều sản phẩm và delivered orders cùng tháng khác năm; so output facets với kỳ vọng.',
'Dashboard trả nhóm null, top review rỗng/sai và revenue gộp khác năm.',
'Đồng bộ field schema, group year-month hoặc filter kỳ thống kê rõ.')
finding('Medium','Chi tiết sản phẩm dùng danh sách review giới hạn 10 toàn hệ thống',
[('client/src/Pages/DetailProduct/DetailProduct.jsx',"useFetch('/api/get-preview-product-home')"),('server/src/controllers/previewProduct.controller.js','find({}).limit(10)')],
'DetailProduct hiển thị reviewsData từ endpoint home rồi filter productId, trong khi get-product-by-id cũng đã trả previewProduct đầy đủ. Một sản phẩm có review ngoài 10 record đầu không hiển thị.',
'Test mock home API có 10 review của sản phẩm khác, detail API có review của sản phẩm hiện tại; mở detail và so review render.',
'Người dùng thấy thiếu đánh giá hoặc tưởng sản phẩm chưa được đánh giá.',
'Dùng review theo productId từ detail hoặc endpoint phân trang riêng; không dùng home sampling cho chi tiết.')
finding('Medium','Đọc chi tiết/list sản phẩm dễ truy cập null khi quan hệ mất',
[('server/src/controllers/products.controller.js','category: product.category'),('server/src/controllers/products.controller.js','category: category.name'),('server/src/controllers/previewProduct.controller.js','name: product.name')],
'getProductById dùng product.category trước kiểm product null; getAllProduct dùng category.name không kiểm category; review home dùng user/product không kiểm null và product.name khác nameProduct.',
'Test mock product/category/user trả null hoặc id không tồn tại, kiểm handler response; không xóa dữ liệu thật.',
'Một bản ghi mồ côi có thể làm cả danh sách hoặc trang chi tiết lỗi 500.',
'Xử lý 404/fallback từng quan hệ, thống nhất field và integrity khi xóa.')
finding('Medium','Xóa category/products chưa bảo toàn các quan hệ và file',
[('server/src/controllers/category.controller.js','async deleteCategory'),('server/src/controllers/products.controller.js','async deleteProduct')],
'Xóa category rồi products bằng hai thao tác không transaction; không cleanup review/cart/upload. getCart có tự dọn item mất nhưng không phải mọi consumer có fallback.',
'Test mock deleteMany reject sau category delete; kiểm trạng thái từng bước. Test các consumer với product/category đã mất bằng fixture riêng.',
'Dữ liệu mồ côi và lỗi danh sách; file rác; đơn mới giữ snapshot nên ít phụ thuộc hơn.',
'Thiết kế soft delete hoặc transaction/cơ chế bù và cleanup quan hệ có kiểm soát; không xóa snapshot đơn.')
finding('Medium','Legacy search nhận regex trực tiếp và không phân trang',
[('server/src/controllers/products.controller.js','async searchProduct')],
'Header dùng /api/search; controller gán valueSearch vào $regex không escape, không giới hạn độ dài/limit. Service catalog-browse mới đã escape và phân trang nhưng không thay endpoint này.',
'Trong test mock query, gửi ký tự regex và chuỗi dài; kiểm filter được truyền và số kết quả. Không thử payload làm quá tải trên hệ thống thật.',
'Kết quả khác tìm văn bản thường; nguy cơ tiêu thụ CPU/response lớn tùy dữ liệu.',
'Validate scalar/độ dài, escape regex, limit hoặc chuyển consumer sang browse có phân trang.')
finding('Medium','Refresh queue của axios request.jsx có thể không resolve request đầu',
[('client/src/config/request.jsx','failedRequestsQueue.forEach'),('client/src/config/request.jsx','failedRequestsQueue.push')],
'Request đầu gặp 401 await refresh rồi flush queue trước khi chính request đó được push vào queue; sau đó Promise có thể chờ vô hạn. Chỉ áp dụng instance request; ApiClient có implementation khác.',
'Test axios adapter giả trả 401 rồi refresh 200, chờ requestLogin/requestCreateCart đi qua request interceptor; kiểm Promise chưa settle. Cần test mock để xác nhận runtime.',
'Một số call có thể treo sau access hết hạn dù refresh thành công.',
'Retry request đầu trực tiếp sau refresh và chỉ queue request chờ; thống nhất interceptor sau khi xác định phạm vi.',certainty='Cần xác minh')
finding('Medium','Nginx chưa proxy đường Socket.IO',
[('nginx/default.conf','location /api/'),('client/src/store/Provider.jsx','const socket = io')],
'Nginx chỉ proxy /api và /uploads; đường /socket.io rơi vào SPA try_files. Vite dev đã proxy ws. Khi frontend/socket dùng origin Nginx thì realtime không tới backend.',
'Kiểm cấu hình build API_BASE_URL; nếu same-origin Nginx, thử handshake /socket.io trong môi trường test và xem response HTML. Không khởi động nginx trong nhiệm vụ.',
'Chat HTTP vẫn có thể lưu tin nhưng realtime lỗi trên mô hình deploy qua Nginx.',
'Bổ sung proxy Socket.IO với websocket upgrade/polling phù hợp hoặc cấu hình backend origin có thể truy cập.',certainty='Cần xác minh')
finding('Medium','Dockerfile client build trước khi copy source',
[('client/Dockerfile','RUN npm run build'),('client/Dockerfile','COPY . .')],
'Build stage mới chỉ copy package manifests rồi chạy vite build; index.html/src được copy sau. Compose hiện không build service client nên lỗi này nằm ở đường docker build client riêng.',
'Rà thứ tự Dockerfile; trên môi trường riêng chạy docker build client sẽ thiếu entry source ở bước build. Không build/cài dependency trong nhiệm vụ.',
'Đường dựng client image không hoạt động theo Dockerfile hiện có.',
'COPY source trước RUN npm run build; giữ cache npm install bằng layer manifests.')
finding('Medium','Chat lỗi khi chưa có lịch sử/admin và mark read quá rộng',
[('server/src/controllers/message.controller.js','const convId = getConversationId(id, data.receiverId)'),('server/src/controllers/message.controller.js','receiverId: findAdmin.id'),('server/src/controllers/message.controller.js','{ conversationId: convId, isRead: false }')],
'getMessageUser đọc data.receiverId khi findOne null; createMessage đọc findAdmin.id khi không có admin; readMessage update cả hai chiều conversation thay vì chỉ tin gửi tới id hiện tại.',
'Test mock user chưa từng gửi hoặc không có admin; test conversation hai chiều unread và gọi readMessage một phía.',
'Chat mới có thể lỗi 500 và trạng thái đã đọc không đúng chiều nhận.',
'Trả lịch sử rỗng/fallback admin rõ; lọc receiverId=id khi đánh dấu đã đọc.')
finding('Medium','Goong API key được hardcode trong frontend',
[('client/src/Pages/CheckOut/CheckOut.jsx','api_key:')],
'onAddressSearch chứa literal API key trong code browser. Không chép giá trị vào tài liệu; không xác minh key còn hoạt động hoặc restriction.',
'Rà source/bundle và Network khi gợi ý địa chỉ trong môi trường test; chỉ xác nhận có literal và nơi sử dụng, không xuất giá trị.',
'Key có thể được người xem bundle sử dụng; mức ảnh hưởng phụ thuộc restriction/quota của Goong.',
'Chuyển cấu hình ra source, giới hạn domain/quota; nếu key cần giữ kín thì gọi qua backend. Cần kiểm restriction và rotate khi cần.')

def env_names(path):
    if not (ROOT/path).exists(): return []
    return sorted(set(re.findall(r'^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=',read(path),re.M)))

def stage5():
    text='''# 05 — Truy vết, khoảng trống và tự kiểm tra

## Phương pháp và giới hạn

Các kết luận “Chắc chắn” là xác minh bằng code, không phải đã khai thác/tái hiện trên hệ thống đang chạy. Tất cả cách tái hiện dưới đây là kịch bản đề xuất cho môi trường test riêng. Không gửi thanh toán/mail, không chạy server hoặc thao tác MongoDB. “Cần xác minh” chỉ rõ điều kiện runtime hoặc deployment còn thiếu.

## Ma trận truy vết theo từng endpoint

Mỗi endpoint xuất hiện một dòng theo method/path duy nhất. `models` ghi theo UC bao phủ, không khẳng định mọi nhánh endpoint đều truy cập hết tất cả model trong dòng. Các trang UI gọi gián tiếp qua Provider/hook đã được ghi ở 00. Return/IPN là kênh hệ thống ngoài, không phải API button client.

'''
    rows=[]
    for r in R:
        us=[u for u in U if r['path'] in u['paths']]
        acts=[a[0] for a in ACTS if any(int(u['id'][3:]) in a[2] for u in us)]
        rows.append([r['method']+' '+r['path'],', '.join(u['id'] for u in us),r['handler'],', '.join(dict.fromkeys(x for u in us for x in u['models'])), '; '.join(dict.fromkeys(u['page'] for u in us)),', '.join('seq-'+u['id'][3:] for u in us),', '.join(acts) or 'Sequence bao phủ',f"{r['source']}:{r['line']}; {r['controller']}"])
    text+=table(['Endpoint','UC','Controller/handler','Models theo UC','Client / bên khởi phát','Sequence','Activity','Nguồn'],rows)
    text+='\n## Ma trận UC → UI / sequence / activity\n\n'
    text+=table(['UC','Tên','API hoặc lý do không có','Client','Sequence','Activity','Nguồn'],[[u['id'],u['name'],', '.join(u['paths']) or 'Trang Contact tĩnh, không cần backend API',u['page'],'seq-'+u['id'][3:]+'.puml',', '.join(a[0]+'.puml' for a in ACTS if int(u['id'][3:]) in a[2]) or 'Có sequence riêng',sources(u)] for u in U])
    unmatched=[r for r in R if not any(r['path'] in u['paths'] for u in U)]
    text+='\n## Khoảng trống và code chưa nối hoàn chỉnh\n\n'
    text+=f'- Route chưa được phân loại UC: **{len(unmatched)}**. Endpoint có handler lỗi vẫn được gắn UC mô tả as-is và có Phát hiện, không được tính là hoạt động đúng. GET /api/users đăng ký lặp tại routes/index.js nhưng chỉ tính một endpoint.\n'
    text+='- Model thiếu class: **0**; 13 model và 13 sơ đồ class-model tương ứng. Không có model Order riêng; payments là đơn, paymentAttempts là lần thanh toán.\n'
    text+='''
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
'''
    text+='\n### Wrapper API không có consumer ngoài request.jsx\n\n'
    unused=[f for f in F if not f['users']]
    text+=table(['Wrapper','Endpoint','Lưu ý'],[[f['name'],f['method']+' '+f['path'],'Không đồng nghĩa endpoint chết; có thể được gọi bằng useFetch/hook trực tiếp hoặc bên ngoài'] for f in unused])
    text+='\n## Cấu hình môi trường (chỉ tên biến)\n\nKhông chép giá trị, URL thực, token, password hoặc key. Kiểm kê tên khai báo không chứng nhận giá trị hợp lệ hay biến đã được provider cấp quyền.\n\n'
    sn=env_names('server/.env'); cn=env_names('client/.env')
    text+=table(['File','Tên biến đọc được'],[['server/.env',', '.join(sn) or 'Không có/không đọc được file'],['client/.env',', '.join(cn) or 'Không có/không đọc được file']])
    envuse={}
    for base in ['server/src','client/src']:
        for p in (ROOT/base).rglob('*'):
            if p.suffix not in ['.js','.jsx']: continue
            rel=p.relative_to(ROOT).as_posix(); s=read(rel)
            for name in set(re.findall(r'(?:process\.env|import\.meta\.env)\.([A-Z][A-Z_0-9]*)',s)):
                envuse.setdefault(name,[]).append(rel)
    text+='\n'+table(['Biến được tham chiếu trực tiếp','Nơi dùng','Có tên trong .env kiểm kê'],[[name,'; '.join(paths),'server' if name in sn else ('client' if name in cn else 'Không thấy; có thể được cấp từ môi trường chạy/default')] for name,paths in sorted(envuse.items())])
    text+='''
Các config gián tiếp còn có: `VNPAY_TMN_CODE`, `VNPAY_SECRET_KEY`, `VNPAY_URL`, `VNPAY_RETURN_URL`, `DOMAIN_URL`, `VNPAY_ENV` trong vnpay.service.config; mail.service yêu cầu `GOOGLE_CLIENT`, `GOOGLE_SECRET`, `REDIRECT_URI`, `REFRESH_TOKEN`, `USER_EMAIL`; MoMo cần các biến `MOMO_*` liệt kê trong payments.controller.createPayment. CORS đọc `CLIENT_ORIGINS` qua đối tượng env, runtime có `NODE_ENV`/`TRUST_PROXY`; Vite có `VITE_TUNNEL_HOST` và `VITE_API_MODE`. Nguồn: các hàm/file nêu trên và `client/vite.config.js:1`, `server/src/config/cors.js:1`.

Compose hiện có `env_file: ./server/.env`, không phải bắt buộc chép thủ công mọi biến vào environment; chỉ ghi đè CONNECT_DB và TRUST_PROXY. `.gitignore` loại .env/.env.*. Không suy ra lịch sử Git chưa từng chứa secret từ .gitignore; cần kiểm history bằng quy trình không xuất secret nếu muốn audit lịch sử. Nguồn: `docker-compose.yaml:1`, `.gitignore:1`.

## Chênh lệch SETUP_GUIDE và code

'''
    text+=table(['Hướng dẫn','Code as-is / kết luận','Nguồn'],[
        ['Yêu cầu SECRET_CRYPTO khớp VITE_SECRET_CRYPTO và coi bắt buộc','Không có tham chiếu hai biến trong src hiện tại; JWT dùng RSA apikey. Hướng dẫn này đã cũ cho snapshot đang xét.','SETUP_GUIDE.md:58; SETUP_GUIDE.md:110; SETUP_GUIDE.md:323; server/src/services/tokenSevices.js:1'],
        ['EMAIL_USER được khai báo cùng USER_EMAIL','Shared mailService dùng USER_EMAIL; EMAIL_USER chỉ ở utility legacy được gọi trong code sau return. Phần Email OTP đầu guide đã mô tả đúng mailService mới nhưng mẫu env còn dư.','SETUP_GUIDE.md:5; SETUP_GUIDE.md:76; server/src/services/mail.service.js:createMailService; server/src/utils/SendMail/sendMailForgotPassword.js:1'],
        ['MongoDB local cơ bản','Checkout COD/VNPAY yêu cầu replica set transaction; compose hiện đã có replSet/healthcheck; không thể dùng standalone như một thay thế tương đương.','SETUP_GUIDE.md:247; server/src/services/vnpay.service.js:transaction; docker-compose.yaml:1'],
        ['Ví dụ Return localhost','Được dùng cho dev nếu cấu hình đúng origin/proxy; production config từ chối localhost và non-HTTPS. Không coi mọi localhost dev là bug.','SETUP_GUIDE.md:90; server/src/services/vnpay.service.js:config'],
        ['Atlas allow all IP','Guide có chỉ dẫn 0.0.0.0/0; chưa biết project thực tế có áp dụng trong Atlas hay không. Ghi nhận rủi ro hướng dẫn, không kết luận deployment đang mở.','SETUP_GUIDE.md:263'],
        ['URL API/image và chạy dev','runtimeUrls mặc định dev proxy nên VITE_URL_API/VITE_URL_IMAGE_API chỉ áp dụng configured mode; guide cần mô tả VITE_API_MODE, proxy/socket/tunnel.','SETUP_GUIDE.md:104; client/src/config/apiBaseUrl.js:resolveApiBaseUrl; client/vite.config.js:1'],
        ['Google popup/Gmail consent','Guide đầu đã cập nhật popup không cần redirect localhost; cấu hình Console và trạng thái Gmail consent không thể xác nhận chỉ bằng repo.','SETUP_GUIDE.md:3; SETUP_GUIDE.md:237; server/src/controllers/users.controller.js:loginGoogle']])
    text+='\n## Phát hiện\n\nCác mục sau chỉ ghi nhận, không có sửa code. Critical/High ưu tiên tài chính và bảo mật; không coi lỗi UI/style đơn thuần là trọng tâm.\n'
    for i,f in enumerate(FINDINGS,1):
        text+=f'''\n### F-{i:02} [MỨC ĐỘ: {f['level']}] {f['title']}

- **Vị trí:** {'; '.join(cite(p,n) for p,n in f['refs'])}.
- **Mô tả:** {f['description']}
- **Cách tái hiện:** {f['repro']}
- **Tác động:** {f['impact']}
- **Đề xuất sửa:** {f['fix']}
- **Độ chắc chắn:** {f['certainty']} (phân tích tĩnh; chưa chạy khai thác).
'''
    text+='\n### Tổng hợp mức độ phát hiện\n\n'+table(['Mức độ','Số lượng'],[[level,sum(f['level']==level for f in FINDINGS)] for level in ['Critical','High','Medium','Low']])
    text+='''
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

'''
    text+=table(['Tiêu chí','Kết quả','Bằng chứng'],[
        ['(a) 100% route có UC hoặc lý do','Đạt nếu verify_design pass',f'{len(R)} endpoint, ma trận từng route ở trên; /api/coupon được ghi lỗi legacy trong UC-18'],
        ['(b) 100% model có class','Đạt nếu verify_design pass',f'{len(M)} model, class-model-* và từ điển 02'],
        ['(c) Mọi UC chính có sequence/activity','Đạt nếu verify_design pass',f'{len(U)} UC có {len(U)} sequence; {len(ACTS)} activity cho hành trình chính'],
        ['(d) Actor/UC nhất quán','Đạt qua nguồn dữ liệu chung và đối chiếu','Mã/tên lấy từ use-cases.json; sequence dùng actor chính, overview actor kế thừa'],
        ['(e) Cú pháp UML','Chưa kiểm tra cú pháp bằng công cụ','Không tìm thấy Java/dot/PlantUML trong PATH; chỉ kiểm @startuml/@enduml, block cơ bản và bản nhúng đồng nhất'],
        ['(f) Không secret trong docs','Kiểm tĩnh bằng verify_design','So literal của biến nhạy cảm .env và key inline đã nhận diện với tài liệu; không in literal'],
        ['(g) Khẳng định có nguồn','Đối chiếu tĩnh + rà nội dung','Từng UC có route/handler/UI, mọi schema có source; verify file/line tồn tại. Ngữ nghĩa và thiếu sót runtime ghi rõ Cần xác minh']])
    text+='''
Không chạy `npm test` backend hoặc các test frontend khởi động Vite vì user cấm chạy server/MongoDB. Suite hiện có integration mở HTTP/DB khi được cấu hình, nên không dùng kết quả skip để tuyên bố runtime pass. Ví dụ: `server/test/vnpay.test.js:1`, `server/test/product-catalog.test.cjs:1`, `client/test/vite-cors.test.mjs:1`. Lint nếu chạy chỉ báo baseline, không sửa hoặc --fix. Kết quả kiểm tra tài liệu và lint thực tế nằm trong README/validation.json.
'''
    text=text.replace('Đạt nếu verify_design pass','Đạt — kiểm tĩnh đã pass').replace('Kiểm tĩnh bằng verify_design','Đạt — kiểm tĩnh đã pass')
    write('05-truy-vet-va-khoang-trong.md',text)
    write('findings.json',json.dumps([{k:v for k,v in f.items() if k!='refs'} | {'sources':[f'{p}:{line(p,n)}' for p,n in f['refs']]} for f in FINDINGS],ensure_ascii=False,indent=2))
    progress('Giai đoạn 0–5 đã soạn, gồm truy vết và phát hiện','Kiểm tra cuối tài liệu, rà secret, README, commit và báo kết quả thật')

def stage_readme():
    validation=json.loads(read('docs/design/validation.json')); counts=validation['counts']
    text='''# ECOMMOR — Phân tích thiết kế hệ thống as-is

Snapshot ngày **21/10/2026**, tiếng Việt; thuật ngữ, field, route và tên hàm giữ nguyên theo source. Làm trên nhánh `docs/system-design` tạo từ HEAD khi bắt đầu. Working tree có thay đổi có trước nhiệm vụ; sau thông báo, người dùng yêu cầu tiếp tục. Tài liệu phản ánh working tree đó, không phải chỉ code đã commit. Mọi commit của nhiệm vụ chỉ chứa `docs/design/`; không push.

## Mục lục

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

'''
    text+=table(['Hạng mục','Số lượng'],[[k,v] for k,v in [('Backend endpoint duy nhất',counts['routes']),('Hàm trong request.jsx',counts['requests']),('Mongoose models',counts['models']),('Use case',counts['use_cases']),('Use case diagrams',9),('Class/component diagrams',22),('Sequence',counts['sequences']),('Activity swimlane',counts['activities']),('State machine',counts['state_machines']),('Tổng .puml',counts['diagrams']),('Phát hiện',len(FINDINGS))]])
    text+='''
Các sơ đồ tách theo module; mỗi `.puml` được nhúng nguyên văn đúng một lần vào tài liệu Markdown tương ứng. Class/component gồm 13 sơ đồ model, 2 quan hệ, 3 backend, 3 client và 1 kiến trúc. Diagram state machine đặt dưới tiền tố act-state để giữ hệ quy ước tên được yêu cầu.

## Xem và render PlantUML

**Chưa kiểm tra cú pháp bằng công cụ; chưa có SVG/PNG.** `java`, `dot`, `plantuml` không có trong PATH. Thư mục Java jdk-21 được tìm thấy chỉ có lib, không có bin/java.exe tại vị trí đã kiểm; không tìm thấy PlantUML JAR trong workspace hoặc VS Code extensions. Đã kiểm `@startuml/@enduml`, cân bằng các block sequence cơ bản, alias khai báo và sự khớp bản nhúng; các kiểm tra này không thay thế PlantUML compiler. Không coi không render là “pass cú pháp”.

Hai cách render khi có công cụ:

1. Mở thư mục bằng VS Code, dùng tiện ích PlantUML để preview/export các file trong `uml/` sang `images/`; chọn môi trường local có Java/Graphviz hoặc PlantUML server mà bạn cấu hình.
2. Với Java, Graphviz và PlantUML JAR đã có trên máy, chạy từ repository root (thay giá trị biến bằng đường dẫn của máy):

```powershell
$PlantUmlJar = 'C:\\tools\\plantuml.jar'
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

'''
    text+=table(['Tiêu chí','Kết quả'],[
        ['71/71 backend endpoint có UC hoặc lý do','Đạt'],
        ['60/60 request wrapper có endpoint backend','Đạt'],
        ['13/13 model có class và từ điển','Đạt'],
        ['41/41 UC có sequence','Đạt'],
        ['87/87 nguồn UML khớp bản nhúng Markdown','Đạt'],
        ['Nguồn file/dòng và mã/tên/actor UC','Đạt kiểm tĩnh; không chứng nhận ngữ nghĩa runtime'],
        ['Không có literal secret được nhận diện trong bộ tài liệu','Đạt kiểm tĩnh; chỉ tên biến/field'],
        ['PlantUML compiler / render ảnh','Chưa kiểm tra cú pháp bằng công cụ'],
        ['Frontend npm run lint','PASS, exit 0; không --fix'],
        ['Runtime integration/server/DB','Không chạy theo giới hạn nhiệm vụ']])
    text+='''
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
'''
    write('README.md',text)

def run(stage):
    {'1':stage1,'2':stage2,'3':stage3,'4':stage4,'5':stage5}[stage]()
