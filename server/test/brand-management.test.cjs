const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const express = require('express');
const cookieParser = require('cookie-parser');
const Brands = require('../src/models/brand.model');
const Products = require('../src/models/products.model');
const service = require('../src/services/brand.service');
const catalog = require('../src/services/catalog-browse.service');

test('brand suggestions preserve saved and product brands; removed management APIs return 404',
    { skip: !process.env.MONGODB_TEST_URI }, async () => {
        await mongoose.connect(process.env.MONGODB_TEST_URI, {
            dbName: `brand_test_${crypto.randomUUID().replace(/-/g, '')}`,
            serverSelectionTimeoutMS: 5000,
        });
        const app = express();
        app.use(express.json());
        app.use(cookieParser());
        app.use('/api/brands', require('../src/routes/brand.routes'));
        app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message }));
        const server = app.listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        try {
            const base = `http://127.0.0.1:${server.address().port}`;
            assert.equal((await fetch(`${base}/api/brands`)).status, 200);
            for (const method of ['POST', 'PATCH', 'DELETE']) {
                assert.equal((await fetch(`${base}/api/brands`, { method })).status, 404);
            }

            await Products.collection.insertOne({ brand: 'Rolex', nameProduct: 'Test watch', price: 1000 });
            assert.deepEqual(await service.list(), [{ name: 'Rolex', productCount: 1 }]);
            assert.deepEqual((await catalog.options()).brands, ['Rolex']);

            await Brands.create({ name: 'Omega', key: 'omega' });
            assert.deepEqual((await catalog.options()).brands, ['Omega', 'Rolex']);
            assert.deepEqual(await service.list(), [
                { name: 'Omega', description: '', logo: '', productCount: 0 }, { name: 'Rolex', productCount: 1 },
            ]);
            assert.equal(await Brands.countDocuments({}), 1);
            assert.equal((await Products.findOne()).brand, 'Rolex');
        } finally {
            await new Promise(resolve => server.close(resolve));
            await mongoose.disconnect();
        }
    });
