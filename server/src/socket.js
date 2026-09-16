const { Server } = require('socket.io');
const { verifyToken } = require('./services/tokenSevices');
const modelUser = require('./models/users.model');

require('dotenv').config();

let io;

const connectedUsers = new Map();

async function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.DOMAIN_URL,
            credentials: true,
        },
    });

    io.on('connection', async (socket) => {
        console.log('A user connected:', socket.id);

        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) return;

        const tokenCookie = cookieHeader
            .split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith('token='));

        if (!tokenCookie) return;

        const token = tokenCookie.split('=')[1];

        const { id } = await verifyToken(token);

        socket.userId = id;

        connectedUsers.set(socket.userId, socket.id);

        await modelUser.updateOne({ _id: socket.userId }, { lastLoginAt: new Date(), isOnline: true });

        socket.on('userConnected', async (userId) => {
            console.log(`User ${userId} connected with socket ID: ${socket.id}`);
        });

        socket.on('disconnect', async () => {
            const findUser = await modelUser.findOne({ _id: socket.userId });
            if (findUser) {
                await modelUser.updateOne({ _id: socket.userId }, { lastLoginAt: new Date(), isOnline: false });
                console.log('Đã cập nhật');
            } else {
                console.log('User not found');
            }
            console.log('User disconnected:', socket.id);
            connectedUsers.delete(socket.userId);
        });
    });

    return io;
}

function getIO() {
    if (!io) throw new Error('Socket.io chưa được khởi tạo!');
    return io;
}

module.exports = { initSocket, getIO, connectedUsers };
