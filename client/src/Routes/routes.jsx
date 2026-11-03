import { lazy } from 'react';
const App = lazy(() => import('../App'));
const IndexDashBroad = lazy(() => import('../Pages/Admin'));
const LoginUser = lazy(() => import('../Pages/LoginUser/LoginUser'));
const Register = lazy(() => import('../Pages/Register/Register'));
const DetailProduct = lazy(() => import('../Pages/DetailProduct/DetailProduct'));
const Category = lazy(() => import('../Pages/Category/Category'));
const Contact = lazy(() => import('../Pages/Contact/Contact'));
const PreOrder = lazy(() => import('../Pages/PreOrder/PreOrder'));
const CartUser = lazy(() => import('../Pages/Cart/CartUser'));
const CheckOut = lazy(() => import('../Pages/CheckOut/CheckOut'));
const PaymentSuccess = lazy(() => import('../Pages/PaymentSuccess/PaymentSuccess'));
const InfoUser = lazy(() => import('../Pages/InfoUser/InfoUser'));
const ForgotPassword = lazy(() => import('../Pages/ForgotPassword/ForgotPassword'));
const Blogs = lazy(() => import('../Pages/Blogs/Blogs'));
const DetailBlog = lazy(() => import('../Pages/DetailBlog/DetailBlog'));
import AdminRoute from './index';
import CustomerRoute from './CustomerRoute';

const Policy = lazy(() => import('../Pages/Policy'));
const Brands = lazy(() => import('../Pages/Brands'));
const Collections = lazy(() => import('../Pages/Collections'));

export const publicRoutes = [
    { path: '/', component: <App /> },
    { path: '/login', component: <LoginUser /> },
    { path: '/register', component: <Register /> },
    {
        path: '/admin',
        component: (
            <AdminRoute>
                <IndexDashBroad />
            </AdminRoute>
        ),
    },
    { path: '/product/:id', component: <DetailProduct /> },
    { path: '/category/:id', component: <Category /> },
    { path: '/category/brand/:brand', component: <Category /> },
    { path: '/thuong-hieu', component: <Brands /> },
    { path: '/chinh-sach/:slug', component: <Policy /> },
    { path: '/yeu-thich', component: <Collections mode="wishlist" /> },
    { path: '/so-sanh', component: <Collections mode="compare" /> },
    { path: '/da-xem', component: <Collections mode="recent" /> },
    { path: '/contact', component: <Contact /> },
    { path: '/dat-hang/:id', component: <CustomerRoute><PreOrder /></CustomerRoute> },
    { path: '/cart', component: <CustomerRoute><CartUser /></CustomerRoute> },
    { path: '/checkout', component: <CustomerRoute><CheckOut /></CustomerRoute> },
    { path: '/payments/:id', component: <CustomerRoute><PaymentSuccess /></CustomerRoute> },
    { path: '/profile', component: <CustomerRoute><InfoUser /></CustomerRoute> },
    { path: '/forgot-password', component: <ForgotPassword /> },
    { path: '/orders', component: <CustomerRoute><InfoUser /></CustomerRoute> },
    { path: '/blogs', component: <Blogs /> },
    { path: '/blogs/:id', component: <DetailBlog /> },
];
