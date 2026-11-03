const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Carts = require('../src/models/cartUser.model');
const Products = require('../src/models/products.model');
const Coupons = require('../src/models/coupon.model');
const controller = require('../src/controllers/cartUser.controller');

function response() {
    return {
        statusCode: undefined,
        body: undefined,
        status(statusCode) {
            this.statusCode = statusCode;
            return this;
        },
        json(body) {
            this.body = body;
            return body;
        },
    };
}

test('getCart removes malformed and deleted product entries before calculating totals', async () => {
    const originalFindOne = Carts.findOne;
    const originalFind = Coupons.find;
    const originalFindById = Products.findById;
    const existingId = new mongoose.Types.ObjectId();

    let saveCount = 0;
    const cart = {
        _id: new mongoose.Types.ObjectId(),
        totalPrice: 100000,
        product: [
            { productId: 'not-an-object-id', quantity: 1 },
            { productId: existingId, quantity: 1 },
            { productId: new mongoose.Types.ObjectId(), quantity: 1 },
        ],
        async save() {
            saveCount += 1;
        },
    };
    Carts.findOne = async () => cart;
    Coupons.find = async () => [];
    Products.findById = async (productId) => {
        if (String(productId) === 'not-an-object-id') {
            throw new mongoose.Error.CastError('ObjectId', productId, 'productId');
        }
        if (String(productId) === String(existingId)) return null;
        return { price: 100000, discount: 10 };
    };

    try {
        const res = response();
        await controller.getCart({ user: { id: 'user-1' } }, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.metadata.cartItems.length, 1);
        assert.equal(res.body.metadata.totalPrice, 90000);
        assert.equal(cart.product.length, 1);
        assert.equal(cart.totalPrice, 90000);
        assert.equal(saveCount, 1);
    } finally {
        Carts.findOne = originalFindOne;
        Coupons.find = originalFind;
        Products.findById = originalFindById;
    }
});
