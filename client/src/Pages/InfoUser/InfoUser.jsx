import { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Card, Input, Button, Form, message } from 'antd';
import {
    UserOutlined,
    ShoppingOutlined,
    HeartOutlined,
    LogoutOutlined,
    EditOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import Footer from '../../Components/Footer/Footer';
import Header from '../../Components/Header/Header';

import style from './InfoUser.module.scss';
import classNames from 'classnames/bind';
import { useStore } from '../../hooks/userStore';
import OrderUser from './OrderUser/OrderUser';
import { requestUpdateUser } from '../../config/request';

const cx = classNames.bind(style);

const { Content, Sider } = Layout;
const { Title } = Typography;

function InfoUser() {
    const [selectedKey, setSelectedKey] = useState('1');
    const [isEditing, setIsEditing] = useState(false);
    const { dataUser, getAuthUser } = useStore();
    const [form] = Form.useForm();

    const handleEdit = () => {
        form.setFieldsValue({
            fullName: dataUser.fullName,
            address: dataUser.address,
            phone: dataUser.phone,
            email: dataUser.email,
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        form.validateFields()
            .then(async (values) => {
                const data = {
                    fullName: values.fullName,
                    address: values.address,
                    phone: values.phone,
                };

                await requestUpdateUser(data);
                await getAuthUser();
                console.log('Edited values:', values);
                // Here you would typically call an API to update the user information
                message.success('Cập nhật thông tin thành công!');
                setIsEditing(false);
            })
            .catch((error) => {
                console.error('Validation failed:', error);
            });
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const renderContent = () => {
        switch (selectedKey) {
            case '1':
                return (
                    <Card
                        title="Thông tin cá nhân"
                        bordered={false}
                        extra={
                            isEditing ? (
                                <div className={cx('edit-buttons')}>
                                    <Button
                                        type="primary"
                                        icon={<SaveOutlined />}
                                        onClick={handleSave}
                                        className={cx('save-btn')}
                                    >
                                        Lưu
                                    </Button>
                                    <Button onClick={handleCancel} className={cx('cancel-btn')}>
                                        Hủy
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    type="primary"
                                    icon={<EditOutlined />}
                                    onClick={handleEdit}
                                    className={cx('edit-btn')}
                                >
                                    Chỉnh sửa
                                </Button>
                            )
                        }
                    >
                        <div className={cx('user-info-container')}>
                            <div className={cx('user-avatar')}>
                                <Avatar size={100} icon={<UserOutlined />} />
                            </div>
                            <Form form={form} layout="vertical" className={cx('user-details')}>
                                <div className={cx('info-item')}>
                                    <span className={cx('label')}>Họ tên:</span>
                                    {isEditing ? (
                                        <Form.Item
                                            name="fullName"
                                            className={cx('value')}
                                            rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                                        >
                                            <Input />
                                        </Form.Item>
                                    ) : (
                                        <span className={cx('value')}>{dataUser.fullName}</span>
                                    )}
                                </div>
                                <div className={cx('info-item')}>
                                    <span className={cx('label')}>Email:</span>
                                    {isEditing ? (
                                        <Form.Item name="email" className={cx('value')}>
                                            <Input disabled />
                                        </Form.Item>
                                    ) : (
                                        <span className={cx('value')}>{dataUser.email}</span>
                                    )}
                                </div>
                                <div className={cx('info-item')}>
                                    <span className={cx('label')}>Số điện thoại:</span>
                                    {isEditing ? (
                                        <Form.Item name="phone" className={cx('value')}>
                                            <Input />
                                        </Form.Item>
                                    ) : (
                                        <span className={cx('value')}>{dataUser.phone}</span>
                                    )}
                                </div>
                                <div className={cx('info-item')}>
                                    <span className={cx('label')}>Địa chỉ:</span>
                                    {isEditing ? (
                                        <Form.Item
                                            name="address"
                                            className={cx('value')}
                                            rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
                                        >
                                            <Input.TextArea rows={2} />
                                        </Form.Item>
                                    ) : (
                                        <span className={cx('value')}>{dataUser.address}</span>
                                    )}
                                </div>
                            </Form>
                        </div>
                    </Card>
                );
            case '2':
                return (
                    <Card title="Quản lý đơn hàng" bordered={false}>
                        <OrderUser />
                    </Card>
                );

            default:
                return <div>Chọn một mục từ menu</div>;
        }
    };

    const handleMenuClick = (e) => {
        setSelectedKey(e.key);
        if (e.key === '4') {
            // Xử lý đăng xuất ở đây
            console.log('Đăng xuất');
        }
    };

    return (
        <div>
            <header>
                <Header />
            </header>
            <main>
                <Layout className={cx('user-info-layout')}>
                    <Sider width={250} className={cx('user-sidebar')}>
                        <Title level={4} className={cx('sidebar-title')}>
                            Tài khoản của tôi
                        </Title>
                        <Menu
                            mode="inline"
                            selectedKeys={[selectedKey]}
                            onClick={handleMenuClick}
                            items={[
                                {
                                    key: '1',
                                    icon: <UserOutlined />,
                                    label: 'Thông tin cá nhân',
                                },
                                {
                                    key: '2',
                                    icon: <ShoppingOutlined />,
                                    label: 'Quản lý đơn hàng',
                                },

                                {
                                    key: '4',
                                    icon: <LogoutOutlined />,
                                    label: 'Đăng xuất',
                                },
                            ]}
                        />
                    </Sider>
                    <Content className={cx('user-content')}>{renderContent()}</Content>
                </Layout>
            </main>
            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default InfoUser;
