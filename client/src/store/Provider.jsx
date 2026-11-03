import Context from './Context';
import cookies from 'js-cookie';
import { requestAuth, requestGetCart } from '../config/request';

import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/runtimeUrls';
import useShoppingLists from '../hooks/useShoppingLists';
import useFetch from '../hooks/useFetch';

export function Provider({ children }) {
    const [dataUser, setDataUser] = useState({});
    const [dataCart, setDataCart] = useState({});
    const [newMessageAdmin, setNewMessageAdmin] = useState({});
    const [newMessageUser, setNewMessageUser] = useState({});
    const { data: catalogOptions, loading: catalogOptionsLoading, error: catalogOptionsError, reFetch: reloadCatalogOptions } = useFetch('/api/catalog-options');
    const category = catalogOptions?.categories || [];
    const [authLoading, setAuthLoading] = useState(true);
    const shoppingLists = useShoppingLists(dataUser._id);

    const token = cookies.get('logged');

    const getAuthUser = useCallback(async () => {
        const res = await requestAuth();
        setDataUser(res.metadata.auth);
    }, []);

    const getCart = useCallback(async () => {
        const res = await requestGetCart();
        setDataCart(res.metadata);
    }, []);

    const clearAuth = useCallback(() => {
        setDataUser({});
        setDataCart({});
    }, []);


    useEffect(() => {
        if (!dataUser._id) return;

        const socket = io(API_BASE_URL || window.location.origin, {
            withCredentials: true, // Cho phép gửi cookie
        });

        socket.on('newMessage', (message) => {
            setNewMessageAdmin(message);
        });


        socket.on('newMessageUser', (message) => {
            setNewMessageUser(message);
        });

        return () => {
            socket.disconnect();
        };
    }, [dataUser._id]);

    useEffect(() => {
        if (token !== '1') {
            setDataUser({});
            setDataCart({});
            setAuthLoading(false);
            return;
        }

        const fetchData = async () => {
            setAuthLoading(true);
            try {
                await getAuthUser();
                await getCart();
            } catch (error) {
                console.log(error);
                setDataUser({});
                setDataCart({});
            } finally {
                setAuthLoading(false);
            }
        };

        fetchData();
    }, [getAuthUser, getCart, token]);


    return (
        <Context.Provider
            value={{
                dataUser,
                getAuthUser,
                dataCart,
                getCart,
                clearAuth,
                newMessageAdmin,
                newMessageUser,
                category,
                catalogOptions, catalogOptionsLoading, catalogOptionsError, reloadCatalogOptions,
                authLoading,
                ...shoppingLists,
            }}
        >
            {children}
        </Context.Provider>
    );
}
