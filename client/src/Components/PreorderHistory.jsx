import { useState } from 'react';
import { Alert, Button, Table, Tag, Timeline } from 'antd';
import { Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { money, dateTime } from '../utils/format';

const labels = { pending: 'Chờ liên hệ', contacted: 'Đã liên hệ', confirmed: 'Đã xác nhận nhu cầu', cancelled: 'Đã hủy' };
export default function PreorderHistory() {
    const [page, setPage] = useState(1);
    const { data, loading, error, reFetch } = useFetch(`/api/preorders/mine?page=${page}`);
    return <section><h2>Yêu cầu đặt hàng của tôi</h2>
        <p>Theo dõi quá trình tư vấn nguồn hàng, giá và thời gian giao. Yêu cầu chưa phải đơn đã thanh toán.</p>
        {error && <Alert type="error" message={error} action={<Button onClick={reFetch}>Thử lại</Button>} />}
        <Table rowKey="_id" loading={loading} dataSource={data?.items || []} scroll={{ x: 700 }}
            columns={[
                { title: 'Mã yêu cầu', dataIndex: '_id' },
                { title: 'Sản phẩm', render: (_, item) => <Link to={`/product/${item.productId}`}>{item.productName}</Link> },
                { title: 'Số lượng', dataIndex: 'quantity' },
                { title: 'Giá trị tham khảo', render: (_, item) => money(item.totalPrice) },
                { title: 'Trạng thái', render: (_, item) => <Tag>{labels[item.status]}</Tag> },
            ]} pagination={{ current: page, total: data?.total || 0, pageSize: 20, showSizeChanger: false, onChange: setPage }}
            expandable={{ expandedRowRender: item => <Timeline items={(item.history || []).map(step => ({
                children: <>{labels[step.status]} · {dateTime(step.at, true)}{step.note && <p>{step.note}</p>}</>,
            }))} /> }} />
    </section>;
}
