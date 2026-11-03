const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true },
    description: { type: String, maxlength: 3000, default: '' },
    logo: { type: String, maxlength: 1000, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('brand', brandSchema);
