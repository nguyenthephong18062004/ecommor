const express = require('express');
const app = express();
const port = 3000;
require('dotenv').config();

const { initSocket } = require('./socket');
const { createServer } = require('node:http');
const server = createServer(app);

const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const route = require('./routes/index');
const connectDB = require('./config/connectDB');
const { askQuestion } = require('./utils/chatbot');

connectDB();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const allowedOrigins = [
    process.env.DOMAIN_URL,
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    }),
);

app.use(express.static(path.join(__dirname, '../src')));

app.use(cookieParser());

app.post('/api/chatbot', async (req, res) => {
    const { question } = req.body;
    const data = await askQuestion(question);
    return res.status(200).json({ message: 'Chatbot response', statusCode: 200, metadata: data });
});

route(app);

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Lá»—i server',
    });
});

initSocket(server);

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

