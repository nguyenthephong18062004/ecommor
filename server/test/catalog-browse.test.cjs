const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const express = require('express');
const Products = require('../src/models/products.model');
const Categories = require('../src/models/category.model');

describe('catalog browse and filters over HTTP', { skip: !process.env.MONGODB_TEST_URI }, () => {
    let server;
    let base;
    let categoryId;
    let otherId;

    before(async () => {
        await mongoose.connect(process.env.MONGODB_TEST_URI, {
            dbName: `browse_test_${crypto.randomUUID().replace(/-/g, '')}`, serverSelectionTimeoutMS: 5000,
        });
        const categories = await Categories.create([{ name: 'Đồng Hồ Nam' }, { name: 'Đồng Hồ Nữ' }]);
        categoryId = String(categories[0]._id);
        otherId = String(categories[1]._id);
        await Products.collection.insertMany(Array.from({ length: 45 }, (_, index) => ({
            _id: new mongoose.Types.ObjectId(), nameProduct: `Watch ${index}`, brand: index < 30 ? 'Rolex' : 'Omega',
            category: index < 40 ? categoryId : otherId, price: 1000000 + index * 100000,
            discount: index === 0 ? 50 : 0, stock: index % 3 === 0 ? 0 : 2,
            images: 'watch.jpg', soldCount: 0, description: 'Private detail', publicationStatus: 'published', allowPreorder: true,
            createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)),
        })));
        const app = express();
        require('../src/routes')(app);
        app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message }));
        server = app.listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        base = `http://127.0.0.1:${server.address().port}`;
    });
    after(async () => {
        if (server) await new Promise(resolve => server.close(resolve));
        await mongoose.disconnect();
    });

    async function get(path) {
        const response = await fetch(base + path);
        assert.equal(response.status, 200);
        return (await response.json()).metadata;
    }

    test('options contain real categories and distinct brands, without creating brand categories', async () => {
        const options = await get('/api/catalog-options');
        assert.equal(options.categories.length, 2);
        assert.deepEqual(options.brands, ['Omega', 'Rolex']);
        assert.equal(options.priceMax, 5400000);
    });

    test('all products have stable pages of at most 20 without duplicates', async () => {
        const pages = await Promise.all([1, 2, 3].map(page => get(`/api/catalog-browse?page=${page}&limit=999`)));
        assert.deepEqual(pages.map(page => page.items.length), [20, 20, 5]);
        assert(pages.every(page => page.pageSize === 20 && page.total === 45 && page.totalPages === 3));
        const ids = pages.flatMap(page => page.items.map(item => item._id));
        assert.equal(new Set(ids).size, 45);
        assert(pages[0].items.every(item => item.description === undefined));
    });

    test('specific category and brand filters combine with stock state', async () => {
        const category = await get(`/api/catalog-browse?category=${categoryId}&stock=order`);
        assert.equal(category.total, 14);
        assert(category.items.every(item => item.category === categoryId && item.stock <= 0));
        const brand = await get('/api/catalog-browse?brand=Rolex&stock=in');
        assert.equal(brand.total, 20);
        assert(brand.items.every(item => item.brand === 'Rolex' && item.stock > 0));
        const other = await get(`/api/catalog-browse?category=${otherId}`);
        assert.equal(other.total, 5);
    });

    test('price filter uses discounted price and search escapes regex syntax', async () => {
        const priced = await get('/api/catalog-browse?maxPrice=500000');
        assert.equal(priced.total, 1);
        assert.equal(priced.items[0].nameProduct, 'Watch 0');
        const literal = await get('/api/catalog-browse?search=Watch%20%5B');
        assert.equal(literal.total, 0);
        const searched = await get('/api/catalog-browse?search=Watch%2044');
        assert.equal(searched.total, 1);
    });

    test('invalid filters return 400; page beyond end clamps', async () => {
        for (const query of ['page=0', 'page=1&page=2', 'stock[$gt]=0', 'stock=bad',
            'minPrice=-1', 'minPrice=100&maxPrice=1', 'brand[$ne]=Rolex', 'sort[$ne]=newest']) {
            assert.equal((await fetch(`${base}/api/catalog-browse?${query}`)).status, 400, query);
        }
        const last = await get('/api/catalog-browse?page=999');
        assert.equal(last.page, 3);
        assert.equal(last.items.length, 5);
        const combined = await get(`/api/catalog-browse?category=${categoryId}&brand=Rolex`);
        assert.equal(combined.total, 30);
    });
});
