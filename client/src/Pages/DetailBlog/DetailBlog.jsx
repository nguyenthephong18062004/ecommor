import { useEffect, useState } from 'react';
import { Typography, Breadcrumb, Avatar, Tag, Divider, Button, Card, Skeleton, Alert, BackTop } from 'antd';
import {
    CalendarOutlined,
    EyeOutlined,
    UserOutlined,
    ShareAltOutlined,
    HeartOutlined,
    BookOutlined,
    HomeOutlined,
    ArrowLeftOutlined,
    FacebookOutlined,
    TwitterOutlined,
    LinkedinOutlined,
} from '@ant-design/icons';
import Footer from '../../Components/Footer/Footer';
import Header from '../../Components/Header/Header';
import { requestGetBlogById, requestGetAllBlog } from '../../config/request';
import { useParams, useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE_API;

function DetailBlog() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [blog, setBlog] = useState(null);
    const [relatedBlogs, setRelatedBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [liked, setLiked] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch blog detail
                const blogRes = await requestGetBlogById(id);
                setBlog(blogRes.metadata);

                // Fetch related blogs
                const allBlogsRes = await requestGetAllBlog();
                const related = allBlogsRes.metadata.filter((item) => item._id !== id).slice(0, 3);
                setRelatedBlogs(related);
            } catch (error) {
                console.error('Failed to fetch blog:', error);
                setError('Không thể tải bài viết. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchData();
        }
    }, [id]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const handleShare = (platform) => {
        const url = window.location.href;
        const title = blog?.title || 'Bài viết hay';

        const shareUrls = {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
            twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        };

        window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    };

    const RelatedBlogCard = ({ blog }) => (
        <Card
            hoverable
            className="group border-0 shadow-md hover:shadow-lg transition-all duration-300"
            bodyStyle={{ padding: 0 }}
            onClick={() => navigate(`/blogs/${blog._id}`)}
        >
            <div className="flex">
                <img
                    src={`${URL_IMAGE}${blog.image}`}
                    alt={blog.title}
                    className="w-24 h-24 object-cover flex-shrink-0"
                />
                <div className="p-4 flex-1">
                    <Title level={5} className="mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                        {blog.title}
                    </Title>
                    <Text className="text-gray-500 text-xs">{formatDate(blog.createdAt || new Date())}</Text>
                </div>
            </div>
        </Card>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="container mx-auto px-4 py-20">
                    <Skeleton.Input style={{ width: 300, height: 20 }} className="mb-8" />
                    <Skeleton.Input style={{ width: '100%', height: 60 }} className="mb-4" />
                    <Skeleton.Input style={{ width: 200, height: 20 }} className="mb-8" />
                    <Skeleton.Image style={{ width: '100%', height: 400 }} className="mb-8" />
                    <Skeleton active paragraph={{ rows: 10 }} />
                </div>
                <Footer />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="container mx-auto px-4 py-20">
                    <Alert message="Lỗi tải bài viết" description={error} type="error" showIcon className="mb-8" />
                    <Button
                        type="primary"
                        onClick={() => navigate('/blogs')}
                        className="bg-orange-500 hover:bg-orange-600"
                    >
                        Quay lại danh sách bài viết
                    </Button>
                </div>
                <Footer />
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="container mx-auto px-4 py-20">
                    <Alert
                        message="Không tìm thấy bài viết"
                        description="Bài viết bạn đang tìm kiếm không tồn tại hoặc đã bị xóa."
                        type="warning"
                        showIcon
                        className="mb-8"
                    />
                    <Button
                        type="primary"
                        onClick={() => navigate('/blogs')}
                        className="bg-orange-500 hover:bg-orange-600"
                    >
                        Quay lại danh sách bài viết
                    </Button>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header>
                <Header />
            </header>

            <main className="pt-20">
                <div className="container mx-auto px-4 py-12">
                    {/* Breadcrumb */}
                    <Breadcrumb className="mb-8">
                        <Breadcrumb.Item>
                            <HomeOutlined />
                            <span className="ml-1">Trang chủ</span>
                        </Breadcrumb.Item>
                        <Breadcrumb.Item
                            onClick={() => navigate('/blogs')}
                            className="cursor-pointer hover:text-orange-600"
                        >
                            <BookOutlined />
                            <span className="ml-1">Tin tức</span>
                        </Breadcrumb.Item>
                        <Breadcrumb.Item>
                            <span className="line-clamp-1">{blog.title}</span>
                        </Breadcrumb.Item>
                    </Breadcrumb>

                    {/* Back Button */}
                    <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/blogs')}
                        className="mb-6 text-gray-600 hover:text-orange-600 hover:bg-orange-50"
                    >
                        Quay lại danh sách
                    </Button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Main Content */}
                        <div className="lg:col-span-2">
                            <article className="bg-white rounded-lg shadow-sm overflow-hidden">
                                {/* Header */}
                                <div className="p-8 pb-6">
                                    <Tag color="orange" className="mb-4">
                                        Tin tức
                                    </Tag>

                                    <Title level={1} className="mb-6 leading-tight">
                                        {blog.title}
                                    </Title>

                                    {/* Meta Info */}
                                    <div className="flex flex-wrap items-center gap-6 text-gray-500 mb-6">
                                        <div className="flex items-center gap-2">
                                            <Avatar size="small" icon={<UserOutlined />} />
                                            <Text>Admin</Text>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CalendarOutlined />
                                            <Text>{formatDate(blog.createdAt || new Date())}</Text>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <EyeOutlined />
                                            <Text>{Math.floor(Math.random() * 2000) + 500} lượt xem</Text>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                </div>

                                {/* Featured Image */}
                                <div className="px-8 mb-8">
                                    <img
                                        src={`${URL_IMAGE}${blog.image}`}
                                        alt={blog.title}
                                        className="w-full h-96 object-cover rounded-lg shadow-md"
                                    />
                                </div>

                                {/* Content */}
                                <div className="px-8 pb-8">
                                    <div className="prose prose-lg max-w-none">
                                        <Paragraph className="text-gray-700 leading-relaxed text-base mb-6">
                                            {blog.description || blog.title}
                                        </Paragraph>

                                        {/* Mock content - replace with actual blog content */}
                                        <p
                                            className="text-gray-700 leading-relaxed text-base mb-6"
                                            dangerouslySetInnerHTML={{ __html: blog.content }}
                                        />
                                    </div>
                                </div>

                                <Divider />

                                {/* Share Section */}
                            </article>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24 space-y-8">
                                {/* Related Posts */}
                                {relatedBlogs.length > 0 && (
                                    <Card title="Bài viết liên quan" className="shadow-sm">
                                        <div className="space-y-4">
                                            {relatedBlogs.map((relatedBlog) => (
                                                <RelatedBlogCard key={relatedBlog._id} blog={relatedBlog} />
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer>
                <Footer />
            </footer>

            <BackTop />

            <style jsx>{`
                .line-clamp-1 {
                    display: -webkit-box;
                    -webkit-line-clamp: 1;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .prose p {
                    margin-bottom: 1.5rem;
                }
            `}</style>
        </div>
    );
}

export default DetailBlog;
