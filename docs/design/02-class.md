# 02 — Mô hình dữ liệu và cấu trúc module

## Quy ước

Các class `<<Model>>` là schema Mongoose, không phải service domain được suy diễn. Thuộc tính là tên thực tế; `require: true` được chép nguyên và **không tương đương** `required: true`. Không thêm required, min/max, index hay khóa ngoại không có. Mongoose mặc định tạo `_id` và `__v`; timestamps=true thêm createdAt/updatedAt; Message chỉ có createdAt khai báo và timestamps=false. Nguồn: từng file schema bên dưới. Collection vật lý cần xác minh, không truy cập MongoDB.

## Từ điển dữ liệu và sơ đồ cho mọi schema


### Model `apikey`

Nguồn: `server/src/models/apiKey.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| userId | String | type: String, required: true, unique: true, index: true, ref: 'user' |
| publicKey | String | type: String, required: true |
| privateKey | String | type: String, required: true |

Options: timestamps=true. Index trong field xem cột options; index compound: không khai báo thêm. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-apikey.puml](uml/class-model-apikey.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "apikey" as M_apikey <<Model>> {
  userId : String {required=true; unique=true; index=true; ref='user'}
  publicKey : String {required=true}
  privateKey : String {required=true}
  _id : ObjectId
  __v : Number
  createdAt : Date
  updatedAt : Date
}
@enduml
```

### Model `blog`

Nguồn: `server/src/models/blog.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| title | String | type: String, require: true |
| content | String | type: String, require: true |
| image | String | type: String, require: true |

Options: timestamps=true. Index trong field xem cột options; index compound: không khai báo thêm. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-blog.puml](uml/class-model-blog.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "blog" as M_blog <<Model>> {
  title : String {require=true}
  content : String {require=true}
  image : String {require=true}
  _id : ObjectId
  __v : Number
  createdAt : Date
  updatedAt : Date
}
@enduml
```

### Model `brand`

Nguồn: `server/src/models/brand.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| name | String | type: String, required: true, trim: true |
| key | String | type: String, required: true, unique: true |

Options: timestamps=true. Index trong field xem cột options; index compound: không khai báo thêm. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-brand.puml](uml/class-model-brand.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "brand" as M_brand <<Model>> {
  name : String {required=true; trim=true}
  key : String {required=true; unique=true}
  _id : ObjectId
  __v : Number
  createdAt : Date
  updatedAt : Date
}
@enduml
```

### Model `cartUser`

Nguồn: `server/src/models/cartUser.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| userId | String | type: String, require: true, ref: 'user' |
| product | Array<subdocument> | Nhúng; _id tự sinh theo mặc định Mongoose |
| product[].productId | Schema.Types.ObjectId | type: Schema.Types.ObjectId, ref: 'product' |
| product[].quantity | Number | type: Number, require: true |
| fullName | String | type: String, require: true |
| phone | String | type: String, require: true |
| address | String | type: String, require: true |
| note | String | type: String, require: true |
| totalPrice | Number | type: Number, require: true |
| nameCoupon | String | type: String, require: true |

Options: timestamps=true. Index trong field xem cột options; index compound: không khai báo thêm. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-cartuser.puml](uml/class-model-cartuser.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "cartUser" as M_cartUser <<Model>> {
  userId : String {require=true; ref='user'}
  product : Array<subdocument>
  product[].productId : Schema.Types.ObjectId {ref='product'}
  product[].quantity : Number {require=true}
  fullName : String {require=true}
  phone : String {require=true}
  address : String {require=true}
  note : String {require=true}
  totalPrice : Number {require=true}
  nameCoupon : String {require=true}
  _id : ObjectId
  __v : Number
  createdAt : Date
  updatedAt : Date
}
@enduml
```

### Model `category`

Nguồn: `server/src/models/category.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| name | String | type: String, require: true |

Options: timestamps=true. Index trong field xem cột options; index compound: không khai báo thêm. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-category.puml](uml/class-model-category.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "category" as M_category <<Model>> {
  name : String {require=true}
  _id : ObjectId
  __v : Number
  createdAt : Date
  updatedAt : Date
}
@enduml
```

### Model `coupon`

