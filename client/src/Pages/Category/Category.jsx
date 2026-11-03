import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Button, Empty, Input, InputNumber, Pagination, Segmented, Select, Skeleton, Slider, Space, Tag, message } from 'antd';
import { Filter, RefreshCw } from 'lucide-react';
import classNames from 'classnames/bind';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';
import CardBody from '../../Components/CardBody/CardBody';
import { apiClient } from '../../config/axiosClient';
import styles from './Category.module.scss';
import { useStore } from '../../hooks/userStore';
import useRequireAuth from '../../hooks/useRequireAuth';
import useSeo from '../../hooks/useSeo';
import { money, movementLabel, foldText } from '../../utils/format';

const cx = classNames.bind(styles);

function Category() {
    const { id, brand } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const requireAuth = useRequireAuth();
    const { savedSearches, savePersonal, preferencesBusy, catalogOptions: options,
        catalogOptionsLoading: optionsLoading, catalogOptionsError, reloadCatalogOptions } = useStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null, loading: true });
    const [priceDraft, setPriceDraft] = useState([0, 1000]);
    const queryString = searchParams.toString();
    const requestKey = `${id || ''}|${brand || ''}|${queryString}`;
    const stock = searchParams.get('stock') || 'all';
    const priceMax = Math.max(1000, options?.priceMax || 0);
    const formatPrice = money;
    const selectedBrand = brand || searchParams.get('brand');
    const selectedCategory = id && id !== 'all' ? id : searchParams.get('category');
    const categoryName = options?.categories?.find(item => item._id === selectedCategory)?.name;
    const brandInfo = options?.brandDetails?.find(item => item.name === selectedBrand);
    const title = [selectedBrand, categoryName].filter(Boolean).join(' · ') || 'Tất cả đồng hồ';

    useSeo({ title, breadcrumbs: [['Trang chủ', '/'], ['Đồng hồ', '/category/all']] });

    useEffect(() => {
        const min = searchParams.has('minPrice') ? Number(searchParams.get('minPrice')) : 0;
        const max = searchParams.has('maxPrice') ? Number(searchParams.get('maxPrice')) : priceMax;
        setPriceDraft([Number.isFinite(min) ? Math.max(0, Math.min(min, priceMax)) : 0,
            Number.isFinite(max) ? Math.max(0, Math.min(max, priceMax)) : priceMax]);
    }, [searchParams, priceMax]);

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams(queryString);
        if (brand) params.set('brand', brand);
        else if (id && id !== 'all') params.set('category', id);
        setResult({ key: requestKey, data: null, error: null, loading: true });
        apiClient.get('/api/catalog-browse', { params, signal: controller.signal, timeout: 15000 })
            .then(response => {
                if (!controller.signal.aborted) {
                    setResult({ key: requestKey, data: response.data.metadata, error: null, loading: false });
                }
            })
            .catch(error => {
                if (!controller.signal.aborted) {
                    setResult({ key: requestKey, data: null,
                        error: error.response?.data?.message || 'Không thể tải sản phẩm', loading: false });
                }
            });
        return () => controller.abort();
    }, [id, brand, queryString, requestKey, attempt]);

    const updateFilters = changes => {
            const next = new URLSearchParams(searchParams);
            if (selectedBrand) next.set('brand', selectedBrand);
            if (selectedCategory) next.set('category', selectedCategory);
            for (const [key, value] of Object.entries(changes)) {
                if (value === null || value === undefined || value === '' || value === 'all') next.delete(key);
                else next.set(key, String(value));
            }
            next.delete('page');
            navigate(`/category/all?${next}`);
    };

    const saveSearch = async () => {
        if (!requireAuth('lưu bộ lọc tìm kiếm')) return;
        const url = `${location.pathname}${location.search}`;
        if (savedSearches.some(item => item.url === url)) { message.info('Bộ lọc này đã được lưu.'); return; }
        if (savedSearches.length >= 10) { message.info('Bạn có thể lưu tối đa 10 bộ lọc.'); return; }
        if (await savePersonal({ savedSearches: [...savedSearches, { name: `${title}${searchParams.get('search') ? ` · ${searchParams.get('search')}` : ''}`.slice(0, 80), url }] })) message.success('Đã lưu bộ lọc.');
    };

    const applyPrice = () => {
        updateFilters({ minPrice: priceDraft[0] === 0 ? null : priceDraft[0],
            maxPrice: priceDraft[1] >= priceMax ? null : priceDraft[1] });
    };

    const current = result.key === requestKey ? result : { data: null, error: null, loading: true };

    return (
        <div className={cx('wrapper')}>
            <Header />
            <main className={cx('main')}>
                <div className={cx('heading')}>
                    <h1>{title}</h1>
                    <span>{current.data?.total ?? 0} sản phẩm</span>
                </div>
                {brandInfo?.description && <p className="brand-intro">{brandInfo.description}</p>}
                {catalogOptionsError && <Alert type="warning" message="Chưa tải được các lựa chọn bộ lọc." action={<Button onClick={reloadCatalogOptions}>Thử lại</Button>} />}
                <Space wrap style={{ marginTop: 16 }}>
                    <Input.Search key={searchParams.get('search') || ''} defaultValue={searchParams.get('search') || ''}
                        placeholder="Tìm tên, thương hiệu hoặc mã sản phẩm" aria-label="Tìm trong danh mục" maxLength={100}
                        onSearch={value => updateFilters({ search: value.trim() })} style={{ width: 'min(100%, 360px)' }} />
                    <Button onClick={saveSearch} disabled={preferencesBusy}>Lưu bộ lọc</Button>
                    <Button onClick={() => navigate('/category/all')}>Xóa tất cả bộ lọc</Button>
                </Space>
                {savedSearches.length > 0 && <Space wrap className="catalog-section">
                    <span>Bộ lọc đã lưu:</span>{savedSearches.map((item, index) => <Tag key={item.url} closable={!preferencesBusy}
                        onClose={event => { event.preventDefault(); savePersonal({ savedSearches: savedSearches.filter((_, i) => i !== index) }); }}><Link to={item.url}>{item.name}</Link></Tag>)}
                </Space>}
                <div className={cx('filters')} aria-label="Bộ lọc sản phẩm">
                    <span className={cx('filter-label')}><Filter size={17} /> Bộ lọc</span>
                        <Select aria-label="Danh mục" value={selectedCategory || 'all'} className={cx('category-select')}
                            onChange={value => updateFilters({ category: value })}
                            options={[{ value: 'all', label: 'Tất cả danh mục' },
                                ...(options?.categories || []).map(item => ({ value: item._id, label: item.name }))]} />
                    <Select aria-label="Thương hiệu" placeholder="Thương hiệu" allowClear showSearch value={selectedBrand || undefined}
                        style={{ minWidth: 170 }} onChange={value => updateFilters({ brand: value })}
                        filterOption={(input, option) => foldText(option.label).includes(foldText(input))}
                        options={(options?.brands || []).map(value => ({ value, label: value }))} />
                    {[['collection', 'Bộ sưu tập'], ['gender', 'Giới tính'], ['movement', 'Bộ máy'],
                        ['strapMaterial', 'Chất liệu dây'], ['faceColor', 'Màu mặt']].map(([key, label]) => (
                        <Select key={key} aria-label={label} placeholder={label} allowClear showSearch style={{ minWidth: 160, maxWidth: 240 }}
                            value={searchParams.get(key) || undefined} onChange={value => updateFilters({ [key]: value })}
                            filterOption={(input, option) => foldText(option.label).includes(foldText(input))}
                            options={(options?.[key] || []).map(value => ({ value, label: key === 'movement' ? movementLabel(value) : value === 'Unisex' ? 'Nam và nữ (Unisex)' : value }))} />
                    ))}
                    <Space wrap><span>Kích thước mặt (mm)</span>
                        {[['minDiameter', 'Nhỏ nhất'], ['maxDiameter', 'Lớn nhất']].map(([key, label]) => <InputNumber key={key} min={0} max={100}
                            aria-label={`Kích thước ${label.toLowerCase()}`} placeholder={label} value={searchParams.has(key) ? Number(searchParams.get(key)) : null}
                            onChange={value => updateFilters({ [key]: value })} />)}
                    </Space>
                    <div className={cx('price-range')}>
                        <span className={cx('price-title')}>Lọc theo giá</span>
                        <Slider range min={0} max={priceMax} step={1000} value={priceDraft}
                            disabled={optionsLoading} onChange={setPriceDraft}
                            tooltip={{ formatter: formatPrice }} aria-label="Khoảng giá" />
                        <div className={cx('price-actions')}>
                            <Button onClick={applyPrice} disabled={optionsLoading}>Lọc</Button>
                            <span>Giá: <strong>{formatPrice(priceDraft[0])} – {formatPrice(priceDraft[1])}</strong></span>
                        </div>
                    </div>
                    <Segmented aria-label="Tình trạng hàng" value={stock}
                        options={[{ label: 'Tất cả', value: 'all' }, { label: 'Còn hàng', value: 'in' },
                            { label: 'Hàng đặt', value: 'order' }]}
                        onChange={value => updateFilters({ stock: value })} />
                    <Select aria-label="Sắp xếp sản phẩm" value={searchParams.get('sort') || 'newest'} style={{ minWidth: 190 }}
                        onChange={value => updateFilters({ sort: value })} options={[
                            ['newest', 'Mới nhất'], ['priceAsc', 'Giá tăng dần'], ['priceDesc', 'Giá giảm dần'],
                            ['popular', 'Bán chạy'], ['discount', 'Giảm giá nhiều nhất'],
                        ].map(([value, label]) => ({ value, label }))} />
                </div>
                <Space wrap style={{ marginBottom: 16 }}>{[...searchParams].filter(([key]) => !['page', 'category', 'brand'].includes(key)).map(([key, value]) => (
                    <Tag key={key} closable onClose={event => { event.preventDefault(); updateFilters({ [key]: null }); }}>
                        {({ search: 'Từ khóa', minPrice: 'Giá từ', maxPrice: 'Giá đến', minDiameter: 'Kích thước từ', maxDiameter: 'Kích thước đến',
                            collection: 'Bộ sưu tập', gender: 'Giới tính', movement: 'Bộ máy', strapMaterial: 'Dây', faceColor: 'Màu mặt', stock: 'Tồn kho', sort: 'Sắp xếp' })[key] || 'Bộ lọc'}:
                        {' '}{['minPrice', 'maxPrice'].includes(key) ? money(value) : ({ in: 'Còn hàng', order: 'Nhận đặt', all: 'Tất cả', newest: 'Mới nhất', popular: 'Bán chạy', priceAsc: 'Giá tăng', priceDesc: 'Giá giảm', discount: 'Giảm giá' })[value] || movementLabel(value)}
                    </Tag>
                ))}</Space>
                {current.error ? (
                    <Alert type="error" showIcon message={current.error}
                        action={<Button icon={<RefreshCw size={16} />} onClick={() => setAttempt(value => value + 1)}>Thử lại</Button>} />
                ) : current.loading ? (
                    <div className={cx('products')} aria-busy="true">
                        {Array.from({ length: 10 }, (_, index) => <Skeleton key={index} active paragraph={{ rows: 3 }} />)}
                    </div>
                ) : !current.data?.items?.length ? (
                    <Empty description="Không có sản phẩm phù hợp" />
                ) : (
                    <>
                        <div className={cx('products')}>
                            {current.data.items.map(product => <CardBody key={product._id} item={product} variant="catalog" />)}
                        </div>
                        {current.data.totalPages > 1 && (
                            <Pagination className={cx('pagination')} current={current.data.page}
                                pageSize={20} total={current.data.total} showSizeChanger={false}
                                onChange={page => setSearchParams(previous => {
                                    const next = new URLSearchParams(previous);
                                    next.set('page', String(page));
                                    return next;
                                })} />
                        )}
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
}

export default Category;
