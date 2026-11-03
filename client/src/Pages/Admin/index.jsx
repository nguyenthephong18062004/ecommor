import { lazy, Suspense, useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Button, Tooltip, message, theme, Typography } from 'antd';
import {
    DashboardOutlined,
    AppstoreOutlined,
    ShoppingOutlined,
    UserOutlined,
    ShoppingCartOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    GiftOutlined,
    MessageOutlined,
    BookOutlined,
    LogoutOutlined,
} from '@ant-design/icons';
import styles from './index.module.scss';
import classNames from 'classnames/bind';










import React from 'react';

import { requestLogout } from '../../config/request';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;
const cx = classNames.bind(styles);

const panels = {
    dashboard: lazy(() => import('./Components/ManagerStatistical/ManagerStatistical')),
    categories: lazy(() => import('./Components/ManagerCategory/ManagerCategory')),
    products: lazy(() => import('./Components/ManagerProduct/ManagerProduct')),
    users: lazy(() => import('./Components/ManagerUser/ManagerUser')),
    orders: lazy(() => import('./Components/ManagerOrder/ManagerOrder')),
    preorders: lazy(() => import('./Components/ManagerPreorder/ManagerPreorder')),
    coupons: lazy(() => import('./Components/ManagerCoupon/CouponManagement')),
    messages: lazy(() => import('./Components/Messager/Messager')),
    blogs: lazy(() => import('./Components/ManagerBlog/BlogAdmin')),
    brands: lazy(() => import('./Components/ManagerBrands')),
    reviews: lazy(() => import('./Components/ManagerReviews')),
};

function AdminLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const [selectedKey, setSelectedKey] = useState('dashboard');
    const ActivePanel = panels[selectedKey] || panels.dashboard;

    const {
        token: { colorBgContainer, borderRadius },
    } = theme.useToken();

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setCollapsed(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Define menu items for the sidebar
    const menuItems = [
        { key: 'brands', icon: <ShoppingOutlined />, label: 'Quản lý thương hiệu' },
        { key: 'reviews', icon: <BookOutlined />, label: 'Duyệt đánh giá' },
        {
            key: 'dashboard',
            icon: <DashboardOutlined />,
            label: 'Thống kê',
        },
        {
            key: 'categories',
            icon: <AppstoreOutlined />,
            label: 'Quản lý danh mục',
        },
        {
            key: 'products',
            icon: <ShoppingOutlined />,
            label: 'Quản lý sản phẩm',
        },
        {
            key: 'users',
            icon: <UserOutlined />,
            label: 'Quản lý người dùng',
        },
        {
            key: 'orders',
            icon: <ShoppingCartOutlined />,
            label: 'Quản lý đơn hàng',
        },
        {
            key: 'preorders',
            icon: <ShoppingOutlined />,
            label: 'Yêu cầu đặt hàng',
        },
        {
            key: 'coupons',
            icon: <GiftOutlined />,
            label: 'Quản lý mã giảm giá',
        },
        {
            key: 'blogs',
            icon: <BookOutlined />,
            label: 'Quản lý bài viết',
        },
        {
            key: 'messages',
            icon: <MessageOutlined />,
            label: 'Tin nhắn',
        },
    ];

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await requestLogout();
            window.location.replace('/login');
        } catch (error) {
            message.error(error.response?.data?.message || 'Đăng xuất thất bại!');
            setIsLoggingOut(false);
        }
    };

    return (
        <Layout className={cx('admin-layout')}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                className={cx('sidebar')}
                width={260}
                theme="light"
                breakpoint="lg"
                onBreakpoint={(broken) => {
                    if (broken) {
                        setCollapsed(true);
                    }
                }}
            >
                <div className={cx('logo')}>
                    {!collapsed ? (
                        <div className={cx('logo-full')}>
                            <div className={cx('logo-icon')}></div>
                            <h2>Quản trị</h2>
                        </div>
                    ) : (
                        <div className={cx('logo-icon')}></div>
                    )}
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    onClick={({ key }) => setSelectedKey(key)}
                    items={menuItems}
                    className={cx('menu')}
                />
                <div className={cx('sidebar-footer')}>
                    <div className={cx('admin-info')}>
                        {!collapsed && (
                            <>
                                <Avatar size={40} icon={<UserOutlined />} className={cx('admin-avatar')} />
                                <div className={cx('admin-details')}>
                                    <Text strong className={cx('admin-name')}>
                                        Quản trị viên
                                    </Text>
                                    <Text type="secondary" className={cx('admin-role')}>
                                        Quản trị viên
                                    </Text>
                                </div>
                            </>
                        )}
                        {collapsed && <Avatar size={40} icon={<UserOutlined />} className={cx('admin-avatar')} />}
                    </div>
                </div>
            </Sider>
            <Layout>
                <Header className={cx('header')} style={{ background: colorBgContainer }}>
                    <div className={cx('header-left')}>
                        {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                            className: cx('trigger'),
                            onClick: () => setCollapsed(!collapsed),
                        })}
                        <div className={cx('header-title')}>
                            <h2>
                                {menuItems.find((item) => item.key === selectedKey)?.label || 'Bảng điều khiển'}
                            </h2>
                        </div>
                    </div>
                    <div className={cx('header-actions')}>
                        <Tooltip title="Đăng xuất">
                            <Button
                                type="text"
                                danger
                                aria-label="Đăng xuất"
                                className={cx('logout-button')}
                                icon={<LogoutOutlined />}
                                loading={isLoggingOut}
                                onClick={handleLogout}
                            />
                        </Tooltip>
                    </div>
                </Header>
                <Content className={cx('content')}>
                    <div
                        style={{
                            background: colorBgContainer,
                            borderRadius: parseInt(borderRadius),
                        }}
                        className={cx('content-container')}
                    >
                        <Suspense fallback={<p role="status">Đang tải trang quản trị...</p>}><ActivePanel /></Suspense>
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}

export default AdminLayout;
