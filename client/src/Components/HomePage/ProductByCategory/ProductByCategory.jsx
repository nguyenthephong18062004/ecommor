import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Typography } from 'antd';

const { Title, Text } = Typography;
const { Meta } = Card;

import { useStore } from '../../../hooks/userStore';
import useFetch from '../../../hooks/useFetch';
import CardBody from '../../CardBody/CardBody';

function ProductByCategory() {
    const { category } = useStore();
    const categories = Array.isArray(category) ? category : [];

    const [selectedCategory, setSelectedCategory] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);

    useEffect(() => {
        setSelectedCategory(categories[0]?._id || '');
    }, [categories]);

    const url = selectedCategory ? `/api/get-product-by-category?category=${selectedCategory}` : '';
    const { data } = useFetch(url);

    useEffect(() => {
        setFilteredProducts(Array.isArray(data) ? data : []);
    }, [data]);
    return (
        <div className="py-8 ">
            <div className="container mx-auto px-4">
                <Title level={2} className="text-center mb-8 font-bold">
                    Khám phá sản phẩm theo danh mục
                </Title>

                <div className="flex justify-center mb-8 space-x-2">
                    {categories.map((cat) => (
                        <Button
                            key={cat._id}
                            type={selectedCategory === cat._id ? 'primary' : 'default'}
                            size="large"
                            className="font-semibold rounded-lg"
                            style={
                                selectedCategory === cat._id
                                    ? { backgroundColor: '#ef683a', borderColor: '#ef683a' }
                                    : {}
                            }
                            onClick={() => setSelectedCategory(cat._id)}
                        >
                            {cat.name}
                        </Button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {filteredProducts.map((product) => (
                        <CardBody key={product._id} item={product} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ProductByCategory;
