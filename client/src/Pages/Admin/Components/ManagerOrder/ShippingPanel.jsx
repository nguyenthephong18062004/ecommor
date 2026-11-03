import { useEffect, useRef, useState } from 'react';
import { Alert, Button, InputNumber, Modal, Space, Table, Typography, message } from 'antd';
import { requestShipment, requestGetOrderAdmin } from '../../../../config/request';
import ShippingInfo from '../../../../Components/ShippingInfo/ShippingInfo';
import { shippingStatus } from '../../../../utils/shippingStatus';

export default function ShippingPanel({ order, onChange }) {
    const [parcel, setParcel] = useState({});
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);
    const sending = useRef(false);
    useEffect(() => { setParcel(order.shipment?.parcel || order.shipping?.parcel || {}); setPreview(null); }, [order._id, order.shipping?.parcel, order.shipment?.parcel]);
    if (!order.shipping) return <Alert type="info" message="Đơn cũ chưa có dữ liệu địa chỉ và báo giá GHN, không thể tự động tạo vận đơn." />;
    const canCreate = order.status === 'confirmed' && (order.paymentMethod === 'COD' || order.paymentStatus === 'paid') &&
        !['ready', 'unknown', 'creating'].includes(order.shipment?.state);
    const perform = async action => {
        if (sending.current) return;
        sending.current = true; setBusy(true);
        try {
            const result = await requestShipment(order._id, action, { parcel, expectedFee: preview?.grossFee });
            if (action === 'preview') setPreview(result);
            else { onChange(result); setPreview(null); message.success(action === 'create' ? 'Đã tạo vận đơn GHN' : 'Đã đồng bộ GHN'); }
        } catch (err) {
            if (action === 'create') {
                try {
                    const refreshed = await requestGetOrderAdmin();
                    const current = refreshed.metadata.find(row => row._id === order._id);
                    if (current) onChange(current.shipment);
                } catch { /* Do not retry a shipment automatically when its outcome is unknown. */ }
                setPreview(null);
            }
            message.error(err.response?.data?.message || 'Chưa xử lý được GHN. Hãy tải lại đơn trước khi thử tiếp.');
        }
        finally { sending.current = false; setBusy(false); }
    };
    return <Space direction="vertical" style={{ width: '100%' }}>
        <ShippingInfo shipping={order.shipping} shipment={order.shipment} />
        <Typography.Text type="secondary">Shop thanh toán phí cho GHN. Phần khách trả đã nằm trong tổng đơn; COD thu đúng tổng đó, VNPay đã trả đủ thì không thu thêm.</Typography.Text>
        {order.shipment?.code && <Typography.Text type="secondary">Nếu cần hủy, xử lý vận đơn trong tài khoản GHN rồi đồng bộ tại đây trước khi hủy đơn của shop.</Typography.Text>}
        {!canCreate && !order.shipment?.code && <Alert type="info" message="Cần xác nhận đơn hàng và xác minh VNPay đã thanh toán trước khi tạo vận đơn. Nếu kết quả tạo chưa rõ, dùng Đồng bộ GHN." />}
        {order.shipment?.lastError && <Alert type="warning" message={order.shipment.lastError} />}
        {canCreate && <>
            <Typography.Text>Kiểm tra hoặc nhập kiện thực tế trước khi tạo vận đơn (phí chênh lệch do shop chịu, không đổi số tiền khách đã đặt).</Typography.Text>
            <Space wrap>
                {[['weight', 'Cân nặng (g)', 19999], ['length', 'Dài (cm)', 200], ['width', 'Rộng (cm)', 200], ['height', 'Cao (cm)', 200]].map(([key, label, max]) => (
                    <label key={key}>{label}<br /><InputNumber value={parcel[key]} min={1} max={max} precision={0}
                        onChange={value => { setParcel(previous => ({ ...previous, [key]: value })); setPreview(null); }} /></label>
                ))}
            </Space>
            <Button loading={busy} onClick={() => perform('preview')}>Kiểm tra phí kiện thực tế</Button>
            {preview && <Alert type="info" message={`Phí GHN dự kiến khi tạo: ${preview.grossFee.toLocaleString('vi-VN')}đ. Phần ship đã thu khách: ${order.shipping.customerFee.toLocaleString('vi-VN')}đ.`} />}
            <Button type="primary" disabled={!preview || busy} onClick={() => Modal.confirm({
                title: `Tạo vận đơn GHN ${order.shipping.environment === 'sandbox' ? 'thử nghiệm' : 'THỰC TẾ'}?`,
                content: `Phí dự kiến ${preview.grossFee.toLocaleString('vi-VN')}đ. ${order.shipping.environment === 'production' ? 'GHN có thể đến lấy hàng và phát sinh cước thực tế.' : 'Đây là môi trường thử nghiệm.'}`,
                okText: 'Xác nhận tạo vận đơn', cancelText: 'Hủy', onOk: () => perform('create'),
            })}>Tạo vận đơn GHN</Button>
        </>}
        {order.shipment?.state && <Button loading={busy} onClick={() => perform('sync')}>Đồng bộ trạng thái GHN</Button>}
        {!!order.shipment?.events?.length && <Table size="small" pagination={false} rowKey={(_, index) => index}
            dataSource={order.shipment.events} columns={[{ title: 'Trạng thái GHN', dataIndex: 'status', render: shippingStatus },
                { title: 'Thời điểm', dataIndex: 'at', render: value => value ? new Date(value).toLocaleString('vi-VN') : '' }]} />}
    </Space>;
}
