import classNames from 'classnames/bind';
import styles from './Register.module.scss';

import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import { UserOutlined, LockOutlined, PhoneOutlined, HomeOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';

import { Form, Input, Button, Row, Col, message } from 'antd';
import { useEffect } from 'react';

import { requestRegister } from '../../config/request';

const cx = classNames.bind(styles);

function Register() {
    useEffect(() => {
        document.title = 'Đăng ký tài khoản';
    }, []);

    const navigate = useNavigate();
    const onFinish = async (values) => {
        try {
            await requestRegister(values);
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            navigate('/');
            message.success('Đăng ký thành công!');
        } catch (error) {
            message.error(error.response?.data?.message || error.message || 'Khong the ket noi server');
        }
    };

    const handleSuccess = async (response) => {
        const { credential } = response; // Nhận ID Token từ Google
        try {
            // const res = await requestLoginGoogle(credential);
            // message.success(res.message);
            // setTimeout(() => {
            //     window.location.reload();
            // }, 1000);
            navigate('/');
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                message.error(error.response.data.message);
            } else {
                message.error('Đăng nhập bằng Google thất bại. Vui lòng thử lại!');
            }
        }
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main className={cx('main')}>
                <Form name="login-form" className={cx('login-form')} onFinish={onFinish}>
                    <h2>Đăng ký</h2>
                    <Form.Item name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Họ và tên" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' },
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="phone"
                        rules={[
                            { required: true, message: 'Vui lòng nhập số điện thoại!' },
                            { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ!' },
                        ]}
                    >
                        <Input prefix={<PhoneOutlined />} placeholder="Số điện thoại" size="large" />
                    </Form.Item>

                    <Form.Item name="address" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}>
                        <Input prefix={<HomeOutlined />} placeholder="Địa chỉ" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu!' },
                            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" className={cx('register-button')} size="large" block>
                            Đăng ký
                        </Button>
                    </Form.Item>

                    <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
                        <GoogleLogin onSuccess={handleSuccess} onError={() => console.log('Login Failed')} />
                    </GoogleOAuthProvider>

                    <div className={cx('form-footer')}>
                        <Row justify="space-between" align="middle">
                            <Col>
                                <Link to="/forgot-password" className={cx('forgot-password')}>
                                    Quên mật khẩu?
                                </Link>
                            </Col>
                            <Col>
                                <span className={cx('register-text')}>
                                    đã có tài khoản?{' '}
                                    <Link to="/login" className={cx('register-link')}>
                                        Đăng nhập ngay
                                    </Link>
                                </span>
                            </Col>
                        </Row>
                    </div>
                </Form>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default Register;
