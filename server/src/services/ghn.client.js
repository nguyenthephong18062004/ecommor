const axios = require('axios');
const { BadRequestError } = require('../core/error.response');
const fail = (message, status = 400) => new BadRequestError(message, status);

function config() {
    const mode = process.env.GHN_ENV?.trim().toLowerCase();
    const environment = ['test', 'dev', 'development', 'staging', 'sandbox'].includes(mode) ? 'sandbox' : mode === 'production' ? 'production' : null;
    const shopId = Number(process.env.GHN_SHOP);
    if (!environment || !process.env.GHN_TOKEN?.trim() || !Number.isSafeInteger(shopId) || shopId <= 0) {
        throw fail('Cấu hình GHN_TOKEN, GHN_SHOP hoặc GHN_ENV chưa hợp lệ.', 503);
    }
    return { environment, shopId, token: process.env.GHN_TOKEN.trim(),
        baseURL: environment === 'sandbox' ? 'https://dev-online-gateway.ghn.vn/shiip/public-api' : 'https://online-gateway.ghn.vn/shiip/public-api' };
}

async function request(path, data, method = 'POST') {
    const settings = config();
    try {
        const response = await axios.request({ baseURL: settings.baseURL, url: path, method, timeout: 8000,
            maxRedirects: 0, maxContentLength: 2 * 1024 * 1024,
            headers: { Token: settings.token, ShopId: String(settings.shopId), 'Content-Type': 'application/json' },
            ...(method === 'GET' ? { params: data } : { data }) });
        if (response.data?.code === 200 && response.data.data == null && path.startsWith('/master-data/')) return [];
        if (response.data?.code !== 200 || response.data.data == null) throw new Error('Invalid GHN response');
        return response.data.data;
    } catch (error) {
        // Axios errors contain Token headers and recipient data. Never expose/log them.
        const result = fail('GHN chưa xử lý được yêu cầu. Kiểm tra cấu hình, địa chỉ và thử lại.', 503);
        result.uncertain = !error.response || error.response.status >= 500;
        throw result;
    }
}

const cache = new Map();
async function cached(path, params = {}) {
    const settings = config();
    const key = JSON.stringify([settings.environment, settings.shopId, path, params]);
    const previous = cache.get(key);
    if (previous && previous.expires > Date.now()) return previous.value;
    const value = await module.exports.request(path, params, 'GET');
    if (cache.size > 500) cache.clear();
    cache.set(key, { expires: Date.now() + 10 * 60 * 1000, value });
    return value;
}

async function origin() {
    const settings = config();
    const data = await cached('/v2/shop/all', { offset: 0, limit: 200 });
    const shop = data.shops?.find(item => Number(item._id) === settings.shopId);
    if (!shop || !shop.district_id || !shop.ward_code) throw fail('GHN_SHOP chưa có địa chỉ lấy hàng hợp lệ trong tài khoản GHN.', 503);
    return { districtId: Number(shop.district_id), wardCode: String(shop.ward_code) };
}

module.exports = { config, request, cached, origin, fail };
