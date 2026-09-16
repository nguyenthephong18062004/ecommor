import classNames from 'classnames/bind';
import styles from './PaymentSuccess.module.scss';
import { Result, Button, Descriptions, Card, Typography, Space, Tag, Table } from 'antd';
import { CheckCircleFilled, ShoppingOutlined, HomeOutlined } from '@ant-design/icons';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { requestGetPaymentSuccess } from '../../config/request';

const { Title, Text } = Typography;
const cx = classNames.bind(styles);

function PaymentSuccess() {
    const navigate = useNavigate();

    const [paymentInfo, setPaymentInfo] = useState({
        orderId: '',
        fullName: '',
        phone: '',
        address: '',
        note: '',
        status: '',
        paymentMethod: '',
        products: [],
        totalPrice: 0,
    });

    useEffect(() => {
        document.title = 'Thanh toán thành công';
    }, []);

    const { id } = useParams();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await requestGetPaymentSuccess(id);
                setPaymentInfo(res.metadata);
            } catch (error) {
                console.error('Error fetching payment data:', error);
            }
        };
        fetchData();
    }, [id]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'orange';
            case 'confirmed':
                return 'green';
            case 'shipped':
                return 'blue';
            case 'delivered':
                return 'green';
            case 'cancelled':
                return 'red';
            default:
                return 'default';
        }
    };

    const getStatusText = (status) => {
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

    const getPaymentMethodText = (method) => {
        switch (method) {
            case 'COD':
                return 'Thanh toán khi nhận hàng';
            case 'VNPAY':
                return 'Thanh toán qua VNPAY';
            case 'MOMO':
                return 'Thanh toán qua MoMo';
            default:
                return method;
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const productColumns = [
        {
            title: 'Sản phẩm',
            dataIndex: 'nameProduct',
            key: 'nameProduct',
            render: (text, record) => (
                <div className={cx('product-info')}>
                    <img
                        src={`${import.meta.env.VITE_URL_IMAGE_API}/${record.image}`}
                        alt={text}
                        className={cx('product-image')}
                    />
                    <span>{text}</span>
                </div>
            ),
        },

        {
            title: 'Giá',
            dataIndex: 'price',
            key: 'price',
            align: 'right',
            render: (price) => formatCurrency(price),
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            align: 'center',
        },
        {
            title: 'Thành tiền',
            key: 'total',
            align: 'right',
            render: (record) => formatCurrency(record.price * record.quantity),
        },
    ];

    return (
        <div className={cx('payment-success')}>
            <header>
                <Header />
            </header>

            <main className={cx('payment-success-container')}>
                <div className={cx('success-content')}>
                    <Result
                        status="success"
                        icon={<CheckCircleFilled className={cx('success-icon')} />}
                        title={<Title level={2}>Đặt hàng thành công!</Title>}
                        subTitle={
                            <Space direction="vertical">
                                <Text>
                                    Mã đơn hàng: <strong>{paymentInfo.orderId}</strong>
                                </Text>
                                <Text>Cảm ơn bạn đã mua sắm tại cửa hàng của chúng tôi.</Text>
                            </Space>
                        }
                    />

                    <Card className={cx('order-info')} title="Thông tin đơn hàng">
                        <Descriptions bordered layout="horizontal" column={1} labelStyle={{ width: '150px' }}>
                            <Descriptions.Item label="Người nhận">{paymentInfo.fullName}</Descriptions.Item>
                            <Descriptions.Item label="Số điện thoại">{paymentInfo.phone}</Descriptions.Item>
                            <Descriptions.Item label="Địa chỉ">{paymentInfo.address}</Descriptions.Item>
                            <Descriptions.Item label="Ghi chú">{paymentInfo.note || 'Không có'}</Descriptions.Item>
                            <Descriptions.Item label="Trạng thái đơn hàng">
                                <Tag color={getStatusColor(paymentInfo.status)}>
                                    {getStatusText(paymentInfo.status)}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Phương thức thanh toán">
                                {getPaymentMethodText(paymentInfo.paymentMethod)}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>

                    <Card className={cx('product-list')} title="Chi tiết sản phẩm">
                        <Table
                            dataSource={paymentInfo.products}
                            columns={productColumns}
                            pagination={false}
                            rowKey="id"
                            className={cx('product-table')}
                        />
                    </Card>

                    <div className={cx('action-buttons')}>
                        <Button type="primary" size="large" icon={<ShoppingOutlined />} onClick={() => navigate('/')}>
                            Về trang chủ
                        </Button>
                    </div>
                </div>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default PaymentSuccess;
