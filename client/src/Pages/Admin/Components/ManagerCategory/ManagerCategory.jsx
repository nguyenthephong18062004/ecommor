import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import classNames from 'classnames/bind';
import styles from './ManagerCategory.module.scss';
import {
    requestCreateCategory,
    requestDeleteCategory,
    requestGetAllCategory,
    requestUpdateCategory,
} from '../../../../config/request';

const cx = classNames.bind(styles);

// Function for deleting category - would require backend route implementation
const deleteCategory = async (id) => {
    // This route would need to be implemented on the backend
    try {
        const res = await requestDeleteCategory(id);
        return res.data;
    } catch (error) {
        console.error('Delete category API not implemented:', error);
        message.warning('Chức năng xóa danh mục chưa được triển khai trên server');
        throw error;
    }
};

function ManagerCategory() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingCategory, setEditingCategory] = useState(null);

    // Fetch all categories
    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await requestGetAllCategory();
            setCategories(response.metadata);
        } catch (error) {
            message.error('Không thể tải danh sách danh mục');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Handle modal
    const showModal = (category = null) => {
        setEditingCategory(category);
        if (category) {
            form.setFieldsValue({ name: category.name });
        } else {
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
        setEditingCategory(null);
    };

    // Handle form submission
    const handleSubmit = async (values) => {
        try {
            if (editingCategory) {
                // Update existing category
                const data = {
                    id: editingCategory._id,
                    name: values.name,
                };
                await requestUpdateCategory(data);
                message.success('Cập nhật danh mục thành công');
            } else {
                // Create new category
                await requestCreateCategory(values);
                message.success('Tạo danh mục thành công');
            }
            handleCancel();
            fetchCategories();
        } catch (error) {
            if (!editingCategory) {
                message.error(error.response?.data?.message || 'Không thể tạo danh mục');
            }
            console.error(error);
        }
    };

    // Handle category deletion
    const handleDelete = async (id) => {
        try {
            await deleteCategory(id);
            message.success('Xóa danh mục thành công');
            fetchCategories();
        } catch (error) {
            console.error(error);
        }
    };

    // Table columns
    const columns = [
        {
            title: 'STT',
            dataIndex: 'index',
            key: 'index',
            render: (_, __, index) => index + 1,
            width: '10%',
        },
        {
            title: 'Tên danh mục',
            dataIndex: 'name',
            key: 'name',
            width: '60%',
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: '30%',
            render: (_, record) => (
                <Space size="middle">
                    <Button type="primary" icon={<EditOutlined />} onClick={() => showModal(record)}>
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Xóa danh mục"
                        description="Bạn có chắc chắn muốn xóa danh mục này? Tất cả sản phẩm thuộc danh mục này sẽ bị xóa"
                        onConfirm={() => handleDelete(record._id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button type="primary" danger icon={<DeleteOutlined />}>
                            Xóa
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <h2>Quản lý danh mục</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
                    Thêm danh mục
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={categories}
                rowKey="_id"
                loading={loading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                }}
            />

            <Modal
                title={editingCategory ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="name"
                        label="Tên danh mục"
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng nhập tên danh mục',
                            },
                        ]}
                    >
                        <Input placeholder="Nhập tên danh mục" />
                    </Form.Item>
                    <Form.Item className={cx('form-buttons')}>
                        <Space>
                            <Button onClick={handleCancel}>Hủy</Button>
                            <Button type="primary" htmlType="submit">
                                {editingCategory ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default ManagerCategory;
