const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const express = require('express');
const cookieParser = require('cookie-parser');
const { richText } = require('../src/utils/richText');
const rules = require('../src/services/product-data.service');
const { buildFilter } = require('../src/services/catalog-browse.service');
const preferences = require('../src/services/preferences.service');
const Products = require('../src/models/products.model');
const Users = require('../src/models/users.model');
const Orders = require('../src/models/payments.model');
const Reviews = require('../src/models/previewProduct.model');
const Categories = require('../src/models/category.model');
const { createApiKey, createToken } = require('../src/services/tokenSevices');

const fixture = () => ({ nameProduct: 'Đồng hồ thử nghiệm', modelNumber: `QA-${crypto.randomUUID()}`, brand: 'QA Watch',
    origin: 'Việt Nam', gender: 'Unisex', glassMaterial: 'Sapphire', movement: 'Quartz', dialDiameter: 38,
    strapMaterial: 'Thép không gỉ', waterResistance: '3 ATM', price: 1250000, discount: 10,
    description: '<p>Mô tả <strong>đồng hồ</strong></p>', images: '/uploads/products/qa.jpg', stock: 0 });

test('rich text removes active HTML and unsafe URLs while preserving product tables and Vietnamese', () => {
    const dirty = '<script>alert(1)</script><svg onload="alert(1)"></svg><p style="color:red" onclick="x()">Tiếng Việt</p>'
        + '<a href="jav&#x61;script:alert(1)">Link</a><img src="data:image/svg+xml,x" onerror="x()">'
        + '<iframe src="https://evil.example"></iframe><table><tbody><tr><td colspan="2">Sapphire</td></tr></tbody></table>';
    const safe = richText(dirty);
    assert.doesNotMatch(safe, /script|svg|onload|onclick|onerror|iframe|style=|data:/i);
    assert.match(safe, /Tiếng Việt/);
    assert.match(safe, /<td colspan="2">Sapphire<\/td>/);
    assert.match(richText('<img src="/uploads/products/qa.jpg" alt="Đồng hồ">'), /src="\/uploads\/products\/qa.jpg"/);
});

test('stock zero and complete product updates are valid; invalid numbers and privilege fields cannot enter the update', () => {
    assert.equal(rules.productInput(fixture(), true).stock, 0);
    const input = rules.productInput({ nameProduct: 'Tên mới', movement: 'Automatic', origin: 'Nhật Bản', isAdmin: true, soldCount: 999 });
    assert.equal(input.nameProduct, 'Tên mới');
    assert.equal(input.movement, 'Automatic');
    assert.equal(input.origin, 'Nhật Bản');
    assert.equal(input.isAdmin, undefined);
    assert.equal(input.soldCount, undefined);
    for (const patch of [{ stock: -1 }, { stock: 1.5 }, { stock: '0' }, { price: 0 }, { discount: 101 },
        { allowPreorder: 'true' }, { publicationStatus: 'admin' }, { images: 'javascript:alert(1)' }]) {
        assert.throws(() => rules.productInput({ ...fixture(), ...patch }, true), error => error.statusCode === 400);
    }
});

test('legacy and demo products require explicit verification; out of stock is not automatically a preorder', () => {
    const product = { stock: 2, publicationStatus: 'published', verificationStatus: 'verified' };
    assert.equal(rules.canPurchase(product), true);
    for (const patch of [{ publicationStatus: undefined }, { verificationStatus: 'demo' }, { verificationStatus: 'unverified' }, { stock: 0 }]) {
        assert.throws(() => rules.assertSale({ ...product, ...patch }), error => error.statusCode === 409);
    }
    assert.equal(rules.canPreorder({ stock: 0, publicationStatus: 'published' }), false);
    assert.equal(rules.canPreorder({ stock: 0, publicationStatus: 'published', allowPreorder: true }), true);
    assert.throws(() => rules.validateVerification({ verificationStatus: 'verified', verificationNote: '' }));
});

