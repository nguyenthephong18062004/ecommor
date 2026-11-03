const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const mongoose = require('mongoose');
require('dotenv').config();
const { connectionOptions } = require('../src/config/connectDB');
const Users = require('../src/models/users.model');
const Products = require('../src/models/products.model');
const Carts = require('../src/models/cartUser.model');
const Orders = require('../src/models/payments.model');
const Attempts = require('../src/models/paymentAttempt.model');
const Keys = require('../src/models/apiKey.model');
const { createApiKey, createToken } = require('../src/services/tokenSevices');
const service = require('../src/services/vnpay.service');

async function main() {
    assert.equal(service.config().gateway.hostname, 'sandbox.vnpayment.vn', 'live verification is sandbox-only');
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
        try {
            const response = await fetch('http://localhost:5173/api/get-all-product', { signal: AbortSignal.timeout(2000) });
            if (response.ok && response.headers.get('content-type')?.includes('application/json')) { ready = true; break; }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.ok(ready, 'Vite/backend must be ready before live verification');
    await mongoose.connect(process.env.CONNECT_DB, { ...connectionOptions(process.env.CONNECT_DB), autoIndex: false });
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    assert.ok(hello.setName && hello.isWritablePrimary, 'live MongoDB must be a replica-set primary');
    const userId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const cartIds = [];
    const orderIds = [];
    const results = [];
    try {
        await Users.collection.insertOne({ _id: userId, fullName: 'Checkout verification',
            email: `checkout-${crypto.randomUUID()}@example.invalid`, typeLogin: 'email', isAdmin: false });
        await Products.collection.insertOne({ _id: productId, nameProduct: 'Checkout verification fixture',
            price: 100000, discount: 0, stock: 5, soldCount: 0, images: '' });
        await createApiKey(userId);
        const token = await createToken({ id: String(userId) });
        const call = async (path, data) => {
            const response = await fetch(`http://localhost:5173/api/${path}`, {
                signal: AbortSignal.timeout(20000),
                method: data === undefined ? 'GET' : 'POST',
                headers: { Cookie: `token=${token}`, 'Content-Type': 'application/json' },
                body: data === undefined ? undefined : JSON.stringify(data),
            });
            assert.match(response.headers.get('content-type') || '', /application\/json/, `${path.split('?')[0]}: HTTP ${response.status}, expected JSON`);
            const body = await response.json();
            assert.ok(response.ok, `${path}: HTTP ${response.status}`);
            return { status: response.status, body };
        };
        for (const typePayment of ['COD', 'VNPAY']) {
            const cart = await Carts.create({ userId: String(userId), product: [{ productId, quantity: 1 }], totalPrice: 1 });
            cartIds.push(cart._id);
            const data = { cartId: String(cart._id), typePayment, fullName: 'Checkout verification',
                phone: '0900000000', address: 'Sandbox verification address', note: 'Automated verification fixture', totalPrice: 1 };
            const first = await call('create-payment', data);
            assert.equal(first.status, 201);
            const order = await Orders.findOne({ userId, checkoutKey: String(cart._id) });
            assert.ok(order);
            orderIds.push(order._id);
            assert.equal(order.totalPrice, 100000);
            assert.equal(await Carts.findById(cart._id), null);
            const replay = await call('create-payment', data);
            assert.equal(replay.status, 201);
            assert.equal(await Orders.countDocuments({ checkoutKey: String(cart._id) }), 1);
            const details = await call(`get-payment-success?idPayment=${order._id}`);
            assert.equal(details.body.metadata.totalPrice, 100000);
            const result = { method: typePayment, createStatus: first.status, replayStatus: replay.status,
                detailsStatus: details.status, amountFromDatabase: true, orderCount: 1 };
            if (typePayment === 'VNPAY') {
                assert.equal(first.body.metadata, replay.body.metadata);
                const url = new URL(first.body.metadata);
                assert.equal(url.hostname, 'sandbox.vnpayment.vn');
                assert.equal(url.searchParams.get('vnp_Amount'), '10000000');
                // curl's cookie engine preserves the provider session across redirects.
                const gateway = spawnSync(process.platform === 'win32' ? 'curl.exe' : 'curl', [
                    '-sS', '-L', '--cookie', '', '--max-time', '20',
                    ...(process.platform === 'win32' ? ['--ssl-no-revoke'] : []),
                    '--config', '-', '--write-out', '\n%{url_effective}\n%{http_code}',
                ], { input: `url = "${url.href}"\n`, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
                assert.equal(gateway.status, 0, 'provider HTTP request must complete');
                const parts = gateway.stdout.trimEnd().split('\n');
                result.gatewayStatus = Number(parts.pop());
                const gatewayLocation = new URL(parts.pop());
                const html = parts.join('\n');
                result.gatewayErrorPage = /\/error/i.test(gatewayLocation.pathname) || /Sai chữ ký|Invalid signature/i.test(html);
                const errorCode = [...gatewayLocation.searchParams.entries()].find(([key]) => /code/i.test(key))?.[1];
                result.gatewayPath = gatewayLocation.pathname;
                result.gatewayErrorCode = /^\d{1,3}$/.test(errorCode || '') ? errorCode : null;
                result.gatewayLandingReceived = result.gatewayStatus === 200 && html.length > 1000 && !result.gatewayErrorPage;
                result.providerPaymentConfirmed = false;
                if (!result.gatewayLandingReceived) process.exitCode = 1;
            }
            await call('cancel-order', { idOrder: String(order._id) });
            assert.equal((await Products.findById(productId)).stock, 5);
            result.cancelRestoredStock = true;
            results.push(result);
        }
        console.log(JSON.stringify({ replicaSet: hello.setName, proxy: 'localhost:5173', results }));
    } finally {
        // Only fixture IDs created by this run are removed; existing application data is untouched.
        for (const id of orderIds) {
            const order = await Orders.findById(id);
            if (order?.status === 'pending') await service.changeStatus(String(id), 'cancelled', String(userId));
        }
        await Attempts.deleteMany({ orderId: { $in: orderIds } });
        await Orders.deleteMany({ _id: { $in: orderIds }, userId });
        await Carts.deleteMany({ _id: { $in: cartIds }, userId: String(userId) });
        await Keys.deleteMany({ userId: String(userId) });
        await Products.deleteOne({ _id: productId });
        await Users.deleteOne({ _id: userId });
    }
}

main().catch((error) => {
    console.error(JSON.stringify({ verification: 'FAIL', name: error.name, code: error.code, message: error.name === 'AssertionError' ? error.message : 'Live verification failed; no credentials logged' }));
    process.exitCode = 1;
}).finally(() => mongoose.disconnect());
