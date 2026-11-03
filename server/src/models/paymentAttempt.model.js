const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'payments', required: true },
    transactionRef: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'expired', 'cancelled', 'refund_required'], default: 'pending' },
    expiresAt: { type: Date, required: true },
    paymentUrl: { type: String, required: true, select: false },
    createDate: { type: String, required: true },
    transactionNo: String,
    bankCode: String,
    responseCode: String,
    transactionStatus: String,
    payDate: String,
    receivedAt: Date,
    reconciledAt: Date,
    nextQueryAt: Date,
    confirmationSource: { type: String, enum: ['ipn', 'querydr'] },
}, { timestamps: true });

module.exports = mongoose.model('paymentAttempts', schema);
