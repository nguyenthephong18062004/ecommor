const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    cartId: { type: mongoose.Schema.Types.ObjectId, required: true },
    fingerprint: { type: String, required: true },
    method: { type: String, enum: ['COD', 'VNPAY'], required: true },
    shipping: { type: Object, required: true }, // Only normalized server/GHN data is saved here.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });
module.exports = mongoose.model('shippingQuotes', schema);
