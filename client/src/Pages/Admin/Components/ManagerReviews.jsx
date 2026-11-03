import { useState } from 'react';
import { Alert, Button, Rate, Space, Table, message } from 'antd';
import { Link } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import { apiClient } from '../../../config/axiosClient';
import { dateTime } from '../../../utils/format';

export default function ManagerReviews() {
    const [page, setPage] = useState(1);
    const [busy, setBusy] = useState(false);
    const { data, loading, error, reFetch } = useFetch(`/api/reviews/moderation?page=${page}`);
    const moderate = async (id, status) => {
        setBusy(true);
        try { await apiClient.patch(`/api/reviews/${id}/status`, { status }); message.success('Đã xử lý đánh giá.'); reFetch(); }
        catch (err) { message.error(err.response?.data?.message || 'Không thể cập nhật đánh giá.'); }
        finally { setBusy(false); }
    };
    return <><h2>Đánh giá chờ duyệt</h2>{error && <Alert type="error" message={error} />}
        <Table rowKey="_id" dataSource={data?.items || []} loading={loading} scroll={{ x: 700 }} columns={[
            { title: 'Khách hàng', render: (_, row) => row.user?.name },
            { title: 'Sản phẩm', render: (_, row) => <Link to={`/product/${row.productId}`}>Xem sản phẩm</Link> },
            { title: 'Đánh giá', render: (_, row) => <><Rate disabled value={row.rating} /><p>{row.content}</p><small>{dateTime(row.createdAt)}</small></> },
            { title: 'Xử lý', render: (_, row) => <Space><Button disabled={busy} onClick={() => moderate(row._id, 'approved')}>Duyệt</Button><Button danger disabled={busy} onClick={() => moderate(row._id, 'rejected')}>Từ chối</Button></Space> },
        ]} pagination={{ current: page, total: data?.total || 0, pageSize: 10, showSizeChanger: false, onChange: setPage }} />
    </>;
}
