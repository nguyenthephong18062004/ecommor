// Only return to local customer pages; never redirect to an external origin.
export function getAuthReturnTo(value, fallback = '/') {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') ||
        /[\\\s]/.test(value) || Array.from(value).some(character => character.charCodeAt(0) < 32)) {
        return fallback;
    }
    const pathname = value.split(/[?#]/)[0];
    if (['/login', '/register', '/forgot-password'].includes(pathname) || /^\/admin(?:\/|$)/.test(pathname)) {
        return fallback;
    }
    return value;
}
