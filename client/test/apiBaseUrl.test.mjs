import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl } from '../src/config/apiBaseUrl.js';

test('tunnel checkout and login use the public origin instead of browser localhost', () => {
    const origin = 'https://checkout.example.test';
    for (const api of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000', 'https://offline.ngrok-free.dev']) {
        const base = resolveApiBaseUrl(api, { dev: true });
        for (const path of ['/api/update-info-cart', '/api/create-payment', '/api/login', '/api/refresh-token']) {
            assert.equal(new URL(base + path, origin).href, origin + path);
        }
    }
});

test('local dev, intentional remote backends and relative configuration stay intact', () => {
    assert.equal(resolveApiBaseUrl('http://localhost:3000'), 'http://localhost:3000');
    assert.equal(resolveApiBaseUrl('https://api.example.test'), 'https://api.example.test');
    assert.equal(resolveApiBaseUrl(''), '');
    assert.equal(resolveApiBaseUrl('/backend'), '/backend');
});