Nguồn: `server/src/models/coupon.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| nameCoupon | String | type: String, required: true |
| discount | Number | type: Number, required: true |
| quantity | Number | type: Number, required: true |
| startDate | Date | type: Date, required: true |
| endDate | Date | type: Date, required: true |
| minPrice | Number | type: Number, required: true |

Options: timestamps=true. Index trong field xem cột options; index compound: không khai báo thêm. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-coupon.puml](uml/class-model-coupon.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "coupon" as M_coupon <<Model>> {
  nameCoupon : String {required=true}
  discount : Number {required=true}
  quantity : Number {required=true}
  startDate : Date {required=true}
  endDate : Date {required=true}
  minPrice : Number {required=true}
  _id : ObjectId
  __v : Number
  createdAt : Date
  updatedAt : Date
}
@enduml
```

### Model `Message`

Nguồn: `server/src/models/message.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| senderId | mongoose.Schema.Types.ObjectId | type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, |
| receiverId | mongoose.Schema.Types.ObjectId | type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, |
| conversationId | String | type: String, required: true, index: true, |
| text | String | type: String, required: true, |
| isRead | Boolean | type: Boolean, default: false, |
| createdAt | Date | type: Date, default: Date.now, index: true, |

Options: timestamps=false. Index trong field xem cột options; index compound: không khai báo thêm. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-message.puml](uml/class-model-message.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "Message" as M_Message <<Model>> {
  senderId : mongoose.Schema.Types.ObjectId {required=true; ref='User'}
  receiverId : mongoose.Schema.Types.ObjectId {required=true; ref='User'}
  conversationId : String {required=true; index=true}
  text : String {required=true}
  isRead : Boolean {default=false}
  createdAt : Date {default=Date.now; index=true}
  _id : ObjectId
  __v : Number
}
@enduml
```

### Model `otp`

Nguồn: `server/src/models/otp.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| email | String | type: String, required: true, trim: true, lowercase: true, ref: 'user' |
| otp | String | type: String, required: true |
| time | Date | type: Date, default: Date.now, index: { expires: 600 } |
| type | String | type: String, enum: ['forgotPassword', 'verifyAccount'], required: true |
| attempts | Number | type: Number, default: 0, min: 0 |
| resendAvailableAt | Date | type: Date |
| sendWindowStartedAt | Date | type: Date |
| sendCount | Number | type: Number, default: 0, min: 0 |
| registration | Object nhúng | Không phải ref |
| registration.fullName | String | type: String |
| registration.passwordHash | String | type: String |
| registration.phone | String | type: String |
| registration.address | String | type: String |

Options: timestamps=true. Index trong field xem cột options; index compound: không khai báo thêm. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-otp.puml](uml/class-model-otp.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "otp" as M_otp <<Model>> {
  email : String {required=true; trim=true; lowercase=true; ref='user'}
  otp : String {required=true}
  time : Date {default=Date.now; index={ expires: 600 }}
  type : M_otp_Enum3 {required=true}
  attempts : Number {default=0; min=0}
  resendAvailableAt : Date
  sendWindowStartedAt : Date
  sendCount : Number {default=0; min=0}
  registration : Object nhúng
  registration.fullName : String
  registration.passwordHash : String
  registration.phone : String
  registration.address : String
  _id : ObjectId
  __v : Number
  createdAt : Date
  updatedAt : Date
}
enum "Enum3" as M_otp_Enum3 <<enumeration>> {
  forgotPassword
  verifyAccount
}
M_otp --> M_otp_Enum3
@enduml
```

### Model `paymentAttempts`

