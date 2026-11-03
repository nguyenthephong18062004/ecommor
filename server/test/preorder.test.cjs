const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const Products = require('../src/models/products.model');
const Requests = require('../src/models/preorder.model');
const service = require('../src/services/preorder.service');

const productId = '507f1f77bcf86cd799439011';
const valid = { productId, fullName: 'Nguyễn Văn A', phone: '0901234567', quantity: 2,
    email: 'buyer@example.test', address: 'Hà Nội', note: 'Xin tư vấn thời gian giao hàng', consent: true };

test('rejects invalid contact, quantities, object inputs and missing consent before querying DB', async (t) => {
    t.mock.method(Products, 'findById', () => { throw new Error('DB must not be queried'); });
    for (const patch of [{ productId: 'bad' }, { fullName: '' }, { phone: { $ne: null } },
        { phone: 'abc' }, { email: 'invalid' }, { quantity: 0 }, { quantity: -1 },
        { quantity: 1.5 }, { quantity: 100 }, { quantity: '2' }, { consent: false },
        { note: 'x'.repeat(2001) }, { address: {} }]) {
        await assert.rejects(service.create({ ...valid, ...patch }), error => error.statusCode === 400);
    }
});

test('missing products return 404 and in-stock products use regular checkout', async (t) => {
    const find = t.mock.method(Products, 'findById', () => ({ lean: async () => null }));
    await assert.rejects(service.create(valid), error => error.statusCode === 404);
    find.mock.mockImplementation(() => ({ lean: async () => ({ stock: 1 }) }));
    await assert.rejects(service.create(valid), error => error.statusCode === 409);
});

test('saves server product/price snapshot, ignores client price/status and does not change stock', async (t) => {
    t.mock.method(Products, 'findById', () => ({ lean: async () => ({ _id: productId,
        stock: 0, price: 1000000, discount: 15, nameProduct: 'Watch', modelNumber: 'W-01', images: 'watch.jpg',
        publicationStatus: 'published', allowPreorder: true }) }));
    t.mock.method(Products, 'updateOne', () => { throw new Error('Stock must not change'); });
    let saved;
    t.mock.method(Requests, 'create', async data => { saved = data; return { ...data, _id: productId }; });
    const result = await service.create({ ...valid, price: 1, totalPrice: 1, status: 'confirmed', isAdmin: true });
    assert.equal(saved.unitPrice, 850000);
    assert.equal(saved.totalPrice, 1700000);
    assert.equal(saved.productName, 'Watch');
    assert.equal(saved.status, 'pending');
    assert.equal(saved.isAdmin, undefined);
    assert.equal(result.id, productId);
    assert.equal(result.phone, undefined);
});

test('terminal requests cannot be reopened and unknown statuses are rejected', async (t) => {
    t.mock.method(Requests, 'findById', async () => ({ status: 'cancelled' }));
    await assert.rejects(service.updateStatus(productId, 'confirmed'), error => error.statusCode === 409);
    await assert.rejects(service.updateStatus(productId, 'paid'), error => error.statusCode === 400);
});

test('valid status transitions use an atomic old-status condition; concurrent edits conflict', async (t) => {
    t.mock.method(Requests, 'findById', async () => ({ status: 'pending' }));
    let condition;
    const update = t.mock.method(Requests, 'findOneAndUpdate', async (filter, change) => {
        condition = filter;
        return { _id: productId, status: change.$set.status };
    });
    assert.equal((await service.updateStatus(productId, 'contacted')).status, 'contacted');
    assert.deepEqual(condition, { _id: productId, status: 'pending' });
    update.mock.mockImplementation(async () => null);
    await assert.rejects(service.updateStatus(productId, 'confirmed'), error => error.statusCode === 409);
});

