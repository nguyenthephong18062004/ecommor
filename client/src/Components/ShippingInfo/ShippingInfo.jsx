import { Alert, Descriptions } from 'antd';
import { shippingStatus } from '../../utils/shippingStatus';

const money = value => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
export default function ShippingInfo({ shipping, shipment }) {
    if (!shipping) return null;
    const parcel = shipment?.parcel || shipping.parcel;
    const eta = shipment?.expectedDelivery || shipping.expectedDelivery;
    return <>
        <Descriptions size="small" column={1} title={`Giao Hàng Nhanh${shipping.environment === 'sandbox' ? ' — Thử nghiệm' : ''}`}>
            <Descriptions.Item label="Phí GHN tại lúc đặt đơn">{money(shipping.grossFee)}</Descriptions.Item>
            <Descriptions.Item label="Shop hỗ trợ">{money(shipping.support)}</Descriptions.Item>
            <Descriptions.Item label="Phí ship khách thanh toán">{money(shipping.customerFee)}</Descriptions.Item>
            <Descriptions.Item label="Giao dự kiến">{eta ? new Date(eta).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'GHN chưa có thời gian dự kiến'}</Descriptions.Item>
            {parcel && <Descriptions.Item label="Kiện hàng">{parcel.weight}g · {parcel.length} × {parcel.width} × {parcel.height} cm{parcel.estimated ? ' (ước tính, gồm hộp bảo vệ)' : ''}</Descriptions.Item>}
            <Descriptions.Item label="Giá trị khai giá">{money(shipping.insuranceValue)}</Descriptions.Item>
            {shipment?.code && <Descriptions.Item label="Mã vận đơn">{shipment.code}</Descriptions.Item>}
            {shipment?.status && <Descriptions.Item label="Trạng thái GHN">{shippingStatus(shipment.status)}</Descriptions.Item>}
            {shipment?.actualFee != null && <Descriptions.Item label="Phí GHN khi tạo vận đơn">{money(shipment.actualFee)}</Descriptions.Item>}
            {shipment?.lastSyncAt && <Descriptions.Item label="Đồng bộ gần nhất">{new Date(shipment.lastSyncAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</Descriptions.Item>}
        </Descriptions>
        {shipping.insuranceLimited && <Alert type="warning" showIcon message="Giá trị đơn vượt mức khai giá 5 triệu đồng đang áp dụng cho API này. Không mặc định toàn bộ giá trị đồng hồ đã được bảo hiểm." />}
    </>;
}
