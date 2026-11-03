import { useState, useEffect } from 'react';
import { AutoComplete, Button, Table, Modal, Form, Input, InputNumber, Select, Space, Popconfirm, Switch, Tag, Upload, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { Editor } from '@tinymce/tinymce-react';
import { useStore } from '../../../../hooks/userStore';
import { dateInput, productSpecs } from '../../../../utils/format';
import {
    requestCreateProduct,
    requestDeleteProduct,
    requestGetAllCategory,
    requestGetBrands,
    requestGetAllProduct,
    requestUpdateProduct,
    requestUploadImage,
} from '../../../../config/request';

function ManagerProduct() {
    const { reloadCatalogOptions } = useStore();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingId, setEditingId] = useState(null);
    const [fileList, setFileList] = useState([]);
    const [editorContent, setEditorContent] = useState('');
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            const response = await requestGetAllCategory();
            setCategories(response.metadata);
        };
        fetchCategories();
        requestGetBrands().then(response => setBrands(response.metadata))
            .catch(() => message.error('Không thể tải thương hiệu'));
    }, []);

    // Fetch all products
    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await requestGetAllProduct();
            setProducts(response.metadata);
        } catch (error) {
            message.error('Lỗi khi tải dữ liệu sản phẩm');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Handle form submission
    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            let imageUrls = [];

            // Handle image uploads only if there are new images
            const newImages = fileList.filter((file) => file.originFileObj);
            if (newImages.length > 0) {
                const formData = new FormData();
                newImages.forEach((file) => {
                    formData.append('images', file.originFileObj);
                });
                const resImages = await requestUploadImage(formData);

                // Combine new uploaded images with existing images
                const existingImages = fileList.filter((file) => !file.originFileObj).map((file) => file.url);
                imageUrls = [...existingImages, ...resImages.images];
            } else {
                // Keep existing images if no new uploads
                imageUrls = fileList.map((file) => file.url);
            }

            const formData = {
                ...values,
                images: imageUrls.join(','),
                description: editorContent,
            };
            if (!Object.values(values.shippingPackage || {}).some(value => value != null)) delete formData.shippingPackage;

            if (editingId) {
                // Update existing product
                formData.id = editingId;
                await requestUpdateProduct(formData);
                message.success('Cập nhật sản phẩm thành công');
            } else {
                // Create new product
                await requestCreateProduct(formData);
                message.success('Thêm sản phẩm thành công');
            }

            // Reset and refresh
            setModalVisible(false);
            form.resetFields();
            setFileList([]);
            setEditingId(null);
            await fetchProducts();
            reloadCatalogOptions();
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Delete a product
    const handleDelete = async (id) => {
        setLoading(true);
        try {
            await requestDeleteProduct(id);
            message.success('Xóa sản phẩm thành công');
            await fetchProducts();
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Edit a product
    const handleEdit = (record) => {
        setEditingId(record._id);
        form.resetFields();
        form.setFieldsValue({
            ...record,
            category: record.categoryId,
            publicationStatus: record.publicationStatus || 'preview',
            verificationStatus: record.verificationStatus || 'unverified',
            expectedRestockAt: dateInput(record.expectedRestockAt),
        });
        setEditorContent(record.description || '');
        setFileList([]);

        // Set image files
        if (record.images && record.images.length > 0) {
            const imageFiles = record.images.split(',').map((url, index) => ({
                uid: `-${index}`,
                name: `image-${index}.jpg`,
                status: 'done',
                url,
            }));
            setFileList(imageFiles);
        }

        setModalVisible(true);
    };

    // Add new product
    const handleAdd = () => {
        setEditingId(null);
        form.resetFields();
        form.setFieldsValue({ publicationStatus: 'preview', verificationStatus: 'unverified', allowPreorder: false, condition: 'new', discount: 0, stock: 0 });
        setEditorContent('');
        setFileList([]);
        setModalVisible(true);
    };

    // Upload props

    const uploadProps = {
        onRemove: (file) => {
            const index = fileList.indexOf(file);
            const newFileList = fileList.slice();
            newFileList.splice(index, 1);
            setFileList(newFileList);
        },
        beforeUpload: () => {
            return false; // Prevent auto upload
        },
        onChange: (info) => {
            setFileList(info.fileList);
        },
        fileList,
        multiple: true,
    };

    // Table columns
    const columns = [
        {
            title: 'Tên sản phẩm',
            dataIndex: 'nameProduct',
            key: 'nameProduct',
        },
        {
            title: 'Thương hiệu',
            dataIndex: 'brand',
            key: 'brand',
            render: (brand) => brand || '-',
        },
        {
            title: 'Giá (VND)',
            dataIndex: 'price',
            key: 'price',
            render: (price) => new Intl.NumberFormat('vi-VN').format(price),
        },
        {
            title: 'Giảm giá (%)',
            dataIndex: 'discount',
            key: 'discount',
        },
        {
            title: 'Danh mục',
            dataIndex: 'category',
            key: 'category',
        },
        {
            title: 'Tồn kho',
            dataIndex: 'stock',
            key: 'stock',
        },
        {
            title: 'Duyệt bán', dataIndex: 'verificationStatus', key: 'verificationStatus',
            render: value => <Tag color={value === 'verified' ? 'green' : 'default'}>{({ verified: 'Đã xác minh', demo: 'Dữ liệu demo' })[value] || 'Chưa xác minh'}</Tag>,
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button type="primary" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Bạn có chắc muốn xóa sản phẩm này?"
                        onConfirm={() => handleDelete(record._id)}
                        okText="Có"
                        cancelText="Không"
                    >
                        <Button type="primary" danger icon={<DeleteOutlined />}>
                            Xóa
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="manager-product" style={{ padding: '20px' }}>
            <div
                className="header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}
            >
                <h1 style={{ fontSize: '20px', fontWeight: '600' }}>Quản lý sản phẩm</h1>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">
                    Thêm sản phẩm
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={products}
                rowKey="_id"
                loading={loading}
                pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                bordered
            />

            <Modal
                title={editingId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={800}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="category" label="Danh mục" rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}>
                        <Select options={categories.map(category => ({ value: category._id, label: category.name }))} />
                    </Form.Item>
                    <Form.Item name="brand" label="Thương hiệu" rules={[{ required: true }]}>
                        <AutoComplete options={brands.map(brand => ({ value: brand.name }))}
                            filterOption={(input, option) => option.value.toLocaleLowerCase('vi').includes(input.toLocaleLowerCase('vi'))} />
                    </Form.Item>
                    {[['nameProduct', 'Tên sản phẩm'], ...productSpecs].filter(([key]) => !['brand', 'boxPapers'].includes(key)).map(([key, label]) => (
                        <Form.Item key={key} name={key} label={label} rules={['nameProduct', 'modelNumber', 'origin', 'gender', 'glassMaterial', 'movement',
                            'strapMaterial', 'waterResistance', 'dialDiameter'].includes(key) ? [{ required: true, message: `Vui lòng nhập ${label.toLowerCase()}` }] : []}>
                            {['dialDiameter', 'caseThickness'].includes(key) ? <InputNumber min={0} max={200} style={{ width: '100%' }} />
                                : key === 'gender' ? <Select options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }, { value: 'Unisex', label: 'Nam và nữ (Unisex)' }]} />
                                    : <Input maxLength={2000} />}
                        </Form.Item>
                    ))}
                    <Space wrap align="start">
                        {[['price', 'Giá (VND)', 1, 90000000000000], ['discount', 'Giảm giá (%)', 0, 100], ['stock', 'Tồn kho', 0, 1000000]].map(([key, label, min, max]) => (
                            <Form.Item key={key} name={key} label={label} rules={[{ required: key !== 'discount' }]}>
                                <InputNumber min={min} max={max} precision={key === 'discount' ? 2 : 0} />
                            </Form.Item>
                        ))}
                    </Space>
                    <Space wrap align="start">
                        <Form.Item name="publicationStatus" label="Hiển thị và bán hàng">
                            <Select style={{ width: 180 }} options={[{ value: 'preview', label: 'Thông tin tham khảo' }, { value: 'published', label: 'Đã duyệt đăng bán' }, { value: 'archived', label: 'Ngừng hiển thị' }]} />
                        </Form.Item>
                        <Form.Item name="verificationStatus" label="Xác minh dữ liệu">
                            <Select style={{ width: 180 }} options={[{ value: 'unverified', label: 'Chưa xác minh' }, { value: 'demo', label: 'Dữ liệu demo' }, { value: 'verified', label: 'Đã đối chiếu thực tế' }]} />
                        </Form.Item>
                        <Form.Item name="condition" label="Tình trạng sản phẩm">
                            <Select style={{ width: 160 }} options={[{ value: 'new', label: 'Mới' }, { value: 'preowned', label: 'Đã qua sử dụng' }]} />
                        </Form.Item>
                    </Space>
                    <Form.Item name="verificationNote" label="Căn cứ xác minh (hiển thị cho khách)" extra="Chỉ duyệt xác minh khi đã đối chiếu giá, tồn kho, thông số và nguồn hàng. Không ghi thông tin cá nhân hoặc tài liệu nội bộ.">
                        <Input.TextArea maxLength={2000} rows={2} />
                    </Form.Item>
                    <Form.Item name="boxPapers" label="Hộp và giấy tờ đi kèm"><Input maxLength={2000} /></Form.Item>
                    <Space wrap>
                        <Form.Item name="allowPreorder" label="Nhận đặt khi hết hàng" valuePropName="checked"><Switch /></Form.Item>
                        <Form.Item name="expectedRestockAt" label="Ngày dự kiến có hàng"><Input type="date" /></Form.Item>
                    </Space>

                    <p>Kiện vận chuyển thực tế (gồm hộp bảo vệ). Để trống cả 4 ô để dùng ước tính theo loại đồng hồ.</p>
                    <Space wrap align="start">
                        {[
                            ['weight', 'Cân nặng (gram)', 19999], ['length', 'Dài (cm)', 200],
                            ['width', 'Rộng (cm)', 200], ['height', 'Cao (cm)', 200],
                        ].map(([key, label, max]) => (
                            <Form.Item key={key} name={['shippingPackage', key]} label={label}>
                                <InputNumber min={1} max={max} precision={0} />
                            </Form.Item>
                        ))}
                    </Space>
                    <Form.Item name="description" label="Mô tả" rules={[{ required: true }]}>
                        <Editor
                            apiKey={import.meta.env.VITE_TINYMCE_API_KEY?.trim() || 'n4hxnmi16uwk9dmdgfx6nscsf8oc30528dlcub1mzsk8deqy'}
                            init={{
                                language: 'vi',
                                language_url: '/langs/vi.js',
                                plugins:
                                    'anchor autolink charmap codesample emoticons image link lists table visualblocks wordcount',
                                toolbar: 'undo redo | bold italic underline | link image | align numlist bullist',
                            }}
                            value={editorContent}
                            onEditorChange={(content) => {
                                setEditorContent(content);
                                form.setFieldsValue({ description: content });
                            }}
                        />
                    </Form.Item>

                    <Form.Item label="Hình ảnh" required>
                        <Upload listType="picture-card" {...uploadProps}>
                            <div>
                                <UploadOutlined />
                                <div style={{ marginTop: 8 }}>Tải lên</div>
                            </div>
                        </Upload>
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {editingId ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                            <Button onClick={() => setModalVisible(false)}>Hủy</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default ManagerProduct;
