import React, { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from './ManagerStatistical.module.scss';
import { Card, Row, Col, Statistic, Table, Tabs, Spin, Divider, Typography, Badge, Empty, Progress, Rate } from 'antd';
import {
    UserOutlined,
    ShoppingOutlined,
    DollarOutlined,
    ShoppingCartOutlined,
    StarOutlined,
    BarChartOutlined,
    RiseOutlined,
    ArrowUpOutlined,
    PieChartOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import { Line, Pie, Column } from '@ant-design/plots';

import { requestAdmin, requestStatistical } from '../../../../config/request';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const cx = classNames.bind(styles);

function ManagerStatistical() {
    const [statistical, setStatistical] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = 'Thống kê';
        const fetchStatistical = async () => {
            try {
                setLoading(true);
                const response = await requestStatistical();
                setStatistical(response.metadata);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching statistical data:', error);
                setLoading(false);
            }
        };
        fetchStatistical();
    }, []);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                await requestAdmin();
                return;
            } catch (error) {
                navigate('/');
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className={cx('loading-container')}>
                <Spin size="large" tip="Đang tải dữ liệu thống kê..." />
            </div>
        );
    }

    if (!statistical) {
        return <Empty description="Không có dữ liệu thống kê" />;
    }

    // Format revenue data for Line chart
    const revenueData = statistical.revenue.byMonth.map((item) => ({
        month: `Tháng ${item._id}`,
        revenue: item.revenue,
    }));

    // Top selling products columns
    const topProductColumns = [
        {
            title: 'Tên sản phẩm',
            dataIndex: 'nameProduct',
            key: 'nameProduct',
        },
        {
            title: 'Giá',
            dataIndex: 'price',
            key: 'price',
            render: (price) => `${price.toLocaleString('vi-VN')}đ`,
        },
        {
            title: 'Đã bán',
            dataIndex: 'soldCount',
            key: 'soldCount',
            sorter: (a, b) => a.soldCount - b.soldCount,
        },
    ];

    // Format category data for pie chart
    const categoryData = statistical.products.byCategory.map((item) => ({
        type: item._id,
        value: item.count,
    }));

    // Format status data for pie chart
    const orderStatusData = statistical.orders.byStatus.map((item) => ({
        type: formatStatus(item._id),
        value: item.count,
    }));

    // Best rated products
    const bestRatedColumns = [
        {
            title: 'Sản phẩm',
            dataIndex: 'productDetails',
            key: 'name',
            render: (product) => product.name,
        },
        {
            title: 'Đánh giá trung bình',
            dataIndex: 'averageRating',
            key: 'averageRating',
            render: (rating) => (
                <div>
                    <Rate disabled defaultValue={Math.round(rating)} />
                    <Text strong>{rating.toFixed(1)} / 5</Text>
                </div>
            ),
        },
        {
            title: 'Số lượng đánh giá',
            dataIndex: 'reviewCount',
            key: 'reviewCount',
        },
    ];

    // Format payment method data for pie chart
    const paymentMethodData = statistical.orders.byPaymentMethod.map((item) => ({
        type: formatPaymentMethod(item._id),
        value: item.count,
    }));

    // Ensure we always have 7 days of data
    const ensureSevenDaysData = () => {
        if (!statistical.revenue.last7Days || statistical.revenue.last7Days.length === 0) {
            // If no data, create 7 days with zero revenue
            const today = new Date();
            return Array.from({ length: 7 }, (_, i) => {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                return {
                    day: `${date.getDate()}/${date.getMonth() + 1}`,
                    revenue: 0,
                    count: 0,
                };
            }).reverse();
        }

        // Create a map of existing days
        const existingDaysMap = {};
        statistical.revenue.last7Days.forEach((item) => {
            existingDaysMap[item.day] = item;
        });

        // Get the dates for the last 7 days
        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        }).reverse();

        // Create complete dataset with zeros for missing days
        return last7Days.map((day) => {
            return existingDaysMap[day] || { day, revenue: 0, count: 0 };
        });
    };

    const completeRevenueData = ensureSevenDaysData();

    return (
        <div className={cx('wrapper')}>
            <Title level={2} className={cx('dashboard-title')}>
                <BarChartOutlined /> Tổng quan
            </Title>

            {/* Summary Stats Cards */}
            <Row gutter={[16, 16]} className={cx('summary-row')}>
                <Col xs={24} sm={12} md={12} lg={6}>
                    <Card bordered={false} className={cx('stat-card')}>
                        <Statistic
                            title="Tổng số người dùng"
                            value={statistical.users.total}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: '#0050b3' }}
                        />
                        <div className={cx('card-footer')}>
                            <Text type="secondary">
                                {statistical.users.byLoginType
                                    .map((type) => `${type.count} qua ${type._id === 'email' ? 'Email' : 'Google'}`)
                                    .join(' | ')}
                            </Text>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={12} lg={6}>
                    <Card bordered={false} className={cx('stat-card')}>
                        <Statistic
                            title="Tổng số sản phẩm"
                            value={statistical.products.total}
                            prefix={<ShoppingOutlined />}
                            valueStyle={{ color: '#531dab' }}
                        />
                        <div className={cx('card-footer')}>
                            <Text type="secondary">{statistical.products.byCategory.length} danh mục</Text>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={12} lg={6}>
                    <Card bordered={false} className={cx('stat-card')}>
                        <Statistic
                            title="Tổng đơn hàng"
                            value={statistical.orders.total}
                            prefix={<ShoppingCartOutlined />}
                            valueStyle={{ color: '#237804' }}
                        />
                        <div className={cx('card-footer')}>
                            <Text type="secondary">
                                {statistical.orders.byStatus.find((s) => s._id === 'delivered')?.count || 0} đã giao
                            </Text>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={12} lg={6}>
                    <Card bordered={false} className={cx('stat-card')}>
                        <Statistic
                            title="Tổng doanh thu"
                            value={statistical.revenue.total}
                            prefix={<DollarOutlined />}
                            suffix="đ"
                            valueStyle={{ color: '#ad4e00' }}
                        />
                        <div className={cx('card-footer')}>
                            <Text type="secondary">
                                <ArrowUpOutlined /> Doanh thu thành công
                            </Text>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Tabs defaultActiveKey="1" className={cx('tabs-container')}>
                <TabPane
                    tab={
                        <span>
                            <RiseOutlined /> Doanh thu
                        </span>
                    }
                    key="1"
                >
                    <Card
                        title={
                            <div>
                                <CalendarOutlined /> Doanh thu 7 ngày gần đây
                            </div>
                        }
                        bordered={false}
                    >
                        <Column
                            data={completeRevenueData}
                            xField="day"
                            yField="revenue"
                            minColumnWidth={30}
                            maxColumnWidth={60}
                            label={{
                                position: 'top',
                                style: {
                                    fill: '#595959',
                                    fontSize: 12,
                                },
                                formatter: (v) => {
                                    return v.revenue > 0 ? `${(v.revenue / 1000000).toFixed(1)}tr` : '';
                                },
                            }}
                            tooltip={{
                                formatter: (data) => {
                                    return {
                                        name: 'Doanh thu',
                                        value:
                                            data.revenue > 0
                                                ? `${data.revenue.toLocaleString('vi-VN')}đ (${data.count || 0} đơn)`
                                                : 'Không có doanh thu',
                                    };
                                },
                            }}
                            columnStyle={{
                                radius: [10, 10, 0, 0],
                                shadow: '0px 2px 5px rgba(0, 0, 0, 0.1)',
                            }}
                            color={(data) => {
                                return data.revenue > 0 ? '#1890ff' : '#e6f7ff';
                            }}
                            yAxis={{
                                min: 0,
                                tickCount: 5,
                            }}
                        />
                    </Card>
                </TabPane>

                <TabPane
                    tab={
                        <span>
                            <ShoppingOutlined /> Sản phẩm
                        </span>
                    }
                    key="2"
                >
                    <Row gutter={[16, 16]}>
                        <Col xs={24} lg={24}>
                            <Card title="Sản phẩm bán chạy" bordered={false}>
                                <Table
                                    dataSource={statistical.products.topSelling}
                                    columns={topProductColumns}
                                    rowKey="_id"
                                    pagination={false}
                                />
                            </Card>
                        </Col>
                    </Row>
                </TabPane>

                <TabPane
                    tab={
                        <span>
                            <StarOutlined /> Đánh giá
                        </span>
                    }
                    key="4"
                >
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                            <Card bordered={false}>
                                <Statistic
                                    title="Tổng số đánh giá"
                                    value={statistical.reviews.total}
                                    prefix={<StarOutlined />}
                                    valueStyle={{ color: '#faad14' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card bordered={false}>
                                <Statistic
                                    title="Đánh giá trung bình"
                                    value={statistical.reviews.averageRating.toFixed(1)}
                                    suffix="/5"
                                    prefix={<StarOutlined />}
                                    valueStyle={{ color: '#faad14' }}
                                />
                                <Progress
                                    percent={(statistical.reviews.averageRating / 5) * 100}
                                    strokeColor="#faad14"
                                    showInfo={false}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card bordered={false} className={cx('rating-distribution')}>
                                <Statistic
                                    title="Sản phẩm có đánh giá"
                                    value={statistical.reviews.bestRatedProducts.length}
                                    prefix={<StarOutlined />}
                                    valueStyle={{ color: '#faad14' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24}>
                            <Card title="Sản phẩm được đánh giá cao nhất" bordered={false}>
                                <Table
                                    dataSource={statistical.reviews.bestRatedProducts}
                                    columns={bestRatedColumns}
                                    rowKey="_id"
                                    pagination={false}
                                />
                            </Card>
                        </Col>
                    </Row>
                </TabPane>
            </Tabs>
        </div>
    );
}

// Helper functions
function formatStatus(status) {
    switch (status) {
        case 'pending':
            return 'Chờ xác nhận';
        case 'confirmed':
            return 'Đã xác nhận';
        case 'shipped':
            return 'Đang giao hàng';
        case 'delivered':
            return 'Đã giao hàng';
        case 'cancelled':
            return 'Đã hủy';
        default:
            return status;
    }
}

function formatPaymentMethod(method) {
    switch (method) {
        case 'COD':
            return 'Tiền mặt';
        case 'VNPAY':
            return 'VNPay';
        case 'MOMO':
            return 'MoMo';
        default:
            return method;
    }
}

export default ManagerStatistical;
