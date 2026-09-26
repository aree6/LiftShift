import path from 'path';
import fs from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
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

const serveFaviconIcoPlugin = () => {
  const rewriteFaviconIco = (middlewares: any) => {
    middlewares.use((req: any, _res: any, next: any) => {
      const rawUrl = typeof req.url === 'string' ? req.url : '';
      const url = rawUrl.split('?')[0]?.split('#')[0] ?? '';
      if (url !== '/favicon.ico') return next();

      // Browsers often request /favicon.ico regardless of <link rel="icon">.
      // Keep a dedicated .ico asset for best compatibility (including crawlers).
      req.url = '/UI/favicon.ico';
      return next();
    });
  };

  return {
    name: 'serve-favicon-ico',
    apply: 'serve' as const,
    configureServer(server: any) {
      rewriteFaviconIco(server.middlewares);
    },
    configurePreviewServer(server: any) {
      rewriteFaviconIco(server.middlewares);
    },
  };
};

const servePublicIndexHtmlPlugin = () => {
  return {
    name: 'serve-public-index-html',
    apply: 'serve' as const,
    configureServer(server: any) {
      const publicDir = path.resolve(__dirname, 'frontend/public');
      const vikeOwnedRoutes = new Set(['how-it-works', 'features', 'about', 'faq', 'privacy', 'ai', 'hevy-vs-lyfta', 'hevy-vs-strong', 'lyfta-vs-strong', 'hevy-vs-liftshift', 'lyfta-vs-liftshift', 'strong-vs-liftshift', 'dashboard-analytics', 'free-workout-dashboard', 'supported-apps', 'metrics']);
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

const SEO_NOSCRIPT = `<noscript>
      <div class="noscript-content" style="background: #0f172a; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #e2e8f0; font-family: system-ui, sans-serif; line-height: 1.6;">
        <h1 style="font-size:2rem;margin-bottom:0.75rem;">LiftShift — Free &amp; Open Source Workout Analytics</h1>
        <p style="margin-bottom:1rem;color:#94a3b8;font-size:1.1rem;">Your workout app logs what you did. LiftShift tells you what it <em>means</em> — and what to do next. Free, open source, and private. No account needed.</p>

        <h2 style="font-size:1.5rem;margin:2rem 0 0.75rem;">Why your logging app isn't enough</h2>
        <p style="margin-bottom:0.75rem;color:#94a3b8;">Hevy, Strong, and Lyfta are excellent workout loggers. They track sets, reps, and weight perfectly. But their built-in analytics stop at basic line charts and raw numbers. They don't tell you if you're plateauing, which muscles you're neglecting, or what to change next session.</p>
        <p style="margin-bottom:0.75rem;color:#94a3b8;">LiftShift reads your exported data from any of these apps and gives you the answers your logger won't. Every chart, every status label, every suggestion — all computed locally in your browser. Nothing leaves your device.</p>

        <h2 style="font-size:1.5rem;margin:2rem 0 0.75rem;">What you get</h2>
        <p style="margin-bottom:0.75rem;color:#94a3b8;"><strong>Training insights</strong> — Interactive <a href="/metrics/muscle-heatmap/" style="color:#6ee7b7;">muscle heatmaps</a> with rolling 7-day windows and volume zone scoring. See exactly which muscles are getting enough work and which are being neglected. Drill down per exercise to understand why.</p>
        <p style="margin-bottom:0.75rem;color:#94a3b8;"><strong>Progress tracking</strong> — <a href="/metrics/personal-records/" style="color:#6ee7b7;">Smart PR detection</a> across seven PR types in gold (all-time) and silver (1-month) tiers, plus flagged Premature PRs that you couldn't sustain. PR drought alerts tell you when a lift has stalled.</p>
        <p style="margin-bottom:0.75rem;color:#94a3b8;"><strong>Plateau detection</strong> — Every exercise gets a status: Getting stronger, Plateauing, or Taking a dip. When you're stuck, LiftShift gives a specific, actionable suggestion — add a rep, bump the weight, or deload.</p>
        <p style="margin-bottom:0.75rem;color:#94a3b8;"><strong>Set-by-set coaching feedback</strong> — Open any past workout and LiftShift analyzes every set across 19 scenarios. Each set gets a badge (Normal Fatigue, Too Aggressive, Good Reset) with exact numbers and improvement suggestions.</p>
        <p style="margin-bottom:0.75rem;color:#94a3b8;"><strong>AI-ready exports</strong> — Export your entire training history as structured data. Built-in analysis modules cover junk volume audits, structural balance, joint health, program adherence, and more. Paste into any AI and ask anything. See the <a href="/ai/" style="color:#6ee7b7;">AI reference page</a> for details.</p>
        <p style="margin-bottom:0.75rem;color:#94a3b8;"><strong>Data tools</strong> — Calendar filtering rebuilds every chart for any date range. Compare training blocks in seconds. Combine data from multiple apps into one unified dashboard. Track your <a href="/metrics/training-volume/" style="color:#6ee7b7;">training volume</a> and <a href="/metrics/one-rep-max/" style="color:#6ee7b7;">1RM estimates</a> over time.</p>
        <p style="margin-bottom:0.75rem;color:#94a3b8;"><strong>Lifetime Progress</strong> — Every muscle gets a 9-tier journey from Seedling to Legend based on cumulative sets. See estimated time to your next milestone. GitHub-style yearly consistency heatmaps show your training frequency at a glance.</p>

        <h2 style="font-size:1.5rem;margin:2rem 0 0.75rem;">How to get started</h2>
        <ol style="margin-left:1.5rem;margin-bottom:1rem;">
          <li style="margin-bottom:0.5rem;color:#94a3b8;">Choose your app — <a href="/supported-apps/hevy/" style="color:#6ee7b7;">Hevy</a> (API or CSV), <a href="/supported-apps/strong/" style="color:#6ee7b7;">Strong</a> (CSV), or <a href="/supported-apps/lyfta/" style="color:#6ee7b7;">Lyfta</a> (API or CSV) — and export your workout history.</li>
          <li style="margin-bottom:0.5rem;color:#94a3b8;">Open LiftShift and import your file. All processing happens locally in your browser.</li>
          <li style="margin-bottom:0.5rem;color:#94a3b8;">Explore your dashboards. Every feature is free. No account, no subscription, no data upload.</li>
        </ol>

        <h2 style="font-size:1.5rem;margin:2rem 0 0.75rem;">Private by design</h2>
        <p style="margin-bottom:0.75rem;color:#94a3b8;">LiftShift is <strong>fully open source</strong> under the AGPL-3.0 license. <a href="https://github.com/aree6/LiftShift" style="color:#6ee7b7;">Source code on GitHub</a>. Every line is auditable. Your workout data never leaves your device — all analytics run locally in your browser. Nothing is uploaded to LiftShift servers. Read our <a href="/privacy/" style="color:#6ee7b7;">privacy policy</a> for the full breakdown.</p>

        <h2 style="font-size:1.5rem;margin:2rem 0 0.75rem;">Learn more</h2>
        <ul style="margin-left:1.5rem;margin-bottom:1rem;">
          <li style="margin-bottom:0.5rem;color:#94a3b8;"><a href="/about/" style="color:#6ee7b7;">About LiftShift</a> — what it does, what it doesn't do, and what makes it different.</li>
          <li style="margin-bottom:0.5rem;color:#94a3b8;"><a href="/how-it-works/" style="color:#6ee7b7;">How it works</a> — detailed walkthrough of every feature with examples.</li>
          <li style="margin-bottom:0.5rem;color:#94a3b8;"><a href="/features/" style="color:#6ee7b7;">Full feature list</a> — everything LiftShift can do with your training data.</li>
          <li style="margin-bottom:0.5rem;color:#94a3b8;"><a href="/metrics/" style="color:#6ee7b7;">Metrics glossary</a> — plain-language definitions for volume, PRs, 1RM, and heatmaps.</li>
          <li style="margin-bottom:0.5rem;color:#94a3b8;"><a href="/supported-apps/" style="color:#6ee7b7;">Supported apps</a> — import guides for Hevy, Strong, and Lyfta.</li>
          <li style="margin-bottom:0.5rem;color:#94a3b8;"><a href="/hevy-vs-lyfta/" style="color:#6ee7b7;">Hevy vs Lyfta vs Strong vs LiftShift</a> — honest comparison of all four with user reviews.</li>
          <li style="margin-bottom:0.5rem;color:#94a3b8;"><a href="/faq/" style="color:#6ee7b7;">FAQ</a> — quick answers to common questions.</li>
          <li style="margin-bottom:0.5rem;color:#94a3b8;"><a href="/ai/" style="color:#6ee7b7;">AI reference</a> — structured definition optimized for AI assistants and LLMs.</li>
        </ul>

        <p style="margin-top:2rem;color:#6ee7b7;font-size:1.1rem;">Enable JavaScript to use LiftShift or <a href="/about/" style="color:#6ee7b7;">learn more about the project</a>.</p>
      </div>
    </noscript>`;

const injectSeoNoscriptPlugin = () => {
  return {
    name: 'inject-seo-noscript',
    apply: 'build' as const,
    closeBundle() {
      const indexPath = path.resolve(__dirname, 'dist', 'client', 'index.html');
      if (!fs.existsSync(indexPath)) return;
      let html = fs.readFileSync(indexPath, 'utf-8');
      html = html.replace('</body>', SEO_NOSCRIPT + '\n</body>');
      fs.writeFileSync(indexPath, html);
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const backendUrl = stripTrailingApiPath(env.VITE_BACKEND_URL || 'http://localhost:5000');
  // B5: release identifier for analytics (frontend/utils/integrations/analytics.ts
  // getRelease() reads VITE_APP_VERSION with an 'unknown' fallback). Explicit
  // env (e.g. CI-injected commit SHA) wins, then .env files, then package.json
  // version — so production builds always carry a real value, zero UX change.
  const pkgVersion = (() => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as { version?: unknown };
      return typeof pkg.version === 'string' && pkg.version.trim() ? pkg.version.trim() : 'unknown';
    } catch {
      return 'unknown';
    }
  })();
  const appVersion = process.env.VITE_APP_VERSION?.trim() || env.VITE_APP_VERSION?.trim() || pkgVersion;
  return {
    base: normalizeBasePath(env.VITE_BASE_PATH || '/'),
    root: path.resolve(__dirname, 'frontend'),
    envDir: __dirname,
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          agent: new http.Agent({ family: 4, keepAlive: true }),
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
    plugins: [serveFaviconIcoPlugin(), servePublicIndexHtmlPlugin(), injectSeoNoscriptPlugin(), tailwindcss(), react(), vike()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'frontend'),
      }
    },
    build: {
      // Build output directory (used by GitHub Pages deployment)
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      // Production optimizations
      minify: 'terser',
      target: 'esnext',
      sourcemap: false,
      rolldownOptions: {
        output: {
          // Code splitting for better caching (Vike requires manualChunks to be a function)
          manualChunks: (id: string) => {
            if (!id.includes('node_modules')) return;
            if (id.includes('/recharts/')) return 'vendor-charts';
            if (id.includes('/date-fns/') || id.includes('/lucide-react/')) return 'vendor-utils';
            // Motion (toast/overlay/shell animations) + papaparse (CSV parse)
            // in their own chunks for granular caching.
            if (id.includes('/motion/') || id.includes('/framer-motion/')) return 'vendor-motion';
            if (id.includes('/papaparse/')) return 'vendor-csv';
            // Let Vite/Rollup decide chunking for React core packages to avoid circular chunk imports.
            return;
          }
        }
      }
    }
  };
});
