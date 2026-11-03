const { Server } = require('socket.io');
const { verifyToken } = require('./services/tokenSevices');
const modelUser = require('./models/users.model');
const { getCorsOptions } = require('./config/cors');

require('dotenv').config();

let io;

const connectedUsers = new Map();

async function initSocket(server) {
    io = new Server(server, {
        cors: getCorsOptions(),
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

        let id;
        try {
            ({ id } = await verifyToken(token));
            await modelUser.updateOne({ _id: id }, { lastLoginAt: new Date(), isOnline: true });
        } catch {
            socket.disconnect(true);
            return;
        }

        if (!socket.connected) return;
        socket.userId = id;
        connectedUsers.set(id, socket.id);

        socket.on('userConnected', async (userId) => {
            console.log(`User ${userId} connected with socket ID: ${socket.id}`);
        });

        socket.on('disconnect', async () => {
            if (connectedUsers.get(id) !== socket.id) return;
            connectedUsers.delete(id);
            try {
                await modelUser.updateOne({ _id: id }, { lastLoginAt: new Date(), isOnline: false });
            } catch {
                console.error('Socket disconnect status update failed');
            }
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
}

function getIO() {
    if (!io) throw new Error('Socket.io chưa được khởi tạo!');
    return io;
}

module.exports = { initSocket, getIO, connectedUsers };
