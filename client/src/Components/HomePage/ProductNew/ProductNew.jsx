import classNames from 'classnames/bind';
import styles from './ProductNew.module.scss';
import CardBody from '../../CardBody/CardBody';
import CatalogSection from './CatalogSection';
import { Alert, Button, Skeleton } from 'antd';
import { RefreshCw } from 'lucide-react';
import useProductCatalog from '../../../hooks/useProductCatalog';

const cx = classNames.bind(styles);

function ProductNew() {
    const { data, loading, error, retry } = useProductCatalog();

    return (
        <div className={cx('catalog')}>
            <section className={cx('section')} aria-labelledby="new-products-title" aria-busy={loading}>
                <div className={cx('section-heading')}>
                    <div>
                        <span className={cx('eyebrow')}>Vừa cập nhật</span>
                        <h2 id="new-products-title">Sản phẩm mới</h2>
                    </div>
                    <span className={cx('count')}>{data?.items?.length || 0} sản phẩm</span>
                </div>
                {error ? (
                    <Alert type="error" showIcon message="Không thể tải sản phẩm"
                        action={<Button icon={<RefreshCw size={16} />} onClick={retry}>Thử lại</Button>} />
                ) : (
                    <div className={cx('product-list')}>
                        {loading ? Array.from({ length: 10 }, (_, index) => (
                            <div className={cx('placeholder')} key={index} aria-hidden="true"><Skeleton active paragraph={{ rows: 3 }} /></div>
                        )) : data?.items?.map(item => <CardBody item={item} variant="catalog" key={item._id} />)}
                    </div>
                )}
            </section>
            {data?.sections?.filter(section => section.type !== 'new' && section.total > 0)
                .map(section => <CatalogSection key={section.key} section={section} />)}
        </div>
    );
}

export default ProductNew;
