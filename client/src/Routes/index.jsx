import Loading from '../Components/Loading/Loading';
import { useStore } from '../hooks/userStore';
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { requestAdmin } from '../config/request';

function AdminRoute({ children }) {
    const { getAuthUser, authLoading } = useStore();
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
    const [canAccessAdmin, setCanAccessAdmin] = useState(false);

    useEffect(() => {
        if (authLoading) return;

        const checkAdmin = async () => {
            setIsCheckingAdmin(true);
            try {
                await requestAdmin();
                await getAuthUser();
                setCanAccessAdmin(true);
            } catch {
                setCanAccessAdmin(false);
            } finally {
                setIsCheckingAdmin(false);
            }
        };

        checkAdmin();
    }, [authLoading, getAuthUser]);

    if (authLoading || isCheckingAdmin) return <Loading />;

    if (!canAccessAdmin) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default AdminRoute;
