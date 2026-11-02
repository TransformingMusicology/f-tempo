import dns from 'node:dns';
import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';

// mDNS names such as alastairpc.local resolve to an IPv6 link-local address
// first, which the proxy cannot connect to; Node then waits before trying IPv4,
// which added about half a second to every proxied request.
dns.setDefaultResultOrder('ipv4first');

// The API address used by the dev-server proxy comes from FTEMPO_API_PROXY in
// frontend/.env (see .env.example); components only ever request /api/...
export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), 'FTEMPO_');
    const apiProxy = env.FTEMPO_API_PROXY || 'http://alastairpc.local:8000';
    return {
        plugins: [react()],
        server: {
            proxy: {
                '/api': {target: apiProxy, changeOrigin: true},
            },
        },
        test: {
            include: ['src/**/*.test.{ts,tsx}'],
        },
    };
});
