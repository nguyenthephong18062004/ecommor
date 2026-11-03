const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');

const controllerUser = require('../controllers/users.controller');

const otpMessage = { message: 'Bạn đã gửi nhiều yêu cầu xác minh. Vui lòng thử lại sau.' };
const otpSendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: otpMessage });
const otpVerifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-7', legacyHeaders: false, message: otpMessage });

router.post('/api/register', otpSendLimiter, asyncHandler(controllerUser.register.bind(controllerUser)));
router.post('/api/verify-email', otpVerifyLimiter, asyncHandler(controllerUser.verifyEmail));
router.post('/api/resend-verification', otpSendLimiter, asyncHandler(controllerUser.resendVerification));
router.post('/api/login', asyncHandler(controllerUser.login));
router.get('/api/auth', authUser, asyncHandler(controllerUser.authUser));
router.get('/api/refresh-token', asyncHandler(controllerUser.refreshToken));
router.get('/api/logout', asyncHandler(controllerUser.logout));
router.post('/api/login-google', asyncHandler(controllerUser.loginGoogle));
router.post('/api/update-user', authUser, asyncHandler(controllerUser.updateUser));

router.post('/api/forgot-password', otpSendLimiter, asyncHandler(controllerUser.forgotPassword.bind(controllerUser)));
router.post('/api/verify-reset-password', otpVerifyLimiter, asyncHandler(controllerUser.verifyPasswordReset));
router.post('/api/reset-password', asyncHandler(controllerUser.resetPassword.bind(controllerUser)));

router.get('/api/statistical', authAdmin, asyncHandler(controllerUser.getStatistical));
router.get('/api/users', authAdmin, asyncHandler(controllerUser.findAllUser));
router.post('/api/update-user-admin', authAdmin, asyncHandler(controllerUser.updateUserAdmin));

router.get('/api/admin', authUser, authAdmin, (req, res) => {
    return res.status(200).json({ message: true });
});

module.exports = router;
