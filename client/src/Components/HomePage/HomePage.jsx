import classNames from 'classnames/bind';
import styles from './HomePage.module.scss';
import Slide from './Slide/Slide';
import ProductNew from './ProductNew/ProductNew';
import ProductByCategory from './ProductByCategory/ProductByCategory';
import img1 from '../../assets/images/img1.jpg';
import Blog from './Blog/Blog';
const cx = classNames.bind(styles);

function HomePage() {
    return (
        <div className={cx('wrapper')}>
            <div>
                <Slide />
            </div>

            <div className={cx('inner')}>
                <div>
                    <div className={cx('header')}>
                        <h2 className="text-2xl font-bold">Sản phẩm mới</h2>
                    </div>
                    <ProductNew />
                </div>

                <div>
                    <ProductByCategory />
                </div>

                <div>
                    <img className="mx-auto" src={img1} alt="" />
                </div>

                <div>
                    <Blog />
                </div>
            </div>
        </div>
    );
}

export default HomePage;
