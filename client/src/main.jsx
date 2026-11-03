import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { publicRoutes } from './Routes/routes.jsx';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { Suspense } from 'react';
import Loading from './Components/Loading/Loading';
import SiteHead, { PageBoundary } from './Components/SiteHead';

import { Provider } from './store/Provider';
dayjs.locale('vi');

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ConfigProvider locale={viVN} form={{ validateMessages: { required: 'Vui lòng nhập ${label}',
            types: { email: 'Email không hợp lệ', number: '${label} phải là số' } } }}>
        <Provider>
            <Router>
                <SiteHead />
                <PageBoundary>
                <Suspense fallback={<Loading />}>
                <Routes>
                    {publicRoutes.map((item, index) => {
                        return <Route key={index} path={item.path} element={item.component} />;
                    })}
                </Routes>
                </Suspense>
                </PageBoundary>
            </Router>
        </Provider>
        </ConfigProvider>
    </StrictMode>,
);
