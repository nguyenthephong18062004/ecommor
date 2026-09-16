const express = require('express');
const router = express.Router();

const messageController = require('../controllers/message.controller');

const { asyncHandler, authUser, authAdmin } = require('../auth/checkAuth');

router.post('/create', authUser, asyncHandler(messageController.createMessage));
router.post('/create-admin', authAdmin, asyncHandler(messageController.createMessageAdmin));

router.get('/all', authAdmin, asyncHandler(messageController.getAllUserMessage));
router.get('/get-message', authAdmin, asyncHandler(messageController.getMessage));
router.get('/get-message-user', authUser, asyncHandler(messageController.getMessageUser));
router.get('/read-message', authUser, asyncHandler(messageController.readMessage));

module.exports = router;
