const path = require('node:path');
const provider = require('../src/services/vnpay-query.service');

async function queryAttempt(env, attempt, fetchRequest = fetch) {
    if (new URL(env.VNPAY_URL).hostname !== 'sandbox.vnpayment.vn' ||
        !env.VNPAY_TMN_CODE || !env.VNPAY_SECRET_KEY) throw new Error('Sandbox configuration required');
    const result = await provider.queryAttempt(env, attempt, fetchRequest);
    const { http, verified, responseCode, transactionStatus, paid } = result;
    return { http, verified, responseCode, transactionStatus, paid };
}

if (require.main === module) {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
    const mongoose = require('mongoose');
    (async () => {
        try {
            const { connectionOptions } = require('../src/config/connectDB');
            await mongoose.connect(process.env.CONNECT_DB, {
                ...connectionOptions(process.env.CONNECT_DB), autoIndex: false, serverSelectionTimeoutMS: 5000,
            });
            const Attempts = require('../src/models/paymentAttempt.model');
            const Orders = require('../src/models/payments.model');
            const attempts = await Attempts.find({}).sort({ createdAt: -1 }).limit(3)
                .select('orderId transactionRef amount createDate createdAt status receivedAt').lean();
            for (let index = 0; index < attempts.length; index++) {
                const attempt = attempts[index];
                const order = await Orders.findById(attempt.orderId).select('paymentStatus inventoryReserved').lean();
                const provider = await queryAttempt(process.env, attempt);
                const needsReconciliation = provider.verified
                    ? provider.paid && order?.paymentStatus !== 'paid' : null;
                console.log(JSON.stringify({ alias: `VN${index + 1}`, createdAt: attempt.createdAt,
                    localStatus: order?.paymentStatus ?? null, inventoryReserved: order?.inventoryReserved ?? null,
                    ipnReceived: Boolean(attempt.receivedAt), ...provider, needsReconciliation }));
                if (!provider.verified || needsReconciliation) process.exitCode = 1;
            }
            if (!attempts.length) console.log('No VNPay attempts to check.');
        } catch {
            console.error('VNPay status check failed. No orders were updated; check sandbox/network configuration.');
            process.exitCode = 1;
        } finally {
            await mongoose.disconnect();
        }
    })();
}

module.exports = { queryAttempt };
