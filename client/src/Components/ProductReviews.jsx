import { useEffect, useState } from 'react';
import { Alert, Button, Empty, List, Pagination, Rate, Skeleton, Tag } from 'antd';
import { Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { dateTime } from '../utils/format';

export default function ProductReviews({ productId }) {
    const [page, setPage] = useState(1);
    useEffect(() => setPage(1), [productId]);
    const { data, loading, error, reFetch } = useFetch(`/api/reviews?productId=${encodeURIComponent(productId)}&page=${page}`);
    return <section className="catalog-section">
        <h2>Đánh giá từ khách hàng</h2>
        <p>Người đã nhận hàng có thể gửi đánh giá tại <Link to="/orders">Đơn hàng của tôi</Link>. Đánh giá mới được kiểm tra trước khi hiển thị.</p>
        {error ? <Alert type="error" message={error} action={<Button onClick={reFetch}>Thử lại</Button>} />
            : loading ? <Skeleton active /> : !data?.items?.length ? <Empty description="Chưa có đánh giá nào cho sản phẩm này." />
                : <List dataSource={data.items} renderItem={review => <List.Item key={review._id}>
                    <List.Item.Meta title={<>{review.user?.name || 'Khách hàng'} {review.verifiedPurchase && <Tag color="green">Đã mua hàng</Tag>}</>}
                        description={<><Rate disabled value={review.rating} /><p>{review.content}</p><small>{dateTime(review.createdAt)}</small></>} />
                </List.Item>} />}
        {data?.total > 10 && <Pagination current={page} total={data.total} pageSize={10} showSizeChanger={false} onChange={setPage} />}
    </section>;
}
