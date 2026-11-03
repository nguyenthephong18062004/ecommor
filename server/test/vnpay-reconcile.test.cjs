const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');

Object.assign(process.env, { VNPAY_TMN_CODE: 'TESTONLY', VNPAY_SECRET_KEY: 'reconcile-unit-test-secret',
    VNPAY_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', VNPAY_ENV: 'sandbox',
    VNPAY_RETURN_URL: 'https://shop.example/api/vnpay-return', DOMAIN_URL: 'https://shop.example', NODE_ENV: 'test' });
const service = require('../src/services/vnpay.service');
const provider = require('../src/services/vnpay-query.service');
const Orders = require('../src/models/payments.model');
const Attempts = require('../src/models/paymentAttempt.model');
const Products = require('../src/models/products.model');
const Carts = require('../src/models/cartUser.model');
const ShippingQuotes = require('../src/models/shippingQuote.model');
const shipping = require('../src/services/shipping.service');

describe('VNPay reconciliation with replica-set transactions', { skip: !process.env.MONGODB_TEST_URI }, () => {
    before(async () => {
        Object.assign(process.env, { GHN_ENV: 'sandbox', GHN_SHOP: '123', GHN_TOKEN: 'test-fixture-only' });
        await mongoose.connect(process.env.MONGODB_TEST_URI, {
            dbName: `reconcile_test_${crypto.randomUUID().replace(/-/g, '')}`, serverSelectionTimeoutMS: 5000,
        });
        await Promise.all([Orders.init(), Attempts.init(), Products.init(), Carts.init()]);
    });
    after(async () => mongoose.disconnect());

    async function fixture() {
        const userId = new mongoose.Types.ObjectId();
        const product = await Products.collection.insertOne({ price: 100000, discount: 0, stock: 5,
            nameProduct: 'Reconciliation test', images: '', soldCount: 0, publicationStatus: 'published', verificationStatus: 'verified' });
        const cart = await Carts.create({ userId: String(userId), product: [{ productId: product.insertedId, quantity: 1 }],
            fullName: 'Test', phone: '0900000000', address: 'Test address', totalPrice: 1 });
        const quote = await ShippingQuotes.create({ userId, cartId: cart._id, method: 'VNPAY', expiresAt: new Date(Date.now() + 600000),
            fingerprint: shipping.fingerprint(await service.snapshot(cart, null), 'VNPAY'),
            shipping: { environment: 'sandbox', shopId: 123, customerFee: 0,
                destination: { street: cart.address, wardName: 'Ward', districtName: 'District', provinceName: 'Province' } } });
        await service.checkout({ user: { id: String(userId) }, ip: '192.0.2.1',
            body: { cartId: String(cart._id), typePayment: 'VNPAY', shippingQuoteId: String(quote._id) } });
        const order = await Orders.findOne({ userId });
        return { order, userId: String(userId), productId: product.insertedId };
    }
    const paid = { verified: true, responseCode: '00', transactionStatus: '00',
        transactionNo: '123456', bankCode: 'NCB', payDate: '20261013120000', paid: true };

    test('missing IPN: owner reconciliation changes pending to paid and keeps order pending/stock reserved', async (t) => {
        const f = await fixture();
        let calls = 0;
        t.mock.method(provider, 'queryAttempt', async () => { calls++; return paid; });
        const result = await service.reconcile(String(f.order._id), f.userId);
        assert.equal(result.paymentStatus, 'paid');
        const order = await Orders.findById(f.order._id);
        assert.equal(order.status, 'pending');
        assert.equal(order.inventoryReserved, true);
        assert.equal((await Products.findById(f.productId)).stock, 4);
        const attempt = await Attempts.findOne({ orderId: order._id });
        assert.ok(attempt.reconciledAt);
        assert.equal(attempt.receivedAt, undefined);
        assert.equal(attempt.confirmationSource, 'querydr');
        assert.equal((await service.reconcile(String(order._id), f.userId)).paymentStatus, 'paid');
        assert.equal(calls, 1);
    });

    test('owner and ID validation occur before contacting provider', async (t) => {
        const f = await fixture();
        t.mock.method(provider, 'queryAttempt', async () => assert.fail('must not query another customer order'));
        await assert.rejects(service.reconcile(String(f.order._id), String(new mongoose.Types.ObjectId())), /Không tìm thấy/);
        await assert.rejects(service.reconcile('invalid', f.userId), /không hợp lệ/);
    });

    test('concurrent requests query once and persist cooldown across reloads', async (t) => {
        const f = await fixture();
        let calls = 0;
        t.mock.method(provider, 'queryAttempt', async () => {
            calls++;
            await new Promise((resolve) => setTimeout(resolve, 30));
            return { verified: true, responseCode: '00', transactionStatus: '01', paid: false };
        });
        await Promise.all([service.reconcile(String(f.order._id), f.userId), service.reconcile(String(f.order._id), f.userId)]);
        const again = await service.reconcile(String(f.order._id), f.userId);
        assert.equal(calls, 1);
        assert.ok(again.nextCheckAt > new Date());
        assert.equal(again.paymentStatus, 'pending');
    });

    test('bad signature, query 94 and network failure never mark paid or release stock', async (t) => {
        for (const response of [{ verified: false, responseCode: '00', transactionStatus: '00', paid: true },
            { verified: false, responseCode: '94', paid: false }, new Error('timeout')]) {
            const f = await fixture();
            const mock = t.mock.method(provider, 'queryAttempt', async () => {
                if (response instanceof Error) throw response;
                return response;
            });
            assert.equal((await service.reconcile(String(f.order._id), f.userId)).paymentStatus, 'pending');
            assert.equal((await Products.findById(f.productId)).stock, 4);
            mock.mock.restore();
        }
    });

    test('expired paid attempts require reconciliation without reopening or subtracting stock', async (t) => {
        const f = await fixture();
        await Orders.updateOne({ _id: f.order._id }, { $set: { expiresAt: new Date(0) } });
        await service.expirePending();
        t.mock.method(provider, 'queryAttempt', async () => paid);
        assert.equal((await service.reconcile(String(f.order._id), f.userId)).paymentStatus, 'refund_required');
        assert.equal((await Products.findById(f.productId)).stock, 5);
        assert.equal((await Orders.findById(f.order._id)).inventoryReserved, false);
    });

    test('IPN arriving during provider query wins safely; replay does not change stock', async (t) => {
        const f = await fixture();
        const query = { vnp_TxnRef: f.order.transactionRef, vnp_Amount: String(f.order.totalPrice * 100),
            vnp_TmnCode: process.env.VNPAY_TMN_CODE, vnp_OrderInfo: `Thanh toan don ${f.order._id}`,
            vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '123456' };
        const params = new URLSearchParams();
        Object.keys(query).sort().forEach((key) => params.append(key, query[key]));
        query.vnp_SecureHash = crypto.createHmac('sha512', process.env.VNPAY_SECRET_KEY).update(params.toString()).digest('hex');
        t.mock.method(provider, 'queryAttempt', async () => {
            assert.equal((await service.ipn(query)).RspCode, '00');
            return paid;
        });
        assert.equal((await service.reconcile(String(f.order._id), f.userId)).paymentStatus, 'paid');
        assert.equal((await service.ipn(query)).RspCode, '02');
        assert.equal((await Products.findById(f.productId)).stock, 4);
    });

    test('authenticated HTTP endpoint updates DB and payment-details response; unauthenticated and foreign owners cannot reconcile', async (t) => {
        const express = require('express');
        const cookieParser = require('cookie-parser');
        const { createApiKey, createToken } = require('../src/services/tokenSevices');
        const f = await fixture();
        await createApiKey(f.userId);
        const token = await createToken({ id: f.userId });
        const otherUser = String(new mongoose.Types.ObjectId());
        await createApiKey(otherUser);
        const otherToken = await createToken({ id: otherUser });
        let calls = 0;
        t.mock.method(provider, 'queryAttempt', async () => { calls++; return paid; });
        const app = express();
        app.use(express.json(), cookieParser());
        require('../src/routes')(app);
        app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message }));
        const server = app.listen(0, '127.0.0.1');
        await new Promise((resolve) => server.once('listening', resolve));
        const origin = `http://127.0.0.1:${server.address().port}`;
        try {
            const call = (cookie) => fetch(`${origin}/api/reconcile-payment-vnpay`, {
                method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { Cookie: `token=${cookie}` } : {}) },
                body: JSON.stringify({ idOrder: String(f.order._id) }),
            });
            assert.ok((await call()).status >= 400);
            assert.equal((await call(otherToken)).status, 404);
            assert.equal(calls, 0);
            const response = await call(token);
            assert.equal(response.status, 200);
            assert.equal((await response.json()).metadata.paymentStatus, 'paid');
            const details = await fetch(`${origin}/api/get-payment-success?idPayment=${f.order._id}`, {
                headers: { Cookie: `token=${token}` },
            });
            const body = await details.json();
            assert.equal(body.metadata.paymentStatus, 'paid');
            assert.equal(body.metadata.status, 'pending');
            assert.equal(calls, 1);
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    test('verified failed payment releases stock once; malformed or pending provider status does not settle', async (t) => {
        const f = await fixture();
        t.mock.method(provider, 'queryAttempt', async () => ({ ...paid, paid: false, transactionStatus: '02' }));
        assert.equal((await service.reconcile(String(f.order._id), f.userId)).paymentStatus, 'failed');
        assert.equal((await service.reconcile(String(f.order._id), f.userId)).paymentStatus, 'failed');
        assert.equal((await Products.findById(f.productId)).stock, 5);
    });
});
