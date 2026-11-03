const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { VNPay } = require('vnpay');
const service = require('../src/services/vnpay.service');
const Orders = require('../src/models/payments.model');
const Attempts = require('../src/models/paymentAttempt.model');
const Carts = require('../src/models/cartUser.model');
const Products = require('../src/models/products.model');
const Coupons = require('../src/models/coupon.model');
const controller = require('../src/controllers/payments.controller');
const ShippingQuotes = require('../src/models/shippingQuote.model');
const shipping = require('../src/services/shipping.service');

// Override VNPay credentials with generated test values before exercising the service.
process.env.VNPAY_TMN_CODE = 'DJ2B10RS';
process.env.VNPAY_SECRET_KEY = crypto.randomBytes(32).toString('hex');
process.env.VNPAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
process.env.VNPAY_RETURN_URL = 'https://grazing-seltzer-figurine.ngrok-free.dev/api/vnpay-return';
process.env.DOMAIN_URL = 'http://localhost:5173';
process.env.VNPAY_ENV = 'sandbox';
process.env.NODE_ENV = 'test';


function signed(params) {
    const { vnp_SecureHash: ignoredHash, vnp_SecureHashType: ignoredType, ...data } = params;
    const search = new URLSearchParams();
    Object.keys(data).sort().forEach((key) => search.append(key, String(data[key])));
    return { ...data, vnp_SecureHash: crypto.createHmac('sha512', process.env.VNPAY_SECRET_KEY).update(search.toString()).digest('hex') };
}

function callback(order, overrides = {}) {
    return signed({ vnp_TxnRef: order.transactionRef, vnp_Amount: String(order.totalPrice * 100),
        vnp_TmnCode: process.env.VNPAY_TMN_CODE, vnp_OrderInfo: `Thanh toan don ${order._id}`,
        vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '123456',
        vnp_BankCode: 'NCB', vnp_PayDate: '20261003140000', ...overrides });
}

test('GMT+7 dates are independent of process timezone and roll across midnight', () => {
    assert.equal(service.dateGMT7(new Date('2026-10-03T18:02:03Z')), '20261004010203');
});

test('integer VND pricing rounds once without floating point multiplication', () => {
    assert.equal(service.unitPrice({ price: 100001, discount: 10 }), 90001);
    assert.equal(service.unitPrice({ price: 100000, discount: 12.34 }), 87660);
    assert.throws(() => service.unitPrice({ price: 1.5, discount: 0 }));
    assert.throws(() => service.unitPrice({ price: 100, discount: 101 }));
    assert.throws(() => service.unitPrice({ price: 100, discount: -1 }));
});

test('URL uses integer amount x100, client IP, GMT+7 and a library-verifiable hash', () => {
    const settings = service.config();
    const data = service.paymentUrl({ _id: new mongoose.Types.ObjectId(), totalPrice: 123456 },
        { ip: '::ffff:192.0.2.1' }, settings, new Date('2026-10-03T18:02:03Z'), 'uniqueattempt');
    const params = Object.fromEntries(new URL(data.paymentUrl).searchParams);
    assert.equal(params.vnp_Amount, '12345600');
    assert.equal(params.vnp_IpAddr, '192.0.2.1');
    assert.equal(params.vnp_CreateDate, '20261004010203');
    assert.equal(params.vnp_ExpireDate, '20261004011703');
    assert.equal(params.vnp_Version, '2.1.0');
    assert.equal(params.vnp_Command, 'pay');
    assert.equal(params.vnp_CurrCode, 'VND');
    const verifier = new VNPay({ tmnCode: settings.tmnCode, secureSecret: settings.secret, hashAlgorithm: 'SHA512', enableLog: false });
    assert.equal(verifier.verifyReturnUrl(params).isVerified, true);
});

test('valid callback verifies; missing, modified, malformed and duplicate parameters fail', async () => {
    const data = callback({ transactionRef: 'testattempt', totalPrice: 10000, _id: new mongoose.Types.ObjectId() });
    assert.ok(service.verify(data));
    assert.equal(service.verify({ ...data, vnp_Amount: '1' }), null);
    assert.equal(service.verify({ ...data, vnp_SecureHash: undefined }), null);
    assert.equal(service.verify({ ...data, vnp_SecureHash: 'a' }), null);
    assert.equal(service.verify({ ...data, vnp_TxnRef: ['a', 'b'] }), null);
    assert.equal(service.verify(signed({ ...data, vnp_SecureHash: undefined, vnp_TmnCode: 'OTHER' })), null);
    assert.equal(service.verify(signed({ vnp_TxnRef: 'missingrequired' })), null);
    assert.deepEqual(await service.ipn({ ...data, vnp_Amount: '1' }), { RspCode: '97', Message: 'Invalid signature or parameters' });
});