Nguồn: `server/src/models/paymentAttempt.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| orderId | mongoose.Schema.Types.ObjectId | type: mongoose.Schema.Types.ObjectId, ref: 'payments', required: true |
| transactionRef | String | type: String, required: true, unique: true |
| amount | Number | type: Number, required: true, min: 1 |
| status | String | type: String, enum: ['pending', 'paid', 'failed', 'expired', 'cancelled', 'refund_required'], default: 'pending' |
| expiresAt | Date | type: Date, required: true |
| paymentUrl | String | type: String, required: true, select: false |
| createDate | String | type: String, required: true |
| transactionNo | String | Không khai báo constraint riêng |
| bankCode | String | Không khai báo constraint riêng |
| responseCode | String | Không khai báo constraint riêng |
| transactionStatus | String | Không khai báo constraint riêng |
| payDate | String | Không khai báo constraint riêng |
| receivedAt | Date | Không khai báo constraint riêng |
| reconciledAt | Date | Không khai báo constraint riêng |
| nextQueryAt | Date | Không khai báo constraint riêng |
| confirmationSource | String | type: String, enum: ['ipn', 'querydr'] |

Options: timestamps=true. Index trong field xem cột options; index compound: không khai báo thêm. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-paymentattempts.puml](uml/class-model-paymentattempts.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "paymentAttempts" as M_paymentAttempts <<Model>> {
  orderId : mongoose.Schema.Types.ObjectId {required=true; ref='payments'}
  transactionRef : String {required=true; unique=true}
  amount : Number {required=true; min=1}
  status : M_paymentAttempts_Enum3 {default='pending'}
  expiresAt : Date {required=true}
  paymentUrl : String {required=true; select=false}
  createDate : String {required=true}
  transactionNo : String
  bankCode : String
  responseCode : String
  transactionStatus : String
  payDate : String
  receivedAt : Date
  reconciledAt : Date
  nextQueryAt : Date
  confirmationSource : M_paymentAttempts_Enum15
  _id : ObjectId
  __v : Number
  createdAt : Date
  updatedAt : Date
}
enum "Enum3" as M_paymentAttempts_Enum3 <<enumeration>> {
  pending
  paid
  failed
  expired
  cancelled
  refund_required
}
M_paymentAttempts --> M_paymentAttempts_Enum3
enum "Enum15" as M_paymentAttempts_Enum15 <<enumeration>> {
  ipn
  querydr
}
M_paymentAttempts --> M_paymentAttempts_Enum15
@enduml
```

### Model `payments`

Nguồn: `server/src/models/payments.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| userId | Schema.Types.ObjectId | type: Schema.Types.ObjectId, ref: 'users', require: true |
| product | Array<subdocument> | Nhúng; _id tự sinh theo mặc định Mongoose |
| product[].productId | Schema.Types.ObjectId | type: Schema.Types.ObjectId, ref: 'product' |
| product[].quantity | Number | type: Number, require: true |
| product[].unitPrice | Number | type: Number, min: 0 |
| product[].nameProduct | String | Không khai báo constraint riêng |
| product[].images | String | Không khai báo constraint riêng |
| fullName | String | type: String, require: true |
| phone | String | type: String, require: true |
| address | String | type: String, require: true |
| note | String | type: String, require: true |
| status | String | type: String, require: true, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] |
| totalPrice | Number | type: Number, require: true |
| paymentMethod | String | type: String, require: true, enum: ['COD', 'VNPAY', 'MOMO'] |
| transactionRef | String | type: String, unique: true, sparse: true |
| checkoutKey | String | type: String, unique: true, sparse: true |
| paymentStatus | String | type: String, enum: ['unpaid', 'pending', 'paid', 'failed', 'expired', 'refund_required'], default: 'unpaid' |
| inventoryReserved | Boolean | Không khai báo constraint riêng |
| couponReserved | Boolean | Không khai báo constraint riêng |
| expiresAt | Date | Không khai báo constraint riêng |
| subtotal | Number | Không khai báo constraint riêng |
| couponDiscount | Number | Không khai báo constraint riêng |
| shippingFee | Number | type: Number, default: 0 |
| nameCoupon | String | type: String, require: true |

Options: timestamps=true. Index trong field xem cột options; index compound: modelPayments.index({ paymentMethod: 1, paymentStatus: 1, expiresAt: 1 });. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-payments.puml](uml/class-model-payments.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "payments" as M_payments <<Model>> {
  userId : Schema.Types.ObjectId {require=true; ref='users'}
  product : Array<subdocument>
  product[].productId : Schema.Types.ObjectId {ref='product'}
  product[].quantity : Number {require=true}
  product[].unitPrice : Number {min=0}
  product[].nameProduct : String
  product[].images : String
  fullName : String {require=true}
  phone : String {require=true}
  address : String {require=true}
  note : String {require=true}
  status : M_payments_Enum11 {require=true}
  totalPrice : Number {require=true}
  paymentMethod : M_payments_Enum13 {require=true}
  transactionRef : String {unique=true; sparse=true}
  checkoutKey : String {unique=true; sparse=true}
  paymentStatus : M_payments_Enum16 {default='unpaid'}
  inventoryReserved : Boolean
  couponReserved : Boolean
  expiresAt : Date
  subtotal : Number
  couponDiscount : Number
  shippingFee : Number {default=0}
  nameCoupon : String {require=true}
  _id : ObjectId
  __v : Number
  createdAt : Date
  updatedAt : Date
}
enum "Enum11" as M_payments_Enum11 <<enumeration>> {
  pending
  confirmed
  shipped
  delivered
  cancelled
}
M_payments --> M_payments_Enum11
enum "Enum13" as M_payments_Enum13 <<enumeration>> {
  COD
  VNPAY
  MOMO
}
M_payments --> M_payments_Enum13
enum "Enum16" as M_payments_Enum16 <<enumeration>> {
  unpaid
  pending
  paid
  failed
  expired
  refund_required
}
M_payments --> M_payments_Enum16
@enduml
```

