import puppeteer, { type Browser, type Page } from 'puppeteer';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

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
// A1: flavor/age/use attribution for the stage-split server log (PostHog goal:
// every failure attributable in one query). Set on successful launch.
type BrowserFlavor = 'shell' | 'full';
let browserFlavor: BrowserFlavor = 'shell';
// A4: per-generation profile dir (H4: fixed /tmp/chromium-profile left
// SingletonLock files on the 512MB box, blocking later launches).
let browserGeneration = 0;
let currentProfileDir: string | null = null;
// A4: warmup guard — timestamp of the last real login acquisition so warmup
// never cold-launches into the single slot right after/before a login (H3:
// MAX_CONCURRENT_PAGES=1 below).
let lastLoginAcquiredAt = 0;
// A4: warmup skips its cold-launch branch when a login ran within this window.
// Warmup fires on first keystroke (commit 331da8a); type→submit is seconds, so
// 30s covers the gap without suppressing warmup for genuinely idle browsers.
const RECENT_LOGIN_GUARD_MS = 30_000;
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

// A1: structured failure stage. Values queue→execute are stamped where they
// are thrown below; 'upstream-login' is stamped by hevyApi.ts and
// 'route-timeout' by hevyRoutes.ts (120s race). Server-log only, plus an
// additive `stage` field on error JSON — never shown to users (constraint 1;
// safeError.ts keeps bare-500 bodies generic).
export type RecaptchaStage =
  | 'queue'
  | 'launch'
  | 'newPage'
  | 'goto'
  | 'script-wait'
  | 'execute'
  | 'upstream-login'
  | 'route-timeout';

export const withStage = (stage: RecaptchaStage, err: unknown): Error => {
  const e = err instanceof Error ? err : new Error(String(err));
  if ((e as any).stage == null) (e as any).stage = stage;
  return e;
};

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


// Browser flavor switch. `shell` (chrome-headless-shell) is lighter/faster
// and the default; `full` keeps the previous full-Chrome behavior
// (rollback via BROWSER_MODE=full, no redeploy needed). The shell only
// applies when no explicit executable is provided: Docker self-hosts pin
// system Chromium via PUPPETEER_EXECUTABLE_PATH, which has no shell build.
const useHeadlessShell =
  (process.env.BROWSER_MODE ?? 'shell') === 'shell' && !process.env.PUPPETEER_EXECUTABLE_PATH;

const launchBrowserWithFlavor = async (flavor: BrowserFlavor, profileDir: string): Promise<Browser> => {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
    headless: flavor === 'shell' ? ('shell' as const) : true,
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
      // A4: per-generation dir — a fixed path (H4) left SingletonLock files
      // behind on the 512MB box, so a later launch threw and became a 500.
      `--user-data-dir=${profileDir}`,
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
  const launched = await puppeteer.launch(launchOptions);
  console.log(`[Puppeteer] Launched ${flavor === 'shell' ? 'chrome-headless-shell' : 'full chrome (headless)'} flavor=${flavor} gen=${browserGeneration}`);
  return launched;
};

