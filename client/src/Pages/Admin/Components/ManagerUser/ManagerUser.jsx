import { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './ManagerUser.module.scss';
import { Table, Switch, message, Typography, Space, Button } from 'antd';
import { requestGetAllUser, requestUpdateUser, requestUpdateUserAdmin } from '../../../../config/request';

const { Title } = Typography;
const cx = classNames.bind(styles);

function ManagerUser() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [updateLoading, setUpdateLoading] = useState({});

    useEffect(() => {
        document.title = 'Quản lý tài khoản';
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await requestGetAllUser();
            setUsers(response.metadata);
        } catch (error) {
            message.error('Không thể tải danh sách người dùng');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAdmin = async (checked, userId) => {
        console.log(userId);

        setUpdateLoading((prev) => ({ ...prev, [userId]: true }));
        try {
            await requestUpdateUserAdmin({ id: userId, isAdminUser: checked ? true : false });
            message.success('Cập nhật quyền thành công');

            fetchUsers();
        } catch (error) {
            message.error('Cập nhật quyền thất bại');
            console.error(error);
        } finally {
            setUpdateLoading((prev) => ({ ...prev, [userId]: false }));
        }
    };

    const columns = [
        {
            title: 'Họ tên',
            dataIndex: 'fullName',
            key: 'fullName',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Quyền quản trị',
            key: 'isAdmin',
            render: (_, record) => (
                <Switch
                    checked={record.isAdmin}
                    onChange={(checked) => handleToggleAdmin(checked, record._id)}
                    loading={updateLoading[record.id]}
                    checkedChildren="Admin"
                    unCheckedChildren="User"
                />
            ),
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => (date ? new Date(date).toLocaleDateString() : ''),
        },
    ];

    return (
        <div className={cx('manager-user')}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div className={cx('header')}>
                    <Title level={4}>Quản lý người dùng</Title>
                </div>
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showTotal: (total) => `Tổng cộng ${total} người dùng`,
                    }}
                />
            </Space>
        </div>
    );
}

export default ManagerUser;
