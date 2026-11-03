import classNames from 'classnames/bind';
import styles from './HomePage.module.scss';
import Slide from './Slide/Slide';
import ProductNew from './ProductNew/ProductNew';
import img1 from '../../assets/images/img1.jpg';
import { Link } from 'react-router-dom';
import { useStore } from '../../hooks/userStore';
import ProductShelf from '../ProductShelf';
const cx = classNames.bind(styles);

function HomePage() {
    const { recent, catalogOptions } = useStore();
    return (
        <div className={cx('wrapper')}>
            <div>
                <Slide />
            </div>
            <div className={cx('inner')}>
                <section className="catalog-section"><h1>Đồng hồ theo phong cách của bạn</h1>
                    <p>Tìm mẫu phù hợp, đối chiếu thông số và lựa chọn trong ngân sách của bạn.</p>
                    <nav className="quick-links" aria-label="Chọn theo ngân sách">
                        {[['Dưới 5 triệu', 'maxPrice=5000000'], ['5–20 triệu', 'minPrice=5000000&maxPrice=20000000'],
                            ['20–50 triệu', 'minPrice=20000000&maxPrice=50000000'], ['Trên 50 triệu', 'minPrice=50000000']].map(([label, query]) => <Link key={query} to={`/category/all?${query}`}>{label}</Link>)}
                        <Link to="/category/all?sort=popular">Sản phẩm bán chạy</Link>
                    </nav>
                    <nav className="quick-links" aria-label="Khám phá thương hiệu">{(catalogOptions?.brands || []).slice(0, 8).map(name => <Link key={name} to={`/category/brand/${encodeURIComponent(name)}`}>{name}</Link>)}
                        <Link to="/thuong-hieu">Tất cả thương hiệu A–Z</Link>
                    </nav>
                </section>
                <ProductNew />
                {recent.length > 0 && <ProductShelf ids={recent.slice(0, 5)} title="Bạn đã xem gần đây" />}
                <section className="catalog-section"><h2>Chọn đồng hồ dễ dàng hơn</h2><p>Tìm hiểu về bộ máy, kích thước và cách chăm sóc đồng hồ trước khi lựa chọn.</p><Link to="/blogs">Đọc kiến thức đồng hồ</Link> · <Link to="/chinh-sach/mua-hang">Hướng dẫn mua hàng</Link></section>

                <div>
                    <img className="mx-auto" src={img1} alt="Bộ sưu tập đồng hồ ECOMMOR" loading="lazy" />
                </div>

            </div>
        </div>
    );
}

export default HomePage;
