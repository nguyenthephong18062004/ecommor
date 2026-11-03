# One-tunnel development

Browser -> ngrok HTTPS -> Vite 127.0.0.1:5173 -> backend 127.0.0.1:3000.
Vite proxies /api, /uploads and /socket.io without rewriting paths or query strings.
Socket.IO upgrades are proxied; no custom HMR settings are needed by default.
This configuration is for Vite dev only. Production uses nginx/default.conf.

## Frontend

Run from client/ in a separate PowerShell session. Replace the placeholder with
your assigned tunnel hostname. These process variables override .env without
editing it. Do not put backend secrets in VITE_* variables.

```powershell
$env:VITE_TUNNEL_HOST = '<your-tunnel-hostname>'
$origin = "https://$env:VITE_TUNNEL_HOST"
$env:VITE_URL_API = $origin
$env:VITE_URL_IMAGE_API = $origin
npm run dev
```

API requests already include /api: origin + /api/get-all-product is the final URL.
Do not append /api to VITE_URL_API or /uploads to VITE_URL_IMAGE_API.
An explicit origin also supports the current Socket.IO client and image consumers.
Image consumers currently concatenate slashes inconsistently; inspect product,
blog and order images with real stored paths before claiming image coverage.

For local-only use, set both URL variables to http://localhost:5173 and remove
VITE_TUNNEL_HOST from this session. Restart Vite after changing variables.
Vite exits if port 5173 is occupied; stop the old instance before restarting.
When launching ngrok separately, target http://127.0.0.1:5173 only.
The allowed host must be a specific hostname, without protocol, path or wildcard.

## Backend and provider configuration

Before starting the backend from server/, set process variables in its own shell:

```powershell
$origin = 'https://<your-tunnel-hostname>'
$env:DOMAIN_URL = $origin
$env:CLIENT_URL = $origin
$env:VNPAY_RETURN_URL = "$origin/api/vnpay-return"
```

Restart the backend to apply these values. Keep existing sandbox credentials
server-side (VNPAY_TMN_CODE, VNPAY_SECRET_KEY, VNPAY_URL, VNPAY_ENV).
Use a disposable sandbox database with the replica set required by transactions.
Do not use run-dev.ps1 for this setup: it overrides DOMAIN_URL/CLIENT_URL with
localhost and starts a standalone MongoDB process.

Configure GET https://<your-tunnel-hostname>/api/vnpay-ipn with VNPay separately.
There is no VNPAY_IPN_URL consumer to configure in this application.
Add the tunnel origin to Google Authorized JavaScript origins when testing Google
login. Do not change Gmail OAuth redirect settings for this frontend flow.
Do not enable trust proxy=true globally; retain the deployment-specific trust list.

## Manual verification

- GET /api/get-all-product must return JSON, not the Vite HTML fallback.
- GET /uploads/products/<existing-file> must return an image.
- Login and reload must preserve the session; /socket.io must connect.
- Return must preserve the complete signed query and show the matching order.
- An invalid IPN signature must return JSON RspCode 97.
- On an authorized sandbox transaction, repeated valid IPNs must not update twice
  (first confirmation 00, duplicate 02).
- Opening a callback URL alone does not establish that payment works.

Run npm run lint and npm run build from client/. Run npm test from server/ only
after reviewing its database setup. A live backend can expire pending orders;
starting it is not a read-only verification step.
