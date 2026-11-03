const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const express = require('express');
const Products = require('../src/models/products.model');
const Categories = require('../src/models/category.model');
const catalog = require('../src/services/product-catalog.service');

test('page input rejects malformed, non-scalar and unsafe values', () => {
    assert.equal(catalog.parsePage(undefined), 1);
    assert.equal(catalog.parsePage('12'), 12);
    for (const input of ['', '0', '-1', '1.5', '1e3', 'Infinity', '9007199254740992', ['1', '2'], { $gt: 0 }]) {
        assert.throws(() => catalog.parsePage(input), error => error.statusCode === 400);
    }
});

test('homepage sections stay ordered and each group has its own page count', () => {
    const sections = catalog.buildSections({ latest: Array(10).fill({}),
        genderCounts: [{ _id: 'Nam', total: 23 }, { _id: 'N\u1eef', total: 12 }],
        brandCounts: [{ _id: 'Beta', total: 21 }, { _id: 'Alpha', total: 10 }] });
    assert.deepEqual(sections.map(s => [s.key, s.pages]), [
        ['new', 1], ['gender:Nam', 3], ['gender:N\u1eef', 2],
        ['brand:Alpha', 1], ['brand:Beta', 3],
    ]);
});

test('empty and exact-multiple groups do not invent extra populated pages', () => {
    const sections = catalog.buildSections({ latest: [], genderCounts: [{ _id: 'Nam', total: 20 }], brandCounts: [] });
    assert.deepEqual(sections.map(s => [s.total, s.pages]), [[0, 1], [20, 2], [0, 1]]);
});

describe('catalog pagination over real MongoDB and registered HTTP routes', { skip: !process.env.MONGODB_TEST_URI }, () => {
    let server;
    let base;
    let rows;
    before(async () => {
        await mongoose.connect(process.env.MONGODB_TEST_URI, {
            dbName: `catalog_test_${crypto.randomUUID().replace(/-/g, '')}`, serverSelectionTimeoutMS: 5000,
        });
        const categories = await Categories.create([{ name: '\u0110\u1ed3ng H\u1ed3 Nam' }, { name: '\u0110\u1ed3ng H\u1ed3 N\u1eef' },
            { name: '\u0110\u1ed3ng H\u1ed3 Unisex' }, { name: 'Ph\u1ee5 Ki\u1ec7n \u0110\u1ed3ng H\u1ed3' }]);
        rows = Array.from({ length: 40 }, (_, index) => ({
            _id: new mongoose.Types.ObjectId(), nameProduct: `Fixture ${index}`, price: 100000 + index, discount: 0,
            stock: index >= 35 ? 0 : 5, soldCount: 0, images: 'https://example.test/watch.jpg',
            gender: index < 23 ? 'Nam' : index < 35 ? 'N\u1eef' : 'Unisex',
            category: String(categories[index < 23 ? 0 : index < 35 ? 1 : index < 39 ? 2 : 3]._id),
            brand: index % 2 ? 'Beta' : 'Alpha',
            createdAt: new Date(Date.UTC(2026, 0, 1, 0, Math.floor(index / 2))),
            updatedAt: new Date(Date.UTC(2027, 0, 1, 0, 40 - index)),
            description: 'Long detail should not be included in catalog cards',
        }));
        await Products.collection.insertMany(rows);
        const app = express();
        require('../src/routes')(app);
        app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: 'Request failed' }));
        server = app.listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        base = `http://127.0.0.1:${server.address().port}`;
    });
    after(async () => {
        if (server) await new Promise(resolve => server.close(resolve));
        await mongoose.disconnect();
    });

    async function request(url) {
        const response = await fetch(base + url);
        assert.equal(response.status, 200);
        return (await response.json()).metadata;
    }

    test('latest returns only ten positive-stock items sorted by import date, then stable ID', async () => {
        const expected = rows.filter(row => row.stock > 0).sort((a, b) => b.createdAt - a.createdAt || String(b._id).localeCompare(String(a._id))).slice(0, 10);
        const latest = await request('/api/get-product-new');
        const first = await request('/api/product-catalog');
        assert.equal(latest.length, 10);
        assert.deepEqual(latest.map(p => p._id), expected.map(p => String(p._id)));
        assert.deepEqual(first.items, latest);
        assert(first.items.every(p => p.stock > 0 && p.description === undefined));
        assert.equal(first.section.key, 'new');
        assert.equal(first.pageSize, 10);
    });

    test('every group paginates once without missing or repeating items within the group', async () => {
        const first = await request('/api/product-catalog?page=1');
        assert.deepEqual(first.sections.map(s => s.key), ['new', 'gender:Nam', 'gender:N\u1eef', 'brand:Alpha', 'brand:Beta']);
        for (const section of first.sections.slice(1)) {
            const ids = [];
            for (let page = 1; page <= section.pages; page++) {
                const result = await request(`/api/product-catalog?type=${section.type}&value=${encodeURIComponent(section.value)}&page=${page}&limit=999`);
                assert.equal(result.page, page);
                assert.equal(result.section.key, section.key);
                assert(result.items.length <= 10);
                assert(result.items.every(p => p[section.type === 'gender' ? 'gender' : 'brand'] === section.value));
                ids.push(...result.items.map(p => p._id));
            }
            const expected = rows.filter(p => String(p._id) !== String(rows[39]._id)
                && p[section.type === 'gender' ? 'gender' : 'brand'] === section.value);
            assert.equal(ids.length, expected.length);
            assert.equal(new Set(ids).size, ids.length);
            assert.deepEqual(new Set(ids), new Set(expected.map(p => String(p._id))));
        }
    });

    test('last male page stays male; female section starts independently at page one', async () => {
        const maleEnd = await request('/api/product-catalog?type=gender&value=Nam&page=3');
        const femaleStart = await request('/api/product-catalog?type=gender&value=N%E1%BB%AF&page=1');
        assert.equal(maleEnd.items.length, 3);
        assert(maleEnd.items.every(p => p.gender === 'Nam'));
        assert.equal(maleEnd.totalPages, 3);
        assert.equal(femaleStart.items.length, 10);
        assert(femaleStart.items.every(p => p.gender === 'N\u1eef'));
        assert.equal(femaleStart.totalPages, 2);
    });

    test('product detail returns at most eight related products from the same category', async () => {
        const productId = String(rows[0]._id);
        const result = await request(`/api/get-product-by-id?id=${productId}`);
        assert.equal(result.relatedProducts.length, 8);
        assert(result.relatedProducts.every(item => item.category === rows[0].category && item._id !== productId));
        assert.deepEqual(result.relatedProducts.map(item => item._id),
            [...result.relatedProducts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                || b._id.localeCompare(a._id)).map(item => item._id));
    });

    test('out-of-range page clamps to last; invalid or duplicate parameters return 400', async () => {
        const last = await request('/api/product-catalog?type=gender&value=Nam&page=999999');
        assert.equal(last.page, last.totalPages);
        for (const query of ['page=0', 'page=-2', 'page=abc', 'page=1&page=2', 'page[$gt]=0']) {
            assert.equal((await fetch(`${base}/api/product-catalog?${query}`)).status, 400);
        }
        for (const query of ['type=brand&value[$gt]=A', 'type=gender&value=All', 'type=unknown', 'type=new&value=Rolex']) {
            assert.equal((await fetch(`${base}/api/product-catalog?${query}`)).status, 400);
        }
    });
});
