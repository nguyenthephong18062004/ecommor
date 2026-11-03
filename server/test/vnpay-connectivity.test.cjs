const { test } = require('node:test');
const assert = require('node:assert/strict');
const { callbackUrl, checkConnectivity } = require('../scripts/check-vnpay-connectivity.cjs');

const env = { VNPAY_RETURN_URL: 'https://shop.example/api/vnpay-return' };
const reply = (status, data, headers = {}) => new Response(JSON.stringify(data), {
    status, headers: { 'content-type': 'application/json', ...headers },
});
const validReply = (url) => url.pathname === '/api/vnpay-ipn'
    ? reply(200, { RspCode: '97' }) : reply(400, { message: 'Invalid VNPay signature' });

test('connectivity probes use empty read-only queries and require signature rejection on both origins', async () => {
    const calls = [];
    const result = await checkConnectivity(env, async (url, options) => {
        calls.push(url.toString());
        assert.equal(url.search, '');
        assert.equal(options.redirect, 'manual');
        assert.equal(options.method, undefined);
        assert.ok(options.signal instanceof AbortSignal);
        assert.equal(options.headers.Origin, url.pathname === '/api/vnpay-ipn' ? undefined : url.origin);
        return validReply(url);
    });
    assert.equal(result.pass, true);
    assert.equal(calls.length, 4);
    assert.equal(new Set(calls.map((url) => new URL(url).origin)).size, 2);
});

test('offline ngrok fails the check without exposing response bodies or signed URLs', async () => {
    const result = await checkConnectivity(env, async (url) => url.hostname === 'shop.example'
        ? reply(404, { message: 'sensitive-provider-body' }, { 'ngrok-error-code': 'ERR_NGROK_3200' })
        : validReply(url));
    assert.equal(result.pass, false);
    assert.equal(result.checks.filter((check) => !check.pass).length, 2);
    assert.equal(result.checks[2].code, 'ERR_NGROK_3200');
    assert.ok(!JSON.stringify(result).includes('sensitive-provider-body'));
});

test('redirects, browser interstitials, wrong routes and network errors cannot look healthy', async () => {
    for (const fetchRequest of [
        async () => new Response('', { status: 302 }),
        async () => new Response('<html>warning</html>', { status: 200 }),
        async () => reply(400, { message: 'generic route error' }),
        async () => reply(200, { RspCode: '00' }),
        async () => { throw new Error('network details must not leak'); },
    ]) {
        const result = await checkConnectivity(env, fetchRequest);
        assert.equal(result.pass, false);
        assert.ok(result.checks.every((check) => !check.pass));
        assert.ok(!JSON.stringify(result).includes('network details'));
    }
});

test('callback config rejects credentials, signed queries, non-HTTPS and unknown paths', () => {
    for (const value of [undefined, 'invalid', 'http://shop.example/api/vnpay-return',
        'https://user:password@shop.example/api/vnpay-return',
        'https://shop.example/api/vnpay-return?vnp_SecureHash=hidden',
        'https://shop.example/api/vnpay-return#fragment', 'https://shop.example/unknown']) {
        assert.throws(() => callbackUrl({ VNPAY_RETURN_URL: value }));
    }
    assert.equal(callbackUrl({ VNPAY_RETURN_URL: 'https://shop.example/api/check-payment-vnpay' }).pathname,
        '/api/check-payment-vnpay');
});
