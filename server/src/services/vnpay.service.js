const { assertSale } = require('./product-data.service');
const crypto = require('node:crypto');
const net = require('node:net');
const mongoose = require('mongoose');
const { VNPay } = require('vnpay');
const Orders = require('../models/payments.model');
const Attempts = require('../models/paymentAttempt.model');
const Carts = require('../models/cartUser.model');
const Products = require('../models/products.model');
const Coupons = require('../models/coupon.model');
const { BadRequestError } = require('../core/error.response');
const provider = require('./vnpay-query.service');
const shipping = require('./shipping.service');
const { estimateItem } = require('./shipping-package');

const fail = (message, code = 400) => new BadRequestError(message, code);
const TTL = 15 * 60 * 1000;
let indexesReady;

function config() {
    for (const key of ['VNPAY_TMN_CODE', 'VNPAY_SECRET_KEY', 'VNPAY_URL', 'VNPAY_RETURN_URL', 'DOMAIN_URL']) {
        if (!process.env[key]?.trim()) throw fail(`Missing required configuration: ${key}`, 503);
    }
    let gateway, returnUrl, clientUrl;
    try {
        gateway = new URL(process.env.VNPAY_URL);
        returnUrl = new URL(process.env.VNPAY_RETURN_URL);
        clientUrl = new URL(process.env.DOMAIN_URL);
    } catch {
        throw fail('Cấu hình địa chỉ VNPay không hợp lệ.', 503);
    }
    if (gateway.protocol !== 'https:' || !['sandbox.vnpayment.vn', 'pay.vnpay.vn'].includes(gateway.hostname) ||
        gateway.pathname !== '/paymentv2/vpcpay.html' || gateway.search || gateway.hash || gateway.username || gateway.password) {
        throw fail('Cổng thanh toán VNPay không hợp lệ.', 503);
    }
    if (!['http:', 'https:'].includes(returnUrl.protocol) || !['http:', 'https:'].includes(clientUrl.protocol) ||
        !['/api/vnpay-return', '/api/check-payment-vnpay'].includes(returnUrl.pathname) ||
        returnUrl.search || returnUrl.hash || returnUrl.username || clientUrl.username) {
        throw fail('Địa chỉ trả kết quả hoặc website không hợp lệ.', 503);
    }
    if (process.env.NODE_ENV === 'production' && [returnUrl, clientUrl].some((url) =>
        url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
        throw fail('Địa chỉ thanh toán và website phải sử dụng HTTPS khi vận hành.', 503);
    }
    const mode = process.env.VNPAY_ENV || 'sandbox';
    if (!['sandbox', 'production'].includes(mode) || (mode === 'sandbox') !== (gateway.hostname === 'sandbox.vnpayment.vn')) {
        throw fail('Môi trường VNPay không khớp cổng thanh toán.', 503);
    }
    return { gateway, returnUrl, clientUrl, tmnCode: process.env.VNPAY_TMN_CODE, secret: process.env.VNPAY_SECRET_KEY };
}

function dateGMT7(date) {
    return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

function integerMoney(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw fail('Số tiền VND không hợp lệ.');
    return value;
}

function unitPrice(product) {
    const price = integerMoney(product.price);
    const discount = String(product.discount ?? 0);
    if (!/^\d+(\.\d{1,2})?$/.test(discount)) throw fail('Mức giảm giá sản phẩm không hợp lệ.');
    const [whole, fraction = ''] = discount.split('.');
    const basisPoints = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (basisPoints > 10000) throw fail('Mức giảm giá sản phẩm không hợp lệ.');
    return integerMoney(Number((BigInt(price) * BigInt(10000 - basisPoints) + 5000n) / 10000n));
}

async function transaction(work) {
    indexesReady ||= Promise.all([Orders.init(), Attempts.init()]).catch((error) => {
        indexesReady = null;
        throw error;
    });
    await indexesReady;
    const session = await mongoose.startSession();
    try {
        return await session.withTransaction(() => work(session));
    } catch (error) {
        if (error.code === 20 || error.code === 263) throw fail('Hệ thống thanh toán tạm chưa sẵn sàng. Vui lòng thử lại sau.', 503);
        throw error;
    } finally {
        await session.endSession();
    }
}

async function snapshot(cart, session) {
    if (!cart.product.length) throw fail('Giỏ hàng đang trống.');
    for (const key of ['fullName', 'phone', 'address']) {
        if (typeof cart[key] !== 'string' || !cart[key].trim() || cart[key].length > 500) throw fail('Thông tin giao hàng thiếu hoặc không hợp lệ.');
    }
    const items = [];
    const seen = new Set();
    let subtotal = 0;
    for (const item of cart.product) {
        if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0 || seen.has(String(item.productId))) throw fail('Số lượng sản phẩm không hợp lệ.');
        seen.add(String(item.productId));
        const product = await Products.findById(item.productId).session(session);
        if (!product) throw fail('Sản phẩm không còn tồn tại.');
        assertSale(product);
        const price = unitPrice(product);
        subtotal = integerMoney(subtotal + integerMoney(price * item.quantity));
        items.push({ productId: item.productId, quantity: item.quantity, unitPrice: price, nameProduct: product.nameProduct,
            images: product.images, shippingPackage: estimateItem(product) });
    }
    let couponDiscount = 0;
    if (cart.nameCoupon) {
        if (!mongoose.isValidObjectId(cart.nameCoupon)) throw fail('Mã giảm giá không hợp lệ.');
        const now = new Date();
        const coupon = await Coupons.findOne({ _id: cart.nameCoupon, quantity: { $gt: 0 }, minPrice: { $lte: subtotal },
            startDate: { $lte: now }, endDate: { $gte: now } }).session(session);
        if (!coupon) throw fail('Mã giảm giá không hợp lệ, đã hết hạn hoặc đã hết lượt.');
        couponDiscount = Math.min(integerMoney(coupon.discount), subtotal);
    }
    // Base merchandise totals; checkout MUST attach a server quote before reserving stock.
    return { product: items, subtotal, couponDiscount, shippingFee: 0, totalPrice: integerMoney(subtotal - couponDiscount) };
}

async function reserve(order, session) {
    for (const item of order.product) {
        const result = await Products.updateOne({ _id: item.productId, stock: { $gte: item.quantity },
            publicationStatus: 'published', verificationStatus: 'verified' },
            { $inc: { stock: -item.quantity } }, { session });
        if (result.modifiedCount !== 1) throw fail('Sản phẩm không còn đủ số lượng hoặc chưa đủ điều kiện bán.');
    }
    order.inventoryReserved = true;
    if (order.nameCoupon) {
        const now = new Date();
        const result = await Coupons.updateOne({ _id: order.nameCoupon, quantity: { $gt: 0 }, minPrice: { $lte: order.subtotal },
            startDate: { $lte: now }, endDate: { $gte: now } }, { $inc: { quantity: -1 } }, { session });
        if (result.modifiedCount !== 1) throw fail('Mã giảm giá đã hết lượt sử dụng.');
        order.couponReserved = true;
    }
}

async function release(order, session) {
    // Legacy orders predate the flags; their original checkout already reserved inventory.
    if (order.inventoryReserved !== false) {
        for (const item of order.product) await Products.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } }, { session });
        order.inventoryReserved = false;
    }
    if (order.nameCoupon && order.couponReserved !== false) {
        await Coupons.updateOne({ _id: order.nameCoupon }, { $inc: { quantity: 1 } }, { session });
    }
    order.couponReserved = false;
}

