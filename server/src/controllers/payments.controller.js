const modelPayments = require('../models/payments.model');
const modelCart = require('../models/cartUser.model');
const modelProduct = require('../models/products.model');
const modelCoupon = require('../models/coupon.model');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');

const crypto = require('crypto');
const axios = require('axios');

const vnpayService = require('../services/vnpay.service');

require('dotenv').config();

async function caclulateTotalPrice(cart) {
    if (cart.nameCoupon) {
        const findCoupon = await modelCoupon.findOne({ _id: cart.nameCoupon });
        return cart.totalPrice - findCoupon.discount;
    }
    return cart.totalPrice;
}

function requireConfig(name, value) {
    if (!value) {
        throw new Error(`Missing required configuration: ${name}`);
    }
    return value;
}

async function releaseInventory(items) {
    await Promise.all(
        items.map((item) => modelProduct.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } })),
    );
}

async function reserveInventory(items) {
    const reservedItems = [];

    try {
        for (const item of items) {
            if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
                throw new BadRequestError('Số lượng sản phẩm không hợp lệ');
            }

            const result = await modelProduct.updateOne(
                { _id: item.productId, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
            );
            if (result.modifiedCount !== 1) {
                throw new BadRequestError('Sản phẩm không đủ tồn kho');
            }
            reservedItems.push(item);
        }
    } catch (error) {
        await releaseInventory(reservedItems);
        throw error;
    }
}

