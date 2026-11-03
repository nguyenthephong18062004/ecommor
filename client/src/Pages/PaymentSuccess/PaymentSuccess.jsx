import classNames from 'classnames/bind';
import styles from './PaymentSuccess.module.scss';
import { Result, Button, Descriptions, Card, Typography, Space, Tag, Table, message } from 'antd';
import { ShoppingOutlined, ReloadOutlined } from '@ant-design/icons';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { requestGetPaymentSuccess, requestRetryVnpay, requestReconcileVnpay } from '../../config/request';
import { uploadUrl } from '../../config/runtimeUrls';
import ShippingInfo from '../../Components/ShippingInfo/ShippingInfo';

const { Title, Text } = Typography;
const cx = classNames.bind(styles);

function PaymentSuccess() {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [retrying, setRetrying] = useState(false);

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
        document.title = 'Kết quả thanh toán';
    }, []);

    const { id } = useParams();

    useEffect(() => {
        let active = true;
        let timer;
        let polls = 0;
        let nextCheckAt = 0;
        const fetchData = async () => {
            try {
                const res = await requestGetPaymentSuccess(id);
                if (!active) return;
                if (res.metadata.paymentMethod === 'VNPAY' && ['pending', 'expired', 'failed'].includes(res.metadata.paymentStatus) &&
                    Date.now() >= nextCheckAt) {
                    try {
                        const checked = await requestReconcileVnpay(id);
                        res.metadata.paymentStatus = checked.metadata.paymentStatus;
                        nextCheckAt = checked.metadata.nextCheckAt ? new Date(checked.metadata.nextCheckAt).getTime() : Date.now() + 300000;
                    } catch {
                        nextCheckAt = Date.now() + 300000;
                    }
                }
                if (!active) return;
                setPaymentInfo(res.metadata);
                setError('');
                if (res.metadata.paymentStatus === 'pending' && polls++ < 200) timer = setTimeout(fetchData, 3000);
            } catch (error) {
                if (active) setError(error.response?.data?.message || 'Không thể tải đơn hàng');
            }
        };
        fetchData();
        return () => { active = false; clearTimeout(timer); };
    }, [id]);

    const paymentLabels = {
        pending: 'Đang chờ xác nhận thanh toán', paid: 'Đã thanh toán', failed: 'Thanh toán thất bại',
        expired: 'Thanh toán hết hạn', refund_required: 'Giao dịch cần đối soát và hoàn tiền', unpaid: 'Chưa thanh toán',
    };
    const online = paymentInfo.paymentMethod === 'VNPAY';
    const failed = ['failed', 'expired', 'refund_required'].includes(paymentInfo.paymentStatus) || paymentInfo.status === 'cancelled';
    const resultStatus = error ? 'error' : failed ? 'warning' : !paymentInfo.orderId || (online && paymentInfo.paymentStatus !== 'paid') ? 'info' : 'success';
    const resultTitle = error || (paymentInfo.status === 'cancelled' ? 'Đơn hàng đã hủy' : online ?
        paymentLabels[paymentInfo.paymentStatus] || 'Đang tải kết quả thanh toán' : paymentInfo.orderId ? 'Đặt hàng thành công!' : 'Đang tải đơn hàng');

    const retryPayment = async () => {
        setRetrying(true);
        try {
            const response = await requestRetryVnpay(id);
            window.location.assign(response.metadata);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể thanh toán lại');
        } finally {
            setRetrying(false);
        }
    };

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
                        src={uploadUrl(record.image)}
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
                        status={resultStatus}
                        title={<Title level={2}>{resultTitle}</Title>}
                        subTitle={
                            <Space direction="vertical">
                                <Text>
                                    Mã đơn hàng: <strong>{paymentInfo.orderId}</strong>
                                </Text>
                            </Space>
                        }
                    />

                    <Card className={cx('order-info')} title="Thông tin đơn hàng">
                        <ShippingInfo shipping={paymentInfo.shipping} shipment={paymentInfo.shipment} />
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
                            <Descriptions.Item label="Trạng thái thanh toán">
                                {paymentLabels[paymentInfo.paymentStatus] || 'Cần xác minh'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Tổng tiền">{formatCurrency(paymentInfo.totalPrice)}</Descriptions.Item>
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
                        {online && paymentInfo.status === 'pending' && ['pending', 'failed', 'expired'].includes(paymentInfo.paymentStatus) && (
                            <Button icon={<ReloadOutlined />} loading={retrying} onClick={retryPayment}>Thanh toán lại</Button>
                        )}
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
