const express = require('express');
const router = express.Router();

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');

const controllerCartUser = require('../controllers/cartUser.controller');

router.post('/api/create-cart', authUser, asyncHandler(controllerCartUser.addToCart));
router.get('/api/get-cart', authUser, asyncHandler(controllerCartUser.getCart));
router.post('/api/delete-product-cart', authUser, asyncHandler(controllerCartUser.deleteProductCart));
router.post('/api/update-product-cart', authUser, asyncHandler(controllerCartUser.updateProductCart));
router.post('/api/update-info-cart', authUser, asyncHandler(controllerCartUser.updateInfoCart));

module.exports = router;
