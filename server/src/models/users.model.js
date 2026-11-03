const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelUser = new Schema(
    {
        fullName: { type: String, require: true },
        phone: { type: String, require: true },
        email: { type: String, require: true },
        password: { type: String, require: true },
        isAdmin: { type: Boolean, default: false },
        address: { type: String, require: true },
        typeLogin: { type: String, require: true, enum: ['email', 'google'] },
        lastLoginAt: { type: Date, default: Date.now },
        isOnline: { type: Boolean, default: true },
        wishlist: { type: [{ type: Schema.Types.ObjectId, ref: 'products' }], default: [], validate: value => value.length <= 100 },
        savedSearches: { type: [new Schema({ name: String, url: String }, { _id: false })], default: [], validate: value => value.length <= 10 },
        addresses: { type: [new Schema({ label: String, fullName: String, phone: String, address: String,
            provinceId: Number, districtId: Number, wardCode: String }, { _id: false })], default: [], validate: value => value.length <= 8 },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('user', modelUser);
