const modelBlog = require('../models/blog.model');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');

class BlogController {
    async uploadImage(req, res, next) {
        const { file } = req;

        if (!file) {
            return next(new BadRequestError('Không có file'));
        }
        const image = `/uploads/blogs/${file.filename}`;
        new OK({
            message: 'Tải lên ảnh thành công',
            metadata: image,
        }).send(res);
    }

    async createBlog(req, res, next) {
        const { title, content, image } = req.body;
        const blog = await modelBlog.create({ title, content, image });
        new Created({
            message: 'Tạo bài viết thành công',
            metadata: blog,
        }).send(res);
    }

    async getAllBlog(req, res, next) {
        const blogs = await modelBlog.find();
        new OK({
            message: 'Lấy tất cả bài viết thành công',
            metadata: blogs,
        }).send(res);
    }

    async updateBlog(req, res, next) {
        const { title, content, image, id } = req.body;
        const findBlog = await modelBlog.findById(id);
        if (!findBlog) {
            return next(new NotFoundError('Bài viết không tồn tại'));
        }
        const blog = await modelBlog.findByIdAndUpdate(id, { title, content, image });
        new OK({
            message: 'Cập nhật bài viết thành công',
            metadata: blog,
        }).send(res);
    }

    async deleteBlog(req, res, next) {
        const { id } = req.body;
        await modelBlog.findByIdAndDelete(id);
        new OK({
            message: 'Xóa bài viết thành công',
        }).send(res);
    }

    async getBlogById(req, res, next) {
        const { id } = req.query;
        const blog = await modelBlog.findById(id);
        new OK({
            message: 'Lấy bài viết thành công',
            metadata: blog,
        }).send(res);
    }
}

module.exports = new BlogController();
