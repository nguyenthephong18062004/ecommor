import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const request = axios.create({
    baseURL: import.meta.env.VITE_URL_API,
    withCredentials: true,
});

function useFetch(url) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!url) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await request.get(url);
            setData(response.data?.metadata ?? []);
        } catch (err) {
            setData([]);
            setError(err.response?.data?.message || err.message || 'Khong the ket noi server');
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        setTimeout(() => {
            fetchData();
        }, 600);
    }, [url, fetchData]);

    const reFetch = useCallback(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, reFetch };
}

export default useFetch;
