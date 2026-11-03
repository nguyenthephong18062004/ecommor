const bcrypt = require('bcrypt');
const crypto = require('node:crypto');

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS_PER_HOUR = 5;
const OTP_SEND_WINDOW_MS = 60 * 60 * 1000;

class OtpError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

function createOtpService({ Otp, now = () => new Date(), createCode = generateOtp }) {
    async function issue({ email, type, registration }) {
        const normalizedEmail = normalizeEmail(email);
        const currentTime = now();
        const previous = await Otp.findOne({ email: normalizedEmail, type });
        const inCurrentWindow = previous?.sendWindowStartedAt && currentTime.getTime() - previous.sendWindowStartedAt.getTime() < OTP_SEND_WINDOW_MS;

        if (previous?.resendAvailableAt > currentTime) {
            throw new OtpError('COOLDOWN', 'Vui lòng chờ trước khi yêu cầu mã xác minh mới.');
        }
        if (inCurrentWindow && previous.sendCount >= OTP_MAX_SENDS_PER_HOUR) {
            throw new OtpError('RATE_LIMIT', 'Bạn đã yêu cầu quá nhiều mã xác minh. Vui lòng thử lại sau.');
        }

        const code = createCode();
        const otp = await bcrypt.hash(code, 10);
        const payload = {
            otp,
            time: currentTime,
            attempts: 0,
            resendAvailableAt: new Date(currentTime.getTime() + OTP_RESEND_COOLDOWN_MS),
            sendWindowStartedAt: inCurrentWindow ? previous.sendWindowStartedAt : currentTime,
            sendCount: inCurrentWindow ? previous.sendCount + 1 : 1,
            registration: registration || previous?.registration || null,
        };
        if (previous) {
            await Otp.updateOne({ _id: previous._id }, { $set: payload });
        } else {
            await Otp.create({ email: normalizedEmail, type, ...payload });
        }
        return { code };
    }

    async function consume({ email, type, code }) {
        const normalizedEmail = normalizeEmail(email);
        const current = await Otp.findOne({ email: normalizedEmail, type });
        const expired = !current || current.time.getTime() + OTP_TTL_MS <= now().getTime();
        if (expired || current.attempts >= OTP_MAX_ATTEMPTS) {
            if (current) await Otp.deleteOne({ _id: current._id });
            throw new OtpError('INVALID', 'Mã xác minh không đúng hoặc đã hết hạn.');
        }
        if (!(await bcrypt.compare(String(code || ''), current.otp))) {
            await Otp.updateOne({ _id: current._id }, { $inc: { attempts: 1 } });
            throw new OtpError('INVALID', 'Mã xác minh không đúng hoặc đã hết hạn.');
        }
        const consumed = await Otp.findOneAndDelete({ _id: current._id, otp: current.otp });
        if (!consumed) throw new OtpError('INVALID', 'Mã xác minh không đúng hoặc đã hết hạn.');
        return consumed;
    }

    async function hasPendingRegistration(email) {
        return Boolean(await Otp.findOne({ email: normalizeEmail(email), type: 'verifyAccount' }));
    }

    return { issue, consume, hasPendingRegistration };
}

module.exports = {
    createOtpService,
    generateOtp,
    normalizeEmail,
    OTP_TTL_MS,
    OTP_RESEND_COOLDOWN_MS,
    OTP_MAX_ATTEMPTS,
    OTP_MAX_SENDS_PER_HOUR,
    OtpError,
};
