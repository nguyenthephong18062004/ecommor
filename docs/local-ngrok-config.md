# Local and ngrok development

## Root cause report

Evidence below refers to the pre-fix snapshot `7201d5e`, except new files explicitly
identified as the fix. All paths exist in the working tree.

### [MỨC ĐỘ: Medium] Dev API phụ thuộc heuristic hostname

- **Vị trí:** `client/src/config/apiBaseUrl.js:1` (pre-fix snapshot), `client/src/config/request.jsx:8`.
- **Mô tả:** the old resolver retained the configured remote API when no tunnel hostname matched; rewriting was not scoped to dev.
- **Cách tái hiện:** configure a remote ngrok API and omit/mismatch VITE_TUNNEL_HOST, then disable the tunnel.
- **Tác động:** localhost API could depend on the tunnel; production could unexpectedly rewrite a loopback API URL.
- **Đề xuất sửa:** implemented explicit dev proxy/configured modes in `client/src/config/apiBaseUrl.js:1` and `client/src/config/runtimeUrls.js:3`.
- **Độ chắc chắn:** Chắc chắn, verified with pure resolver tests; the old matching-host case already worked and is not reported as broken.

### [MỨC ĐỘ: Medium] Ảnh bỏ qua chính sách same-origin

- **Vị trí:** `client/src/Components/CardBody/CardBody.jsx:16` (pre-fix snapshot), `client/src/Pages/InfoUser/OrderUser/OrderUser.jsx:129` (pre-fix snapshot).
- **Mô tả:** image consumers directly concatenated VITE_URL_IMAGE_API with inconsistent slashes.
- **Cách tái hiện:** open through ngrok with VITE_URL_IMAGE_API pointing to browser localhost, or open localhost with the image URL pointing to an offline tunnel.
- **Tác động:** product/blog/order images can fail independently of API requests.
- **Đề xuất sửa:** implemented shared uploadUrl and replaced every direct image-base consumer; uploads keep their existing stored paths.
- **Độ chắc chắn:** Chắc chắn from code and path tests; visual rendering of every stored image is not claimed.

### [MỨC ĐỘ: Medium] HTTP và Socket.IO dùng khác danh sách origin

- **Vị trí:** `server/src/socket.js:14`, `server/src/server.js:43` (pre-fix snapshot).
- **Mô tả:** Socket.IO used DOMAIN_URL alone; HTTP allowed legacy variables and local defaults but no explicit multiple-origin variable.
- **Cách tái hiện:** use localhost DOMAIN_URL and send a browser request with the public tunnel Origin.
- **Tác động:** the public origin is rejected; chat and HTTP requests can behave differently.
- **Đề xuất sửa:** implemented `server/src/config/cors.js:1`; set CLIENT_ORIGINS manually to the two required origins.
- **Độ chắc chắn:** Chắc chắn, tested with both origin values and production rejection of implicit localhost.

### [MỨC ĐỘ: Medium] Dev VNPay Return rời origin của callback

- **Vị trí:** `server/src/controllers/payments.controller.js:157` (pre-fix snapshot), `server/src/services/vnpay.service.js:24`.
- **Mô tả:** Return redirected to DOMAIN_URL even when the callback arrived through the public tunnel.
- **Cách tái hiện:** a verified Return on ngrok with DOMAIN_URL set to localhost.
- **Tác động:** remote browsers are redirected to their own localhost instead of the shop.
- **Đề xuất sửa:** implemented a relative dev redirect after existing verification; production keeps DOMAIN_URL.
- **Độ chắc chắn:** Chắc chắn from mocked controller tests; a real VNPay transaction is not verified.

| Severity | Count |
| --- | --- |
| Critical | 0 |
| High | 0 |
| Medium | 4 |
| Low | 0 |

## Changed files