### Model `previewProduct`

Nguồn: `server/src/models/previewProduct.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| userId | Schema.Types.ObjectId | type: Schema.Types.ObjectId, ref: 'users', require: true |
| productId | Schema.Types.ObjectId | type: Schema.Types.ObjectId, ref: 'products', require: true |
| content | String | type: String, require: true |
| rating | Number | type: Number, require: true |

Options: timestamps=true. Index trong field xem cột options; index compound: không khai báo thêm. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-previewproduct.puml](uml/class-model-previewproduct.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "previewProduct" as M_previewProduct <<Model>> {
  userId : Schema.Types.ObjectId {require=true; ref='users'}
  productId : Schema.Types.ObjectId {require=true; ref='products'}
  content : String {require=true}
  rating : Number {require=true}
  _id : ObjectId
  __v : Number
  createdAt : Date
  updatedAt : Date
}
@enduml
```

### Model `products`

Nguồn: `server/src/models/products.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| nameProduct | String | type: String, required: true |
| modelNumber | String | type: String, required: true |
| brand | String | type: String, required: true |
| collection | String | type: String |
| category | String | type: String |
| origin | String | type: String, required: true |
| gender | String | type: String, required: true |
| glassMaterial | String | type: String, required: true |
| movement | String | type: String, required: true |
| powerReserve | String | type: String |
| warrantyGlobal | String | type: String |
| dialDiameter | Number | type: Number, required: true |
| caseThickness | Number | type: Number |
| bezelMaterial | String | type: String |
| strapMaterial | String | type: String, required: true |
| faceColor | String | type: String |
| waterResistance | String | type: String, required: true |
| price | Number | type: Number, required: true |
| discount | Number | type: Number, default: 0 |
| description | String | type: String, required: true |
| images | String | type: String, required: true |
| stock | Number | type: Number, required: true |
| soldCount | Number | type: Number, default: 0 |

Options: timestamps=true. Index trong field xem cột options; index compound: không khai báo thêm. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-products.puml](uml/class-model-products.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "products" as M_products <<Model>> {
  nameProduct : String {required=true}
  modelNumber : String {required=true}
  brand : String {required=true}
  collection : String
  category : String
  origin : String {required=true}
  gender : String {required=true}
  glassMaterial : String {required=true}
  movement : String {required=true}
  powerReserve : String
  warrantyGlobal : String
  dialDiameter : Number {required=true}
  caseThickness : Number
  bezelMaterial : String
  strapMaterial : String {required=true}
  faceColor : String
  waterResistance : String {required=true}
  price : Number {required=true}
  discount : Number {default=0}
  description : String {required=true}
  images : String {required=true}
  stock : Number {required=true}
  soldCount : Number {default=0}
  _id : ObjectId
  __v : Number
  createdAt : Date
  updatedAt : Date
}
@enduml
```

### Model `user`

Nguồn: `server/src/models/users.model.js:1`.

| Field | Kiểu khai báo | Options thực tế / ràng buộc |
| --- | --- | --- |
| fullName | String | type: String, require: true |
| phone | String | type: String, require: true |
| email | String | type: String, require: true |
| password | String | type: String, require: true |
| isAdmin | Boolean | type: Boolean, default: false |
| address | String | type: String, require: true |
| typeLogin | String | type: String, require: true, enum: ['email', 'google'] |
| lastLoginAt | Date | type: Date, default: Date.now |
| isOnline | Boolean | type: Boolean, default: true |

Options: timestamps=true. Index trong field xem cột options; index compound: không khai báo thêm. Không có hook, method hoặc static tự định nghĩa trong schema này.

