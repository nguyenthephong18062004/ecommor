const express = require('express');
const router = express.Router();

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');

const controllerUser = require('../controllers/users.controller');

router.post('/api/register', asyncHandler(controllerUser.register));
router.post('/api/login', asyncHandler(controllerUser.login));
router.get('/api/auth', authUser, asyncHandler(controllerUser.authUser));
router.get('/api/refresh-token', asyncHandler(controllerUser.refreshToken));
router.get('/api/logout', authUser, asyncHandler(controllerUser.logout));
router.post('/api/login-google', asyncHandler(controllerUser.loginGoogle));
router.post('/api/update-user', authUser, asyncHandler(controllerUser.updateUser));

router.post('/api/forgot-password', asyncHandler(controllerUser.forgotPassword));
router.post('/api/reset-password', asyncHandler(controllerUser.resetPassword));

router.get('/api/statistical', authAdmin, asyncHandler(controllerUser.getStatistical));
router.get('/api/users', authAdmin, asyncHandler(controllerUser.findAllUser));
router.post('/api/update-user-admin', authAdmin, asyncHandler(controllerUser.updateUserAdmin));

router.get('/admin', authUser, authAdmin, (req, res) => {
    return res.status(200).json({ message: true });
});

module.exports = router;
