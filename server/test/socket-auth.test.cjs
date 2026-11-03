const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { io } = require('../../client/node_modules/socket.io-client');
const { initSocket } = require('../src/socket');

test('invalid Socket.IO cookie disconnects without an unhandled rejection', async () => {
    const server = createServer();
    const socketServer = await initSocket(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const client = io(`http://127.0.0.1:${server.address().port}`, {
        transports: ['websocket'], reconnection: false,
        extraHeaders: { cookie: 'token=invalid' },
    });
    try {
        await Promise.race([
            once(client, 'disconnect'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Invalid socket remained connected')), 2000)),
        ]);
        assert.equal(client.connected, false);
    } finally {
        client.close();
        await new Promise(resolve => socketServer.close(resolve));
    }
});
