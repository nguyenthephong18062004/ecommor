import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Popconfirm, Select, Space, Table, Tag, Timeline, Typography, message } from 'antd';
import { Link } from 'react-router-dom';
import { requestGetPreorders, requestUpdatePreorderStatus } from '../../../../config/request';
import { money, dateTime } from '../../../../utils/format';

const labels = { pending: 'Chờ liên hệ', contacted: 'Đã liên hệ', confirmed: 'Đã xác nhận nhu cầu', cancelled: 'Đã hủy' };
const colors = { pending: 'gold', contacted: 'blue', confirmed: 'green', cancelled: 'default' };
const nextStatuses = { pending: ['contacted', 'confirmed', 'cancelled'], contacted: ['confirmed', 'cancelled'] };

function ManagerPreorder() {
    const [data, setData] = useState({ items: [], total: 0 });
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [updating, setUpdating] = useState('');
    const [note, setNote] = useState('');
    const revision = useRef(0);

    const load = useCallback(async () => {
        const current = ++revision.current;
        setLoading(true);
        setError('');
        try {
            const result = await requestGetPreorders({ page, limit: 20, status });
            if (current === revision.current) setData(result);
        } catch (err) {
            if (current === revision.current) setError(err.response?.data?.message || 'Không tải được yêu cầu đặt hàng.');
        } finally {
            if (current === revision.current) setLoading(false);
        }
    }, [page, status]);

    useEffect(() => {
        const currentRevision = revision;
        load();
        return () => { currentRevision.current++; };
    }, [load]);

    const changeStatus = async (id, value) => {
        setUpdating(id);
        try {
            await requestUpdatePreorderStatus(id, value, note);
            setNote('');
            message.success('Đã cập nhật yêu cầu.');
            await load();
        } catch (err) {
            message.error(err.response?.data?.message || 'Không thể cập nhật yêu cầu.');
        } finally {
            setUpdating('');
        }
    };

    const columns = [
        { title: 'Yêu cầu', key: 'request', width: 200, render: (_, row) => <>
            <Typography.Text copyable>{row._id}</Typography.Text>
            <p>{dateTime(row.createdAt, true)}</p>
        </> },
        { title: 'Sản phẩm', key: 'product', width: 240, render: (_, row) => <>
            <Link to={`/product/${row.productId}`}>{row.productName}</Link>
            <p>Model: {row.modelNumber} · SL: {row.quantity}</p>
            <p>Tạm tính: {money(row.totalPrice)}</p>
        </> },
        { title: 'Khách hàng', key: 'customer', width: 220, render: (_, row) => <>
            <strong>{row.fullName}</strong><p><a href={`tel:${row.phone}`}>{row.phone}</a></p>
            {row.email && <p><a href={`mailto:${row.email}`}>{row.email}</a></p>}
            <p>{row.address}</p>
        </> },
        { title: 'Ghi chú', dataIndex: 'note', key: 'note', width: 220, render: value => <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{value || '—'}</span> },
        { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 170, render: value => <Tag color={colors[value]}>{labels[value]}</Tag> },
        { title: 'Xử lý', key: 'actions', width: 200, render: (_, row) => <Space wrap>
            {(nextStatuses[row.status] || []).map(value => (
                <Popconfirm key={value} title={`Chuyển sang “${labels[value]}”?`} onConfirm={() => changeStatus(row._id, value)} okText="Xác nhận" cancelText="Đóng">
                    <Button size="small" danger={value === 'cancelled'} disabled={Boolean(updating)} loading={updating === row._id}>{labels[value]}</Button>
                </Popconfirm>
            ))}
        </Space> },
    ];

    return (
        <>
            <Typography.Title level={3}>Yêu cầu đặt hàng</Typography.Title>
            <Alert type="info" showIcon message="Liên hệ khách hàng để xác nhận nguồn hàng, giá và thời gian giao. Xác nhận nhu cầu ở đây chưa tạo đơn thanh toán hoặc trừ tồn kho." style={{ marginBottom: 20 }} />
            <Space wrap style={{ marginBottom: 16 }}>
                <Select aria-label="Lọc trạng thái" value={status} style={{ width: 210 }} onChange={value => { setPage(1); setStatus(value); }}
                    options={[{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]} />
                <Button onClick={load} loading={loading}>Tải lại</Button>
            </Space>
            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
            <Input.TextArea rows={2} maxLength={1000} value={note} onChange={event => setNote(event.target.value)}
                placeholder="Ghi chú cho lần chuyển trạng thái tiếp theo (khách hàng có thể xem)" style={{ marginBottom: 16 }} />
            <Table rowKey="_id" columns={columns} dataSource={error ? [] : data.items} loading={loading} scroll={{ x: 1250 }}
                expandable={{ expandedRowRender: row => <Timeline items={(row.history || []).map(step => ({ children: <>{labels[step.status]} · {new Date(step.at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}<p>{step.note}</p></> }))} /> }}
                pagination={{ current: page, pageSize: 20, total: data.total, showSizeChanger: false, onChange: setPage }} />
        </>
    );
}

export default ManagerPreorder;
