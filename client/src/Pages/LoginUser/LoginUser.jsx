import classNames from 'classnames/bind';
import styles from './LoginUser.module.scss';

import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Form, Input, Button, Row, Col, message } from 'antd';
import { useEffect } from 'react';

import { requestAuth, requestLogin, requestLoginGoogle } from '../../config/request';
import { useStore } from '../../hooks/userStore';
import { getAuthReturnTo } from '../../utils/authRedirect';

const cx = classNames.bind(styles);

function LoginUser() {
    useEffect(() => {
        document.title = 'Đăng nhập tài khoản';
    }, []);

    const navigate = useNavigate();
    const location = useLocation();
    const from = getAuthReturnTo(location.state?.from, null);
    const { getAuthUser, getCart } = useStore();

    const navigateAfterLogin = async () => {
        const res = await requestAuth();
        const destination = from || (res.metadata.auth.isAdmin === true ? '/admin' : '/');
        await getAuthUser();
        await getCart().catch(() => {});
        navigate(destination, { replace: true });
    };

    const onFinish = async (values) => {
        try {
            await requestLogin(values);
            message.success('Đăng nhập thành công!');
            await navigateAfterLogin();
        } catch (error) {
            message.error(error.response?.data?.message || 'Đăng nhập thất bại!');
        }
    };

    const handleSuccess = async (response) => {
        const { credential } = response; // Nhận ID Token từ Google
        try {
            const res = await requestLoginGoogle(credential);
            message.success(res.message);
            await navigateAfterLogin();
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
                    <h2>Đăng nhập</h2>
                    <Form.Item
                        name="email"
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng nhập email!',
                            },
                            {
                                type: 'email',
                                message: 'Email không hợp lệ!',
                            },
                        ]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng nhập mật khẩu!',
                            },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" className={cx('login-button')} size="large" block>
                            Đăng nhập
                        </Button>
                    </Form.Item>

                    <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
                        <GoogleLogin locale="vi" onSuccess={handleSuccess} onError={() => message.error('Không thể đăng nhập bằng Google. Vui lòng thử lại.')} />
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
                                    Chưa có tài khoản?{' '}
                                    <Link to="/register" state={{ from }} className={cx('register-link')}>
                                        Đăng ký ngay
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

export default LoginUser;
