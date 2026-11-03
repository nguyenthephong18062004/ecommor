import { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { MailOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import classNames from 'classnames/bind';
import styles from './ForgotPassword.module.scss';
import Header from '../../Components/Header/Header';
import { requestForgotPassword, requestResetPassword, requestVerifyResetPassword } from '../../config/request';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);
const { Title, Text } = Typography;

function ForgotPassword() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        if (!cooldown) return undefined;
        const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
        return () => window.clearInterval(timer);
    }, [cooldown]);

    const send = async (address) => {
        await requestForgotPassword({ email: address });
        setEmail(address);
        setCooldown(60);
        setStep(2);
        message.success('Nếu email đủ điều kiện, mã xác minh sẽ được gửi đến bạn.');
    };

    const run = async (action, fallback) => {
        setLoading(true);
        try { await action(); } catch (error) { message.error(error.response?.data?.message || fallback); } finally { setLoading(false); }
    };

    return <div className={cx('wrapper')}>
        <header><Header /></header>
        <div className={cx('content')}><Card className={cx('card')}>
            <Title level={2} className={cx('title')}>Quên mật khẩu</Title>
            <Text className={cx('description')}>{step === 1 ? 'Yêu cầu mã xác minh qua email.' : step === 2 ? 'Nhập mã xác minh đã nhận.' : 'Đặt mật khẩu mới cho tài khoản.'}</Text>
            {step === 1 && <Form onFinish={({ email: address }) => run(() => send(address), 'Không thể kết nối máy chủ. Vui lòng thử lại.')}>
                <Form.Item name="email" rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}><Input prefix={<MailOutlined />} placeholder="Email" size="large" /></Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={loading}>Gửi mã xác minh</Button>
            </Form>}
            {step === 2 && <Form onFinish={({ otp }) => run(async () => { await requestVerifyResetPassword({ email, otp }); setStep(3); }, 'Không thể xác minh mã. Vui lòng thử lại.')}>
                <Form.Item name="otp" rules={[{ required: true, message: 'Vui lòng nhập mã xác minh' }, { pattern: /^\d{6}$/, message: 'Mã xác minh phải gồm 6 chữ số' }]}><Input prefix={<SafetyCertificateOutlined />} placeholder="Mã xác minh gồm 6 chữ số" inputMode="numeric" size="large" /></Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={loading}>Xác minh mã</Button>
                <Button type="link" block disabled={cooldown > 0 || loading} onClick={() => run(() => send(email), 'Không thể gửi lại mã. Vui lòng thử lại.')}>{cooldown ? `Có thể gửi lại sau ${cooldown} giây` : 'Gửi lại mã xác minh'}</Button>
            </Form>}
            {step === 3 && <Form onFinish={(values) => run(async () => { await requestResetPassword(values); message.success('Đã đặt lại mật khẩu.'); navigate('/login'); }, 'Không thể đặt lại mật khẩu. Vui lòng thử lại.')}>
                <Form.Item name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }, { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }]}><Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu mới" size="large" /></Form.Item>
                <Form.Item name="confirmPassword" dependencies={['password']} rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu' }, ({ getFieldValue }) => ({ validator(_, value) { return !value || value === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('Mật khẩu xác nhận không khớp')); } })]}><Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu mới" size="large" /></Form.Item>
                <Button type="primary" htmlType="submit" block size="large" loading={loading}>Đặt lại mật khẩu</Button>
            </Form>}
        </Card></div>
    </div>;
}

export default ForgotPassword;