| Files | Minimal change |
| --- | --- |
| client/src/config/apiBaseUrl.js, runtimeUrls.js | Shared explicit API/upload URL policy |
| client/src/config/request.jsx, axiosClient.jsx; client/src/hooks/useFetch.jsx; client/src/store/Provider.jsx | Consume the shared API base |
| client/src/Components/CardBody/CardBody.jsx, Header/Header.jsx, HomePage/Blog/Blog.jsx | Resolve stored image paths through uploadUrl |
| client/src/Pages/Blogs/Blogs.jsx, DetailBlog/DetailBlog.jsx, Cart/CartUser.jsx, CheckOut/CheckOut.jsx, DetailProduct/DetailProduct.jsx, PaymentSuccess/PaymentSuccess.jsx, InfoUser/OrderUser/OrderUser.jsx | Replace only image URL construction |
| client/src/Pages/Admin/Components/ManagerBlog/BlogAdmin.jsx, ManagerOrder/ManagerOrder.jsx | Resolve admin image/preview paths consistently |
| client/vite.config.js | Validate/log API mode; retain host/proxy/port settings |
| server/src/config/cors.js, server.js, socket.js | Share legacy-compatible origin whitelist |
| server/src/controllers/users.controller.js | Match logout cookie flags |
| server/src/controllers/payments.controller.js | Relative dev Return redirect only |
| client/test/*.mjs; server/test/origins.test.cjs, logout-cookie.test.cjs, dev-return.test.cjs | Resolver/proxy/origin/cookie/redirect verification |

Existing changes in run-dev.ps1, server/test/vnpay.test.js, checkout-request.test.cjs
and the pre-existing ngrok/VNPay docs were preserved. No commit or push was made.

This setup uses one frontend process and one existing backend:

```text
http://localhost:5173 ------------------+
                                      +--> Vite --> http://127.0.0.1:3000
https://grazing-seltzer-figurine.ngrok-free.dev --+
```

Vite proxies `/api`, `/uploads` and `/socket.io` without rewriting paths or query
strings. Tunnel availability has no effect on localhost requests. Vite 6.3.2
uses port 5173 with `strictPort: true`; an occupied port is an error, not an
automatic move to another port. No HMR host is pinned to ngrok.

## Frontend configuration

`VITE_API_MODE` is explicit configuration shared by HTTP, Socket.IO and uploads:

| Context | Mode | Behavior |
| --- | --- | --- |
| Vite dev, mode unset or `proxy` | Default dev mode | API and upload paths are relative to the page origin |
| Vite dev, `configured` | Separate API | Uses `VITE_URL_API` and `VITE_URL_IMAGE_API` |
| Production build | Existing behavior | Uses configured URLs, even if mode is `proxy` |

Dev startup reports when proxy mode takes precedence over the URL variables.
Do not put `/api` in `VITE_URL_API`: request paths already contain `/api`.
Uploaded paths already contain `/uploads`; the resolver avoids adding it twice
and normalizes the leading/trailing slash boundary. Absolute external images
remain unchanged. Nine currently readable products contained 25 relative image
paths and no absolute image URL; no database migration was needed. This sample
does not establish the contents of every order snapshot or every blog.

No real `.env` file was edited. Set the following manually if needed:

| Variable | File/process | Example | Apply |
| --- | --- | --- | --- |
| `VITE_API_MODE` | client/.env or frontend shell | `proxy` | Restart Vite; rebuild for production changes |
| `VITE_TUNNEL_HOST` | client/.env or frontend shell | `grazing-seltzer-figurine.ngrok-free.dev` | Restart Vite |
| `VITE_URL_API` | client/.env | `http://localhost:3000` (configured mode only) | Restart Vite or rebuild |
| `VITE_URL_IMAGE_API` | client/.env | `http://localhost:3000` (configured mode only) | Restart Vite or rebuild |
| `CLIENT_ORIGINS` | server/.env | `http://localhost:5173,http://127.0.0.1:5173,https://grazing-seltzer-figurine.ngrok-free.dev` | Reload backend environment |
| `NODE_ENV` | backend process | `development` for this dev topology | Reload backend environment |
| `VNPAY_RETURN_URL` | server/.env | `https://grazing-seltzer-figurine.ngrok-free.dev/api/vnpay-return` | Reload backend environment |
| `CLIENT_URL`, `DOMAIN_URL` | server/.env | Existing localhost values can remain in dev | Reload backend environment if changed |

HTTP and Socket.IO share `CLIENT_URL`, `DOMAIN_URL` and the optional comma-separated
`CLIENT_ORIGINS` list. Localhost defaults apply only outside production. Production
uses only explicitly configured origins. A request without Origin is accepted
for server-to-server callbacks; this does not bypass VNPay signature checks.

Cookie flags remain host-only: no Domain, Path=/, HttpOnly for tokens, non-HttpOnly
for `logged`. Dev uses SameSite=Lax and Secure=false; production keeps Strict and
Secure=true. Logout now clears cookies with the matching flags. Each hostname has
its own session: log in separately on localhost and ngrok. Trust proxy was not
changed; dev does not infer cookie flags from forwarded headers.

For Docker, `env_file` is loaded when the backend container is created. A simple
container restart does not reload changed env_file values. Recreate only the
backend through your existing Docker workflow after manual environment updates;
retain the existing CONNECT_DB, networks, replica set and volumes. Note that the
current backend container command runs `npm install` on startup. No container
recreation or dependency installation was performed during this task.

## Run locally

Keep the existing Docker MongoDB and backend running. In a frontend PowerShell:

```powershell
Set-Location 'D:\đồ án - test\watch-shop\client'
$env:VITE_API_MODE = 'proxy'
$env:VITE_TUNNEL_HOST = 'grazing-seltzer-figurine.ngrok-free.dev'
npm run dev
```

Open http://localhost:5173. These settings need no changes when the tunnel is
disabled. A missing tunnel hostname also permits localhost. If Vite already
occupies 5173, use that instance or restart it deliberately; do not launch a
second instance. Do not use run-dev.ps1 to replace the existing Docker database:
its fallback can start a standalone MongoDB and choose a different CONNECT_DB.

## Run through the existing tunnel

Keep the same Vite process and settings. The separately managed tunnel must
target `http://127.0.0.1:5173`. Open
https://grazing-seltzer-figurine.ngrok-free.dev. No ngrok process was started or
stopped by this task. Ensure backend CLIENT_ORIGINS includes this origin first.

## Google and VNPay

Google login uses GoogleLogin credentials, verified as ID tokens by the backend,
not an OAuth browser redirect flow. Add these Authorized JavaScript origins to
the web client identified by VITE_CLIENT_ID:

- http://localhost:5173
- https://grazing-seltzer-figurine.ngrok-free.dev

The backend GOOGLE_CLIENT must identify the same web client. Do not change Gmail
OAuth redirect URIs for this flow. No Google Console settings were changed.

VNPay routes exist:

- Return: https://grazing-seltzer-figurine.ngrok-free.dev/api/vnpay-return
- IPN: https://grazing-seltzer-figurine.ngrok-free.dev/api/vnpay-ipn

Set VNPAY_RETURN_URL manually as above and register the actual IPN URL with the
merchant/provider separately. No VNPAY_IPN_URL variable is consumed. Dev Return
redirects to `/payments/<orderId>` on the callback origin; production retains the
configured DOMAIN_URL redirect. Signature verification, amount validation,
idempotency and inventory/order updates were not changed. Public callbacks need
an active tunnel even when the purchase begins locally. A localhost purchase
can therefore return to ngrok, where a separate login may be required.

## Verification

Final verification: client lint PASS (0 errors, 0 warnings); production build PASS
(one existing chunk-size warning); client tests PASS (8); server tests PASS (19).
The MongoDB replica-set integration suite was skipped, with MONGODB_TEST_URI unset.
The existing Mongoose reserved `collection` warning remains unsuppressed.
Read-only localhost checks returned product JSON 200 and upload 200; uploaded
bytes matched the direct backend. That sampled upload used application/octet-stream,
so this is transport verification, not a claim of browser image rendering.
Google client IDs matched between the two env files without printing their values.
The backend env currently lacks CLIENT_ORIGINS: the public origin needs the manual
configuration described above before claiming that live tunnel login works.

Automated tests use an isolated HTTP/Socket.IO backend, random local ports, and
the actual Vite config. They never start the real server or connect to MongoDB.
They cover relative URL resolution with an offline configured ngrok URL, explicit
remote API mode, production preservation, localhost without a tunnel hostname,
both Host/Origin combinations, JSON and image responses, callback query bytes,
unlisted Host rejection, WebSocket transport, CORS whitelist, logout flags and
dev/production Return redirects. Host tests use node:http because Node fetch does
not reliably preserve a supplied Host header in this environment.

```powershell
# client/
node --test test
npm run lint
npm run build
# server/ (MONGODB_TEST_URI must be unset for mock-only verification)
npm test
```

Public ngrok routing, browser cookie persistence, Google login, actual merchant
callbacks and successful payment are CHUA KIEM CHUNG by the mock tests. Verify
manually on both origins: load products and a stored upload, log in, reload,
confirm Socket.IO connectivity, log out and check protected API access. With
the tunnel disabled manually, repeat localhost checks. With the tunnel active,
repeat through ngrok and then conduct an authorized sandbox VNPay transaction;
confirm the Return screen and provider IPN. No public provider result is claimed
from a mock callback URL.
