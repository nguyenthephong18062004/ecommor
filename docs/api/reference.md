# Tham chiếu 88 thao tác HTTP

Sinh từ hợp đồng đã đọc code ngày 02/11/2026. Ví dụ là dữ liệu hư cấu, không phải log HTTP đã thu được. Đọc [README](README.md), [quy ước](conventions.md) và [luồng nghiệp vụ](workflows.md) trước khi gọi.

Schema đầy đủ, giới hạn số/chuỗi, response và cookie security nằm trong [OpenAPI](openapi.json). Endpoint legacy/caveat giữ nguyên hành vi code, không mô tả như đã sửa.

## Upload

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| POST | `/api/blog/upload-image` | public | [Upload một ảnh blog](#postapibloguploadimage) |
| POST | `/api/upload-image` | admin | [Admin upload nhiều ảnh sản phẩm](#postapiuploadimage) |

<a id="postapibloguploadimage"></a>

### POST `/api/blog/upload-image`

Upload một ảnh blog

Hiện trạng cần lưu ý: Route hiện public, chưa có authAdmin hoặc giới hạn upload tại Multer; không phải chính sách quyền mong muốn. Async handler chưa được bọc. Field image khác images của ảnh sản phẩm.

**Nguồn:** `server/src/routes/blog.routes.js:22`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

**Body:** `multipart/form-data`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `image` | Có | string |  |

Chọn file fixture tại các field trên; không tự đặt Content-Type boundary khi dùng Postman/cURL.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": "minh_hoa"
}
```

---

<a id="postapiuploadimage"></a>

### POST `/api/upload-image`

Admin upload nhiều ảnh sản phẩm

Quyền middleware: admin (isAdmin=true).

Hiện trạng cần lưu ý: Multer hiện chưa cấu hình giới hạn số file/kích thước/MIME tại route. Không suy diễn giới hạn an toàn từ schema tài liệu. Field phải là images; mỗi file là một part cùng tên.

**Nguồn:** `server/src/routes/index.js:109`.

**Xác thực:** sessionCookie.

**Body:** `multipart/form-data`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `images` | Có | array<string> |  |

Chọn file fixture tại các field trên; không tự đặt Content-Type boundary khi dùng Postman/cURL.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

---

## Blog

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| POST | `/api/blog/create` | admin | [Tạo bài viết](#postapiblogcreate) |
| GET | `/api/blog/get-all` | public | [Danh sách bài viết](#getapibloggetall) |
| POST | `/api/blog/update` | admin | [Cập nhật bài viết](#postapiblogupdate) |
| POST | `/api/blog/delete` | admin | [Xóa bài viết bằng POST](#postapiblogdelete) |
| GET | `/api/blog/get-by-id` | public | [Chi tiết bài viết](#getapibloggetbyid) |

<a id="postapiblogcreate"></a>

### POST `/api/blog/create`

Tạo bài viết

Quyền middleware: admin (isAdmin=true).

Hiện trạng cần lưu ý: Async handler chưa có wrapper bắt lỗi Express 4. update trả document trước cập nhật, và nhánh không tìm thấy tham chiếu NotFoundError chưa import; không bảo đảm mọi lỗi có JSON chuẩn.

**Nguồn:** `server/src/routes/blog.routes.js:23`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `title` | Không | string |  |
| `content` | Không | string | HTML được sanitize. |
| `image` | Không | string |  |

Request minh họa:

```json
{
  "title": "Bài viết minh họa",
  "content": "<p>Nội dung thử nghiệm.</p>",
  "image": "/uploads/blogs/fixture.png"
}
```

| HTTP | Response |
| --- | --- |
| 201 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 201,
  "metadata": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "minh_hoa",
    "content": "minh_hoa",
    "image": "minh_hoa",
    "createdAt": "2026-11-02T03:00:00.000Z",
    "updatedAt": "2026-11-02T03:00:00.000Z"
  }
}
```

---

<a id="getapibloggetall"></a>

### GET `/api/blog/get-all`

Danh sách bài viết

Chưa phân trang; content được sanitize khi đọc.

**Nguồn:** `server/src/routes/blog.routes.js:24`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="postapiblogupdate"></a>

### POST `/api/blog/update`

Cập nhật bài viết

Quyền middleware: admin (isAdmin=true).

Hiện trạng cần lưu ý: Async handler chưa có wrapper bắt lỗi Express 4. update trả document trước cập nhật, và nhánh không tìm thấy tham chiếu NotFoundError chưa import; không bảo đảm mọi lỗi có JSON chuẩn.

**Nguồn:** `server/src/routes/blog.routes.js:25`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `title` | Không | string |  |
| `content` | Không | string | HTML được sanitize. |
| `image` | Không | string |  |
| `id` | Không | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |

Request minh họa:

```json
{
  "title": "Bài viết minh họa",
  "content": "<p>Nội dung thử nghiệm.</p>",
  "image": "/uploads/blogs/fixture.png",
  "id": "507f1f77bcf86cd799439011"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "minh_hoa",
    "content": "minh_hoa",
    "image": "minh_hoa",
    "createdAt": "2026-11-02T03:00:00.000Z",
    "updatedAt": "2026-11-02T03:00:00.000Z"
  }
}
```

---

<a id="postapiblogdelete"></a>

### POST `/api/blog/delete`

Xóa bài viết bằng POST

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/blog.routes.js:26`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `id` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |

Request minh họa:

```json
{
  "id": "507f1f77bcf86cd799439011"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

<a id="getapibloggetbyid"></a>

### GET `/api/blog/get-by-id`

Chi tiết bài viết

ID hợp lệ không tồn tại hiện có thể trả 200 metadata=null; không phải 404.

**Nguồn:** `server/src/routes/blog.routes.js:27`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `id` | query | Có | string |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "minh_hoa",
    "content": "minh_hoa",
    "image": "minh_hoa",
    "createdAt": "2026-11-02T03:00:00.000Z",
    "updatedAt": "2026-11-02T03:00:00.000Z"
  }
}
```

---

## Thương hiệu

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| GET | `/api/brands` | public | [Danh sách thương hiệu và số sản phẩm](#getapibrands) |
| PUT | `/api/brands/{name}` | admin | [Upsert giới thiệu/logo thương hiệu](#putapibrandsname) |

<a id="getapibrands"></a>

### GET `/api/brands`

Danh sách thương hiệu và số sản phẩm



**Nguồn:** `server/src/routes/brand.routes.js:8`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="putapibrandsname"></a>

### PUT `/api/brands/{name}`

Upsert giới thiệu/logo thương hiệu

Path name dài tối đa 100 ký tự; key được chuẩn hóa từ name. Cả description và logo phải là string, có thể rỗng.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/brand.routes.js:11`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `name` | path | Có | string |  |

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `description` | Có | string |  |
| `logo` | Có | string | Chuỗi rỗng hoặc URL http(s). |

Request minh họa:

```json
{
  "description": "Giới thiệu thương hiệu thử nghiệm.",
  "logo": ""
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

## Giỏ hàng

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| POST | `/api/create-cart` | user | [Thêm số lượng vào giỏ](#postapicreatecart) |
| GET | `/api/get-cart` | user | [Đọc giỏ, giá hiện tại và coupon dùng được](#getapigetcart) |
| POST | `/api/delete-product-cart` | user | [Xóa một dòng giỏ hàng](#postapideleteproductcart) |
| POST | `/api/update-product-cart` | user | [Đặt lại số lượng dòng giỏ](#postapiupdateproductcart) |
| POST | `/api/update-info-cart` | user | [Lưu thông tin nhận hàng kiểu cũ](#postapiupdateinfocart) |

<a id="postapicreatecart"></a>

### POST `/api/create-cart`

Thêm số lượng vào giỏ

Chỉ sản phẩm published + verified + đủ tồn. create-cart cộng quantity vào dòng cũ; update-product-cart thay bằng quantity mới. Không giữ kho ở bước giỏ.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/cartUser.routes.js:8`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `productId` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `quantity` | Có | integer |  |

Request minh họa:

```json
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 1
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 201 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 409 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

<a id="getapigetcart"></a>

### GET `/api/get-cart`

Đọc giỏ, giá hiện tại và coupon dùng được

Giỏ trống không có cartId. Khi đọc có thể loại dòng sản phẩm đã xóa/sai ID và cập nhật tổng tạm tính; vì vậy GET có thể ghi làm sạch giỏ.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/cartUser.routes.js:9`.

**Xác thực:** sessionCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "cartItems": [],
    "totalPrice": 1,
    "dataCoupon": [],
    "cartId": "507f1f77bcf86cd799439011"
  }
}
```

---

<a id="postapideleteproductcart"></a>

### POST `/api/delete-product-cart`

Xóa một dòng giỏ hàng

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/cartUser.routes.js:10`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `productId` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |

Request minh họa:

```json
{
  "productId": "507f1f77bcf86cd799439011"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

<a id="postapiupdateproductcart"></a>

### POST `/api/update-product-cart`

Đặt lại số lượng dòng giỏ

Chỉ sản phẩm published + verified + đủ tồn. create-cart cộng quantity vào dòng cũ; update-product-cart thay bằng quantity mới. Không giữ kho ở bước giỏ.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/cartUser.routes.js:11`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `productId` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `quantity` | Có | integer |  |

Request minh họa:

```json
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 1
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 409 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

<a id="postapiupdateinfocart"></a>

### POST `/api/update-info-cart`

Lưu thông tin nhận hàng kiểu cũ

Checkout COD/VNPay nhận thông tin trực tiếp ở create-payment. nameCoupon là ID document coupon, không phải tên mã hiển thị.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/cartUser.routes.js:12`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `fullName` | Không | string |  |
| `phone` | Không | string |  |
| `address` | Không | string |  |
| `note` | Không | string |  |
| `nameCoupon` | Không | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |

Request minh họa:

```json
{
  "fullName": "Nguyễn Văn An",
  "phone": "0900000000",
  "address": "Địa chỉ thử nghiệm",
  "note": ""
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

## Danh mục

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| POST | `/api/create-category` | admin | [Tạo danh mục](#postapicreatecategory) |
| GET | `/api/get-all-category` | public | [Danh sách danh mục](#getapigetallcategory) |
| POST | `/api/update-category` | admin | [Cập nhật danh mục](#postapiupdatecategory) |
| DELETE | `/api/delete-category` | admin | [Xóa danh mục và các sản phẩm thuộc danh mục](#deleteapideletecategory) |

<a id="postapicreatecategory"></a>

### POST `/api/create-category`

Tạo danh mục

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/category.routes.js:8`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `name` | Có | string |  |

Request minh họa:

```json
{
  "name": "Đồng hồ thử nghiệm"
}
```

| HTTP | Response |
| --- | --- |
| 201 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 201,
  "metadata": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "minh_hoa",
    "createdAt": "2026-11-02T03:00:00.000Z",
    "updatedAt": "2026-11-02T03:00:00.000Z"
  }
}
```

---

<a id="getapigetallcategory"></a>

### GET `/api/get-all-category`

Danh sách danh mục



**Nguồn:** `server/src/routes/category.routes.js:9`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="postapiupdatecategory"></a>

### POST `/api/update-category`

Cập nhật danh mục

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/category.routes.js:10`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `id` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `name` | Có | string |  |

Request minh họa:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Đồng hồ thử nghiệm"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "minh_hoa",
    "createdAt": "2026-11-02T03:00:00.000Z",
    "updatedAt": "2026-11-02T03:00:00.000Z"
  }
}
```

---

<a id="deleteapideletecategory"></a>

### DELETE `/api/delete-category`

Xóa danh mục và các sản phẩm thuộc danh mục

Quyền middleware: admin (isAdmin=true).

Hiện trạng cần lưu ý: Có tác dụng deleteMany sản phẩm thuộc danh mục. Không dùng như ngừng bán. Nhánh không tìm thấy đang tham chiếu NotFoundError chưa import, có thể thành 500.

**Nguồn:** `server/src/routes/category.routes.js:11`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `id` | query | Có | string |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "minh_hoa",
    "createdAt": "2026-11-02T03:00:00.000Z",
    "updatedAt": "2026-11-02T03:00:00.000Z"
  }
}
```

---

