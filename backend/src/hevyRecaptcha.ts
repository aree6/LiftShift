import puppeteer, { type Browser, type Page } from 'puppeteer';

const HEVY_LOGIN_URL = 'https://hevy.com/login';
const RECAPTCHA_SITE_KEY = '6LfkQG0jAAAAANTrIkVXKPfSPHyJnt4hYPWqxh0R';
const HEADLESS_BROWSER_TIMEOUT_MS = 120_000;
// Bound for the grecaptcha script showing up on hevy.com/login. Deliberately
// shorter than the navigation timeout: when the script never executes (slow
// cold start, challenged datacenter IP), waiting the full 120s just parks
// the /login request past the frontend's own abort. Callers fail fast and
// the login route backstops the whole flow well under that.
const RECAPTCHA_SCRIPT_WAIT_MS = 60_000;
const BROWSER_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours: bounds leak growth on 512MB instance
const BROWSER_MAX_USE_COUNT = 100;
const BROWSER_IDLE_CLOSE_MS = 30 * 60 * 1000; // 30 min idle: keep daytime logins warm, free RAM overnight
const MAX_CONCURRENT_PAGES = 1;
const RECAPTCHA_TOKEN_CACHE_MS = 100_000;

type TokenCache = {
  token: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

type RecaptchaContext = {
  traceId?: string;
};

let browserInitInFlight: Promise<void> | null = null;
let browser: Browser | null = null;
let browserCreatedAt = 0;
let browserUseCount = 0;
let standbyPage: Page | null = null;
let idleCloseTimer: ReturnType<typeof setTimeout> | null = null;
const openPages = new Set<Page>();
const activePages = new Set<Page>();
const pageWaiters: Array<() => void> = [];
let pageCreationReservations = 0;
let sessionWarmupInFlight: Promise<void> | null = null;

const now = (): number => Date.now();

const isTokenCacheValid = (): boolean => {
  if (!tokenCache) return false;
  return Date.now() < tokenCache.expiresAt;
};

const setTokenCache = (token: string): void => {
  tokenCache = {
    token,
    expiresAt: Date.now() + RECAPTCHA_TOKEN_CACHE_MS,
  };
};

const clearTokenCacheInternal = (): void => {
  tokenCache = null;
};

const safeErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const clearIdleCloseTimer = (): void => {
  if (!idleCloseTimer) return;
  clearTimeout(idleCloseTimer);
  idleCloseTimer = null;
};

const scheduleIdleClose = (): void => {
  clearIdleCloseTimer();
  if (!browser) return;
  if (!Number.isFinite(BROWSER_IDLE_CLOSE_MS) || BROWSER_IDLE_CLOSE_MS <= 0) return;
  if (activePages.size > 0) return;

  idleCloseTimer = setTimeout(() => {
    void closeBrowser('idle_timeout').catch((err) => {
      console.warn(`⚠️ Browser idle close failed:`, safeErrorMessage(err));
    });
  }, BROWSER_IDLE_CLOSE_MS);
  idleCloseTimer.unref();
};


const launchBrowser = async (): Promise<Browser> => {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-crashpad',
      '--disable-crash-reporter',
      '--no-crash-upload',
      '--user-data-dir=/tmp/chromium-profile',
      '--disable-blink-features=AutomationControlled',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-networking',
      '--disable-sync',
    ],
  };
  const browser = await puppeteer.launch(launchOptions);
  return browser;
};

const isPageClosed = (p: Page | null): boolean => {
  if (!p) return true;
  try {
    return p.isClosed();
  } catch {
    return true;
  }
};

const closePage = async (p: Page, reason: string): Promise<void> => {
  openPages.delete(p);
  activePages.delete(p);
  if (standbyPage === p) standbyPage = null;
  if (!isPageClosed(p)) {
    try {
      await p.close();
    } catch {
      // Silent fail
    }
  }
};

const closeBrowser = async (reason: string): Promise<void> => {
  clearIdleCloseTimer();
  const activeBrowser = browser;
  const pages = Array.from(openPages);

  openPages.clear();
  activePages.clear();
  standbyPage = null;
  browser = null;
  browserCreatedAt = 0;
  browserUseCount = 0;
  pageCreationReservations = 0;

  for (const p of pages) {
    await closePage(p, reason);
  }

  if (activeBrowser) {
    try {
      await activeBrowser.close();
    } catch (err) {
      console.warn(`⚠️ Browser close failed:`, safeErrorMessage(err));
    }
  }

  while (pageWaiters.length > 0) {
    const waiter = pageWaiters.shift();
    if (waiter) waiter();
  }
};

const needsBrowserRecycle = (): boolean => {
  if (!browser) return false;
  if (browserUseCount >= BROWSER_MAX_USE_COUNT) return true;
  if (browserCreatedAt === 0) return true;
  return now() - browserCreatedAt >= BROWSER_MAX_AGE_MS;
};

const ensureRecaptchaLoaded = async (p: Page, forceReload = false): Promise<void> => {
  const ready = await p.evaluate(() => Boolean((window as any).grecaptcha?.enterprise));
  if (ready && !forceReload) {
    return;
  }

  await p.goto(HEVY_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: HEADLESS_BROWSER_TIMEOUT_MS });
  await p.waitForFunction(() => Boolean((window as any).grecaptcha?.enterprise), {
    timeout: RECAPTCHA_SCRIPT_WAIT_MS,
  });
};

const ensureBrowser = async (): Promise<void> => {
  if (browserInitInFlight) {
    await browserInitInFlight;
    return;
  }

  browserInitInFlight = (async () => {
    if (needsBrowserRecycle()) {
      await closeBrowser('recycle');
    }

    if (!browser || !browser.isConnected()) {
      browser = await launchBrowser();
      browserCreatedAt = now();
      browserUseCount = 0;
    }
  })();

  try {
    await browserInitInFlight;
  } finally {
    browserInitInFlight = null;
  }
};

