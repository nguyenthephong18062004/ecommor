const { test } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const mongoose = require('mongoose');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const express = require('express');
const cookieParser = require('cookie-parser');
const ghn = require('../src/services/ghn.client');
const shipping = require('../src/services/shipping.service');
const packing = require('../src/services/shipping-package');
const Quotes = require('../src/models/shippingQuote.model');
const Orders = require('../src/models/payments.model');
const ApiKeys = require('../src/models/apiKey.model');
const Users = require('../src/models/users.model');
Object.assign(process.env, { GHN_ENV: 'sandbox', GHN_SHOP: '123', GHN_TOKEN: 'local-test-fixture-only' });
const orderId = '507f1f77bcf86cd799439011', userId = '507f1f77bcf86cd799439012', quoteId = '507f1f77bcf86cd799439013';
const to = { provinceId: 1, provinceName: 'Province', districtId: 2, districtName: 'District', wardCode: 'W1', wardName: 'Ward', street: 'Test street' };
const parcel = { weight: 550, length: 20, width: 16, height: 12, estimated: true };
const totals = { subtotal: 1000000, couponDiscount: 0, product: [{ productId: orderId, quantity: 1, unitPrice: 1000000,
    nameProduct: 'Watch', shippingPackage: packing.estimateItem({ strapMaterial: 'Leather' }) }] };
const query = value => ({ lean: async () => structuredClone(value), session: async () => structuredClone(value) });
function fixture(method = 'COD') {
    return { _id: orderId, userId, fullName: 'Test recipient', phone: '0900000000', note: '', status: 'confirmed',
        paymentMethod: method, paymentStatus: method === 'VNPAY' ? 'paid' : 'unpaid', subtotal: 1000000, couponDiscount: 0,
        totalPrice: method === 'VNPAY' ? 1015000 : 1030000, product: totals.product,
        shipping: { environment: 'sandbox', shopId: 123, origin: { districtId: 1, wardCode: 'FROM' }, destination: to, parcel,
            ...packing.fees(30000, method), insuranceValue: 1000000 } };
}
function mockProvider(t, calls = []) {
    t.mock.method(ghn, 'origin', async () => ({ districtId: 1, wardCode: 'FROM' }));
    t.mock.method(ghn, 'request', async (path, data, method) => {
        calls.push({ path, data, method });
        if (path.endsWith('/fee')) return { total: 30000 };
        if (path.endsWith('/leadtime')) return { leadtime: Math.floor(Date.now() / 1000) + 86400 };
        return { order_code: 'TEST123', client_order_code: orderId, status: 'ready_to_pick', total_fee: 30000 };
    });
}

