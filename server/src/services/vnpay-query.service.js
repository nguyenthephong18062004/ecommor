const crypto = require('node:crypto');

const requestFields = ['vnp_RequestId', 'vnp_Version', 'vnp_Command', 'vnp_TmnCode',
    'vnp_TxnRef', 'vnp_TransactionDate', 'vnp_CreateDate', 'vnp_IpAddr', 'vnp_OrderInfo'];
const responseFields = ['vnp_ResponseId', 'vnp_Command', 'vnp_ResponseCode', 'vnp_Message',
    'vnp_TmnCode', 'vnp_TxnRef', 'vnp_Amount', 'vnp_BankCode', 'vnp_PayDate',
    'vnp_TransactionNo', 'vnp_TransactionType', 'vnp_TransactionStatus', 'vnp_OrderInfo',
    'vnp_PromotionCode', 'vnp_PromotionAmount'];
const sign = (data, fields, secret) => crypto.createHmac('sha512', secret)
    .update(fields.map((field) => data[field] ?? '').join('|'), 'utf8').digest('hex');

async function queryAttempt(env, attempt, fetchRequest = fetch) {
    const gateway = new URL(env.VNPAY_URL);
    if (gateway.protocol !== 'https:' || !['sandbox.vnpayment.vn', 'pay.vnpay.vn'].includes(gateway.hostname) ||
        gateway.pathname !== '/paymentv2/vpcpay.html' || gateway.username || gateway.password || gateway.search || gateway.hash ||
        !env.VNPAY_TMN_CODE || !env.VNPAY_SECRET_KEY) throw new Error('Invalid VNPay query configuration');
    const createDate = new Date(Date.now() + 7 * 60 * 60 * 1000)
        .toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const request = { vnp_RequestId: crypto.randomUUID().replace(/-/g, ''), vnp_Version: '2.1.0',
        vnp_Command: 'querydr', vnp_TmnCode: env.VNPAY_TMN_CODE, vnp_TxnRef: attempt.transactionRef,
        vnp_TransactionDate: attempt.createDate, vnp_CreateDate: createDate,
        vnp_IpAddr: '127.0.0.1', vnp_OrderInfo: 'Payment status reconciliation' };
    request.vnp_SecureHash = sign(request, requestFields, env.VNPAY_SECRET_KEY);
    const response = await fetchRequest(new URL('/merchant_webapi/api/transaction', gateway.origin).href, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
        signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    const data = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        Object.values(data).some((value) => value != null && !['string', 'number'].includes(typeof value))) {
        return { verified: false, paid: false, http: response.status };
    }
    const expected = sign(data, responseFields, env.VNPAY_SECRET_KEY);
    const signed = typeof data.vnp_SecureHash === 'string' && /^[a-f0-9]{128}$/i.test(data.vnp_SecureHash) &&
        crypto.timingSafeEqual(Buffer.from(data.vnp_SecureHash, 'hex'), Buffer.from(expected, 'hex'));
    const verified = response.ok && signed && data.vnp_Command === 'querydr' &&
        data.vnp_TmnCode === env.VNPAY_TMN_CODE && data.vnp_TxnRef === attempt.transactionRef &&
        /^\d+$/.test(String(data.vnp_Amount)) && Number.isSafeInteger(Number(data.vnp_Amount)) &&
        Number(data.vnp_Amount) === attempt.amount * 100 && data.vnp_TransactionType === '01' &&
        /^\d{1,15}$/.test(data.vnp_TransactionNo || '');
    const code = (value) => /^\d{2}$/.test(value) ? String(value) : null;
    return { http: response.status, verified: Boolean(verified),
        responseCode: code(data.vnp_ResponseCode), transactionStatus: code(data.vnp_TransactionStatus),
        paid: Boolean(verified && data.vnp_ResponseCode === '00' && data.vnp_TransactionStatus === '00'),
        ...(verified ? { transactionNo: data.vnp_TransactionNo, bankCode: data.vnp_BankCode, payDate: data.vnp_PayDate } : {}) };
}

module.exports = { queryAttempt };
