import React, { useEffect, useRef, useState } from 'react';
import { Form, Input, Button, Radio, Row, Col, Typography, Space, Divider, message } from 'antd';
import { PhoneOutlined, UserOutlined, DollarOutlined, GiftOutlined } from '@ant-design/icons';
import Footer from '../../Components/Footer/Footer';
import Header from '../../Components/Header/Header';
import styles from './CheckOut.module.scss';
import classNames from 'classnames/bind';
import { useStore } from '../../hooks/userStore';

import { requestCreatePayment } from '../../config/request';
import { useNavigate } from 'react-router-dom';
import { uploadUrl } from '../../config/runtimeUrls';
import ShippingCheckout from './ShippingCheckout';
import ShippingInfo from '../../Components/ShippingInfo/ShippingInfo';
import { SavedAddressSelect } from '../../Components/AddressBook';

const { Title, Text } = Typography;

const cx = classNames.bind(styles);

function CheckOut() {
    const [form] = Form.useForm();
    const [shippingQuote, setShippingQuote] = useState(null);
    const nameCoupon = Form.useWatch('nameCoupon', form);
    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [loading, setLoading] = useState(false);
    const submitting = useRef(false);
    const [coupon, setCoupon] = useState({});


    useEffect(() => {
        document.title = 'Thanh Toán';
    }, []);

    const { dataCart, getCart } = useStore();

    // Mock order data (would normally come from cart or context)
    const orderItems = dataCart?.cartItems?.map((item) => ({
        id: item.product._id,
        nameProduct: item.product.nameProduct,
        price: item?.product.discount
            ? item?.product.price - (item?.product.discount * item?.product.price) / 100
            : item?.product.price,
        quantity: item.item.quantity,
        image: item?.product.images.split(',')[0],
    }));

    const navigate = useNavigate();

    const onFinish = async (values) => {
        if (submitting.current) return;
        if (!shippingQuote || shippingQuote.method !== paymentMethod || new Date(shippingQuote.expiresAt) <= new Date()) {
            message.warning('Vui lòng lấy báo giá GHN hợp lệ trước khi đặt hàng.'); return;
        }
        submitting.current = true;
        setLoading(true);
        const data = {
            cartId: dataCart?.cartId,
            shippingQuoteId: shippingQuote.quoteId,
            fullName: values.fullName,
            phone: values.phone,
            address: values.address,
            note: values.notes,
            totalPrice: dataCart?.totalPrice,
            typePayment: paymentMethod,
            nameCoupon: values.nameCoupon,
        };

        try {
            const res = await requestCreatePayment(data);
            if (paymentMethod === 'COD') {
                navigate(`/payments/${res.metadata._id}`);
                await getCart().catch(() => message.warning('Đã tạo đơn; chưa cập nhật được giỏ hàng.'));
            } else {
                window.location.assign(res.metadata);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tạo thanh toán');
        } finally {
            submitting.current = false;
            setLoading(false);
        }
    };

    // Payment method icons
    const paymentIcons = {
        COD: <DollarOutlined style={{ fontSize: '24px', color: '#108ee9' }} />,
        VNPAY: (
            <img
                style={{ width: '24px', height: '24px' }}
                src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Icon-VNPAY-QR.png"
                alt="VNPAY"
                height="24"
            />
        ),
        MOMO: (
            <img
                style={{ width: '24px', height: '24px' }}
                src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png"
                alt="MoMo"
                height="24"
            />
        ),
    };

    return (
        <div className={cx('checkout-page')}>
            <header>
                <Header />
            </header>

            <main className={cx('checkout-container')}>
                <Title level={2} className={cx('checkout-title')}>
                    Thanh Toán
                </Title>

                <Form
                    form={form}
                    name="checkout"
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ payment_method: 'COD' }}
                    scrollToFirstError
                >
                    <Row gutter={[32, 24]}>
                        {/* Left Column - Customer Information */}
                        <Col xs={24} lg={14}>
                            <div className={cx('info-section')}>
                                <Title level={3} className={cx('section-title')}>
                                    Thông tin giao hàng
                                </Title>
                                <SavedAddressSelect form={form} />
                                <Form.Item
                                    name="fullName"
                                    label="Họ và tên"
                                    rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}
                                >
                                    <Input prefix={<UserOutlined />} placeholder="Nhập họ và tên" size="large" />
                                </Form.Item>

                                <Form.Item
                                    name="phone"
                                    label="Số điện thoại"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập số điện thoại!' },
                                        { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ!' },
                                    ]}
                                >
                                    <Input prefix={<PhoneOutlined />} placeholder="Nhập số điện thoại" size="large" />
                                </Form.Item>

                                <ShippingCheckout form={form} cart={dataCart} method={paymentMethod}
                                    nameCoupon={nameCoupon} onQuoteChange={setShippingQuote} />

                                <Form.Item name="notes" label="Ghi chú">
                                    <Input.TextArea
                                        rows={4}
                                        placeholder="Ghi chú về đơn hàng, ví dụ: thời gian hay chỉ dẫn địa điểm giao hàng chi tiết hơn."
                                    />
                                </Form.Item>
                            </div>
                        </Col>

                        {/* Right Column - Order Summary & Payment */}
                        <Col xs={24} lg={10}>
                            <div className={cx('order-section')}>
                                <Title level={3} className={cx('section-title')}>
                                    Đơn hàng của bạn
                                </Title>
                                <div className={cx('order-items')}>
                                    {orderItems?.map((item) => (
                                        <div key={item.id} className={cx('order-item')}>
                                            <div className={cx('item-info')}>
                                                <img
                                                    className={cx('item-image')}
                                                    src={uploadUrl(item.image)}
                                                    alt={item.nameProduct}
                                                />
                                                <div className={cx('item-details')}>
                                                    <Text strong className={cx('item-name')}>
                                                        {item.nameProduct}
                                                    </Text>
                                                    <Text type="secondary">x {item.quantity}</Text>
                                                </div>
                                            </div>
                                            <Text className={cx('item-price')}>
                                                {item.price?.toLocaleString('vi-VN')}₫
                                            </Text>
                                        </div>
                                    ))}
                                </div>

                                <Divider />

                                <Form.Item label="Mã giảm giá có thể dùng" name="nameCoupon">
                                    <div className={cx('coupon-list')}>
                                        {dataCart.dataCoupon?.map((item) => (
                                            <button
                                                key={item._id}
                                                className={cx('coupon-item')}
                                                type="button"
                                                value={item._id}
                                                onClick={() => {
                                                    form.setFieldValue('nameCoupon', item._id);
                                                    setCoupon(item);
                                                }}
                                            >
                                                <GiftOutlined style={{ marginRight: '8px' }} />
                                                Giảm {item.discount.toLocaleString('vi-VN')} VNĐ
                                            </button>
                                        ))}
                                    </div>
                                </Form.Item>

                                <Divider />

                                <div className={cx('order-summary')}>
                                    <p>Tiền hàng: {Number(dataCart?.totalPrice || 0).toLocaleString('vi-VN')}đ</p>
                                    <p>Giảm giá: {Number(coupon?.discount || 0).toLocaleString('vi-VN')}đ</p>
                                    <p>Thanh toán trước qua VNPay: shop hỗ trợ 50% phí ship. COD: khách trả đủ phí.</p>
                                    {shippingQuote ? <>
                                        <ShippingInfo shipping={shippingQuote} />
                                        <Text strong>Tổng thanh toán: {shippingQuote.totalPrice.toLocaleString('vi-VN')}đ</Text>
                                    </> : <Text type="secondary">Chọn địa chỉ và chờ báo giá GHN để biết tổng thanh toán.</Text>}
                                </div>

                                <div className={cx('payment-section')}>
                                    <Title level={4} className={cx('section-title')}>
                                        Phương thức thanh toán
                                    </Title>
                                    <Form.Item
                                        name="payment_method"
                                        rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán!' }]}
                                    >
                                        <Radio.Group
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className={cx('payment-group')}
                                        >
                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                <Radio value="COD" className={cx('payment-option')}>
                                                    <div className={cx('payment-content')}>
                                                        {paymentIcons.COD}
                                                        <span className={cx('payment-label')}>
                                                            Thanh toán khi nhận hàng (COD)
                                                        </span>
                                                    </div>
                                                </Radio>
                                                <Radio value="VNPAY" className={cx('payment-option')}>
                                                    <div className={cx('payment-content')}>
                                                        {paymentIcons.VNPAY}
                                                        <span className={cx('payment-label')}>
                                                            Thanh toán qua VNPAY
                                                        </span>
                                                    </div>
                                                </Radio>
                                                <Radio disabled value="MOMO" className={cx('payment-option')}>
                                                    <div className={cx('payment-content')}>
                                                        {paymentIcons.MOMO}
                                                        <span className={cx('payment-label')}>
                                                            MoMo chưa hỗ trợ vận chuyển GHN
                                                        </span>
                                                    </div>
                                                </Radio>
                                            </Space>
                                        </Radio.Group>
                                    </Form.Item>
                                </div>

                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    block
                                    loading={loading}
                                    disabled={!shippingQuote || shippingQuote.method !== paymentMethod || !dataCart?.cartItems?.length}
                                    className={cx('submit-button')}
                                >
                                    Đặt hàng
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Form>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default CheckOut;