test('configuration errors name the variable and never contain credential values', () => {
    const value = process.env.VNPAY_SECRET_KEY;
    delete process.env.VNPAY_SECRET_KEY;
    assert.throws(() => service.config(), (error) => error.statusCode === 503 && error.message.includes('VNPAY_SECRET_KEY') && !error.message.includes(value));
    process.env.VNPAY_SECRET_KEY = value;
    process.env.VNPAY_ENV = 'production';
    assert.throws(() => service.config(), /không khớp/);
    process.env.VNPAY_ENV = 'sandbox';
});

describe('MongoDB replica set integration', { skip: !process.env.MONGODB_TEST_URI }, () => {
    before(async () => {
        Object.assign(process.env, { GHN_ENV: 'sandbox', GHN_SHOP: '123', GHN_TOKEN: 'test-fixture-only' });
        await mongoose.connect(process.env.MONGODB_TEST_URI, { dbName: `vnpay_test_${crypto.randomUUID().replace(/-/g, '')}`, serverSelectionTimeoutMS: 5000 });
        const hello = await mongoose.connection.db.admin().command({ hello: 1 });
        assert.ok(hello.setName, 'Integration tests require a replica set');
        await Promise.all([Orders.init(), Attempts.init(), Carts.init(), Products.init(), Coupons.init()]);
    });
    after(async () => { await mongoose.disconnect(); });

    async function fixture({ quantity = 1, stock = 5, coupon = true, productId } = {}) {
        const userId = new mongoose.Types.ObjectId();
        productId ||= new mongoose.Types.ObjectId();
        if (!await Products.findById(productId)) await Products.collection.insertOne({ _id: productId, price: 100000,
            discount: 10, stock, soldCount: 0, nameProduct: 'Test watch', images: '/test.png',
            publicationStatus: 'published', verificationStatus: 'verified' });
        const voucher = coupon ? await Coupons.create({ nameCoupon: 'TEST', discount: 10000, quantity: 1, minPrice: 50000,
            startDate: new Date(Date.now() - 60000), endDate: new Date(Date.now() + 3600000) }) : null;
        const cart = await Carts.create({ userId, product: [{ productId, quantity }], totalPrice: 1,
            fullName: 'Test', phone: '0900000000', address: 'Test address', nameCoupon: voucher?._id });
        const req = { user: { id: String(userId) }, body: { typePayment: 'VNPAY', cartId: String(cart._id), totalPrice: 1 }, ip: '192.0.2.1' };
        try {
            const base = await service.snapshot(cart, null);
            const quote = await ShippingQuotes.create({ userId, cartId: cart._id, method: 'VNPAY', fingerprint: shipping.fingerprint(base, 'VNPAY'),
                expiresAt: new Date(Date.now() + 600000), shipping: { environment: 'sandbox', shopId: 123, customerFee: 0,
                    destination: { street: cart.address, wardName: 'Ward', districtName: 'District', provinceName: 'Province' } } });
            req.body.shippingQuoteId = String(quote._id);
        } catch { req.body.shippingQuoteId = String(new mongoose.Types.ObjectId()); } // Invalid-cart fixtures still fail inside checkout.
        return { req, cart, productId, voucher };
    }

    async function orderFor(req) { return Orders.findOne({ checkoutKey: req.body.cartId }); }

    test('concurrent double click produces one order and reserves stock/coupon once', async () => {
        const f = await fixture();
        const urls = await Promise.all([service.checkout(f.req), service.checkout(f.req)]);
        assert.equal(urls[0], urls[1]);
        const order = await orderFor(f.req);
        assert.equal(order.totalPrice, 80000);
        assert.equal(order.product[0].unitPrice, 90000);
        assert.equal(await Orders.countDocuments({ checkoutKey: f.req.body.cartId }), 1);
        assert.equal((await Products.findById(f.productId)).stock, 4);
        assert.equal((await Coupons.findById(f.voucher._id)).quantity, 0);
        assert.equal(await Carts.findById(f.cart._id), null);
    });

    test('return URL is read-only; simultaneous IPN and replay only confirm once', async () => {
        const f = await fixture();
        await service.checkout(f.req);
        const order = await orderFor(f.req);
        const query = callback(order);
        let target;
        await controller.checkPaymentVnpay({ query }, { redirect(value) { target = value; } });
        assert.ok(target.endsWith(`/payments/${order._id}`));
        assert.equal((await Orders.findById(order._id)).paymentStatus, 'pending');
        const results = await Promise.all([service.ipn(query), service.ipn(query)]);
        assert.deepEqual(results.map((r) => r.RspCode).sort(), ['00', '02']);
        assert.equal((await service.ipn(query)).RspCode, '02');
        assert.equal((await Orders.findById(order._id)).paymentStatus, 'paid');
        assert.equal((await Products.findById(f.productId)).stock, 4);
        const attempt = await Attempts.findOne({ transactionRef: order.transactionRef });
        assert.equal(attempt.transactionNo, '123456');
        assert.equal(attempt.responseCode, '00');
        assert.ok(attempt.receivedAt);
        await assert.rejects(service.changeStatus(String(order._id), 'cancelled', f.req.user.id), /hoàn tiền/);
    });

    test('signed wrong amount and unknown reference return correct IPN codes', async () => {
        const f = await fixture();
        await service.checkout(f.req);
        const order = await orderFor(f.req);
        assert.equal((await service.ipn(callback(order, { vnp_Amount: '100' }))).RspCode, '04');
        assert.equal((await service.ipn(callback(order, { vnp_TxnRef: 'unknown' }))).RspCode, '01');
        assert.equal((await Orders.findById(order._id)).paymentStatus, 'pending');
    });

    test('failed/cancelled provider result releases resources once; retry has a new reference', async () => {
        for (const code of ['24', '13', '11']) {
            const f = await fixture();
            await service.checkout(f.req);
            const order = await orderFor(f.req);
            const query = callback(order, { vnp_ResponseCode: code, vnp_TransactionStatus: '02' });
            await Promise.all([service.ipn(query), service.ipn(query)]);
            assert.equal((await Orders.findById(order._id)).paymentStatus, 'failed');
            assert.equal((await Products.findById(f.productId)).stock, 5);
            assert.equal((await Coupons.findById(f.voucher._id)).quantity, 1);
            const req = { ...f.req, body: { idOrder: String(order._id) } };
            const urls = await Promise.all([service.retry(req), service.retry(req)]);
            assert.equal(urls[0], urls[1]);
            const updated = await Orders.findById(order._id);
            assert.notEqual(updated.transactionRef, order.transactionRef);
            assert.equal(await Attempts.countDocuments({ orderId: order._id }), 2);
            assert.equal((await Products.findById(f.productId)).stock, 4);
        }
    });

    test('expiry releases once; late success is recorded for refund without reopening order', async () => {
        const f = await fixture();
        await service.checkout(f.req);
        const order = await orderFor(f.req);
        await Orders.updateOne({ _id: order._id }, { $set: { expiresAt: new Date(0) } });
        await Promise.all([service.expirePending(), service.expirePending()]);
        assert.equal((await Products.findById(f.productId)).stock, 5);
        assert.equal((await Coupons.findById(f.voucher._id)).quantity, 1);
        assert.equal((await Orders.findById(order._id)).paymentStatus, 'expired');
        await service.ipn(callback(order));
        assert.equal((await Orders.findById(order._id)).paymentStatus, 'refund_required');
        assert.equal((await Products.findById(f.productId)).stock, 5);
        await assert.rejects(service.retry({ ...f.req, body: { idOrder: String(order._id) } }), /chưa đủ điều kiện/);
    });

    test('cancel race restores once; paid callback cannot reopen cancelled order', async () => {
        const f = await fixture();
        await service.checkout(f.req);
        const order = await orderFor(f.req);
        await Promise.all([service.changeStatus(String(order._id), 'cancelled', f.req.user.id), service.changeStatus(String(order._id), 'cancelled', f.req.user.id)]);
        assert.equal((await Products.findById(f.productId)).stock, 5);
        await service.ipn(callback(order));
        const updated = await Orders.findById(order._id);
        assert.equal(updated.status, 'cancelled');
        assert.equal(updated.paymentStatus, 'refund_required');
        await assert.rejects(service.changeStatus(String(order._id), 'delivered'), /Không thể chuyển trạng thái/);
    });

    test('late success for expired attempt cancels newer reservation and records both attempts', async () => {
        const f = await fixture();
        await service.checkout(f.req);
        const oldOrder = await orderFor(f.req);
        await Orders.updateOne({ _id: oldOrder._id }, { $set: { expiresAt: new Date(0) } });
        await service.expirePending();
        await service.retry({ ...f.req, body: { idOrder: String(oldOrder._id) } });
        const newOrder = await Orders.findById(oldOrder._id);
        await service.ipn(callback(oldOrder));
        assert.equal((await Orders.findById(oldOrder._id)).paymentStatus, 'refund_required');
        assert.equal((await Products.findById(f.productId)).stock, 5);
        assert.equal((await Coupons.findById(f.voucher._id)).quantity, 1);
        assert.equal((await Attempts.findOne({ transactionRef: newOrder.transactionRef })).status, 'cancelled');
        await service.ipn(callback(newOrder));
        assert.equal((await Attempts.findOne({ transactionRef: newOrder.transactionRef })).status, 'refund_required');
        assert.equal((await Products.findById(f.productId)).stock, 5);
    });

    test('retry enforces owner, coupon availability and paid order state', async () => {
        const f = await fixture();
        await service.checkout(f.req);
        const order = await orderFor(f.req);
        await assert.rejects(service.retry({ user: { id: String(new mongoose.Types.ObjectId()) }, body: { idOrder: String(order._id) }, ip: f.req.ip }), /chưa đủ điều kiện/);
        await service.ipn(callback(order, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }));
        await Coupons.updateOne({ _id: f.voucher._id }, { $set: { quantity: 0 } });
        await assert.rejects(service.retry({ ...f.req, body: { idOrder: String(order._id) } }), /Mã giảm giá/);
        assert.equal((await Products.findById(f.productId)).stock, 5);
        await Coupons.updateOne({ _id: f.voucher._id }, { $set: { quantity: 1 } });
        await service.retry({ ...f.req, body: { idOrder: String(order._id) } });
        const updated = await Orders.findById(order._id);
        await service.ipn(callback(updated));
        await assert.rejects(service.retry({ ...f.req, body: { idOrder: String(order._id) } }), /chưa đủ điều kiện/);
    });

    test('two customers cannot oversell last stock', async () => {
        const a = await fixture({ stock: 1, coupon: false });
        const b = await fixture({ productId: a.productId, coupon: false });
        const results = await Promise.allSettled([service.checkout(a.req), service.checkout(b.req)]);
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal((await Products.findById(a.productId)).stock, 0);
        assert.equal(await Orders.countDocuments({ 'product.productId': a.productId }), 1);
    });

    test('invalid coupons and quantities roll back all writes', async () => {
        const f = await fixture();
        await Coupons.updateOne({ _id: f.voucher._id }, { $set: { endDate: new Date(0) } });
        await assert.rejects(service.checkout(f.req), /Mã giảm giá/);
        assert.equal((await Products.findById(f.productId)).stock, 5);
        assert.equal(await orderFor(f.req), null);
        for (const quantity of [0, -1, 1.5, 999]) {
            const q = await fixture({ quantity, coupon: false });
            await assert.rejects(service.checkout(q.req));
            assert.equal((await Products.findById(q.productId)).stock, 5);
        }
    });

    test('COD delivery is idempotent and snapshots survive price changes and deletion', async () => {
        const f = await fixture({ coupon: false });
        f.req.body.typePayment = 'COD';
        await ShippingQuotes.updateOne({ _id: f.req.body.shippingQuoteId }, { $set: { method: 'COD', fingerprint: shipping.fingerprint(await service.snapshot(f.cart, null), 'COD') } });
        const order = await service.checkout(f.req);
        await service.changeStatus(String(order._id), 'confirmed');
        await Orders.updateOne({ _id: order._id }, { $set: { shipment: { state: 'ready', code: 'FIXTURE', status: 'delivering' } } });
        await service.changeStatus(String(order._id), 'shipped');
        await Promise.all([service.changeStatus(String(order._id), 'delivered'), service.changeStatus(String(order._id), 'delivered')]);
        assert.equal((await Products.findById(f.productId)).soldCount, 1);
        await Products.deleteOne({ _id: f.productId });
        let response;
        await controller.getPaymentSuccess({ query: { idPayment: String(order._id) }, user: f.req.user }, {
            status() { return this; }, json(data) { response = data; },
        });
        assert.equal(response.metadata.products[0].price, 90000);
        assert.equal(response.metadata.products[0].nameProduct, 'Test watch');
    });
});
