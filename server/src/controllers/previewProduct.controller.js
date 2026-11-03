const modelPreviewProduct = require('../models/previewProduct.model');
const Orders = require('../models/payments.model');
const { BadRequestError } = require('../core/error.response');
const { parsePage } = require('../services/product-catalog.service');
const { OK, Created } = require('../core/success.response');
const modelProduct = require('../models/products.model');
const modelUser = require('../models/users.model');
class controllerPreviewProduct {
    async createPreviewProduct(req, res) {
        const { content, rating, productId } = req.body;
        const { id } = req.user;
        if (!validId(productId) || typeof content !== 'string' || !content.trim() || content.length > 2000 ||
            !Number.isInteger(rating) || rating < 1 || rating > 5) throw new BadRequestError('Nội dung hoặc số sao đánh giá không hợp lệ.', 400);
        const order = await Orders.findOne({ userId: id, status: 'delivered', paymentStatus: 'paid', 'product.productId': productId }).select('_id').lean();
        if (!order) throw new BadRequestError('Bạn chỉ có thể đánh giá sản phẩm đã mua và nhận hàng thành công.', 403);
        if (!await modelProduct.exists({ _id: productId })) throw new BadRequestError('Sản phẩm không còn tồn tại.', 404);
        let previewProduct;
        try {
            previewProduct = await modelPreviewProduct.create({ userId: id, productId, content: content.trim(),
                rating, orderId: order._id, moderationStatus: 'pending' });
        } catch (error) {
            if (error.code === 11000) throw new BadRequestError('Bạn đã đánh giá sản phẩm này.', 409);
            throw error;
        }

        new Created({
            message: 'Cảm ơn bạn! Đánh giá đang chờ duyệt.',
            statusCode: 201,
            metadata: { id: previewProduct._id, moderationStatus: 'pending' },
        }).send(res);
    }

    async getPreviewProductHome(req, res) {
        new OK({ metadata: (await listReviews({})).items }).send(res);
    }
    async getReviews(req, res) { new OK({ metadata: await listReviews(req.query) }).send(res); }
    async moderation(req, res) { new OK({ metadata: await listReviews(req.query, true) }).send(res); }
    async moderate(req, res) {
        if (!validId(req.params.id) || !['approved', 'rejected'].includes(req.body.status)) throw new BadRequestError('Trạng thái đánh giá không hợp lệ.', 400);
        const review = await modelPreviewProduct.findByIdAndUpdate(req.params.id,
            { $set: { moderationStatus: req.body.status } }, { new: true, runValidators: true });
        if (!review) throw new BadRequestError('Không tìm thấy đánh giá.', 404);
        new OK({ message: 'Đã cập nhật đánh giá.', metadata: { id: review._id, status: review.moderationStatus } }).send(res);
    }
}
const validId = id => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
async function listReviews(query, moderation = false) {
    const page = parsePage(query.page);
    if (page > 100000) throw new BadRequestError('Số trang quá lớn.', 400);
    const filter = moderation ? { moderationStatus: 'pending' }
        : { $or: [{ moderationStatus: 'approved' }, { moderationStatus: { $exists: false } }] };
    if (query.productId !== undefined) {
        if (!validId(query.productId)) throw new BadRequestError('Mã sản phẩm không hợp lệ.', 400);
        filter.productId = query.productId;
    }
    const [rows, total] = await Promise.all([modelPreviewProduct.find(filter).sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * 10).limit(10).lean(), modelPreviewProduct.countDocuments(filter)]);
    const users = await modelUser.find({ _id: { $in: rows.map(row => row.userId) } }).select('fullName').lean();
    const names = new Map(users.map(user => [String(user._id), user.fullName]));
    return { items: rows.map(row => ({ _id: row._id, productId: row.productId, content: row.content,
        rating: row.rating, createdAt: row.createdAt, user: { name: names.get(String(row.userId)) || 'Khách hàng' },
        verifiedPurchase: Boolean(row.orderId), moderationStatus: row.moderationStatus || 'approved' })), total, page, pageSize: 10 };
}
module.exports = new controllerPreviewProduct();
