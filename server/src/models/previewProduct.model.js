const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelPreviewProduct = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
        productId: { type: Schema.Types.ObjectId, ref: 'products', required: true },
        content: { type: String, required: true, maxlength: 2000 },
        rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
        orderId: { type: Schema.Types.ObjectId, ref: 'payments' },
        moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    },
    {
        timestamps: true,
    },
);

modelPreviewProduct.index({ productId: 1, moderationStatus: 1, createdAt: -1 });
modelPreviewProduct.index({ userId: 1, productId: 1 }, { unique: true, partialFilterExpression: { orderId: { $exists: true } } });

module.exports = mongoose.model('previewProduct', modelPreviewProduct);
