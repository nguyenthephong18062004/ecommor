import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateInput, dateTime, money, salePrice, canBuy, canOrder } from '../src/utils/format.js';

test('VND and expected dates remain Vietnamese and use Vietnam timezone across UTC midnight', () => {
    assert.match(money(12500000), /12\.500\.000\s*₫/);
    assert.equal(dateInput('2026-11-01T17:00:00.000Z'), '2026-11-02');
    assert.equal(dateTime('2026-11-01T17:00:00.000Z'), '02/11/2026');
    assert.equal(money(undefined), 'Chưa xác định');
    assert.equal(salePrice({ price: 100005, discount: 10 }), 90005);
});

test('purchase and preorder actions reflect explicit server data, never just positive or zero stock', () => {
    assert.equal(canBuy({ stock: 10 }), false);
    assert.equal(canBuy({ stock: 10, publicationStatus: 'published', verificationStatus: 'verified' }), true);
    assert.equal(canOrder({ stock: 0, publicationStatus: 'published' }), false);
    assert.equal(canOrder({ stock: 0, publicationStatus: 'published', allowPreorder: true }), true);
});