// Best-effort: profile cleanup must never fail the request path.
const removeDirBestEffort = async (dir: string, reason: string): Promise<void> => {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err) {
    console.warn(`[Puppeteer] Profile cleanup failed (${reason}) ${dir}:`, safeErrorMessage(err));
  }
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
  // A4: drop the per-generation profile dir with the browser so stale
  // SingletonLock files (H4) can never block a later launch.
  const profileDir = currentProfileDir;
  currentProfileDir = null;

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

  if (profileDir) {
    await removeDirBestEffort(profileDir, reason);
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

  // A1: split goto vs script-wait (H2: the 60s script wait from ed27a41
  // reclassified former client-aborts into counted 500s — the stage tells
  // which wait actually failed).
  try {
    await p.goto(HEVY_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: HEADLESS_BROWSER_TIMEOUT_MS });
  } catch (err) {
    throw withStage('goto', err);
  }
  try {
    await p.waitForFunction(() => Boolean((window as any).grecaptcha?.enterprise), {
      timeout: RECAPTCHA_SCRIPT_WAIT_MS,
    });
  } catch (err) {
    throw withStage('script-wait', err);
  }
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
      // A4: shell-with-full fallback (H1: raw launch throws at the old
      // hevyRecaptcha.ts:206-207 became counted 500s after af5bd7c). Both
      // attempts are logged with flavor (A1); BROWSER_MODE=full still pins
      // full-only via useHeadlessShell below.
      const preferred: BrowserFlavor = useHeadlessShell ? 'shell' : 'full';
      const fallback: BrowserFlavor = preferred === 'shell' ? 'full' : 'shell';
      const profileDirFor = (gen: number): string =>
        path.join(os.tmpdir(), `liftshift-chromium-${process.pid}-${gen}`);
      let attemptedDir: string | null = null;
      try {
        browserGeneration += 1;
        attemptedDir = profileDirFor(browserGeneration);
        browser = await launchBrowserWithFlavor(preferred, attemptedDir);
        browserFlavor = preferred;
        currentProfileDir = attemptedDir;
      } catch (launchErr) {
        console.warn(`[Puppeteer] Launch failed flavor=${preferred} gen=${browserGeneration}:`, safeErrorMessage(launchErr));
        if (attemptedDir) await removeDirBestEffort(attemptedDir, 'launch_failed');
        attemptedDir = null;
        try {
          browserGeneration += 1;
          attemptedDir = profileDirFor(browserGeneration);
          browser = await launchBrowserWithFlavor(fallback, attemptedDir);
          browserFlavor = fallback;
          currentProfileDir = attemptedDir;
          console.log(`[Puppeteer] Fallback launch OK flavor=${fallback} gen=${browserGeneration}`);
        } catch (fallbackErr) {
          console.warn(`[Puppeteer] Fallback launch failed flavor=${fallback} gen=${browserGeneration}:`, safeErrorMessage(fallbackErr));
          if (attemptedDir) await removeDirBestEffort(attemptedDir, 'launch_failed');
          currentProfileDir = null;
          // A1: launch-stage attribution for the 500s H1 diagnosed.
          throw withStage('launch', fallbackErr);
        }
      }
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
  if (!browser) throw withStage('launch', new Error('Recaptcha browser not available'));
  // A1: newPage-stage attribution (H1: raw throw at old hevyRecaptcha.ts:220).
  let page: Page;
  try {
    page = await browser.newPage();
  } catch (err) {
    throw withStage('newPage', err);
  }
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

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw withStage('queue', new Error('Recaptcha acquisition aborted (route timed out)'));
  }
};

const acquirePage = async (
  signal?: AbortSignal,
): Promise<{ page: Page; isStandby: boolean; queueMs: number; queuePosition: number }> => {
  const startTime = now();
  let queuePosition = 0;

  while (true) {
    // A5: stranded-work abort — a login whose route already answered (120s
    // race in hevyRoutes.ts) stops here instead of holding the single slot.
    throwIfAborted(signal);
    await ensureBrowser();

    if (standbyPage && !activePages.has(standbyPage) && !isPageClosed(standbyPage)) {
      activePages.add(standbyPage);
      return { page: standbyPage, isStandby: true, queueMs: now() - startTime, queuePosition };
    }

    if ((openPages.size + pageCreationReservations) < MAX_CONCURRENT_PAGES) {
      pageCreationReservations += 1;
      let createdPage: Page | null = null;
      let acquired = false;
      try {
        createdPage = await createPage();
        activePages.add(createdPage);
        throwIfAborted(signal);
        acquired = true;
        const page = createdPage;
        createdPage = null;
        return { page, isStandby: false, queueMs: now() - startTime, queuePosition };
      } finally {
        pageCreationReservations = Math.max(0, pageCreationReservations - 1);
        if (createdPage) {
          // A5: aborted after creating but before use — release parks the
          // page as standby (stays warm) and wakes exactly one waiter, so the
          // abandoned login never strands the single slot.
          await releasePage(createdPage);
        } else if (!acquired) {
          const waiter = pageWaiters.shift();
          if (waiter) waiter();
        }
      }
    }

    queuePosition = pageWaiters.length + 1;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const waiter = (): void => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', onAbort);
        resolve();
      };
      const onAbort = (): void => {
        if (settled) return;
        settled = true;
        // A5: leave the queue so abandoned logins don't consume the slot
        // when the holder releases it.
        const idx = pageWaiters.indexOf(waiter);
        if (idx >= 0) pageWaiters.splice(idx, 1);
        reject(withStage('queue', new Error('Recaptcha queue wait aborted (route timed out)')));
      };
      pageWaiters.push(waiter);
      if (signal) {
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener('abort', onAbort, { once: true });
        }
      }
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
  // A1: execute-stage attribution for evaluate failures / empty tokens.
  let token: string;
  try {
    token = await p.evaluate(async (siteKey: string) => {
      const enterprise = (window as any).grecaptcha?.enterprise;
      if (!enterprise) return '';
      return await enterprise.execute(siteKey, { action: 'login' });
    }, RECAPTCHA_SITE_KEY);
  } catch (err) {
    throw withStage('execute', err);
  }

  if (!token || typeof token !== 'string') {
    throw withStage('execute', new Error('Failed to retrieve recaptcha token'));
  }

  return token;
};

