require('dotenv').config();

module.exports = {
    tmnCodeVNPAY: process.env.VNPAY_TMN_CODE,
    secretKeyVNPAY: process.env.VNPAY_SECRET_KEY,
    vnpUrlVNPAY: process.env.VNPAY_URL,
    returnUrlVNPAY: process.env.VNPAY_RETURN_URL,
};
