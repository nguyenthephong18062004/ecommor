const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { queryAttempt } = require('../scripts/check-vnpay-status.cjs');

const env = { VNPAY_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    VNPAY_TMN_CODE: 'TESTONLY', VNPAY_SECRET_KEY: 'unit-test-only-secret' };
const attempt = { transactionRef: 'unit-test-ref', createDate: '20261008120000', amount: 100000 };
const fields = ['vnp_ResponseId', 'vnp_Command', 'vnp_ResponseCode', 'vnp_Message',
    'vnp_TmnCode', 'vnp_TxnRef', 'vnp_Amount', 'vnp_BankCode', 'vnp_PayDate',
    'vnp_TransactionNo', 'vnp_TransactionType', 'vnp_TransactionStatus', 'vnp_OrderInfo',
    'vnp_PromotionCode', 'vnp_PromotionAmount'];
function signedReply(changes = {}) {
    const data = { vnp_ResponseId: 'test-response', vnp_Command: 'querydr', vnp_ResponseCode: '00',
        vnp_Message: 'Success', vnp_TmnCode: env.VNPAY_TMN_CODE, vnp_TxnRef: attempt.transactionRef,
        vnp_Amount: '10000000', vnp_BankCode: 'NCB', vnp_TransactionNo: '1',
        vnp_TransactionType: '01', vnp_TransactionStatus: '00', vnp_OrderInfo: 'Unit test', ...changes };
    data.vnp_SecureHash = crypto.createHmac('sha512', env.VNPAY_SECRET_KEY)
        .update(fields.map((field) => data[field] ?? '').join('|')).digest('hex');
    return data;
}
const reply = (data) => new Response(JSON.stringify(data), { status: 200 });

test('status check sends only QUERYDR and accepts a signed, matching paid transaction', async () => {
    const result = await queryAttempt(env, attempt, async (url, options) => {
        assert.equal(url, 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction');
        assert.equal(options.method, 'POST');
        assert.equal(options.redirect, 'error');
        const request = JSON.parse(options.body);
        assert.equal(request.vnp_Command, 'querydr');
        assert.equal(request.vnp_TransactionDate, attempt.createDate);
        assert.match(request.vnp_RequestId, /^[a-f0-9]{32}$/);
        assert.equal(Object.hasOwn(request, 'vnp_CreateBy'), false);
        return reply(signedReply());
    });
    assert.equal(result.verified, true);
    assert.equal(result.paid, true);
    assert.ok(!JSON.stringify(result).includes(attempt.transactionRef));
});

test('missing, malformed and tampered response signatures never confirm payment', async () => {
    for (const hash of [undefined, '', 'bad', '0'.repeat(128)]) {
        const data = signedReply();
        data.vnp_SecureHash = hash;
        const result = await queryAttempt(env, attempt, async () => reply(data));
        assert.equal(result.paid, false);
        assert.equal(result.verified, false);
    }
    const tampered = signedReply();
    tampered.vnp_TransactionStatus = '02';
    assert.equal((await queryAttempt(env, attempt, async () => reply(tampered))).verified, false);
});

test('even signed mismatched merchant, reference, amount, command or transaction type are rejected', async () => {
    for (const change of [{ vnp_TmnCode: 'OTHER' }, { vnp_TxnRef: 'other-ref' },
        { vnp_Amount: '1' }, { vnp_Command: 'refund' }, { vnp_TransactionType: '02' }]) {
        const result = await queryAttempt(env, attempt, async () => reply(signedReply(change)));
        assert.equal(result.verified, false);
        assert.equal(result.paid, false);
    }
});

test('successful query is not equivalent to paid; production calls are refused', async () => {
    const result = await queryAttempt(env, attempt, async () => reply(signedReply({ vnp_TransactionStatus: '01' })));
    assert.equal(result.verified, true);
    assert.equal(result.paid, false);
    await assert.rejects(queryAttempt({ ...env, VNPAY_URL: 'https://pay.vnpay.vn/paymentv2/vpcpay.html' },
        attempt, () => assert.fail('must not contact production')));
});
