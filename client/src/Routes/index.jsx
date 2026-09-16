import App from '../App';
import IndexDashBroad from '../Pages/Admin';
import LoginUser from '../Pages/LoginUser/LoginUser';
import Register from '../Pages/Register/Register';
import DetailProduct from '../Pages/DetailProduct/DetailProduct';
import Category from '../Pages/Category/Category';
import CartUser from '../Pages/Cart/CartUser';
import CheckOut from '../Pages/CheckOut/CheckOut';
import PaymentSuccess from '../Pages/PaymentSuccess/PaymentSuccess';
import InfoUser from '../Pages/InfoUser/InfoUser';
import ForgotPassword from '../Pages/ForgotPassword/ForgotPassword';
import Blogs from '../Pages/Blogs/Blogs';
import DetailBlog from '../Pages/DetailBlog/DetailBlog';
export const publicRoutes = [
    { path: '/', component: <App /> },
    { path: '/login', component: <LoginUser /> },
    { path: '/register', component: <Register /> },
    { path: '/admin', component: <IndexDashBroad /> },
    { path: '/product/:id', component: <DetailProduct /> },
    { path: '/category/:id', component: <Category /> },
    { path: '/cart', component: <CartUser /> },
    { path: '/checkout', component: <CheckOut /> },
    { path: '/payments/:id', component: <PaymentSuccess /> },
    { path: '/profile', component: <InfoUser /> },
    { path: '/forgot-password', component: <ForgotPassword /> },
    { path: '/orders', component: <InfoUser /> },
    { path: '/blogs', component: <Blogs /> },
    { path: '/blogs/:id', component: <DetailBlog /> },
];
