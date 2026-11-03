const { test } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/vnpay.service');
const controller = require('../src/controllers/payments.controller');
const Attempts = require('../src/models/paymentAttempt.model');

test('verified Return stays on the callback origin in dev; production keeps configured redirect', async (t) => {
    const previous = process.env.NODE_ENV;
    t.mock.method(service, 'verify', () => ({ vnp_TxnRef: 'test-ref', vnp_Amount: '10000' }));
    t.mock.method(service, 'config', () => ({ clientUrl: new URL('https://shop.example.test') }));
    t.mock.method(Attempts, 'findOne', async () => ({ orderId: 'test-order', amount: 100 }));
    try {
        for (const [mode, expected] of [['development', '/payments/test-order'], ['production', 'https://shop.example.test/payments/test-order']]) {
            process.env.NODE_ENV = mode;
            let location;
            await controller.checkPaymentVnpay({ query: {} }, { redirect(url) { location = url; } });
            assert.equal(location, expected);
        }
        t.mock.method(service, 'verify', () => null);
        let status;
        await controller.checkPaymentVnpay({ query: {} }, {
            status(value) { status = value; return this; }, json() {},
            redirect() { assert.fail('invalid signatures must not redirect'); },
        });
        assert.equal(status, 400);
    } finally {
        if (previous === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previous;
    }
});
