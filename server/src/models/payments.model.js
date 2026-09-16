const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelPayments = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'users', require: true },
        product: [
            {
                productId: { type: Schema.Types.ObjectId, ref: 'product' },
                quantity: { type: Number, require: true },
            },
        ],
        fullName: { type: String, require: true },
        phone: { type: String, require: true },
        address: { type: String, require: true },
        note: { type: String, require: true },
        status: { type: String, require: true, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
        totalPrice: { type: Number, require: true },
        paymentMethod: { type: String, require: true, enum: ['COD', 'VNPAY', 'MOMO'] },
        nameCoupon: { type: String, require: true },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('payments', modelPayments);
