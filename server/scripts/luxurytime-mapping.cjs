const { createHash } = require('node:crypto');

const VERSION = 'luxurytime-catalog-v1';
const UNKNOWN = 'Ch\u01b0a x\u00e1c minh';
const NA = 'Kh\u00f4ng \u00e1p d\u1ee5ng';
const CATEGORIES = {
    male: '\u0110\u1ed3ng H\u1ed3 Nam', female: '\u0110\u1ed3ng H\u1ed3 N\u1eef',
    unisex: '\u0110\u1ed3ng H\u1ed3 Unisex', accessory: 'Ph\u1ee5 Ki\u1ec7n \u0110\u1ed3ng H\u1ed3',
};

function norm(value = '') {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[\u0111\u0110]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function stableId(kind, key) {
    return createHash('sha256').update(`luxurytime.vn:${kind}:${key}`).digest('hex').slice(0, 24);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function spec(product, pattern) {
    return (product.specifications || []).find(s => pattern.test(norm(s.name)) && String(s.value).trim())?.value?.trim() || '';
}

function short(product, key) {
    return (product.short_fields || []).find(s => norm(s.name) === key)?.value?.trim() || '';
}

function median(values) {
    const sorted = values.filter(v => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function dimensions(value) {
    // A short decimal comma is a fraction; 40,42mm denotes two size options.
    const text = String(value).toLowerCase().replace(/(\d),(\d)(?!\d)/g, '$1.$2');
    const numbers = (text.match(/\d+(?:\.\d+)?/g) || []).map(Number);
    const plausible = numbers.filter(n => n >= 20 && n <= 60);
    if (!plausible.length) return null;
    if (/x|\u00d7/.test(text) && plausible.length === 2) return Math.min(...plausible);
    return plausible[0];
}

function identify(product) {
    const name = norm(product.name);
    const accessory = (product.categories || []).some(c => norm(c.name).includes('phu kien'))
        || /^(day dong ho|khoa dong ho)\b/.test(name);
    const brands = ['Richard Mille', 'Patek Philippe', 'Hublot', 'Franck Muller', 'Rolex', 'Cartier',
        'Audemars Piguet', 'Jacob & Co', 'Omega', 'Piaget', 'Chopard', 'Jaeger LeCoultre', 'Vacheron Constantin'];
    const brandText = [product.name, spec(product, /^xuat xu$/), short(product, 'loai'),
        ...(product.categories || []).map(c => c.name)].map(norm).join(' ');
    const brand = brands.find(b => brandText.includes(norm(b)))
        || (/\bpatek\b/.test(brandText) ? 'Patek Philippe' : /\baudemars\b/.test(brandText) ? 'Audemars Piguet' : UNKNOWN);
    const family = ['Nautilus', 'Aquanaut', 'Datejust', 'Day Date', 'Submariner', 'Daytona', 'GMT Master',
        'Royal Oak', 'Bigbang', 'Big Bang', 'Classic Fusion', 'Vanguard', 'Epic X', 'Speedmaster', 'Seamaster']
        .find(f => name.includes(norm(f))) || (name.match(/\brm\s*\d+/)?.[0]?.replace(/\s/g, '').toUpperCase()) || brand;
    const custom = (product.categories || []).some(c => norm(c.name).includes('che tac'));
    return { brand, family, accessory, custom };
}

function mapProducts(sources, existing, categoryIds) {
    const identities = new Map(sources.map(p => [p.id, identify(p)]));
    const existingWatches = existing.filter(p => /dong ho/.test(norm(p.nameProduct)) || /\b(nam|nu)\b/.test(norm(p.nameProduct)))
        .filter(p => !/\b(pc|ram|ssd)\b/.test(norm(p.nameProduct)));
    const defaultStock = Math.max(1, Math.min(10, Math.round(median(existingWatches.map(p => p.stock)) || 10)));
    const priced = sources.filter(p => Number.isSafeInteger(p.price) && p.price > 0 && p.currency === 'VND');
    return sources.map(source => {
        if (!Number.isSafeInteger(source.id) || source.id <= 0 || !source.name) throw new Error('Invalid source product');
        const identity = identities.get(source.id);
        const fields = {};
        const product = { _id: stableId('product', source.id), publicationStatus: 'preview',
            verificationStatus: 'demo', allowPreorder: false };
        const assign = (field, value, mode, evidence) => {
            product[field] = value;
            fields[field] = { mode, evidence };
        };
        assign('nameProduct', source.name, 'source', 'name');
        const ref = spec(source, /^ref$/) || short(source, 'ma san pham');
        assign('modelNumber', ref || `LT-${source.id}`, ref ? 'source' : 'generated', ref ? 'Ref / Ma san pham' : 'stable source ID');
        assign('brand', identity.brand, 'derived', 'name, source brand and categories');
        assign('collection', identity.family, 'derived', 'family in product name; otherwise brand');
        const sizeText = spec(source, /kich.*thu|size/);
        const size = dimensions(sizeText) || dimensions(source.name.match(/\d+(?:[.,]\d+)?\s*mm/i)?.[0] || '');
        const peerSizes = sources.filter(p => identities.get(p.id).brand === identity.brand && !identities.get(p.id).accessory)
            .map(p => dimensions(spec(p, /kich.*thu|size/)));
        assign('dialDiameter', identity.accessory ? 0 : size || median(peerSizes) || 40,
            identity.accessory ? 'not_applicable' : size ? 'derived' : 'demo',
            identity.accessory ? 'accessory has no watch dial' : size ? `size: ${sizeText || 'name'}; first option or case width` : 'same-brand median size, fallback 40 mm');
        const genderText = norm(`${source.name} ${spec(source, /gioi tinh/)} ${sizeText}`);
        const female = /\b(nu|lady|ladies|women)\b/.test(genderText);
        const male = /\b(nam|men)\b/.test(genderText);
        const gender = identity.accessory || /unisex/.test(genderText) || (female && male) ? 'Unisex'
            : female ? 'N\u1eef' : male ? 'Nam' : product.dialDiameter <= 34 ? 'N\u1eef'
                : product.dialDiameter >= 40 ? 'Nam' : 'Unisex';
        assign('gender', gender, female || male ? 'source' : 'derived', 'explicit gender; otherwise <=34 female, >=40 male, remaining unisex');
        const categoryKey = identity.accessory ? 'accessory' : gender === 'Nam' ? 'male' : gender === 'N\u1eef' ? 'female' : 'unisex';
        if (!categoryIds[categoryKey]) throw new Error('Category mapping missing');
        assign('category', String(categoryIds[categoryKey]), 'derived', CATEGORIES[categoryKey]);
        // The source's "origin" column contains brand names, not countries of manufacture.
        assign('origin', UNKNOWN, 'unknown', 'source Xuat xu is a brand; manufacturing origin unverified');
        const sourceField = (field, pattern, fallback = UNKNOWN, fallbackMode = 'unknown') => {
            const value = spec(source, pattern);
            assign(field, identity.accessory ? NA : value || fallback,
                identity.accessory ? 'not_applicable' : value ? 'source' : fallbackMode, value ? 'specifications' : 'explicit missing-data fallback');
        };
        sourceField('glassMaterial', /^(chat lieu mat kinh|mat kinh|kinh)$/);
        sourceField('movement', /^(movement|bo chuyen dong)$/);
        sourceField('powerReserve', /du tru cot/,
            /quartz|pin/.test(norm(product.movement)) ? NA : UNKNOWN,
            /quartz|pin/.test(norm(product.movement)) ? 'not_applicable' : 'unknown');
        sourceField('warrantyGlobal', /bao hanh quoc te/);
        const thicknessText = spec(source, /do day|do mong/);
        const thickness = Number(thicknessText.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.'));
        const peerThicknesses = sources.filter(p => identities.get(p.id).brand === identity.brand)
            .map(p => Number(spec(p, /do day|do mong/).match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.')))
            .filter(v => v >= 3 && v <= 25);
        const existingThickness = existingWatches.map(p => p.caseThickness).filter(v => v >= 5 && v <= 20);
        assign('caseThickness', identity.accessory ? 0 : thickness >= 3 && thickness <= 25 ? thickness : median(peerThicknesses) || median(existingThickness) || 12,
            identity.accessory ? 'not_applicable' : thickness >= 3 && thickness <= 25 ? 'source' : 'demo',
            'source thickness; otherwise same-brand median or bounded existing-watch median');
        sourceField('bezelMaterial', /^(bezel|chat lieu vo|vo|chat lieu)$/);
        const strap = spec(source, /^(chat lieu day deo|chat lieu day|day deo)$/)
            || (identity.accessory ? spec(source, /^chat lieu$/) : '');
        assign('strapMaterial', strap || UNKNOWN, strap ? 'source' : 'unknown', 'strap specification; accessory material');
        sourceField('faceColor', /^(mau sac mat dial|mat dial|dial)$/,
            'Theo h\u00ecnh \u1ea3nh s\u1ea3n ph\u1ea9m', 'unknown');
        sourceField('waterResistance', /^chong nuoc$/);
        // Borrow only material/power-reserve demo values, never a country, warranty or water rating.
        for (const [field, pattern] of [
            ['glassMaterial', /^(chat lieu mat kinh|mat kinh|kinh)$/],
            ['strapMaterial', /^(chat lieu day deo|chat lieu day|day deo)$/],
            ['bezelMaterial', /^(bezel|chat lieu vo|vo|chat lieu)$/],
            ['powerReserve', /du tru cot/],
        ]) {
            if (identity.accessory || fields[field].mode !== 'unknown') continue;
            const available = sources.filter(p => !identities.get(p.id).accessory && spec(p, pattern));
            let peers = available.filter(p => identities.get(p.id).brand === identity.brand && identities.get(p.id).family === identity.family);
            if (!peers.length) peers = available.filter(p => identities.get(p.id).brand === identity.brand);
            if (!peers.length) peers = available;
            const counts = new Map();
            for (const peer of peers) {
                const value = spec(peer, pattern);
                const key = norm(value);
                const entry = counts.get(key) || { value, sourceIds: [] };
                entry.sourceIds.push(peer.id);
                counts.set(key, entry);
            }
            const reference = [...counts.values()].sort((a, b) => b.sourceIds.length - a.sourceIds.length || a.value.localeCompare(b.value))[0];
            if (reference) assign(field, reference.value, 'demo', { method: 'most frequent supplied value in same family/brand, then all watches', sourceIds: reference.sourceIds });
        }
        let price = source.price;
        let priceMode = 'source';
        let priceEvidence = 'source price (VND), no second discount';
        if (!(Number.isSafeInteger(price) && price > 0)) {
            const comparable = priced.filter(p => {
                const item = identities.get(p.id);
                return !item.accessory && item.custom === identity.custom;
            });
            let peers = comparable.filter(p => identities.get(p.id).brand === identity.brand && identities.get(p.id).family === identity.family);
            if (!peers.length) peers = comparable.filter(p => identities.get(p.id).brand === identity.brand);
            if (!peers.length) peers = comparable;
            if (!peers.length) peers = priced.filter(p => !identities.get(p.id).accessory && !identities.get(p.id).custom);
            const base = median(peers.map(p => p.price)) || median(existingWatches.map(p => p.price)) || 5000000;
            // Accessories have no comparable source price; use 10% of the watch reference for demo data.
            price = Math.round(base * (identity.accessory ? 0.1 : 1) / 100000) * 100000;
            priceMode = 'demo';
            priceEvidence = { method: identity.accessory ? '10% watch reference, rounded 100000 VND' : 'median same family/brand/type, rounded 100000 VND', sourceIds: peers.map(p => p.id) };
        }
        if (source.currency !== 'VND') throw new Error('Unsupported currency');
        assign('price', price, priceMode, priceEvidence);
        assign('discount', 0, 'default', 'source price is already the effective price');
        const availability = norm(spec(source, /^trong kho$/) || spec(source, /^thoi gian/));
        const orderOnly = /oder|order|hang dat/.test(availability) && !/co san|san hang/.test(availability);
        assign('stock', source.is_in_stock === false || orderOnly ? 0 : defaultStock,
            source.is_in_stock === false || orderOnly ? 'derived' : 'demo',
            orderOnly ? 'source order-only item' : `demo stock = min(10, median positive existing watch stock); source availability: ${availability}`);
        assign('soldCount', 0, 'default', 'new catalog item has no local sales');
        const urls = [...new Set(source.image_urls || [])];
        if (!urls.length || urls.some(u => !/^https?:$/.test(new URL(u).protocol) || u.includes(','))) throw new Error('Invalid image URL');
        assign('images', urls.join(','), 'source', 'deduplicated image_urls; comma-separated existing schema');
        const notes = Object.entries(fields).filter(([, info]) => info.mode === 'demo').map(([key]) => key);
        const rows = (source.specifications || []).filter(s => s.name && s.value)
            .map(s => `<tr><th>${escapeHtml(s.name)}</th><td>${escapeHtml(s.value)}</td></tr>`).join('');
        const description = `<h2>${escapeHtml(source.name)}</h2><p>${escapeHtml(source.description || source.short_description || source.name).replace(/\n/g, '<br>')}</p>`
            + `<table><tbody>${rows}</tbody></table>`
            + `<p>Ngu\u1ed3n d\u1eef li\u1ec7u: ${escapeHtml(source.source_url)}. Th\u00f4ng tin ngu\u1ed3n ch\u01b0a \u0111\u01b0\u1ee3c ki\u1ec3m \u0111\u1ecbnh \u0111\u1ed9 ch\u00ednh x\u00e1c hay t\u00ednh ch\u00ednh h\u00e3ng.</p>`
            + (notes.length ? `<p>D\u1eef li\u1ec7u gi\u1ea3 l\u1eadp cho demo, c\u1ea7n x\u00e1c minh tr\u01b0\u1edbc khi b\u00e1n th\u1ef1c t\u1ebf: ${notes.join(', ')}.</p>` : '')
            + (identity.accessory ? `<p>Ph\u1ee5 ki\u1ec7n: dialDiameter v\u00e0 caseThickness = 0 ngh\u0129a l\u00e0 kh\u00f4ng \u00e1p d\u1ee5ng. K\u00edch th\u01b0\u1edbc l\u1eafp gh\u00e9p: ${escapeHtml(sizeText)}.</p>` : '');
        assign('description', description, 'derived', 'escaped source text and specifications, with demo disclosure');
        return { sourceId: source.id, product, fields, demoFields: notes, categoryKey };
    });
}

module.exports = { VERSION, CATEGORIES, norm, stableId, dimensions, identify, mapProducts };
