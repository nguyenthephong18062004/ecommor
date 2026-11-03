const express = require('express');
const router = express.Router();

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');

const controllerProducts = require('../controllers/products.controller');

router.post('/api/create-product', authAdmin, asyncHandler(controllerProducts.createProduct));
router.get('/api/get-product-new', asyncHandler(controllerProducts.getProductNew));
router.get('/api/product-catalog', asyncHandler(controllerProducts.getProductCatalog));
router.get('/api/catalog-options', asyncHandler(controllerProducts.getCatalogOptions));
router.get('/api/catalog-browse', asyncHandler(controllerProducts.browseProducts));
router.get('/api/get-product-by-id', asyncHandler(controllerProducts.getProductById));
router.get('/api/get-product-by-category', asyncHandler(controllerProducts.getProductByCategory));
router.get('/api/get-product-manufactured', asyncHandler(controllerProducts.getProductManufactured));
router.get('/api/search', asyncHandler(controllerProducts.searchProduct));

router.get('/api/get-all-product', authAdmin, asyncHandler(controllerProducts.getAllProduct));
router.post('/api/update-product', authAdmin, asyncHandler(controllerProducts.updateProduct));
router.delete('/api/delete-product', authAdmin, asyncHandler(controllerProducts.deleteProduct));

module.exports = router;
