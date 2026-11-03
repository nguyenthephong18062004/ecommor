const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const localDate = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
const localTime = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
export const money = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? currency.format(Number(value)) : 'Chưa xác định';
export const dateTime = (value, withTime = false) => value && Number.isFinite(new Date(value).getTime())
    ? `${localDate.format(new Date(value))}${withTime ? ` ${localTime.format(new Date(value))}` : ''}` : 'Chưa xác định';
export const dateInput = value => value && Number.isFinite(new Date(value).getTime())
    ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)) : '';
export const salePrice = product => Math.round(Number(product?.price || 0) * (100 - Number(product?.discount || 0)) / 100);
export const foldText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
export const canBuy = product => product?.publicationStatus === 'published' && product?.verificationStatus === 'verified' && product?.stock > 0;
export const canOrder = product => product?.publicationStatus === 'published' && product?.allowPreorder === true && product?.stock <= 0;
export const availability = product => canBuy(product) ? 'Có sẵn' : canOrder(product) ? 'Nhận đặt hàng'
    : product?.publicationStatus !== 'published' || product?.verificationStatus !== 'verified' ? 'Thông tin tham khảo' : 'Tạm hết hàng';
export const movementLabel = value => ({ Automatic: 'Tự động (Automatic)', Quartz: 'Máy pin (Quartz)',
    'Manual winding': 'Lên cót tay', Solar: 'Năng lượng ánh sáng (Solar)' })[value] || value;
export const specValue = (product, key) => product?.[key] === 0 && ['dialDiameter', 'caseThickness'].includes(key)
    ? 'Không áp dụng' : (key === 'movement' ? movementLabel(product?.[key]) : product?.[key]) || 'Chưa xác minh';
export const productSpecs = [
    ['modelNumber', 'Mã sản phẩm'], ['brand', 'Thương hiệu'], ['collection', 'Bộ sưu tập'],
    ['origin', 'Xuất xứ'], ['gender', 'Giới tính'], ['movement', 'Bộ máy'], ['powerReserve', 'Trữ cót'],
    ['glassMaterial', 'Mặt kính'], ['dialDiameter', 'Kích thước mặt (mm)'], ['caseThickness', 'Độ dày (mm)'],
    ['bezelMaterial', 'Chất liệu niềng'], ['strapMaterial', 'Chất liệu dây'], ['faceColor', 'Màu mặt'],
    ['waterResistance', 'Chống nước'], ['warrantyGlobal', 'Bảo hành'], ['boxPapers', 'Hộp và giấy tờ'],
];
