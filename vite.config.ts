import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:5000';
    return {
      root: path.resolve(__dirname, 'frontend'),
      envDir: __dirname,
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: backendUrl,
            changeOrigin: true,
            secure: false,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                // The frontend calls /api via same-origin. Stripping Origin avoids backend CORS
                // allowlist issues when you open Vite via LAN IP (e.g. from a phone).
                proxyReq.removeHeader('origin');
              });
            },
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'frontend'),
        }
      },
      build: {
        // Keep Netlify publish directory stable (repo-root dist/)
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
        // Production optimizations
        minify: 'terser',
        target: 'esnext',
        sourcemap: false,
        rollupOptions: {
          output: {
            // Code splitting for better caching
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-charts': ['recharts'],
              'vendor-utils': ['date-fns', 'lucide-react']
            }
          }
        }
      }
    };
});
