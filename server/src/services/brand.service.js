const Brands = require('../models/brand.model');
const Products = require('../models/products.model');
const { BadRequestError } = require('../core/error.response');
const { visibleFilter, normalizeSearch } = require('./product-data.service');

async function list() {
    const [saved, counts] = await Promise.all([
        Brands.find().select('name description logo').lean(),
        Products.aggregate([{ $match: { ...visibleFilter, brand: { $type: 'string', $ne: '' } } },
            { $group: { _id: '$brand', productCount: { $sum: 1 } } }]),
    ]);
    const names = new Map(saved.map(brand => [brand.name.toLocaleLowerCase('vi'), {
        name: brand.name, description: brand.description, logo: brand.logo, productCount: 0,
    }]));
    for (const { _id, productCount } of counts) {
        const key = _id.trim().toLocaleLowerCase('vi');
        if (!key) continue;
        const current = names.get(key);
        if (current) current.productCount += productCount;
        else names.set(key, { name: _id, productCount });
    }
    return [...names.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

async function update(name, input = {}) {
    if (typeof name !== 'string' || !name.trim() || name.length > 100 ||
        typeof input.description !== 'string' || input.description.length > 3000 ||
        typeof input.logo !== 'string' || input.logo.length > 1000 ||
        (input.logo && !/^https?:\/\/[^\s]+$/i.test(input.logo))) {
        throw new BadRequestError('Thông tin thương hiệu không hợp lệ.', 400);
    }
    return Brands.findOneAndUpdate({ key: normalizeSearch(name).replace(/\s+/g, '-') },
        { $set: { name: name.trim(), description: input.description.trim(), logo: input.logo.trim() } },
        { upsert: true, new: true, runValidators: true });
}

module.exports = { list, update };
