# VNPay deployment and regression checks

## Required configuration

Set these variables in `server/.env` privately. The code does not edit this file.
Docker Compose loads all variables through `env_file`; do not duplicate secret values in YAML.

```dotenv
VNPAY_TMN_CODE=<merchant code from VNPay>
VNPAY_SECRET_KEY=<merchant signing key from VNPay>
VNPAY_ENV=sandbox
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/api/vnpay-return
DOMAIN_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173
```

For deployment, replace `VNPAY_RETURN_URL` with your public HTTPS backend URL
and `DOMAIN_URL` / `CLIENT_URL` with your public HTTPS frontend URL.
Register `https://<public-api-host>/api/vnpay-ipn` with VNPay. Development IPN
requires a public tunnel that forwards `/api/vnpay-ipn` to the backend.
The IPN URL is registered with VNPay, not sent as a payment URL parameter.
The old `/api/check-payment-vnpay` route remains a read-only return alias.

Production credentials require `VNPAY_ENV=production` and
`VNPAY_URL=https://pay.vnpay.vn/paymentv2/vpcpay.html`.
Do not mix sandbox and production merchant credentials. Missing configuration
returns an explicit 503 on checkout; callback processing returns IPN code 99.

The backend trusts forwarding headers only from `TRUST_PROXY`. Docker sets this
to private proxy networks and binds backend port 3000 to host loopback.
Nginx overwrites `X-Forwarded-For` with the connected client's address.
For an additional load balancer, configure trusted addresses explicitly.

## MongoDB transactions

Checkout requires a replica set (MongoDB Atlas already supports transactions).
Docker Compose starts MongoDB with `--replSet rs0`, initializes the single-node
replica set during health checks, and waits for a primary before starting backend.
The existing external data volume is retained; no database is dropped.
Back up the existing volume before changing deployment topology.
For a local MongoDB instance, initialize a replica set and set `CONNECT_DB`
accordingly. Standalone MongoDB checkout returns 503 without partial reservations.
An existing replica set with a different name/member address needs its matching
connection string; do not run `rs.initiate` again on an initialized replica set.

## Payment lifecycle

Checkout accepts `cartId` and validates its ownership. It recalculates prices from
DB, rounds discounted unit prices to integer VND, validates coupon dates,
minimum subtotal and availability, and snapshots product names, images and prices.
Current shipping policy is free shipping (`shippingFee=0`); client totals are ignored.
One transaction reserves inventory/coupon, creates the order and payment attempt,
and removes that cart. Repeated requests with the same cart ID return the same order
or active payment URL. Stock and coupon availability use conditional decrements.

Return URL verifies the signature and redirects to the order page without changing
data. IPN verifies HMAC-SHA512 using a constant-time comparison, merchant code,
reference and amount; both response and transaction status must be `00` to mark paid.
IPN replies with `RspCode` 00/01/02/04/97/99. Transaction retries serialize competing
callbacks; unique indexes protect cart checkout keys and transaction references.

Failed IPN releases reservations once. A worker checks overdue attempts every 30
seconds, including after restart. After 15 minutes an unconfirmed attempt expires
and releases reservations. Authenticated retry uses the immutable order snapshot,
checks stock and coupon again, and creates a new reference. Active retries return
the existing URL. The order remains available in order history even if the browser
never returns from VNPay.

A successful IPN received after cancellation/expiry or for an older attempt is
recorded as `refund_required`. It does not reopen a cancelled order or oversell.
If a newer pending attempt holds resources, those are released and that attempt
is cancelled locally. Admin sees the reconciliation status and all attempts
(transaction number, bank, amount, response/status codes, pay date, receipt time).
No card details are stored. **Refunds are not automatic:** an operator must reconcile
these exceptions with VNPay and refund the confirmed transaction using its merchant
portal/API. Paid online orders cannot be cancelled through the normal cancel endpoint.

Existing VNPay orders created by the former return-only flow have no attempt history.
Reconcile those orders with VNPay before assigning payment status. The code does
not infer that legacy orders are paid and does not rewrite historical data.

## Automated checks

```powershell
cd server
npm test
# Optional: a dedicated replica set endpoint; tests create a new vnpay_test_* database.
$env:MONGODB_TEST_URI = 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true'
npm test
Remove-Item Env:MONGODB_TEST_URI
cd ../client
npm run lint
npm run build
```

Tests use generated test signing credentials. The integration suite is skipped
without `MONGODB_TEST_URI`; it never uses the application database `watch` and
never drops a database. Its fixtures remain in the generated test database.

## Sandbox manual checks

Use the current NCB test card and OTP from the official VNPay installation guide:
https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
Never use a real card for these tests. Register the public IPN endpoint first.

| Scenario | Steps | Expected |
| --- | --- | --- |
| Success | Checkout with NCB, complete test OTP, wait for IPN | One order/attempt; paid; inventory/coupon reserved once; receipt has DB snapshot prices |
| Cancel | Cancel on VNPay and return | Return only displays; failure IPN releases once; if no IPN arrives, expiry releases within 30 seconds after deadline |
| OTP error/timeout | Submit incorrect OTP until rejected or wait past deadline | No paid status; failed/expired; inventory/coupon restored; retry uses new reference |
| Tampered amount | Alter callback amount while keeping hash | HTTP 400 on return; IPN 97; unchanged data. A validly signed wrong-amount test gives IPN 04 |
| Missing/altered hash | Remove or modify callback hash | Return HTTP 400; IPN 97; unchanged data |
| Replay | Send a valid IPN several times and reload return | First IPN 00, subsequent IPNs 02; no additional reservations or releases |
| Concurrent IPN | Send the same signed IPN twice in parallel | One 00 and one 02; one state change |
| Paid/cancelled order | Retry paid/cancelled order; send late signed successful IPN for cancelled order | Retry 409; cancelled order stays cancelled; late success is recorded for reconciliation/refund |
| Last stock | Two users checkout the final unit concurrently | One checkout succeeds; one rejects; stock never negative |
| Concurrent cancel/delivery | Repeat cancel or delivered transition in parallel | Inventory/coupon released once; soldCount incremented once; no backward transitions |

Official protocol reference:
https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
