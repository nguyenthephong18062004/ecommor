import { useEffect, useState } from 'react';
import { Typography, Card, Skeleton, Pagination, Input, Select, Tag, Button, Empty, Breadcrumb } from 'antd';
import {
    CalendarOutlined,
    EyeOutlined,
    UserOutlined,
    SearchOutlined,
    HomeOutlined,
    BookOutlined,
} from '@ant-design/icons';
import Footer from '../../Components/Footer/Footer';
import Header from '../../Components/Header/Header';
import { requestGetAllBlog } from '../../config/request';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const URL_IMAGE = import.meta.env.VITE_URL_IMAGE_API;

function Blogs() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [filteredBlogs, setFilteredBlogs] = useState([]);
    const blogsPerPage = 9;

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                setLoading(true);
                const response = await requestGetAllBlog();
                setBlogs(response.metadata);
                setFilteredBlogs(response.metadata);
            } catch (error) {
                console.error('Failed to fetch blogs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBlogs();
    }, []);

    // Filter and sort blogs
    useEffect(() => {
        let filtered = blogs.filter(
            (blog) =>
                blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (blog.description && blog.description.toLowerCase().includes(searchTerm.toLowerCase())),
        );

        // Sort blogs
        switch (sortBy) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.createdAt || new Date()) - new Date(a.createdAt || new Date()));
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.createdAt || new Date()) - new Date(b.createdAt || new Date()));
                break;
            case 'title':
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
            default:
                break;
        }

        setFilteredBlogs(filtered);
        setCCurrentPage(1);
    }, [searchTerm, sortBy, blogs]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const BlogCard = ({ blog }) => (
        <Card
            hoverable
            className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 h-full"
            bodyStyle={{ padding: 0 }}
        >
            <div className="relative overflow-hidden">
                <img
                    src={`${URL_IMAGE}${blog.image}`}
                    alt={blog.title}
                    className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-4 left-4">
                    <Tag color="orange" className="text-xs font-medium">
                        Tin tức
                    </Tag>
                </div>
            </div>

            <div className="p-6 flex flex-col h-[calc(100%-14rem)]">
                <div className="flex items-center gap-4 mb-3 text-gray-500 text-xs flex-wrap">
                    <div className="flex items-center gap-1">
                        <UserOutlined />
                        <span>Admin</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <CalendarOutlined />
                        <span>{formatDate(blog.createdAt || new Date())}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <EyeOutlined />
                        <span>{Math.floor(Math.random() * 1000) + 100} lượt xem</span>
                    </div>
                </div>

                <Title
                    level={5}
                    className="mb-3 line-clamp-2 group-hover:text-orange-600 transition-colors duration-300 flex-grow-0"
                >
                    {blog.title}
                </Title>

                <Paragraph className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
                    {blog.description || blog.title}
                </Paragraph>
                <Link to={`/blogs/${blog._id}`}>
                    <Button
                        type="primary"
                        className="bg-gradient-to-r from-orange-500 to-red-500 border-0 hover:from-orange-600 hover:to-red-600 self-start mt-auto"
                    >
                        Đọc bài viết
                    </Button>
                </Link>
            </div>
        </Card>
    );

    // Get current blogs for pagination
    const indexOfLastBlog = currentPage * blogsPerPage;
    const indexOfFirstBlog = indexOfLastBlog - blogsPerPage;
    const currentBlogs = filteredBlogs.slice(indexOfFirstBlog, indexOfLastBlog);

    const handlePageChange = (page) => {
        setCCurrentPage(page);
        window.scrollTo({ top: 400, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header>
                <Header />
            </header>

            <main className="pt-20">
                {/* Hero Section */}

                <div className="container mx-auto px-4 ">
                    {/* Breadcrumb */}
                    <Breadcrumb className="mb-8">
                        <Breadcrumb.Item>
                            <HomeOutlined />
                            <span className="ml-1">Trang chủ</span>
                        </Breadcrumb.Item>
                        <Breadcrumb.Item>
                            <BookOutlined />
                            <span className="ml-1">Tin tức</span>
                        </Breadcrumb.Item>
                    </Breadcrumb>

                    {/* Filter and Search Section */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="flex-1 max-w-md">
                                <Search
                                    placeholder="Tìm kiếm bài viết..."
                                    allowClear
                                    size="large"
                                    prefix={<SearchOutlined />}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <Text className="text-gray-600 whitespace-nowrap">Sắp xếp theo:</Text>
                                <Select value={sortBy} onChange={setSortBy} size="large" style={{ width: 150 }}>
                                    <Option value="newest">Mới nhất</Option>
                                    <Option value="oldest">Cũ nhất</Option>
                                    <Option value="title">Tên A-Z</Option>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                            <Text className="text-gray-500">
                                Tìm thấy <span className="font-semibold text-orange-600">{filteredBlogs.length}</span>{' '}
                                bài viết
                            </Text>
                            {searchTerm && (
                                <Tag closable onClose={() => setSearchTerm('')} color="orange">
                                    Tìm kiếm: "{searchTerm}"
                                </Tag>
                            )}
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[...Array(9)].map((_, index) => (
                                <Card key={index} className="overflow-hidden">
                                    <Skeleton.Image style={{ width: '100%', height: 224 }} />
                                    <div className="p-6">
                                        <Skeleton active paragraph={{ rows: 3 }} />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && filteredBlogs.length === 0 && (
                        <div className="text-center py-20">
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    searchTerm
                                        ? `Không tìm thấy bài viết nào với từ khóa "${searchTerm}"`
                                        : 'Chưa có bài viết nào'
                                }
                            >
                                {searchTerm && (
                                    <Button
                                        type="primary"
                                        onClick={() => setSearchTerm('')}
                                        className="bg-orange-500 hover:bg-orange-600"
                                    >
                                        Xóa bộ lọc
                                    </Button>
                                )}
                            </Empty>
                        </div>
                    )}

                    {/* Blogs Grid */}
                    {!loading && currentBlogs.length > 0 && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {currentBlogs.map((blog) => (
                                    <BlogCard key={blog._id} blog={blog} />
                                ))}
                            </div>

                            {/* Pagination */}
                            {filteredBlogs.length > blogsPerPage && (
                                <div className="flex justify-center mt-12">
                                    <Pagination
                                        current={currentPage}
                                        total={filteredBlogs.length}
                                        pageSize={blogsPerPage}
                                        onChange={handlePageChange}
                                        showSizeChanger={false}
                                        showQuickJumper
                                        showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} bài viết`}
                                        className="custom-pagination"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            <footer>
                <Footer />
            </footer>

            <style jsx>{`
                .custom-pagination .ant-pagination-item-active {
                    background: linear-gradient(135deg, #f97316, #dc2626);
                    border-color: #f97316;
                }

                .custom-pagination .ant-pagination-item-active a {
                    color: white;
                }

                .custom-pagination .ant-pagination-item:hover {
                    border-color: #f97316;
                }

                .custom-pagination .ant-pagination-item:hover a {
                    color: #f97316;
                }

                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .line-clamp-3 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>
        </div>
    );
}

export default Blogs;
