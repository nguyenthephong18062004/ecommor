const routesUser = require('../routes/users.routes');
const routesCategory = require('../routes/category.routes');
const routesProducts = require('../routes/products.routes');
const routesCartUser = require('../routes/cartUser.routes');
const routesPayments = require('../routes/payments.route');
const routesPreviewProduct = require('../routes/previewProduct.routes');
const routesCoupon = require('../routes/coupon.routes');
const routesMessage = require('../routes/message.routes');
const routesBlog = require('../routes/blog.routes');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'src/uploads/products');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

var upload = multer({ storage: storage });

function routes(app) {
    app.post('/api/register', routesUser);
    app.post('/api/login', routesUser);
    app.get('/api/auth', routesUser);
    app.get('/api/refresh-token', routesUser);
    app.get('/api/users', routesUser);
    app.post('/api/login-google', routesUser);
    app.get('/api/logout', routesUser);
    app.post('/api/update-user', routesUser);
    app.get('/api/statistical', routesUser);
    app.get('/api/users', routesUser);
    app.post('/api/update-user-admin', routesUser);

    app.post('/api/forgot-password', routesUser);
    app.post('/api/reset-password', routesUser);

    /// category
    app.post('/api/create-category', routesCategory);
    app.get('/api/get-all-category', routesCategory);
    app.post('/api/update-category', routesCategory);
    app.delete('/api/delete-category', routesCategory);
    /// product
    app.post('/api/create-product', routesProducts);
    app.get('/api/get-product-new', routesProducts);
    app.get('/api/get-product-by-id', routesProducts);
    app.get('/api/get-product-by-category', routesProducts);
    app.get('/api/get-all-product', routesProducts);
    app.post('/api/update-product', routesProducts);
    app.delete('/api/delete-product', routesProducts);
    app.get('/api/get-product-manufactured', routesProducts);
    app.get('/api/search', routesProducts);

    /// cart user
    app.post('/api/create-cart', routesCartUser);
    app.get('/api/get-cart', routesCartUser);
    app.post('/api/delete-product-cart', routesCartUser);
    app.post('/api/update-product-cart', routesCartUser);
    app.post('/api/update-info-cart', routesCartUser);

    /// payment
    app.post('/api/create-payment', routesPayments);
    app.get('/api/check-payment-vnpay', routesPayments);
    app.get('/api/check-payment-momo', routesPayments);
    app.get('/api/get-payment-success', routesPayments);
    app.get('/api/get-order-user', routesPayments);
    app.post('/api/cancel-order', routesPayments);
    app.get('/api/get-order-admin', routesPayments);
    app.post('/api/update-order-status', routesPayments);

    ///// preview product
    app.post('/api/create-preview-product', routesPreviewProduct);
    app.get('/api/get-preview-product-home', routesPreviewProduct);

    /// coupon
    app.post('/api/create-coupon', routesCoupon);
    app.get('/api/coupon', routesCoupon);
    app.get('/api/coupons', routesCoupon);
    app.delete('/api/delete-coupon', routesCoupon);
    app.post('/api/update-coupon', routesCoupon);

    /// blog
    app.use('/api/blog', routesBlog);

    app.use('/api/message', routesMessage);

    app.post('/api/upload-image', upload.array('images'), (req, res) => {
        const file = req.files;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const images = file.map((file) => {
            return `/uploads/products/${file.filename}`;
        });
        res.json({
            message: 'Uploaded successfully',
            images,
        });
    });

    app.get('/admin', routesUser);
}

module.exports = routes;
