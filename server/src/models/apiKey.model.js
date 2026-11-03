const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelApiKey = new Schema(
    {
        userId: { type: String, required: true, unique: true, index: true, ref: 'user' },
        publicKey: { type: String, required: true },
        privateKey: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('apikey', modelApiKey);
