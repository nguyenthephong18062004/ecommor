const path = require('node:path');

function callbackUrl(env) {
    const url = new URL(env.VNPAY_RETURN_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        !['/api/vnpay-return', '/api/check-payment-vnpay'].includes(url.pathname)) {
        throw new Error('Invalid public VNPAY_RETURN_URL');
    }
    return url;
}

async function checkConnectivity(env, fetchRequest = fetch) {
    const callback = callbackUrl(env);
    const checks = [];
    for (const [label, origin] of [['local', 'http://127.0.0.1:5173'], ['public', callback.origin]]) {
        for (const [kind, pathname] of [['return', callback.pathname], ['ipn', '/api/vnpay-ipn']]) {
            try {
                // Empty queries exercise routing and signature rejection without touching orders.
                const response = await fetchRequest(new URL(pathname, origin), {
                    redirect: 'manual', signal: AbortSignal.timeout(5000),
                    headers: { 'ngrok-skip-browser-warning': 'connectivity-check',
                        ...(kind === 'return' ? { Origin: origin } : {}) },
                });
                const ngrokError = response.headers.get('ngrok-error-code');
                let data;
                try { data = await response.json(); } catch { data = null; }
                const pass = !ngrokError && (kind === 'return'
                    ? response.status === 400 && typeof data?.message === 'string' && /VNPay/i.test(data.message)
                    : response.status === 200 && data?.RspCode === '97');
                checks.push({ check: `${label}-${kind}`, pass, status: response.status,
                    ...(ngrokError ? { code: ngrokError } : {}) });
            } catch {
                checks.push({ check: `${label}-${kind}`, pass: false, code: 'UNREACHABLE' });
            }
        }
    }
    return { origin: callback.origin, pass: checks.every((check) => check.pass), checks };
}

if (require.main === module) {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
    (async () => {
        try {
            if (process.argv.includes('--origin')) {
                console.log(callbackUrl(process.env).origin);
                return;
            }
            const result = await checkConnectivity(process.env);
            console.log(JSON.stringify(result, null, 2));
            if (!result.pass) process.exitCode = 1;
        } catch {
            console.error('VNPay connectivity check failed: check VNPAY_RETURN_URL configuration.');
            process.exitCode = 1;
        }
    })();
}

module.exports = { callbackUrl, checkConnectivity };
