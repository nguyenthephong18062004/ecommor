import { Alert, AutoComplete, Button, Form, Input, List, message } from 'antd';
import { useState } from 'react';
import useFetch from '../../../hooks/useFetch';
import { apiClient } from '../../../config/axiosClient';
import { useStore } from '../../../hooks/userStore';

export default function ManagerBrands() {
    const { reloadCatalogOptions } = useStore();
    const { data, loading, error, reFetch } = useFetch('/api/brands');
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const save = async values => {
        setSaving(true);
        try { await apiClient.put(`/api/brands/${encodeURIComponent(values.name)}`, { description: values.description || '', logo: values.logo || '' });
            message.success('Đã cập nhật thương hiệu.'); reFetch(); reloadCatalogOptions(); }
        catch (err) { message.error(err.response?.data?.message || 'Không thể lưu thương hiệu.'); }
        finally { setSaving(false); }
    };
    return <><h2>Thông tin thương hiệu</h2>{error && <Alert type="error" message={error} />}
        <Form form={form} layout="vertical" onFinish={save}>
            <Form.Item name="name" label="Thương hiệu" rules={[{ required: true, max: 100 }]}><AutoComplete options={(data || []).map(item => ({ value: item.name }))} onSelect={name => form.setFieldsValue((data || []).find(item => item.name === name))} /></Form.Item>
            <Form.Item name="description" label="Giới thiệu"><Input.TextArea rows={4} maxLength={3000} /></Form.Item>
            <Form.Item name="logo" label="Địa chỉ ảnh logo (HTTP/HTTPS)"><Input maxLength={1000} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>Lưu thương hiệu</Button>
        </Form>
        <List loading={loading} dataSource={data || []} renderItem={item => <List.Item actions={[<Button key="edit" onClick={() => form.setFieldsValue(item)}>Sửa</Button>]}>
            <List.Item.Meta title={item.name} description={item.description || 'Chưa có giới thiệu'} />
        </List.Item>} />
    </>;
}
