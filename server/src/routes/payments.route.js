const express = require('express');
const router = express.Router();

const controllerPayments = require('../controllers/payments.controller');

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');
router.post('/api/create-payment', authUser, asyncHandler(controllerPayments.createPayment));
router.get('/api/check-payment-vnpay', asyncHandler(controllerPayments.checkPaymentVnpay));
router.get('/api/vnpay-return', asyncHandler(controllerPayments.checkPaymentVnpay));
router.get('/api/vnpay-ipn', controllerPayments.ipnVnpay);
router.post('/api/retry-payment-vnpay', authUser, asyncHandler(controllerPayments.retryVnpay));
router.post('/api/reconcile-payment-vnpay', authUser, asyncHandler(controllerPayments.reconcileVnpay));
router.get('/api/check-payment-momo', asyncHandler(controllerPayments.checkPaymentMomo));
router.get('/api/get-payment-success', authUser, asyncHandler(controllerPayments.getPaymentSuccess));
router.get('/api/get-order-user', authUser, asyncHandler(controllerPayments.getOrderUser));
router.post('/api/cancel-order', authUser, asyncHandler(controllerPayments.cancelOrder));
router.get('/api/get-order-admin', authAdmin, asyncHandler(controllerPayments.getOrderAdmin));
router.post('/api/update-order-status', authAdmin, asyncHandler(controllerPayments.updateOrderStatus));
module.exports = router;
