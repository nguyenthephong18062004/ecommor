import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Select, Space, Spin, Typography } from 'antd';
import { requestShippingLocations, requestShippingQuote } from '../../config/request';

const noop = () => {};
export default function ShippingCheckout({ form, cart, method, nameCoupon, onQuoteChange = noop, addressOnly = false }) {
    const provinceId = Form.useWatch('provinceId', form);
    const districtId = Form.useWatch('districtId', form);
    const wardCode = Form.useWatch('wardCode', form);
    const street = Form.useWatch('address', form);
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [locationError, setLocationError] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [revision, setRevision] = useState(0);
    const fingerprint = JSON.stringify(cart?.cartItems?.map(row => [row.product?._id, row.item?.quantity, row.product?.price, row.product?.discount]));

    useEffect(() => {
        const controller = new AbortController();
        setLocationError('');
        requestShippingLocations('provinces', {}, controller.signal).then(setProvinces)
            .catch(() => { if (!controller.signal.aborted) setLocationError('Không tải được địa chỉ GHN. Hãy thử lại.'); });
        return () => controller.abort();
    }, [revision]);
    useEffect(() => {
        setDistricts([]);
        if (!provinceId) return;
        const controller = new AbortController();
        requestShippingLocations('districts', { provinceId }, controller.signal).then(setDistricts)
            .catch(() => { if (!controller.signal.aborted) setLocationError('Chưa tải được quận/huyện GHN.'); });
        return () => controller.abort();
    }, [provinceId, revision]);
    useEffect(() => {
        setWards([]);
        if (!districtId) return;
        const controller = new AbortController();
        requestShippingLocations('wards', { districtId }, controller.signal).then(setWards)
            .catch(() => { if (!controller.signal.aborted) setLocationError('Chưa tải được phường/xã GHN.'); });
        return () => controller.abort();
    }, [districtId, revision]);

    useEffect(() => {
        onQuoteChange(null); setError(''); setLoading(false);
        if (addressOnly) return;
        if (!provinceId || !districtId || !wardCode || !street?.trim() || !cart?.cartId) return;
        if (!['COD', 'VNPAY'].includes(method)) { setError('Vui lòng chọn COD hoặc VNPay để vận chuyển GHN.'); return; }
        const controller = new AbortController();
        let expiry;
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const quote = await requestShippingQuote({ cartId: cart.cartId, method, nameCoupon,
                    address: { provinceId, districtId, wardCode, street: street.trim() } }, controller.signal);
                if (controller.signal.aborted) return;
                onQuoteChange(quote);
                expiry = setTimeout(() => { onQuoteChange(null); setError('Báo giá đã hết hạn. Vui lòng tính lại phí ship.'); }, Math.max(0, new Date(quote.expiresAt).getTime() - Date.now()));
            } catch (err) {
                if (!controller.signal.aborted) setError(err.response?.data?.message || 'Không lấy được phí GHN. Chưa thể đặt hàng.');
            } finally { if (!controller.signal.aborted) setLoading(false); }
        }, 500);
        return () => { controller.abort(); clearTimeout(timer); clearTimeout(expiry); };
    }, [provinceId, districtId, wardCode, street, cart?.cartId, fingerprint, method, nameCoupon, revision, onQuoteChange, addressOnly]);

    const options = rows => rows.map(row => ({ value: row.id, label: row.name }));
    return <>
        <Typography.Paragraph type="secondary">Chọn địa chỉ theo danh mục vận chuyển GHN để tính cước chính xác.</Typography.Paragraph>
        <Form.Item name="provinceId" label="Tỉnh/Thành phố (GHN)" rules={[{ required: true, message: 'Chọn tỉnh/thành phố' }]}>
            <Select showSearch optionFilterProp="label" options={options(provinces)} placeholder="Chọn tỉnh/thành phố"
                onChange={() => { form.setFieldsValue({ districtId: undefined, wardCode: undefined }); onQuoteChange(null); }} />
        </Form.Item>
        <Form.Item name="districtId" label="Quận/Huyện (GHN)" rules={[{ required: true, message: 'Chọn quận/huyện' }]}>
            <Select showSearch optionFilterProp="label" disabled={!provinceId} options={options(districts)} placeholder="Chọn quận/huyện"
                onChange={() => { form.setFieldValue('wardCode', undefined); onQuoteChange(null); }} />
        </Form.Item>
        <Form.Item name="wardCode" label="Phường/Xã (GHN)" rules={[{ required: true, message: 'Chọn phường/xã' }]}>
            <Select showSearch optionFilterProp="label" disabled={!districtId} options={options(wards)} placeholder="Chọn phường/xã" onChange={() => onQuoteChange(null)} />
        </Form.Item>
        <Form.Item name="address" label="Số nhà, tên đường" rules={[{ required: true, whitespace: true, max: 250, message: 'Nhập địa chỉ chi tiết (tối đa 250 ký tự)' }]}>
            <Input size="large" placeholder="Số nhà, tên đường, tòa nhà..." onChange={() => onQuoteChange(null)} />
        </Form.Item>
        <Space direction="vertical" style={{ width: '100%' }}>
            {loading && <Spin tip="Đang tính phí GHN..." />}
            {(locationError || error) && <Alert showIcon type="error" message={locationError || error} />}
            <Button onClick={() => setRevision(value => value + 1)} disabled={loading}>{addressOnly ? 'Tải lại danh mục địa chỉ' : 'Tải địa chỉ / Tính lại phí ship'}</Button>
        </Space>
    </>;
}
