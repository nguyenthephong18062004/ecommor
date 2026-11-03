import classNames from 'classnames/bind';
import styles from './Header.module.scss';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown } from 'antd';
import { apiClient } from '../../config/axiosClient';
import { money, salePrice } from '../../utils/format';
import { ChevronDown } from 'lucide-react';

import { requestLogout } from '../../config/request';
import { uploadUrl } from '../../config/runtimeUrls';

import { UserOutlined, ShoppingOutlined, LogoutOutlined, ShoppingCartOutlined } from '@ant-design/icons';

import { useStore } from '../../hooks/userStore';
import { useEffect, useState } from 'react';

import useDebounce from '../../hooks/useDebounce';

const cx = classNames.bind(styles);
function Header() {
    const { dataUser, dataCart, clearAuth, wishlist, compare, catalogOptions } = useStore();

    const [valueSearch, setValueSearch] = useState('');
    const [dataSearch, setDataSearch] = useState([]);
    const [searchState, setSearchState] = useState('');

    const debound = useDebounce(valueSearch, 300);

    useEffect(() => {
        const controller = new AbortController();
        setDataSearch([]);
        if (!debound.trim()) { setSearchState(''); return () => controller.abort(); }
        setSearchState('Đang tìm kiếm...');
        apiClient.get('/api/search', { params: { valueSearch: debound.trim() }, signal: controller.signal, timeout: 10000 })
            .then(({ data }) => { if (!controller.signal.aborted) { setDataSearch(data.metadata); setSearchState(''); } })
            .catch(() => { if (!controller.signal.aborted) setSearchState('Chưa tìm kiếm được. Bạn có thể bấm Enter để thử lại.'); });
        return () => controller.abort();
    }, [debound]);

    const navigate = useNavigate();

    const items = [
        {
            key: '1',
            label: <Link to="/profile">Thông tin tài khoản</Link>,
            icon: <UserOutlined />,
        },
        {
            key: '2',
            label: <Link to="/orders">Đơn hàng của tôi</Link>,
            icon: <ShoppingOutlined />,
        },
        {
            key: '3',
            label: 'Đăng xuất',
            icon: <LogoutOutlined />,
            danger: true,
            onClick: async () => {
                await requestLogout();
                clearAuth();
                navigate('/');
            },
        },
    ];

    const watchItems = [
        { key: 'all', label: <Link to="/category/all">Tất cả đồng hồ</Link> },
        { type: 'group', label: 'Danh mục', children: (catalogOptions?.categories || []).map(item => ({
            key: `category:${item._id}`, label: <Link to={`/category/${item._id}`}>{item.name}</Link>,
        })) },
        { type: 'group', label: 'Thương hiệu', children: (catalogOptions?.brands || []).map(brand => ({
            key: `brand:${brand}`, label: <Link to={`/category/brand/${encodeURIComponent(brand)}`}>{brand}</Link>,
        })) },
    ];

    const submitSearch = event => {
        event.preventDefault();
        navigate(valueSearch.trim() ? `/category/all?search=${encodeURIComponent(valueSearch.trim())}` : '/category/all');
        setValueSearch('');
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <div>
                    <Link to="/" className="brand-name" aria-label="ECOMMOR — Trang chủ">ECOMMOR</Link>
                </div>

                <form className={cx('search-box')} onSubmit={submitSearch}>
                    <input type="search" value={valueSearch} placeholder="Tìm thương hiệu, tên hoặc mã sản phẩm" aria-label="Tìm đồng hồ"
                        onChange={(e) => setValueSearch(e.target.value)} />
                    {valueSearch && (
                        <div className={cx('search-result-wrapper')}>
                            {dataSearch.length > 0 ? (
                                <div className={cx('search-result')}>
                                    {dataSearch.map((item) => (
                                        <Link id={cx('search-result-item')} to={`/product/${item._id}`} key={item._id} onClick={() => setValueSearch('')}>
                                            <div className={cx('search-result-item')}>
                                                <img
                                                    src={uploadUrl(item.images.split(',')[0])}
                                                    alt=""
                                                />
                                                <div className={cx('search-result-item-info')}>
                                                    <h3>{item.nameProduct}</h3>
                                                    <p>{money(salePrice(item))}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className={cx('search-result-empty')} role="status">{searchState || 'Không tìm thấy kết quả'}</div>
                            )}
                        </div>
                    )}
                    <button type="submit" aria-label="Tìm sản phẩm">
                        <FontAwesomeIcon icon={faSearch} />
                    </button>
                </form>

                <Dropdown menu={{ items: watchItems }} trigger={['hover', 'click']} placement="bottomLeft"
                    overlayClassName={cx('watch-dropdown')}>
                    <div className={cx('watch-nav')}>
                        <Link className={cx('watch-link')} to="/category/all">Đồng hồ</Link>
                        <button className={cx('watch-trigger')} type="button" aria-label="Danh mục và thương hiệu"
                            title="Danh mục và thương hiệu"><ChevronDown size={16} /></button>
                    </div>
                </Dropdown>

                <Link className={cx('contact-link')} to="/blogs">Tin tức</Link>
                <Link className={cx('contact-link')} to="/thuong-hieu">Thương hiệu</Link>
                <Link className={cx('contact-link')} to="/yeu-thich">Yêu thích ({wishlist.length})</Link>
                <Link className={cx('contact-link')} to="/so-sanh">So sánh ({compare.length})</Link>
                <Link className={cx('contact-link')} to="/contact">Liên hệ</Link>

                <div className={cx('auth-box')}>
                    {!dataUser._id ? (
                        <>
                            <Link to="/login">
                                <button className={cx('button-login')}>Đăng nhập</button>
                            </Link>
                            <Link to="/register">
                                <button className={cx('button-register')}>Đăng ký</button>
                            </Link>
                        </>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Link id={cx('link')} to="/cart">
                                <div className={cx('cart-box')}>
                                    <ShoppingCartOutlined style={{ fontSize: '18px' }} /> Giỏ hàng (
                                    {dataCart?.cartItems?.length || 0})
                                </div>
                            </Link>
                            <Dropdown menu={{ items }} placement="bottomRight" arrow>
                                <div className={cx('user-avatar')}>
                                    {dataUser.avatar ? (
                                        <Avatar src={dataUser.avatar} size={40} />
                                    ) : (
                                        <Avatar
                                            size={40}
                                            icon={<UserOutlined />}
                                            style={{
                                                backgroundColor: '#87d068',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        />
                                    )}
                                </div>
                            </Dropdown>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Header;
