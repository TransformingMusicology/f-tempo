import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';

// In development, /api requests are proxied to a running F-TEMPO Express server.
// Default: the local server started with `FTEMPO_CONFIG=config/local_config.json npm start`.
// Set FTEMPO_API_URL=http://alastairpc.local:8000 to use the PC's server instead.
const apiUrl = process.env.FTEMPO_API_URL ?? 'http://localhost:8000';

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {target: apiUrl, changeOrigin: true},
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test-setup.ts'],
        globals: false,
    },
});
