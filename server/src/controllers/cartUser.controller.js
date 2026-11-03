const modelCart = require('../models/cartUser.model');
const modelProduct = require('../models/products.model');
const modelCoupon = require('../models/coupon.model');
const mongoose = require('mongoose');
const { assertSale } = require('../services/product-data.service');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');

function calculateItemPrice(price, quantity, discount) {
    if (discount) {
        return Number(price * quantity - (price * quantity * discount) / 100);
    } else {
        return Number(price * quantity);
    }
}

async function quantityProduct(productId, quantity) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new BadRequestError('Số lượng sản phẩm không hợp lệ');
    }
    const findProduct = await modelProduct.findById(productId);
    if (!findProduct) {
        throw new BadRequestError('Sản phẩm không tồn tại');
    }
    assertSale(findProduct);
    if (quantity > findProduct.stock) {
        throw new BadRequestError('Số lượng sản phẩm không đủ');
    }
}

class controllerCartUser {
    async addToCart(req, res) {
        const { id } = req.user;
        const { productId, quantity } = req.body;

        if (!id || !productId) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin bắt buộc.');
        }

        // Tìm thông tin sản phẩm
        const findDataProduct = await modelProduct.findById(productId);
        if (!findDataProduct) {
            throw new BadRequestError('Sản phẩm không tồn tại');
        }

        // Hàm tính tổng giá

        // Tính giá cho sản phẩm hiện tại
        await quantityProduct(productId, quantity);
        const itemPrice = calculateItemPrice(findDataProduct?.price, quantity, findDataProduct.discount);

        // Tìm giỏ hàng của người dùng
        const findCartUser = await modelCart.findOne({ userId: id });

