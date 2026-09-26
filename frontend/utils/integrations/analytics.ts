import { getAnalyticsClientId } from './analyticsClientId';

type AnalyticsProperties = Record<string, unknown>;

const INIT_FLAG = '__liftshift_analytics_initialized';

type PosthogCapture = { event: string; properties?: AnalyticsProperties };
type PosthogIdentify = { distinctId: string; properties?: Record<string, unknown> };

let posthogClient: any = null;
let posthogInitPromise: Promise<void> | null = null;
let queuedPosthogCaptures: PosthogCapture[] = [];
let queuedPosthogRegisters: AnalyticsProperties | null = null;
let queuedPosthogIdentify: PosthogIdentify | null = null;

const shouldEnableAnalytics = (): boolean => {
  const disabled = String(import.meta.env.VITE_ANALYTICS_DISABLED ?? '').trim();
  return disabled !== '1' && disabled.toLowerCase() !== 'true';
};

const getGaMeasurementId = (): string | null => {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID ?? import.meta.env.VITE_PUBLIC_GA_MEASUREMENT_ID;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
};

const getPosthogConfig = (): { key: string; host: string; uiHost: string } | null => {
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY ?? import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST ??
    import.meta.env.VITE_POSTHOG_HOST ??
    'https://us.i.posthog.com';
  const uiHost = import.meta.env.VITE_PUBLIC_POSTHOG_UI_HOST ??
    import.meta.env.VITE_POSTHOG_UI_HOST ??
    'https://us.posthog.com';
  if (!key || !key.trim()) return null;
  return {
    key: key.trim(),
    host: typeof host === 'string' && host.trim() ? host.trim() : 'https://us.i.posthog.com',
    uiHost: typeof uiHost === 'string' && uiHost.trim() ? uiHost.trim() : 'https://us.posthog.com'
  };
};

const getCookieDomain = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const host = (window.location?.hostname ?? '').trim();
  if (!host) return undefined;
  const normalized = host.replace(/^www\./i, '').toLowerCase();
  // GA rejects domains without a dot; let GA default for localhost or unusual hosts.
  if (normalized === 'localhost') return undefined;
  if (!normalized.includes('.')) return undefined;
  return normalized;
};

const isGithubPagesHost = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = (window.location?.hostname ?? '').trim().toLowerCase();
  return host.endsWith('.github.io');
};

const ensurePosthogInitialized = (): void => {
  if (typeof window === 'undefined') return;
  if (!shouldEnableAnalytics()) return;
  if (posthogClient) return;
  if (posthogInitPromise) return;

  const posthogCfg = getPosthogConfig();
  if (!posthogCfg) return;

  posthogInitPromise = Promise.all([
    import('posthog-js'),
    import('posthog-js/dist/posthog-recorder')
  ])
    .then(([m]: any[]) => {
      posthogClient = m?.default ?? m;
      if (!posthogClient?.init) return;

      posthogClient.init(posthogCfg.key, {
        api_host: posthogCfg.host,
        ui_host: posthogCfg.uiHost,
        disable_external_dependency_loading: true,
        ...(isGithubPagesHost()
          ? {
              cross_subdomain_cookie: false,
              persistence: 'localStorage',
            }
          : {}),
        autocapture: {
          dom_event_allowlist: ['click', 'submit'],
          element_allowlist: ['a', 'button', 'form', 'label'],
          capture_copied_text: false,
        },
        capture_pageview: false,
        capture_pageleave: true,
      });

      try {
        posthogClient.register(getCommonProperties());
      } catch {
        // ignore
      }

      if (queuedPosthogRegisters) {
        try {
          posthogClient.register(queuedPosthogRegisters);
        } catch {
          // ignore
        }
        queuedPosthogRegisters = null;
      }

      const queued = queuedPosthogCaptures;
      queuedPosthogCaptures = [];
      for (const item of queued) {
        try {
          posthogClient.capture(item.event, item.properties);
        } catch {
          // ignore
        }
      }

      if (queuedPosthogIdentify) {
        try {
          posthogClient.identify(queuedPosthogIdentify.distinctId, queuedPosthogIdentify.properties);
        } catch {
          // ignore
        }
        queuedPosthogIdentify = null;
      }
    })
    .catch(() => {
      posthogInitPromise = null;
    })
    .then(() => {
    });
};

const ensureGtagLoaded = (measurementId: string) => {
  if (typeof window === 'undefined') return;
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = (window as any).gtag || function () {
    (window as any).dataLayer.push(arguments);
  };

  if ((window as any).__liftshift_ga_loaded) return;
  (window as any).__liftshift_ga_loaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  (window as any).gtag('js', new Date());
  (window as any).gtag('config', measurementId, {
    send_page_view: false,
    cookie_domain: getCookieDomain(),
    cookie_update: false,
  });
};

const getCommonProperties = (): AnalyticsProperties => {
  return {
    app: 'LiftShift',
    client_id: getAnalyticsClientId(),
    env: import.meta.env.MODE ?? (import.meta.env.PROD ? 'production' : import.meta.env.DEV ? 'development' : 'unknown'),
  };
};

