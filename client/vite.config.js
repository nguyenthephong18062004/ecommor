import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
    const root = fileURLToPath(new URL('.', import.meta.url));
    const env = loadEnv(mode, root, ['VITE_TUNNEL_HOST', 'VITE_API_MODE']);
    const tunnelHost = env.VITE_TUNNEL_HOST?.trim();

    if (tunnelHost && !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(tunnelHost)) {
        throw new Error('VITE_TUNNEL_HOST must be one hostname without protocol, port, path or wildcard');
    }

    if (env.VITE_API_MODE && !['proxy', 'configured'].includes(env.VITE_API_MODE)) {
        throw new Error('VITE_API_MODE must be proxy or configured');
    }
    if (command === 'serve' && env.VITE_API_MODE !== 'configured') {
        console.info('[dev] VITE_API_MODE=proxy: API/uploads use the current origin; VITE_URL_API/VITE_URL_IMAGE_API apply in configured mode.');
    }

    return {
        root,
        plugins: [react(), tailwindcss()],
        server: {
            host: '127.0.0.1',
            port: 5173,
            strictPort: true,
            allowedHosts: tunnelHost ? [tunnelHost] : [],
            cors: {
                origin: ['http://localhost:5173', 'http://127.0.0.1:5173', ...(tunnelHost ? [`https://${tunnelHost}`] : [])],
                credentials: true,
            },
            proxy: {
                '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
                '/uploads': { target: 'http://127.0.0.1:3000', changeOrigin: true },
                '/socket.io': { target: 'http://127.0.0.1:3000', changeOrigin: true, ws: true },
            },
        },
    };
});
