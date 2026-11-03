const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getAllowedOrigins, getCorsOptions } = require('../src/config/cors');

test('HTTP and Socket.IO origin list supports both dev origins and legacy variables', () => {
    const tunnel = 'https://grazing-seltzer-figurine.ngrok-free.dev';
    const env = { NODE_ENV: 'development', CLIENT_URL: 'http://localhost:5173', DOMAIN_URL: tunnel,
        CLIENT_ORIGINS: ` http://localhost:5173, ${tunnel} ` };
    assert.equal(getAllowedOrigins(env).filter((origin) => origin === tunnel).length, 1);
    const cors = getCorsOptions(env);
    assert.equal(cors.credentials, true);
    for (const origin of ['http://localhost:5173', tunnel, undefined]) {
        cors.origin(origin, (error, allowed) => { assert.equal(error, null); assert.equal(allowed, true); });
    }
    cors.origin('https://evil.example.test', (error) => assert.match(error.message, /CORS/));
});

test('production does not inherit development origins', () => {
    const env = { NODE_ENV: 'production', CLIENT_URL: 'https://shop.example.test',
        VNPAY_RETURN_URL: 'https://callback.example.test/api/vnpay-return' };
    assert.deepEqual(getAllowedOrigins(env), ['https://shop.example.test']);
    getCorsOptions(env).origin('http://localhost:5173', (error) => assert.ok(error));
});

test('dev accepts only the exact explicitly configured public VNPay callback origin', () => {
    const origin = 'https://shop.ngrok-free.dev';
    const env = { VNPAY_RETURN_URL: `${origin}/api/vnpay-return` };
    getCorsOptions(env).origin(origin, (error, allowed) => {
        assert.equal(error, null);
        assert.equal(allowed, true);
    });
    for (const other of ['https://other.ngrok-free.dev', 'http://shop.ngrok-free.dev', `${origin}.evil.test`]) {
        getCorsOptions(env).origin(other, (error) => assert.ok(error));
    }
    for (const value of ['invalid', 'http://shop.ngrok-free.dev/api/vnpay-return',
        'https://user:password@shop.ngrok-free.dev/api/vnpay-return',
        `${origin}/unknown`, `${origin}/api/vnpay-return?query=1`, `${origin}/api/vnpay-return#hash`]) {
        assert.ok(!getAllowedOrigins({ VNPAY_RETURN_URL: value }).includes(origin));
    }
});
