import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Result } from 'antd';
import useSeo from '../hooks/useSeo';

export default function SiteHead() {
    const { pathname } = useLocation();
    const titles = { login: 'Đăng nhập', register: 'Đăng ký', 'forgot-password': 'Quên mật khẩu', cart: 'Giỏ hàng',
        checkout: 'Thanh toán', profile: 'Tài khoản của tôi', orders: 'Đơn hàng của tôi', payments: 'Kết quả thanh toán',
        contact: 'Liên hệ', blogs: 'Kiến thức đồng hồ', admin: 'Quản trị cửa hàng', 'dat-hang': 'Đặt hàng theo yêu cầu' };
    useSeo({ title: titles[pathname.split('/')[1]] || 'Khám phá đồng hồ' });
    return null;
}

export class PageBoundary extends Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        return this.state.failed ? <Result status="error" title="Chưa thể tải trang"
            subTitle="Vui lòng tải lại trang hoặc quay về trang chủ."
            extra={<><Button type="primary" onClick={() => window.location.reload()}>Tải lại</Button><a href="/">Về trang chủ</a></>} /> : this.props.children;
    }
}
