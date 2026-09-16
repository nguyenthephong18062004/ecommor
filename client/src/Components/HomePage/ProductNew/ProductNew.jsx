import classNames from 'classnames/bind';
import styles from './ProductNew.module.scss';
import CardBody from '../../CardBody/CardBody';
import useFetch from '../../../hooks/useFetch';
import Loading from '../../Loading/Loading';

const cx = classNames.bind(styles);

function ProductNew() {
    const { data, loading, error } = useFetch('/api/get-product-new');
    const products = Array.isArray(data) ? data : [];

    if (loading) {
        return (
            <div>
                <Loading />
            </div>
        );
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className={cx('wrapper')}>
            <div className={cx('product-list')}>
                {products.map((item) => (
                    <CardBody item={item} key={item._id} />
                ))}
            </div>
        </div>
    );
}

export default ProductNew;
