const Products = require('../models/products.model');
const Categories = require('../models/category.model');
const brandService = require('./brand.service');
const { BadRequestError } = require('../core/error.response');
const { parsePage } = require('./product-catalog.service');
const { visibleFilter, cardFields, searchFilter, canPreorder } = require('./product-data.service');

const PAGE_SIZE = 20;
const SALE_PRICE = { $floor: { $add: [{ $multiply: ['$price', { $subtract: [1, { $divide: [{ $ifNull: ['$discount', 0] }, 100] }] }] }, 0.5] } };
const SORTS = { newest: { createdAt: -1, _id: -1 }, popular: { soldCount: -1, _id: -1 },
    discount: { discount: -1, _id: -1 }, priceAsc: { salePrice: 1, _id: 1 }, priceDesc: { salePrice: -1, _id: -1 } };
const facets = ['collection', 'gender', 'movement', 'strapMaterial', 'faceColor'];
const fail = message => { throw new BadRequestError(message, 400); };

function optionalText(value, label, max = 100) {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${label} không hợp lệ.`);
    return value.trim();
}

function bound(value, label) {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value) || !Number.isFinite(Number(value)) || Number(value) > Number.MAX_SAFE_INTEGER / 100) fail(`${label} không hợp lệ.`);
    return Number(value);
}

async function options() {
    const [categories, brands, priceRange, ...values] = await Promise.all([
        Categories.find({}).select('name').sort({ name: 1 }).lean(), brandService.list(),
        Products.aggregate([{ $match: visibleFilter }, { $group: { _id: null, max: { $max: SALE_PRICE } } }]),
        ...facets.map(field => Products.distinct(field, visibleFilter)),
    ]);
    return { categories, brands: brands.map(brand => brand.name), brandDetails: brands,
        priceMax: Math.ceil((priceRange[0]?.max || 0) / 1000) * 1000,
        ...Object.fromEntries(facets.map((field, index) => [field, values[index]
            .filter(value => typeof value === 'string' && value.trim() && value.length <= 100)
            .sort((a, b) => a.localeCompare(b, 'vi')).slice(0, 200)])) };
}

function buildFilter(query = {}) {
    const filter = { ...visibleFilter };
    const category = optionalText(query.category, 'Danh mục');
    const brand = optionalText(query.brand, 'Thương hiệu');
    const search = optionalText(query.search, 'Từ khóa');
    if (category && category !== 'all') filter.category = category;
    if (brand) filter.brand = brand;
    for (const key of facets) {
        const value = optionalText(query[key], 'Thông số bộ lọc');
        if (value) filter[key] = value;
    }
    const stock = query.stock ?? 'all';
    if (!['all', 'in', 'order'].includes(stock)) fail('Tình trạng hàng không hợp lệ.');
    if (stock === 'in') filter.stock = { $gt: 0 };
    if (stock === 'order') Object.assign(filter, { stock: { $lte: 0 }, allowPreorder: true, publicationStatus: 'published' });
    if (search) Object.assign(filter, searchFilter(search));
    if (query.ids !== undefined) {
        if (typeof query.ids !== 'string') fail('Danh sách sản phẩm không hợp lệ.');
        const ids = query.ids.split(',');
        if (!ids.length || ids.length > 20 || ids.some(id => !/^[a-f\d]{24}$/i.test(id))) fail('Danh sách sản phẩm không hợp lệ.');
        filter._id = { $in: ids };
    }
    for (const [minKey, maxKey, field] of [['minPrice', 'maxPrice', SALE_PRICE], ['minDiameter', 'maxDiameter', '$dialDiameter']]) {
        const min = bound(query[minKey], 'Giới hạn nhỏ nhất');
        const max = bound(query[maxKey], 'Giới hạn lớn nhất');
        if (min !== undefined && max !== undefined && min > max) fail('Khoảng lọc không hợp lệ.');
        const checks = [];
        if (min !== undefined) checks.push({ $gte: [field, min] });
        if (max !== undefined) checks.push({ $lte: [field, max] });
        if (checks.length) (filter.$expr ||= { $and: [] }).$and.push(...checks);
    }
    return filter;
}

async function browse(query = {}) {
    const requestedPage = parsePage(query.page);
    const filter = buildFilter(query);
    const sort = query.sort ?? 'newest';
    if (typeof sort !== 'string' || !Object.hasOwn(SORTS, sort)) fail('Cách sắp xếp không hợp lệ.');
    const total = await Products.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * PAGE_SIZE;
    const selected = query.ids ? `${cardFields} origin glassMaterial powerReserve warrantyGlobal caseThickness bezelMaterial waterResistance boxPapers` : cardFields;
    const items = sort.startsWith('price') ? await Products.aggregate([
        { $match: filter }, { $set: { salePrice: SALE_PRICE } }, { $sort: SORTS[sort] },
        { $skip: offset }, { $limit: PAGE_SIZE },
        { $project: Object.fromEntries(selected.split(' ').map(field => [field, 1])) },
    ]) : await Products.find(filter).sort(SORTS[sort]).skip(offset).limit(PAGE_SIZE).select(selected).lean();
    return { items: items.map(item => ({ ...item, canPreorder: canPreorder(item) })), total, page, pageSize: PAGE_SIZE, totalPages };
}

module.exports = { PAGE_SIZE, options, browse, buildFilter, SALE_PRICE };
