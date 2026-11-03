const mongoose = require('mongoose');

// Yêu cầu tìm/đặt hàng, tách khỏi đơn đã thanh toán và tồn kho.
const schema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', index: true },
    productName: { type: String, required: true },
    modelNumber: String,
    image: String,
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 10, validate: Number.isInteger },
    fullName: { type: String, required: true, maxlength: 100 },
    phone: { type: String, required: true, maxlength: 20 },
    email: { type: String, maxlength: 254 },
    address: { type: String, maxlength: 500 },
    note: { type: String, maxlength: 2000 },
    consentAt: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'contacted', 'confirmed', 'cancelled'], default: 'pending' },
    history: [{ _id: false, status: String, note: { type: String, maxlength: 1000 }, at: { type: Date, default: Date.now } }],
}, { timestamps: true });

schema.index({ createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('preorders', schema);
