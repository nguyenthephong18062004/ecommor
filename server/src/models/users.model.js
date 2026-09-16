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
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('user', modelUser);