## Coupon

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| POST | `/api/create-coupon` | admin | [Tạo coupon](#postapicreatecoupon) |
| GET | `/api/coupons` | public | [Danh sách coupon kiểu response riêng](#getapicoupons) |
| DELETE | `/api/delete-coupon` | admin | [Xóa coupon](#deleteapideletecoupon) |
| POST | `/api/update-coupon` | admin | [Cập nhật coupon](#postapiupdatecoupon) |

<a id="postapicreatecoupon"></a>

### POST `/api/create-coupon`

Tạo coupon

discount là số tiền VND trừ trực tiếp, khác discount phần trăm của sản phẩm. nameCoupon ở giỏ/checkout là ID document. Create legacy đòi field truthy nên discount/quantity/minPrice=0 bị từ chối dù schema số cho phép 0; chưa enforce đầy đủ validation khi CRUD.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/coupon.routes.js:8`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `nameCoupon` | Có | string |  |
| `discount` | Có | integer | Số nguyên VND, không dùng chuỗi có dấu chấm phân cách. |
| `quantity` | Có | integer |  |
| `minPrice` | Có | integer | Số nguyên VND, không dùng chuỗi có dấu chấm phân cách. |
| `startDate` | Có | string |  |
| `endDate` | Có | string |  |

Request minh họa:

```json
{
  "nameCoupon": "DEMO-COUPON",
  "discount": 50000,
  "quantity": 10,
  "minPrice": 1000000,
  "startDate": "2026-11-02T00:00:00+07:00",
  "endDate": "2027-01-01T00:00:00+07:00"
}
```

| HTTP | Response |
| --- | --- |
| 201 | MessageOnly |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

---

<a id="getapicoupons"></a>

### GET `/api/coupons`

Danh sách coupon kiểu response riêng

Route hiện public và chưa phân trang, không phải admin-only. Không có metadata envelope.

**Nguồn:** `server/src/routes/coupon.routes.js:10`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

---

<a id="deleteapideletecoupon"></a>

### DELETE `/api/delete-coupon`

Xóa coupon

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/coupon.routes.js:11`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `id` | query | Có | string |  |

| HTTP | Response |
| --- | --- |
| 200 | MessageOnly |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

---

<a id="postapiupdatecoupon"></a>

### POST `/api/update-coupon`

Cập nhật coupon

discount là số tiền VND trừ trực tiếp, khác discount phần trăm của sản phẩm. nameCoupon ở giỏ/checkout là ID document. Create legacy đòi field truthy nên discount/quantity/minPrice=0 bị từ chối dù schema số cho phép 0; chưa enforce đầy đủ validation khi CRUD.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/coupon.routes.js:12`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `nameCoupon` | Không | string |  |
| `discount` | Không | integer | Số nguyên VND, không dùng chuỗi có dấu chấm phân cách. |
| `quantity` | Không | integer |  |
| `minPrice` | Không | integer | Số nguyên VND, không dùng chuỗi có dấu chấm phân cách. |
| `startDate` | Không | string |  |
| `endDate` | Không | string |  |
| `_id` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |

Request minh họa:

```json
{
  "nameCoupon": "DEMO-COUPON",
  "discount": 50000,
  "quantity": 10,
  "minPrice": 1000000,
  "startDate": "2026-11-02T00:00:00+07:00",
  "endDate": "2027-01-01T00:00:00+07:00",
  "_id": "507f1f77bcf86cd799439011"
}
```

| HTTP | Response |
| --- | --- |
| 200 | MessageOnly |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

---

## Legacy chưa hỗ trợ

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| GET | `/api/coupon` | public | [Coupon theo giỏ: endpoint legacy đang lỗi](#getapicoupon) |
| GET | `/api/check-payment-momo` | public | [Callback MoMo legacy còn đăng ký](#getapicheckpaymentmomo) |

<a id="getapicoupon"></a>

### GET `/api/coupon`

Coupon theo giỏ: endpoint legacy đang lỗi

Không mô tả response 200 giả định cho endpoint hiện trạng này.

Hiện trạng cần lưu ý: Route không gắn authUser nhưng handler đọc req.user.id, nên không có req.user kể cả gửi cookie. Handler còn tham chiếu totalCartBefore không có trong cart schema. Dùng metadata.dataCoupon của GET /api/get-cart thay thế.

**Nguồn:** `server/src/routes/coupon.routes.js:9`.

**Legacy/deprecated trong tài liệu:** không ưu tiên cho tích hợp mới.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| HTTP | Response |
| --- | --- |
| 500 | Error |

---

<a id="getapicheckpaymentmomo"></a>

### GET `/api/check-payment-momo`

Callback MoMo legacy còn đăng ký

Được liệt kê để không bỏ sót route đang tồn tại. Không cung cấp mẫu callback thành công hay chữ ký giả. Xem code payments.controller.js:181 và ghi chú hiện trạng.

Hiện trạng cần lưu ý: Luồng tạo MoMo đã bị chặn, nhưng callback legacy vẫn còn và chưa có kiểm tra chữ ký tương đương VNPay. Không tích hợp/gọi thử endpoint này; đây không phải API thanh toán được hỗ trợ.

**Nguồn:** `server/src/routes/payments.route.js:13`.

**Legacy/deprecated trong tài liệu:** không ưu tiên cho tích hợp mới.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| HTTP | Response |
| --- | --- |
| 302 | Nhánh thành công legacy có thể điều hướng về chi tiết đơn. |
| 403 | Error |
| 500 | Error |

---

## Tin nhắn nhân viên

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| POST | `/api/message/create` | user | [Khách gửi tin nhắn cho admin đầu tiên](#postapimessagecreate) |
| POST | `/api/message/create-admin` | admin | [Admin gửi tin cho khách](#postapimessagecreateadmin) |
| GET | `/api/message/all` | admin | [Admin đọc danh sách hội thoại gửi đến mình](#getapimessageall) |
| GET | `/api/message/get-message` | admin | [Admin đọc hội thoại giữa hai ID](#getapimessagegetmessage) |
| GET | `/api/message/get-message-user` | user | [Khách đọc hội thoại của mình](#getapimessagegetmessageuser) |
| GET | `/api/message/read-message` | user | [Đánh dấu hội thoại đã đọc](#getapimessagereadmessage) |

<a id="postapimessagecreate"></a>

### POST `/api/message/create`

Khách gửi tin nhắn cho admin đầu tiên

Tin nhắn được lưu DB rồi phát sự kiện Socket.IO nếu người nhận online. Không có event socket gửi tin; dùng HTTP này. Cần có tài khoản admin và server Socket.IO đã khởi tạo.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/message.routes.js:8`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `text` | Có | string |  |

Request minh họa:

```json
{
  "text": "Nội dung hỗ trợ thử nghiệm."
}
```

| HTTP | Response |
| --- | --- |
| 201 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 201,
  "metadata": {
    "_id": "507f1f77bcf86cd799439011",
    "senderId": "507f1f77bcf86cd799439011",
    "receiverId": "507f1f77bcf86cd799439011",
    "conversationId": "minh_hoa",
    "text": "minh_hoa",
    "isRead": false,
    "createdAt": "2026-11-02T03:00:00.000Z"
  }
}
```

---

<a id="postapimessagecreateadmin"></a>

### POST `/api/message/create-admin`

Admin gửi tin cho khách

Tin nhắn được lưu DB rồi phát sự kiện Socket.IO nếu người nhận online. Không có event socket gửi tin; dùng HTTP này. Cần có tài khoản admin và server Socket.IO đã khởi tạo.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/message.routes.js:9`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `receiverId` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `text` | Có | string |  |

Request minh họa:

```json
{
  "receiverId": "507f1f77bcf86cd799439011",
  "text": "Phản hồi hỗ trợ thử nghiệm."
}
```

| HTTP | Response |
| --- | --- |
| 201 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 201,
  "metadata": {
    "_id": "507f1f77bcf86cd799439011",
    "senderId": "507f1f77bcf86cd799439011",
    "receiverId": "507f1f77bcf86cd799439011",
    "conversationId": "minh_hoa",
    "text": "minh_hoa",
    "isRead": false,
    "createdAt": "2026-11-02T03:00:00.000Z"
  }
}
```

---

<a id="getapimessageall"></a>

### GET `/api/message/all`

Admin đọc danh sách hội thoại gửi đến mình

Trả senderId, email, fullName, unreadMessage, latestMessage, latestAt, lastLoginAt, isOnline. Không phân trang; danh sách giới hạn các tin gửi đến admin đang đăng nhập.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/message.routes.js:11`.

**Xác thực:** sessionCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="getapimessagegetmessage"></a>

### GET `/api/message/get-message`

Admin đọc hội thoại giữa hai ID

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/message.routes.js:12`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `senderId` | query | Có | string |  |
| `receiverId` | query | Có | string |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="getapimessagegetmessageuser"></a>

### GET `/api/message/get-message-user`

Khách đọc hội thoại của mình

Quyền middleware: phiên đăng nhập.

Hiện trạng cần lưu ý: Handler lấy receiver từ tin đầu của user; khi chưa có tin nào có thể lỗi thay vì trả mảng rỗng.

**Nguồn:** `server/src/routes/message.routes.js:13`.

**Xác thực:** sessionCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="getapimessagereadmessage"></a>

### GET `/api/message/read-message`

Đánh dấu hội thoại đã đọc

GET có tác dụng ghi. Đánh dấu toàn bộ tin chưa đọc trong conversationId, không chỉ tin gửi đến người gọi.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/message.routes.js:14`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `receiverId` | query | Có | string |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

## Đơn hàng và thanh toán

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| POST | `/api/create-payment` | user | [Checkout COD hoặc tạo URL VNPay](#postapicreatepayment) |
| POST | `/api/retry-payment-vnpay` | user | [Lấy lại URL hoặc mở lần thanh toán VNPay mới](#postapiretrypaymentvnpay) |
| POST | `/api/reconcile-payment-vnpay` | user | [Tra cứu kết quả VNPay khi thiếu IPN](#postapireconcilepaymentvnpay) |
| GET | `/api/get-payment-success` | user | [Chi tiết đơn hàng của mình](#getapigetpaymentsuccess) |
| GET | `/api/get-order-user` | user | [Lịch sử đơn của tài khoản](#getapigetorderuser) |
| POST | `/api/cancel-order` | user | [Khách hủy đơn pending đủ điều kiện](#postapicancelorder) |
| GET | `/api/get-order-admin` | admin | [Danh sách đơn cho admin, kèm các lần thanh toán](#getapigetorderadmin) |
| POST | `/api/update-order-status` | admin | [Admin chuyển trạng thái đơn](#postapiupdateorderstatus) |

<a id="postapicreatepayment"></a>

### POST `/api/create-payment`

Checkout COD hoặc tạo URL VNPay

Body mô tả luồng tích hợp mới; legacy có thể lấy tên/địa chỉ từ giỏ. Không gửi price/totalPrice làm nguồn tính tiền. Thành công COD: metadata là Order; VNPay: metadata là string URL, không phải HTTP redirect. Giữ kho/coupon và xóa giỏ trong transaction. Gọi lại cùng cartId trả đơn/URL cũ nếu còn hợp lệ; cartId là khóa chống trùng. Đổi giá/quote cần xác nhận lại. Cần MongoDB replica set. MoMo hiện bị từ chối 400.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/payments.route.js:7`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `cartId` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `typePayment` | Có | string: COD, VNPAY |  |
| `shippingQuoteId` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `fullName` | Có | string |  |
| `phone` | Có | string |  |
| `address` | Có | string | Số nhà/tên đường phải khớp street trong quote. |
| `note` | Không | string |  |
| `nameCoupon` | Không | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |

Request minh họa:

```json
{
  "cartId": "507f1f77bcf86cd799439011",
  "typePayment": "COD",
  "shippingQuoteId": "507f1f77bcf86cd799439014",
  "fullName": "Nguyễn Văn An",
  "phone": "0900000000",
  "address": "Địa chỉ thử nghiệm",
  "note": ""
}
```

| HTTP | Response |
| --- | --- |
| 201 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 409 | Error |
| 500 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 201,
  "metadata": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439011",
    "product": [],
    "fullName": "minh_hoa",
    "phone": "minh_hoa",
    "address": "minh_hoa",
    "note": "minh_hoa",
    "paymentMethod": "COD"
  }
}
```

---

<a id="postapiretrypaymentvnpay"></a>

### POST `/api/retry-payment-vnpay`

Lấy lại URL hoặc mở lần thanh toán VNPay mới

Chỉ đơn VNPay pending của chủ, paymentStatus pending/failed/expired. Attempt pending chưa hết hạn trả URL cũ; failed/expired giữ lại nguồn lực và tạo transactionRef mới. Không áp dụng cho refund_required.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/payments.route.js:11`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `idOrder` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |

Request minh họa:

```json
{
  "idOrder": "507f1f77bcf86cd799439011"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 409 | Error |
| 500 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": "https://example.test/minh-hoa"
}
```

---

<a id="postapireconcilepaymentvnpay"></a>

### POST `/api/reconcile-payment-vnpay`

Tra cứu kết quả VNPay khi thiếu IPN

Chủ đơn VNPay; một attempt được query tối đa mỗi 5 phút theo lease DB. Lỗi mạng/chưa xác minh không tự coi đã trả tiền. nextCheckAt hướng dẫn lúc kiểm tra tiếp.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/payments.route.js:12`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `idOrder` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |

Request minh họa:

```json
{
  "idOrder": "507f1f77bcf86cd799439011"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 404 | Error |
| 500 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "paymentStatus": "minh_hoa",
    "nextCheckAt": "2026-11-02T03:00:00.000Z"
  }
}
```

---

<a id="getapigetpaymentsuccess"></a>

### GET `/api/get-payment-success`

Chi tiết đơn hàng của mình

Tên route legacy không bảo đảm đơn đã paid; đọc paymentStatus. Không tìm thấy/không sở hữu hiện trả 403. Ưu tiên snapshot đơn; dữ liệu cũ có thể fallback sản phẩm hiện tại.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/payments.route.js:14`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `idPayment` | query | Có | string |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "orderId": "507f1f77bcf86cd799439011",
    "createdAt": "2026-11-02T03:00:00.000Z",
    "fullName": "minh_hoa",
    "phone": "minh_hoa",
    "address": "minh_hoa",
    "note": "minh_hoa",
    "paymentMethod": "minh_hoa",
    "status": "minh_hoa"
  }
}
```

---

<a id="getapigetorderuser"></a>

### GET `/api/get-order-user`

Lịch sử đơn của tài khoản

Chỉ chủ tài khoản, sort createdAt giảm dần; chưa phân trang.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/payments.route.js:15`.

**Xác thực:** sessionCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="postapicancelorder"></a>

### POST `/api/cancel-order`

Khách hủy đơn pending đủ điều kiện

Chỉ đơn của mình. Chặn nếu đã vận chuyển/đang tạo vận đơn chưa hủy tại GHN hoặc đã thanh toán online cần hoàn tiền. Không có API hoàn tiền tự động.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/payments.route.js:16`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `idOrder` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |

Request minh họa:

```json
{
  "idOrder": "507f1f77bcf86cd799439011"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 404 | Error |
| 409 | Error |
| 500 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

<a id="getapigetorderadmin"></a>

### GET `/api/get-order-admin`

Danh sách đơn cho admin, kèm các lần thanh toán

Trả documents đơn với products đã ghép snapshot và paymentAttempts; chưa phân trang.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/payments.route.js:17`.

**Xác thực:** sessionCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="postapiupdateorderstatus"></a>

### POST `/api/update-order-status`

Admin chuyển trạng thái đơn

pending→confirmed/cancelled; confirmed→shipped/cancelled; shipped→delivered. Không mở lại delivered/cancelled. VNPay phải paid; shipped cần mã vận đơn GHN nếu đơn dùng GHN. COD delivered được đánh dấu paid. Gọi cùng trạng thái là no-op.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/payments.route.js:18`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `idOrder` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `status` | Có | string: confirmed, shipped, delivered, cancelled |  |

Request minh họa:

```json
{
  "idOrder": "507f1f77bcf86cd799439011",
  "status": "confirmed"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 404 | Error |
| 409 | Error |
| 500 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

## Callback nhà cung cấp

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| GET | `/api/check-payment-vnpay` | public | [Return URL VNPay: xác minh và điều hướng](#getapicheckpaymentvnpay) |
| GET | `/api/vnpay-return` | public | [Return URL VNPay: xác minh và điều hướng](#getapivnpayreturn) |
| GET | `/api/vnpay-ipn` | public | [IPN VNPay: xác minh và ghi nhận kết quả](#getapivnpayipn) |

<a id="getapicheckpaymentvnpay"></a>

### GET `/api/check-payment-vnpay`

Return URL VNPay: xác minh và điều hướng

Nhà cung cấp gọi, không phải endpoint frontend tự ký. vnp_Amount bằng VND×100. Return không ghi paid; IPN/query đã xác minh mới ghi trạng thái. Có thể có thêm tham số vnp_* được đưa vào chữ ký; không thêm query không bắt đầu vnp_.

**Nguồn:** `server/src/routes/payments.route.js:8`.

**Legacy/deprecated trong tài liệu:** không ưu tiên cho tích hợp mới.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `vnp_TxnRef` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_Amount` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_TmnCode` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_ResponseCode` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_TransactionStatus` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_TransactionNo` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_OrderInfo` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_SecureHash` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_BankCode` | query | Không | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_PayDate` | query | Không | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_SecureHashType` | query | Không | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |

| HTTP | Response |
| --- | --- |
| 302 | Điều hướng /payments/{orderId}; production dùng origin frontend. |
| 400 | Error |
| 404 | Error |
| 500 | Error |
| 503 | Error |

---

<a id="getapivnpayreturn"></a>

### GET `/api/vnpay-return`

Return URL VNPay: xác minh và điều hướng

Nhà cung cấp gọi, không phải endpoint frontend tự ký. vnp_Amount bằng VND×100. Return không ghi paid; IPN/query đã xác minh mới ghi trạng thái. Có thể có thêm tham số vnp_* được đưa vào chữ ký; không thêm query không bắt đầu vnp_.

**Nguồn:** `server/src/routes/payments.route.js:9`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `vnp_TxnRef` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_Amount` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_TmnCode` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_ResponseCode` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_TransactionStatus` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_TransactionNo` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_OrderInfo` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_SecureHash` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_BankCode` | query | Không | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_PayDate` | query | Không | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_SecureHashType` | query | Không | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |

| HTTP | Response |
| --- | --- |
| 302 | Điều hướng /payments/{orderId}; production dùng origin frontend. |
| 400 | Error |
| 404 | Error |
| 500 | Error |
| 503 | Error |

---

<a id="getapivnpayipn"></a>

### GET `/api/vnpay-ipn`

IPN VNPay: xác minh và ghi nhận kết quả

RspCode: 00 đã xử lý; 01 không tìm thấy/không khớp đơn; 02 đã xử lý; 04 sai tiền; 97 sai chữ ký/tham số; 99 lỗi xử lý. Thành công tài chính cần ResponseCode=00 và TransactionStatus=00, số tiền và reference khớp. Callback lặp không giữ/hoàn kho lần hai. Thành công muộn có thể ghi refund_required, không tự mở lại đơn.

**Nguồn:** `server/src/routes/payments.route.js:10`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `vnp_TxnRef` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_Amount` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_TmnCode` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_ResponseCode` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_TransactionStatus` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_TransactionNo` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_OrderInfo` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_SecureHash` | query | Có | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_BankCode` | query | Không | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_PayDate` | query | Không | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |
| `vnp_SecureHashType` | query | Không | string | Tham số VNPay phải giữ nguyên khi kiểm tra chữ ký. |

| HTTP | Response |
| --- | --- |
| 200 | object |

Response minh họa:

```json
{
  "RspCode": "00",
  "Message": "Confirm success"
}
```

---

## Lựa chọn tài khoản

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| GET | `/api/preferences` | user | [Đọc yêu thích, bộ lọc và sổ địa chỉ](#getapipreferences) |
| PATCH | `/api/preferences` | user | [Thay thế các danh sách được gửi trong body](#patchapipreferences) |

<a id="getapipreferences"></a>

### GET `/api/preferences`

Đọc yêu thích, bộ lọc và sổ địa chỉ

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/preferences.routes.js:7`.

**Xác thực:** sessionCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 401 | Error |
| 404 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "wishlist": [],
    "savedSearches": [],
    "addresses": []
  }
}
```

---

<a id="patchapipreferences"></a>

### PATCH `/api/preferences`

Thay thế các danh sách được gửi trong body

PATCH từng field, nhưng giá trị mảng là thay toàn bộ mảng. Không nhận userId/role. wishlist tối đa 100, savedSearches 10, addresses 8; mảng rỗng để xóa danh sách.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/preferences.routes.js:8`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `PreferencesPatch`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `wishlist` | Không | array<string> |  |
| `savedSearches` | Không | array<object> |  |
| `addresses` | Không | array<SavedAddress> |  |

Request minh họa:

```json
{
  "wishlist": [
    "507f1f77bcf86cd799439011"
  ]
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 404 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "wishlist": [],
    "savedSearches": [],
    "addresses": []
  }
}
```

---

## Đặt hàng theo yêu cầu

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| POST | `/api/preorders` | user | [Gửi yêu cầu cung ứng sản phẩm hết hàng](#postapipreorders) |
| GET | `/api/preorders` | admin | [Admin xem tất cả yêu cầu](#getapipreorders) |
| GET | `/api/preorders/mine` | user | [Khách xem yêu cầu của mình](#getapipreordersmine) |
| PATCH | `/api/preorders/{id}/status` | admin | [Admin chuyển trạng thái và thêm ghi chú](#patchapipreordersidstatus) |

<a id="postapipreorders"></a>

### POST `/api/preorders`

Gửi yêu cầu cung ứng sản phẩm hết hàng

Chủ lấy từ session, không nhận userId client. Cần published + allowPreorder=true + stock<=0. Giá lấy DB. Chưa tạo đơn bán, chưa thu tiền/giữ kho, không phải yêu cầu hậu mãi.

Quyền middleware: phiên đăng nhập.

Giới hạn: 5 request/15 phút/IP.

**Nguồn:** `server/src/routes/preorder.routes.js:16`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `PreorderInput`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `productId` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `quantity` | Có | integer |  |
| `fullName` | Có | string |  |
| `phone` | Có | string | Số Việt Nam; server loại khoảng trắng và dấu phân cách. |
| `email` | Không | string |  |
| `address` | Không | string |  |
| `note` | Không | string |  |
| `consent` | Có | boolean: True |  |

Request minh họa:

```json
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 1,
  "fullName": "Nguyễn Văn An",
  "phone": "0900000000",
  "consent": true,
  "note": "Nhờ tư vấn nguồn hàng."
}
```

| HTTP | Response |
| --- | --- |
| 201 | object |
| 400 | Error |
| 401 | Error |
| 404 | Error |
| 409 | Error |
| 429 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 201,
  "metadata": {
    "id": "507f1f77bcf86cd799439011",
    "status": "pending",
    "unitPrice": 1,
    "totalPrice": 1
  }
}
```

---

<a id="getapipreorders"></a>

### GET `/api/preorders`

Admin xem tất cả yêu cầu

Hồ sơ cũ thiếu userId không tự gán theo email/số điện thoại. Danh sách có lịch sử trạng thái và ghi chú xử lý công khai với chủ yêu cầu.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/preorder.routes.js:22`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `page` | query | Không | integer |  |
| `limit` | query | Không | integer |  |
| `status` | query | Không | string: pending, contacted, confirmed, cancelled |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "items": [],
    "total": 1,
    "page": 1,
    "limit": 1
  }
}
```

---

<a id="getapipreordersmine"></a>

### GET `/api/preorders/mine`

Khách xem yêu cầu của mình

Hồ sơ cũ thiếu userId không tự gán theo email/số điện thoại. Danh sách có lịch sử trạng thái và ghi chú xử lý công khai với chủ yêu cầu.

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/preorder.routes.js:19`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `page` | query | Không | integer |  |
| `limit` | query | Không | integer |  |
| `status` | query | Không | string: pending, contacted, confirmed, cancelled |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "items": [],
    "total": 1,
    "page": 1,
    "limit": 1
  }
}
```

---

<a id="patchapipreordersidstatus"></a>

### PATCH `/api/preorders/{id}/status`

Admin chuyển trạng thái và thêm ghi chú

pending→contacted/confirmed/cancelled; contacted→confirmed/cancelled. confirmed/cancelled kết thúc. Ghi chú được khách nhìn thấy; không ghi dữ liệu nội bộ.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/preorder.routes.js:25`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `id` | path | Có | string |  |

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `status` | Có | string: contacted, confirmed, cancelled |  |
| `note` | Không | string |  |

Request minh họa:

```json
{
  "status": "contacted",
  "note": "Đã trao đổi nhu cầu với khách."
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 404 | Error |
| 409 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "id": "507f1f77bcf86cd799439011",
    "status": "pending"
  }
}
```

---

## Đánh giá

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| GET | `/api/reviews` | public | [Đọc đánh giá công khai](#getapireviews) |
| GET | `/api/reviews/moderation` | admin | [Admin đọc đánh giá pending](#getapireviewsmoderation) |
| PATCH | `/api/reviews/{id}/status` | admin | [Admin duyệt hoặc từ chối đánh giá](#patchapireviewsidstatus) |
| POST | `/api/create-preview-product` | user | [Gửi đánh giá từ đơn đã nhận và thanh toán](#postapicreatepreviewproduct) |
| GET | `/api/get-preview-product-home` | public | [Tối đa 10 đánh giá công khai mới nhất](#getapigetpreviewproducthome) |

<a id="getapireviews"></a>

### GET `/api/reviews`

Đọc đánh giá công khai

10 đánh giá/trang; productId lọc trước phân trang. Public gồm approved và legacy chưa có moderationStatus. Không trả email/userId; verifiedPurchase chỉ có khi gắn orderId.

**Nguồn:** `server/src/routes/previewProduct.routes.js:10`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `productId` | query | Không | string |  |
| `page` | query | Không | integer |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "items": [],
    "total": 1,
    "page": 1,
    "pageSize": 1
  }
}
```

---

<a id="getapireviewsmoderation"></a>

### GET `/api/reviews/moderation`

Admin đọc đánh giá pending

10 đánh giá/trang; productId lọc trước phân trang. Public gồm approved và legacy chưa có moderationStatus. Không trả email/userId; verifiedPurchase chỉ có khi gắn orderId.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/previewProduct.routes.js:11`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `productId` | query | Không | string |  |
| `page` | query | Không | integer |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "items": [],
    "total": 1,
    "page": 1,
    "pageSize": 1
  }
}
```

---

<a id="patchapireviewsidstatus"></a>

### PATCH `/api/reviews/{id}/status`

Admin duyệt hoặc từ chối đánh giá

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/previewProduct.routes.js:12`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `id` | path | Có | string |  |

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `status` | Có | string: approved, rejected |  |

Request minh họa:

```json
{
  "status": "approved"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 404 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "id": "507f1f77bcf86cd799439011",
    "status": "minh_hoa"
  }
}
```

---

<a id="postapicreatepreviewproduct"></a>

### POST `/api/create-preview-product`

Gửi đánh giá từ đơn đã nhận và thanh toán

Tên route preview là legacy. Cần đơn thuộc user có sản phẩm, status=delivered, paymentStatus=paid. Một đánh giá mới/user/product; chờ duyệt trước công khai.

Quyền middleware: phiên đăng nhập.

Giới hạn: 10 request/giờ/IP.

**Nguồn:** `server/src/routes/previewProduct.routes.js:13`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `productId` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `content` | Có | string |  |
| `rating` | Có | integer |  |

Request minh họa:

```json
{
  "productId": "507f1f77bcf86cd799439011",
  "content": "Nội dung đánh giá thử nghiệm.",
  "rating": 5
}
```

| HTTP | Response |
| --- | --- |
| 201 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 404 | Error |
| 409 | Error |
| 429 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 201,
  "metadata": {
    "id": "507f1f77bcf86cd799439011",
    "moderationStatus": "pending"
  }
}
```

---

<a id="getapigetpreviewproducthome"></a>

### GET `/api/get-preview-product-home`

Tối đa 10 đánh giá công khai mới nhất



**Nguồn:** `server/src/routes/previewProduct.routes.js:14`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

## Sản phẩm

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| POST | `/api/create-product` | admin | [Tạo sản phẩm](#postapicreateproduct) |
| GET | `/api/get-product-new` | public | [Tối đa 10 sản phẩm mới còn stock](#getapigetproductnew) |
| GET | `/api/product-catalog` | public | [Nhóm catalog cho trang chủ](#getapiproductcatalog) |
| GET | `/api/catalog-options` | public | [Lựa chọn bộ lọc và thương hiệu](#getapicatalogoptions) |
| GET | `/api/catalog-browse` | public | [Tìm kiếm, lọc kết hợp và phân trang catalog](#getapicatalogbrowse) |
| GET | `/api/get-product-by-id` | public | [Chi tiết sản phẩm và tối đa 8 sản phẩm liên quan](#getapigetproductbyid) |
| GET | `/api/get-product-by-category` | public | [Lọc danh mục kiểu cũ](#getapigetproductbycategory) |
| GET | `/api/get-product-manufactured` | public | [Tối đa 20 sản phẩm giảm từ 10%](#getapigetproductmanufactured) |
| GET | `/api/search` | public | [Gợi ý tối đa 8 kết quả tìm kiếm](#getapisearch) |
| GET | `/api/get-all-product` | admin | [Danh sách đầy đủ cho admin](#getapigetallproduct) |
| POST | `/api/update-product` | admin | [Cập nhật các field sản phẩm được gửi](#postapiupdateproduct) |
| DELETE | `/api/delete-product` | admin | [Xóa cứng sản phẩm](#deleteapideleteproduct) |

<a id="postapicreateproduct"></a>

### POST `/api/create-product`

Tạo sản phẩm

Giữ trạng thái preview/demo cho dữ liệu thử. verificationStatus=verified yêu cầu verificationNote. Giá/stock phải là JSON number đúng kiểu, không nhận chuỗi số.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/products.routes.js:8`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `ProductCreate`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `nameProduct` | Có | string |  |
| `modelNumber` | Có | string |  |
| `brand` | Có | string |  |
| `collection` | Không | string |  |
| `category` | Không | string |  |
| `origin` | Có | string |  |
| `gender` | Có | string |  |
| `glassMaterial` | Có | string |  |
| `movement` | Có | string |  |
| `powerReserve` | Không | string |  |
| `warrantyGlobal` | Không | string |  |
| `bezelMaterial` | Không | string |  |
| `strapMaterial` | Có | string |  |
| `faceColor` | Không | string |  |
| `waterResistance` | Có | string |  |
| `verificationNote` | Không | string |  |
| `boxPapers` | Không | string |  |
| `price` | Có | integer | Giá gốc VND. |
| `stock` | Có | integer |  |
| `discount` | Không | number |  |
| `dialDiameter` | Có | number |  |
| `caseThickness` | Không | number |  |
| `description` | Có | string | HTML được sanitize ở server. |
| `images` | Có | string | Chuỗi URL phân cách bằng dấu phẩy; http(s) hoặc /uploads/. |
| `publicationStatus` | Không | string: preview, published, archived |  |
| `verificationStatus` | Không | string: unverified, verified, demo |  |
| `condition` | Không | string: new, preowned |  |
| `allowPreorder` | Không | boolean |  |
| `expectedRestockAt` | Không | string / null | YYYY-MM-DD; chuỗi rỗng/null để bỏ ngày. |
| `shippingPackage` | Không | object / null |  |

Request minh họa:

```json
{
  "nameProduct": "Đồng hồ minh họa",
  "modelNumber": "DEMO-001",
  "brand": "Thương hiệu thử",
  "origin": "Chưa xác minh",
  "gender": "Nam",
  "glassMaterial": "Kính khoáng",
  "movement": "Quartz",
  "strapMaterial": "Da",
  "waterResistance": "Theo tài liệu mẫu",
  "description": "<p>Dữ liệu minh họa phục vụ kiểm thử.</p>",
  "images": "/uploads/products/fixture.png",
  "price": 1000000,
  "stock": 0,
  "dialDiameter": 40,
  "publicationStatus": "preview",
  "verificationStatus": "demo",
  "allowPreorder": false
}
```

| HTTP | Response |
| --- | --- |
| 201 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 201,
  "metadata": {
    "nameProduct": "minh_hoa",
    "modelNumber": "minh_hoa",
    "brand": "minh_hoa",
    "collection": "minh_hoa",
    "category": "minh_hoa",
    "origin": "minh_hoa",
    "gender": "minh_hoa",
    "glassMaterial": "minh_hoa"
  }
}
```

---

<a id="getapigetproductnew"></a>

### GET `/api/get-product-new`

Tối đa 10 sản phẩm mới còn stock

Có isNew=true. stock>0 không tự đồng nghĩa đủ điều kiện mua; cần kiểm tra publicationStatus và verificationStatus.

**Nguồn:** `server/src/routes/products.routes.js:9`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="getapiproductcatalog"></a>

### GET `/api/product-catalog`

Nhóm catalog cho trang chủ

10 sản phẩm/trang. type=new trả thêm sections, luôn page=1; nhóm gender/brand chỉ thuộc danh mục có tên bắt đầu Đồng hồ.

**Nguồn:** `server/src/routes/products.routes.js:10`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `type` | query | Không | string: new, gender, brand |  |
| `value` | query | Không | string | Bắt buộc cho gender/brand; gender chỉ Nam/Nữ. type=new không nhận value. |
| `page` | query | Không | integer |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "items": [],
    "total": 1,
    "page": 1,
    "pageSize": 1,
    "totalPages": 1,
    "section": {},
    "sections": []
  }
}
```

---

<a id="getapicatalogoptions"></a>

### GET `/api/catalog-options`

Lựa chọn bộ lọc và thương hiệu



**Nguồn:** `server/src/routes/products.routes.js:11`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "categories": [],
    "brands": [],
    "brandDetails": [],
    "priceMax": 1,
    "collection": [],
    "gender": [],
    "movement": [],
    "strapMaterial": []
  }
}
```

---

<a id="getapicatalogbrowse"></a>

### GET `/api/catalog-browse`

Tìm kiếm, lọc kết hợp và phân trang catalog

20 sản phẩm/trang; sort và lọc giá dùng giá sau giảm, làm tròn VND. Trang vượt cuối được chặn về trang cuối. stock=order cần published + allowPreorder + stock<=0. stock=in chỉ kiểm tra tồn dương.

**Nguồn:** `server/src/routes/products.routes.js:12`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `page` | query | Không | integer |  |
| `category` | query | Không | string | So khớp field; search hỗ trợ tiếng Việt có/không dấu. |
| `brand` | query | Không | string | So khớp field; search hỗ trợ tiếng Việt có/không dấu. |
| `search` | query | Không | string | So khớp field; search hỗ trợ tiếng Việt có/không dấu. |
| `collection` | query | Không | string | So khớp field; search hỗ trợ tiếng Việt có/không dấu. |
| `gender` | query | Không | string | So khớp field; search hỗ trợ tiếng Việt có/không dấu. |
| `movement` | query | Không | string | So khớp field; search hỗ trợ tiếng Việt có/không dấu. |
| `strapMaterial` | query | Không | string | So khớp field; search hỗ trợ tiếng Việt có/không dấu. |
| `faceColor` | query | Không | string | So khớp field; search hỗ trợ tiếng Việt có/không dấu. |
| `minPrice` | query | Không | number | Tối đa 2 chữ số thập phân; min không lớn hơn max. |
| `maxPrice` | query | Không | number | Tối đa 2 chữ số thập phân; min không lớn hơn max. |
| `minDiameter` | query | Không | number | Tối đa 2 chữ số thập phân; min không lớn hơn max. |
| `maxDiameter` | query | Không | number | Tối đa 2 chữ số thập phân; min không lớn hơn max. |
| `stock` | query | Không | string: all, in, order |  |
| `sort` | query | Không | string: newest, priceAsc, priceDesc, popular, discount |  |
| `ids` | query | Không | string | 1–20 ObjectId nối bằng dấu phẩy, dùng cho yêu thích/so sánh. |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "items": [],
    "total": 1,
    "page": 1,
    "pageSize": 1,
    "totalPages": 1
  }
}
```

---

<a id="getapigetproductbyid"></a>

### GET `/api/get-product-by-id`

Chi tiết sản phẩm và tối đa 8 sản phẩm liên quan

Archived trả 404. Preview/chưa xác minh vẫn có thể xem tham khảo. HTML description đã sanitize.

**Nguồn:** `server/src/routes/products.routes.js:13`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `id` | query | Có | string |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 404 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "product": {
      "nameProduct": "minh_hoa",
      "modelNumber": "minh_hoa",
      "brand": "minh_hoa",
      "collection": "minh_hoa",
      "category": "minh_hoa",
      "origin": "minh_hoa",
      "gender": "minh_hoa",
      "glassMaterial": "minh_hoa"
    },
    "relatedProducts": []
  }
}
```

---

<a id="getapigetproductbycategory"></a>

### GET `/api/get-product-by-category`

Lọc danh mục kiểu cũ

Không phân trang. price: 1 dưới 500k; 2 từ 500k–1tr; 3 từ 1–2tr; 5 trên 5tr. discount nhân 10 để lọc bằng chính xác. Tích hợp mới dùng catalog-browse.

**Nguồn:** `server/src/routes/products.routes.js:14`.

**Legacy/deprecated trong tài liệu:** không ưu tiên cho tích hợp mới.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `category` | query | Có | string | ID danh mục hoặc all. |
| `price` | query | Không | string: 0, 1, 2, 3, 5 |  |
| `discount` | query | Không | string |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="getapigetproductmanufactured"></a>

### GET `/api/get-product-manufactured`

Tối đa 20 sản phẩm giảm từ 10%

Tên route legacy; thực tế lọc discount>=10, không phải thuộc tính nhà sản xuất.

**Nguồn:** `server/src/routes/products.routes.js:15`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="getapisearch"></a>

### GET `/api/search`

Gợi ý tối đa 8 kết quả tìm kiếm



**Nguồn:** `server/src/routes/products.routes.js:16`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `valueSearch` | query | Có | string | Tên, thương hiệu, model hoặc bộ sưu tập. |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="getapigetallproduct"></a>

### GET `/api/get-all-product`

Danh sách đầy đủ cho admin

Không phân trang. category là tên danh mục, categoryId là ID gốc; chỉ endpoint này có cách biểu diễn category như vậy.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/products.routes.js:18`.

**Xác thực:** sessionCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="postapiupdateproduct"></a>

### POST `/api/update-product`

Cập nhật các field sản phẩm được gửi

Field không gửi được giữ nguyên. Không thay nameProduct bằng name. category là ID. expectedRestockAt nhận YYYY-MM-DD và lưu theo ngày Việt Nam.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/products.routes.js:19`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `ProductUpdate`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `id` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `nameProduct` | Không | string |  |
| `modelNumber` | Không | string |  |
| `brand` | Không | string |  |
| `collection` | Không | string |  |
| `category` | Không | string |  |
| `origin` | Không | string |  |
| `gender` | Không | string |  |
| `glassMaterial` | Không | string |  |
| `movement` | Không | string |  |
| `powerReserve` | Không | string |  |
| `warrantyGlobal` | Không | string |  |
| `bezelMaterial` | Không | string |  |
| `strapMaterial` | Không | string |  |
| `faceColor` | Không | string |  |
| `waterResistance` | Không | string |  |
| `verificationNote` | Không | string |  |
| `boxPapers` | Không | string |  |
| `price` | Không | integer | Giá gốc VND. |
| `stock` | Không | integer |  |
| `discount` | Không | number |  |
| `dialDiameter` | Không | number |  |
| `caseThickness` | Không | number |  |
| `description` | Không | string | HTML được sanitize ở server. |
| `images` | Không | string | Chuỗi URL phân cách bằng dấu phẩy; http(s) hoặc /uploads/. |
| `publicationStatus` | Không | string: preview, published, archived |  |
| `verificationStatus` | Không | string: unverified, verified, demo |  |
| `condition` | Không | string: new, preowned |  |
| `allowPreorder` | Không | boolean |  |
| `expectedRestockAt` | Không | string / null | YYYY-MM-DD; chuỗi rỗng/null để bỏ ngày. |
| `shippingPackage` | Không | object / null |  |

Request minh họa:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "stock": 0,
  "publicationStatus": "preview"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 404 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "nameProduct": "minh_hoa",
    "modelNumber": "minh_hoa",
    "brand": "minh_hoa",
    "collection": "minh_hoa",
    "category": "minh_hoa",
    "origin": "minh_hoa",
    "gender": "minh_hoa",
    "glassMaterial": "minh_hoa"
  }
}
```

---

<a id="deleteapideleteproduct"></a>

### DELETE `/api/delete-product`

Xóa cứng sản phẩm

Để ngừng bán, ưu tiên update publicationStatus=archived. Endpoint này xóa document thật; không dọn toàn bộ file/quan hệ.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/products.routes.js:20`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `id` | query | Có | string |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "nameProduct": "minh_hoa",
    "modelNumber": "minh_hoa",
    "brand": "minh_hoa",
    "collection": "minh_hoa",
    "category": "minh_hoa",
    "origin": "minh_hoa",
    "gender": "minh_hoa",
    "glassMaterial": "minh_hoa"
  }
}
```

---

## Vận chuyển GHN

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| GET | `/api/shipping/provinces` | user | [Danh sách tỉnh/thành GHN](#getapishippingprovinces) |
| GET | `/api/shipping/districts` | user | [Danh sách quận/huyện GHN](#getapishippingdistricts) |
| GET | `/api/shipping/wards` | user | [Danh sách phường/xã GHN](#getapishippingwards) |
| POST | `/api/shipping/quote` | user | [Tạo báo giá vận chuyển cho giỏ của mình](#postapishippingquote) |
| POST | `/api/shipping/admin/orders/{id}/preview` | admin | [Xem trước cước/kiện giao hàng](#postapishippingadminordersidpreview) |
| POST | `/api/shipping/admin/orders/{id}/create` | admin | [Tạo vận đơn GHN](#postapishippingadminordersidcreate) |
| POST | `/api/shipping/admin/orders/{id}/sync` | admin | [Đồng bộ vận đơn GHN theo mã](#postapishippingadminordersidsync) |

<a id="getapishippingprovinces"></a>

### GET `/api/shipping/provinces`

Danh sách tỉnh/thành GHN

Lấy ID địa phương từ phản hồi API, không tự đoán mã. Ward id trả string.

Quyền middleware: phiên đăng nhập.

Giới hạn: 60 request/phút/IP chung cho /api/shipping.

**Nguồn:** `server/src/routes/shipping.routes.js:13`.

**Xác thực:** sessionCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 429 | Error |
| 500 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="getapishippingdistricts"></a>

### GET `/api/shipping/districts`

Danh sách quận/huyện GHN

Lấy ID địa phương từ phản hồi API, không tự đoán mã. Ward id trả string.

Quyền middleware: phiên đăng nhập.

Giới hạn: 60 request/phút/IP chung cho /api/shipping.

**Nguồn:** `server/src/routes/shipping.routes.js:14`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `provinceId` | query | Có | integer |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 429 | Error |
| 500 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="getapishippingwards"></a>

### GET `/api/shipping/wards`

Danh sách phường/xã GHN

Lấy ID địa phương từ phản hồi API, không tự đoán mã. Ward id trả string.

Quyền middleware: phiên đăng nhập.

Giới hạn: 60 request/phút/IP chung cho /api/shipping.

**Nguồn:** `server/src/routes/shipping.routes.js:15`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `districtId` | query | Có | integer |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 429 | Error |
| 500 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="postapishippingquote"></a>

### POST `/api/shipping/quote`

Tạo báo giá vận chuyển cho giỏ của mình

Có ghi quote DB, gọi GHN để tính cước nhưng chưa tạo vận đơn. Quote sống 10 phút, gắn user/cart/method/giá hàng/coupon/kiện/địa chỉ. COD khách trả phí; VNPay được hỗ trợ ceil(grossFee/2). Mã địa phương trong ví dụ chỉ là placeholder.

Quyền middleware: phiên đăng nhập.

Giới hạn: 60 request/phút/IP chung cho shipping.

**Nguồn:** `server/src/routes/shipping.routes.js:16`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `cartId` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `method` | Có | string: COD, VNPAY |  |
| `nameCoupon` | Không | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `address` | Có | object |  |

Request minh họa:

```json
{
  "cartId": "507f1f77bcf86cd799439011",
  "method": "COD",
  "address": {
    "provinceId": 1,
    "districtId": 1,
    "wardCode": "<MA_PHUONG_THU>",
    "street": "Địa chỉ thử nghiệm"
  }
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 404 | Error |
| 409 | Error |
| 429 | Error |
| 500 | Error |
| 502 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "quoteId": "507f1f77bcf86cd799439011",
    "method": "COD",
    "expiresAt": "2026-11-02T03:00:00.000Z",
    "totalPrice": 1,
    "provider": "minh_hoa",
    "environment": "minh_hoa",
    "shopId": 1,
    "serviceTypeId": 1,
    "origin": {}
  }
}
```

---

<a id="postapishippingadminordersidpreview"></a>

### POST `/api/shipping/admin/orders/{id}/preview`

Xem trước cước/kiện giao hàng

Đơn confirmed, đúng môi trường/shop; VNPay phải paid. parcel tùy chọn, bỏ qua để dùng kiện snapshot. Không tạo vận đơn.

Quyền middleware: admin (isAdmin=true).

Giới hạn: 60 request/phút/IP chung cho shipping.

**Nguồn:** `server/src/routes/shipping.routes.js:25`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `id` | path | Có | string |  |

**Body:** `application/json`; tùy chọn. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `parcel` | Không | Parcel |  |

Request minh họa:

```json
{}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 404 | Error |
| 409 | Error |
| 429 | Error |
| 500 | Error |
| 502 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

<a id="postapishippingadminordersidcreate"></a>

### POST `/api/shipping/admin/orders/{id}/create`

Tạo vận đơn GHN

expectedFee phải bằng grossFee vừa preview; nếu đổi cước trả 409. Ghi khóa tạo để chống trùng; trạng thái unknown/creating cần sync trước khi thử lại. COD thu hộ totalPrice; VNPay không thu hộ lần nữa.

Quyền middleware: admin (isAdmin=true).

Giới hạn: 60 request/phút/IP chung cho shipping.

**Nguồn:** `server/src/routes/shipping.routes.js:26`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `id` | path | Có | string |  |

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `parcel` | Không | Parcel |  |
| `expectedFee` | Có | integer | Số nguyên VND, không dùng chuỗi có dấu chấm phân cách. |

Request minh họa:

```json
{
  "expectedFee": 30000
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 404 | Error |
| 409 | Error |
| 429 | Error |
| 500 | Error |
| 502 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

<a id="postapishippingadminordersidsync"></a>

### POST `/api/shipping/admin/orders/{id}/sync`

Đồng bộ vận đơn GHN theo mã

Gọi GHN bằng mã vận đơn hoặc client_order_code để khôi phục kết quả chưa rõ. Có cập nhật shipment DB; không có API hủy vận đơn GHN trong code này.

Quyền middleware: admin (isAdmin=true).

Giới hạn: 60 request/phút/IP chung cho shipping.

**Nguồn:** `server/src/routes/shipping.routes.js:27`.

**Xác thực:** sessionCookie.

| Tham số | Vị trí | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- | --- |
| `id` | path | Có | string |  |

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 404 | Error |
| 409 | Error |
| 429 | Error |
| 500 | Error |
| 502 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

## Tài khoản

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| POST | `/api/register` | public | [Đăng ký và gửi OTP email](#postapiregister) |
| POST | `/api/verify-email` | public | [Xác minh OTP đăng ký](#postapiverifyemail) |
| POST | `/api/resend-verification` | public | [Gửi lại OTP đăng ký](#postapiresendverification) |
| POST | `/api/login` | public | [Đăng nhập bằng email và mật khẩu](#postapilogin) |
| GET | `/api/auth` | user | [Đọc tài khoản từ phiên đăng nhập](#getapiauth) |
| GET | `/api/refresh-token` | public | [Làm mới access token bằng cookie refreshToken](#getapirefreshtoken) |
| GET | `/api/logout` | public | [Đăng xuất và xóa cookie phiên](#getapilogout) |
| POST | `/api/login-google` | public | [Đăng nhập bằng Google ID token](#postapilogingoogle) |
| POST | `/api/update-user` | user | [Cập nhật hồ sơ của phiên hiện tại](#postapiupdateuser) |
| POST | `/api/forgot-password` | public | [Yêu cầu OTP đặt lại mật khẩu](#postapiforgotpassword) |
| POST | `/api/verify-reset-password` | public | [Xác minh OTP quên mật khẩu](#postapiverifyresetpassword) |
| POST | `/api/reset-password` | public | [Đặt mật khẩu sau khi xác minh OTP](#postapiresetpassword) |

<a id="postapiregister"></a>

### POST `/api/register`

Đăng ký và gửi OTP email

Chưa tạo user trước xác minh. Email đã có trả 202 với thông báo chung; không dùng status để suy luận tồn tại tài khoản.

Giới hạn: 5 request/giờ/IP; thêm cooldown 60 giây và 5 mã/giờ/email + mục đích.

**Nguồn:** `server/src/routes/users.routes.js:13`; `server/src/controllers/users.controller.js:500`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `fullName` | Có | string |  |
| `email` | Có | string |  |
| `password` | Có | string |  |
| `phone` | Có | string |  |
| `address` | Có | string |  |

Request minh họa:

```json
{
  "fullName": "Nguyễn Văn An",
  "email": "khach@example.test",
  "password": "<MAT_KHAU_THU>",
  "phone": "0900000000",
  "address": "Địa chỉ thử nghiệm"
}
```

| HTTP | Response |
| --- | --- |
| 201 | object |
| 202 | object |
| 400 | Error |
| 429 | Error |
| 500 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 201,
  "metadata": {}
}
```

---

<a id="postapiverifyemail"></a>

### POST `/api/verify-email`

Xác minh OTP đăng ký

OTP là fixture minh họa, phải thay bằng mã nhận được. Xác minh reset đặt cookie tokenResetPassword sống 5 phút; xác minh đăng ký không tự đăng nhập.

Giới hạn: 15 request/15 phút/IP; OTP 10 phút, tối đa 5 lần sai.

**Nguồn:** `server/src/routes/users.routes.js:14`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `email` | Có | string |  |
| `otp` | Có | string |  |

Request minh họa:

```json
{
  "email": "khach@example.test",
  "otp": "123456"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 429 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

<a id="postapiresendverification"></a>

### POST `/api/resend-verification`

Gửi lại OTP đăng ký

Trả thông báo chung. forgot-password nuốt một số lỗi gửi mail để tránh dò email; 202 không bảo đảm email đã được chuyển phát.

Giới hạn: Chung bộ đếm gửi OTP: 5 request/giờ/IP; giới hạn thêm theo email.

**Nguồn:** `server/src/routes/users.routes.js:15`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `email` | Có | string |  |

Request minh họa:

```json
{
  "email": "khach@example.test"
}
```

| HTTP | Response |
| --- | --- |
| 202 | object |
| 400 | Error |
| 429 | Error |
| 500 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 202,
  "metadata": {}
}
```

---

<a id="postapilogin"></a>

### POST `/api/login`

Đăng nhập bằng email và mật khẩu

Đặt cookie token (15 phút), refreshToken (7 ngày), logged. Sai tài khoản/mật khẩu hiện trả 403, không phải 401. Không hỗ trợ Authorization: Bearer.

**Nguồn:** `server/src/routes/users.routes.js:16`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `email` | Có | string |  |
| `password` | Có | string |  |

Request minh họa:

```json
{
  "email": "khach@example.test",
  "password": "<MAT_KHAU_THU>"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "token": "minh_hoa",
    "refreshToken": "minh_hoa"
  }
}
```

---

<a id="getapiauth"></a>

### GET `/api/auth`

Đọc tài khoản từ phiên đăng nhập

Quyền middleware: phiên đăng nhập.

**Nguồn:** `server/src/routes/users.routes.js:17`.

**Xác thực:** sessionCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "auth": {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "minh_hoa",
      "email": "minh_hoa",
      "phone": "minh_hoa",
      "address": "minh_hoa",
      "isAdmin": false,
      "typeLogin": "email"
    }
  }
}
```

---

<a id="getapirefreshtoken"></a>

### GET `/api/refresh-token`

Làm mới access token bằng cookie refreshToken

Thiếu refresh cookie hiện trả 403; sai/hết hạn có thể 401. Chỉ trả token access mới, không xoay refreshToken.

**Nguồn:** `server/src/routes/users.routes.js:18`.

**Xác thực:** refreshCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "token": "minh_hoa",
    "refreshToken": "minh_hoa"
  }
}
```

---

<a id="getapilogout"></a>

### GET `/api/logout`

Đăng xuất và xóa cookie phiên

GET này có tác dụng ghi: xóa khóa phiên khi xác minh được token, clear token/refreshToken/logged. Cookie có thể không tồn tại.

**Nguồn:** `server/src/routes/users.routes.js:19`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

<a id="postapilogingoogle"></a>

### POST `/api/login-google`

Đăng nhập bằng Google ID token

Server verify ID token, audience và email_verified; trả cookie như đăng nhập thường.

**Nguồn:** `server/src/routes/users.routes.js:20`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `credential` | Có | string |  |

Request minh họa:

```json
{
  "credential": "<GOOGLE_ID_TOKEN_THU>"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {
    "token": "minh_hoa",
    "refreshToken": "minh_hoa"
  }
}
```

---

<a id="postapiupdateuser"></a>

### POST `/api/update-user`

Cập nhật hồ sơ của phiên hiện tại

Quyền middleware: phiên đăng nhập.

Hiện trạng cần lưu ý: Handler trả nguyên document user, có thể chứa password hash. Không lưu/log response này. Cần sửa server trước khi coi đây là DTO công khai ổn định.

**Nguồn:** `server/src/routes/users.routes.js:21`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `fullName` | Không | string |  |
| `phone` | Không | string |  |
| `address` | Không | string |  |

Request minh họa:

```json
{
  "fullName": "Nguyễn Văn An",
  "phone": "0900000000",
  "address": "Địa chỉ thử nghiệm"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

<a id="postapiforgotpassword"></a>

### POST `/api/forgot-password`

Yêu cầu OTP đặt lại mật khẩu

Trả thông báo chung. forgot-password nuốt một số lỗi gửi mail để tránh dò email; 202 không bảo đảm email đã được chuyển phát.

Giới hạn: Chung bộ đếm gửi OTP: 5 request/giờ/IP; giới hạn thêm theo email.

**Nguồn:** `server/src/routes/users.routes.js:23`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `email` | Có | string |  |

Request minh họa:

```json
{
  "email": "khach@example.test"
}
```

| HTTP | Response |
| --- | --- |
| 202 | object |
| 400 | Error |
| 429 | Error |
| 500 | Error |
| 503 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 202,
  "metadata": {}
}
```

---

<a id="postapiverifyresetpassword"></a>

### POST `/api/verify-reset-password`

Xác minh OTP quên mật khẩu

OTP là fixture minh họa, phải thay bằng mã nhận được. Xác minh reset đặt cookie tokenResetPassword sống 5 phút; xác minh đăng ký không tự đăng nhập.

Giới hạn: 15 request/15 phút/IP; OTP 10 phút, tối đa 5 lần sai.

**Nguồn:** `server/src/routes/users.routes.js:24`.

**Xác thực:** Không có cookie security bắt buộc trong contract; đọc lưu ý của endpoint..

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `email` | Có | string |  |
| `otp` | Có | string |  |

Request minh họa:

```json
{
  "email": "khach@example.test",
  "otp": "123456"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 429 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

<a id="postapiresetpassword"></a>

### POST `/api/reset-password`

Đặt mật khẩu sau khi xác minh OTP

Chỉ nhận cookie tokenResetPassword. Không nhận email/OTP thay cho bằng chứng xác minh ở bước này; hai mật khẩu phải giống nhau.

**Nguồn:** `server/src/routes/users.routes.js:25`.

**Xác thực:** resetCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `password` | Có | string |  |
| `confirmPassword` | Có | string |  |

Request minh họa:

```json
{
  "password": "<MAT_KHAU_MOI_THU>",
  "confirmPassword": "<MAT_KHAU_MOI_THU>"
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

## Báo cáo

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| GET | `/api/statistical` | admin | [Thống kê dashboard hiện có](#getapistatistical) |

<a id="getapistatistical"></a>

### GET `/api/statistical`

Thống kê dashboard hiện có

Không có query lọc ngày. metadata có users, products, orders, revenue, reviews. revenue cộng totalPrice đơn delivered theo createdAt; chưa là báo cáo hoàn tiền hay sổ kế toán.

Quyền middleware: admin (isAdmin=true).

Hiện trạng cần lưu ý: Lỗi tại handler có thể trả {message, error} khác envelope chung; chưa có bộ lọc chung/chuẩn doanh thu đầy đủ.

**Nguồn:** `server/src/routes/users.routes.js:27`.

**Xác thực:** sessionCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

---

## Quản trị tài khoản

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| GET | `/api/users` | admin | [Danh sách người dùng](#getapiusers) |
| POST | `/api/update-user-admin` | admin | [Đổi quyền admin của tài khoản](#postapiupdateuseradmin) |
| GET | `/api/admin` | admin | [Kiểm tra quyền admin](#getapiadmin) |

<a id="getapiusers"></a>

### GET `/api/users`

Danh sách người dùng

Quyền middleware: admin (isAdmin=true).

Hiện trạng cần lưu ý: Trả nguyên documents, chưa phân trang và có thể chứa password hash; xem giới hạn hiện trạng. Không có filter trạng thái khóa.

**Nguồn:** `server/src/routes/users.routes.js:28`.

**Xác thực:** sessionCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": []
}
```

---

<a id="postapiupdateuseradmin"></a>

### POST `/api/update-user-admin`

Đổi quyền admin của tài khoản

isAdminUser=true để cấp admin, false để thu quyền. Đây không phải API khóa/mở khóa tài khoản.

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/users.routes.js:29`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `id` | Có | string | MongoDB ObjectId; ví dụ hư cấu, cần thay bằng ID từ môi trường thử. |
| `isAdminUser` | Có | boolean |  |

Request minh họa:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "isAdminUser": false
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": "Thông báo minh họa từ server",
  "statusCode": 200,
  "metadata": {}
}
```

---

<a id="getapiadmin"></a>

### GET `/api/admin`

Kiểm tra quyền admin

Quyền middleware: admin (isAdmin=true).

**Nguồn:** `server/src/routes/users.routes.js:31`.

**Xác thực:** sessionCookie.

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 403 | Error |
| 500 | Error |

Response minh họa:

```json
{
  "message": true
}
```

---

## Chatbot Gemini

| Method | Path | Quyền middleware | Nội dung |
| --- | --- | --- | --- |
| POST | `/api/chatbot` | user | [Hỏi tư vấn đồng hồ](#postapichatbot) |

<a id="postapichatbot"></a>

### POST `/api/chatbot`

Hỏi tư vấn đồng hồ

metadata là text. Lỗi có errorCode: INVALID_INPUT, RATE_LIMIT, INVALID_KEY, MODEL_NOT_FOUND, TIMEOUT, QUOTA_429, UNAVAILABLE_5xx, NETWORK, BLOCKED_BY_SAFETY, EMPTY_RESPONSE, UNKNOWN. Timeout 30 giây/lần, tối đa 2 retry cho lỗi được phân loại; không stream. Context hiện tối đa 10 sản phẩm còn stock, chưa có retrieval RAG theo câu hỏi hoặc link sản phẩm.

Quyền middleware: phiên đăng nhập.

Giới hạn: 10 request/phút/IP.

**Nguồn:** `server/src/server.js:65`.

**Xác thực:** sessionCookie.

**Body:** `application/json`; bắt buộc. Schema `object`.

| Field | Bắt buộc | Kiểu | Ghi chú |
| --- | --- | --- | --- |
| `question` | Có | string |  |
| `history` | Không | array<object> |  |

Request minh họa:

```json
{
  "question": "Tư vấn đồng hồ máy pin trong ngân sách 3 triệu đồng."
}
```

| HTTP | Response |
| --- | --- |
| 200 | object |
| 400 | Error |
| 401 | Error |
| 422 | Error |
| 429 | Error |
| 500 | Error |
| 502 | Error |
| 503 | Error |
| 504 | Error |

Response minh họa:

```json
{
  "message": "Chatbot response",
  "statusCode": 200,
  "requestId": "fixture-request-id",
  "metadata": "Nội dung minh họa, không phải kết quả AI thực."
}
```

---
