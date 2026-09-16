import Context from './Context';
import cookies from 'js-cookie';
import CryptoJS from 'crypto-js';
import { requestAuth, requestGetAllCategory, requestGetCart } from '../config/request';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function Provider({ children }) {
    const [dataUser, setDataUser] = useState({});
    const [dataCart, setDataCart] = useState({});
    const [newMessageAdmin, setNewMessageAdmin] = useState({});
    const [newMessageUser, setNewMessageUser] = useState({});
    const [category, setCategory] = useState([]);

    const token = cookies.get('logged');

    const getAuthUser = async () => {
        const res = await requestAuth();
        const bytes = CryptoJS.AES.decrypt(res.metadata.auth, import.meta.env.VITE_SECRET_CRYPTO);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(originalText);
        setDataUser(user);
    };

    const getCart = async () => {
        const res = await requestGetCart();
        setDataCart(res.metadata);
    };

    const fetchCategory = async () => {
        try {
            const res = await requestGetAllCategory();
            setCategory(Array.isArray(res.metadata) ? res.metadata : []);
        } catch (error) {
            setCategory([]);
            console.error('Failed to fetch categories:', error);
        }
    };

    useEffect(() => {
        if (!dataUser._id) return;

        const socket = io(import.meta.env.VITE_URL_API, {
            withCredentials: true, // Cho phép gửi cookie
        });

        socket.on('newMessage', (message) => {
            setNewMessageAdmin(message);
        });

        socket.on('allUserOnline', (users) => {
            console.log(users);
        });

        socket.on('newMessageUser', (message) => {
            setNewMessageUser(message);
        });

        return () => {
            socket.disconnect();
        };
    }, [dataUser, dataUser._id]);

    useEffect(() => {
        if (token !== '1') return;

        const fetchData = async () => {
            try {
                await getAuthUser();
                await getCart();
            } catch (error) {
                console.log(error);
            }
        };

        fetchData();
    }, [token]);

    useEffect(() => {
        fetchCategory();
    }, []);

    return (
        <Context.Provider
            value={{ dataUser, getAuthUser, dataCart, getCart, newMessageAdmin, newMessageUser, category }}
        >
            {children}
        </Context.Provider>
    );
}
