const modelPreviewProduct = require('../models/previewProduct.model');
const { OK, Created } = require('../core/success.response');
const modelProduct = require('../models/products.model');
const modelUser = require('../models/users.model');
class controllerPreviewProduct {
    async createPreviewProduct(req, res) {
        const { content, rating, productId } = req.body;
        const { id } = req.user;

        const previewProduct = await modelPreviewProduct.create({
            userId: id,
            productId,
            content,
            rating,
        });

        new Created({
            message: 'Tạo đánh giá sản phẩm thành công',
            statusCode: 201,
            metadata: previewProduct,
        }).send(res);
    }

    async getPreviewProductHome(req, res) {
        const previewProduct = await modelPreviewProduct.find({}).limit(10);

        const data = await Promise.all(
            previewProduct.map(async (item) => {
                const user = await modelUser.findById(item.userId);
                const product = await modelProduct.findById(item.productId);
                return {
                    ...item._doc,
                    user: {
                        name: user.fullName,
                    },
                    product: {
                        name: product.name,
                        image: product.images.split(',')[0],
                    },
                };
            }),
        );

        new OK({
            message: 'Lấy danh sách đánh giá sản phẩm thành công',
            statusCode: 200,
            metadata: data,
        }).send(res);
    }
}
module.exports = new controllerPreviewProduct();
