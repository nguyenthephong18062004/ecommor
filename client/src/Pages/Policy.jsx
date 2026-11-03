import { Link, useParams } from 'react-router-dom';
import { Result } from 'antd';
import Header from '../Components/Header/Header';
import Footer from '../Components/Footer/Footer';
import useSeo from '../hooks/useSeo';
import { policies } from '../config/policies';

export default function Policy() {
    const { slug } = useParams();
    const policy = policies[slug];
    useSeo({ title: policy?.title || 'Không tìm thấy trang' });
    return <><Header /><main className="page-shell prose-page">
        {policy ? <><nav aria-label="Đường dẫn"><Link to="/">Trang chủ</Link> / {policy.title}</nav>
            <h1>{policy.title}</h1>{policy.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}
            <Link to="/contact">Liên hệ ECOMMOR để được hỗ trợ</Link></> : <Result status="404" title="Không tìm thấy trang" extra={<Link to="/">Về trang chủ</Link>} />}
    </main><Footer /></>;
}
