import classNames from 'classnames/bind';
import styles from './CardBody.module.scss';
import { Link } from 'react-router-dom';
import { uploadUrl } from '../../config/runtimeUrls';
import { money, salePrice, availability, canOrder, canBuy } from '../../utils/format';
import ProductActions from '../ProductActions';

const cx = classNames.bind(styles);

function CardBody({ item, variant }) {
    const image = item?.images?.split(',')?.[0];

    return (
        <div className={cx('wrapper', { catalog: variant === 'catalog' })}>
            <div className={cx('imageContainer')}>
                {item?.discount > 0 && <span className={cx('discountBadge')}>-{item?.discount}%</span>}
                <Link to={`/product/${item?._id}`}>
                    <img
                        src={uploadUrl(image)}
                        alt={item?.nameProduct}
                        loading="lazy" decoding="async" width="240" height="240"
                    />
                </Link>
            </div>

            <div className={cx('content')}>
                <h3 className={cx('title')}>{item?.nameProduct}</h3>
                <div className={cx('priceContainer')}>
                    <span className={cx('currentPrice')}>
                        {money(salePrice(item))}
                    </span>
                    {item?.discount > 0 && <span className={cx('originalPrice')}>{money(item.price)}</span>}
                </div>
                {!canBuy(item) && !canOrder(item) && <small>Giá tham khảo · {availability(item)}</small>}
                <ProductActions id={item?._id} />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                    {variant === 'catalog' ? (
                        canOrder(item)
                            ? <Link className={cx('preorderLink')} to={`/dat-hang/${item._id}`}>Hàng đặt · Đặt hàng</Link>
                            : <p className={cx('soldInfo')}>{availability(item)}</p>
                    ) : (
                        <>
                            {item?.soldCount >= 0 && <p className={cx('soldInfo')}>Đã bán {item?.soldCount}</p>}
                            <p className={cx('soldInfo')}>Số lượng trong kho : {item?.stock}</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CardBody;
