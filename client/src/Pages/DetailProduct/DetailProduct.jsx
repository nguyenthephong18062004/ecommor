import classNames from 'classnames/bind';
import styles from './DetailProduct.module.scss';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Image, InputNumber, Modal, Result, Space, Tag, message } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import useFetch from '../../hooks/useFetch';
import useSeo from '../../hooks/useSeo';
import Loading from '../../Components/Loading/Loading';
import CardBody from '../../Components/CardBody/CardBody';
import ProductActions from '../../Components/ProductActions';
import ProductReviews from '../../Components/ProductReviews';
import RichText from '../../Components/RichText';
import { requestCreateCart } from '../../config/request';
import { useStore } from '../../hooks/userStore';
import { uploadUrl } from '../../config/runtimeUrls';
import useRequireAuth from '../../hooks/useRequireAuth';
import { money, salePrice, canBuy, canOrder, availability, productSpecs, specValue, dateTime } from '../../utils/format';

const cx = classNames.bind(styles);
export default function DetailProduct() {
    const { id } = useParams();
    const { data, loading, error, reFetch } = useFetch(`/api/get-product-by-id?id=${encodeURIComponent(id)}`);
    const product = data?.product;
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState('');
    const [sizeOpen, setSizeOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const submitting = useRef(false);
    const { getCart, addRecent } = useStore();
    const requireAuth = useRequireAuth();
    const navigate = useNavigate();
    useSeo({ title: product?.nameProduct || 'Thông tin đồng hồ', product,
        breadcrumbs: [['Trang chủ', '/'], ['Đồng hồ', '/category/all'], [product?.nameProduct || 'Sản phẩm', `/product/${id}`]],
        description: product ? `${product.nameProduct} — xem thông số, tình trạng, bảo hành và phương thức mua hàng tại ECOMMOR.` : undefined });

    useEffect(() => {
        if (!product) return;
        setSelectedImage(product.images?.split(',')[0] || '');
        setQuantity(1);
        addRecent(product._id);
    }, [product, addRecent]);

    const buy = async checkout => {
        if (submitting.current || !canBuy(product) || !requireAuth('mua hàng')) return;
        submitting.current = true; setBusy(true);
        try {
            await requestCreateCart({ productId: product._id, quantity });
            await getCart();
            if (checkout) navigate('/checkout');
            else message.success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng.`);
        } catch (err) {
            message.error(err.response?.data?.message || 'Không thể thêm vào giỏ hàng. Vui lòng thử lại.');
        } finally { submitting.current = false; setBusy(false); }
    };

    return <div className={cx('wrapper')}>
        <Header />
        {loading ? <Loading /> : error ? <main className="page-shell"><Alert type="error" message={error} action={<Button onClick={reFetch}>Thử lại</Button>} /></main>
            : !product ? <Result status="404" title="Không tìm thấy sản phẩm" /> : <main className={cx('product-detail')}>
                <div className={cx('container')}>
                    <nav className={cx('breadcrumb')} aria-label="Đường dẫn">
                        <Link to="/">Trang chủ</Link> / <Link to={`/category/${product.category || 'all'}`}>Đồng hồ</Link> / {product.nameProduct}
                    </nav>
                    <div className={cx('product-layout')}>
                        <div className={cx('product-images')}>
                            <div className={cx('thumbnail-list')}>
                                {product.images?.split(',').map((image, index) => <button type="button" key={image}
                                    aria-label={`Xem ảnh ${index + 1}`} aria-pressed={image === selectedImage}
                                    onClick={() => setSelectedImage(image)} className={cx('thumbnail-item', { active: image === selectedImage })}>
                                    <img src={uploadUrl(image)} alt={`${product.nameProduct} — ảnh ${index + 1}`} loading="lazy" width="80" height="80" />
                                </button>)}
                            </div>
                            <div className={cx('main-image')}>
                                {selectedImage && <Image src={uploadUrl(selectedImage)} alt={product.nameProduct} width="100%" />}
                            </div>
                        </div>
                        <div className={cx('product-info')}>
                            <h1 className={cx('product-name')}>{product.nameProduct}</h1>
                            <p><Link to={`/category/brand/${encodeURIComponent(product.brand)}`}>{product.brand}</Link> · Mã: {product.modelNumber}</p>
                            <ProductActions id={product._id} />
                            <div className={cx('product-summary')}>
                                <div className={cx('product-price')}>
                                    <strong className={cx('sale-price')}>{money(salePrice(product))}</strong>
                                    {product.discount > 0 && <del className={cx('original-price')}>{money(product.price)}</del>}
                                </div>
                                <Tag color={canBuy(product) ? 'green' : 'default'}>{availability(product)}</Tag>
                                {product.verificationStatus !== 'verified' && <Alert showIcon type="info" message="Giá và thông số mang tính tham khảo. Cửa hàng cần xác nhận thông tin trước khi bán." />}
                                {product.expectedRestockAt && canOrder(product) && <p>Dự kiến có hàng: {dateTime(product.expectedRestockAt)}. Lịch cụ thể được xác nhận khi tư vấn.</p>}
                            </div>
                            <div className={cx('product-actions')}>
                                {canBuy(product) ? <>
                                    <Space><label htmlFor="product-quantity">Số lượng</label><InputNumber id="product-quantity" min={1} max={product.stock} precision={0}
                                        value={quantity} onChange={value => setQuantity(Number.isInteger(value) && value > 0 ? Math.min(value, product.stock) : 1)} /></Space>
                                    <div className={cx('action-buttons')}>
                                        <Button icon={<ShoppingCartOutlined />} loading={busy} onClick={() => buy(false)}>Thêm vào giỏ</Button>
                                        <Button type="primary" loading={busy} onClick={() => buy(true)}>Mua ngay</Button>
                                    </div>
                                </> : canOrder(product) ? <Button type="primary" onClick={() => {
                                    if (requireAuth('đặt hàng theo yêu cầu')) navigate(`/dat-hang/${product._id}`);
                                }}>Đặt hàng theo yêu cầu</Button> : <Link to="/contact"><Button>Liên hệ tư vấn</Button></Link>}
                            </div>
                            <Button type="link" onClick={() => setSizeOpen(true)}>Hướng dẫn chọn kích thước</Button>
                            <div className={cx('policy-box')}>
                                <p>Bảo hành: {product.warrantyGlobal || 'Liên hệ cửa hàng để xác nhận theo sản phẩm.'}</p>
                                <p><Link to="/chinh-sach/giao-hang">Xem giao hàng và phí vận chuyển</Link></p>
                                <p><Link to="/chinh-sach/doi-tra">Điều kiện đổi trả và hỗ trợ sau mua</Link></p>
                            </div>
                        </div>
                    </div>
                    <div className={cx('product-specs-layout')}>
                        <section className={cx('product-description')}><h2>Mô tả sản phẩm</h2><RichText html={product.description} /></section>
                        <section className={cx('product-specs')}><h2>Thông tin sản phẩm</h2>
                            <table className={cx('specs-table')}><tbody>
                                {productSpecs.map(([key, label]) => <tr key={key}><th scope="row">{label}</th><td>{specValue(product, key)}</td></tr>)}
                                <tr><th scope="row">Tình trạng sản phẩm</th><td>{product.condition === 'preowned' ? 'Đã qua sử dụng' : product.condition === 'new' ? 'Mới' : 'Chưa xác minh'}</td></tr>
                                {product.verificationNote && <tr><th scope="row">Thông tin xác minh</th><td>{product.verificationNote}</td></tr>}
                            </tbody></table>
                        </section>
                    </div>
                    <ProductReviews productId={id} />
                    <section className={cx('product-related')}><h2>Sản phẩm liên quan</h2>
                        <div className={cx('product-list')}>{(data.relatedProducts || []).map(item => <CardBody key={item._id} item={item} variant="catalog" />)}</div>
                    </section>
                </div>
            </main>}
        <Modal title="Chọn kích thước đồng hồ" open={sizeOpen} onCancel={() => setSizeOpen(false)} footer={<Button onClick={() => setSizeOpen(false)}>Đóng</Button>}>
            <ol><li>Đo chu vi cổ tay bằng thước dây tại vị trí bạn thường đeo đồng hồ.</li>
                <li>Đối chiếu đường kính mặt, độ dày và kích thước dây trong bảng thông số của từng mẫu.</li>
                <li>Với mặt chữ nhật hoặc nhiều lựa chọn cỡ, xem kích thước đầy đủ trong mô tả và trao đổi với cửa hàng.</li></ol>
            <p>Chu vi cổ tay và đường kính mặt là hai thông số khác nhau. Bạn nên thử trực tiếp hoặc yêu cầu tư vấn trước khi chọn.</p>
            <Link to="/contact">Liên hệ tư vấn kích thước</Link>
        </Modal>
        <Footer />
    </div>;
}
