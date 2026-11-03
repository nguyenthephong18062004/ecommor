const Products = require('../models/products.model');
const Requests = require('../models/preorder.model');
const { BadRequestError } = require('../core/error.response');
const { canPreorder } = require('./product-data.service');

const fail = (message, statusCode = 400) => { throw new BadRequestError(message, statusCode); };
const validId = id => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
const transitions = {
    pending: ['contacted', 'confirmed', 'cancelled'],
    contacted: ['confirmed', 'cancelled'],
    confirmed: [],
    cancelled: [],
};

function text(value, label, max, required = false) {
    if (value === undefined && !required) return '';
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
        fail(`${label} không hợp lệ (tối đa ${max} ký tự).`);
    }
    return value.trim();
}

async function create(input = {}, userId) {
    if (!input || !validId(input.productId)) fail('Mã sản phẩm không hợp lệ.');
    const fullName = text(input.fullName, 'Họ tên', 100, true);
    const phone = text(input.phone, 'Số điện thoại', 20, true).replace(/[\s().-]/g, '');
    if (!/^(?:0|\+84)[35789]\d{8}$/.test(phone)) fail('Số điện thoại Việt Nam không hợp lệ.');
    const email = text(input.email, 'Email', 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Email không hợp lệ.');
    const address = text(input.address, 'Địa chỉ', 500);
    const note = text(input.note, 'Ghi chú', 2000);
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10) {
        fail('Số lượng phải là số nguyên từ 1 đến 10.');
    }
    if (input.consent !== true) fail('Vui lòng đồng ý để cửa hàng liên hệ xác nhận yêu cầu.');

    const product = await Products.findById(input.productId).lean();
    if (!product) fail('Sản phẩm không còn tồn tại.', 404);
    if (!Number.isFinite(product.stock)) fail('Chưa xác định được tồn kho sản phẩm.', 409);
    if (product.stock > 0) fail('Sản phẩm đang có sẵn. Vui lòng mua qua giỏ hàng.', 409);
    if (!canPreorder(product)) fail('Sản phẩm hiện chưa nhận đặt hàng theo yêu cầu.', 409);
    const discount = product.discount ?? 0;
    if (!Number.isFinite(product.price) || product.price < 0 || !Number.isFinite(discount) || discount < 0 || discount > 100) {
        fail('Chưa xác định được giá sản phẩm. Vui lòng liên hệ cửa hàng.', 409);
    }
    const unitPrice = Math.round(product.price * (100 - discount) / 100);
    const request = await Requests.create({
        productId: product._id, productName: product.nameProduct, modelNumber: product.modelNumber,
        image: product.images?.split(',')[0] || '', unitPrice, totalPrice: unitPrice * input.quantity,
        quantity: input.quantity, fullName, phone, email, address, note,
        consentAt: new Date(), status: 'pending', userId,
        history: [{ status: 'pending', note: 'Đã tiếp nhận yêu cầu.', at: new Date() }],
    });
    return { id: request._id, status: request.status, unitPrice: request.unitPrice, totalPrice: request.totalPrice };
}

async function list(query = {}, userId) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        fail('Phân trang không hợp lệ.');
    }
    const filter = userId ? { userId } : {};
    if (query.status !== undefined && query.status !== '') {
        if (!Object.hasOwn(transitions, query.status)) fail('Trạng thái không hợp lệ.');
        filter.status = query.status;
    }
    const [items, total] = await Promise.all([
        Requests.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Requests.countDocuments(filter),
    ]);
    return { items, total, page, limit };
}

async function updateStatus(id, status, note = '') {
    if (!validId(id) || typeof status !== 'string' || !Object.hasOwn(transitions, status)) fail('Trạng thái hoặc mã yêu cầu không hợp lệ.');
    const request = await Requests.findById(id);
    if (!request) fail('Không tìm thấy yêu cầu.', 404);
    if (!transitions[request.status]?.includes(status)) fail('Không thể chuyển trạng thái yêu cầu này.', 409);
    const remark = text(note, 'Ghi chú xử lý', 1000);
    const updated = await Requests.findOneAndUpdate({ _id: id, status: request.status },
        { $set: { status }, $push: { history: { status, note: remark, at: new Date() } } }, { new: true, runValidators: true });
    if (!updated) fail('Yêu cầu vừa được cập nhật. Vui lòng tải lại danh sách.', 409);
    return { id: updated._id, status: updated.status };
}

module.exports = { create, list, updateStatus };
