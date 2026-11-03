import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../config/axiosClient';

export default function useProductCatalog(type = 'new', value, page = 1, enabled = true) {
    const requestKey = `${type}:${value || ''}:${page}`;
    const [state, setState] = useState({ requestKey: null, data: null, loading: true, error: null });
    const [attempt, setAttempt] = useState(0);
    const retry = useCallback(() => setAttempt(value => value + 1), []);

    useEffect(() => {
        if (!enabled) return undefined;
        const controller = new AbortController();
        setState(previous => ({ ...previous, requestKey, loading: true, error: null }));
        apiClient.get('/api/product-catalog', {
            params: { type, value, page },
            signal: controller.signal, timeout: 15000,
        }).then(response => {
            if (!controller.signal.aborted) {
                setState({ requestKey, data: response.data.metadata, loading: false, error: null });
            }
        }).catch(error => {
            if (!controller.signal.aborted) {
                setState(previous => ({ ...previous, requestKey, loading: false,
                    error: error.response?.data?.message || 'Không thể tải sản phẩm. Vui lòng thử lại.' }));
            }
        });
        return () => controller.abort();
    }, [type, value, page, requestKey, enabled, attempt]);

    return { data: state.requestKey === requestKey ? state.data : null,
        loading: enabled && (state.requestKey !== requestKey || state.loading),
        error: state.requestKey === requestKey ? state.error : null, retry };
}
