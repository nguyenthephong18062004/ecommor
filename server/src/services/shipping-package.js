const { fail } = require('./ghn.client');

function validateParcel(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail('Thông số kiện hàng không hợp lệ.');
    const parcel = {};
    for (const key of ['weight', 'length', 'width', 'height']) {
        if (!Number.isSafeInteger(value[key]) || value[key] < 1 || value[key] > (key === 'weight' ? 19999 : 200)) {
            throw fail('Kiện hàng cần cân nặng nguyên gram (dưới 20kg), kích thước nguyên cm (tối đa 200cm).');
        }
        parcel[key] = value[key];
    }
    return parcel;
}

function estimateItem(product) {
    if (product.shippingPackage?.weight) return { ...validateParcel(product.shippingPackage), estimated: product.shippingPackage.estimated === true,
        profile: product.shippingPackage.profile || 'Thông số đóng gói đã nhập' };
    // Operational estimates including a protective box; NOT manufacturer weights.
    const strap = String(product.strapMaterial || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const metal = /thep|steel|kim loai|metal|vang|gold/.test(strap);
    const oversized = Number(product.dialDiameter) > 44 || Number(product.caseThickness) > 14;
    return { weight: oversized ? 900 : metal ? 750 : 550,
        length: oversized ? 24 : 20, width: oversized ? 20 : 16, height: oversized ? 14 : 12,
        estimated: true, profile: oversized ? 'Đồng hồ cỡ lớn + hộp bảo vệ' : metal ? 'Dây kim loại + hộp bảo vệ' : 'Dây da/cao su/khác + hộp bảo vệ' };
}

function pack(items) {
    if (!Array.isArray(items) || !items.length) throw fail('Giỏ hàng trống.');
    let weight = 0, length = 0, width = 0, minHeight = 0, estimated = false;
    const profiles = new Set();
    for (const { product, quantity } of items) {
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) throw fail('Số lượng kiện hàng không hợp lệ.');
        const parcel = estimateItem(product);
        weight += parcel.weight * quantity;
        length = Math.max(length, parcel.length); width = Math.max(width, parcel.width); minHeight = Math.max(minHeight, parcel.height);
        estimated ||= parcel.estimated; profiles.add(parcel.profile);
    }
    // A conservative grid of individually boxed watches in one outer parcel.
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const columns = Math.ceil(Math.sqrt(count));
    length *= columns;
    const height = minHeight * Math.ceil(count / columns);
    return { ...validateParcel({ weight, length, width, height }), estimated, profiles: [...profiles] };
}

function fees(grossFee, method) {
    if (!Number.isSafeInteger(grossFee) || grossFee < 0 || grossFee > 50000000) throw fail('Phí GHN trả về không hợp lệ.', 502);
    if (!['COD', 'VNPAY'].includes(method)) throw fail('GHN chỉ hỗ trợ COD hoặc VNPay trong luồng này.');
    const support = method === 'VNPAY' ? Math.ceil(grossFee / 2) : 0;
    return { grossFee, support, customerFee: grossFee - support };
}

module.exports = { validateParcel, estimateItem, pack, fees };