test('admin lists validate pagination and filter and return bounded sorted results', async (t) => {
    for (const query of [{ page: 0 }, { limit: 101 }, { status: { $ne: null } }, { status: '__proto__' }]) {
        await assert.rejects(service.list(query), error => error.statusCode === 400);
    }
    const calls = {};
    const chain = {
        sort: value => { calls.sort = value; return chain; },
        skip: value => { calls.skip = value; return chain; },
        limit: value => { calls.limit = value; return chain; },
        lean: async () => [{ _id: productId }],
    };
    t.mock.method(Requests, 'find', filter => { calls.filter = filter; return chain; });
    t.mock.method(Requests, 'countDocuments', async () => 25);
    const result = await service.list({ page: '2', limit: '20', status: 'pending' });
    assert.deepEqual(calls, { filter: { status: 'pending' }, sort: { createdAt: -1 }, skip: 20, limit: 20 });
    assert.equal(result.total, 25);
    assert.equal(result.items.length, 1);
});

test('new requests satisfy the real Mongoose schema without writing to a database', () => {
    const request = new Requests({ ...valid, productName: 'Watch', unitPrice: 1000, totalPrice: 2000,
        consentAt: new Date(), status: 'pending' });
    assert.equal(request.validateSync(), undefined);
    request.quantity = 1.5;
    assert.ok(request.validateSync().errors.quantity);
});

test('only a server-verified admin can read requests or change their status', async (t) => {
    const crypto = require('node:crypto');
    const jwt = require('jsonwebtoken');
    const ApiKeys = require('../src/models/apiKey.model');
    const Users = require('../src/models/users.model');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    t.mock.method(ApiKeys, 'findOne', async () => ({ publicKey }));
    const user = t.mock.method(Users, 'findById', async () => ({ isAdmin: false }));
    t.mock.method(service, 'list', async () => ({ items: [], total: 0 }));
    t.mock.method(service, 'updateStatus', async (id, status) => ({ id, status }));
    const token = jwt.sign({ id: productId }, privateKey, { algorithm: 'RS256', expiresIn: '5m' });
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/preorders', require('../src/routes/preorder.routes'));
    app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
        const url = `http://127.0.0.1:${server.address().port}/api/preorders`;
        const headers = { Cookie: `token=${token}`, 'Content-Type': 'application/json' };
        const update = () => fetch(`${url}/${productId}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'contacted' }) });
        assert.equal((await fetch(url, { headers })).status, 403);
        assert.equal((await update()).status, 403);
        user.mock.mockImplementation(async () => ({ isAdmin: true }));
        assert.equal((await fetch(url, { headers })).status, 200);
        assert.equal((await update()).status, 200);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});

test('creation requires a verified login, admin endpoints reject guests, rate limiting applies', async (t) => {
    const crypto = require('node:crypto');
    const jwt = require('jsonwebtoken');
    const ApiKeys = require('../src/models/apiKey.model');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    t.mock.method(ApiKeys, 'findOne', async () => ({ publicKey }));
    const token = jwt.sign({ id: productId }, privateKey, { algorithm: 'RS256', expiresIn: '5m' });
    t.mock.method(Products, 'findById', () => ({ lean: async () => ({ _id: productId, stock: 0, publicationStatus: 'published', allowPreorder: true,
        price: 1000000, discount: 0, nameProduct: 'Watch', modelNumber: 'W-01' }) }));
    t.mock.method(Requests, 'create', async data => ({ ...data, _id: productId }));
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/preorders', require('../src/routes/preorder.routes'));
    app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
        const url = `http://127.0.0.1:${server.address().port}/api/preorders`;
        assert.equal((await fetch(url)).status, 401);
        assert.equal((await fetch(`${url}/${productId}/status`, { method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'confirmed' }) })).status, 401);
        for (const Cookie of ['', 'logged=1', 'token=invalid']) {
            assert.equal((await fetch(url, { method: 'POST', headers: { Cookie, 'Content-Type': 'application/json' },
                body: JSON.stringify(valid) })).status, 401);
        }
        const send = () => fetch(url, { method: 'POST', headers: { Cookie: `token=${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(valid) });
        const response = await send();
        assert.equal(response.status, 201);
        assert.equal((await response.json()).metadata.status, 'pending');
        for (let i = 1; i < 5; i++) assert.equal((await send()).status, 201);
        assert.equal((await send()).status, 429);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});
