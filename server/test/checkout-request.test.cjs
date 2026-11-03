const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const service = require('../src/services/vnpay.service');
const controller = require('../src/controllers/payments.controller');
const Orders = require('../src/models/payments.model');
const Attempts = require('../src/models/paymentAttempt.model');
const Carts = require('../src/models/cartUser.model');
const Products = require('../src/models/products.model');
const shipping = require('../src/services/shipping.service');

// These credentials only sign local fixtures; no requests are sent to VNPay.
Object.assign(process.env, {
    VNPAY_ENV: 'sandbox', VNPAY_TMN_CODE: 'TESTCODE',
    VNPAY_SECRET_KEY: crypto.randomBytes(32).toString('hex'),
    VNPAY_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    VNPAY_RETURN_URL: 'https://checkout.example.test/api/vnpay-return',
    DOMAIN_URL: 'https://checkout.example.test', NODE_ENV: 'test',
});

test('real controller and signing service return 201 JSON with a redirect URL; COD returns an order', async (t) => {
    const cartId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const query = (value) => ({ session: async () => value });
    const savedOrders = [];
    const attempts = [];
    t.mock.method(shipping, 'applyQuote', async ({ method, totals }) => ({ ...totals,
        shippingFee: method === 'VNPAY' ? 15000 : 30000,
        totalPrice: totals.subtotal - totals.couponDiscount + (method === 'VNPAY' ? 15000 : 30000),
        shipping: { destination: { street: 'Updated address', wardName: 'Ward', districtName: 'District', provinceName: 'Province' } } }));
    t.mock.method(Orders, 'init', async () => {});
    t.mock.method(Attempts, 'init', async () => {});
    t.mock.method(mongoose, 'startSession', async () => ({
        withTransaction: async (work) => work(), endSession: async () => {},
    }));
    t.mock.method(Orders, 'findOne', () => query(null));
    t.mock.method(Carts, 'findOne', () => query({ _id: cartId, fullName: 'Test', phone: '0900000000',
        address: 'Test address', product: [{ productId, quantity: 2 }] }));
    t.mock.method(Products, 'findById', () => query({ price: 100000, discount: 10, nameProduct: 'Test watch', images: '',
        stock: 5, publicationStatus: 'published', verificationStatus: 'verified' }));
    t.mock.method(Products, 'updateOne', async () => ({ modifiedCount: 1 }));
    t.mock.method(Attempts, 'create', async (docs) => { attempts.push(...docs); });
    t.mock.method(Orders.prototype, 'save', async function () { savedOrders.push(this); });
    t.mock.method(Carts, 'deleteOne', async () => ({ deletedCount: 1 }));
    for (const typePayment of ['VNPAY', 'COD']) {
        const req = { body: { typePayment, cartId: String(cartId), totalPrice: 1,
            fullName: 'Updated recipient', phone: '0900000001', address: 'Updated address', note: '' },
            user: { id: String(new mongoose.Types.ObjectId()) }, ip: '127.0.0.1' };
        const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
        await controller.createPayment(req, res);
        assert.equal(res.code, 201);
        if (typePayment === 'VNPAY') {
            assert.equal(typeof res.body.metadata, 'string');
            const url = new URL(res.body.metadata);
            assert.equal(url.origin, 'https://sandbox.vnpayment.vn');
            assert.equal(url.searchParams.get('vnp_Amount'), '19500000');
            assert.equal(url.searchParams.get('vnp_ReturnUrl'), process.env.VNPAY_RETURN_URL);
            assert.match(url.searchParams.get('vnp_TxnRef'), /^[a-f0-9]{32}$/);
        } else {
            assert.ok(res.body.metadata._id);
            assert.equal(res.body.metadata.paymentStatus, 'unpaid');
        }
        assert.equal(savedOrders.at(-1).totalPrice, typePayment === 'VNPAY' ? 195000 : 210000);
        assert.equal(savedOrders.at(-1).fullName, 'Updated recipient');
        assert.equal(savedOrders.at(-1).address, 'Updated address, Ward, District, Province');
        assert.notEqual(savedOrders.at(-1).paymentStatus, 'paid');
    }
    assert.equal(attempts.length, 1);
});

test('retry of committed COD returns the existing order even after the cart is deleted', async (t) => {
    const existing = { paymentMethod: 'COD', status: 'pending' };
    t.mock.method(Orders, 'init', async () => {});
    t.mock.method(Attempts, 'init', async () => {});
    t.mock.method(mongoose, 'startSession', async () => ({ withTransaction: async (work) => work(), endSession: async () => {} }));
    t.mock.method(Orders, 'findOne', () => ({ session: async () => existing }));
    t.mock.method(Carts, 'findOne', () => assert.fail('idempotent recovery must not require a cart'));
    assert.equal(await service.checkout({ user: { id: 'fixture' }, body: {
        typePayment: 'COD', cartId: String(new mongoose.Types.ObjectId()), fullName: 'Retry',
    } }), existing);
});

test('standalone transaction failure reaches checkout as 503 without bypassing transactions', async (t) => {
    let ended = false;
    t.mock.method(Orders, 'init', async () => {});
    t.mock.method(Attempts, 'init', async () => {});
    t.mock.method(mongoose, 'startSession', async () => ({
        withTransaction: async () => { throw Object.assign(new Error('standalone'), { code: 20 }); },
        endSession: async () => { ended = true; },
    }));
    await assert.rejects(controller.createPayment({ body: { typePayment: 'VNPAY',
        cartId: String(new mongoose.Types.ObjectId()) }, user: { id: 'test-user' } }, {}),
    (error) => error.statusCode === 503 && /chưa sẵn sàng/.test(error.message));
    assert.equal(ended, true);
});
