const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { authUser, authAdmin, asyncHandler } = require('../auth/checkAuth');
const { OK } = require('../core/success.response');
const Carts = require('../models/cartUser.model');
const shipping = require('../services/shipping.service');
const checkout = require('../services/vnpay.service');
const router = express.Router();
router.use(authUser);
router.use(rateLimit({ windowMs: 60000, limit: 60, standardHeaders: true, legacyHeaders: false,
    message: { message: 'Bạn thao tác vận chuyển quá nhanh. Vui lòng thử lại sau.' } }));
const send = (res, metadata) => new OK({ metadata }).send(res);
router.get('/provinces', asyncHandler(async (req, res) => send(res, await shipping.provinces())));
router.get('/districts', asyncHandler(async (req, res) => send(res, await shipping.districts(req.query.provinceId))));
router.get('/wards', asyncHandler(async (req, res) => send(res, await shipping.wards(req.query.districtId))));
router.post('/quote', asyncHandler(async (req, res) => {
    const input = req.body || {};
    if (typeof input.cartId !== 'string' || !/^[a-f\d]{24}$/i.test(input.cartId)) throw require('../services/ghn.client').fail('Giỏ hàng không hợp lệ.');
    const cart = await Carts.findOne({ _id: input.cartId, userId: req.user.id }).lean();
    if (!cart) throw require('../services/ghn.client').fail('Không tìm thấy giỏ hàng.', 404);
    const totals = await checkout.snapshot({ ...cart, fullName: 'quote', phone: 'quote', address: 'quote', nameCoupon: input.nameCoupon || undefined }, null);
    send(res, await shipping.createQuote({ userId: req.user.id, cartId: input.cartId,
        method: input.method, totals, address: input.address }));
}));
router.post('/admin/orders/:id/preview', authAdmin, asyncHandler(async (req, res) => send(res, await shipping.preview(req.params.id, req.body?.parcel))));
router.post('/admin/orders/:id/create', authAdmin, asyncHandler(async (req, res) => send(res, await shipping.createShipment(req.params.id, req.body))));
router.post('/admin/orders/:id/sync', authAdmin, asyncHandler(async (req, res) => send(res, await shipping.syncShipment(req.params.id))));
module.exports = router;
