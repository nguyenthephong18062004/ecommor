const { google } = require('googleapis');
const nodemailer = require('nodemailer');

class MailDeliveryError extends Error {
    constructor(code) {
        super('Hiện chưa thể gửi email. Vui lòng thử lại sau.');
        this.name = 'MailDeliveryError';
        this.code = code;
    }
}

function classifyMailError(error) {
    const value = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
    if (value.includes('invalid_grant')) return 'INVALID_GRANT';
    if (value.includes('invalid_client')) return 'INVALID_CLIENT';
    if (value.includes('unauthorized_client')) return 'UNAUTHORIZED_CLIENT';
    if (['enotfound', 'econnreset', 'etimedout', 'econnrefused'].includes(String(error?.code || '').toLowerCase())) return 'NETWORK';
    return 'UNKNOWN';
}

function createMailService({ env = process.env, createOAuthClient, createTransport } = {}) {
    const oauthFactory = createOAuthClient || ((clientId, clientSecret, redirectUri) => new google.auth.OAuth2(clientId, clientSecret, redirectUri));
    const transportFactory = createTransport || nodemailer.createTransport;

    async function send({ to, subject, text }) {
        const required = ['GOOGLE_CLIENT', 'GOOGLE_SECRET', 'REDIRECT_URI', 'REFRESH_TOKEN', 'USER_EMAIL'];
        if (required.some((key) => !env[key]?.trim())) throw new MailDeliveryError('INVALID_CLIENT');
        try {
            const oauthClient = oauthFactory(env.GOOGLE_CLIENT, env.GOOGLE_SECRET, env.REDIRECT_URI);
            oauthClient.setCredentials({ refresh_token: env.REFRESH_TOKEN });
            const accessToken = await oauthClient.getAccessToken();
            const transporter = transportFactory({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: env.USER_EMAIL,
                    clientId: env.GOOGLE_CLIENT,
                    clientSecret: env.GOOGLE_SECRET,
                    refreshToken: env.REFRESH_TOKEN,
                    accessToken: accessToken?.token || accessToken,
                },
            });
            await transporter.sendMail({ from: `ECOMMOR <${env.USER_EMAIL}>`, to, subject, text });
        } catch (error) {
            throw new MailDeliveryError(classifyMailError(error));
        }
    }

    async function sendOtpEmail({ to, code, purpose }) {
        const subject = purpose === 'verifyAccount' ? 'Mã xác minh tài khoản ECOMMOR' : 'Mã đặt lại mật khẩu ECOMMOR';
        await send({ to, subject, text: `Mã xác minh ECOMMOR của bạn là ${code}. Mã có hiệu lực trong 10 phút. Không chia sẻ mã này cho người khác.` });
    }

    async function sendCheckEmail(to) {
        await send({ to, subject: 'Kiểm tra cấu hình email ECOMMOR', text: 'Cấu hình gửi email đang hoạt động.' });
    }

    return { sendOtpEmail, sendCheckEmail };
}

const mailService = createMailService();

module.exports = { createMailService, mailService, MailDeliveryError, classifyMailError };
