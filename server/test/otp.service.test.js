const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { createOtpService, OtpError, OTP_MAX_ATTEMPTS } = require('../src/services/otp.service');
const { createMailService, MailDeliveryError } = require('../src/services/mail.service');

function createOtpModel() {
    const documents = [];
    const find = (query) => documents.find((entry) => Object.entries(query).every(([key, value]) => entry[key] === value)) || null;
    return {
        documents,
        async findOne(query) { return find(query); },
        async create(document) { const saved = { ...document, _id: String(documents.length + 1) }; documents.push(saved); return saved; },
        async updateOne(query, update) {
            const item = find(query);
            if (!item) return;
            if (update.$set) Object.assign(item, update.$set);
            if (update.$inc) item.attempts += update.$inc.attempts;
        },
        async deleteOne(query) { const index = documents.findIndex((entry) => Object.entries(query).every(([key, value]) => entry[key] === value)); if (index >= 0) documents.splice(index, 1); },
        async findOneAndDelete(query) { const index = documents.findIndex((entry) => Object.entries(query).every(([key, value]) => entry[key] === value)); return index < 0 ? null : documents.splice(index, 1)[0]; },
    };
}

test('OTP is hashed, consumed once, and preserves pending registration data', async () => {
    const Otp = createOtpModel();
    const service = createOtpService({ Otp, createCode: () => '123456' });
    await service.issue({ email: 'USER@example.com', type: 'verifyAccount', registration: { fullName: 'Test', passwordHash: 'hash', phone: '0123456789', address: 'Address' } });
    assert.notEqual(Otp.documents[0].otp, '123456');
    assert.equal(await bcrypt.compare('123456', Otp.documents[0].otp), true);
    const consumed = await service.consume({ email: 'user@example.com', type: 'verifyAccount', code: '123456' });
    assert.equal(consumed.registration.fullName, 'Test');
    await assert.rejects(() => service.consume({ email: 'user@example.com', type: 'verifyAccount', code: '123456' }), OtpError);
});

test('OTP expires and locks after too many failed attempts', async () => {
    let time = new Date('2025-01-01T00:00:00Z');
    const Otp = createOtpModel();
    const service = createOtpService({ Otp, now: () => time, createCode: () => '123456' });
    await service.issue({ email: 'user@example.com', type: 'forgotPassword' });
    time = new Date(time.getTime() + 10 * 60 * 1000);
    await assert.rejects(() => service.consume({ email: 'user@example.com', type: 'forgotPassword', code: '123456' }), OtpError);

    time = new Date('2025-01-01T01:00:00Z');
    await service.issue({ email: 'user@example.com', type: 'forgotPassword' });
    for (let attempt = 0; attempt < OTP_MAX_ATTEMPTS; attempt += 1) {
        await assert.rejects(() => service.consume({ email: 'user@example.com', type: 'forgotPassword', code: '000000' }), OtpError);
    }
    await assert.rejects(() => service.consume({ email: 'user@example.com', type: 'forgotPassword', code: '123456' }), OtpError);
});

test('OTP resend has cooldown and preserves the pending registration payload', async () => {
    let time = new Date('2025-01-01T00:00:00Z');
    const Otp = createOtpModel();
    const service = createOtpService({ Otp, now: () => time, createCode: () => '123456' });
    const registration = { fullName: 'Test', passwordHash: 'hash', phone: '0123456789', address: 'Address' };
    await service.issue({ email: 'user@example.com', type: 'verifyAccount', registration });
    await assert.rejects(() => service.issue({ email: 'user@example.com', type: 'verifyAccount' }), (error) => error.code === 'COOLDOWN');
    time = new Date(time.getTime() + 61 * 1000);
    await service.issue({ email: 'user@example.com', type: 'verifyAccount' });
    assert.deepEqual(Otp.documents[0].registration, registration);
});

test('mail service uses a mock transporter and classifies delivery failures', async () => {
    const sent = [];
    const service = createMailService({
        env: { GOOGLE_CLIENT: 'test', GOOGLE_SECRET: 'test', REDIRECT_URI: 'test', REFRESH_TOKEN: 'test', USER_EMAIL: 'sender@example.com' },
        createOAuthClient: () => ({ setCredentials() {}, getAccessToken: async () => ({ token: 'access' }) }),
        createTransport: () => ({ sendMail: async (message) => sent.push(message) }),
    });
    await service.sendOtpEmail({ to: 'user@example.com', code: '123456', purpose: 'verifyAccount' });
    assert.equal(sent.length, 1);

    const failing = createMailService({
        env: { GOOGLE_CLIENT: 'test', GOOGLE_SECRET: 'test', REDIRECT_URI: 'test', REFRESH_TOKEN: 'test', USER_EMAIL: 'sender@example.com' },
        createOAuthClient: () => ({ setCredentials() {}, getAccessToken: async () => { const error = new Error('invalid_grant'); throw error; } }),
    });
    await assert.rejects(() => failing.sendOtpEmail({ to: 'user@example.com', code: '123456', purpose: 'forgotPassword' }), (error) => error instanceof MailDeliveryError && error.code === 'INVALID_GRANT');
});
