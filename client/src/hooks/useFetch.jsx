import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../config/axiosClient';

function useFetch(url) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loadedUrl, setLoadedUrl] = useState(null);
    const active = useRef(null);

    const fetchData = useCallback(async () => {
        active.current?.abort();
        const controller = new AbortController();
        active.current = controller;
        if (!url) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get(url, { signal: controller.signal, timeout: 15000 });
            if (!controller.signal.aborted) { setData(response.data?.metadata ?? []); setLoadedUrl(url); }
        } catch (err) {
            if (!controller.signal.aborted) {
                setData([]);
                setLoadedUrl(url);
                setError(err.response?.data?.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.');
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        fetchData();
        return () => active.current?.abort();
    }, [url, fetchData]);

    const reFetch = useCallback(() => {
        fetchData();
    }, [fetchData]);

    return { data: loadedUrl === url ? data : [], loading: Boolean(url) && (loading || loadedUrl !== url),
        error: loadedUrl === url ? error : null, reFetch };
}

export default useFetch;
