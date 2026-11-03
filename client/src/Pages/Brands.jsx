import { useState } from 'react';
import { Alert, Button, Empty, Input, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import Header from '../Components/Header/Header';
import Footer from '../Components/Footer/Footer';
import useFetch from '../hooks/useFetch';
import useSeo from '../hooks/useSeo';
import { foldText } from '../utils/format';

export default function Brands() {
    const { data, loading, error, reFetch } = useFetch('/api/brands');
    const [search, setSearch] = useState('');
    const [letter, setLetter] = useState('');
    useSeo({ title: 'Thương hiệu đồng hồ A–Z' });
    const brands = (Array.isArray(data) ? data : []).filter(item => foldText(item.name).includes(foldText(search)) && (!letter || foldText(item.name).startsWith(letter.toLowerCase())));
    return <><Header /><main className="page-shell"><h1>Thương hiệu đồng hồ</h1>
        <Input.Search aria-label="Tìm thương hiệu" placeholder="Tìm thương hiệu" value={search} onChange={event => setSearch(event.target.value)} style={{ maxWidth: 400 }} />
        <nav className="quick-links" aria-label="Thương hiệu theo chữ cái"><Button type={letter ? 'default' : 'primary'} onClick={() => setLetter('')}>Tất cả</Button>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(value => <Button key={value} type={letter === value ? 'primary' : 'text'} onClick={() => setLetter(value)}>{value}</Button>)}</nav>
        {error ? <Alert type="error" message={error} action={<Button onClick={reFetch}>Thử lại</Button>} /> : loading ? <Skeleton active /> : !brands.length ? <Empty description="Không tìm thấy thương hiệu phù hợp." />
            : <div className="brand-grid">{brands.map(item => <article className="brand-card" key={item.name}>
                {item.logo && <img src={item.logo} alt={item.name} loading="lazy" width="120" height="60" />}
                <h2><Link to={`/category/brand/${encodeURIComponent(item.name)}`}>{item.name}</Link></h2>
                <p>{item.description || `Khám phá các mẫu ${item.name} trong danh mục ECOMMOR.`}</p><span>{item.productCount} sản phẩm</span>
            </article>)}</div>}
    </main><Footer /></>;
}
