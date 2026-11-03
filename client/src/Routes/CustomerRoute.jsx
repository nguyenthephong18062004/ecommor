import { Button, Result, Space } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../hooks/userStore';
import Loading from '../Components/Loading/Loading';
import Header from '../Components/Header/Header';
import Footer from '../Components/Footer/Footer';
import { getAuthReturnTo } from '../utils/authRedirect';

export default function CustomerRoute({ children }) {
    const { dataUser, authLoading } = useStore();
    const location = useLocation();
    if (authLoading) return <Loading />;
    if (dataUser?._id) return children;

    const from = getAuthReturnTo(location.pathname + location.search + location.hash);
    return (
        <>
            <Header />
            <main>
                <Result status="info" title="Yêu cầu đăng nhập"
                    subTitle="Vui lòng đăng nhập hoặc đăng ký tài khoản để sử dụng chức năng này. Bạn vẫn có thể xem sản phẩm và tin tức mà không cần đăng nhập."
                    extra={<Space wrap>
                        <Link to="/login" state={{ from }}><Button type="primary">Đăng nhập</Button></Link>
                        <Link to="/register" state={{ from }}><Button>Đăng ký</Button></Link>
                        <Link to="/"><Button>Tiếp tục xem sản phẩm</Button></Link>
                    </Space>} />
            </main>
            <Footer />
        </>
    );
}
