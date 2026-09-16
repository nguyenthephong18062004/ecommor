const express = require('express');
const router = express.Router();

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');

const controllerPreviewProduct = require('../controllers/previewProduct.controller');

router.post('/api/create-preview-product', authUser, asyncHandler(controllerPreviewProduct.createPreviewProduct));
router.get('/api/get-preview-product-home', asyncHandler(controllerPreviewProduct.getPreviewProductHome));

module.exports = router;
