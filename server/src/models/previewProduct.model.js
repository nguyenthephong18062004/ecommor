const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelPreviewProduct = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'users', require: true },
        productId: { type: Schema.Types.ObjectId, ref: 'products', require: true },
        content: { type: String, require: true },
        rating: { type: Number, require: true },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('previewProduct', modelPreviewProduct);
