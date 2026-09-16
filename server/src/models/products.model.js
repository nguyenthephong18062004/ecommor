const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelProduct = new Schema(
    {
        nameProduct: { type: String, required: true }, // Tên đồng hồ
        modelNumber: { type: String, required: true }, // Số hiệu sản phẩm
        brand: { type: String, required: true }, // Thương hiệu
        collection: { type: String }, // Bộ sưu tập
        category: { type: String },
        origin: { type: String, required: true }, // Xuất xứ
        gender: { type: String, required: true }, // Giới tính (Nam/Nữ)
        glassMaterial: { type: String, required: true }, // Kính (Sapphire,...)
        movement: { type: String, required: true }, // Loại máy
        powerReserve: { type: String }, // Trữ cót (nếu là automatic)
        warrantyGlobal: { type: String }, // Bảo hành quốc tế
        dialDiameter: { type: Number, required: true }, // Đường kính mặt số (mm)
        caseThickness: { type: Number }, // Bề dày mặt số (mm)
        bezelMaterial: { type: String }, // Niềng (thép không gỉ,...)
        strapMaterial: { type: String, required: true }, // Dây đeo
        faceColor: { type: String }, // Màu mặt số
        waterResistance: { type: String, required: true }, // Chống nước
        price: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        description: { type: String, required: true },
        images: { type: String, required: true },
        stock: { type: Number, required: true },
        soldCount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('products', modelProduct);
