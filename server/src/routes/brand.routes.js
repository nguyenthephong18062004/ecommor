const express = require('express');
const { asyncHandler, authAdmin } = require('../auth/checkAuth');
const service = require('../services/brand.service');
const { OK } = require('../core/success.response');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
    new OK({ metadata: await service.list() }).send(res);
}));
router.put('/:name', authAdmin, asyncHandler(async (req, res) => {
    new OK({ message: 'Đã cập nhật thương hiệu.', metadata: await service.update(req.params.name, req.body) }).send(res);
}));

module.exports = router;
