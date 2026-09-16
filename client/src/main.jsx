import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { publicRoutes } from './Routes/index.jsx';

import { Provider } from './store/Provider';
import Messger from './Components/Messger/Messger.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <Provider>
            <Router>
                <Routes>
                    {publicRoutes.map((item, index) => {
                        return <Route key={index} path={item.path} element={item.component} />;
                    })}
                </Routes>
            </Router>
        </Provider>
    </StrictMode>,
);
