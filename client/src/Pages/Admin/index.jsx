import { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, theme, Typography } from 'antd';
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
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './index.module.scss';
import classNames from 'classnames/bind';

import ManagerStatistical from './Components/ManagerStatistical/ManagerStatistical';
import ManagerCategory from './Components/ManagerCategory/ManagerCategory';
import ManagerProduct from './Components/ManagerProduct/ManagerProduct';
import ManagerUser from './Components/ManagerUser/ManagerUser';
import ManagerOrder from './Components/ManagerOrder/ManagerOrder';
import CouponManagement from './Components/ManagerCoupon/CouponManagement';
import Messager from './Components/Messager/Messager';

import React from 'react';
import BlogAdmin from './Components/ManagerBlog/BlogAdmin';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;
const cx = classNames.bind(styles);

function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const [selectedKey, setSelectedKey] = useState('dashboard');

    const {
        token: { colorBgContainer, borderRadius },
    } = theme.useToken();

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
            if (window.innerWidth <= 768) {
                setCollapsed(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Define menu items for the sidebar
    const menuItems = [
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

    // Get current selected key from URL path
    const getSelectedKey = () => {
        const path = location.pathname;
        const key = path.split('/').pop();
        return [key] || ['dashboard'];
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
                            <h2>Admin</h2>
                        </div>
                    ) : (
                        <div className={cx('logo-icon')}></div>
                    )}
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={getSelectedKey()}
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
                                        Admin
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
                                {menuItems.find((item) => item.key === getSelectedKey()[0])?.label || 'Bảng điều khiển'}
                            </h2>
                        </div>
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
                        {selectedKey === 'dashboard' && <ManagerStatistical />}
                        {selectedKey === 'categories' && <ManagerCategory />}
                        {selectedKey === 'products' && <ManagerProduct />}
                        {selectedKey === 'users' && <ManagerUser />}
                        {selectedKey === 'orders' && <ManagerOrder />}
                        {selectedKey === 'coupons' && <CouponManagement />}
                        {selectedKey === 'messages' && <Messager />}
                        {selectedKey === 'blogs' && <BlogAdmin />}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}

export default AdminLayout;
