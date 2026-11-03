const express = require('express');
const app = express();
const port = 3000;
require('dotenv').config();

const { initSocket } = require('./socket');
const { createServer } = require('node:http');
const server = createServer(app);

const bodyParser = require('body-parser');
const cors = require('cors');
const { getCorsOptions } = require('./config/cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');

const route = require('./routes/index');
const { authUser } = require('./auth/checkAuth');
const connectDB = require('./config/connectDB');
const { askQuestion, MAX_QUESTION_LENGTH, MAX_HISTORY_MESSAGES } = require('./utils/chatbot');

connectDB();

app.set('trust proxy', process.env.TRUST_PROXY || false);
const mongoose = require('mongoose');
const { expirePending } = require('./services/vnpay.service');
let expiryRunning = false;
async function runPaymentExpiry() {
    if (expiryRunning || mongoose.connection.readyState !== 1) return;
    expiryRunning = true;
    try {
        await expirePending();
    } catch {
        console.error('VNPay expiry processing failed; check MongoDB replica set configuration');
    } finally {
        expiryRunning = false;
    }
}
mongoose.connection.once('connected', runPaymentExpiry);
setInterval(runPaymentExpiry, 30 * 1000).unref();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors(getCorsOptions()));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { dotfiles: 'deny', index: false }));

app.use(cookieParser());

const chatbotRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res) {
        return res.status(429).json({
            success: false,
            errorCode: 'RATE_LIMIT',
            message: 'Bạn đã gửi quá nhiều câu hỏi. Vui lòng thử lại sau ít phút.',
        });
    },
});

app.post('/api/chatbot', authUser, chatbotRateLimit, async (req, res, next) => {
    const { question, history } = req.body || {};
    if (typeof question !== 'string' || !question.trim() || question.length > MAX_QUESTION_LENGTH) {
        return res.status(400).json({
            success: false,
            errorCode: 'INVALID_INPUT',
            message: `Câu hỏi phải có từ 1 đến ${MAX_QUESTION_LENGTH} ký tự.`,
        });
    }
    if (history !== undefined && (!Array.isArray(history) || history.length > MAX_HISTORY_MESSAGES)) {
        return res.status(400).json({
            success: false,
            errorCode: 'INVALID_INPUT',
            message: `Lịch sử chat không được vượt quá ${MAX_HISTORY_MESSAGES} tin nhắn.`,
        });
    }

    const requestId = require('node:crypto').randomUUID();
    try {
        const data = await askQuestion(question, { history, requestId, userId: req.user?.id });
        return res.status(200).json({ message: 'Chatbot response', statusCode: 200, requestId, metadata: data });
    } catch (error) {
        if (!error.code || !error.statusCode) return next(error);
        return res.status(error.statusCode).json({
            success: false,
            errorCode: error.code,
            requestId,
            message: error.message,
        });
    }
});

route(app);

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || (['ValidationError', 'CastError'].includes(err.name) ? 400 : err.code === 11000 ? 409 : 500);
    res.status(statusCode).json({
        success: false,
        message: statusCode >= 500 ? 'Hệ thống tạm chưa xử lý được yêu cầu. Vui lòng thử lại sau.'
            : err.name === 'ValidationError' || err.name === 'CastError' ? 'Dữ liệu gửi lên không hợp lệ.'
                : err.code === 11000 ? 'Thông tin này đã tồn tại.' : err.message || 'Yêu cầu không hợp lệ.',
    });
});

initSocket(server);

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

