// Chỉ đọc số lượng, không bật bán, sửa giá/tồn kho hoặc in dữ liệu sản phẩm.
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectionOptions } = require('../src/config/connectDB');

async function run() {
    if (!process.env.CONNECT_DB) throw new Error('Thiếu cấu hình kết nối dữ liệu.');
    await mongoose.connect(process.env.CONNECT_DB, { ...connectionOptions(process.env.CONNECT_DB, process.env.NODE_ENV),
        autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
    try {
        const products = mongoose.connection.db.collection('products');
        const filters = {
            total: {},
            purchasable: { publicationStatus: 'published', verificationStatus: 'verified', stock: { $gt: 0 } },
            preorder: { publicationStatus: 'published', allowPreorder: true, stock: { $lte: 0 } },
            needsVerification: { verificationStatus: { $ne: 'verified' }, publicationStatus: { $ne: 'archived' } },
            legacyWithoutStatus: { publicationStatus: { $exists: false } },
            archived: { publicationStatus: 'archived' },
        };
        const counts = await Promise.all(Object.values(filters).map(filter => products.countDocuments(filter)));
        process.stdout.write(JSON.stringify({ readOnly: true, ...Object.fromEntries(Object.keys(filters).map((key, index) => [key, counts[index]])) }, null, 2) + '\n');
    } finally { await mongoose.disconnect(); }
}
if (require.main === module) run().catch(async () => {
    await mongoose.disconnect();
    console.error('Không đọc được thống kê catalog. Kiểm tra kết nối MongoDB; không có dữ liệu nào được sửa.');
    process.exitCode = 1;
});
module.exports = { run };
