import { useState } from 'react';
import { Alert, Button, Pagination, Table } from 'antd';
import { Link } from 'react-router-dom';
import Header from '../Components/Header/Header';
import Footer from '../Components/Footer/Footer';
import ProductShelf from '../Components/ProductShelf';
import { useStore } from '../hooks/userStore';
import useSeo from '../hooks/useSeo';
import { money, salePrice, productSpecs, specValue, availability } from '../utils/format';

const titles = { wishlist: 'Sản phẩm yêu thích', compare: 'So sánh đồng hồ', recent: 'Sản phẩm đã xem' };
export default function Collections({ mode }) {
    const store = useStore();
    const ids = store[mode] || [];
    const [page, setPage] = useState(1);
    const current = Math.min(page, Math.max(1, Math.ceil(ids.length / 20)));
    useSeo({ title: titles[mode] });
    return <><Header /><main className="page-shell">
        <h1>{titles[mode]}</h1>
        {store.preferencesError && mode === 'wishlist' && <Alert type="error" message={store.preferencesError} />}
        {mode === 'compare' && <p>Chọn tối đa 3 sản phẩm để đối chiếu thông số. <Link to="/category/all">Khám phá đồng hồ</Link></p>}
        <ProductShelf ids={ids.slice((current - 1) * 20, current * 20)}
            render={mode === 'compare' ? items => <Table rowKey="key" pagination={false} scroll={{ x: 700 }}
                columns={[{ title: 'Thông số', dataIndex: 'label', fixed: 'left', width: 180 }, ...items.map(item => ({
                    title: <><Link to={`/product/${item._id}`}>{item.nameProduct}</Link><br /><Button type="link" onClick={() => store.toggleCompare(item._id)}>Bỏ so sánh</Button></>,
                    key: item._id, render: (_, row) => row.key === 'price' ? money(salePrice(item))
                        : row.key === 'availability' ? availability(item)
                        : specValue(item, row.key),
                }))]} dataSource={[['price', 'Giá hiển thị (tham khảo nếu chưa xác minh)'], ['availability', 'Khả dụng'], ...productSpecs].map(([key, label]) => ({ key, label }))} /> : undefined} />
        {ids.length > 20 && <Pagination current={current} pageSize={20} total={ids.length} showSizeChanger={false} onChange={setPage} />}
    </main><Footer /></>;
}
