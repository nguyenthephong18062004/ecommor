import { useEffect, useRef } from 'react';
import { Button, Modal, Space, message } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from './userStore';
import { getAuthReturnTo } from '../utils/authRedirect';

export default function useRequireAuth() {
    const { dataUser, authLoading } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const dialog = useRef(null);

    useEffect(() => () => dialog.current?.destroy(), []);

    return (action = 'sử dụng chức năng này') => {
        if (authLoading) {
            message.info('Đang kiểm tra phiên đăng nhập. Vui lòng thử lại sau giây lát.');
            return false;
        }
        if (dataUser?._id) return true;
        if (dialog.current) return false;

        const from = getAuthReturnTo(location.pathname + location.search + location.hash);
        const goTo = (path) => {
            dialog.current?.destroy();
            navigate(path, { state: { from } });
        };
        dialog.current = Modal.confirm({
            title: 'Yêu cầu đăng nhập',
            content: `Vui lòng đăng nhập hoặc đăng ký tài khoản để ${action}.`,
            closable: true,
            afterClose: () => { dialog.current = null; },
            footer: (
                <Space wrap>
                    <Button onClick={() => dialog.current?.destroy()}>Tiếp tục xem</Button>
                    <Button onClick={() => goTo('/register')}>Đăng ký</Button>
                    <Button type="primary" onClick={() => goTo('/login')}>Đăng nhập</Button>
                </Space>
            ),
        });
        return false;
    };
}