function paymentUrl(order, req, settings, now, ref) {
    if (!order.totalPrice || !Number.isSafeInteger(order.totalPrice * 100)) throw fail('Số tiền thanh toán VNPay không hợp lệ.');
    const ip = (req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
    if (!net.isIP(ip)) throw fail('Chưa xác định được thông tin kết nối. Vui lòng thử lại.');
    const expiresAt = new Date(now.getTime() + TTL);
    const client = new VNPay({ tmnCode: settings.tmnCode, secureSecret: settings.secret, vnpayHost: settings.gateway.origin,
        vnp_Version: '2.1.0', hashAlgorithm: 'SHA512', enableLog: false, endpoints: { paymentEndpoint: settings.gateway.pathname } });
    const createDate = dateGMT7(now);
    return { expiresAt, createDate, paymentUrl: client.buildPaymentUrl({ vnp_Amount: order.totalPrice, vnp_IpAddr: ip,
        vnp_TxnRef: ref, vnp_OrderInfo: `Thanh toan don ${order._id}`, vnp_OrderType: 'other', vnp_ReturnUrl: settings.returnUrl.toString(),
        vnp_Locale: 'vn', vnp_CreateDate: Number(createDate), vnp_ExpireDate: Number(dateGMT7(expiresAt)) }) };
}

async function newAttempt(order, req, settings, session) {
    const ref = crypto.randomUUID().replace(/-/g, '');
    const data = paymentUrl(order, req, settings, new Date(), ref);
    await Attempts.create([{ orderId: order._id, transactionRef: ref, amount: order.totalPrice, ...data }], { session });
    order.transactionRef = ref;
    order.paymentStatus = 'pending';
    order.expiresAt = data.expiresAt;
    return data.paymentUrl;
}

async function checkout(req) {
    const method = req.body.typePayment;
    if (!['COD', 'VNPAY'].includes(method)) throw fail('Phương thức thanh toán chưa được hỗ trợ.');
    const settings = method === 'VNPAY' ? config() : null;
    const cartId = req.body.cartId;
    if (!mongoose.isValidObjectId(cartId)) throw fail('Mã giỏ hàng không hợp lệ.');
    return transaction(async (session) => {
        const existing = await Orders.findOne({ userId: req.user.id, checkoutKey: String(cartId) }).session(session);
        if (existing) {
            if (existing.paymentMethod !== method || existing.status === 'cancelled') throw fail('Giỏ hàng đã được tạo đơn.', 409);
            if (method === 'COD') return existing;
            const attempt = await Attempts.findOne({ transactionRef: existing.transactionRef, status: 'pending', expiresAt: { $gt: new Date() } })
                .select('+paymentUrl').session(session);
            if (!attempt) throw fail('Vui lòng kiểm tra trạng thái hoặc thanh toán lại từ trang đơn hàng.', 409);
            return attempt.paymentUrl;
        }
        const cart = await Carts.findOne({ _id: cartId, userId: req.user.id }).session(session);
        if (!cart) throw fail('Không tìm thấy giỏ hàng.');
        for (const key of ['fullName', 'phone', 'address', 'note']) {
            if (!Object.hasOwn(req.body, key)) continue;
            if (typeof req.body[key] !== 'string' || req.body[key].length > 2000) throw fail('Thông tin giao hàng không hợp lệ.');
            cart[key] = req.body[key];
        }
        if (Object.hasOwn(req.body, 'fullName')) cart.nameCoupon = req.body.nameCoupon || undefined;
        if (typeof cart.phone !== 'string' || !/^0\d{9,10}$/.test(cart.phone)) throw fail('Số điện thoại giao hàng không hợp lệ.');
        const baseTotals = await snapshot(cart, session);
        const totals = await shipping.applyQuote({ quoteId: req.body.shippingQuoteId, userId: req.user.id,
            cartId: String(cart._id), method, totals: baseTotals, address: cart.address }, session);
        const order = new Orders({ ...totals, userId: req.user.id, checkoutKey: String(cart._id), fullName: cart.fullName,
            phone: cart.phone, address: shipping.fullAddress(totals.shipping), note: cart.note, nameCoupon: cart.nameCoupon, status: 'pending',
            paymentMethod: method, paymentStatus: method === 'COD' ? 'unpaid' : 'pending', inventoryReserved: false, couponReserved: false });
        await reserve(order, session);
        const url = settings ? await newAttempt(order, req, settings, session) : null;
        await order.save({ session });
        await Carts.deleteOne({ _id: cart._id, userId: req.user.id }, { session });
        return url || order;
    });
}

function verify(query) {
    const settings = config();
    if (!query || Object.entries(query).some(([key, value]) => !key.startsWith('vnp_') || typeof value !== 'string')) return null;
    const { vnp_SecureHash: hash, vnp_SecureHashType: ignored, ...params } = query;
    if (!/^[a-fA-F0-9]{128}$/.test(hash || '')) return null;
    const search = new URLSearchParams();
    Object.keys(params).sort().forEach((key) => search.append(key, params[key]));
    const expected = crypto.createHmac('sha512', settings.secret).update(search.toString(), 'utf8').digest();
    if (!crypto.timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return null;
    const required = ['vnp_TxnRef', 'vnp_Amount', 'vnp_TmnCode', 'vnp_ResponseCode', 'vnp_TransactionStatus', 'vnp_TransactionNo', 'vnp_OrderInfo'];
    if (required.some((key) => !params[key]) || params.vnp_TmnCode !== settings.tmnCode ||
        !/^\d+$/.test(params.vnp_Amount) || !Number.isSafeInteger(Number(params.vnp_Amount)) ||
        !/^\d{2}$/.test(params.vnp_ResponseCode) || !/^\d{2}$/.test(params.vnp_TransactionStatus)) return null;
    return params;
}

async function ipn(query) {
    const data = verify(query);
    if (!data) return { RspCode: '97', Message: 'Invalid signature or parameters' };
    return settle(data, 'ipn');
}

async function settle(data, source) {
    return transaction(async (session) => {
        const attempt = await Attempts.findOne({ transactionRef: data.vnp_TxnRef }).session(session);
        if (!attempt) return { RspCode: '01', Message: 'Không tìm thấy đơn hàng.' };
        const order = await Orders.findById(attempt.orderId).session(session);
        if (!order || order.paymentMethod !== 'VNPAY') return { RspCode: '01', Message: 'Không tìm thấy đơn hàng.' };
        if (Number(data.vnp_Amount) !== attempt.amount * 100 || attempt.amount !== order.totalPrice) return { RspCode: '04', Message: 'Invalid amount' };
        if (data.vnp_OrderInfo !== `Thanh toan don ${order._id}`) return { RspCode: '01', Message: 'Order does not match' };
        if (attempt.receivedAt || attempt.reconciledAt) return { RspCode: '02', Message: 'Order already confirmed' };
        const success = data.vnp_ResponseCode === '00' && data.vnp_TransactionStatus === '00';
        Object.assign(attempt, { transactionNo: data.vnp_TransactionNo, bankCode: data.vnp_BankCode,
            responseCode: data.vnp_ResponseCode, transactionStatus: data.vnp_TransactionStatus, payDate: data.vnp_PayDate,
            confirmationSource: source, ...(source === 'ipn' ? { receivedAt: new Date() } : { reconciledAt: new Date() }) });
        const current = order.transactionRef === attempt.transactionRef;
        if (success && (!current || order.status === 'cancelled' || order.paymentStatus !== 'pending' || !order.inventoryReserved)) {
            attempt.status = 'refund_required';
            if (order.paymentStatus === 'pending' && order.inventoryReserved) {
                await release(order, session);
                if (!current) await Attempts.updateOne({ transactionRef: order.transactionRef, status: 'pending' },
                    { $set: { status: 'cancelled' } }, { session });
            }
            order.paymentStatus = 'refund_required';
        } else if (success) {
            attempt.status = 'paid';
            order.paymentStatus = 'paid';
        } else {
            attempt.status = 'failed';
            if (current && order.paymentStatus === 'pending') {
                await release(order, session);
                order.paymentStatus = 'failed';
            }
        }
        await attempt.save({ session });
        await order.save({ session });
        return { RspCode: '00', Message: 'Confirm success' };
    });
}

async function reconcile(idOrder, userId) {
    if (!mongoose.isValidObjectId(idOrder) || !mongoose.isValidObjectId(userId)) throw fail('Mã đơn hàng không hợp lệ.');
    const order = await Orders.findOne({ _id: idOrder, userId, paymentMethod: 'VNPAY' }).lean();
    if (!order) throw fail('Không tìm thấy đơn hàng.', 404);
    const summary = (paymentStatus, nextCheckAt = null) => ({ paymentStatus, nextCheckAt });
    if (!['pending', 'expired', 'failed'].includes(order.paymentStatus)) return summary(order.paymentStatus);
    const settings = config();
    const now = new Date();
    // A DB lease limits calls across tabs, workers and reloads; never hold a transaction over HTTP.
    const attempt = await Attempts.findOneAndUpdate({ transactionRef: order.transactionRef, orderId: order._id,
        receivedAt: { $exists: false }, reconciledAt: { $exists: false },
        $or: [{ nextQueryAt: { $exists: false } }, { nextQueryAt: { $lte: now } }] },
    { $set: { nextQueryAt: new Date(now.getTime() + 5 * 60 * 1000) } }, { new: true }).lean();
    if (!attempt) {
        const current = await Attempts.findOne({ transactionRef: order.transactionRef }).select('nextQueryAt').lean();
        return summary(order.paymentStatus, current?.nextQueryAt);
    }
    let result;
    try {
        result = await provider.queryAttempt({ VNPAY_URL: settings.gateway.href,
            VNPAY_TMN_CODE: settings.tmnCode, VNPAY_SECRET_KEY: settings.secret }, attempt);
    } catch {
        return summary(order.paymentStatus, attempt.nextQueryAt);
    }
    if (result.verified && result.responseCode === '00' && ['00', '02'].includes(result.transactionStatus)) {
        await settle({ vnp_TxnRef: attempt.transactionRef, vnp_Amount: String(attempt.amount * 100),
            vnp_OrderInfo: `Thanh toan don ${attempt.orderId}`, vnp_ResponseCode: result.responseCode,
            vnp_TransactionStatus: result.transactionStatus, vnp_TransactionNo: result.transactionNo,
            vnp_BankCode: result.bankCode, vnp_PayDate: result.payDate }, 'querydr');
    }
    const updated = await Orders.findOne({ _id: order._id, userId }).select('paymentStatus').lean();
    return summary(updated.paymentStatus, attempt.nextQueryAt);
}

async function retry(req) {
    const settings = config();
    if (!mongoose.isValidObjectId(req.body.idOrder)) throw fail('Mã đơn hàng không hợp lệ.');
    return transaction(async (session) => {
        const order = await Orders.findOne({ _id: req.body.idOrder, userId: req.user.id, paymentMethod: 'VNPAY', status: 'pending' }).session(session);
        if (!order || !['pending', 'failed', 'expired'].includes(order.paymentStatus)) throw fail('Đơn hàng chưa đủ điều kiện thanh toán.', 409);
        if (order.paymentStatus === 'pending') {
            const attempt = await Attempts.findOne({ transactionRef: order.transactionRef }).select('+paymentUrl').session(session);
            if (attempt && attempt.expiresAt > new Date()) return attempt.paymentUrl;
            throw fail('Giao dịch đang chờ xử lý hết hạn. Vui lòng kiểm tra lại sau.', 409);
        }
        await reserve(order, session);
        const url = await newAttempt(order, req, settings, session);
        await order.save({ session });
        return url;
    });
}

async function expirePending() {
    const expired = await Orders.find({ paymentMethod: 'VNPAY', paymentStatus: 'pending', expiresAt: { $lte: new Date() } }).select('_id').limit(100).lean();
    for (const { _id } of expired) await transaction(async (session) => {
        const order = await Orders.findOne({ _id, paymentStatus: 'pending', expiresAt: { $lte: new Date() } }).session(session);
        if (!order) return;
        await release(order, session);
        order.paymentStatus = 'expired';
        await Attempts.updateOne({ transactionRef: order.transactionRef, status: 'pending' }, { $set: { status: 'expired' } }, { session });
        await order.save({ session });
    });
}

const transitions = { pending: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
async function changeStatus(idOrder, status, userId) {
    if (!mongoose.isValidObjectId(idOrder) || !Object.hasOwn(transitions, status)) throw fail('Trạng thái hoặc mã đơn hàng không hợp lệ.');
    return transaction(async (session) => {
        const order = await Orders.findOne({ _id: idOrder, ...(userId ? { userId } : {}) }).session(session);
        if (!order) throw fail('Không tìm thấy đơn hàng.', 404);
        if (order.status === status) return;
        if (!transitions[order.status]?.includes(status) || (userId && order.status !== 'pending')) throw fail('Không thể chuyển trạng thái đơn hàng này.', 409);
        if (order.paymentMethod === 'VNPAY' && (order.paymentStatus === 'refund_required' ||
            (status !== 'cancelled' && order.paymentStatus !== 'paid'))) throw fail('Thanh toán chưa được xác nhận hoặc cần đối soát.', 409);
        if (status === 'cancelled') {
            if (['creating', 'unknown', 'ready'].includes(order.shipment?.state) && order.shipment?.status !== 'cancel') {
                throw fail('Cần xử lý hủy vận đơn tại GHN và đồng bộ trước khi hủy đơn để tránh hoàn kho khi hàng đang giao.', 409);
            }
            // Refunds require provider reconciliation; do not silently cancel a paid online order.
            if (order.paymentMethod !== 'COD' && (order.paymentStatus === 'paid' || !order.paymentStatus || order.paymentStatus === 'unpaid')) {
                throw fail('Đơn đã thanh toán cần được cửa hàng xử lý hoàn tiền trước khi hủy.', 409);
            }
            await release(order, session);
            if (order.paymentMethod === 'VNPAY') await Attempts.updateOne({ transactionRef: order.transactionRef, status: 'pending' }, { $set: { status: 'cancelled' } }, { session });
            if (order.paymentMethod === 'VNPAY') order.paymentStatus = 'failed';
        }
        if (status === 'delivered') {
            for (const item of order.product) await Products.updateOne({ _id: item.productId }, { $inc: { soldCount: item.quantity } }, { session });
            if (order.paymentMethod === 'COD') order.paymentStatus = 'paid';
        }
        if (status === 'shipped' && order.shipping && !order.shipment?.code) throw fail('Cần tạo vận đơn GHN trước khi chuyển sang đã giao vận.', 409);
        order.status = status;
        await order.save({ session });
    });
}

module.exports = { checkout, retry, verify, ipn, reconcile, expirePending, changeStatus, config, dateGMT7, unitPrice, paymentUrl, snapshot };
