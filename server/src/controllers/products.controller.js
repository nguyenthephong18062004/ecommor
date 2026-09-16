const modelProduct = require('../models/products.model');
const modelCategory = require('../models/category.model');
const modelPreviewProduct = require('../models/previewProduct.model');
const modelUser = require('../models/users.model');
const modelCoupon = require('../models/coupon.model');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');

const dayjs = require('dayjs');

class controllerProducts {
    async uploadImages(req, res) {}

    async createProduct(req, res) {
        const {
            nameProduct,
            modelNumber,
            brand,
            collection,
            origin,
            gender,
            glassMaterial,
            category,
            movement,
            powerReserve,
            warrantyGlobal,
            dialDiameter,
            caseThickness,
            bezelMaterial,
            strapMaterial,
            faceColor,
            waterResistance,
            price,
            discount,
            description = '1234',
            images,
            stock,
        } = req.body;

        // Kiểm tra các trường bắt buộc
        if (
            !nameProduct ||
            !modelNumber ||
            !brand ||
            !origin ||
            !gender ||
            !glassMaterial ||
            !movement ||
            !dialDiameter ||
            !strapMaterial ||
            !waterResistance ||
            !price ||
            !description ||
            !images ||
            !stock
        ) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin bắt buộc');
        }

        const product = await modelProduct.create({
            nameProduct,
            modelNumber,
            brand,
            category,
            collection,
            origin,
            gender,
            glassMaterial,
            movement,
            powerReserve,
            warrantyGlobal,
            dialDiameter,
            caseThickness,
            bezelMaterial,
            strapMaterial,
            faceColor,
            waterResistance,
            price,
            discount,
            description,
            images,
            stock,
        });

        new Created({
            message: 'Tạo sản phẩm thành công',
            statusCode: 201,
            metadata: product,
        }).send(res);
    }

    async getProductNew(req, res) {
        // Lấy sản phẩm tạo trong 3 ngày trước

        const product = await modelProduct.find({});

        const data = product.map((p) => ({
            ...p.toObject(),
            isNew: true,
        }));

        new OK({
            message: 'Lấy sản phẩm tạo trong 3 ngày gần đây',
            statusCode: 200,
            metadata: data,
        }).send(res);
    }

    async getProductById(req, res) {
        const { id } = req.query;
        const product = await modelProduct.findById(id);
        const relatedProducts = await modelProduct.find({
            category: product.category,
            _id: { $ne: id },
        });

        const previewProduct = await modelPreviewProduct.find({ productId: id });
        const dataPreviewProduct = await Promise.all(
            previewProduct.map(async (item) => {
                const user = await modelUser.findById(item.userId);
                return { ...item.toObject(), user: user.fullName };
            }),
        );
        new OK({
            message: 'Lấy sản phẩm thành công',
            statusCode: 200,
            metadata: { product, relatedProducts, previewProduct: dataPreviewProduct },
        }).send(res);
    }

    async getProductByCategory(req, res) {
        const { category, price, discount } = req.query;

        let query = { category };

        if (category === 'all') {
            query = {};
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
            metadata: products,
        }).send(res);
    }

    async getAllProduct(req, res) {
        const products = await modelProduct.find();
        const data = await Promise.all(
            products.map(async (product) => {
                const category = await modelCategory.findById(product.category);
                return { ...product.toObject(), category: category.name, categoryId: category._id };
            }),
        );
        new OK({
            message: 'Lấy tất cả sản phẩm thành công',
            statusCode: 200,
            metadata: data,
        }).send(res);
    }

    async updateProduct(req, res) {
        const { id, name, price, discount, description, category, size, stock, images } = req.body;
        const product = await modelProduct.findByIdAndUpdate(
            id,
            { name, price, discount, description, category, size, stock, images },
            { new: true },
        );
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
        const product = await modelProduct.find({ discount: { $gte: 10 } });
        new OK({
            message: 'Lấy sản phẩm sản xuất thành công',
            statusCode: 200,
            metadata: product,
        }).send(res);
    }

    async searchProduct(req, res, next) {
        const { valueSearch } = req.query;

        const data = await modelProduct.find({
            nameProduct: { $regex: valueSearch, $options: 'i' }, // Thêm $options: "i"
        });

        new OK({
            message: 'Lấy sản phẩm tìm kiếm',
            statusCode: 200,
            metadata: data,
        }).send(res);
    }
}

module.exports = new controllerProducts();
