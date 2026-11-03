const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const ApiKeys = require('../src/models/apiKey.model');
const cart = require('../src/controllers/cartUser.controller');
const payments = require('../src/controllers/payments.controller');

test('cart and payment APIs reject guests/forged/expired sessions before the business handler', async (t) => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    t.mock.method(ApiKeys, 'findOne', async () => ({ publicKey }));
    let calls = 0;
    const success = async (req, res) => { calls++; res.json({ userId: req.user.id }); };
    for (const name of ['addToCart', 'getCart', 'updateProductCart', 'deleteProductCart', 'updateInfoCart']) t.mock.method(cart, name, success);
    for (const name of ['createPayment', 'getPaymentSuccess', 'getOrderUser', 'cancelOrder', 'retryVnpay', 'reconcileVnpay']) t.mock.method(payments, name, success);
    const app = express();
    app.use(express.json(), cookieParser());
    app.use(require('../src/routes/cartUser.routes'));
    app.use(require('../src/routes/payments.route'));
    app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const id = '507f1f77bcf86cd799439011';
    const expired = jwt.sign({ id }, privateKey, { algorithm: 'RS256', expiresIn: -1 });
    const valid = jwt.sign({ id }, privateKey, { algorithm: 'RS256', expiresIn: '5m' });
    const endpoints = [['POST', '/api/create-cart'], ['GET', '/api/get-cart'], ['POST', '/api/update-product-cart'],
        ['POST', '/api/delete-product-cart'], ['POST', '/api/update-info-cart'], ['POST', '/api/create-payment'],
        ['GET', '/api/get-payment-success'], ['GET', '/api/get-order-user'], ['POST', '/api/cancel-order'],
        ['POST', '/api/retry-payment-vnpay'], ['POST', '/api/reconcile-payment-vnpay']];
    try {
        for (const Cookie of ['', 'logged=1', 'token=invalid', `token=${expired}`]) {
            for (const [method, path] of endpoints) {
                const response = await fetch(origin + path, { method, headers: { Cookie } });
                assert.equal(response.status, 401, `${method} ${path}`);
            }
        }
        assert.equal(calls, 0);
        for (const [method, path] of endpoints) {
            const response = await fetch(origin + path, { method, headers: { Cookie: `token=${valid}` } });
            assert.equal(response.status, 200, `${method} ${path}`);
            assert.equal((await response.json()).userId, id);
        }
        assert.equal(calls, endpoints.length);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
