const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');

test('a legacy email account without an emailVerified field can still sign in', async () => {
    const Users = require('../src/models/users.model');
    const tokens = require('../src/services/tokenSevices');
    const controllerPath = require.resolve('../src/controllers/users.controller');
    const originalFindOne = Users.findOne;
    const originalCreateApiKey = tokens.createApiKey;
    const originalCreateToken = tokens.createToken;
    const originalCreateRefreshToken = tokens.createRefreshToken;
    const password = await bcrypt.hash('secret1', 10);

    Users.findOne = async () => ({ _id: 'legacy-user', email: 'legacy@example.com', password, typeLogin: 'email' });
    tokens.createApiKey = async () => {};
    tokens.createToken = async () => 'test-token';
    tokens.createRefreshToken = async () => 'test-refresh-token';
    delete require.cache[controllerPath];
    const controller = require('../src/controllers/users.controller');
    const response = {
        statusCode: undefined,
        cookies: [],
        cookie(name) { this.cookies.push(name); return this; },
        status(code) { this.statusCode = code; return this; },
        json() { return this; },
    };

    try {
        await controller.login({ body: { email: 'legacy@example.com', password: 'secret1' } }, response);
        assert.equal(response.statusCode, 200);
        assert.deepEqual(response.cookies, ['token', 'logged', 'refreshToken']);
    } finally {
        Users.findOne = originalFindOne;
        tokens.createApiKey = originalCreateApiKey;
        tokens.createToken = originalCreateToken;
        tokens.createRefreshToken = originalCreateRefreshToken;
        delete require.cache[controllerPath];
    }
});
