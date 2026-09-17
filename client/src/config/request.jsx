import axios from 'axios';
import cookies from 'js-cookie';

import { apiClient } from './axiosClient';

const request = axios.create({
    baseURL: import.meta.env.VITE_URL_API,
    withCredentials: true,
});

export const requestGetAllProduct = async () => {
    const res = await request.get('/api/get-all-product');
    return res.data;
};

export const requestChatbot = async (data) => {
    const res = await request.post('/api/chatbot', data);
    return res.data?.metadata || res.data;
};

export const requestSearch = async (valueSearch) => {
    const res = await request.get('/api/search', { params: { valueSearch } });
    return res.data;
};

export const requestUploadImage = async (formData) => {
    const res = await request.post('/api/upload-image', formData);
    return res.data;
};

//// category

export const requestForgotPassword = async (data) => {
    const res = await request.post('/api/forgot-password', data);
    return res.data;
};

export const requestResetPassword = async (data) => {
    const res = await request.post('/api/reset-password', data);
    return res.data;
};

export const requestUpdateCategory = async (data) => {
    const res = await request.post('/api/update-category', data);
    return res.data;
};

export const requestDeleteCategory = async (id) => {
    const res = await request.delete('/api/delete-category', { params: { id } });
    return res.data;
};

export const requestStatistical = async () => {
    const res = await request.get('/api/statistical');
    return res.data;
};

export const requestAdmin = async () => {
    const res = await request.get('/admin');
    return res.data;
};

export const requestRegister = async (data) => {
    const res = await request.post('/api/register', data);
    return res.data;
};

export const requestLoginGoogle = async (credential) => {
    const res = await request.post('/api/login-google', { credential });
    return res.data;
};

export const requestLogin = async (data) => {
    const res = await request.post('/api/login', data);
    return res.data;
};

export const requestAuth = async () => {
    const res = await apiClient.get('/api/auth');
    return res.data;
};

export const requestLogout = async () => {
    const res = await apiClient.get('/api/logout');
    return res.data;
};

export const requestRefreshToken = async () => {
    const res = await apiClient.get('/api/refresh-token');
    return res.data;
};

export const requestCreateCategory = async (data) => {
    const res = await request.post('/api/create-category', data);
    return res.data;
};

export const requestGetAllCategory = async () => {
    const res = await request.get('/api/get-all-category');
    return res.data;
};

export const requestCreateCart = async (data) => {
    const res = await request.post('/api/create-cart', data);
    return res.data;
};

export const requestGetCart = async () => {
    const res = await apiClient.get('/api/get-cart');
    return res.data;
};

export const requestDeleteProductCart = async (data) => {
    const res = await apiClient.post('/api/delete-product-cart', data);
    return res.data;
};

export const requestUpdateProductCart = async (data) => {
    const res = await apiClient.post('/api/update-product-cart', data);
    return res.data;
};

export const requestCreatePayment = async (data) => {
    const res = await apiClient.post('/api/create-payment', data);
    return res.data;
};

export const requestUpdateInfoCart = async (data) => {
    const res = await apiClient.post('/api/update-info-cart', data);
    return res.data;
};

export const requestGetPaymentSuccess = async (id) => {
    const res = await apiClient.get('/api/get-payment-success', {
        params: { idPayment: id },
    });
    return res.data;
};

export const requestGetOrderUser = async () => {
    const res = await apiClient.get('/api/get-order-user');
    return res.data;
};

export const requestUpdateUser = async (data) => {
    const res = await apiClient.post('/api/update-user', data);
    return res.data;
};

export const requestCancelOrder = async (data) => {
    const res = await apiClient.post('/api/cancel-order', data);
    return res.data;
};

export const requestCreateProduct = async (formData) => {
    const res = await apiClient.post('/api/create-product', formData);
    return res.data;
};

export const requestUpdateProduct = async (data) => {
    const res = await apiClient.post('/api/update-product', data);
    return res.data;
};

export const requestDeleteProduct = async (id) => {
    const res = await apiClient.delete('/api/delete-product', { params: { id } });
    return res.data;
};

export const requestGetAllUser = async () => {
    const res = await apiClient.get('/api/users');
    return res.data;
};

export const requestUpdateUserAdmin = async (data) => {
    const res = await apiClient.post('/api/update-user-admin', data);
    return res.data;
};

export const requestGetOrderAdmin = async () => {
    const res = await apiClient.get('/api/get-order-admin');
    return res.data;
};

