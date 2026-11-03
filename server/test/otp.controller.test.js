const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');

const Users = require('../src/models/users.model');
const Otps = require('../src/models/otp.model');
const { mailService } = require('../src/services/mail.service');
const { MailDeliveryError } = require('../src/services/mail.service');
const controller = require('../src/controllers/users.controller');

function response() {
    return {
        statusCode: undefined,
        body: undefined,
        cookies: [],
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return body; },
        cookie(name) { this.cookies.push(name); return this; },
        clearCookie() { return this; },
    };
}

test('registration creates a user only after a valid verification code', async () => {
    const originalUserFindOne = Users.findOne;
    const originalUserCreate = Users.create;
    const originalOtpFindOne = Otps.findOne;
    const originalOtpCreate = Otps.create;
    const originalOtpUpdateOne = Otps.updateOne;
    const originalOtpDeleteOne = Otps.deleteOne;
    const originalOtpFindOneAndDelete = Otps.findOneAndDelete;
    const originalSend = mailService.sendOtpEmail;
    const originalInfo = console.info;
    const users = [];
    const otps = [];

    Users.findOne = async ({ email }) => users.find((user) => user.email === email) || null;
    Users.create = async (user) => { users.push(user); return user; };
    Otps.findOne = async ({ email, type }) => otps.find((otp) => otp.email === email && otp.type === type) || null;
    Otps.create = async (otp) => { const saved = { ...otp, _id: 'otp-1' }; otps.push(saved); return saved; };
    Otps.updateOne = async (query, update) => {
        const otp = otps.find((item) => item._id === query._id);
        if (update.$set) Object.assign(otp, update.$set);
        if (update.$inc) otp.attempts += update.$inc.attempts;
    };
    Otps.deleteOne = async () => {};
    Otps.findOneAndDelete = async ({ _id, otp }) => {
        const index = otps.findIndex((item) => item._id === _id && item.otp === otp);
        return index < 0 ? null : otps.splice(index, 1)[0];
    };
    mailService.sendOtpEmail = async () => {};
    console.info = () => {};

    try {
        const registerResponse = response();
        await controller.register({ body: { fullName: 'Test', email: 'user@example.com', password: 'secret1', phone: '0123456789', address: 'Address' } }, registerResponse);
        assert.equal(users.length, 0);
        assert.equal(otps.length, 1);

        const code = '123456';
        otps[0].otp = await bcrypt.hash(code, 10);
        const verifyResponse = response();
        await controller.verifyEmail({ body: { email: 'user@example.com', otp: code } }, verifyResponse);
        assert.equal(users.length, 1);
        assert.equal(verifyResponse.statusCode, 200);
    } finally {
        Users.findOne = originalUserFindOne;
        Users.create = originalUserCreate;
        Otps.findOne = originalOtpFindOne;
        Otps.create = originalOtpCreate;
        Otps.updateOne = originalOtpUpdateOne;
        Otps.deleteOne = originalOtpDeleteOne;
        Otps.findOneAndDelete = originalOtpFindOneAndDelete;
        mailService.sendOtpEmail = originalSend;
        console.info = originalInfo;
    }
});

test('password reset mail failures keep the client response generic and log only the error category', async () => {
    const originalUserFindOne = Users.findOne;
    const originalSend = mailService.sendOtpEmail;
    const originalError = console.error;
    const originalOtpFindOne = Otps.findOne;
    const originalOtpCreate = Otps.create;
    const logs = [];
    Users.findOne = async () => ({ _id: 'user-1', email: 'user@example.com', typeLogin: 'email' });
    Otps.findOne = async () => null;
    Otps.create = async () => ({});
    mailService.sendOtpEmail = async () => { throw new MailDeliveryError('INVALID_GRANT'); };
    console.error = (message) => logs.push(message);
    try {
        const res = response();
        await controller.forgotPassword({ body: { email: 'user@example.com' } }, res);
        assert.equal(res.statusCode, 202);
        assert.match(res.body.message, /Nếu email đủ điều kiện/);
        assert.deepEqual(logs, ['[mail] password-reset OTP delivery failed: INVALID_GRANT']);
    } finally {
        Users.findOne = originalUserFindOne;
        Otps.findOne = originalOtpFindOne;
        Otps.create = originalOtpCreate;
        mailService.sendOtpEmail = originalSend;
        console.error = originalError;
    }
});