test('combined catalog filters escape regex and support Vietnamese with or without accents', () => {
    const filter = buildFilter({ category: '507f1f77bcf86cd799439011', brand: 'QA', search: 'dong ho [',
        movement: 'Quartz', minPrice: '1000', maxPrice: '2000', minDiameter: '30', maxDiameter: '40' });
    assert.equal(filter.brand, 'QA');
    assert.equal(filter.movement, 'Quartz');
    assert(new RegExp(filter.$or[0].nameProduct.$regex, 'i').test('ĐỒNG HỒ [ QA'));
    assert(!new RegExp(filter.$or[0].nameProduct.$regex, 'i').test('Đồng hồ A'));
    for (const query of [{ search: { $ne: '' } }, { brand: ['QA'] }, { stock: 'bad' }, { ids: 'invalid' },
        { minDiameter: '40', maxDiameter: '30' }]) assert.throws(() => buildFilter(query), error => error.statusCode === 400);
});

test('preferences allow bounded product IDs and local catalog links, reject mass assignment and external redirects', () => {
    const id = '507f1f77bcf86cd799439011';
    assert.deepEqual(preferences.validate({ wishlist: [id, id] }), { wishlist: [id] });
    assert.equal(preferences.validate({ savedSearches: [{ name: 'Bộ máy pin', url: '/category/all?movement=Quartz' }] }).savedSearches.length, 1);
    for (const input of [{ isAdmin: true }, { userId: id, wishlist: [] }, { wishlist: Array(101).fill(id) },
        { savedSearches: [{ name: 'Link', url: 'https://evil.example' }] }, { savedSearches: [{ name: 'Link', url: '//evil.example' }] },
        { addresses: [{ fullName: 'QA', phone: 'bad' }] }]) assert.throws(() => preferences.validate(input), error => error.statusCode === 400);
});

