const modelUser = require('../models/users.model');
const modelMessage = require('../models/message.model');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');
const { getIO, connectedUsers } = require('../socket');

const mongoose = require('mongoose');

function getConversationId(userA, userB) {
    return [userA.toString(), userB.toString()].sort().join('_');
}

class MessageController {
    async createMessage(req, res) {
        const findAdmin = await modelUser.findOne({ isAdmin: true });
        const { id } = req.user;
        const { text } = req.body;
        const newMessage = await modelMessage.create({
            senderId: id,
            receiverId: findAdmin.id,
            conversationId: getConversationId(id, findAdmin.id),
            text,
        });

        const io = getIO();

        const receiverSocketId = connectedUsers.get(findAdmin._id.toString());

        if (receiverSocketId) {
            io.to(receiverSocketId).emit('newMessage', newMessage);
        } else {
            console.log('Admin chưa online hoặc chưa kết nối socket');
        }

        new Created({
            message: 'Tạo tin nhắn thành công',
            metadata: newMessage,
        }).send(res);
    }

    async createMessageAdmin(req, res) {
        const { id } = req.user;
        const { receiverId, text } = req.body;
        const newMessage = await modelMessage.create({
            senderId: id,
            receiverId,
            conversationId: getConversationId(id, receiverId),
            text,
        });

        const io = getIO();

        const receiverSocketId = connectedUsers.get(receiverId.toString());

        if (receiverSocketId) {
            io.to(receiverSocketId).emit('newMessageUser', newMessage);
        } else {
            console.log('Admin chưa online hoặc chưa kết nối socket');
        }

        new Created({
            message: 'Tạo tin nhắn thành công',
            metadata: newMessage,
        }).send(res);
    }

    async getAllUserMessage(req, res) {
        const { id } = req.user;

        const result = await modelMessage.aggregate([
            {
                $match: {
                    receiverId: new mongoose.Types.ObjectId(id),
                },
            },
            {
                $sort: { createdAt: 1 }, // để dùng $last trong $group đúng
            },
            {
                $group: {
                    _id: '$senderId',
                    latestMessage: { $last: '$$ROOT' },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'senderInfo',
                },
            },
            {
                $unwind: '$senderInfo',
            },
            // Lookup số lượng tin chưa đọc từ sender đó
            {
                $lookup: {
                    from: 'messages',
                    let: { senderId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$senderId', '$$senderId'] },
                                        { $eq: ['$receiverId', new mongoose.Types.ObjectId(id)] },
                                        { $eq: ['$isRead', false] },
                                    ],
                                },
                            },
                        },
                        {
                            $count: 'unreadCount',
                        },
                    ],
                    as: 'unreadMessages',
                },
            },
            {
                $addFields: {
                    unreadMessage: {
                        $cond: [
                            { $gt: [{ $size: '$unreadMessages' }, 0] },
                            { $arrayElemAt: ['$unreadMessages.unreadCount', 0] },
                            0,
                        ],
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    senderId: '$_id',
                    email: '$senderInfo.email',
                    fullName: '$senderInfo.fullName',
                    unreadMessage: 1,
                    latestMessage: '$latestMessage.text',
                    latestAt: '$latestMessage.createdAt',
                    lastLoginAt: '$senderInfo.lastLoginAt',
                    isOnline: '$senderInfo.isOnline',
                },
            },
            {
                $sort: { latestAt: -1 },
            },
        ]);

        new OK({ message: 'Lấy tin nhắn thành công', metadata: result }).send(res);
    }

    async getMessage(req, res) {
        const { senderId, receiverId } = req.query;
        const convId = getConversationId(senderId, receiverId);
        const data = await modelMessage.find({ conversationId: convId });

        new OK({ message: 'Lấy tin nhắn thành công', metadata: data }).send(res);
    }

    async getMessageUser(req, res) {
        const { id } = req.user;
        const data = await modelMessage.findOne({ senderId: id });
        const convId = getConversationId(id, data.receiverId);
        const dataMessage = await modelMessage.find({ conversationId: convId });

        new OK({ message: 'Lấy tin nhắn thành công', metadata: dataMessage }).send(res);
    }

    async readMessage(req, res) {
        const { id } = req.user;
        const { receiverId } = req.query;
        const convId = getConversationId(id, receiverId);
        const data = await modelMessage.updateMany(
            { conversationId: convId, isRead: false },
            { $set: { isRead: true } },
        );

        new OK({ message: 'Đọc tin nhắn thành công', metadata: data }).send(res);
    }
}

module.exports = new MessageController();
