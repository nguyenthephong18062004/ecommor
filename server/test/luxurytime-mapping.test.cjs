const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mapProducts, dimensions, stableId, identify } = require('../scripts/luxurytime-mapping.cjs');
const { validatePlan } = require('../scripts/import-luxurytime-catalog.cjs');

const categories = Object.fromEntries(['male', 'female', 'unisex', 'accessory'].map(key => [key, stableId('category', key)]));
function fixture(overrides = {}) {
    return {
        id: 1, name: 'Rolex Datejust 40mm', price: null, currency: 'VND',
        source_url: 'https://luxurytime.vn/san-pham/fixture',
        categories: [{ name: 'Dong ho Rolex' }], is_in_stock: true,
        image_urls: ['https://luxurytime.vn/image.jpg'],
        specifications: [{ name: 'Ref', value: 'DJ-40' }, { name: 'Movement', value: 'Automatic' },
            { name: 'Kich thuoc Size', value: '40mm' }, { name: 'Trong Kho', value: 'Co San' }],
        ...overrides,
    };
}

test('size parsing distinguishes decimal commas, alternative sizes, case width and thickness', () => {
    assert.equal(dimensions('35,6mm'), 35.6);
    assert.equal(dimensions('40,42mm'), 40);
    assert.equal(dimensions('49,9 x 42,7 mm'), 42.7);
    assert.equal(dimensions('47.5x38.7mm'), 38.7);
    assert.equal(dimensions('36mm x 11.7mm'), 36);
    assert.equal(dimensions('Tuy Chon 36 & 41mm'), 36);
    assert.equal(dimensions('18mm'), null);
});

test('source price wins; missing price uses same-family median and excludes custom pieces', () => {
    const sources = [fixture(), fixture({ id: 2, price: 8500000 }), fixture({ id: 3, price: 9500000 }),
        fixture({ id: 4, price: 86000000, categories: [{ name: 'Dong Ho Che Tac' }] })];
    const plan = mapProducts(sources, [], categories);
    validatePlan(plan);
    assert.equal(plan[0].product.price, 9000000);
    assert.deepEqual(plan[0].fields.price.evidence.sourceIds, [2, 3]);
    assert.equal(plan[1].product.price, 8500000);
    assert.equal(plan[1].product.discount, 0);
    assert.equal(plan[1].fields.price.mode, 'source');
});

test('order-only stock is zero despite WooCommerce in-stock flag; demo stock is capped', () => {
    const order = fixture({ id: 2, specifications: [{ name: 'Trong Kho', value: 'Hang Dat 20 - 30 Ngay' }] });
    const plan = mapProducts([fixture(), order], [{ nameProduct: 'Dong ho Nam', stock: 499, price: 4000000 }], categories);
    assert.equal(plan[0].product.stock, 10);
    assert.equal(plan[1].product.stock, 0);
    assert.equal(plan[1].fields.stock.mode, 'derived');
    assert.equal(plan[0].product.soldCount, 0);
});

test('accessories do not inherit watch movement or dial dimensions', () => {
    const accessory = fixture({ name: 'Day dong ho Aquanaut Nu 18mm', categories: [{ name: 'Phu Kien Dong Ho' }], specifications: [] });
    const plan = mapProducts([accessory], [], categories);
    validatePlan(plan);
    assert.equal(identify(accessory).accessory, true);
    assert.equal(plan[0].categoryKey, 'accessory');
    assert.equal(plan[0].product.dialDiameter, 0);
    assert.equal(plan[0].fields.movement.mode, 'not_applicable');
});

test('escaped source descriptions cannot inject scripts or event handlers into catalog HTML', () => {
    const source = fixture({ name: '<img onerror="evil()">', description: '<script>evil()</script>',
        specifications: [{ name: '<svg onload="evil()">', value: '<iframe src="bad">' }] });
    const [{ product }] = mapProducts([source], [], categories);
    assert(!/<script|<img|<svg|<iframe/.test(product.description));
    assert(product.description.includes('&lt;script&gt;'));
});

test('stable source IDs preserve distinct variants; raw data is not mutated', () => {
    const sources = [fixture(), fixture({ id: 2 })];
    const before = structuredClone(sources);
    const first = mapProducts(sources, [], categories);
    const second = mapProducts(sources, [], categories);
    assert.deepEqual(first, second);
    assert.notEqual(first[0].product._id, first[1].product._id);
    assert.deepEqual(sources, before);
    assert.throws(() => validatePlan([first[0], first[0]]));
});

test('inferred material is traceable, while country and warranty remain explicitly unverified', () => {
    const other = fixture({ id: 2, specifications: [{ name: 'Mat Kinh', value: 'Sapphire' }, { name: 'Xuat xu', value: 'Rolex' }] });
    const [mapped] = mapProducts([fixture(), other], [], categories);
    assert.equal(mapped.product.glassMaterial, 'Sapphire');
    assert.equal(mapped.fields.glassMaterial.mode, 'demo');
    assert.deepEqual(mapped.fields.glassMaterial.evidence.sourceIds, [2]);
    assert.equal(mapped.fields.origin.mode, 'unknown');
    assert.equal(mapped.fields.warrantyGlobal.mode, 'unknown');
    assert(mapped.product.description.includes('glassMaterial'));
});

test('invalid currencies and unsafe image schemes are rejected before any database writes', () => {
    assert.throws(() => mapProducts([fixture({ currency: 'USD' })], [], categories));
    assert.throws(() => mapProducts([fixture({ image_urls: ['javascript:alert(1)'] })], [], categories));
});
