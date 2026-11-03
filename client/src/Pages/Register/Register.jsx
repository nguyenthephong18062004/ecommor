import { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './Register.module.scss';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';
import { UserOutlined, LockOutlined, PhoneOutlined, HomeOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuthReturnTo } from '../../utils/authRedirect';
import { Form, Input, Button, Row, Col, message } from 'antd';
import { requestRegister, requestResendVerification, requestVerifyEmail } from '../../config/request';

const cx = classNames.bind(styles);

function Register() {
    const [step, setStep] = useState('register');
    const [email, setEmail] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const from = getAuthReturnTo(location.state?.from, null);

    useEffect(() => { document.title = 'Đăng ký'; }, []);
    useEffect(() => {
        if (!cooldown) return undefined;
        const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
        return () => window.clearInterval(timer);
    }, [cooldown]);

    const run = async (action, fallback) => {
        setLoading(true);
        try { await action(); } catch (error) { message.error(error.response?.data?.message || fallback); } finally { setLoading(false); }
    };

    return <div className={cx('wrapper')}>
        <header><Header /></header>
        <main className={cx('main')}><Form className={cx('login-form')} onFinish={step === 'register' ? (values) => run(async () => { await requestRegister(values); setEmail(values.email); setCooldown(60); setStep('verify'); message.success('Vui lòng kiểm tra email để nhận mã xác minh.'); }, 'Không thể đăng ký. Vui lòng thử lại.') : ({ otp }) => run(async () => { await requestVerifyEmail({ email, otp }); message.success('Email đã được xác minh. Vui lòng đăng nhập.'); navigate('/login', { state: { from }, replace: true }); }, 'Không thể xác minh mã. Vui lòng thử lại.')}>
            <h2>{step === 'register' ? 'Đăng ký' : 'Xác minh email'}</h2>
            {step === 'register' && <>
                <Form.Item name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}><Input prefix={<UserOutlined />} placeholder="Họ và tên" size="large" /></Form.Item>
                <Form.Item name="email" rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}><Input prefix={<MailOutlined />} placeholder="Email" size="large" /></Form.Item>
                <Form.Item name="phone" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }, { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ' }]}><Input prefix={<PhoneOutlined />} placeholder="Số điện thoại" size="large" /></Form.Item>
                <Form.Item name="address" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}><Input prefix={<HomeOutlined />} placeholder="Địa chỉ" size="large" /></Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }, { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }]}><Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" /></Form.Item>
                <Form.Item name="confirmPassword" dependencies={['password']} rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu' }, ({ getFieldValue }) => ({ validator(_, value) { return !value || value === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('Mật khẩu xác nhận không khớp')); } })]}><Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" size="large" /></Form.Item>
            </>}
            {step === 'verify' && <Form.Item name="otp" rules={[{ required: true, message: 'Vui lòng nhập mã xác minh' }, { pattern: /^\d{6}$/, message: 'Mã xác minh phải gồm 6 chữ số' }]}><Input prefix={<SafetyCertificateOutlined />} placeholder="Mã xác minh gồm 6 chữ số" inputMode="numeric" size="large" /></Form.Item>}
            <Form.Item><Button type="primary" htmlType="submit" className={cx('register-button')} size="large" block loading={loading}>{step === 'register' ? 'Đăng ký' : 'Xác minh email'}</Button></Form.Item>
            {step === 'verify' && <Button type="link" block disabled={cooldown > 0 || loading} onClick={() => run(async () => { await requestResendVerification({ email }); setCooldown(60); }, 'Không thể gửi lại mã. Vui lòng thử lại.')}>{cooldown ? `Có thể gửi lại sau ${cooldown} giây` : 'Gửi lại mã xác minh'}</Button>}
            <div className={cx('form-footer')}><Row justify="space-between" align="middle"><Col><Link to="/forgot-password" className={cx('forgot-password')}>Quên mật khẩu?</Link></Col><Col><span className={cx('register-text')}>Bạn đã có tài khoản? <Link to="/login" state={{ from }} className={cx('register-link')}>Đăng nhập</Link></span></Col></Row></div>
        </Form></main>
        <footer><Footer /></footer>
    </div>;
}

export default Register;
