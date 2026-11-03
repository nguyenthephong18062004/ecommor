const modelProduct = require('../models/products.model');
const modelCategory = require('../models/category.model');
const productCatalog = require('../services/product-catalog.service');
const catalogBrowse = require('../services/catalog-browse.service');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');

const mongoose = require('mongoose');
const { productInput, validateVerification, visibleFilter, cardFields, searchable, searchFilter } = require('../services/product-data.service');
const { richText } = require('../utils/richText');
const clean = product => ({ ...product, description: richText(product.description) });

class controllerProducts {
    async uploadImages(req, res) {}

    async createProduct(req, res) {
        const data = productInput(req.body, true);
        data.description = richText(data.description);
        data.searchText = searchable(data);
        validateVerification(data);
        const product = await modelProduct.create(data);

        new Created({
            message: 'Tạo sản phẩm thành công',
            statusCode: 201,
            metadata: product,
        }).send(res);
    }

    async getProductNew(req, res) {
        new OK({
            message: 'Lấy 10 sản phẩm mới nhất còn hàng',
            statusCode: 200,
            metadata: await productCatalog.latest(),
        }).send(res);
    }

    async getProductCatalog(req, res) {
        new OK({
            message: 'Lấy danh sách sản phẩm theo trang',
            metadata: await productCatalog.catalog(req.query),
        }).send(res);
    }

    async getCatalogOptions(req, res) {
        new OK({ message: 'Danh mục và thương hiệu', metadata: await catalogBrowse.options() }).send(res);
    }

    async browseProducts(req, res) {
        new OK({ message: 'Danh sách sản phẩm', metadata: await catalogBrowse.browse(req.query) }).send(res);
    }

    async getProductById(req, res) {
        const { id } = req.query;
        if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Mã sản phẩm không hợp lệ.', 400);
        const product = await modelProduct.findOne({ _id: id, ...visibleFilter }).lean();
        if (!product) throw new BadRequestError('Không tìm thấy sản phẩm.', 404);
        const relatedProducts = await modelProduct.find({ category: product.category, _id: { $ne: id }, ...visibleFilter })
            .sort({ createdAt: -1, _id: -1 }).limit(8).select(cardFields).lean();
        new OK({ message: 'Thông tin sản phẩm', metadata: { product: clean(product), relatedProducts } }).send(res);
    }

    async getProductByCategory(req, res) {
        const { category, price, discount } = req.query;

        let query = { category, ...visibleFilter };

        if (category === 'all') {
            query = { ...visibleFilter };
        }

        // Add discount filter
        if (discount && discount !== '0') {
            const discountValue = parseInt(discount) * 10; // Convert to percentage (1 -> 10%, 2 -> 20%, etc.)
            query.discount = discountValue;
        }

        // Get all products matching the category and discount filter
        let products = await modelProduct.find(query);

        // Apply price filter on actual price (after discount)
        if (price && price !== '0') {
            products = products.filter((product) => {
                const discountPercentage = product.discount || 0;
                const actualPrice = product.price * (1 - discountPercentage / 100);

                switch (price) {
                    case '1': // Dưới 500.000 VNĐ
                        return actualPrice < 500000;
                    case '2': // Từ 500.000 VNĐ - 1.000.000 VNĐ
                        return actualPrice >= 500000 && actualPrice <= 1000000;
                    case '3': // Từ 1.000.000 VNĐ - 2.000.000 VNĐ
                        return actualPrice >= 1000000 && actualPrice <= 2000000;
                    case '5': // Trên 5.000.000 VNĐ
                        return actualPrice > 5000000;
                    default:
                        return true;
                }
            });
        }

        new OK({
            message: 'Lấy sản phẩm thành công',
            statusCode: 200,
            metadata: products.map(product => clean(product.toObject())),
        }).send(res);
    }

    async getAllProduct(req, res) {
        const [products, categories] = await Promise.all([modelProduct.find().lean(), modelCategory.find().lean()]);
        const names = new Map(categories.map(category => [String(category._id), category.name]));
        new OK({ message: 'Danh sách sản phẩm', metadata: products.map(product => ({ ...clean(product),
            categoryId: product.category, category: names.get(String(product.category)) || 'Chưa phân loại' })) }).send(res);
    }

    async updateProduct(req, res) {
        const { id } = req.body;
        if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Mã sản phẩm không hợp lệ.', 400);
        const current = await modelProduct.findById(id).lean();
        if (!current) throw new BadRequestError('Không tìm thấy sản phẩm.', 404);
        const data = productInput(req.body);
        if (Object.hasOwn(data, 'description')) data.description = richText(data.description);
        data.searchText = searchable({ ...current, ...data });
        validateVerification({ ...current, ...data });
        const product = await modelProduct.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
        new OK({
            message: 'Cập nhật sản phẩm thành công',
            statusCode: 200,
            metadata: product,
        }).send(res);
    }

    async deleteProduct(req, res) {
        const { id } = req.query;
        const product = await modelProduct.findByIdAndDelete(id);
        if (!product) {
            throw new BadRequestError('Sản phẩm không tồn tại');
        }
        new OK({
            message: 'Xóa sản phẩm thành công',
            statusCode: 200,
            metadata: product,
        }).send(res);
    }

    async getProductManufactured(req, res) {
        const product = await modelProduct.find({ discount: { $gte: 10 }, ...visibleFilter }).select(cardFields).limit(20);
        new OK({
            message: 'Lấy sản phẩm sản xuất thành công',
            statusCode: 200,
            metadata: product,
        }).send(res);
    }

    async searchProduct(req, res, next) {
        const valueSearch = req.query.valueSearch;
        if (typeof valueSearch !== 'string' || !valueSearch.trim() || valueSearch.length > 100) {
            throw new BadRequestError('Từ khóa tìm kiếm không hợp lệ.', 400);
        }
        const data = await modelProduct.find({ ...visibleFilter, ...searchFilter(valueSearch.trim()) })
            .select(cardFields).sort({ createdAt: -1, _id: -1 }).limit(8).lean();
        new OK({ message: 'Kết quả tìm kiếm', metadata: data }).send(res);
    }
}

module.exports = new controllerProducts();
