import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAuthReturnTo } from '../src/utils/authRedirect.js';

test('keeps the intended customer page and payment query when returning after authentication', () => {
    for (const path of ['/product/123', '/cart', '/checkout', '/dat-hang/123', '/orders', '/payments/123?status=pending#details']) {
        assert.equal(getAuthReturnTo(path), path);
    }
});

test('rejects external URLs, malformed paths and authentication redirect loops', () => {
    for (const value of [undefined, null, {}, '', 'https://example.test', '//example.test', '/\\example.test', '/\n/example.test', '/login', '/register?next=/checkout', '/forgot-password', '/admin', '/admin/users']) {
        assert.equal(getAuthReturnTo(value), '/');
        assert.equal(getAuthReturnTo(value, null), null);
    }
});
