import React, { useState, useEffect } from 'react';
import { Table, Tag, Select, Button, Card, Typography, Space, Modal, Divider, Row, Col, message, Image } from 'antd';
import { requestGetOrderAdmin, requestUpdateOrderStatus } from '../../../../config/request';
import { uploadUrl } from '../../../../config/runtimeUrls';
import ShippingPanel from './ShippingPanel';
import { shippingStatus } from '../../../../utils/shippingStatus';

const { Title, Text } = Typography;
const { Option } = Select;

function ManagerOrder() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await requestGetOrderAdmin();
            setOrders(response.metadata);
            setLoading(false);
            return response.metadata;
        } catch (error) {
            console.error('Error fetching orders:', error);
            setLoading(false);
            message.error('Không thể tải danh sách đơn hàng');
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            const data = {
                idOrder: orderId,
                status: newStatus,
            };
            await requestUpdateOrderStatus(data);

            const refreshed = await fetchOrders();

            message.success(`Trạng thái đơn hàng đã được thay đổi thành ${translateStatus(newStatus)}`);

            // Nếu đang xem chi tiết đơn hàng này, cập nhật trạng thái
            if (selectedOrder && selectedOrder._id === orderId) {
                setSelectedOrder(refreshed?.find((order) => order._id === orderId) || { ...selectedOrder, status: newStatus });
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            message.error(error.response?.data?.message || 'Không thể cập nhật trạng thái đơn hàng');
        }
    };

    const viewOrderDetails = (order) => {
        setSelectedOrder(order);
        setIsModalVisible(true);
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'warning';
            case 'confirmed':
                return 'processing';
            case 'shipped':
                return 'purple';
            case 'delivered':
                return 'success';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const translateStatus = (status) => {
        switch (status) {
            case 'pending':
                return 'Chờ xác nhận';
            case 'confirmed':
                return 'Đã xác nhận';
            case 'shipped':
                return 'Đang giao hàng';
            case 'delivered':
                return 'Đã giao hàng';
            case 'cancelled':
                return 'Đã hủy';
            default:
                return status;
        }
    };

    const translatePaymentMethod = (method) => {
        switch (method) {
            case 'COD':
                return 'Thanh toán khi nhận hàng';
            case 'VNPAY':
                return 'VNPAY';
            case 'MOMO':
                return 'Ví MOMO';
            default:
                return method;
        }
    };

    const statusChoices = (order) => (
        { pending: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'], shipped: ['delivered'] }[order.status] || []
    ).filter((status) => {
        if (order.paymentMethod !== 'VNPAY') return status !== 'cancelled' || order.paymentMethod === 'COD';
        return status === 'cancelled' ? ['pending', 'failed', 'expired'].includes(order.paymentStatus) : order.paymentStatus === 'paid';
    });

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('vi-VN');
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const columns = [
        {
            title: 'Mã đơn hàng',
            dataIndex: '_id',
            key: '_id',
            render: (id) => id.substring(0, 8) + '...',
        },
        {
            title: 'Khách hàng',
            dataIndex: 'fullName',
            key: 'fullName',
        },
        {
            title: 'Ngày đặt',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => formatDate(date),
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'totalPrice',
            key: 'totalPrice',
            render: (price) => formatPrice(price),
        },
        {
            title: 'Phương thức thanh toán',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: (method) => translatePaymentMethod(method),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <Tag color={getStatusColor(status)}>{translateStatus(status)}</Tag>,
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paymentStatus',
            key: 'paymentStatus',
            render: (status) => <Tag color={status === 'paid' ? 'green' : status === 'refund_required' ? 'red' : 'orange'}>{({
                pending: 'Chờ thanh toán', paid: 'Đã thanh toán', failed: 'Thất bại', expired: 'Hết hạn',
                refund_required: 'Cần đối soát/hoàn tiền', unpaid: 'Chưa thanh toán',
            })[status] || 'Cần xác minh'}</Tag>,
        },
        {
            title: 'Vận đơn GHN', key: 'ghn',
            render: (_, order) => order.shipment?.code ? <Space direction="vertical" size={0}>
                <Text copyable>{order.shipment.code}</Text><Tag>{shippingStatus(order.shipment.status)}</Tag>
            </Space> : <Text type="secondary">{order.shipment?.state === 'unknown' ? 'Cần đồng bộ' : 'Chưa tạo'}</Text>,
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (_, record) => (
                <Space size="small">
                    <Button type="primary" size="small" onClick={() => viewOrderDetails(record)}>
                        Xem chi tiết
                    </Button>
                    <Select
                        value={record.status}
                        style={{ width: 150 }}
                        size="small"
                        onChange={(value) => handleStatusChange(record._id, value)}
                        disabled={record.paymentStatus === 'refund_required'}
                    >
                        <Option value={record.status}>{translateStatus(record.status)}</Option>
                        {statusChoices(record)
                            .map((status) => <Option key={status} value={status}>{translateStatus(status)}</Option>)}
                    </Select>
                </Space>
            ),
        },
    ];

    const orderItemColumns = [
        {
            title: 'Hình ảnh',
            dataIndex: 'images',
            key: 'image',
            render: (images) => (
                <Image
                    width={70}
                    height={70}
                    src={uploadUrl(images.split(',')[0])}
                    alt="Sản phẩm"
                    style={{ objectFit: 'cover' }}
                    preview={false}
                />
            ),
        },
        {
            title: 'Tên sản phẩm',
            dataIndex: 'nameProduct',
            key: 'nameProduct',
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Title level={2}>Quản lý đơn hàng</Title>

            <Card style={{ marginTop: 16 }}>
                <Table
                    columns={columns}
                    dataSource={orders}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: 'Không có dữ liệu' }}
                />
            </Card>

            <Modal
                title="Chi tiết đơn hàng"
                visible={isModalVisible}
                onCancel={handleModalClose}
                footer={null}
                width={800}
            >
                {selectedOrder && (
                    <div>
                        <Row justify="space-between" align="middle">
                            <Col>
                                <Title level={4}>Đơn hàng #{selectedOrder._id}</Title>
                                <Text>Ngày đặt: {formatDate(selectedOrder.createdAt)}</Text>
                            </Col>
                            <Col>
                                <Tag
                                    color={getStatusColor(selectedOrder.status)}
                                    style={{ padding: '5px 10px', fontSize: '14px' }}
                                >
                                    {translateStatus(selectedOrder.status)}
                                </Tag>
                            </Col>
                        </Row>

                        <Divider />

                        <Title level={5}>Thông tin khách hàng</Title>
                        <Row gutter={[16, 8]}>
                            <Col span={24}>
                                <Text strong>Họ tên:</Text> {selectedOrder.fullName}
                            </Col>
                            <Col span={24}>
                                <Text strong>Số điện thoại:</Text> {selectedOrder.phone}
                            </Col>
                            <Col span={24}>
                                <Text strong>Địa chỉ:</Text> {selectedOrder.address}
                            </Col>
                            {selectedOrder.note && (
                                <Col span={24}>
                                    <Text strong>Ghi chú:</Text> {selectedOrder.note}
                                </Col>
                            )}
                        </Row>

                        <Divider />

                        <Title level={5}>Danh sách sản phẩm</Title>
                        <Table
                            columns={orderItemColumns}
                            dataSource={selectedOrder.products}
                            rowKey="_id"
                            pagination={false}
                            size="small"
                            locale={{ emptyText: 'Không có sản phẩm' }}
                            summary={() => (
                                <Table.Summary fixed>
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={1} align="right">
                                            <Text strong>Tổng cộng:</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1}>
                                            <Text strong>{formatPrice(selectedOrder.totalPrice)}</Text>
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>
                                </Table.Summary>
                            )}
                        />

                        <Divider />

                        <Title level={5}>Thông tin thanh toán</Title>
                        <ShippingPanel order={selectedOrder} onChange={shipment => {
                            setSelectedOrder(previous => ({ ...previous, shipment }));
                            setOrders(previous => previous.map(order => order._id === selectedOrder._id ? { ...order, shipment } : order));
                        }} />
                        <Row gutter={[16, 8]}>
                            <Col span={24}>
                                <Text strong>Phương thức:</Text> {translatePaymentMethod(selectedOrder.paymentMethod)}
                            </Col>
                            <Col span={24}>
                                <Text strong>Tổng tiền:</Text> {formatPrice(selectedOrder.totalPrice)}
                            </Col>
                        </Row>

                        <Divider />

                        <Row justify="space-between" align="middle">
                            <Col>
                                <Text strong>Cập nhật trạng thái:</Text>
                            </Col>
                            <Col>
                                <Select
                                    value={selectedOrder.status}
                                    style={{ width: 200 }}
                                    onChange={(value) => handleStatusChange(selectedOrder._id, value)}
                                    disabled={selectedOrder.paymentStatus === 'refund_required'}
                                >
                                    <Option value={selectedOrder.status}>{translateStatus(selectedOrder.status)}</Option>
                                    {statusChoices(selectedOrder)
                                        .map((status) => <Option key={status} value={status}>{translateStatus(status)}</Option>)}
                                </Select>
                            </Col>
                        </Row>
                        {selectedOrder.paymentAttempts?.length > 0 && (
                            <>
                                <Divider />
                                <Title level={5}>Giao dịch VNPay</Title>
                                <Table
                                    dataSource={selectedOrder.paymentAttempts}
                                    rowKey="transactionRef"
                                    size="small"
                                    pagination={false}
                                    scroll={{ x: 900 }}
                                    columns={[
                                        { title: 'TxnRef', dataIndex: 'transactionRef' },
                                        { title: 'Mã VNPay', dataIndex: 'transactionNo' },
                                        { title: 'Số tiền', dataIndex: 'amount', render: formatPrice },
                                        { title: 'Ngân hàng', dataIndex: 'bankCode' },
                                        { title: 'Response', dataIndex: 'responseCode' },
                                        { title: 'Status', dataIndex: 'transactionStatus' },
                                        { title: 'PayDate', dataIndex: 'payDate' },
                                        { title: 'Nhận IPN', dataIndex: 'receivedAt', render: (value) => value ? formatDate(value) : '' },
                                        { title: 'Đối soát', dataIndex: 'status' },
                                    ]}
                                />
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default ManagerOrder;
