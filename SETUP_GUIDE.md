# 📦 ECOMMOR — Hướng Dẫn Cài Đặt & Tích Hợp

## Node.js cho project

Project dùng **Node 22.21.1** theo `.nvmrc`, tối thiểu **22.12.0** để tương thích dependency bảo mật đã duyệt. Docker dùng Node 22. `run-dev.ps1` và `run-vnpay-dev.ps1` chọn binary Node của project qua `scripts/project-node.ps1`, không đổi Node mặc định của máy.

Nếu dùng terminal trực tiếp, kiểm tra `node --version` trước `npm ci`, `npm test` và `npm run build`; dùng đúng binary Node 22 hoặc môi trường riêng. Hướng dẫn kết quả nâng cấp và xác minh nằm tại [báo cáo triển khai](docs/storefront-upgrades-implementation.md).

## Tài liệu API

Bộ [tài liệu API tiếng Việt](docs/api/README.md) gồm tham chiếu 88 thao tác HTTP, OpenAPI, Postman Collection/environment, cookie authentication, workflow COD/VNPay/GHN/OTP, Socket.IO và các giới hạn hiện trạng. Bắt đầu tại README của bộ tài liệu để chọn file và cách gọi thử phù hợp.

## Email OTP

The OTP mail service uses `USER_EMAIL`, `GOOGLE_CLIENT`, `GOOGLE_SECRET`, `REDIRECT_URI`, and `REFRESH_TOKEN` from `server/.env`. Keep `USER_EMAIL` as the Gmail account that granted the refresh token. `EMAIL_USER` is not used by the shared mail service and can be removed from a future local configuration cleanup; do not commit `.env` files.

Create the Google OAuth client, enable Gmail API, and add `https://developers.google.com/oauthplayground` as an authorized redirect URI before obtaining a refresh token through OAuth Playground. A Google OAuth consent screen in Testing mode can invalidate refresh tokens after seven days; publish the consent screen or renew the token when mail checks report `INVALID_GRANT`.

For development without Gmail, use Ethereal or another isolated mail account. Never use real customer addresses during automated tests.

To check configured delivery manually, set `MAIL_CHECK_RECIPIENT` locally, then run:

```powershell
cd server
npm run mail:check
```

The command prints only `OK` or an error category (`INVALID_GRANT`, `INVALID_CLIENT`, `UNAUTHORIZED_CLIENT`, `NETWORK`, or `UNKNOWN`). It never prints credentials, tokens, OTP values, or message content.

> Tài liệu này hướng dẫn cấu hình tất cả các biến môi trường và dịch vụ bên thứ ba cần thiết để chạy được project.

---

## 📁 Cấu Trúc File `.env`

Project sử dụng **2 file `.env`** riêng biệt:

```
ecommor/
├── server/
│   └── .env        ← Biến môi trường phía Backend
└── client/
    └── .env        ← Biến môi trường phía Frontend (Vite)
```

---

## 🔧 1. Backend — `server/.env`

Tạo file `server/.env` với nội dung sau:

```env
# ===========================
# 🗄️  DATABASE
# ===========================
CONNECT_DB=mongodb://localhost:27017/watch
# Nếu dùng MongoDB Atlas: mongodb+srv://<user>:<pass>@cluster.mongodb.net/watch

# ===========================
# 🌐  DOMAIN / URL
# ===========================
DOMAIN_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173
NODE_ENV=development
# Khi deploy production: thay bằng domain thật, ví dụ: https://yourdomain.com

# ===========================
# 🔑  JWT & CRYPTO
# ===========================
JWT_SECRET=your_jwt_secret_key_here
# Tạo chuỗi ngẫu nhiên mạnh, ví dụ: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

SECRET_CRYPTO=your_crypto_secret_key_here
# Cùng giá trị với VITE_SECRET_CRYPTO ở client/.env — dùng để mã hóa thông tin user

# ===========================
# 🤖  GEMINI AI (Chatbot tư vấn sản phẩm)
# ===========================
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
# Hướng dẫn lấy key: xem Mục 2 bên dưới

# ===========================
# 📧  NODEMAILER — Gửi Email OTP (Quên mật khẩu)
# ===========================
USER_EMAIL=your_gmail@gmail.com
EMAIL_USER=your_gmail@gmail.com
GOOGLE_CLIENT=your_google_oauth_client_id
GOOGLE_SECRET=your_google_oauth_client_secret
REDIRECT_URI=https://developers.google.com/oauthplayground
REFRESH_TOKEN=your_google_refresh_token
# Hướng dẫn lấy OAuth2 credentials: xem Mục 3 bên dưới

# ===========================
# 💳  VNPAY — Thanh Toán Online
# ===========================
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_SECRET_KEY=your_vnpay_secret_key
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/api/vnpay-return
# Hướng dẫn đăng ký VNPay: xem Mục 4 bên dưới
```

