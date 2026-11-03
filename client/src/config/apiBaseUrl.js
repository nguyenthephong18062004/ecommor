export function resolveApiBaseUrl(configuredUrl, { dev = false, mode } = {}) {
    const selectedMode = mode || (dev ? 'proxy' : 'configured');
    if (!['proxy', 'configured'].includes(selectedMode)) {
        throw new Error('VITE_API_MODE must be proxy or configured');
    }
    return dev && selectedMode === 'proxy' ? '' : configuredUrl || '';
}

export function resolveUploadUrl(imagePath, configuredBase, options) {
    if (!imagePath) return '';
    if (/^(?:https?:\/\/|data:|blob:)/i.test(imagePath)) return imagePath;
    const base = resolveApiBaseUrl(configuredBase, options).replace(/\/+$/, '');
    const path = '/' + imagePath.replace(/^\/+/, '');
    // Uploaded paths already contain /uploads; do not add that prefix again.
    if (base.endsWith('/uploads') && path.startsWith('/uploads/')) {
        return base + path.slice('/uploads'.length);
    }
    return base + path;
}
