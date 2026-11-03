const Users = require('../models/users.model');
const { BadRequestError } = require('../core/error.response');
const fields = 'wishlist savedSearches addresses';
const fail = () => { throw new BadRequestError('Danh sách yêu thích, địa chỉ hoặc tìm kiếm đã lưu không hợp lệ.', 400); };
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.keys(input).length ||
        Object.keys(input).some(key => !fields.split(' ').includes(key))) fail();
    const result = {};
    if (Object.hasOwn(input, 'wishlist')) {
        if (!Array.isArray(input.wishlist) || input.wishlist.length > 100 || input.wishlist.some(id => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))) fail();
        result.wishlist = [...new Set(input.wishlist.map(id => id.toLowerCase()))];
    }
    if (Object.hasOwn(input, 'savedSearches')) {
        if (!Array.isArray(input.savedSearches) || input.savedSearches.length > 10) fail();
        result.savedSearches = input.savedSearches.map(item => {
            if (!item || !text(item.name, 80) || !text(item.url, 2000) || !/^\/category\/(?:all|[a-f\d]{24}|brand\/[^/?#]+)(?:\?[^#]*)?$/.test(item.url) || /[\r\n\\]/.test(item.url)) fail();
            return { name: item.name.trim(), url: item.url };
        });
    }
    if (Object.hasOwn(input, 'addresses')) {
        if (!Array.isArray(input.addresses) || input.addresses.length > 8) fail();
        result.addresses = input.addresses.map(item => {
            if (!item || !text(item.fullName, 100) || !text(item.phone, 20) || !/^(?:0|\+84)[35789]\d{8}$/.test(item.phone) ||
                !text(item.address, 250) || !text(item.label, 40) || !Number.isSafeInteger(item.provinceId) || item.provinceId <= 0 ||
                !Number.isSafeInteger(item.districtId) || item.districtId <= 0 || !text(item.wardCode, 20)) fail();
            return Object.fromEntries(['label', 'fullName', 'phone', 'address', 'provinceId', 'districtId', 'wardCode'].map(key => [key, item[key]]));
        });
    }
    return result;
}

async function get(userId) {
    const user = await Users.findById(userId).select(fields).lean();
    if (!user) throw new BadRequestError('Không tìm thấy tài khoản.', 404);
    return { wishlist: user.wishlist || [], savedSearches: user.savedSearches || [], addresses: user.addresses || [] };
}

async function update(userId, input) {
    const data = validate(input);
    const user = await Users.findByIdAndUpdate(userId, { $set: data }, { new: true, runValidators: true }).select(fields).lean();
    if (!user) throw new BadRequestError('Không tìm thấy tài khoản.', 404);
    return { wishlist: user.wishlist || [], savedSearches: user.savedSearches || [], addresses: user.addresses || [] };
}

module.exports = { get, update, validate };
