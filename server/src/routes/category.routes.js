const express = require('express');
const router = express.Router();

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');

const controllerCategory = require('../controllers/category.controller');

router.post('/api/create-category', authAdmin, asyncHandler(controllerCategory.createCategory));
router.get('/api/get-all-category', asyncHandler(controllerCategory.getAllCategory));
router.post('/api/update-category', authAdmin, asyncHandler(controllerCategory.updateCategory));
router.delete('/api/delete-category', authAdmin, asyncHandler(controllerCategory.deleteCategory));

module.exports = router;