describe('storefront upgrades through real HTTP routes and isolated MongoDB', { skip: !process.env.MONGODB_TEST_URI }, () => {
    let server, origin, admin, buyer, stranger, category;
    before(async () => {
        await mongoose.connect(process.env.MONGODB_TEST_URI, { dbName: `upgrades_test_${crypto.randomUUID().replace(/-/g, '')}`, serverSelectionTimeoutMS: 5000 });
        await Reviews.init();
        category = await Categories.create({ name: 'Đồng Hồ Unisex' });
        const account = async isAdmin => {
            const user = await Users.create({ fullName: isAdmin ? 'QA Quản trị' : 'QA Khách', isAdmin });
            await createApiKey(user._id);
            return { id: String(user._id), cookie: `token=${await createToken({ id: String(user._id) })}` };
        };
        admin = await account(true); buyer = await account(false); stranger = await account(false);
        const app = express();
        app.use(express.json(), cookieParser());
        require('../src/routes')(app);
        app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message }));
        server = app.listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        origin = `http://127.0.0.1:${server.address().port}`;
    });
    after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); });
    const call = async (path, actor, method = 'GET', body) => {
        const response = await fetch(origin + path, { method, headers: { Cookie: actor?.cookie || '', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        return { status: response.status, data: await response.json() };
    };

    test('admin creates zero-stock product, updates all fields, and read API sanitizes legacy HTML without a DB rewrite', async () => {
        assert.equal((await call('/api/get-all-product')).status, 401);
        assert.equal((await call('/api/get-all-product', buyer)).status, 403);
        const body = { ...fixture(), category: String(category._id) };
        assert.equal((await call('/api/create-product', buyer, 'POST', body)).status, 403);
        const created = await call('/api/create-product', admin, 'POST', body);
        assert.equal(created.status, 201);
        const id = created.data.metadata._id;
        const updated = await call('/api/update-product', admin, 'POST', { id, nameProduct: 'Đồng hồ cập nhật', movement: 'Automatic', origin: 'Nhật Bản' });
        assert.equal(updated.status, 200);
        assert.equal((await Products.findById(id)).nameProduct, 'Đồng hồ cập nhật');
        assert.equal((await Products.findById(id)).movement, 'Automatic');
        await Products.updateOne({ _id: id }, { $set: { description: '<img src=x onerror="alert(1)"><strong>Tiếng Việt</strong>' } });
        const read = await call(`/api/get-product-by-id?id=${id}`);
        assert.equal(read.status, 200);
        assert.doesNotMatch(read.data.metadata.product.description, /onerror/);
        assert.match((await Products.findById(id)).description, /onerror/);
        assert.equal((await call('/api/update-product', admin, 'POST', { id, verificationStatus: 'verified' })).status, 400);
        assert.equal((await call('/api/get-all-product', admin)).status, 200);
        assert.equal((await call('/api/update-product', admin, 'POST', { id, publicationStatus: 'archived' })).status, 200);
        assert.equal((await call(`/api/get-product-by-id?id=${id}`)).status, 404);
    });

    test('preferences are owned by the session and cannot change roles or another account', async () => {
        const id = String(new mongoose.Types.ObjectId());
        assert.equal((await call('/api/preferences')).status, 401);
        assert.equal((await call('/api/preferences', buyer, 'PATCH', { wishlist: [id] })).status, 200);
        assert.deepEqual((await call(`/api/preferences?userId=${buyer.id}`, stranger)).data.metadata.wishlist, []);
        assert.equal((await call('/api/preferences', buyer, 'PATCH', { userId: stranger.id, wishlist: [] })).status, 400);
        assert.equal((await call('/api/preferences', buyer, 'PATCH', { isAdmin: true })).status, 400);
        assert.deepEqual((await call('/api/preferences', buyer)).data.metadata.wishlist, [id]);
    });

    test('review requires an owned delivered paid order, stays pending, and only an admin can publish it', async () => {
        const product = await Products.create({ ...fixture(), category: String(category._id) });
        const payload = { productId: String(product._id), content: 'Đánh giá có căn cứ.', rating: 4, moderationStatus: 'approved', userId: stranger.id };
        assert.equal((await call('/api/create-preview-product', buyer, 'POST', payload)).status, 403);
        await Orders.create({ userId: buyer.id, status: 'delivered', paymentStatus: 'paid', paymentMethod: 'COD', totalPrice: 1250000,
            product: [{ productId: product._id, quantity: 1, unitPrice: 1250000 }] });
        const created = await call('/api/create-preview-product', buyer, 'POST', payload);
        assert.equal(created.status, 201);
        const id = created.data.metadata.id;
        assert.equal((await call(`/api/reviews?productId=${product._id}`)).data.metadata.total, 0);
        assert.equal((await call(`/api/reviews/${id}/status`, buyer, 'PATCH', { status: 'approved' })).status, 403);
        assert.equal((await call(`/api/reviews/${id}/status`, admin, 'PATCH', { status: 'approved' })).status, 200);
        const list = (await call(`/api/reviews?productId=${product._id}`)).data.metadata;
        assert.equal(list.total, 1); assert.equal(list.items[0].verifiedPurchase, true);
        assert.equal(list.items[0].userId, undefined);
        assert.equal((await call('/api/create-preview-product', buyer, 'POST', payload)).status, 409);
        assert.equal((await call('/api/create-preview-product', stranger, 'POST', payload)).status, 403);
    });

    test('review query filters by product before pagination, so global first-ten reviews cannot hide another product', async () => {
        const first = new mongoose.Types.ObjectId(), target = new mongoose.Types.ObjectId();
        await Reviews.collection.insertMany(Array.from({ length: 11 }, (_, index) => ({ productId: index < 10 ? first : target,
            userId: buyer.id, content: 'Nội dung', rating: 5, moderationStatus: 'approved', createdAt: new Date(index) })));
        const data = (await call(`/api/reviews?productId=${target}`)).data.metadata;
        assert.equal(data.total, 1); assert.equal(data.items.length, 1); assert.equal(data.items[0].verifiedPurchase, false);
    });

    test('preorders require an explicit offer and history is visible only to the owner or admin', async () => {
        const product = await Products.create({ ...fixture(), category: String(category._id), publicationStatus: 'published', allowPreorder: false });
        const input = { productId: String(product._id), fullName: 'QA Khách', phone: '0901234567', quantity: 1, consent: true, userId: stranger.id };
        assert.equal((await call('/api/preorders', buyer, 'POST', input)).status, 409);
        await Products.updateOne({ _id: product._id }, { $set: { allowPreorder: true } });
        const created = await call('/api/preorders', buyer, 'POST', input);
        assert.equal(created.status, 201);
        const id = created.data.metadata.id;
        assert.equal((await call('/api/preorders/mine', stranger)).data.metadata.total, 0);
        assert.equal((await call(`/api/preorders/${id}/status`, admin, 'PATCH', { status: 'contacted', note: 'Đã trao đổi lịch dự kiến.' })).status, 200);
        const mine = (await call('/api/preorders/mine', buyer)).data.metadata;
        assert.equal(mine.total, 1); assert.equal(mine.items[0].history.length, 2);
        assert.equal(mine.items[0].history[1].note, 'Đã trao đổi lịch dự kiến.');
    });
});
