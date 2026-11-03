import { Alert, Button, Empty, Skeleton } from 'antd';
import { useMemo } from 'react';
import useFetch from '../hooks/useFetch';
import CardBody from './CardBody/CardBody';

export default function ProductShelf({ ids = [], title, empty = 'Chưa có sản phẩm.', render }) {
    const key = ids.join(',');
    const { data, loading, error, reFetch } = useFetch(key ? `/api/catalog-browse?ids=${encodeURIComponent(key)}` : null);
    const items = useMemo(() => {
        const positions = new Map(key.split(',').map((id, index) => [id, index]));
        return [...(data?.items || [])].sort((a, b) => positions.get(a._id) - positions.get(b._id));
    }, [data, key]);
    return <section className="catalog-section">
        {title && <h2>{title}</h2>}
        {error ? <Alert type="error" message={error} action={<Button onClick={reFetch}>Thử lại</Button>} />
            : loading && key ? <Skeleton active /> : !items.length ? <Empty description={empty} />
                : render ? render(items) : <div className="product-grid">{items.map(item => <CardBody key={item._id} item={item} variant="catalog" />)}</div>}
    </section>;
}
