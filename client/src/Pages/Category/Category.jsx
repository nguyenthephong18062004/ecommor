import classNames from 'classnames/bind';
import styles from './Category.module.scss';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';

import { Select } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { FilterOutlined } from '@ant-design/icons';
import useFetch from '../../hooks/useFetch';
import CardBody from '../../Components/CardBody/CardBody';
import Loading from '../../Components/Loading/Loading';

const cx = classNames.bind(styles);

function Category() {
    const [title, setTitle] = useState('');
    const [priceFilter, setPriceFilter] = useState('0');
    const [discountFilter, setDiscountFilter] = useState('0');
    const { id } = useParams();

    const url = `/api/get-product-by-category?category=${id}${priceFilter !== '0' ? `&price=${priceFilter}` : ''}${
        discountFilter !== '0' ? `&discount=${discountFilter}` : ''
    }`;
    const { data, error, loading, reFetch } = useFetch(url);
    const products = Array.isArray(data) ? data : [];

    useEffect(() => {
        const nameCategory = localStorage.getItem('nameCategory');
        setTitle(nameCategory);
        document.title = `${nameCategory} - Đẹp nhất 2025 `;
    }, [id]);

    const handlePriceChange = (value) => {
        setPriceFilter(value);
    };

    const handleDiscountChange = (value) => {
        setDiscountFilter(value);
    };

    // Re-fetch when filters change
    useEffect(() => {
        if (data) {
            reFetch();
        }
    }, [priceFilter, discountFilter]);

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>
            <main className={cx('container1')}>
                <div className={cx('banner')}>
                    <img src="https://louris.wpbingosite.com/wp-content/uploads/2025/04/slider-2.jpg" alt="" />
                </div>

                <div className={cx('inner')}>
                    <h2>{title}</h2>

                    <div className={cx('filter')}>
                        <div className={cx('filter-title')}>
                            <FilterOutlined /> Bộ lọc
                        </div>
                        <div>
                            <Select
                                defaultValue="0"
                                style={{ width: 300, marginRight: 10 }}
                                onChange={handlePriceChange}
                                options={[
                                    { value: '0', label: 'Chọn giá' },
                                    { value: '1', label: 'Dưới 500.000 VNĐ' },
                                    { value: '2', label: 'Từ 500.000 VNĐ - 1.000.000 VNĐ' },
                                    { value: '3', label: 'Từ 1.000.000 VNĐ - 2.000.000 VNĐ' },
                                    { value: '5', label: 'Trên 5.000.000 VNĐ' },
                                ]}
                            />

                            <Select
                                defaultValue="0"
                                style={{ width: 300, marginRight: 10 }}
                                onChange={handleDiscountChange}
                                options={[
                                    { value: '0', label: 'Giảm giá' },
                                    { value: '1', label: '10%' },
                                    { value: '2', label: '20%' },
                                    { value: '3', label: '30%' },
                                    { value: '4', label: '40%' },
                                ]}
                            />
                        </div>
                    </div>
                    {loading ? (
                        <Loading />
                    ) : (
                        <div className={cx('list-product')}>
                            {products.map((product) => (
                                <CardBody key={product?._id} item={product} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default Category;
