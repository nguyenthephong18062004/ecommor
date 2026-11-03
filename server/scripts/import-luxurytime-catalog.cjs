const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const mongoose = require('mongoose');
const { VERSION, CATEGORIES, norm, stableId, mapProducts } = require('./luxurytime-mapping.cjs');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectionOptions } = require('../src/config/connectDB');
const Product = require('../src/models/products.model');
const Category = require('../src/models/category.model');
const output = path.resolve(__dirname, '../../.runtime/exports/luxurytime-2026-10-13');

function digest(value) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function validatePlan(plan) {
    assert.equal(new Set(plan.map(p => p.sourceId)).size, plan.length, 'Duplicate source IDs');
    assert.equal(new Set(plan.map(p => p.product._id)).size, plan.length, 'Duplicate product IDs');
    for (const { product } of plan) {
        const error = new Product(product).validateSync();
        if (error) throw new Error('Product schema validation failed');
        assert(Number.isSafeInteger(product.price) && product.price > 0);
        assert(Number.isSafeInteger(product.stock) && product.stock >= 0);
        assert.equal(product.discount, 0);
        assert.equal(product.soldCount, 0);
        assert(mongoose.isValidObjectId(product.category));
        // Imported source data has no measured parcel; GHN uses explicit estimates until an admin enters it.
        for (const field of Product.schema.requiredPaths()) {
            assert(product[field] !== undefined && product[field] !== null && product[field] !== '', `Missing field: ${field}`);
        }
    }
}

