const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelCartUser = new Schema(
    {
        userId: { type: String, require: true, ref: 'user' },
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
        totalPrice: { type: Number, require: true },
        nameCoupon: { type: String, require: true },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('cartUser', modelCartUser);
