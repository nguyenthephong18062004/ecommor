const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');
const { Created, OK } = require('../core/success.response');
const service = require('../services/preorder.service');

const router = express.Router();
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau 15 phút.' },
});

router.post('/', authUser, limiter, asyncHandler(async (req, res) => {
    new Created({ message: 'Đã tiếp nhận yêu cầu đặt hàng.', metadata: await service.create(req.body, req.user.id) }).send(res);
}));
router.get('/mine', authUser, asyncHandler(async (req, res) => {
    new OK({ metadata: await service.list(req.query, req.user.id) }).send(res);
}));
router.get('/', authAdmin, asyncHandler(async (req, res) => {
    new OK({ metadata: await service.list(req.query) }).send(res);
}));
router.patch('/:id/status', authAdmin, asyncHandler(async (req, res) => {
    new OK({ metadata: await service.updateStatus(req.params.id, req.body?.status, req.body?.note) }).send(res);
}));

module.exports = router;