export const initAnalytics = (): void => {
  if (typeof window === 'undefined') return;
  if ((window as any)[INIT_FLAG]) return;
  (window as any)[INIT_FLAG] = true;

  if (!shouldEnableAnalytics()) return;

  const gaId = getGaMeasurementId();
  if (gaId) ensureGtagLoaded(gaId);

  ensurePosthogInitialized();

  try {
    // Per-message flood cap: a single looping user (e.g. 537 M_ID rejections)
    // must arrive as 1 error + count, not 537 events.
    const errorCounts = new Map<string, number>();
    const ERROR_CAP_PER_MESSAGE = 10;

    const isNoise = (text: string): boolean => {
      return (
        text.includes('ResizeObserver loop completed') ||
        text.includes('Failed to connect to MetaMask') ||
        text.includes('adoptedStyleSheets') ||
        text === 'Script error.'
      );
    };

    const getRelease = (): string => {
      try {
        return (import.meta.env.VITE_APP_VERSION as string) || 'unknown';
      } catch {
        return 'unknown';
      }
    };

    const shouldCapture = (key: string, text: string): boolean => {
      if (!text || isNoise(text)) return false;
      const n = (errorCounts.get(key) ?? 0) + 1;
      errorCounts.set(key, n);
      return n <= ERROR_CAP_PER_MESSAGE;
    };

    const currentRoute = (): string => {
      try {
        return `${window.location.pathname || '/'}${window.location.search || ''}`.slice(0, 200);
      } catch {
        return 'unknown';
      }
    };

    window.addEventListener('error', (e) => {
      const message = String((e as any)?.message ?? '');
      if (!shouldCapture(`err:${message.slice(0, 120)}`, message)) return;
      trackEvent('frontend_error', {
        message,
        filename: (e as any)?.filename,
        lineno: (e as any)?.lineno,
        colno: (e as any)?.colno,
        stack: String((e as any)?.error?.stack ?? '').slice(0, 2000),
        route: currentRoute(),
        release: getRelease(),
      });
    });

    window.addEventListener('unhandledrejection', (e) => {
      const reason = String((e as any)?.reason ?? '');
      if (!shouldCapture(`rej:${reason.slice(0, 120)}`, reason)) return;
      trackEvent('frontend_unhandled_rejection', {
        reason: reason.slice(0, 2000),
        route: currentRoute(),
        release: getRelease(),
      });
    });
  } catch {
    // ignore
  }

  // Field Web Vitals (RUM): dynamic import so a RUM failure can never affect
  // analytics init or the app. No static import (avoids a module cycle with
  // webVitals.ts, which reports through trackEvent).
  import('./webVitals')
    .then((m) => m.initWebVitals())
    .catch(() => {
      // ignore
    });
};

export const trackPageView = (path: string, properties?: AnalyticsProperties): void => {
  if (!shouldEnableAnalytics()) return;
  if (typeof window === 'undefined') return;

  const common = getCommonProperties();
  const merged = { ...common, ...(properties || {}) };

  const gaId = getGaMeasurementId();
  if (gaId) ensureGtagLoaded(gaId);
  const gtag = (window as any).gtag;
  if (gaId && typeof gtag === 'function') {
    gtag('event', 'page_view', {
      page_title: document.title,
      page_location: `${window.location.origin}${path}`,
      page_path: path,
      ...merged,
    });
  }

  ensurePosthogInitialized();

  const phProps = { ...merged, path };
  if (posthogClient?.capture) {
    try {
      posthogClient.capture('$pageview', phProps);
    } catch {
      // ignore
    }
  } else {
    queuedPosthogCaptures.push({ event: '$pageview', properties: phProps });
    if (queuedPosthogCaptures.length > 100) queuedPosthogCaptures = queuedPosthogCaptures.slice(-100);
  }
};

export const trackEvent = (name: string, properties?: AnalyticsProperties): void => {
  if (!shouldEnableAnalytics()) return;
  if (typeof window === 'undefined') return;

  const common = getCommonProperties();
  const merged = { ...common, ...(properties || {}) };

  const gaId = getGaMeasurementId();
  if (gaId) ensureGtagLoaded(gaId);
  const gtag = (window as any).gtag;
  if (gaId && typeof gtag === 'function') {
    gtag('event', name, merged);
  }

  ensurePosthogInitialized();

  if (posthogClient?.capture) {
    try {
      posthogClient.capture(name, merged);
    } catch {
      // ignore
    }
  } else {
    queuedPosthogCaptures.push({ event: name, properties: merged });
    if (queuedPosthogCaptures.length > 100) queuedPosthogCaptures = queuedPosthogCaptures.slice(-100);
  }
};

export const setContext = (properties: AnalyticsProperties): void => {
  if (!shouldEnableAnalytics()) return;

  ensurePosthogInitialized();
  if (posthogClient?.register) {
    try {
      posthogClient.register(properties);
    } catch {
      // ignore
    }
    return;
  }

  queuedPosthogRegisters = { ...(queuedPosthogRegisters || {}), ...properties };
};

export const identifyUser = (
  distinctId: string,
  properties?: Record<string, unknown>
): void => {
  if (!shouldEnableAnalytics()) return;
  if (!distinctId || !distinctId.trim()) return;

  const trimmedId = distinctId.trim();

  ensurePosthogInitialized();

  if (posthogClient?.identify) {
    try {
      posthogClient.identify(trimmedId, properties);
    } catch {
      // ignore
    }
  } else {
    queuedPosthogIdentify = { distinctId: trimmedId, properties };
  }
};

export const resetUser = (): void => {
  if (!shouldEnableAnalytics()) return;

  ensurePosthogInitialized();
  if (posthogClient?.reset) {
    try {
      posthogClient.reset();
    } catch {
      // ignore
    }
  }
};
