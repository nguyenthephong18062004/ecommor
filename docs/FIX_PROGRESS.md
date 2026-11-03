# Fix Progress

## Phase 1 - Client lint

Status: Completed. Client lint has no remaining problems.

Completed commits:

- `7d3553d` removes unused DetailBlog code and stale ManagerStatistical code from `d23a30e`.
- `0da6b2c` removes the unused coupon product fetch.
- `bc22aab` removes inert admin UI state.
- `30a2330` adds loading state around product requests.
- `d827ba1` adds blog and category request error feedback and removes the redundant category refetch effect.
- `49f50b4` refetches user messages when the authenticated user changes.
- `156c958` deduplicates realtime admin messages when switching between conversations.

Verification after each client-code commit: `npm run build` exited with code 0. The current lint result is 0 errors and 0 warnings.

Manual testing needed:

- Verify product loading, blog delete error feedback, category retry, and realtime message deduplication in a running browser.
- Verify one category-filter change sends exactly one product request.

## Phase 2 - Cart request on login

Status: Completed with a regression fix.

- The Provider only calls `getCart` after the readable `logged` session cookie is present and after `requestAuth` succeeds.
- The protected cart route rejects a missing token through `authUser` with 401, and an authenticated user without a cart receives an empty cart with 200.
- `f170dc4` skips malformed stored product IDs and products that no longer exist, preventing `findById` from escalating a malformed cart item to 500.
- `server/test/cartUser.test.js` covers malformed and deleted product entries without requiring MongoDB.
- `c187910` reconciles malformed or deleted items out of the persisted cart and recalculates its total before coupon lookup, so the cart response and checkout use the same remaining items.

## Phase 3 - Admin access

Status: Waiting for manual verification.

- The admin API route was verified with an isolated Express runtime and resolves successfully.
- Server authorization verifies the cookie JWT and then checks `isAdmin === true` in MongoDB.
- The cause of a live redirect cannot be determined without the `/api/admin` response status and browser cookie attributes from the affected session.

## Phase 4 - Reload investigation

Status: The stale `logged` cookie hypothesis was disproved; the live reload root cause still needs browser evidence.

- Vite on port 5174 ran for about 60 seconds without `page reload`, `optimized dependencies changed`, 401, or 500 messages.
- The existing backend on port 3000 was left untouched. A second backend could not start because `server/src/server.js` currently fixes the port at 3000.
- Unauthenticated `GET /api/get-cart` and `GET /api/admin` both returned 401.
- A unit harness using the real axios interceptor showed a failed authenticated request removes `logged` before one redirect to `/login`; a subsequent 401 while already on `/login` does not redirect again.

## Phase 5 - Google OAuth

Status: CHỜ TÔI - configuration mismatch and documentation corrected.

- `client/.env` `VITE_CLIENT_ID` and `server/.env` `GOOGLE_CLIENT` do not match. No values are recorded here.
- The server validates the Google ID token with the server audience and requires `email_verified`; the Google Cloud Console still needs the actual local origins configured.
- The setup guide now recommends preserving the OAuth client already tied to the Gmail refresh token and setting `VITE_CLIENT_ID` to that same Web client ID, with `http://localhost` and `http://localhost:5173` as JavaScript origins.

## Phase 6 - Gemini chatbot

Status: Completed by code and isolated failure-path verification; no new change required.

- The service has input limits, rate limiting, timeout, safe logging, retry only for transient failures, and friendly classified errors.
- A process with the Gemini key disabled returned `INVALID_KEY` with HTTP 503 without contacting the external service.

## Phase 7 - VNPay review

Status: Completed by existing tests and code review; no new change required.

- `npm test` passes all 17 tests, including 11 MongoDB replica-set integration cases run against a temporary Docker MongoDB on port 27019 with a generated `vnpay_test_*` database. The temporary container was removed after the run.
- The covered flow verifies SHA-512 signatures, amount times 100, transaction reference, both success codes, idempotency, expiry, and GMT+7 timestamps.
