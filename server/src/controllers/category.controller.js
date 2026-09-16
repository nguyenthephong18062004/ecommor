const modelCategory = require('../models/category.model');
const modelProduct = require('../models/products.model');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');

class controllerCategory {
    async createCategory(req, res) {
        const { name } = req.body;
        if (!name) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }
        const category = await modelCategory.create({ name });
        new Created({
            message: 'Tạo danh mục thành công',
            statusCode: 201,
            metadata: category,
        }).send(res);
    }

    async getAllCategory(req, res) {
        const category = await modelCategory.find();
        new OK({
            message: 'Lấy danh mục thành công',
            statusCode: 200,
            metadata: category,
        }).send(res);
    }

    async updateCategory(req, res) {
        const { id, name } = req.body;
        const category = await modelCategory.findByIdAndUpdate(id, { name }, { new: true });
        new OK({
            message: 'Cập nhật danh mục thành công',
            statusCode: 200,
            metadata: category,
        }).send(res);
    }

    async deleteCategory(req, res) {
        const { id } = req.query;
        const category = await modelCategory.findByIdAndDelete(id);
        if (!category) {
            throw new NotFoundError('Danh mục không tồn tại');
        }

        await modelProduct.deleteMany({ category: id });

        new OK({
            message: 'Xóa danh mục thành công',
            statusCode: 200,
            metadata: category,
        }).send(res);
    }
}

module.exports = new controllerCategory();