test('packaging uses watch attributes, explicit measured overrides, and conservative multi-watch dimensions', () => {
    assert.equal(packing.estimateItem({ strapMaterial: 'Leather' }).weight, 550);
    assert.equal(packing.estimateItem({ strapMaterial: 'Stainless steel' }).weight, 750);
    assert.equal(packing.estimateItem({ dialDiameter: 46 }).weight, 900);
    const actual = { weight: 450, length: 18, width: 15, height: 9 };
    assert.equal(packing.estimateItem({ shippingPackage: actual }).estimated, false);
    const many = packing.pack([{ product: { shippingPackage: actual }, quantity: 3 }]);
    assert.equal(many.weight, 1350); assert.equal(many.length, 36); assert.equal(many.height, 18);
    for (const value of [null, { ...actual, weight: -1 }, { ...actual, width: 1.5 }, { ...actual, height: 201 }]) assert.throws(() => packing.validateParcel(value));
    assert.throws(() => packing.pack([{ product: {}, quantity: 1000 }]));
});
test('VNPay gets half-price shipping with odd VND rounded in customer favour; COD pays full', () => {
    assert.deepEqual(packing.fees(30001, 'VNPAY'), { grossFee: 30001, support: 15001, customerFee: 15000 });
    assert.equal(packing.fees(30001, 'COD').customerFee, 30001);
    for (const value of [-1, 1.2, '30000', null]) assert.throws(() => packing.fees(value, 'COD'));
    assert.throws(() => packing.fees(30000, 'MOMO'));
});
test('GHN client locks endpoints, times out, and redacts provider token/body/errors', async t => {
    const call = t.mock.method(axios, 'request', async config => {
        assert.equal(config.baseURL, 'https://dev-online-gateway.ghn.vn/shiip/public-api');
        assert.equal(config.timeout, 8000); assert.equal(config.maxRedirects, 0);
        throw Object.assign(new Error('fixture-secret-details'), { response: { status: 401, data: { token: 'private' } } });
    });
    await assert.rejects(ghn.request('/master-data/province', {}, 'GET'), e => e.statusCode === 503 && !/private|fixture-secret/.test(e.message) && !e.response);
    assert.equal(call.mock.calls.length, 1);
});
test('fee includes COD shipping once and caps declared insurance transparently', async t => {
    const calls = []; mockProvider(t, calls);
    const quote = await shipping.price(parcel, to, 1000000, 'COD');
    assert.equal(quote.customerFee, 30000); assert.ok(quote.expectedDelivery);
    assert.equal(calls.filter(c => c.path.endsWith('/fee')).at(-1).data.cod_value, 1030000);
    const expensive = await shipping.price(parcel, to, 9000000, 'VNPAY');
    assert.equal(expensive.insuranceValue, 5000000); assert.equal(expensive.insuranceLimited, true);
});
test('quotes are server-owned, expire explicitly, and cannot be reused after changing prices/quantity/method/address', async t => {
    mockProvider(t);
    t.mock.method(ghn, 'cached', async path => path.endsWith('/province') ? [{ ProvinceID: 1, ProvinceName: 'Province' }] :
        path.endsWith('/district') ? [{ DistrictID: 2, DistrictName: 'District', SupportType: 3 }] : [{ WardCode: 'W1', WardName: 'Ward' }]);
    let stored;
    t.mock.method(Quotes, 'create', async doc => { stored = { ...doc, _id: quoteId }; return stored; });
    t.mock.method(Quotes, 'findOne', condition => ({ session: async () =>
        stored && condition.userId === stored.userId && condition.cartId === stored.cartId && condition.method === stored.method && stored.expiresAt > condition.expiresAt.$gt ? stored : null }));
    const quote = await shipping.createQuote({ userId, cartId: orderId, method: 'VNPAY', totals, address: to });
    assert.equal(quote.totalPrice, 1015000);
    const input = { quoteId, userId, cartId: orderId, method: 'VNPAY', totals, address: to.street };
    assert.equal((await shipping.applyQuote(input, null)).shippingFee, 15000);
    for (const patch of [{ userId: orderId }, { method: 'COD' }, { address: 'Changed street' },
        { totals: { ...totals, subtotal: 2000000 } }, { totals: { ...totals, product: [{ ...totals.product[0], quantity: 2 }] } }]) {
        await assert.rejects(shipping.applyQuote({ ...input, ...patch }, null), e => e.statusCode === 409);
    }
    stored.expiresAt = new Date(Date.now() - 1);
    await assert.rejects(shipping.applyQuote(input, null), e => e.statusCode === 409);
});
test('only confirmed COD or paid VNPay can create shipments; legacy/wrong-environment orders are rejected', () => {
    shipping.assertOrder(fixture('COD')); shipping.assertOrder(fixture('VNPAY'));
    for (const order of [{ ...fixture(), status: 'pending' }, { ...fixture('VNPAY'), paymentStatus: 'pending' },
        { ...fixture(), shipping: undefined }, { ...fixture(), shipping: { environment: 'production', shopId: 123 } }]) {
        assert.throws(() => shipping.assertOrder(order), e => e.statusCode === 409);
    }
});
test('shipment creation is locked, uses stable client code and never double-collects shipping', async t => {
    const calls = []; mockProvider(t, calls);
    let saved = fixture('COD');
    t.mock.method(Orders, 'findById', () => query(saved));
    t.mock.method(Orders, 'findOneAndUpdate', () => ({ lean: async () => {
        if (saved.shipment?.state) return null;
        saved.shipment = { state: 'creating', startedAt: new Date() }; return structuredClone(saved);
    } }));
    t.mock.method(Orders, 'updateOne', async (_, change) => { if (change.$set.shipment) saved.shipment = change.$set.shipment; });
    const results = await Promise.allSettled([shipping.createShipment(orderId, { expectedFee: 30000 }), shipping.createShipment(orderId, { expectedFee: 30000 })]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    const creations = calls.filter(c => c.path.endsWith('/create'));
    assert.equal(creations.length, 1); assert.equal(creations[0].data.client_order_code, orderId);
    assert.equal(creations[0].data.payment_type_id, 1); assert.equal(creations[0].data.cod_amount, 1030000);
    assert.equal((await shipping.createShipment(orderId, {})).code, 'TEST123');
});
test('unknown timeout outcomes are recovered by GET client-code lookup without creating again', async t => {
    let saved = fixture('VNPAY'), creates = 0;
    t.mock.method(Orders, 'findById', () => query(saved));
    t.mock.method(Orders, 'findOneAndUpdate', () => ({ lean: async () => { saved.shipment = { state: 'creating' }; return structuredClone(saved); } }));
    t.mock.method(Orders, 'updateOne', async (_, change) => {
        if (change.$set.shipment) saved.shipment = change.$set.shipment;
        else saved.shipment = { ...saved.shipment, state: change.$set['shipment.state'] };
    });
    t.mock.method(ghn, 'request', async (path, data, method) => {
        if (path.endsWith('/fee')) return { total: 30000 };
        if (path.endsWith('/leadtime')) return {};
        if (path.endsWith('/create')) { creates++; assert.equal(data.cod_amount, 0); throw Object.assign(new Error('provider timeout'), { uncertain: true }); }
        assert.equal(method, 'GET'); assert.equal(data.client_order_code, orderId);
        return { order_code: 'RECOVERED', client_order_code: orderId, status: 'picking' };
    });
    await assert.rejects(shipping.createShipment(orderId, { expectedFee: 30000 }));
    assert.equal(saved.shipment.state, 'unknown');
    await assert.rejects(shipping.createShipment(orderId, { expectedFee: 30000 }), e => e.statusCode === 409);
    assert.equal((await shipping.syncShipment(orderId)).code, 'RECOVERED');
    assert.equal(creates, 1);
});
test('changed carrier fees require reconfirmation and cannot create a shipment', async t => {
    const calls = []; mockProvider(t, calls);
    t.mock.method(Orders, 'findById', () => query(fixture()));
    t.mock.method(Orders, 'findOneAndUpdate', () => assert.fail('Must not acquire a creation lock for an unconfirmed fee'));
    await assert.rejects(shipping.createShipment(orderId, { expectedFee: 1 }), e => e.statusCode === 409);
    assert.equal(calls.filter(row => row.path.endsWith('/create')).length, 0);
});
test('a provider success followed by DB failure keeps the lock and is recoverable without a second shipment', async t => {
    let saved = fixture(), creates = 0;
    t.mock.method(Orders, 'findById', () => query(saved));
    t.mock.method(Orders, 'findOneAndUpdate', () => ({ lean: async () => {
        saved.shipment = { state: 'creating', startedAt: new Date(Date.now() - 120000) }; return structuredClone(saved);
    } }));
    const update = t.mock.method(Orders, 'updateOne', async () => { throw new Error('database unavailable'); });
    t.mock.method(ghn, 'request', async path => {
        if (path.endsWith('/fee')) return { total: 30000 };
        if (path.endsWith('/leadtime')) return {};
        if (path.endsWith('/create')) creates++;
        return { order_code: 'SAVEDATGHN', client_order_code: orderId, status: 'ready_to_pick' };
    });
    await assert.rejects(shipping.createShipment(orderId, { expectedFee: 30000 }), /database unavailable/);
    assert.equal(saved.shipment.state, 'creating');
    await assert.rejects(shipping.createShipment(orderId, { expectedFee: 30000 }), e => e.statusCode === 409);
    update.mock.mockImplementation(async (_, change) => { saved.shipment = change.$set.shipment; });
    assert.equal((await shipping.syncShipment(orderId)).code, 'SAVEDATGHN'); assert.equal(creates, 1);
});
test('active shipments prevent local cancellation and inventory release until GHN cancellation is confirmed', async t => {
    const service = require('../src/services/vnpay.service');
    const Attempts = require('../src/models/paymentAttempt.model');
    const Products = require('../src/models/products.model');
    t.mock.method(Orders, 'init', async () => {}); t.mock.method(Attempts, 'init', async () => {});
    t.mock.method(mongoose, 'startSession', async () => ({ withTransaction: async work => work(), endSession: async () => {} }));
    t.mock.method(Products, 'updateOne', () => assert.fail('Inventory cannot be released while shipment is active'));
    let shipment = { state: 'ready', status: 'delivering', code: 'TEST' };
    t.mock.method(Orders, 'findOne', () => ({ session: async () => ({ ...fixture(), shipment }) }));
    for (const state of ['creating', 'unknown', 'ready']) {
        shipment = { ...shipment, state };
        await assert.rejects(service.changeStatus(orderId, 'cancelled'), e => e.statusCode === 409);
    }
});
test('shipping routes require server-verified login; shipment operations require admin', async t => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    t.mock.method(ApiKeys, 'findOne', async () => ({ publicKey }));
    const user = t.mock.method(Users, 'findById', async () => ({ isAdmin: false }));
    t.mock.method(shipping, 'provinces', async () => []);
    t.mock.method(shipping, 'preview', async () => ({ grossFee: 30000 }));
    const app = express(); app.use(express.json(), cookieParser()); app.use('/api/shipping', require('../src/routes/shipping.routes'));
    app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message }));
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/shipping`;
    const token = jwt.sign({ id: userId }, privateKey, { algorithm: 'RS256', expiresIn: '5m' });
    const headers = { Cookie: `token=${token}`, 'Content-Type': 'application/json' };
    try {
        assert.equal((await fetch(base + '/provinces')).status, 401);
        assert.equal((await fetch(base + '/provinces', { headers })).status, 200);
        assert.equal((await fetch(`${base}/admin/orders/${orderId}/preview`, { method: 'POST', headers, body: '{}' })).status, 403);
        user.mock.mockImplementation(async () => ({ isAdmin: true }));
        assert.equal((await fetch(`${base}/admin/orders/${orderId}/preview`, { method: 'POST', headers, body: '{}' })).status, 200);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