async function run() {
    const apply = process.argv.includes('--apply');
    if (apply && (!process.argv.includes('--demo-data') || process.env.NODE_ENV === 'production')) {
        throw new Error('Apply requires --demo-data in a non-production environment');
    }
    await mongoose.connect(process.env.CONNECT_DB, {
        ...connectionOptions(process.env.CONNECT_DB), serverSelectionTimeoutMS: 10000,
    });
    const staging = mongoose.connection.db.collection('luxurytime_products');
    const sourceRows = await staging.find({ source: 'luxurytime.vn' }).sort({ sourceId: 1 }).toArray();
    assert.equal(sourceRows.length, 744, 'Expected the complete source export');
    const sourceDigest = digest(sourceRows.map(row => row.sourceData));
    const existing = await Product.find({}).sort({ _id: 1 }).lean();
    const categories = await Category.find({}).sort({ _id: 1 }).lean();
    const importedIds = new Set(sourceRows.map(row => stableId('product', row.sourceId)));
    const legacy = existing.filter(p => !importedIds.has(String(p._id)));
    const categoryIds = {};
    const newCategories = [];
    for (const [key, name] of Object.entries(CATEGORIES)) {
        const found = categories.find(c => norm(c.name) === norm(name));
        categoryIds[key] = found ? String(found._id) : stableId('category', key);
        if (!found) newCategories.push({ _id: categoryIds[key], name });
    }
    const plan = mapProducts(sourceRows.map(row => row.sourceData), legacy, categoryIds);
    validatePlan(plan);
    const existingIds = new Set(existing.map(p => String(p._id)));
    for (const row of sourceRows) {
        const id = stableId('product', row.sourceId);
        if (existingIds.has(id)) {
            assert.equal(row.catalog?.productId, id, 'Existing product ID is not owned by this import');
        }
    }
    const summary = {
        version: VERSION, mode: apply ? 'apply' : 'preview', database: mongoose.connection.name,
        sourceCount: sourceRows.length, productsBefore: existing.length,
        plannedInserts: plan.filter(p => !existingIds.has(p.product._id)).length,
        missingRequiredFields: 0, sourcePrices: plan.filter(p => p.fields.price.mode === 'source').length,
        demoPrices: plan.filter(p => p.fields.price.mode === 'demo').length,
        demoStock: plan.filter(p => p.fields.stock.mode === 'demo').length,
        zeroStock: plan.filter(p => p.product.stock === 0).length,
        minPrice: Math.min(...plan.map(p => p.product.price)), maxPrice: Math.max(...plan.map(p => p.product.price)),
        categories: Object.fromEntries(Object.keys(CATEGORIES).map(key => [CATEGORIES[key], plan.filter(p => p.categoryKey === key).length])),
        fieldOrigins: {}, sourceDigest,
    };
    for (const item of plan) for (const [key, value] of Object.entries(item.fields)) {
        summary.fieldOrigins[key] ||= {};
        summary.fieldOrigins[key][value.mode] = (summary.fieldOrigins[key][value.mode] || 0) + 1;
    }
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'catalog-plan.json'), JSON.stringify({ summary, newCategories, plan }, null, 2));
    if (!apply) {
        console.log(JSON.stringify(summary, null, 2));
        return;
    }
    const backupPath = path.join(output, `catalog-backup-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify({ products: existing, categories, staging: sourceRows }, null, 2), { flag: 'wx' });
    const session = await mongoose.startSession();
    let writes;
    try {
        await session.withTransaction(async () => {
            const now = new Date();
            if (newCategories.length) await Category.bulkWrite(newCategories.map(c => ({ updateOne: {
                filter: { _id: c._id }, update: { $setOnInsert: { ...c, createdAt: now, updatedAt: now } }, upsert: true, timestamps: false,
            } })), { session });
            writes = await Product.bulkWrite(plan.map(item => ({ updateOne: {
                filter: { _id: item.product._id },
                update: { $setOnInsert: { ...item.product, createdAt: now, updatedAt: now } },
                upsert: true, timestamps: false,
            } })), { session });
            const newMappings = plan.filter(item => !existingIds.has(item.product._id));
            if (newMappings.length) await staging.bulkWrite(newMappings.map(item => ({ updateOne: {
                filter: { _id: `luxurytime.vn:${item.sourceId}`, source: 'luxurytime.vn' },
                update: { $set: { importStatus: 'catalog_demo', catalog: {
                    productId: item.product._id, version: VERSION, importedAt: now,
                    fields: item.fields, demoFields: item.demoFields,
                } } },
            } })), { session });
            const stored = await Product.find({ _id: { $in: plan.map(item => item.product._id) } }).session(session).lean();
            assert.equal(stored.length, plan.length);
            const byId = new Map(stored.map(p => [String(p._id), p]));
            for (const item of newMappings) for (const [field, value] of Object.entries(item.product)) {
                assert.deepEqual(field === '_id' ? String(byId.get(item.product._id)[field]) : byId.get(item.product._id)[field], value);
            }
            const oldAfter = await Product.find({ _id: { $in: legacy.map(p => p._id) } }).sort({ _id: 1 }).session(session).lean();
            assert.equal(digest(oldAfter), digest(legacy), 'Existing products changed; abort import');
        });
    } finally {
        await session.endSession();
    }
    const afterRows = await staging.find({ source: 'luxurytime.vn' }).sort({ sourceId: 1 }).toArray();
    assert.equal(digest(afterRows.map(row => row.sourceData)), sourceDigest, 'Source data changed');
    summary.inserted = writes.upsertedCount;
    summary.modifiedExisting = writes.modifiedCount;
    summary.productsAfter = await Product.countDocuments({});
    summary.categoriesAfter = await Category.countDocuments({});
    summary.sourceDataPreserved = true;
    summary.legacyProductsPreserved = legacy.length;
    summary.backupFile = path.basename(backupPath);
    summary.checkedAt = new Date().toISOString();
    fs.writeFileSync(path.join(output, summary.inserted ? 'catalog-import-report.json' : 'catalog-repeat-report.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
    run().catch(error => {
        console.error(`Catalog import failed (${error.name}); connection details omitted.`);
        process.exitCode = 1;
    }).finally(() => mongoose.disconnect());
}

module.exports = { validatePlan };
