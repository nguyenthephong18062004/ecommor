import React, { useState, useEffect } from 'react';
import { Typography, Button, Card, Skeleton, Badge, Avatar } from 'antd';
import { ArrowRightOutlined, CalendarOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons';
import { requestGetAllBlog } from '../../../config/request';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE_API;

const Blog = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                setLoading(true);
                const response = await requestGetAllBlog();
                setBlogs(response.metadata);
            } catch (error) {
                console.error('Failed to fetch blogs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBlogs();
    }, []);

    // Loading skeleton
    if (loading) {
        return (
            <div className="container mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <Skeleton.Input active size="large" style={{ width: 300, height: 40 }} />
                    <br />
                    <br />
                    <Skeleton.Input active style={{ width: 500, height: 20 }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <Skeleton.Image style={{ width: '100%', height: 400 }} />
                        <br />
                        <br />
                        <Skeleton active paragraph={{ rows: 3 }} />
                    </div>
                    <div className="col-span-1 flex flex-col gap-8">
                        <div>
                            <Skeleton.Image style={{ width: '100%', height: 200 }} />
                            <br />
                            <br />
                            <Skeleton active paragraph={{ rows: 2 }} />
                        </div>
                        <div>
                            <Skeleton.Image style={{ width: '100%', height: 200 }} />
                            <br />
                            <br />
                            <Skeleton active paragraph={{ rows: 2 }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (blogs.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16">
                <div className="text-center">
                    <Title level={3} className="text-gray-500">
                        Chưa có bài viết nào
                    </Title>
                    <Paragraph className="text-gray-400">Hãy quay lại sau để xem những bài viết mới nhất.</Paragraph>
                </div>
            </div>
        );
    }

    const featuredBlog = blogs[0];
    const otherBlogs = blogs.slice(1, 3); // Lấy 3 bài thay vì 2

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const FeaturedBlogCard = ({ blog }) => (
        <Card
            hoverable
            className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
            bodyStyle={{ padding: 0 }}
        >
            <div className="relative overflow-hidden">
                <img
                    src={`${URL_IMAGE}${blog.image}`}
                    alt={blog.title}
                    className="w-full h-96 object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Badge.Ribbon text="Nổi bật" color="red" className="opacity-90">
                    <div />
                </Badge.Ribbon>
            </div>

            <div className="p-8">
                <div className="flex items-center gap-4 mb-4 text-gray-500">
                    <div className="flex items-center gap-2">
                        <Avatar size="small" icon={<UserOutlined />} />
                        <Text className="text-sm">Admin</Text>
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarOutlined />
                        <Text className="text-sm">{formatDate(blog.createdAt || new Date())}</Text>
                    </div>
                    <div className="flex items-center gap-2">
                        <EyeOutlined />
                        <Text className="text-sm">{Math.floor(Math.random() * 1000) + 100} lượt xem</Text>
                    </div>
                </div>

                <Title level={3} className="mb-4 group-hover:text-orange-600 transition-colors duration-300">
                    {blog.title}
                </Title>

                <Paragraph className="text-gray-600 mb-6 line-clamp-3">{blog.description || blog.title}</Paragraph>
                <Link to={`/blogs/${blog._id}`}>
                    <Button
                        type="primary"
                        size="large"
                        className="bg-gradient-to-r from-orange-500 to-red-500 border-0 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-300"
                        icon={<ArrowRightOutlined />}
                        iconPosition="end"
                    >
                        Đọc bài viết
                    </Button>
                </Link>
            </div>
        </Card>
    );

    const RegularBlogCard = ({ blog }) => (
        <Card
            hoverable
            className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            bodyStyle={{ padding: 0 }}
        >
            <div className="relative overflow-hidden">
                <img
                    src={`${URL_IMAGE}${blog.image}`}
                    alt={blog.title}
                    className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            <div className="p-6">
                <div className="flex items-center gap-3 mb-3 text-gray-500 text-xs">
                    <div className="flex items-center gap-1">
                        <CalendarOutlined />
                        <span>{formatDate(blog.createdAt || new Date())}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <EyeOutlined />
                        <span>{Math.floor(Math.random() * 500) + 50}</span>
                    </div>
                </div>

                <Title
                    level={5}
                    className="mb-3 line-clamp-2 group-hover:text-orange-600 transition-colors duration-300"
                >
                    {blog.title}
                </Title>

                <Paragraph className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {blog.description || blog.title}
                </Paragraph>

                <Button
                    type="link"
                    className="p-0 font-semibold text-orange-600 hover:text-orange-700 transition-colors duration-300"
                    icon={<ArrowRightOutlined />}
                    iconPosition="end"
                >
                    Xem thêm
                </Button>
            </div>
        </Card>
    );

    return (
        <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
            <div className="container mx-auto px-4 py-20">
                {/* Header Section */}
                <div className="text-center mb-16">
                    <div className="inline-block mb-4">
                        <Badge.Ribbon text="Mới nhất" color="orange">
                            <div className="bg-white px-6 py-2 rounded-lg shadow-sm">
                                <Title
                                    level={1}
                                    className="mb-0 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-bold"
                                >
                                    Tin Tức & Bài Viết
                                </Title>
                            </div>
                        </Badge.Ribbon>
                    </div>
                    <Paragraph className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
                        Khám phá những câu chuyện thú vị, xu hướng mới nhất và kiến thức chuyên sâu từ thế giới đồng hồ
                        cao cấp.
                    </Paragraph>
                </div>

                {/* Blog Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Featured Blog */}
                    <div className="lg:col-span-2">
                        <FeaturedBlogCard blog={featuredBlog} />
                    </div>

                    {/* Side Blogs */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        {otherBlogs.map((blog) => (
                            <RegularBlogCard key={blog._id} blog={blog} />
                        ))}
                    </div>
                </div>

                {/* View All Button */}
                {blogs.length > 4 && (
                    <div className="text-center mt-16">
                        <Link to="/blogs">
                            <Button
                                size="large"
                                className="bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white transition-all duration-300 px-8 py-2 h-auto font-semibold"
                            >
                                Xem tất cả bài viết
                                <ArrowRightOutlined />
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Blog;
