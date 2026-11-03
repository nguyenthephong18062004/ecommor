const { test } = require('node:test');
const assert = require('node:assert/strict');
const controller = require('../src/controllers/users.controller');

test('logout clears host-only cookies with the same flags used at login in dev and production', async () => {
    const previous = process.env.NODE_ENV;
    try {
        for (const mode of ['development', 'production']) {
            process.env.NODE_ENV = mode;
            const cleared = [];
            await controller.logout({ cookies: {} }, {
                clearCookie(name, options) { cleared.push({ name, options }); },
                status() { return this; }, json() {},
            });
            assert.deepEqual(cleared.map(({ name }) => name), ['token', 'refreshToken', 'logged']);
            for (const { name, options } of cleared) {
                assert.equal(options.path, '/');
                assert.equal(options.domain, undefined);
                assert.equal(options.maxAge, undefined);
                assert.equal(options.httpOnly, name !== 'logged');
                assert.equal(options.secure, mode === 'production');
                assert.equal(options.sameSite, mode === 'production' ? 'Strict' : 'Lax');
            }
        }
    } finally {
        if (previous === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previous;
    }
});
