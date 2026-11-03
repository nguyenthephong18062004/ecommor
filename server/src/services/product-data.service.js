const mongoose = require('mongoose');
const { BadRequestError } = require('../core/error.response');

const textFields = ['nameProduct', 'modelNumber', 'brand', 'collection', 'category', 'origin', 'gender',
    'glassMaterial', 'movement', 'powerReserve', 'warrantyGlobal', 'bezelMaterial', 'strapMaterial',
    'faceColor', 'waterResistance', 'description', 'images', 'verificationNote', 'condition', 'boxPapers'];
const numberFields = ['price', 'discount', 'stock', 'dialDiameter', 'caseThickness'];
const requiredFields = ['nameProduct', 'modelNumber', 'brand', 'origin', 'gender', 'glassMaterial',
    'movement', 'strapMaterial', 'waterResistance', 'description', 'images'];
const visibleFilter = { publicationStatus: { $ne: 'archived' } };
const cardFields = 'nameProduct modelNumber price discount images stock soldCount brand gender category collection movement strapMaterial dialDiameter faceColor createdAt publicationStatus verificationStatus allowPreorder expectedRestockAt';
const fail = message => { throw new BadRequestError(message, 400); };
const normalizeSearch = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd').toLowerCase().trim();
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function searchFilter(value) {
    const accents = { a: 'aàáạảãâầấậẩẫăằắặẳẵ', e: 'eèéẹẻẽêềếệểễ', i: 'iìíịỉĩ',
        o: 'oòóọỏõôồốộổỗơờớợởỡ', u: 'uùúụủũưừứựửữ', y: 'yỳýỵỷỹ', d: 'dđ' };
    const pattern = [...normalizeSearch(value)].map(char => accents[char] ? `[${accents[char]}]` : escapeRegex(char)).join('');
    const literal = { $regex: pattern, $options: 'i' };
    return { $or: ['nameProduct', 'modelNumber', 'brand', 'collection'].map(key => ({ [key]: literal }))
        .concat({ searchText: { $regex: escapeRegex(normalizeSearch(value)) } }) };
}

function searchable(product) {
    return normalizeSearch(['nameProduct', 'modelNumber', 'brand', 'collection'].map(key => product[key]).join(' '));
}

function canPurchase(product) {
    return product?.publicationStatus === 'published' && product.verificationStatus === 'verified' && product.stock > 0;
}

function canPreorder(product) {
    return product?.publicationStatus === 'published' && product.allowPreorder === true && product.stock <= 0;
}

function assertSale(product) {
    if (!canPurchase(product)) throw new BadRequestError('Sản phẩm chưa đủ điều kiện bán hoặc đã hết hàng. Vui lòng liên hệ cửa hàng.', 409);
}

function productInput(body = {}, creating = false) {
    const data = {};
    for (const key of textFields) {
        if (!Object.hasOwn(body, key)) continue;
        const max = key === 'description' ? 100000 : key === 'images' ? 20000 : 2000;
        if (typeof body[key] !== 'string' || body[key].length > max) fail(`Thông tin ${key} không hợp lệ.`);
        data[key] = body[key].trim();
    }
    if (creating && requiredFields.some(key => !data[key])) fail('Vui lòng nhập đầy đủ thông tin sản phẩm.');
    if (requiredFields.some(key => Object.hasOwn(data, key) && !data[key])) fail('Thông tin bắt buộc không được để trống.');
    for (const key of numberFields) {
        if (!Object.hasOwn(body, key)) continue;
        const value = body[key];
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
            (['price', 'stock'].includes(key) && !Number.isSafeInteger(value)) ||
            (key === 'price' && (value === 0 || value > Number.MAX_SAFE_INTEGER / 100)) ||
            (key === 'discount' && (value > 100 || !/^\d+(?:\.\d{1,2})?$/.test(String(value)))) ||
            (key === 'stock' && value > 1000000)) fail(`Giá trị ${key} không hợp lệ.`);
        data[key] = value;
    }
    if (creating && ['price', 'stock', 'dialDiameter'].some(key => data[key] === undefined)) fail('Vui lòng nhập giá, tồn kho và kích thước.');
    for (const [key, values] of Object.entries({
        publicationStatus: ['preview', 'published', 'archived'], verificationStatus: ['unverified', 'verified', 'demo'],
        condition: ['new', 'preowned'],
    })) {
        if (!Object.hasOwn(body, key)) continue;
        if (!values.includes(body[key])) fail(`Trạng thái ${key} không hợp lệ.`);
        data[key] = body[key];
    }
    if (Object.hasOwn(body, 'allowPreorder')) {
        if (typeof body.allowPreorder !== 'boolean') fail('Tùy chọn nhận đặt hàng không hợp lệ.');
        data.allowPreorder = body.allowPreorder;
    }
    if (Object.hasOwn(body, 'expectedRestockAt')) {
        if (body.expectedRestockAt === null || body.expectedRestockAt === '') data.expectedRestockAt = null;
        else {
            if (typeof body.expectedRestockAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.expectedRestockAt) ||
                !Number.isFinite(Date.parse(body.expectedRestockAt)) || new Date(body.expectedRestockAt).toISOString().slice(0, 10) !== body.expectedRestockAt) fail('Ngày hàng về không hợp lệ.');
            data.expectedRestockAt = new Date(`${body.expectedRestockAt}T00:00:00+07:00`);
        }
    }
    if (data.category && !mongoose.isValidObjectId(data.category)) fail('Danh mục không hợp lệ.');
    if (data.images && data.images.split(',').some(url => !/^(?:https?:\/\/[^\s]+|\/uploads\/[^\s]+)$/i.test(url.trim()))) fail('Đường dẫn ảnh không hợp lệ.');
    if (Object.hasOwn(body, 'shippingPackage')) data.shippingPackage = body.shippingPackage == null ? undefined
        : require('./shipping-package').validateParcel(body.shippingPackage);
    return data;
}

function validateVerification(product) {
    if (product.verificationStatus === 'verified' && !product.verificationNote?.trim()) fail('Vui lòng ghi căn cứ xác minh sản phẩm trước khi bật bán hàng.');
}

module.exports = { productInput, validateVerification, canPurchase, canPreorder, assertSale, visibleFilter,
    cardFields, normalizeSearch, searchFilter, searchable };