Nguồn sơ đồ: [uml/class-model-user.puml](uml/class-model-user.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "user" as M_user <<Model>> {
  fullName : String {require=true}
  phone : String {require=true}
  email : String {require=true}
  password : String {require=true}
  isAdmin : Boolean {default=false}
  address : String {require=true}
  typeLogin : M_user_Enum6 {require=true}
  lastLoginAt : Date {default=Date.now}
  isOnline : Boolean {default=true}
  _id : ObjectId
  __v : Number
  createdAt : Date
  updatedAt : Date
}
enum "Enum6" as M_user_Enum6 <<enumeration>> {
  email
  google
}
M_user --> M_user_Enum6
@enduml
```

## Quan hệ, bội số và toàn vẹn

Mỗi association có bội số **logic mong muốn từ id**, không chứng nhận DB luôn có parent; MongoDB không tự enforce foreign key. Tên ref sai vẫn được biểu diễn nguyên trạng, vì controller thường truy vấn thủ công chứ không populate.

Nguồn sơ đồ: [uml/class-relations-commerce.puml](uml/class-relations-commerce.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "user" as U <<Model>>
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
end note
@enduml
```

Nguồn sơ đồ: [uml/class-relations-account.puml](uml/class-relations-account.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "user" as U <<Model>>
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
end note
@enduml
```

- `user` là tên model đăng ký, nhưng payments/previewProduct dùng ref `users`, Message dùng `User`; cart/order item dùng `product` trong khi model là `products`. Các đường truy vấn thủ công trong controller vẫn có thể chạy; `populate` theo các ref sai cần xác minh trước sử dụng. Nguồn: `server/src/models/users.model.js:1`, `server/src/models/message.model.js:1`, `server/src/models/payments.model.js:1`, `server/src/models/previewProduct.model.js:1`, `server/src/models/cartUser.model.js:1` (cùng thư mục server/src/models).
- Order chính là `payments`, không có model Order riêng. Mỗi order giữ snapshot unitPrice/nameProduct/images và nhiều paymentAttempts; order.transactionRef chỉ attempt hiện tại. `checkoutKey`, transactionRef và attempt.transactionRef có unique index; transaction yêu cầu replica set. Nguồn: `server/src/models/payments.model.js:1`, `server/src/models/paymentAttempt.model.js:1`, `server/src/services/vnpay.service.js:transaction`, `snapshot`, `newAttempt`.
- Stock/coupon reserve và release của COD/VNPAY nằm trong transaction; shipped/delivered kiểm transition; tăng soldCount khi delivered. MoMo là đường riêng có bù trừ reserveInventory nhưng chưa transaction cho toàn bộ thao tác. Nguồn: `server/src/services/vnpay.service.js:reserve`, `release`, `changeStatus`; `server/src/controllers/payments.controller.js:checkPaymentMomo`.
- Không có unique email trên user, unique email/type trên OTP, unique userId trên cart; luồng đọc rồi tạo không thay thế được constraint. Xóa category cascade products nhưng không xóa review, cart item, upload; đơn mới giữ snapshot. Nguồn: schema tương ứng; `server/src/controllers/category.controller.js:deleteCategory`.

## Cấu trúc backend

Routes và controllers là module/class JavaScript thực tế; stereotype chỉ chức năng kiến trúc. Hàm phụ trợ không nhất thiết là class. Nguồn: `server/src/routes/index.js:routes`, các routes/controller/service được liệt kê trong 00.

### Backend account

Phụ thuộc được lấy từ require/import của các module tương ứng, không thêm service layer cho controller thao tác DB trực tiếp.

Nguồn sơ đồ: [uml/class-backend-account.puml](uml/class-backend-account.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
left to right direction
class "checkAuth" as Auth <<Middleware>> {
  authUser()
  authAdmin()
  asyncHandler()
}
class "users.routes.js" as R0 <<Router>>
class "users.controller.js" as C0 <<Controller>> {
  register()
  loginGoogle()
  login()
  authUser()
  refreshToken()
  logout()
  updateUser()
  getStatistical()
  findAllUser()
  updateUserAdmin()
  forgotPassword()
  resetPassword()
  registerWithVerification()
  verifyEmail()
  resendVerification()
  requestPasswordResetOtp()
  verifyPasswordReset()
  resetPasswordAfterVerification()
}
R0 --> Auth
R0 --> C0
class "users.model" as M0_0 <<Model>>
C0 --> M0_0
class "apiKey.model" as M0_1 <<Model>>
C0 --> M0_1
class "products.model" as M0_2 <<Model>>
C0 --> M0_2
class "payments.model" as M0_3 <<Model>>
C0 --> M0_3
class "previewProduct.model" as M0_4 <<Model>>
C0 --> M0_4
class "otp.model" as M0_5 <<Model>>
C0 --> M0_5
class "tokenSevices" as S0 <<Service>> {
  createApiKey / createToken / createRefreshToken / verifyToken()
}
C0 --> S0
class "otp.service" as S1 <<Service>> {
  issue / consume / hasPendingRegistration()
}
C0 --> S1
class "mail.service" as S2 <<Service>> {
  sendOtpEmail / sendCheckEmail()
}
C0 --> S2
@enduml
```

### Backend commerce

Phụ thuộc được lấy từ require/import của các module tương ứng, không thêm service layer cho controller thao tác DB trực tiếp.

Nguồn sơ đồ: [uml/class-backend-commerce.puml](uml/class-backend-commerce.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
left to right direction
class "checkAuth" as Auth <<Middleware>> {
  authUser()
  authAdmin()
  asyncHandler()
}
class "products.routes.js" as R0 <<Router>>
class "products.controller.js" as C0 <<Controller>> {
  uploadImages()
  createProduct()
  getProductNew()
  getProductCatalog()
  getCatalogOptions()
  browseProducts()
  getProductById()
  getProductByCategory()
  getAllProduct()
  updateProduct()
  deleteProduct()
  getProductManufactured()
  searchProduct()
}
R0 --> Auth
R0 --> C0
class "products.model" as M0_0 <<Model>>
C0 --> M0_0
class "category.model" as M0_1 <<Model>>
C0 --> M0_1
class "previewProduct.model" as M0_2 <<Model>>
C0 --> M0_2
class "users.model" as M0_3 <<Model>>
C0 --> M0_3
class "coupon.model" as M0_4 <<Model>>
C0 --> M0_4
class "cartUser.routes.js" as R1 <<Router>>
class "cartUser.controller.js" as C1 <<Controller>> {
  addToCart()
  getCart()
  deleteProductCart()
  updateProductCart()
  updateInfoCart()
}
R1 --> Auth
R1 --> C1
class "cartUser.model" as M1_0 <<Model>>
C1 --> M1_0
class "products.model" as M1_1 <<Model>>
C1 --> M1_1
class "coupon.model" as M1_2 <<Model>>
C1 --> M1_2
class "payments.route.js" as R2 <<Router>>
class "payments.controller.js" as C2 <<Controller>> {
  createPayment()
  checkPaymentVnpay()
  ipnVnpay()
  retryVnpay()
  reconcileVnpay()
  checkPaymentMomo()
  getPaymentSuccess()
  getOrderUser()
  cancelOrder()
  getOrderAdmin()
  updateOrderStatus()
}
R2 --> Auth
R2 --> C2
class "payments.model" as M2_0 <<Model>>
C2 --> M2_0
class "cartUser.model" as M2_1 <<Model>>
C2 --> M2_1
class "products.model" as M2_2 <<Model>>
C2 --> M2_2
class "coupon.model" as M2_3 <<Model>>
C2 --> M2_3
class "paymentAttempt.model" as M2_4 <<Model>>
C2 --> M2_4
class "category.routes.js" as R3 <<Router>>
class "category.controller.js" as C3 <<Controller>> {
  createCategory()
  getAllCategory()
  updateCategory()
  deleteCategory()
}
R3 --> Auth
R3 --> C3
class "category.model" as M3_0 <<Model>>
C3 --> M3_0
class "products.model" as M3_1 <<Model>>
C3 --> M3_1
class "coupon.routes.js" as R4 <<Router>>
class "coupon.controller.js" as C4 <<Controller>> {
  createCoupon()
  getCoupons()
  getAllCoupon()
  deleteCoupon()
  updateCoupon()
}
R4 --> Auth
R4 --> C4
class "coupon.model" as M4_0 <<Model>>
C4 --> M4_0
class "cartUser.model" as M4_1 <<Model>>
C4 --> M4_1
class "products.model" as M4_2 <<Model>>
C4 --> M4_2
class "vnpay.service" as VNP <<Service>> {
 checkout()
 retry()
 ipn()
 reconcile()
 expirePending()
 changeStatus()
}
class "vnpay-query.service" as Q <<Service>> {
 queryAttempt()
}
class "product-catalog.service" as PC <<Service>>
class "catalog-browse.service" as CB <<Service>>
class "brand.service" as BS <<Service>>
C2 --> VNP
VNP --> Q
C0 --> PC
C0 --> CB
CB --> BS
class "brand.routes.js" as BrandR <<Router>>
BrandR --> Auth
BrandR --> BS
class "Multer / routes/index.js" as Upload <<Middleware>>
Upload --> Auth
@enduml
```

### Backend content

Phụ thuộc được lấy từ require/import của các module tương ứng, không thêm service layer cho controller thao tác DB trực tiếp.

Nguồn sơ đồ: [uml/class-backend-content.puml](uml/class-backend-content.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
left to right direction
class "checkAuth" as Auth <<Middleware>> {
  authUser()
  authAdmin()
  asyncHandler()
}
class "blog.routes.js" as R0 <<Router>>
class "blog.controller.js" as C0 <<Controller>> {
  uploadImage()
  createBlog()
  getAllBlog()
  updateBlog()
  deleteBlog()
  getBlogById()
}
R0 --> Auth
R0 --> C0
class "blog.model" as M0_0 <<Model>>
C0 --> M0_0
class "message.routes.js" as R1 <<Router>>
class "message.controller.js" as C1 <<Controller>> {
  createMessage()
  createMessageAdmin()
  getAllUserMessage()
  getMessage()
  getMessageUser()
  readMessage()
}
R1 --> Auth
R1 --> C1
class "users.model" as M1_0 <<Model>>
C1 --> M1_0
class "message.model" as M1_1 <<Model>>
C1 --> M1_1
class "previewProduct.routes.js" as R2 <<Router>>
class "previewProduct.controller.js" as C2 <<Controller>> {
  createPreviewProduct()
  getPreviewProductHome()
}
R2 --> Auth
R2 --> C2
class "previewProduct.model" as M2_0 <<Model>>
C2 --> M2_0
class "products.model" as M2_1 <<Model>>
C2 --> M2_1
class "users.model" as M2_2 <<Model>>
C2 --> M2_2
class "socket" as Socket <<Service>> {
 initSocket()
 getIO()
}
class "chatbot" as Bot <<Service>> {
 askQuestion()
}
class "server.js" as Server <<EntryPoint>>
Server --> Bot
Server --> Socket
C1 --> Socket
@enduml
```

Upload là Multer middleware trong routes/index.js và blog.routes.js, không có upload.service. `utils/SendMail/sendMailForgotPassword.js` là nhánh legacy được import nhưng các lời gọi nằm sau return không tới được; mail.service mới xử lý luồng đang dùng. `config/vnpay.js` chỉ export cấu hình, không thấy nơi import trong src. Nguồn: các file và `server/src/controllers/users.controller.js:forgotPassword`, `resetPassword`.

## Cấu trúc client

Nguồn imports trực tiếp của mọi Pages/Components có trong bảng 00; các sơ đồ dưới tách module để đọc được. Ant Design/TinyMCE là thư viện UI, không phải backend.

Nguồn sơ đồ: [uml/class-client-core.puml](uml/class-client-core.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "main.jsx / publicRoutes" as Main <<EntryPoint>>
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
Catalog --> API
@enduml
```

Nguồn sơ đồ: [uml/class-client-storefront.puml](uml/class-client-storefront.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "App / HomePage" as App <<Page>>
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
Layout --> Req
@enduml
```

Nguồn sơ đồ: [uml/class-client-admin.puml](uml/class-client-admin.puml). Chưa kiểm tra cú pháp bằng công cụ.

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #334155
skinparam defaultFontSize 13
class "AdminLayout" as Admin <<Page>>
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
Window --> Req
@enduml
```

## Giả định và Phát hiện

Bội số thể hiện khả năng lưu trữ/khóa hiện tại, không dựa sample DB. Không suy ra collection có dữ liệu chỉ vì model tồn tại. Các thiếu constraint/ref sai và khác biệt UI/schema được tổng hợp tại 05.