export const requestUpdateOrderStatus = async (data) => {
    const res = await apiClient.post('/api/update-order-status', data);
    return res.data;
};

export const requestGetProductManufactured = async () => {
    const res = await request.get('/api/get-product-manufactured');
    return res.data;
};

export const requestCreatePreviewProduct = async (data) => {
    const res = await request.post('/api/create-preview-product', data);
    return res.data;
};

export const requestGetPreviewProductHome = async () => {
    const res = await apiClient.get('/api/get-preview-product-home');
    return res.data;
};

/// conpun
export const requestGetAllCoupon = async () => {
    const res = await apiClient.get('/api/coupons');
    return res.data;
};

export const requestCreateCoupon = async (data) => {
    const res = await apiClient.post('/api/create-coupon', data);
    return res.data;
};

export const requestUpdateCoupon = async (data) => {
    const res = await apiClient.post('/api/update-coupon', data);
    return res.data;
};

export const requestDeleteCoupon = async (id) => {
    const res = await apiClient.delete('/api/delete-coupon', {
        params: {
            id,
        },
    });
    return res.data;
};

//// message
const apiMessage = '/api/message';
export const requestCreateMessage = async (data) => {
    const res = await apiClient.post(`${apiMessage}/create`, data);
    return res.data;
};

export const requestCreateMessageAdmin = async (data) => {
    const res = await apiClient.post(`${apiMessage}/create-admin`, data);
    return res.data;
};

export const requestGetAllMessage = async () => {
    const res = await apiClient.get(`${apiMessage}/all`);
    return res.data;
};

export const requestGetMessage = async (data) => {
    const res = await apiClient.get(`${apiMessage}/get-message`, {
        params: {
            receiverId: data.receiverId,
            senderId: data.senderId,
        },
    });
    return res.data;
};

export const requestGetMessageUser = async (data) => {
    const res = await apiClient.get(`${apiMessage}/get-message-user`, {
        params: {
            senderId: data.senderId,
        },
    });
    return res?.data;
};

export const requestReadMessage = async (data) => {
    const res = await apiClient.get(`${apiMessage}/read-message`, {
        params: {
            receiverId: data.receiverId,
            senderId: data.senderId,
        },
    });
    return res.data;
};
/// blog
const apiBlog = '/api/blog';

export const requestCreateBlog = async (data) => {
    const res = await apiClient.post(`${apiBlog}/create`, data);
    return res.data;
};

export const requestUploadImageBlog = async (data) => {
    const res = await apiClient.post(`${apiBlog}/upload-image`, data);
    return res.data;
};

export const requestGetAllBlog = async () => {
    const res = await apiClient.get(`${apiBlog}/get-all`);
    return res.data;
};

export const requestUpdateBlog = async (data) => {
    const res = await apiClient.post(`${apiBlog}/update`, data);
    return res.data;
};

export const requestDeleteBlog = async (data) => {
    const res = await apiClient.post(`${apiBlog}/delete`, data);
    return res.data;
};

export const requestGetBlogById = async (id) => {
    const res = await request.get(`${apiBlog}/get-by-id`, {
        params: {
            id,
        },
    });
    return res.data;
};

let isRefreshing = false;
let failedRequestsQueue = [];

request.interceptors.response.use(
    (response) => response, // Trả về nếu không có lỗi
    async (error) => {
        const originalRequest = error.config;

        // Nếu lỗi 401 (Unauthorized) và request chưa từng thử refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            if (!isRefreshing) {
                isRefreshing = true;

                try {
                    // Gửi yêu cầu refresh token
                    const token = cookies.get('logged');
                    if (!token) {
                        return;
                    }
                    await requestRefreshToken();

                    // Xử lý lại tất cả các request bị lỗi 401 trước đó
                    failedRequestsQueue.forEach((req) => req.resolve());
                    failedRequestsQueue = [];
                } catch (refreshError) {
                    // Nếu refresh thất bại, đăng xuất
                    failedRequestsQueue.forEach((req) => req.reject(refreshError));
                    failedRequestsQueue = [];
                    localStorage.clear();
                    window.location.href = '/login'; // Chuyển về trang đăng nhập
                } finally {
                    isRefreshing = false;
                }
            }

            // Trả về một Promise để retry request sau khi token mới được cập nhật
            return new Promise((resolve, reject) => {
                failedRequestsQueue.push({
                    resolve: () => {
                        resolve(request(originalRequest));
                    },
                    reject: (err) => reject(err),
                });
            });
        }

        return Promise.reject(error);
    },
);
