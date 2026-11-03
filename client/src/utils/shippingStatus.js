const statuses = {
    ready_to_pick: 'Chờ lấy hàng', picking: 'Đang lấy hàng', picked: 'Đã lấy hàng',
    storing: 'Đang lưu kho', transporting: 'Đang vận chuyển', sorting: 'Đang phân loại',
    delivering: 'Đang giao hàng', delivered: 'Giao thành công', delivery_fail: 'Giao thất bại',
    return: 'Chờ chuyển hoàn', returning: 'Đang chuyển hoàn', returned: 'Đã hoàn hàng',
    cancel: 'Đã hủy vận đơn', exception: 'Cần xử lý', lost: 'Thất lạc', damage: 'Hư hỏng',
};
export const shippingStatus = value => statuses[value] || value || 'Chưa có trạng thái';
