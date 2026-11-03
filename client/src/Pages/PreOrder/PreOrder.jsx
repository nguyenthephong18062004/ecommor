import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Checkbox, Form, Input, InputNumber, Result, Spin } from 'antd';
import classNames from 'classnames/bind';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';
import useFetch from '../../hooks/useFetch';
import { requestCreatePreorder } from '../../config/request';
import { uploadUrl } from '../../config/runtimeUrls';
import styles from './PreOrder.module.scss';
import { canOrder, dateTime, money } from '../../utils/format';

const cx = classNames.bind(styles);

function PreOrder() {
    const { id } = useParams();
    const { data, loading, error, reFetch } = useFetch(`/api/get-product-by-id?id=${encodeURIComponent(id)}`);
    const product = data?.product;
    const [form] = Form.useForm();
    const quantity = Form.useWatch('quantity', form) || 1;
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [receipt, setReceipt] = useState(null);
    const sending = useRef(false);

    useEffect(() => {
        document.title = 'Đặt hàng theo yêu cầu | ECOMMOR';
        setReceipt(null);
        setSubmitError('');
        form.resetFields();
    }, [id, form]);

    const submit = async values => {
        if (sending.current) return;
        sending.current = true;
        setSubmitting(true);
        setSubmitError('');
        try {
            const result = await requestCreatePreorder({ ...values, productId: id });
            setReceipt(result.metadata);
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Chưa thể gửi yêu cầu. Vui lòng kiểm tra kết nối và thử lại.');
        } finally {
            sending.current = false;
            setSubmitting(false);
        }
    };

    const unitPrice = Math.round((product?.price || 0) * (100 - (product?.discount || 0)) / 100);
    const unavailable = canOrder(product);

    return (
        <>
            <Header />
            <main className={cx('main')}>
                <nav aria-label="Đường dẫn" className={cx('breadcrumb')}>
                    <Link to="/">Trang chủ</Link> / <Link to={`/product/${id}`}>Sản phẩm</Link> / Đặt hàng theo yêu cầu
                </nav>
                {receipt ? (
                    <Result status="success" title="Đã tiếp nhận yêu cầu đặt hàng"
                        subTitle={`Mã yêu cầu: ${receipt.id}. Cửa hàng sẽ liên hệ theo số điện thoại bạn đã cung cấp để xác nhận khả năng cung ứng, giá và thời gian giao hàng.`}
                        extra={<Link to={`/product/${id}`}><Button>Quay lại sản phẩm</Button></Link>}>
                        <p>Giá trị tham khảo: <strong>{money(receipt.totalPrice)}</strong>. Bạn chưa cần thanh toán ở bước này.</p>
                    </Result>
                ) : loading ? <div className={cx('loading')}><Spin size="large" /></div>
                    : error ? <Alert type="error" showIcon message={error} action={<Button onClick={reFetch}>Thử lại</Button>} />
                        : !product ? <Result status="404" title="Không tìm thấy sản phẩm" />
                            : !unavailable ? <Result status="info" title="Sản phẩm đang có sẵn hoặc cần kiểm tra lại tồn kho"
                                extra={<Link to={`/product/${id}`}><Button type="primary">Xem sản phẩm</Button></Link>} /> : (
                                <>
                                    <h1>Đặt hàng theo yêu cầu</h1>
                                    <p className={cx('intro')}>Để lại thông tin cho mẫu đồng hồ bạn quan tâm. ECOMMOR sẽ liên hệ tư vấn và xác nhận thời gian có hàng.</p>
                                    {product.expectedRestockAt && <p>Dự kiến có hàng: {dateTime(product.expectedRestockAt)}. Lịch chính thức được xác nhận khi tư vấn.</p>}
                                    <div className={cx('layout')}>
                                        <section className={cx('summary')}>
                                            <h2>Thông tin sản phẩm</h2>
                                            {product.images && <img src={uploadUrl(product.images.split(',')[0])} alt={product.nameProduct} />}
                                            <Link to={`/product/${id}`} className={cx('product-name')}>{product.nameProduct}</Link>
                                            <p>Mã sản phẩm: {product.modelNumber}</p>
                                            <span className={cx('badge')}>Hàng đặt · Chờ xác nhận</span>
                                            <dl>
                                                <div><dt>Giá tham khảo</dt><dd>{money(unitPrice)}</dd></div>
                                                <div><dt>Số lượng</dt><dd>{quantity}</dd></div>
                                                <div className={cx('total')}><dt>Tạm tính</dt><dd>{money(unitPrice * quantity)}</dd></div>
                                            </dl>
                                            <p className={cx('note')}>Giá và thời gian giao hàng sẽ được xác nhận khi tư vấn. Yêu cầu này chưa giữ hàng và chưa phát sinh thanh toán.</p>
                                        </section>
                                        <section className={cx('form-section')}>
                                            <h2>Thông tin khách hàng</h2>
                                            <Form form={form} layout="vertical" initialValues={{ quantity: 1, consent: false }} onFinish={submit} disabled={submitting}>
                                                <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ tên.' }, { max: 100 }]}>
                                                    <Input autoComplete="name" maxLength={100} placeholder="Nhập họ và tên" />
                                                </Form.Item>
                                                <div className={cx('form-row')}>
                                                    <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại.' }, {
                                                        validator: (_, value) => /^(?:0|\+84)[35789]\d{8}$/.test((value || '').replace(/[\s().-]/g, ''))
                                                            ? Promise.resolve() : Promise.reject(new Error('Nhập số điện thoại Việt Nam hợp lệ.')),
                                                    }]}>
                                                        <Input type="tel" autoComplete="tel" maxLength={20} placeholder="09xxxxxxxx" />
                                                    </Form.Item>
                                                    <Form.Item name="email" label="Email (không bắt buộc)" rules={[{ type: 'email', message: 'Email không hợp lệ.' }, { max: 254 }]}>
                                                        <Input type="email" autoComplete="email" maxLength={254} placeholder="Email của bạn" />
                                                    </Form.Item>
                                                </div>
                                                <Form.Item name="address" label="Địa chỉ nhận hàng dự kiến (không bắt buộc)" rules={[{ max: 500 }]}>
                                                    <Input autoComplete="street-address" maxLength={500} placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố" />
                                                </Form.Item>
                                                <Form.Item name="quantity" label="Số lượng cần đặt" rules={[{ required: true, type: 'integer', min: 1, max: 10, message: 'Chọn từ 1 đến 10 sản phẩm.' }]}>
                                                    <InputNumber min={1} max={10} precision={0} />
                                                </Form.Item>
                                                <Form.Item name="note" label="Ghi chú / nhu cầu tư vấn" rules={[{ max: 2000 }]}>
                                                    <Input.TextArea rows={4} maxLength={2000} showCount placeholder="Thời gian mong muốn nhận hàng hoặc câu hỏi về sản phẩm…" />
                                                </Form.Item>
                                                <Alert type="info" showIcon message="Xác nhận với tư vấn viên trước khi thanh toán"
                                                    description="Cửa hàng sẽ kiểm tra nguồn hàng và trao đổi phương thức thanh toán với bạn sau khi tiếp nhận yêu cầu." />
                                                <Form.Item name="consent" valuePropName="checked" className={cx('consent')} rules={[{
                                                    validator: (_, value) => value === true ? Promise.resolve() : Promise.reject(new Error('Vui lòng đồng ý để cửa hàng liên hệ.')),
                                                }]}>
                                                    <Checkbox>Tôi đồng ý để ECOMMOR sử dụng thông tin trên để liên hệ và xử lý yêu cầu đặt hàng này.</Checkbox>
                                                </Form.Item>
                                                {submitError && <Alert type="error" showIcon message={submitError} className={cx('submit-error')} />}
                                                <Button type="primary" htmlType="submit" size="large" block loading={submitting}>Gửi yêu cầu đặt hàng</Button>
                                            </Form>
                                        </section>
                                    </div>
                                </>
                            )}
            </main>
            <Footer />
        </>
    );
}

export default PreOrder;
