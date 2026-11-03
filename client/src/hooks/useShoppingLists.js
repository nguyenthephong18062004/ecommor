import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { apiClient } from '../config/axiosClient';

const read = key => {
    try {
        const value = JSON.parse(localStorage.getItem(`ecommor.${key}`) || '[]');
        return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id)))].slice(0, key === 'compare' ? 3 : key === 'recent' ? 12 : 100) : [];
    } catch { return []; }
};
const write = (key, value) => { try { localStorage.setItem(`ecommor.${key}`, JSON.stringify(value)); } catch { /* Bộ nhớ trình duyệt có thể bị tắt. */ } };

export default function useShoppingLists(userId) {
    const [personal, setPersonal] = useState(() => ({ owner: null, wishlist: read('wishlist'), addresses: [], savedSearches: [] }));
    const [compare, setCompare] = useState(() => read('compare'));
    const [recent, setRecent] = useState(() => read('recent'));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const lock = useRef(false);
    const owner = useRef(userId);
    owner.current = userId;

    useEffect(() => {
        const controller = new AbortController();
        setError('');
        if (!userId) {
            setPersonal({ owner: null, wishlist: read('wishlist'), addresses: [], savedSearches: [] });
            return () => controller.abort();
        }
        setPersonal({ owner: null, wishlist: [], addresses: [], savedSearches: [] });
        (async () => {
            try {
                let data = (await apiClient.get('/api/preferences', { signal: controller.signal })).data.metadata;
                const guest = read('wishlist');
                if (guest.length && !controller.signal.aborted) {
                    data = (await apiClient.patch('/api/preferences', { wishlist: [...new Set([...data.wishlist, ...guest])].slice(0, 100) }, { signal: controller.signal })).data.metadata;
                    if (!controller.signal.aborted) write('wishlist', []);
                }
                if (!controller.signal.aborted) setPersonal({ ...data, owner: userId });
            } catch {
                if (!controller.signal.aborted) setError('Không thể tải lựa chọn đã lưu. Vui lòng tải lại trang.');
            }
        })();
        return () => controller.abort();
    }, [userId]);

    const savePersonal = useCallback(async changes => {
        if (!userId || personal.owner !== userId || lock.current) return false;
        lock.current = true;
        setBusy(true);
        try {
            const { data } = await apiClient.patch('/api/preferences', changes);
            if (owner.current === userId) setPersonal({ ...data.metadata, owner: userId });
            return true;
        } catch (err) {
            message.error(err.response?.data?.message || 'Không thể lưu lựa chọn. Vui lòng thử lại.');
            return false;
        } finally { lock.current = false; setBusy(false); }
    }, [userId, personal.owner]);

    const toggleWishlist = useCallback(async id => {
        const next = personal.wishlist.includes(id) ? personal.wishlist.filter(item => item !== id) : [...personal.wishlist, id];
        if (next.length > 100) { message.info('Bạn có thể lưu tối đa 100 sản phẩm yêu thích.'); return; }
        if (userId) return savePersonal({ wishlist: next });
        write('wishlist', next);
        setPersonal(previous => ({ ...previous, wishlist: next }));
    }, [personal.wishlist, userId, savePersonal]);

    const toggleCompare = useCallback(id => {
        const next = compare.includes(id) ? compare.filter(item => item !== id) : [...compare, id];
        if (next.length > 3) { message.info('Bạn có thể so sánh tối đa 3 sản phẩm.'); return; }
        write('compare', next); setCompare(next);
    }, [compare]);
    const addRecent = useCallback(id => setRecent(previous => {
        const next = [id, ...previous.filter(item => item !== id)].slice(0, 12);
        write('recent', next); return next;
    }), []);

    const current = personal.owner === (userId || null) ? personal : { wishlist: [], addresses: [], savedSearches: [] };
    return { ...current, compare, recent, toggleWishlist, toggleCompare, addRecent, savePersonal,
        preferencesBusy: busy || Boolean(userId && personal.owner !== userId), preferencesError: error };
}
