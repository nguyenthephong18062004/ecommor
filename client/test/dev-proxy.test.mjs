import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer, request } from 'node:http';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { io } from 'socket.io-client';

const serverRequire = createRequire(new URL('../../server/package.json', import.meta.url));
const { Server } = serverRequire('socket.io');
const cors = serverRequire('cors');
const { getCorsOptions } = serverRequire('./src/config/cors');

function get(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = request(url, { headers }, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const body = Buffer.concat(chunks);
                resolve({ status: res.statusCode, headers: new Headers(res.headers),
                    json: async () => JSON.parse(body), arrayBuffer: async () => body });
            });
            res.on('error', reject);
        });
        req.on('error', reject);
        req.end();
    });
}

test('one Vite proxy serves local/public hosts, uploads, callback queries and WebSocket without ngrok or DB', async () => {
    const host = 'grazing-seltzer-figurine.ngrok-free.dev';
    const tunnelOrigin = `https://${host}`;
    const corsOptions = getCorsOptions({ NODE_ENV: 'development', CLIENT_ORIGINS: tunnelOrigin });
    const handleCors = cors(corsOptions);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0V8AAAAASUVORK5CYII=', 'base64');
    const backend = createHttpServer((req, res) => handleCors(req, res, () => {
        if (req.url.startsWith('/uploads/')) {
            res.setHeader('Content-Type', 'image/png');
            return res.end(png);
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ path: req.url }));
    }));
    const sockets = new Server(backend, { cors: corsOptions });
    sockets.on('connection', (socket) => socket.emit('proxy-ready', 'ok'));
    let vite;
    const previousHost = process.env.VITE_TUNNEL_HOST;
    process.env.VITE_TUNNEL_HOST = host;
    try {
        await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));
        const target = `http://127.0.0.1:${backend.address().port}`;
        vite = await createServer({
            logLevel: 'silent', server: { port: 0, strictPort: false,
                proxy: { '/api': { target }, '/uploads': { target }, '/socket.io': { target, ws: true } } },
        });
        await vite.listen();
        const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
        for (const [requestHost, origin] of [['localhost', 'http://localhost:5173'], [host, tunnelOrigin]]) {
            const path = '/api/vnpay-return?vnp_TxnRef=test%2Bref&vnp_Amount=10000&vnp_SecureHash=fixture%2520';
            const response = await get(base + path, { Host: requestHost, Origin: origin });
            assert.equal(response.status, 200);
            assert.match(response.headers.get('content-type'), /application\/json/);
            assert.equal((await response.json()).path, path);
            assert.equal(response.headers.get('access-control-allow-origin'), origin);
            assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
            const image = await get(base + '/uploads/products/test.png', { Host: requestHost });
            assert.equal(image.headers.get('content-type'), 'image/png');
            assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
            const client = io(base, { autoConnect: false, transports: ['websocket'], reconnection: false, timeout: 3000,
                extraHeaders: { Host: requestHost, Origin: origin } });
            try {
                const ready = new Promise((resolve, reject) => {
                    client.once('proxy-ready', resolve);
                    client.once('connect_error', reject);
                });
                client.connect();
                assert.equal(await ready, 'ok');
            } finally { client.disconnect(); }
        }
        const ipn = await get(base + '/api/vnpay-ipn?vnp_TxnRef=test');
        assert.equal(ipn.status, 200);
        assert.equal((await ipn.json()).path, '/api/vnpay-ipn?vnp_TxnRef=test');
        const blocked = await get(base + '/api/test', { Host: 'untrusted.example.test' });
        assert.equal(blocked.status, 403);
    } finally {
        if (vite) await vite.close();
        await new Promise((resolve) => sockets.close(resolve));
        if (previousHost === undefined) delete process.env.VITE_TUNNEL_HOST;
        else process.env.VITE_TUNNEL_HOST = previousHost;
    }
});
