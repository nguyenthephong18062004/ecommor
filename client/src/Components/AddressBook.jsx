import { Alert, Button, Form, Input, List, Popconfirm, Select, Space, message } from 'antd';
import { Link } from 'react-router-dom';
import { useStore } from '../hooks/userStore';
import ShippingCheckout from '../Pages/CheckOut/ShippingCheckout';

export function SavedAddressSelect({ form }) {
    const { addresses, preferencesBusy, preferencesError } = useStore();
    return <div className="catalog-section">
        {preferencesError && <Alert type="error" message={preferencesError} />}
        <Select aria-label="Địa chỉ đã lưu" placeholder="Chọn địa chỉ đã lưu" allowClear loading={preferencesBusy}
            style={{ width: '100%' }} options={addresses.map((item, index) => ({ value: index, label: `${item.label} · ${item.fullName} · ${item.address}` }))}
            onChange={index => { if (addresses[index]) form.setFieldsValue(addresses[index]); }} />
        <Link to="/profile?tab=addresses">Quản lý sổ địa chỉ</Link>
    </div>;
}

export default function AddressBook() {
    const { addresses, savePersonal, preferencesBusy, preferencesError, dataUser } = useStore();
    const [form] = Form.useForm();
    const save = async values => {
        if (addresses.length >= 8) { message.info('Bạn có thể lưu tối đa 8 địa chỉ.'); return; }
        if (await savePersonal({ addresses: [...addresses, values] })) { message.success('Đã lưu địa chỉ.'); form.resetFields(); }
    };
    return <section><h2>Sổ địa chỉ</h2>
        {preferencesError && <Alert type="error" message={preferencesError} />}
        <List dataSource={addresses} locale={{ emptyText: 'Chưa có địa chỉ đã lưu.' }} renderItem={(item, index) => <List.Item
            actions={[<Popconfirm key="remove" title="Xóa địa chỉ này?" okText="Xóa" cancelText="Đóng"
                onConfirm={() => savePersonal({ addresses: addresses.filter((_, i) => i !== index) })}><Button disabled={preferencesBusy}>Xóa</Button></Popconfirm>]}>
            <List.Item.Meta title={`${item.label} · ${item.fullName}`} description={`${item.phone} · ${item.address}`} />
        </List.Item>} />
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ fullName: dataUser.fullName, phone: dataUser.phone }}>
            <h3>Thêm địa chỉ nhận hàng</h3>
            <Space wrap align="start">
                <Form.Item name="label" label="Tên địa chỉ" rules={[{ required: true, whitespace: true, max: 40 }]}><Input placeholder="Nhà riêng, văn phòng..." /></Form.Item>
                <Form.Item name="fullName" label="Người nhận" rules={[{ required: true, whitespace: true, max: 100 }]}><Input /></Form.Item>
                <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, pattern: /^0[35789]\d{8}$/, message: 'Nhập số điện thoại Việt Nam hợp lệ.' }]}><Input /></Form.Item>
            </Space>
            <ShippingCheckout form={form} addressOnly />
            <Button type="primary" htmlType="submit" disabled={preferencesBusy || Boolean(preferencesError)} style={{ marginTop: 16 }}>Lưu địa chỉ</Button>
        </Form>
    </section>;
}
