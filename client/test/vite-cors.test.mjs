import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('dev preflight allows credentials only for configured origins', async () => {
    const server = await createServer({ server: { port: 0, strictPort: false }, logLevel: 'silent' });
    try {
        await server.listen();
        const { port } = server.httpServer.address();
        for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://untrusted.example.test']) {
            const response = await fetch(`http://127.0.0.1:${port}/api/login`, {
                method: 'OPTIONS',
                headers: {
                    Origin: origin,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'content-type',
                },
            });
            assert.equal(response.status, 204);
            if (origin === 'https://untrusted.example.test') {
                assert.equal(response.headers.get('access-control-allow-origin'), null);
            } else {
                assert.equal(response.headers.get('access-control-allow-origin'), origin);
                assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
                assert.match(response.headers.get('access-control-allow-methods'), /POST/);
                assert.equal(response.headers.get('access-control-allow-headers'), 'content-type');
            }
        }
    } finally {
        await server.close();
    }
});

test('localhost still starts when no tunnel hostname is configured', async () => {
    const previous = process.env.VITE_TUNNEL_HOST;
    process.env.VITE_TUNNEL_HOST = '';
    let server;
    try {
        server = await createServer({ server: { port: 0, strictPort: false }, logLevel: 'silent' });
        assert.deepEqual(server.config.server.allowedHosts, []);
        await server.listen();
        const response = await fetch(`http://127.0.0.1:${server.httpServer.address().port}/api/login`, {
            method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' },
        });
        assert.equal(response.status, 204);
        assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    } finally {
        if (server) await server.close();
        if (previous === undefined) delete process.env.VITE_TUNNEL_HOST;
        else process.env.VITE_TUNNEL_HOST = previous;
    }
});
