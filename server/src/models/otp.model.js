const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelOtp = new Schema(
    {
        email: { type: String, required: true, trim: true, lowercase: true, ref: 'user' },
        otp: { type: String, required: true },
        time: { type: Date, default: Date.now, index: { expires: 600 } },
        type: { type: String, enum: ['forgotPassword', 'verifyAccount'], required: true },
        attempts: { type: Number, default: 0, min: 0 },
        resendAvailableAt: { type: Date },
        sendWindowStartedAt: { type: Date },
        sendCount: { type: Number, default: 0, min: 0 },
        registration: {
            fullName: { type: String },
            passwordHash: { type: String },
            phone: { type: String },
            address: { type: String },
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('otp', modelOtp);
