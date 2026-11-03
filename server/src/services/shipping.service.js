const crypto = require('node:crypto');
const Quotes = require('../models/shippingQuote.model');
const Orders = require('../models/payments.model');
const ghn = require('./ghn.client');
const packaging = require('./shipping-package');
const { fail } = ghn;

function id(value) {
    if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) throw fail('Mã dữ liệu không hợp lệ.');
    return value;
}
function positive(value) {
    const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (!Number.isSafeInteger(number) || number <= 0) throw fail('Mã địa phương không hợp lệ.');
    return number;
}
function text(value, max = 250) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw fail('Địa chỉ giao hàng không hợp lệ.');
    return value.trim();
}
async function provinces() {
    const rows = await ghn.cached('/master-data/province');
    return rows.map(row => ({ id: row.ProvinceID, name: row.ProvinceName }));
}
async function districts(provinceId) {
    const rows = await ghn.cached('/master-data/district', { province_id: positive(provinceId) });
    return rows.filter(row => ![0, 1].includes(row.SupportType)).map(row => ({ id: row.DistrictID, name: row.DistrictName }));
}
async function wards(districtId) {
    const rows = await ghn.cached('/master-data/ward', { district_id: positive(districtId) });
    return (rows || []).map(row => ({ id: String(row.WardCode), name: row.WardName }));
}
async function destination(input) {
    const provinceId = positive(input?.provinceId), districtId = positive(input?.districtId);
    const wardCode = text(input?.wardCode, 20), street = text(input?.street);
    const [ps, ds, ws] = await Promise.all([provinces(), districts(provinceId), wards(districtId)]);
    const province = ps.find(row => row.id === provinceId), district = ds.find(row => row.id === districtId), ward = ws.find(row => row.id === wardCode);
    if (!province || !district || !ward) throw fail('Địa phương không thuộc tuyến giao hàng GHN đã chọn.');
    return { provinceId, provinceName: province.name, districtId, districtName: district.name, wardCode, wardName: ward.name, street };
}
function fingerprint(totals, method) {
    return crypto.createHash('sha256').update(JSON.stringify({ method, subtotal: totals.subtotal, couponDiscount: totals.couponDiscount,
        product: totals.product.map(item => [String(item.productId), item.quantity, item.unitPrice, item.shippingPackage]) })).digest('hex');
}
function payable(totals, customerFee) {
    const result = totals.subtotal - totals.couponDiscount + customerFee;
    if (!Number.isSafeInteger(result) || result < 0) throw fail('Tổng tiền thanh toán không hợp lệ.');
    return result;
}
async function price(parcel, to, amount, method, from, fixedCodAmount) {
    const settings = ghn.config();
    const origin = from || await ghn.origin();
    const base = { ...packaging.validateParcel(parcel), from_district_id: origin.districtId, from_ward_code: origin.wardCode,
        to_district_id: to.districtId, to_ward_code: to.wardCode, service_type_id: 2,
        insurance_value: Math.min(amount, 5000000) };
    let codValue = method === 'COD' ? (fixedCodAmount ?? amount) : 0, data, stable = method !== 'COD';
    for (let i = 0; i < 4; i++) {
        data = await ghn.request('/v2/shipping-order/fee', { ...base, cod_value: codValue });
        packaging.fees(data.total, method);
        const next = method === 'COD' ? (fixedCodAmount ?? amount + data.total) : 0;
        if (next > 50000000 && method === 'COD') throw fail('Tổng thu hộ COD vượt giới hạn 50 triệu của GHN. Vui lòng chọn VNPay.');
        if (next === codValue) { stable = true; break; }
        codValue = next;
    }
    if (!stable) throw fail('Cước COD đang thay đổi. Vui lòng lấy lại báo giá.', 409);
    let expectedDelivery = null;
    try {
        const eta = await ghn.request('/v2/shipping-order/leadtime', base);
        if (Number.isSafeInteger(eta.leadtime) && eta.leadtime > Date.now() / 1000) expectedDelivery = new Date(eta.leadtime * 1000);
    } catch { /* A valid fee may still be used when the optional ETA is unavailable. */ }
    return { provider: 'GHN', environment: settings.environment, shopId: settings.shopId, serviceTypeId: 2,
        origin, destination: to, parcel, ...packaging.fees(data.total, method), insuranceValue: base.insurance_value,
        insuranceLimited: amount > base.insurance_value, expectedDelivery };
}
async function createQuote({ userId, cartId, method, totals, address }) {
    id(String(userId)); id(cartId);
    packaging.fees(0, method);
    const to = await destination(address);
    const parcel = packaging.pack(totals.product.map(item => ({ product: { shippingPackage: item.shippingPackage }, quantity: item.quantity })));
    const shipping = await price(parcel, to, totals.subtotal - totals.couponDiscount, method);
    const quote = await Quotes.create({ userId, cartId, method, fingerprint: fingerprint(totals, method), shipping,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    return { quoteId: quote._id, method, expiresAt: quote.expiresAt, ...shipping,
        subtotal: totals.subtotal, couponDiscount: totals.couponDiscount,
        totalPrice: payable(totals, shipping.customerFee) };
}
async function applyQuote({ quoteId, userId, cartId, method, totals, address }, session) {
    id(quoteId);
    const quote = await Quotes.findOne({ _id: quoteId, userId, cartId, method, expiresAt: { $gt: new Date() } }).session(session);
    const settings = ghn.config();
    if (!quote || quote.fingerprint !== fingerprint(totals, method) || quote.shipping.destination.street !== address.trim() ||
        quote.shipping.environment !== settings.environment || quote.shipping.shopId !== settings.shopId) {
        throw fail('Báo giá vận chuyển đã hết hạn hoặc giỏ hàng thay đổi. Vui lòng lấy lại phí ship.', 409);
    }
    return { ...totals, shipping: quote.shipping, shippingFee: quote.shipping.customerFee,
        totalPrice: payable(totals, quote.shipping.customerFee) };
}
function fullAddress(shipping) {
    const d = shipping.destination;
    return [d.street, d.wardName, d.districtName, d.provinceName].join(', ');
}
function assertOrder(order) {
    if (!order) throw fail('Không tìm thấy đơn hàng.', 404);
    const settings = ghn.config();
    if (!order.shipping || order.shipping.environment !== settings.environment || order.shipping.shopId !== settings.shopId) {
        throw fail('Đơn chưa có báo giá GHN hoặc đang thuộc môi trường/shop khác.', 409);
    }
    if (order.status !== 'confirmed' || (order.paymentMethod === 'VNPAY' && order.paymentStatus !== 'paid') ||
        !['COD', 'VNPAY'].includes(order.paymentMethod)) throw fail('Chỉ tạo vận đơn cho đơn đã xác nhận; VNPay phải thanh toán thành công.', 409);
}
async function preview(orderId, parcel) {
    const order = await Orders.findById(id(orderId)).lean();
    assertOrder(order);
    const actual = parcel ? { ...packaging.validateParcel(parcel), estimated: false, profiles: ['Kiện thực tế do quản trị nhập'] } : order.shipping.parcel;
    return price(actual, order.shipping.destination, order.subtotal - order.couponDiscount, order.paymentMethod, order.shipping.origin,
        order.paymentMethod === 'COD' ? order.totalPrice : undefined);
}
function shipmentData(data) {
    if (typeof data.order_code !== 'string' || !/^[a-z\d_-]{3,50}$/i.test(data.order_code)) throw fail('GHN chưa trả mã vận đơn hợp lệ.', 503);
    return { state: 'ready', code: data.order_code, status: String(data.status || 'ready_to_pick').slice(0, 80),
        ...(Number.isSafeInteger(data.total_fee) ? { actualFee: data.total_fee } : {}),
        ...((data.expected_delivery_time || data.leadtime) && Number.isFinite(new Date(data.expected_delivery_time || data.leadtime).getTime()) ?
            { expectedDelivery: new Date(data.expected_delivery_time || data.leadtime) } : {}),
        ...(Array.isArray(data.log) ? { events: data.log.slice(-50).map(row => ({ status: String(row.status || '').slice(0, 80), at: row.updated_date })) } : {}),
        lastSyncAt: new Date(), lastError: '' };
}
async function createShipment(orderId, input = {}) {
    id(orderId);
    const previous = await Orders.findById(orderId).lean();
    if (previous?.shipment?.state === 'ready') return previous.shipment;
    assertOrder(previous);
    if (['creating', 'unknown'].includes(previous.shipment?.state)) throw fail('Đang tạo/chưa rõ kết quả vận đơn. Hãy đồng bộ GHN trước, không tạo lại.', 409);
    const shipping = await preview(orderId, input.parcel);
    if (!Number.isSafeInteger(input.expectedFee) || input.expectedFee !== shipping.grossFee) throw fail('Phí GHN đã đổi. Xem lại phí và xác nhận trước khi tạo vận đơn.', 409);
    const locked = await Orders.findOneAndUpdate({ _id: orderId, status: 'confirmed',
        'shipment.state': { $nin: ['creating', 'ready', 'unknown'] },
        ...(previous.paymentMethod === 'VNPAY' ? { paymentStatus: 'paid' } : {}) },
    { $set: { 'shipment.state': 'creating', 'shipment.startedAt': new Date() } }, { new: true }).lean();
    if (!locked) throw fail('Đơn đang được xử lý hoặc đã thay đổi trạng thái.', 409);
    const to = shipping.destination;
    let data;
    try {
        data = await ghn.request('/v2/shipping-order/create', {
            ...packaging.validateParcel(shipping.parcel), client_order_code: orderId,
            service_type_id: shipping.serviceTypeId, payment_type_id: 1,
            // Customer shipping is already included in totalPrice; never collect it twice.
            cod_amount: locked.paymentMethod === 'COD' ? locked.totalPrice : 0,
            insurance_value: shipping.insuranceValue, order_value: locked.subtotal - locked.couponDiscount,
            required_note: 'CHOXEMHANGKHONGTHU', to_name: locked.fullName, to_phone: locked.phone,
            to_address: fullAddress(shipping), to_district_id: to.districtId, to_ward_code: to.wardCode,
            to_province_name: to.provinceName, to_district_name: to.districtName, to_ward_name: to.wardName,
            is_new_to_address: false, note: locked.note || '',
            items: locked.product.map(item => ({ name: item.nameProduct, code: String(item.productId), quantity: item.quantity, price: item.unitPrice })) });
    } catch (error) {
        await Orders.updateOne({ _id: orderId }, { $set: { 'shipment.state': error.uncertain === false ? 'failed' : 'unknown',
            'shipment.lastError': 'Chưa tạo được vận đơn hoặc chưa xác định kết quả. Hãy đồng bộ trước khi thử lại.' } });
        throw error;
    }
    // If persistence fails AFTER GHN succeeds, keep the creation lock. Sync recovers by client code.
    const shipment = { ...shipmentData(data), parcel: shipping.parcel, actualFee: data.total_fee ?? shipping.grossFee };
    await Orders.updateOne({ _id: orderId }, { $set: { shipment } });
    return shipment;
}
async function syncShipment(orderId) {
    const order = await Orders.findById(id(orderId)).lean();
    if (!order?.shipping || !order.shipment?.state) throw fail('Đơn chưa có yêu cầu tạo vận đơn GHN.', 409);
    const settings = ghn.config();
    if (order.shipping.environment !== settings.environment || order.shipping.shopId !== settings.shopId) throw fail('Môi trường/shop GHN không khớp với đơn.', 409);
    if (order.shipment.state === 'creating' && Date.now() - new Date(order.shipment.startedAt).getTime() < 60000) {
        throw fail('Vận đơn đang được tạo. Vui lòng chờ một phút trước khi đồng bộ.', 409);
    }
    const data = await ghn.request(order.shipment.code ? '/v2/shipping-order/detail' : '/v2/shipping-order/detail-by-client-code',
        order.shipment.code ? { order_code: order.shipment.code } : { client_order_code: orderId }, 'GET');
    if ((data.client_order_code && data.client_order_code !== orderId) ||
        (order.shipment.code && order.shipment.code !== data.order_code)) throw fail('Thông tin vận đơn GHN không khớp đơn hàng.', 502);
    const shipment = { ...order.shipment, ...shipmentData(data) };
    await Orders.updateOne({ _id: orderId }, { $set: { shipment } });
    return shipment;
}

module.exports = { provinces, districts, wards, destination, createQuote, applyQuote, fullAddress, price,
    fingerprint, preview, createShipment, syncShipment, assertOrder, shipmentData };