class controllerPayments {
    async createPayment(req, res) {
        const { typePayment } = req.body;
        if (!typePayment) {
            throw new BadRequestError('Vui lòng chọn phương thức thanh toán');
        }
        if (typePayment === 'COD' || typePayment === 'VNPAY') {
            const metadata = await vnpayService.checkout(req);
            return new Created({ message: 'Tạo đơn hàng thành công', metadata }).send(res);
        }
        if (typePayment === 'MOMO') throw new BadRequestError('MoMo chưa hỗ trợ báo giá GHN. Vui lòng chọn COD hoặc VNPay.', 400);
        if (typePayment !== 'MOMO') throw new BadRequestError('Phương thức thanh toán không hợp lệ', 400);
        if (typePayment === 'MOMO') {
            const { id } = req.user;
            const findCart = await modelCart.findOne({ userId: id });
            if (!findCart) {
                throw new BadRequestError('Giỏ hàng không tồn tại');
            }

            if (!findCart.address || !findCart.phone || !findCart.fullName) {
                throw new BadRequestError('Vui lòng cập nhật thông tin nhận hàng');
            }

            var partnerCode = requireConfig('MOMO_PARTNER_CODE', process.env.MOMO_PARTNER_CODE);

            var accessKey = requireConfig('MOMO_ACCESS_KEY', process.env.MOMO_ACCESS_KEY);
            var secretkey = requireConfig('MOMO_SECRET_KEY', process.env.MOMO_SECRET_KEY);
            var requestId = partnerCode + new Date().getTime();
            var orderId = requestId;
            var orderInfo = `thanh toan ${findCart._id}`; // nội dung giao dịch thanh toán
            var redirectUrl = requireConfig('MOMO_REDIRECT_URL', process.env.MOMO_REDIRECT_URL);
            var ipnUrl = requireConfig('MOMO_IPN_URL', process.env.MOMO_IPN_URL);
            // var ipnUrl = redirectUrl = "https://webhook.site/454e7b77-f177-4ece-8236-ddf1c26ba7f8";
            var amount = await caclulateTotalPrice(findCart);
            var requestType = 'captureWallet';
            var extraData = ''; //pass empty value if your merchant does not have stores

            var rawSignature =
                'accessKey=' +
                accessKey +
                '&amount=' +
                amount +
                '&extraData=' +
                extraData +
                '&ipnUrl=' +
                ipnUrl +
                '&orderId=' +
                orderId +
                '&orderInfo=' +
                orderInfo +
                '&partnerCode=' +
                partnerCode +
                '&redirectUrl=' +
                redirectUrl +
                '&requestId=' +
                requestId +
                '&requestType=' +
                requestType;
            //puts raw signature

            //signature
            var signature = crypto.createHmac('sha256', secretkey).update(rawSignature).digest('hex');

            //json object send to MoMo endpoint
            const requestBody = JSON.stringify({
                partnerCode: partnerCode,
                accessKey: accessKey,
                requestId: requestId,
                amount: amount,
                orderId: orderId,
                orderInfo: orderInfo,
                redirectUrl: redirectUrl,
                ipnUrl: ipnUrl,
                extraData: extraData,
                requestType: requestType,
                signature: signature,
                lang: 'en',
            });

            const response = await axios.post(requireConfig('MOMO_ENDPOINT', process.env.MOMO_ENDPOINT), requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            new Created({ message: 'Thanh toán thành công', metadata: response.data.payUrl }).send(res);
        }
    }

    async checkPaymentVnpay(req, res) {
        const data = vnpayService.verify(req.query);
        if (!data) return res.status(400).json({ message: 'Dữ liệu hoặc chữ ký VNPay không hợp lệ' });
        const Attempts = require('../models/paymentAttempt.model');
        const attempt = await Attempts.findOne({ transactionRef: data.vnp_TxnRef });
        if (!attempt) return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
        if (Number(data.vnp_Amount) !== attempt.amount * 100) {
            return res.status(400).json({ message: 'Số tiền thanh toán không khớp' });
        }
        const paymentPath = `/payments/${attempt.orderId}`;
        return res.redirect(process.env.NODE_ENV === 'production'
            ? new URL(paymentPath, vnpayService.config().clientUrl).toString()
            : paymentPath);
    }

    async ipnVnpay(req, res) {
        try {
            return res.json(await vnpayService.ipn(req.query));
        } catch {
            return res.json({ RspCode: '99', Message: 'Chưa xử lý được yêu cầu.' });
        }
    }

    async retryVnpay(req, res) {
        return new OK({ message: 'Tạo URL thanh toán', metadata: await vnpayService.retry(req) }).send(res);
    }

    async reconcileVnpay(req, res) {
        return new OK({ message: 'VNPay payment status',
            metadata: await vnpayService.reconcile(req.body.idOrder, req.user.id) }).send(res);
    }

    async checkPaymentMomo(req, res, next) {
        const { orderInfo, orderId, resultCode } = req.query;
        if (resultCode === '0') {
            const transactionRef = `MOMO:${orderId}`;
            const existingPayment = await modelPayments.findOne({ transactionRef });
            if (existingPayment) {
                return res.redirect(`${process.env.DOMAIN_URL}/payments/${existingPayment._id}`);
            }

            const result = orderInfo.split(' ')[2];

            const findCart = await modelCart.findOne({ _id: result });
            if (!findCart) {
                throw new BadRequestError('Không tìm thấy giỏ hàng');
            }

            await reserveInventory(findCart.product);
            let newPayment;
            try {
                newPayment = new modelPayments({
                    fullName: findCart.fullName,
                    phone: findCart.phone,
                    address: findCart.address,
                    product: findCart.product,
                    totalPrice: await caclulateTotalPrice(findCart),
                    nameCoupon: findCart.nameCoupon,
                    paymentMethod: 'MOMO',
                    transactionRef,
                    userId: findCart.userId,
                    note: findCart.note,
                    status: 'pending',
                });

                await newPayment.save();
            } catch (error) {
                await releaseInventory(findCart.product);
                throw error;
            }
            await modelCoupon.updateOne({ _id: findCart.nameCoupon }, { $inc: { quantity: -1 } });
            await findCart.deleteOne();
            return res.redirect(`${process.env.DOMAIN_URL}/payments/${newPayment._id}`);
        }
    }

    async getPaymentSuccess(req, res) {
        const { idPayment } = req.query;
        const { id } = req.user;
        const findPayment = await modelPayments.findOne({ _id: idPayment, userId: id });
        if (!findPayment) {
            throw new BadRequestError('Không tìm thấy đơn hàng');
        }

        const products = await Promise.all(
            findPayment.product.map(async (item) => {
                const product = await modelProduct.findOne({ _id: item.productId });
                const price = item.unitPrice ?? (product ? vnpayService.unitPrice(product) : 0);
                return {
                    id: item.productId,
                    nameProduct: item.nameProduct || product?.nameProduct || 'Sản phẩm đã xóa',
                    price: price,
                    quantity: item.quantity,
                    image: (item.images || product?.images || '').split(',')[0],
                };
            }),
        );

        const data = {
            orderId: findPayment._id,
            fullName: findPayment.fullName,
            phone: findPayment.phone,
            address: findPayment.address,
            note: findPayment.note,
            paymentMethod: findPayment.paymentMethod,
            status: findPayment.status,
            paymentStatus: findPayment.paymentStatus,
            expiresAt: findPayment.expiresAt,
            shippingFee: findPayment.shippingFee,
            shipping: findPayment.shipping,
            shipment: findPayment.shipment,
            couponDiscount: findPayment.couponDiscount,
            products: products,
            totalPrice: findPayment.totalPrice,
        };

        new OK({
            message: 'Lấy thông tin đơn hàng thành công',
            statusCode: 200,
            metadata: data,
        }).send(res);
    }

    async getOrderUser(req, res) {
        try {
            const { id } = req.user;
            const orders = await modelPayments.find({ userId: id }).sort({ createdAt: -1 });

            const ordersWithProducts = await Promise.all(
                orders.map(async (order) => {
                    const productsDetails = await Promise.all(
                        order.product.map(async (item) => {
                            const product = await modelProduct.findOne({ _id: item.productId });
                            const price = item.unitPrice ?? (product ? vnpayService.unitPrice(product) : 0);

                            return {
                                productId: item.productId,
                                nameProduct: item.nameProduct || product?.nameProduct || 'Sản phẩm đã xóa',
                                price: price,
                                quantity: item.quantity,
                                images: item.images || product?.images || '',
                            };
                        }),
                    );

                    return {
                        orderId: order._id,
                        createdAt: order.createdAt,
                        fullName: order.fullName,
                        phone: order.phone,
                        address: order.address,
                        note: order.note,
                        status: order.status,
                        paymentMethod: order.paymentMethod,
                        paymentStatus: order.paymentStatus,
                        totalPrice: order.totalPrice,
                        shippingFee: order.shippingFee,
                        shipping: order.shipping,
                        shipment: order.shipment,
                        products: productsDetails.filter((p) => p !== null),
                    };
                }),
            );

            new OK({
                message: 'Lấy đơn hàng thành công',
                statusCode: 200,
                metadata: ordersWithProducts,
            }).send(res);
        } catch (error) {
            console.error('Error fetching user orders:', error);
            throw new BadRequestError('Có lỗi xảy ra khi lấy đơn hàng');
        }
    }

    async cancelOrder(req, res) {
        await vnpayService.changeStatus(req.body.idOrder, 'cancelled', req.user.id);
        new OK({ message: 'Đơn hàng đã được hủy bỏ' }).send(res);
    }

    async getOrderAdmin(req, res) {
        const orders = await modelPayments.find().sort({ createdAt: -1 });
        const data = await Promise.all(
            orders.map(async (order) => {
                const products = await modelProduct.find({ _id: { $in: order.product.map((item) => item.productId) } });
                const paymentAttempts = await require('../models/paymentAttempt.model').find({ orderId: order._id }).sort({ createdAt: -1 }).lean();
                const snapshots = order.product.map((item) => {
                    const current = products.find((product) => String(product._id) === String(item.productId));
                    return { _id: item.productId, nameProduct: item.nameProduct || current?.nameProduct || 'Sản phẩm đã xóa',
                        images: item.images || current?.images || '', price: item.unitPrice ?? (current ? vnpayService.unitPrice(current) : 0),
                        quantity: item.quantity };
                });
                return { ...order._doc, products: snapshots, paymentAttempts };
            }),
        );
        new OK({ message: 'Lấy đơn hàng thành công', metadata: data }).send(res);
    }

    async updateOrderStatus(req, res) {
        await vnpayService.changeStatus(req.body.idOrder, req.body.status);
        new OK({ message: 'Cập nhật trạng thái đơn hàng thành công' }).send(res);
    }

}

module.exports = new controllerPayments();
