const { test } = require('node:test');
const assert = require('node:assert/strict');
const { connectionOptions } = require('../src/config/connectDB');

test('only single-host loopback dev connections use direct Docker-primary access', () => {
    assert.deepEqual(connectionOptions('mongodb://localhost:27017/fixture', 'development'), { directConnection: true });
    assert.deepEqual(connectionOptions('mongodb://127.0.0.1:27017/fixture', 'development'), { directConnection: true });
    assert.deepEqual(connectionOptions('mongodb://localhost:27017/fixture', 'production'), {});
    assert.deepEqual(connectionOptions('mongodb://localhost:27017/fixture?directConnection=false', 'development'), {});
    assert.deepEqual(connectionOptions('mongodb://mongodb:27017/fixture', 'development'), {});
    assert.deepEqual(connectionOptions('mongodb+srv://cluster.example.test/fixture', 'development'), {});
});
