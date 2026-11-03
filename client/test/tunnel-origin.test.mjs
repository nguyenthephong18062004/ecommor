import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl, resolveUploadUrl } from '../src/config/apiBaseUrl.js';

test('a configured Vite tunnel uses the current page proxy to avoid cross-site cookies', () => {
    const host = 'shop.ngrok-free.dev';
    for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173', `https://${host}`]) {
        const base = resolveApiBaseUrl(`https://${host}`, { dev: true, mode: 'proxy' });
        assert.equal(base, '');
        assert.equal(new URL(base + '/api/login', origin).origin, origin);
    }
});

test('distinct remote backends and configured subpaths are preserved', () => {
    const host = 'shop.ngrok-free.dev';
    for (const api of ['https://api.example.test', `https://${host}/backend`, `https://${host}?tenant=1`]) {
        assert.equal(resolveApiBaseUrl(api, { dev: true, mode: 'configured' }), api);
        assert.equal(resolveApiBaseUrl(api, { dev: false }), api);
    }
    assert.equal(resolveApiBaseUrl(`https://${host}`, { dev: false, mode: 'proxy' }), `https://${host}`);
});

test('uploaded paths resolve without duplicate slashes or uploads prefixes', () => {
    for (const path of ['/uploads/products/watch.png', 'uploads/products/watch.png', '//uploads/products/watch.png']) {
        assert.equal(resolveUploadUrl(path, 'https://offline.ngrok-free.dev', { dev: true }), '/uploads/products/watch.png');
        assert.equal(resolveUploadUrl(path, 'https://cdn.example.test/uploads/', { dev: false }), 'https://cdn.example.test/uploads/products/watch.png');
    }
    assert.equal(resolveUploadUrl('', '', { dev: true }), '');
    assert.equal(resolveUploadUrl('https://cdn.example.test/watch.png', '', { dev: true }), 'https://cdn.example.test/watch.png');
    assert.throws(() => resolveApiBaseUrl('', { dev: true, mode: 'unknown' }), /VITE_API_MODE/);
});