---

## 🎨 2. Frontend — `client/.env`

Tạo file `client/.env` với nội dung sau:

```env
# ===========================
# 🌐  API URL
# ===========================
VITE_URL_API=http://localhost:3000
# URL trỏ đến Backend server

VITE_URL_IMAGE_API=http://localhost:3000/uploads
# URL trỏ đến thư mục uploads của server (ảnh sản phẩm, blog)

# ===========================
# 🔑  CRYPTO (phải khớp với SECRET_CRYPTO trong server/.env)
# ===========================
VITE_SECRET_CRYPTO=your_crypto_secret_key_here

# ===========================
# 🔐  GOOGLE OAUTH (Đăng nhập bằng Google)
# ===========================
VITE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
# Hướng dẫn lấy Client ID: xem Mục 5 bên dưới
```

---

## 📋 Hướng Dẫn Chi Tiết Từng Dịch Vụ

---

### 🤖 Mục 2 — Gemini AI API Key

Chatbot tư vấn đồng hồ sử dụng **Google Gemini Flash**. Backend mặc định dùng model ổn định `gemini-2.5-flash`, hoặc bạn có thể đổi bằng biến `GEMINI_MODEL`.

**Các bước lấy API Key:**

1. Truy cập [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Đăng nhập bằng tài khoản Google
3. Nhấn **"Create API key"** → Chọn project Google Cloud
4. Sao chép key và đặt vào `server/.env`:
   ```
   GEMINI_API_KEY=AIzaSy...
   GEMINI_MODEL=gemini-2.5-flash
   ```

> **Lưu ý:** `gemini-1.5-flash` đã bị Google shutdown từ 29/09/2025, không nên dùng lại model này.
> Nếu không cấu hình key, chatbot sẽ vẫn hoạt động nhưng trả về thông báo lỗi thân thiện.

---

### 📧 Mục 3 — Nodemailer + Google OAuth2 (Gửi Email OTP)

Tính năng **Quên mật khẩu** gửi OTP qua Gmail bằng OAuth2.

**Bước 1: Tạo OAuth2 Credentials trên Google Cloud**

1. Vào [https://console.cloud.google.com](https://console.cloud.google.com)
2. Tạo project mới (hoặc chọn project có sẵn)
3. Vào **APIs & Services → Credentials**
4. Nhấn **"+ Create Credentials" → OAuth client ID**
5. Chọn loại ứng dụng: **Web application**
6. Thêm Authorized redirect URI:
   ```
   https://developers.google.com/oauthplayground
   ```
7. Nhấn **Create** → Sao chép **Client ID** và **Client Secret**

**Bước 2: Bật Gmail API**

1. Vào **APIs & Services → Library**
2. Tìm **"Gmail API"** → Nhấn **Enable**

**Bước 3: Lấy Refresh Token**

1. Truy cập [https://developers.google.com/oauthplayground](https://developers.google.com/oauthplayground)
2. Nhấn ⚙️ (Settings) góc trên phải → Tích **"Use your own OAuth credentials"**
3. Nhập **Client ID** và **Client Secret** vừa tạo
4. Ở cột trái, tìm **"Gmail API v1"** → Tích chọn `https://mail.google.com/`
5. Nhấn **"Authorize APIs"** → Đăng nhập Gmail muốn dùng để gửi mail
6. Nhấn **"Exchange authorization code for tokens"**
7. Sao chép **Refresh Token**

**Bước 4: Điền vào `server/.env`**

```env
USER_EMAIL=your_gmail@gmail.com
EMAIL_USER=your_gmail@gmail.com
GOOGLE_CLIENT=<Client ID từ Bước 1>
GOOGLE_SECRET=<Client Secret từ Bước 1>
REDIRECT_URI=https://developers.google.com/oauthplayground
REFRESH_TOKEN=<Refresh Token từ Bước 3>
```

---

### 💳 Mục 4 — VNPay (Thanh Toán Online)

**Môi trường Sandbox (để test):**

1. Đăng ký tài khoản test tại [https://sandbox.vnpayment.vn/apis/](https://sandbox.vnpayment.vn/apis/)
2. Sau khi đăng ký, nhận được:
   - `vnp_TmnCode` (TMN Code)
   - `vnp_HashSecret` (Secret Key)
3. Điền vào `server/.env`:

```env
VNPAY_TMN_CODE=XXXXXXXX              # TMN Code từ VNPay
VNPAY_SECRET_KEY=your_hash_secret    # Hash Secret Key
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/api/vnpay-return
```

**Thẻ test VNPay Sandbox:**

| Thông tin        | Giá trị               |
| ----------------- | ----------------------- |
| Ngân hàng       | NCB                     |
| Số thẻ          | `9704198526191432198` |
| Tên chủ thẻ    | `NGUYEN VAN A`        |
| Ngày phát hành | `07/15`               |
| OTP               | `123456`              |

> **Production:** Cần ký hợp đồng với VNPay để có credentials thật.

---

### 🔐 Mục 5 — Google OAuth (Đăng Nhập Bằng Google)

Ứng dụng hiện dùng `GOOGLE_CLIENT` ở server cho cả Gmail OAuth2 và audience khi xác minh Google Sign-In. Để không làm mất hiệu lực `REFRESH_TOKEN`, cách ít rủi ro nhất là giữ nguyên `GOOGLE_CLIENT`, `GOOGLE_SECRET`, `REDIRECT_URI`, `REFRESH_TOKEN` và đặt `VITE_CLIENT_ID` bằng đúng Client ID đó. Client này phải là loại **Web application**.

**Thêm Authorized JavaScript origins:**

1. Vào [Google Cloud Console](https://console.cloud.google.com) → Credentials → Chọn OAuth client đã tạo
2. Thêm vào **Authorized JavaScript origins**:
   ```
   http://localhost
   http://localhost:5173
   ```
   Nếu chạy Vite bằng `127.0.0.1`, thêm cả `http://127.0.0.1:5173`.
3. Giữ `https://developers.google.com/oauthplayground` trong **Authorized redirect URIs** cho luồng lấy Gmail refresh token. Luồng `GoogleLogin` hiện tại dùng popup và không cần thêm redirect URI localhost.
4. Đặt cùng Client ID vào `client/.env`:
   ```
   VITE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
   ```

---

### 🗄️ Mục 6 — MongoDB

**Option 1: Chạy local bằng Docker (khuyến nghị)**

```bash
# Chạy MongoDB container (đã có sẵn trong docker-compose.yaml)
docker-compose up -d mongodb
```

```env
CONNECT_DB=mongodb://localhost:27017/watch
```

**Option 2: MongoDB Atlas (Cloud miễn phí)**

1. Đăng ký tại [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Tạo **Free Cluster (M0)**
3. Vào **Database Access** → Tạo user
4. Vào **Network Access** → Thêm IP `0.0.0.0/0` (allow all)
5. Vào **Clusters → Connect → Connect your application** → Sao chép connection string

```env
CONNECT_DB=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/watch
```

---

## 🚀 Chạy Project

### Phát triển Local

```bash
# Cài dependencies
cd server && npm install
cd ../client && npm install

# Chạy backend (terminal 1)
cd server
npm run dev

# Chạy frontend (terminal 2)
cd client
npm run dev
```

**Hoặc dùng script có sẵn:**

```powershell
# Chạy cả 2 cùng lúc bằng PowerShell script
.\run-dev.ps1
```

---

### Chạy bằng Docker

```bash
# Chạy toàn bộ stack (MongoDB + Backend + Nginx)
docker-compose up -d

# Xem logs
docker-compose logs -f backend

# Dừng tất cả
docker-compose down
```

> **Lưu ý khi dùng Docker:** Backend trong docker-compose đã được thiết lập sẵn `CONNECT_DB=mongodb://mongodb:27017/watch`.
> Các biến còn lại (GEMINI_API_KEY, VNPAY, GOOGLE, ...) cần được thêm vào phần `environment` trong `docker-compose.yaml`.

---

## ✅ Checklist Tích Hợp

| Dịch vụ    | File                              | Biến                                                        | Bắt buộc                         |
| ------------ | --------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| MongoDB      | `server/.env`                   | `CONNECT_DB`                                               | ✅ Bắt buộc                      |
| JWT Secret   | `server/.env`                   | `JWT_SECRET`                                               | ✅ Bắt buộc                      |
| Crypto Key   | `server/.env` + `client/.env` | `SECRET_CRYPTO` / `VITE_SECRET_CRYPTO`                   | ✅ Bắt buộc                      |
| API URL      | `client/.env`                   | `VITE_URL_API`                                             | ✅ Bắt buộc                      |
| Image URL    | `client/.env`                   | `VITE_URL_IMAGE_API`                                       | ✅ Bắt buộc                      |
| Gemini AI    | `server/.env`                   | `GEMINI_API_KEY`                                           | ⚠️ Tùy chọn (chatbot)          |
| Nodemailer   | `server/.env`                   | `GOOGLE_CLIENT`, `GOOGLE_SECRET`, `REFRESH_TOKEN`, ... | ⚠️ Tùy chọn (quên mật khẩu) |
| VNPay        | `server/.env`                   | `VNPAY_TMN_CODE`, `VNPAY_SECRET_KEY`, ...                | ⚠️ Tùy chọn (thanh toán)      |
| Google OAuth | `client/.env` + `server/.env` | `VITE_CLIENT_ID`, `GOOGLE_CLIENT`                        | ⚠️ Tùy chọn (login Google)     |
| Domain URL   | `server/.env`                   | `DOMAIN_URL`, `CLIENT_URL`                               | ✅ Bắt buộc                      |
