import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Empty, Pagination, Skeleton } from 'antd';
import { RefreshCw } from 'lucide-react';
import CardBody from '../../CardBody/CardBody';
import useProductCatalog from '../../../hooks/useProductCatalog';
import classNames from 'classnames/bind';
import styles from './ProductNew.module.scss';

const cx = classNames.bind(styles);

function CatalogSection({ section }) {
    const container = useRef(null);
    const [visible, setVisible] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const param = `sectionPage:${section.key}`;
    const rawPage = searchParams.get(param);
    const page = /^[1-9]\d*$/.test(rawPage || '') && Number.isSafeInteger(Number(rawPage)) ? Number(rawPage) : 1;
    const { data, loading, error, retry } = useProductCatalog(section.type, section.value, page, visible);

    useEffect(() => {
        if (visible) return undefined;
        if (!('IntersectionObserver' in window)) {
            setVisible(true);
            return undefined;
        }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                setVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '500px 0px' });
        observer.observe(container.current);
        return () => observer.disconnect();
    }, [visible]);

    useEffect(() => {
        if (!data || loading || error || rawPage === null || rawPage === String(data.page)) return;
        setSearchParams(previous => {
            const next = new URLSearchParams(previous);
            next.set(param, String(data.page));
            return next;
        }, { replace: true });
    }, [data, loading, error, rawPage, param, setSearchParams]);

    const changePage = nextPage => {
        setSearchParams(previous => {
            const next = new URLSearchParams(previous);
            next.set(param, String(nextPage));
            return next;
        });
        container.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <section className={cx('section')} ref={container} aria-labelledby={`section-${section.key}`} aria-busy={visible && loading}>
            <div className={cx('section-heading')}>
                <div>
                    <span className={cx('eyebrow')}>{section.type === 'brand' ? 'Thương hiệu' : 'Bộ sưu tập'}</span>
                    <h2 id={`section-${section.key}`}>{section.label}</h2>
                </div>
                <span className={cx('count')}>{section.total} sản phẩm</span>
            </div>
            {error ? (
                <Alert type="error" showIcon message="Không thể tải sản phẩm"
                    action={<Button icon={<RefreshCw size={16} />} onClick={retry}>Thử lại</Button>} />
            ) : visible && !loading && !data?.items?.length ? (
                <div className={cx('empty')}><Empty description="Chưa có sản phẩm" /></div>
            ) : (
                <div className={cx('product-list')}>
                    {!visible || loading ? Array.from({ length: Math.min(section.total, 10) }, (_, index) => (
                        <div className={cx('placeholder')} key={index} aria-hidden="true"><Skeleton active paragraph={{ rows: 3 }} /></div>
                    )) : data.items.map(item => <CardBody item={item} variant="catalog" key={item._id} />)}
                </div>
            )}
            {section.pages > 1 && (
                <nav className={cx('pagination')} aria-label={`Phân trang ${section.label}`}>
                    <Pagination current={data?.page || page} total={section.total} pageSize={10}
                        showSizeChanger={false} showLessItems responsive disabled={!visible || loading || !!error}
                        onChange={changePage} />
                </nav>
            )}
        </section>
    );
}

export default CatalogSection;
