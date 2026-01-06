import path from 'path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import vike from 'vike/plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/g, '');

const normalizeBasePath = (value: string): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '/';
  const ensuredLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailing = ensuredLeading.replace(/\/+$/g, '');
  if (withoutTrailing === '/') return '/';
  return `${withoutTrailing}/`;
};

const stripTrailingApiPath = (url: string): string => {
  const normalized = normalizeBaseUrl(url);
  try {
    const u = new URL(normalized);
    if (u.pathname === '/api') {
      u.pathname = '';
      return normalizeBaseUrl(u.toString());
    }
    return normalized;
  } catch {
    return normalized.replace(/\/api$/g, '');
  }
};

const servePublicIndexHtmlPlugin = () => {
  return {
    name: 'serve-public-index-html',
    apply: 'serve',
    configureServer(server: any) {
      const publicDir = path.resolve(__dirname, 'frontend/public');
      const vikeOwnedRoutes = new Set(['how-it-works', 'features']);
      server.middlewares.use((req: any, _res: any, next: any) => {
        const rawUrl = typeof req.url === 'string' ? req.url : '';
        const url = rawUrl.split('?')[0]?.split('#')[0] ?? '';
        if (!url || url === '/' || !url.startsWith('/')) return next();

        // Only consider paths that look like directory routes (no file extension)
        if (path.posix.extname(url)) return next();

        const normalized = url.endsWith('/') ? url : `${url}/`;
        const relativeDir = normalized.replace(/^\/+/, '');

        // Allow Vike to handle routes that will be pre-rendered/served by React pages.
        const firstSegment = relativeDir.split('/')[0] || '';
        if (vikeOwnedRoutes.has(firstSegment)) return next();

        const candidateIndexPath = path.join(publicDir, relativeDir, 'index.html');

        // If the public folder contains <route>/index.html, serve it at the clean route.
        // This keeps marketing/SEO pages working on localhost without the SPA taking over.
        if (fs.existsSync(candidateIndexPath)) {
          req.url = `${normalized}index.html`;
        }

        return next();
      });
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const backendUrl = stripTrailingApiPath(env.VITE_BACKEND_URL || 'http://localhost:5000');
  return {
    base: normalizeBasePath(env.VITE_BASE_PATH || '/'),
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
    plugins: [servePublicIndexHtmlPlugin(), react(), vike()],
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
          // Code splitting for better caching (Vike requires manualChunks to be a function)
          manualChunks: (id: string) => {
            if (!id.includes('node_modules')) return;
            if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react';
            if (id.includes('/recharts/')) return 'vendor-charts';
            if (id.includes('/date-fns/') || id.includes('/lucide-react/')) return 'vendor-utils';
            return 'vendor';
          }
        }
      }
    }
  };
});
