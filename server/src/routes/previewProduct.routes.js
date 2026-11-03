const express = require('express');
const router = express.Router();

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');

const controllerPreviewProduct = require('../controllers/previewProduct.controller');

const limiter = require('express-rate-limit')({ windowMs: 3600000, limit: 10,
    message: { message: 'Bạn đã gửi nhiều đánh giá. Vui lòng thử lại sau.' } });
router.get('/api/reviews', asyncHandler(controllerPreviewProduct.getReviews));
router.get('/api/reviews/moderation', authAdmin, asyncHandler(controllerPreviewProduct.moderation));
router.patch('/api/reviews/:id/status', authAdmin, asyncHandler(controllerPreviewProduct.moderate));
router.post('/api/create-preview-product', authUser, limiter, asyncHandler(controllerPreviewProduct.createPreviewProduct));
router.get('/api/get-preview-product-home', asyncHandler(controllerPreviewProduct.getPreviewProductHome));

module.exports = router;
