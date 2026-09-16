import classNames from 'classnames/bind';
import styles from './Header.module.scss';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

import logo from '../../assets/images/logo.webp';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown } from 'antd';

import { requestLogout, requestSearch } from '../../config/request';

import { UserOutlined, ShoppingOutlined, LogoutOutlined, ShoppingCartOutlined } from '@ant-design/icons';

import { useStore } from '../../hooks/userStore';
import { useEffect, useState } from 'react';

import useDebounce from '../../hooks/useDebounce';

const cx = classNames.bind(styles);
function Header() {
    const { dataUser, dataCart, category } = useStore();

    const [idCategory, setIdCategory] = useState('all');
    const [nameCategory, setNameCategory] = useState('Tất cả sản phẩm');

    const [valueSearch, setValueSearch] = useState('');
    const [dataSearch, setDataSearch] = useState([]);

    const debound = useDebounce(valueSearch, 800);

    useEffect(() => {
        const fetchSearch = async () => {
            const res = await requestSearch(debound);
            setDataSearch(res.metadata);
        };
        if (debound === '') return;
        fetchSearch();
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
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                navigate('/');
            },
        },
    ];

    const onNavigate = () => {
        localStorage.setItem('nameCategory', nameCategory);
        navigate(`/category/${idCategory}`);
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <div>
                    <Link to="/">
                        <img src={logo} alt="logo" />
                    </Link>
                </div>

                <div className={cx('search-box')}>
                    <select
                        name=""
                        id=""
                        onChange={(e) => {
                            setIdCategory(e.target.value);
                            setNameCategory(e.target.options[e.target.selectedIndex].text);
                        }}
                    >
                        <option value="all">Tất cả sản phẩm</option>
                        {category.map((item) => (
                            <option key={item._id} value={item._id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                    <input type="text" placeholder="Tìm kiếm" onChange={(e) => setValueSearch(e.target.value)} />
                    {valueSearch && (
                        <div className={cx('search-result-wrapper')}>
                            {dataSearch.length > 0 ? (
                                <div className={cx('search-result')}>
                                    {dataSearch.map((item) => (
                                        <Link id={cx('search-result-item')} to={`/product/${item._id}`} key={item.id}>
                                            <div className={cx('search-result-item')}>
                                                <img
                                                    src={`${import.meta.env.VITE_URL_IMAGE_API}/${
                                                        item.images.split(',')[0]
                                                    }`}
                                                    alt=""
                                                />
                                                <div className={cx('search-result-item-info')}>
                                                    <h3>{item.nameProduct}</h3>
                                                    <p>{item.price.toLocaleString('vi-VN')}đ</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className={cx('search-result-empty')}>Không tìm thấy kết quả</div>
                            )}
                        </div>
                    )}
                    <button onClick={onNavigate}>
                        <FontAwesomeIcon icon={faSearch} />
                    </button>
                </div>

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
