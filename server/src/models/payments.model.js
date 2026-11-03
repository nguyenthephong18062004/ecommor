const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelPayments = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'users', require: true },
        product: [
            {
                productId: { type: Schema.Types.ObjectId, ref: 'product' },
                quantity: { type: Number, require: true },
                unitPrice: { type: Number, min: 0 },
                nameProduct: String,
                images: String,
                shippingPackage: Object,
            },
        ],
        fullName: { type: String, require: true },
        phone: { type: String, require: true },
        address: { type: String, require: true },
        note: { type: String, require: true },
        status: { type: String, require: true, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
        totalPrice: { type: Number, require: true },
        paymentMethod: { type: String, require: true, enum: ['COD', 'VNPAY', 'MOMO'] },
        transactionRef: { type: String, unique: true, sparse: true },
        checkoutKey: { type: String, unique: true, sparse: true },
        paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'failed', 'expired', 'refund_required'], default: 'unpaid' },
        inventoryReserved: Boolean,
        couponReserved: Boolean,
        expiresAt: Date,
        subtotal: Number,
        couponDiscount: Number,
        shippingFee: { type: Number, default: 0 },
        shipping: Object,
        shipment: Object,
        nameCoupon: { type: String, require: true },
    },
    {
        timestamps: true,
    },
);

modelPayments.index({ paymentMethod: 1, paymentStatus: 1, expiresAt: 1 });

module.exports = mongoose.model('payments', modelPayments);