export interface RecaptchaTokenResult {
  token: string;
  usedCache: boolean;
  /** How the token was obtained: fresh token cache, hot standby page, or full cold launch. */
  source: 'cache' | 'standby' | 'cold';
  /**
   * Time spent inside acquirePage. For `cold` this INCLUDES the browser
   * launch + page load; for `standby` it is pure queue waiting behind whoever
   * currently holds the single page slot.
   */
  acquireMs: number;
  /** Number of other waiters queued ahead when acquisition started. */
  queuePosition: number;
  /** Time spent minting the token via page.evaluate (0 on cache hit). */
  executeMs: number;
  // A1 (additive): browser flavor that minted this token, browser age at
  // acquisition, and lifetime use count — server-log only.
  flavor: BrowserFlavor;
  browserAgeMs: number;
  useCount: number;
}

export interface RecaptchaTokenOptions {
  /** A5: route-timeout signal — aborts queue waits so stranded logins free the slot. */
  signal?: AbortSignal;
}

const tokenResultExtras = (): Pick<RecaptchaTokenResult, 'flavor' | 'browserAgeMs' | 'useCount'> => ({
  flavor: browserFlavor,
  browserAgeMs: browser ? Math.max(0, now() - browserCreatedAt) : 0,
  useCount: browserUseCount,
});

const fetchRecaptchaToken = async (opts: RecaptchaTokenOptions = {}): Promise<RecaptchaTokenResult> => {
  const { page, isStandby, queueMs, queuePosition } = await acquirePage(opts.signal);
  // A4: warmup-guard timestamp — a real login just took (or is taking) the slot.
  lastLoginAcquiredAt = now();
  const source = isStandby ? 'standby' : 'cold';

  try {
    throwIfAborted(opts.signal);
    if (isTokenCacheValid() && tokenCache) {
      return { token: tokenCache.token, usedCache: true, source, acquireMs: queueMs, queuePosition, executeMs: 0, ...tokenResultExtras() };
    }
    const execStart = now();
    let token: string;
    try {
      token = await executeRecaptcha(page);
    } catch {
      throwIfAborted(opts.signal);
      await ensureRecaptchaLoaded(page, true);
      token = await executeRecaptcha(page);
    }
    const executeMs = now() - execStart;

    browserUseCount += 1;
    return { token, usedCache: false, source, acquireMs: queueMs, queuePosition, executeMs, ...tokenResultExtras() };
  } finally {
    await releasePage(page);
  }
};

export const getRecaptchaToken = async (opts: RecaptchaTokenOptions = {}): Promise<RecaptchaTokenResult> => {
  if (isTokenCacheValid() && tokenCache) {
    return { token: tokenCache.token, usedCache: true, source: 'cache', acquireMs: 0, queuePosition: 0, executeMs: 0, ...tokenResultExtras() };
  }
  return fetchRecaptchaToken(opts);
};

export interface WarmupResult {
  /** What the warmup actually did: fetched on a hot standby page, launched cold, or skipped. */
  source: 'standby' | 'cold' | 'cache' | 'busy' | 'inflight' | 'recent-login';
  /** Time spent minting the token (0 when nothing was fetched). */
  executeMs: number;
}

export const warmRecaptchaSession = async (): Promise<WarmupResult> => {
  if (sessionWarmupInFlight) {
    await sessionWarmupInFlight;
    return { source: 'inflight', executeMs: 0 };
  }

  if (isTokenCacheValid()) {
    return { source: 'cache', executeMs: 0 };
  }

  let result: WarmupResult = { source: 'busy', executeMs: 0 };

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
        const execStart = now();
        try {
          token = await executeRecaptcha(page);
        } catch {
          await ensureRecaptchaLoaded(page, true);
          token = await executeRecaptcha(page);
        }
        result = { source: 'standby', executeMs: now() - execStart };
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
      // A4 (extends the activePages/pageWaiters guard above — old
      // hevyRecaptcha.ts:378 — to the cold-launch decision): never
      // cold-launch from warmup when a login ran recently. The standby branch above already
      // refreshed the cache on the hot page when one exists; reaching here
      // means no standby, so a cold launch would hold the single slot
      // (H3) exactly when the user's submit is likely seconds away (warmup
      // fires on first keystroke, commit 331da8a). Skip instead — the login
      // itself will warm the browser.
      if (now() - lastLoginAcquiredAt < RECENT_LOGIN_GUARD_MS) {
        result = { source: 'recent-login', executeMs: 0 };
        scheduleIdleClose();
        return;
      }
      const acquired = await acquirePage();
      page = acquired.page;
      const execStart = now();
      const token = await executeRecaptcha(page);
      result = { source: acquired.isStandby ? 'standby' : 'cold', executeMs: now() - execStart };
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
  return result;
};

export const shutdownRecaptchaSession = async (): Promise<void> => {
  await closeBrowser('shutdown');
};

export const clearTokenCache = (): void => {
  clearTokenCacheInternal();
};
