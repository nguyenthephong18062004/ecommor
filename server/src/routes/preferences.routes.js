const router = require('express').Router();
const { authUser, asyncHandler } = require('../auth/checkAuth');
const { OK } = require('../core/success.response');
const service = require('../services/preferences.service');

router.use(authUser);
router.get('/', asyncHandler(async (req, res) => new OK({ metadata: await service.get(req.user.id) }).send(res)));
router.patch('/', asyncHandler(async (req, res) => new OK({ message: 'Đã lưu lựa chọn.', metadata: await service.update(req.user.id, req.body) }).send(res)));
module.exports = router;
