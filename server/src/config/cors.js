function getAllowedOrigins(env = process.env) {
    const origins = [env.DOMAIN_URL, env.CLIENT_URL, ...(env.CLIENT_ORIGINS || '').split(',')];
    if (env.NODE_ENV !== 'production') {
        origins.push('http://localhost:5173', 'http://127.0.0.1:5173');
        if (env.VNPAY_RETURN_URL) {
            try {
                const callback = new URL(env.VNPAY_RETURN_URL);
                if (callback.protocol === 'https:' && !callback.username && !callback.password &&
                    !callback.search && !callback.hash &&
                    ['/api/vnpay-return', '/api/check-payment-vnpay'].includes(callback.pathname)) {
                    origins.push(callback.origin);
                }
            } catch {
                // Malformed payment configuration must not widen the origin allowlist.
            }
        }
    }
    return [...new Set(origins.map((origin) => origin?.trim()).filter(Boolean))];
}

function getCorsOptions(env = process.env) {
    const allowedOrigins = getAllowedOrigins(env);
    return {
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    };
}

module.exports = { getAllowedOrigins, getCorsOptions };
