const Products = require('../models/products.model');
const Categories = require('../models/category.model');
const { BadRequestError } = require('../core/error.response');

const { visibleFilter, cardFields } = require('./product-data.service');

const PAGE_SIZE = 10;
const SORT = { createdAt: -1, _id: -1 };
const CARD_FIELDS = Object.fromEntries(cardFields.split(' ').map(field => [field, 1]));

function parsePage(value) {
    if (value === undefined) return 1;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
        throw new BadRequestError('Số trang không hợp lệ.', 400);
    }
    return Number(value);
}

function buildSections(snapshot) {
    const genders = new Map(snapshot.genderCounts.map(row => [row._id, row.total]));
    const sections = [{ key: 'new', label: 'S\u1ea3n ph\u1ea9m m\u1edbi', type: 'new', total: snapshot.latest.length }];
    for (const gender of ['Nam', 'N\u1eef']) {
        sections.push({ key: `gender:${gender}`, label: `\u0110\u1ed3ng h\u1ed3 ${gender}`, type: 'gender', value: gender, total: genders.get(gender) || 0 });
    }
    for (const row of [...snapshot.brandCounts].sort((a, b) => a._id.localeCompare(b._id, 'vi'))) {
        sections.push({ key: `brand:${row._id}`, label: row._id, type: 'brand', value: row._id, total: row.total });
    }
    return sections.map(section => ({ ...section,
        pages: section.type === 'new' ? 1 : Math.max(1, Math.ceil(section.total / PAGE_SIZE)),
    }));
}

async function latest() {
    const products = await Products.find({ ...visibleFilter, stock: { $gt: 0 } }).sort(SORT).limit(PAGE_SIZE).select(CARD_FIELDS).lean();
    return products.map(product => ({ ...product, isNew: true }));
}

async function catalog(query) {
    const requestedPage = parsePage(query.page);
    const type = query.type === undefined ? 'new' : query.type;
    if (!['new', 'gender', 'brand'].includes(type)) throw new BadRequestError('Nhóm sản phẩm không hợp lệ.', 400);
    if (type === 'new' && query.value !== undefined) throw new BadRequestError('Thông tin nhóm sản phẩm không hợp lệ.', 400);
    if (type === 'gender' && !['Nam', 'N\u1eef'].includes(query.value)) throw new BadRequestError('Giới tính không hợp lệ.', 400);
    if (type === 'brand' && (typeof query.value !== 'string' || !query.value.trim() || query.value.length > 100)) {
        throw new BadRequestError('Thương hiệu không hợp lệ.', 400);
    }
    const categories = await Categories.find({}).select('name').lean();
    const watchCategories = categories.filter(category => String(category.name).normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[\u0110\u0111]/g, 'd').toLowerCase().startsWith('dong ho'))
        .map(category => String(category._id));
    const watches = { ...visibleFilter, category: { $in: watchCategories } };
    if (type === 'new') {
        const [snapshot] = await Products.aggregate([{ $facet: {
            latest: [{ $match: { ...visibleFilter, stock: { $gt: 0 } } }, { $sort: SORT }, { $limit: PAGE_SIZE }, { $project: CARD_FIELDS }],
            genderCounts: [{ $match: { ...watches, gender: { $in: ['Nam', 'N\u1eef'] } } }, { $group: { _id: '$gender', total: { $sum: 1 } } }],
            brandCounts: [{ $match: { ...watches, brand: { $type: 'string', $nin: ['', 'Ch\u01b0a x\u00e1c minh'] } } },
                { $group: { _id: '$brand', total: { $sum: 1 } } }],
        } }]);
        const sections = buildSections(snapshot);
        return { items: snapshot.latest.map(product => ({ ...product, isNew: true })),
            page: 1, pageSize: PAGE_SIZE, totalPages: 1, total: snapshot.latest.length,
            section: sections[0], sections };
    }
    const filter = { ...watches, [type === 'gender' ? 'gender' : 'brand']: query.value };
    const total = await Products.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const items = await Products.find(filter).sort(SORT).skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE).select(CARD_FIELDS).lean();
    return { items, page, pageSize: PAGE_SIZE, totalPages, total,
        section: { key: `${type}:${query.value}`, label: type === 'gender' ? `\u0110\u1ed3ng h\u1ed3 ${query.value}` : query.value,
            type, value: query.value, total, pages: totalPages } };
}

module.exports = { PAGE_SIZE, parsePage, buildSections, latest, catalog };
