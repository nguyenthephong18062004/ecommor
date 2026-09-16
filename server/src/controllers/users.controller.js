const modelUser = require('../models/users.model');
const modelApiKey = require('../models/apiKey.model');

const modelProduct = require('../models/products.model');
const modelPayment = require('../models/payments.model');
const modelPreviewProduct = require('../models/previewProduct.model');
const modelOtp = require('../models/otp.model');

const sendMailForgotPassword = require('../utils/SendMail/sendMailForgotPassword');

const bcrypt = require('bcrypt');

const CryptoJS = require('crypto-js');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');

const { createApiKey, createRefreshToken, createToken, verifyToken } = require('../services/tokenSevices');

const { jwtDecode } = require('jwt-decode');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');

require('dotenv').config();

const getCookieOptions = (maxAge, { httpOnly = true, isLogged = false } = {}) => ({
    httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
    path: '/',
    maxAge,
    ...(isLogged ? {} : {}),
});

class controllerUser {
    async register(req, res) {
        const { fullName, email, password, phone, address } = req.body;

        if (!fullName || !email || !password || !phone) {
            throw new BadRequestError('Vui lòng nhập đày đủ thông tin');
        }
        const user = await modelUser.findOne({ email });
        if (user) {
            throw new BadRequestError('Người dùng đã tồn tại');
        } else {
            const saltRounds = 10;
            const salt = bcrypt.genSaltSync(saltRounds);
            const passwordHash = bcrypt.hashSync(password, salt);
            const newUser = await modelUser.create({
                fullName,
                email,
                password: passwordHash,
                typeLogin: 'email',
                address,
                phone,
            });
            await newUser.save();
            await createApiKey(newUser._id);
            const token = await createToken({ id: newUser._id });
            const refreshToken = await createRefreshToken({ id: newUser._id });
            res.cookie('token', token, getCookieOptions(15 * 60 * 1000, { httpOnly: true }));
            res.cookie('logged', 1, getCookieOptions(7 * 24 * 60 * 60 * 1000, { httpOnly: false }));
            res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000, { httpOnly: true }));
            new Created({ message: 'Đăng ký thành công', metadata: { token, refreshToken } }).send(res);
        }
    }

    async loginGoogle(req, res) {
        const { credential } = req.body;
        const dataToken = jwtDecode(credential);
        const user = await modelUser.findOne({ email: dataToken.email });
        if (user) {
            await createApiKey(user._id);
            const token = await createToken({ id: user._id });
            const refreshToken = await createRefreshToken({ id: user._id });
            res.cookie('token', token, getCookieOptions(15 * 60 * 1000, { httpOnly: true }));
            res.cookie('logged', 1, getCookieOptions(7 * 24 * 60 * 60 * 1000, { httpOnly: false }));
            res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000, { httpOnly: true }));
            new OK({ message: 'Đăng nhập thành công', metadata: { token, refreshToken } }).send(res);
        } else {
            const newUser = await modelUser.create({
                fullName: dataToken.name,
                email: dataToken.email,
                typeLogin: 'google',
            });
            await newUser.save();
            await createApiKey(newUser._id);
            const token = await createToken({ id: newUser._id });
            const refreshToken = await createRefreshToken({ id: newUser._id });
            res.cookie('token', token, getCookieOptions(15 * 60 * 1000, { httpOnly: true }));
            res.cookie('logged', 1, getCookieOptions(7 * 24 * 60 * 60 * 1000, { httpOnly: false }));
            res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000, { httpOnly: true }));
            new OK({ message: 'Đăng nhập thành công', metadata: { token, refreshToken } }).send(res);
        }
    }

    async login(req, res) {
        const { email, password } = req.body;
        const findUser = await modelUser.findOne({ email });
        if (!findUser) {
            throw new BadRequestError('Tài khoản hoặc mật khẩu không chính xác !!!');
        }

        if (findUser.typeLogin === 'google') {
            throw new BadRequestError('Vui lòng đăng nhập bằng Google');
        }

        const result = await bcrypt.compare(password, findUser.password);

        if (!result) {
            throw new BadRequestError('Tài khoản hoặc mật khẩu không chính xác !!!');
        }
        if (result) {
            await createApiKey(findUser._id);
            const token = await createToken({ id: findUser._id });
            const refreshToken = await createRefreshToken({ id: findUser._id });
            res.cookie('token', token, getCookieOptions(15 * 60 * 1000, { httpOnly: true }));
            res.cookie('logged', 1, getCookieOptions(7 * 24 * 60 * 60 * 1000, { httpOnly: false }));
            res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000, { httpOnly: true }));
            new OK({ message: 'Đăng nhập thành công', metadata: { token, refreshToken } }).send(res);
        }
    }

    async authUser(req, res) {
        const user = req.user;
        const findUser = await modelUser.findOne({ _id: user.id });
        if (!findUser) {
            throw new BadRequestError('Tài khoản hoặc mật khẩu không chính xác');
        }
        const userString = JSON.stringify(findUser);
        const auth = CryptoJS.AES.encrypt(userString, process.env.SECRET_CRYPTO).toString();
        new OK({ message: 'success', metadata: { auth } }).send(res);
    }

    async refreshToken(req, res) {
        const refreshToken = req.cookies.refreshToken;

        const decoded = await verifyToken(refreshToken);

        const user = await modelUser.findById(decoded.id);
        const token = await createToken({ id: user._id });
        res.cookie('token', token, getCookieOptions(15 * 60 * 1000, { httpOnly: true }));
        res.cookie('logged', 1, getCookieOptions(7 * 24 * 60 * 60 * 1000, { httpOnly: false }));

        new OK({ message: 'Refresh token thành công', metadata: { token } }).send(res);
    }

    async logout(req, res) {
        const { id } = req.user;
        await modelApiKey.deleteOne({ userId: id });
        res.clearCookie('token', { path: '/' });
        res.clearCookie('refreshToken', { path: '/' });
        res.clearCookie('logged', { path: '/' });

        new OK({ message: 'Đăng xuất thành công' }).send(res);
    }

    async updateUser(req, res) {
        const { id } = req.user;
        const { fullName, address, phone } = req.body;
        const user = await modelUser.findByIdAndUpdate(id, { fullName, address, phone }, { new: true });
        new OK({ message: 'Cập nhật thông tin thành công', metadata: user }).send(res);
    }

    async getStatistical(req, res) {
        try {
            // Get user statistics
            const users = await modelUser.aggregate([
                {
                    $facet: {
                        total: [{ $count: 'count' }],
                        byLoginType: [{ $group: { _id: '$loginType', count: { $sum: 1 } } }],
                    },
                },
            ]);

            // Get product statistics
            const products = await modelProduct.aggregate([
                {
                    $facet: {
                        total: [{ $count: 'count' }],
                        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
                        topSelling: [
                            { $sort: { soldCount: -1 } },
                            { $limit: 10 },
                            {
                                $project: {
                                    _id: 1,
                                    nameProduct: 1,
                                    price: 1,
                                    soldCount: 1,
                                },
                            },
                        ],
                    },
                },
            ]);

            // Get order statistics
            const orders = await modelPayment.aggregate([
                {
                    $facet: {
                        total: [{ $count: 'count' }],
                        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
                        byPaymentMethod: [{ $group: { _id: '$paymentMethod', count: { $sum: 1 } } }],
                    },
                },
            ]);

            // Get revenue statistics
            const revenue = await modelPayment.aggregate([
                { $match: { status: 'delivered' } }, // Count only completed orders
                {
                    $facet: {
                        total: [{ $group: { _id: null, total: { $sum: '$totalPrice' } } }],
                        byMonth: [
                            {
                                $group: {
                                    _id: { $month: '$createdAt' },
                                    revenue: { $sum: '$totalPrice' },
                                },
                            },
                            { $sort: { _id: 1 } },
                            { $project: { _id: 1, revenue: 1 } },
                        ],
                        last7Days: [
                            {
                                $match: {
                                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                                },
                            },
                            {
                                $group: {
                                    _id: {
                                        day: { $dayOfMonth: '$createdAt' },
                                        month: { $month: '$createdAt' },
                                    },
                                    revenue: { $sum: '$totalPrice' },
                                    count: { $sum: 1 },
                                },
                            },
                            {
                                $project: {
                                    _id: 0,
                                    day: { $concat: [{ $toString: '$_id.day' }, '/', { $toString: '$_id.month' }] },
                                    revenue: 1,
                                    count: 1,
                                },
                            },
                        ],
                    },
                },
            ]);

            // Get review statistics
            const reviews = await modelPreviewProduct.aggregate([
                {
                    $facet: {
                        total: [{ $count: 'count' }],
                        averageRating: [{ $group: { _id: null, avg: { $avg: '$rating' } } }],
                        bestRatedProducts: [
                            {
                                $group: {
                                    _id: '$product',
                                    averageRating: { $avg: '$rating' },
                                    reviewCount: { $sum: 1 },
                                },
                            },
                            { $sort: { averageRating: -1, reviewCount: -1 } },
                            { $limit: 10 },
                            {
                                $lookup: {
                                    from: 'products',
                                    localField: '_id',
                                    foreignField: '_id',
                                    as: 'productDetails',
                                },
                            },
                            { $unwind: '$productDetails' },
                            {
                                $project: {
                                    _id: 1,
                                    productDetails: { name: 1 },
                                    averageRating: 1,
                                    reviewCount: 1,
                                },
                            },
                        ],
                    },
                },
            ]);

            // Format response data
            const result = {
                users: {
                    total: users[0].total.length ? users[0].total[0].count : 0,
                    byLoginType: users[0].byLoginType,
                },
                products: {
                    total: products[0].total.length ? products[0].total[0].count : 0,
                    byCategory: products[0].byCategory,
                    topSelling: products[0].topSelling,
                },
                orders: {
                    total: orders[0].total.length ? orders[0].total[0].count : 0,
                    byStatus: orders[0].byStatus,
                    byPaymentMethod: orders[0].byPaymentMethod,
                },
                revenue: {
                    total: revenue[0].total.length ? revenue[0].total[0].total : 0,
                    byMonth: revenue[0].byMonth,
                    last7Days: revenue[0].last7Days,
                },
                reviews: {
                    total: reviews[0].total.length ? reviews[0].total[0].count : 0,
                    averageRating: reviews[0].averageRating.length ? reviews[0].averageRating[0].avg : 0,
                    bestRatedProducts: reviews[0].bestRatedProducts,
                },
            };

            return res.status(200).json({
                success: true,
                message: 'Lấy dữ liệu thống kê thành công',
                metadata: result,
            });
        } catch (error) {
            console.error('Error getting statistical data:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy dữ liệu thống kê',
                error: error.message,
            });
        }
    }

    async findAllUser(req, res) {
        const users = await modelUser.find();
        new OK({ message: 'Lấy tất cả người dùng thành công', metadata: users }).send(res);
    }

    async updateUserAdmin(req, res) {
        const { id, isAdminUser } = req.body;
        const findAdmin = await modelUser.findOne({ isAdmin: true });
        if (isAdminUser) {
            const user = await modelUser.findByIdAndUpdate(id, { isAdmin: true }, { new: true });
            new OK({ message: 'Cập nhật quyền thành công', metadata: user }).send(res);
        } else {
            const user = await modelUser.findByIdAndUpdate(id, { isAdmin: false }, { new: true });
            new OK({ message: 'Cập nhật quyền thành công', metadata: user }).send(res);
        }
    }

    async forgotPassword(req, res) {
        const { email } = req.body;
        if (!email) {
            throw new BadRequestError('Vui lòng nhập email');
        }

        const user = await modelUser.findOne({ email });
        if (!user) {
            throw new BadRequestError('Email không tồn tại');
        }

        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const otp = await otpGenerator.generate(6, {
            digits: true,
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false,
        });

        const saltRounds = 10;

        bcrypt.hash(otp, saltRounds, async function (err, hash) {
            if (err) {
                console.error('Error hashing OTP:', err);
            } else {
                await modelOtp.create({
                    email: user.email,
                    otp: hash,
                    type: 'forgotPassword',
                });
                await sendMailForgotPassword(email, otp);

                return res
                    .setHeader('Set-Cookie', [
                        `tokenResetPassword=${token};  Secure; Max-Age=300; Path=/; SameSite=Strict`,
                    ])
                    .status(200)
                    .json({ message: 'Gửi thành công !!!' });
            }
        });
    }

    async resetPassword(req, res) {
        const token = req.cookies.tokenResetPassword;
        const { otp, password } = req.body;

        if (!token) {
            throw new BadRequestError('Vui lòng gửi yêu cầu quên mật khẩu');
        }

        const decode = jwt.verify(token, process.env.JWT_SECRET);
        if (!decode) {
            throw new BadRequestError('Sai mã OTP hoặc đã hết hạn, vui lòng lấy OTP mới');
        }

        const findOTP = await modelOtp.findOne({ email: decode.email }).sort({ createdAt: -1 });
        if (!findOTP) {
            throw new BadRequestError('Sai mã OTP hoặc đã hết hạn, vui lòng lấy OTP mới');
        }

        // So sánh OTP
        const isMatch = await bcrypt.compare(otp, findOTP.otp);
        if (!isMatch) {
            throw new BadRequestError('Sai mã OTP hoặc đã hết hạn, vui lòng lấy OTP mới');
        }

        // Hash mật khẩu mới
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Tìm người dùng
        const findUser = await modelUser.findOne({ email: decode.email });
        if (!findUser) {
            throw new BadRequestError('Người dùng không tồn tại');
        }

        // Cập nhật mật khẩu mới
        findUser.password = hashedPassword;
        await findUser.save();

        // Xóa OTP sau khi đặt lại mật khẩu thành công
        await modelOtp.deleteOne({ email: decode.email });
        res.clearCookie('tokenResetPassword');
        return new OK({ message: 'Đặt lại mật khẩu thành công' }).send(res);
    }
}

module.exports = new controllerUser();
