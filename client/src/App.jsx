import { useEffect } from 'react';
import './App.css';
import Header from './Components/Header/Header';
import HomePage from './Components/HomePage/HomePage';
import Footer from './Components/Footer/Footer';
import Chatbot from './utils/Chatbot/Chatbot';
import Messger from './Components/Messger/Messger';
import { useStore } from './hooks/userStore';

function App() {
    useEffect(() => {
        document.title = 'Đồng Hồ Chính Hãng | Miễn Phí Giao Hàng & Bảo Hành Dài Hạn';
    }, []);

    const { dataUser } = useStore();

    return (
        <div>
            <header>
                <Header />
            </header>
            <Chatbot />
            <main>
                <HomePage />
            </main>

            <footer>
                <Footer />
            </footer>
            {dataUser && dataUser._id && <Messger />}
        </div>
    );
}

export default App;
