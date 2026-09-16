import classNames from 'classnames/bind';
import styles from './DetailProduct.module.scss';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';
import { useNavigate, useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import { Rate, Button, InputNumber, Divider, message, Tag, List, Avatar } from 'antd';
import { Comment } from '@ant-design/compatible';
import { MinusOutlined, PlusOutlined, CheckOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons';
import { useEffect, useState, useRef } from 'react';
import Loading from '../../Components/Loading/Loading';
import CardBody from '../../Components/CardBody/CardBody';
import { requestCreateCart } from '../../config/request';
import { useStore } from '../../hooks/userStore';
const cx = classNames.bind(styles);

function DetailProduct() {
    const { id } = useParams();
    const [quantity, setQuantity] = useState(1);
    const { data, loading, error } = useFetch(`/api/get-product-by-id?id=${id}`);
    const { data: reviewsData, loading: reviewsLoading } = useFetch('/api/get-preview-product-home');
    const [selectedImage, setSelectedImage] = useState(null);

    const navigate = useNavigate();

    const { getCart } = useStore();

    const product = data?.product;
    const relatedProducts = Array.isArray(data?.relatedProducts) ? data.relatedProducts : [];
    const reviews = reviewsData?.filter((review) => review.productId === id) || [];

    const productRef = useRef(null);

    useEffect(() => {
        if (product) {
            document.title = `${product.nameProduct}`;
            setSelectedImage(product.images?.split(',')?.[0] || null);
            productRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [product]);

    const handleQuantityChange = (value) => {
        if (value > product?.stock) {
            message.error('Số lượng sản phẩm không đủ');
            return;
        }
        setQuantity(value);
    };

    const handleAddToCart = async () => {
        await requestCreateCart({
            productId: product._id,
            quantity,
        });
        await getCart();
        message.success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng`);
    };

    const handleBuyNow = async () => {
        const data = {
            productId: product._id,
            quantity: 1,
        };
        await requestCreateCart(data);
        await getCart();
        navigate('/checkout');
        message.success('Đang chuyển đến trang thanh toán');
    };

    const calculateDiscountedPrice = (price, discount) => {
        if (!price || !discount) return price;
        return price - (price * discount) / 100;
    };

    const formatPrice = (price) => {
        return price ? new Intl.NumberFormat('vi-VN').format(price) + 'đ' : '';
    };

    if (error) return <div className={cx('error')}>Có lỗi xảy ra: {error}</div>;

    return (
        <div className={cx('wrapper')} ref={productRef}>
            <header>
                <Header />
            </header>
            {loading ? (
                <Loading />
            ) : (
                <main className={cx('product-detail')}>
                    <div className={cx('container')}>
                        <div className={cx('breadcrumb')}>
                            <span>Trang chủ</span> / <span>{product?.category || 'Sản phẩm'}</span> /{' '}
                            <span>{product?.nameProduct}</span>
                        </div>
                        <div className={cx('product-layout')}>
                            <div className={cx('product-images')}>
                                <div className={cx('thumbnail-list')}>
                                    {product?.images &&
                                        product.images.split(',').map((image, index) => (
                                            <div
                                                onClick={() => setSelectedImage(image)}
                                                key={index}
                                                className={cx('thumbnail-item', { active: image === selectedImage })}
                                            >
                                                <img
                                                    src={`${import.meta.env.VITE_URL_IMAGE_API}/${image}`}
                                                    alt={`${product.nameProduct} - ảnh ${index + 1}`}
                                                />
                                            </div>
                                        ))}
                                </div>
                                <div className={cx('main-image')}>
                                    {selectedImage && (
                                        <img
                                            src={`${import.meta.env.VITE_URL_IMAGE_API}/${selectedImage}`}
                                            alt={product?.name}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className={cx('product-info')}>
                                <h1 className={cx('product-name')}>{product?.nameProduct}</h1>
                                <div className={cx('product-header')}>
                                    <div className={cx('product-meta')}>
                                        <span>
                                            Thương hiệu: <a href="#">{product?.brand}</a>
                                        </span>
                                        <span>Model: {product?.modelNumber}</span>
                                    </div>
                                </div>

                                <div className={cx('product-summary')}>
                                    <div className={cx('product-price')}>
                                        <span className={cx('sale-price')}>
                                            {formatPrice(calculateDiscountedPrice(product?.price, product?.discount))}
                                        </span>
                                        {product?.discount > 0 && (
                                            <span className={cx('original-price')}>{formatPrice(product?.price)}</span>
                                        )}
                                        {product?.discount > 0 && (
                                            <span className={cx('discount-badge')}>-{product.discount}%</span>
                                        )}
                                    </div>
                                    <div className={cx('stock-info')}>
                                        <span className={cx('label')}>Tình trạng:</span>
                                        <span className={cx('stock-status', { 'in-stock': product?.stock > 0 })}>
                                            {product?.stock > 0 ? 'Còn hàng' : 'Hết hàng'} ({product?.stock} sản phẩm)
                                        </span>
                                    </div>
                                </div>

                                <Divider />

                                <div className={cx('product-actions')}>
                                    <div className={cx('quantity-selector')}>
                                        <span className={cx('label')}>Số lượng:</span>
                                        <Button
                                            icon={<MinusOutlined />}
                                            onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                                            disabled={product?.stock <= 0}
                                        />
                                        <InputNumber
                                            min={1}
                                            max={product?.stock}
                                            value={quantity}
                                            onChange={handleQuantityChange}
                                            disabled={product?.stock <= 0}
                                        />
                                        <Button
                                            icon={<PlusOutlined />}
                                            onClick={() => handleQuantityChange(Math.min(product?.stock, quantity + 1))}
                                            disabled={product?.stock <= 0}
                                        />
                                    </div>

                                    <div className={cx('action-buttons')}>
                                        <Button
                                            type="primary"
                                            ghost
                                            icon={<ShoppingCartOutlined />}
                                            className={cx('add-to-cart')}
                                            onClick={handleAddToCart}
                                            disabled={product?.stock <= 0}
                                        >
                                            THÊM VÀO GIỎ
                                        </Button>

                                        <Button
                                            type="primary"
                                            className={cx('buy-now')}
                                            onClick={handleBuyNow}
                                            disabled={product?.stock <= 0}
                                        >
                                            MUA NGAY
                                        </Button>
                                    </div>
                                </div>

                                <div className={cx('policy-box')}>
                                    <div className={cx('policy-item')}>
                                        <img src="/icons/warranty.svg" alt="Warranty" className={cx('policy-icon')} />
                                        <span>Bảo hành chính hãng 2 năm</span>
                                    </div>
                                    <div className={cx('policy-item')}>
                                        <img src="/icons/shipping.svg" alt="Shipping" className={cx('policy-icon')} />
                                        <span>Miễn phí vận chuyển toàn quốc</span>
                                    </div>
                                    <div className={cx('policy-item')}>
                                        <img src="/icons/exchange.svg" alt="Exchange" className={cx('policy-icon')} />
                                        <span>Miễn phí 1 đổi 1 trong 7 ngày</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={cx('product-specs-layout')}>
                            <div className={cx('product-description')}>
                                <h2>Mô tả sản phẩm</h2>
                                <div dangerouslySetInnerHTML={{ __html: product?.description }} />
                            </div>
                            <div className={cx('product-specs')}>
                                <h2>Thông tin sản phẩm</h2>
                                <table className={cx('specs-table')}>
                                    <tbody>
                                        <tr>
                                            <td>Thương hiệu</td>
                                            <td>{product?.brand}</td>
                                        </tr>
                                        <tr>
                                            <td>Xuất xứ</td>
                                            <td>{product?.origin}</td>
                                        </tr>
                                        <tr>
                                            <td>Giới tính</td>
                                            <td>{product?.gender}</td>
                                        </tr>
                                        <tr>
                                            <td>Loại máy</td>
                                            <td>{product?.movement}</td>
                                        </tr>
                                        <tr>
                                            <td>Chất liệu kính</td>
                                            <td>{product?.glassMaterial}</td>
                                        </tr>
                                        <tr>
                                            <td>Chất liệu dây</td>
                                            <td>{product?.strapMaterial}</td>
                                        </tr>
                                        <tr>
                                            <td>Đường kính mặt số</td>
                                            <td>{product?.dialDiameter} mm</td>
                                        </tr>
                                        <tr>
                                            <td>Bề dày mặt số</td>
                                            <td>{product?.caseThickness} mm</td>
                                        </tr>
                                        <tr>
                                            <td>Chống nước</td>
                                            <td>{product?.waterResistance}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={cx('product-reviews')}>
                            <h2>Đánh giá từ khách hàng</h2>
                            {reviewsLoading ? (
                                <Loading />
                            ) : reviews.length > 0 ? (
                                <List
                                    className={cx('review-list')}
                                    itemLayout="horizontal"
                                    dataSource={reviews}
                                    renderItem={(review) => (
                                        <List.Item>
                                            <Comment
                                                author={<a>{review.user.name}</a>}
                                                avatar={<Avatar icon={<UserOutlined />} />}
                                                content={
                                                    <div>
                                                        <Rate disabled value={review.rating || 5} />
                                                        <p>{review.content}</p>
                                                        {review.image && (
                                                            <div className={cx('review-image')}>
                                                                <img src={review.image} alt="Review" />
                                                            </div>
                                                        )}
                                                    </div>
                                                }
                                                datetime={
                                                    <span>
                                                        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                                                    </span>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            ) : (
                                <div className={cx('no-reviews')}>
                                    <p>Chưa có đánh giá nào cho sản phẩm này.</p>
                                </div>
                            )}
                        </div>

                        <div className={cx('product-related')}>
                            <h2>Sản phẩm liên quan</h2>
                            <div className={cx('product-list')}>
                                {relatedProducts.map((product) => (
                                    <CardBody key={product._id} item={product} />
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            )}
            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default DetailProduct;