const createPage = async (): Promise<Page> => {
  if (!browser) throw new Error('Recaptcha browser not available');
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  page.setDefaultNavigationTimeout(HEADLESS_BROWSER_TIMEOUT_MS);
  page.setDefaultTimeout(HEADLESS_BROWSER_TIMEOUT_MS);
  openPages.add(page);
  page.once('close', () => {
    openPages.delete(page);
    activePages.delete(page);
    if (standbyPage === page) standbyPage = null;
  });
  await ensureRecaptchaLoaded(page);
  return page;
};

const acquirePage = async (
): Promise<{ page: Page; isStandby: boolean; queueMs: number; queuePosition: number }> => {
  const startTime = now();
  let queuePosition = 0;

  while (true) {
    await ensureBrowser();

    if (standbyPage && !activePages.has(standbyPage) && !isPageClosed(standbyPage)) {
      activePages.add(standbyPage);
      return { page: standbyPage, isStandby: true, queueMs: now() - startTime, queuePosition };
    }

    if ((openPages.size + pageCreationReservations) < MAX_CONCURRENT_PAGES) {
      pageCreationReservations += 1;
      let created = false;
      try {
        const page = await createPage();
        created = true;
        activePages.add(page);
        return { page, isStandby: false, queueMs: now() - startTime, queuePosition };
      } finally {
        pageCreationReservations = Math.max(0, pageCreationReservations - 1);
        if (!created) {
          const waiter = pageWaiters.shift();
          if (waiter) waiter();
        }
      }
    }

    queuePosition = pageWaiters.length + 1;
    await new Promise<void>((resolve) => {
      pageWaiters.push(resolve);
    });
  }
};

const releasePage = async (page: Page): Promise<void> => {
  activePages.delete(page);

  // Never park a dead page as standby: a closed page would be skipped by
  // acquirePage's liveness check but still block the slot until replaced.
  if (isPageClosed(page)) {
    if (standbyPage === page) standbyPage = null;
  } else if (!standbyPage || standbyPage === page) {
    if (!standbyPage) standbyPage = page;
  } else {
    await closePage(page, 'page_release');
  }

  if (activePages.size === 0) {
    scheduleIdleClose();
  }

  const waiter = pageWaiters.shift();
  if (waiter) waiter();
};

const executeRecaptcha = async (p: Page): Promise<string> => {
  const token = await p.evaluate(async (siteKey: string) => {
    const enterprise = (window as any).grecaptcha?.enterprise;
    if (!enterprise) return '';
    return await enterprise.execute(siteKey, { action: 'login' });
  }, RECAPTCHA_SITE_KEY);

  if (!token || typeof token !== 'string') {
    throw new Error('Failed to retrieve recaptcha token');
  }

  return token;
};

const fetchRecaptchaToken = async (): Promise<string> => {
  const { page, isStandby } = await acquirePage();

  try {
    let token: string;
    
    if (isTokenCacheValid() && tokenCache) {
      token = tokenCache.token;
    } else {
      try {
        token = await executeRecaptcha(page);
      } catch {
        await ensureRecaptchaLoaded(page, true);
        token = await executeRecaptcha(page);
      }
    }

    browserUseCount += 1;
    return token;
  } finally {
    await releasePage(page);
  }
};

export const getRecaptchaToken = async (): Promise<{ token: string; usedCache: boolean }> => {
  if (isTokenCacheValid() && tokenCache) {
    return { token: tokenCache.token, usedCache: true };
  }
  const token = await fetchRecaptchaToken();
  return { token, usedCache: false };
};

export const warmRecaptchaSession = async (): Promise<void> => {
  if (sessionWarmupInFlight) {
    await sessionWarmupInFlight;
    return;
  }

  if (isTokenCacheValid()) {
    return;
  }

  sessionWarmupInFlight = (async () => {
    if (activePages.size > 0 || pageWaiters.length > 0) {
      scheduleIdleClose();
      return;
    }

    // A standby page exists: actually use it to refresh the token cache.
    // (Previously this returned "OK" without fetching anything, so the next
    // real login still paid a full cold start while the logs looked healthy.)
    // No contention: we bailed above while any page is active or queued, and
    // MAX_CONCURRENT_PAGES is 1.
    if (standbyPage && !isPageClosed(standbyPage)) {
      const page = standbyPage;
      try {
        activePages.add(page);
        let token: string;
        try {
          token = await executeRecaptcha(page);
        } catch {
          await ensureRecaptchaLoaded(page, true);
          token = await executeRecaptcha(page);
        }
        setTokenCache(token);
        browserUseCount += 1;
      } catch (err) {
        // Drop a broken standby page so the next acquire builds a fresh one
        // (releasePage below no longer parks dead pages).
        await closePage(page, 'warmup_failed');
        console.warn(`⚠️ Warmup failed:`, safeErrorMessage(err));
      } finally {
        await releasePage(page);
      }
      scheduleIdleClose();
      return;
    }

    let page: Page | null = null;
    try {
      const acquired = await acquirePage();
      page = acquired.page;
      const token = await executeRecaptcha(page);
      setTokenCache(token);
    } catch (err) {
      console.warn(`⚠️ Warmup failed:`, safeErrorMessage(err));
    } finally {
      if (page) {
        await releasePage(page);
      }
      scheduleIdleClose();
    }
  })();

  try {
    await sessionWarmupInFlight;
  } finally {
    sessionWarmupInFlight = null;
  }
};

export const shutdownRecaptchaSession = async (): Promise<void> => {
  await closeBrowser('shutdown');
};

export const clearTokenCache = (): void => {
  clearTokenCacheInternal();
};
