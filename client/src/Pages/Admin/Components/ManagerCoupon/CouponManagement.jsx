import React, { useEffect, useState } from 'react';
import {
    Table,
    Card,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    DatePicker,
    message,
    Space,
    Tag,
    Select,
    Tooltip,
    Badge,
    Progress,
} from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    GiftOutlined,
    CalendarOutlined,
    DollarOutlined,
    TagOutlined,
} from '@ant-design/icons';
import classNames from 'classnames/bind';
import styles from './CouponManagement.module.scss';
import dayjs from 'dayjs';
import {
    requestCreateCoupon,
    requestDeleteCoupon,
    requestGetAllCoupon,
    requestGetAllProduct,
    requestUpdateCoupon,
} from '../../../../config/request';

const cx = classNames.bind(styles);
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

function CouponManagement() {
    // Mock data
    const [products, setProducts] = useState([]);

    const [coupons, setCoupons] = useState([]);

    const fetchData = async () => {
        const res = await requestGetAllProduct();
        setProducts(res.metadata);
    };

    const fetchCoupons = async () => {
        const res = await requestGetAllCoupon();
        setCoupons(res.coupons);
    };

    useEffect(() => {
        fetchCoupons();
        fetchData();
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [editingCoupon, setEditingCoupon] = useState(null);

    const showModal = (coupon = null) => {
        setEditingCoupon(coupon);
        if (coupon) {
            form.setFieldsValue({
                nameCoupon: coupon.nameCoupon,
                discount: coupon.discount,
                quantity: coupon.quantity,
                dateRange: [dayjs(coupon.startDate), dayjs(coupon.endDate)],
                minPrice: coupon.minPrice,
                isActive: coupon.isActive,
            });
        } else {
            form.resetFields();
            form.setFieldsValue({
                isActive: true,
                productUsed: ['all'],
            });
        }
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

    const handleSubmit = () => {
        form.validateFields()
            .then(async (values) => {
                const { dateRange, ...rest } = values;
                const couponData = {
                    ...rest,
                    startDate: dateRange[0].format('YYYY-MM-DD'),
                    endDate: dateRange[1].format('YYYY-MM-DD'),
                };

                if (editingCoupon) {
                    // Update existing coupon
                    const updatedCoupons = {
                        ...couponData,
                        _id: editingCoupon._id,
                    };
                    console.log(updatedCoupons);

                    await requestUpdateCoupon(updatedCoupons);
                    fetchCoupons();
                    message.success('Mã giảm giá đã được cập nhật!');
                } else {
                    // Add new coupon
                    const newCoupon = {
                        _id: Date.now().toString(),
                        ...couponData,
                        used: 0,
                    };

                    await requestCreateCoupon(newCoupon);
                    fetchCoupons();
                    message.success('Mã giảm giá đã được thêm mới!');
                }
                setIsModalOpen(false);
                form.resetFields();
            })
            .catch((info) => {
                console.log('Validate Failed:', info);
            });
    };

    const handleDelete = async (id) => {
        Modal.confirm({
            title: 'Bạn có chắc chắn muốn xóa mã giảm giá này?',
            content: 'Hành động này không thể hoàn tác.',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            async onOk() {
                await requestDeleteCoupon(id);
                fetchCoupons();
                message.success('Mã giảm giá đã được xóa!');
            },
        });
    };

    const getProductNames = (productIds) => {
        if (productIds.includes('all')) {
            return 'Tất cả sản phẩm';
        }

        return productIds
            .map((id) => {
                const product = products.find((p) => p._id === id);
                return product ? product.nameProduct : '';
            })
            .join(', ');
    };

    const columns = [
        {
            title: 'Mã giảm giá',
            dataIndex: 'nameCoupon',
            key: 'nameCoupon',
            render: (text) => (
                <div className={cx('coupon-code')}>
                    <TagOutlined className={cx('coupon-icon')} />
                    <span className={cx('code')}>{text}</span>
                </div>
            ),
        },
        {
            title: 'Giảm giá',
            dataIndex: 'discount',
            key: 'discount',
            render: (discount) => (
                <Tag color="#f50" className={cx('discount-tag')}>
                    {discount.toLocaleString('vi-VN')}đ
                </Tag>
            ),
        },
        {
            title: 'Số lượng còn lại',
            key: 'quantity',
            render: (_, record) => {
                return (
                    <div className={cx('usage-info')}>
                        <span>{record.quantity} lượt sử dụng</span>
                    </div>
                );
            },
        },
        {
            title: 'Thời gian',
            key: 'time',
            render: (_, record) => (
                <div className={cx('date-info')}>
                    <CalendarOutlined className={cx('date-icon')} />
                    <span>
                        {dayjs(record.startDate).format('DD/MM/YYYY')} ~ {dayjs(record.endDate).format('DD/MM/YYYY')}
                    </span>
                </div>
            ),
        },
        {
            title: 'Đơn tối thiểu',
            dataIndex: 'minPrice',
            key: 'minPrice',
            render: (minPrice) => (
                <div className={cx('min-price')}>
                    <DollarOutlined className={cx('price-icon')} />
                    {minPrice.toLocaleString('vi-VN')}đ
                </div>
            ),
        },

        {
            title: 'Thao tác',
            key: 'actions',
            width: 180,
            render: (_, record) => (
                <Space size="small" className={cx('action-buttons')}>
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() => showModal(record)}
                            size="middle"
                        />
                    </Tooltip>
                    <Tooltip title="Xóa">
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record._id)}
                            size="middle"
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div className={cx('coupon-management')}>
            <div className={cx('header')}>
                <div className={cx('title-section')}>
                    <h2>Quản lý mã giảm giá</h2>
                    <p className={cx('subtitle')}>Quản lý các mã giảm giá trong cửa hàng</p>
                </div>
                <div className={cx('actions')}>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => showModal()}
                        className={cx('add-button')}
                    >
                        Thêm mã giảm giá
                    </Button>
                </div>
            </div>

            <Card className={cx('table-card')}>
                <Table
                    dataSource={coupons}
                    columns={columns}
                    rowKey="_id"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        pageSizeOptions: ['5', '10', '20'],
                        showTotal: (total) => `Tổng cộng ${total} mã giảm giá`,
                    }}
                    className={cx('coupons-table')}
                    rowClassName={(record) => (!record.isActive ? cx('inactive-row') : '')}
                />
            </Card>

            <Modal
                title={
                    <div className={cx('modal-title')}>
                        <GiftOutlined className={cx('modal-icon')} />
                        {editingCoupon ? 'Cập nhật mã giảm giá' : 'Thêm mã giảm giá mới'}
                    </div>
                }
                open={isModalOpen}
                onCancel={handleCancel}
                onOk={handleSubmit}
                okText={editingCoupon ? 'Cập nhật' : 'Thêm mới'}
                cancelText="Hủy"
                width={600}
                className={cx('coupon-modal')}
            >
                <Form form={form} layout="vertical" name="coupon_form">
                    <Form.Item
                        name="nameCoupon"
                        label="Mã giảm giá"
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng nhập mã giảm giá!',
                            },
                            {
                                pattern: /^[A-Z0-9]+$/,
                                message: 'Mã giảm giá chỉ chấp nhận chữ in hoa và số!',
                            },
                        ]}
                    >
                        <Input
                            prefix={<GiftOutlined />}
                            placeholder="Nhập mã giảm giá (VD: SUMMER2023)"
                            style={{ textTransform: 'uppercase' }}
                        />
                    </Form.Item>

                    <div className={cx('form-row')}>
                        <Form.Item
                            name="discount"
                            label="Giảm giá (đ)"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập giá trị giảm giá!',
                                },
                            ]}
                            className={cx('discount-input')}
                        >
                            <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập giá trị giảm giá" />
                        </Form.Item>

                        <Form.Item
                            name="quantity"
                            label="Số lượng"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập số lượng!',
                                },
                            ]}
                            className={cx('quantity-input')}
                        >
                            <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập số lượng mã giảm giá" />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="dateRange"
                        label="Thời gian hiệu lực"
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng chọn thời gian hiệu lực!',
                            },
                        ]}
                    >
                        <RangePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                    </Form.Item>

                    <Form.Item
                        name="minPrice"
                        label="Đơn hàng tối thiểu"
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng nhập đơn hàng tối thiểu!',
                            },
                        ]}
                    >
                        <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                            formatter={(value) => `${value} đ`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={(value) => value.replace(/\s?đ\s?|(,*)/g, '')}
                            placeholder="Nhập giá trị đơn hàng tối thiểu"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default CouponManagement;