        if (findCartUser) {
            // Nếu đã có giỏ hàng
            const findProduct = findCartUser.product.find((item) => item.productId.toString() === productId);

            if (findProduct) {
                await quantityProduct(productId, findProduct.quantity + quantity);
                // Nếu sản phẩm đã có trong giỏ hàng, cập nhật số lượng
                findProduct.quantity += quantity;
            } else {
                // Nếu sản phẩm chưa có trong giỏ hàng, thêm mới
                findCartUser.product.push({ productId, quantity });
            }

            // Tính lại tổng giá của giỏ hàng
            let totalPrice = 0;

            // Lấy toàn bộ thông tin sản phẩm trong giỏ hàng
            const cartItems = await Promise.all(
                findCartUser.product.map(async (item) => {
                    const product = await modelProduct.findById(item.productId);
                    return {
                        item,
                        product,
                    };
                }),
            );

            // Tính tổng giá
            for (const { item, product } of cartItems) {
                totalPrice += calculateItemPrice(product?.price, item?.quantity, product?.discount);
            }

            findCartUser.totalPrice = totalPrice;
            await findCartUser.save();

            new OK({
                message: 'Thêm sản phẩm vào giỏ hàng thành công',
                statusCode: 200,
                metadata: findCartUser,
            }).send(res);
        } else {
            // Nếu chưa có giỏ hàng, tạo mới
            const cart = await modelCart.create({
                userId: id,
                product: [
                    {
                        productId,
                        quantity,
                    },
                ],
                totalPrice: itemPrice,
            });
            new Created({
                message: 'Thêm sản phẩm vào giỏ hàng thành công',
                statusCode: 201,
                metadata: cart,
            }).send(res);
        }
    }

    async getCart(req, res) {
        const { id } = req.user;
        const findCartUser = await modelCart.findOne({ userId: id });
        if (!findCartUser) {
            return new OK({
                message: 'Giỏ hàng trống',
                statusCode: 200,
                metadata: { cartItems: [], totalPrice: 0, dataCoupon: [] },
            }).send(res);
        }

        const cartItems = (
            await Promise.all(
                findCartUser.product.map(async (item) => {
                    if (!mongoose.isValidObjectId(item.productId)) return null;

                    const product = await modelProduct.findById(item.productId);
                    return product ? { item, product } : null;
                }),
            )
        ).filter(Boolean);
        const totalPrice = cartItems.reduce(
            (total, { item, product }) => total + calculateItemPrice(product.price, item.quantity, product.discount),
            0,
        );

        if (cartItems.length !== findCartUser.product.length || findCartUser.totalPrice !== totalPrice) {
            findCartUser.product = cartItems.map(({ item }) => item);
            findCartUser.totalPrice = totalPrice;
            await findCartUser.save();
        }

        const currentDate = new Date();
        const dataCoupon = await modelCoupon.find({
            minPrice: { $lte: totalPrice },
            quantity: { $gt: 0 },
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate },
        });
        new OK({
            message: 'Lấy giỏ hàng thành công',
            statusCode: 200,
            metadata: { cartId: findCartUser._id, cartItems, totalPrice, dataCoupon },
        }).send(res);
    }

    async deleteProductCart(req, res) {
        const { id } = req.user;
        const { productId } = req.body;

        const findCartUser = await modelCart.findOne({ userId: id });
        if (!findCartUser) {
            throw new BadRequestError('Giỏ hàng không tồn tại');
        }

        const findProduct = findCartUser.product.find((item) => item.productId.toString() === productId);
        if (!findProduct) {
            throw new BadRequestError('Sản phẩm không tồn tại trong giỏ hàng');
        }

        // Lấy thông tin sản phẩm để tính giá
        const productInfo = await modelProduct.findById(productId);
        if (!productInfo) {
            throw new BadRequestError('Không tìm thấy thông tin sản phẩm');
        }

        // Tính giá của sản phẩm cần xóa
        const itemPrice = calculateItemPrice(productInfo.price, findProduct.quantity, productInfo.discount);

        // Xóa sản phẩm khỏi giỏ hàng
        findCartUser.product = findCartUser.product.filter((item) => item.productId.toString() !== productId);
        // Cập nhật tổng giá
        findCartUser.totalPrice = findCartUser.totalPrice - itemPrice;
        await findCartUser.save();

        new OK({
            message: 'Xóa sản phẩm khỏi giỏ hàng thành công',
            statusCode: 200,
            metadata: findCartUser,
        }).send(res);
    }

    async updateProductCart(req, res) {
        const { id } = req.user;
        const { productId, quantity } = req.body;

        await quantityProduct(productId, quantity);

        const findCartUser = await modelCart.findOne({ userId: id });
        if (!findCartUser) {
            throw new BadRequestError('Giỏ hàng không tồn tại');
        }

        const findProduct = findCartUser.product.find((item) => item.productId.toString() === productId);
        if (!findProduct) {
            throw new BadRequestError('Sản phẩm không tồn tại trong giỏ hàng');
        }

        // Lấy thông tin sản phẩm để tính giá
        const productInfo = await modelProduct.findById(productId);
        if (!productInfo) {
            throw new BadRequestError('Không tìm thấy thông tin sản phẩm');
        }

        // Tính giá cũ của sản phẩm để trừ đi
        const oldItemPrice = calculateItemPrice(productInfo.price, findProduct.quantity, productInfo.discount);

        // Tính giá mới của sản phẩm sau khi cập nhật số lượng
        const newItemPrice = calculateItemPrice(productInfo.price, quantity, productInfo.discount);
        // Cập nhật số lượng và tổng giá
        findProduct.quantity = quantity;
        findCartUser.totalPrice = findCartUser.totalPrice - oldItemPrice + newItemPrice;
        await findCartUser.save();

        new OK({
            message: 'Cập nhật số lượng sản phẩm thành công',
            statusCode: 200,
            metadata: findCartUser,
        }).send(res);
    }

    async updateInfoCart(req, res) {
        const { id } = req.user;
        const { fullName, phone, address, note, nameCoupon } = req.body;

        const findCartUser = await modelCart.findOne({ userId: id });
        if (!findCartUser) {
            throw new BadRequestError('Giỏ hàng không tồn tại');
        }

        findCartUser.fullName = fullName;
        findCartUser.phone = phone;
        findCartUser.address = address;
        findCartUser.note = note;
        findCartUser.nameCoupon = nameCoupon;
        await findCartUser.save();

        new OK({
            message: 'Cập nhật thông tin giỏ hàng thành công',
            statusCode: 200,
            metadata: findCartUser,
        }).send(res);
    }
}

module.exports = new controllerCartUser();
