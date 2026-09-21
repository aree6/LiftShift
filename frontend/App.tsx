import React, { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { Trophy } from 'lucide-react';
import { WorkoutSet } from './types';
import { Tab } from './app/navigation';
import { AppOnboardingLayer } from './components/app/AppOnboardingLayer';
import { AppLoadingOverlay } from './components/app/AppLoadingOverlay';
import { UserPreferencesModal } from './components/modals/userPreferences/UserPreferencesModal';
import { BuyMeACoffeeModal } from './components/modals/buyMeACoffee/BuyMeACoffeeModal';
import { ToastProvider, useToast } from './components/ui/ToastProvider';
import type { OnboardingFlow } from './app/onboarding/types';
import { getEffectiveNowFromWorkoutData } from './utils/date/dateUtils';
import { getDataSourceChoice, getSetupComplete } from './utils/storage/dataSourceStorage';
import { clearCacheAndRestart as clearCacheAndRestartNow, forceRefreshAndRelogin as forceRefreshNow } from './app/state';
import { usePrefetchHeavyViews } from './app/navigation';
import { useStartupAutoLoad } from './app/startup';
import { usePlatformDeepLink } from './app/navigation';
import { useAppAuth } from './hooks/auth';
import { useAppNavigation } from './hooks/app';
import { useAppCalendarFilters } from './hooks/app';
import { useAppPreferences } from './hooks/app';
import { AppFilterControls } from './app/ui';
import { AppShell } from './app/ui';
import { useAppSideEffects } from './app/state';
import { useAppDerivedData } from './app/state';
import { useDashboardWarmup } from './app/state';
import { useCalendarSelectionHandlers } from './app/state';
import { useUpdateFlowHandler } from './app/auth';
import { calculatePRInsights } from './utils/analysis/insights';
import { computationCache } from './utils/storage/computationCache';
import { flexCacheKeys } from './utils/storage/cacheKeys';
import { createFingerprintMatcher } from './utils/exercise/exerciseFingerprint';
import { resolveDarkBgByMode, resolveLightBg } from './src/assets/images/misc/bgConfig';

const CHUNK_RELOAD_KEY = 'liftshift_chunk_reload_once';

const CHUNK_LOAD_ERROR_PATTERNS = [
  'dynamically imported module',
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'disallowed mime type',
];

const isChunkLoadError = (value: unknown): boolean => {
  const msg =
    typeof value === 'string'
      ? value
      : value instanceof Error
        ? value.message
        : typeof (value as any)?.message === 'string'
          ? (value as any).message
          : '';

  if (!msg) return false;
  const lower = msg.toLowerCase();
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
};

const tryRecoverFromChunkLoadError = (): void => {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    window.location.reload();
  } catch {
    window.location.reload();
  }
};

const formatRelativeTime = (ms: number): string => {
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) {
    const remMins = minutes % 60;
    if (remMins === 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    return `${hours}h ${remMins}m ago`;
  }
  const remHours = hours % 24;
  if (days === 1) {
    if (remHours === 0) return '1 day ago';
    return `1 day, ${remHours}h ago`;
  }
  if (remHours === 0) return `${days} days ago`;
  return `${days} days, ${remHours}h ago`;
};

const ToastNotifier: React.FC<{ addToastRef: React.MutableRefObject<((content: React.ReactNode, duration?: number) => string) | null> }> = ({ addToastRef }) => {
  const { addToast } = useToast();
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast, addToastRef]);
  return null;
};

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onVitePreloadError = (event: Event) => {
      const payload = (event as any)?.payload;
      if (!isChunkLoadError(payload)) return;
      event.preventDefault();
      tryRecoverFromChunkLoadError();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return;
      event.preventDefault();
      tryRecoverFromChunkLoadError();
    };

    window.addEventListener('vite:preloadError', onVitePreloadError as EventListener);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('vite:preloadError', onVitePreloadError as EventListener);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  useLayoutEffect(() => {
    try {
      const rawSearch = window.location.search || '';
      if (!rawSearch.includes('p=')) return;

      const params = new URLSearchParams(rawSearch);
      const p = params.get('p');
      if (!p) return;

      const q = params.get('q');
      const h = params.get('h');

      params.delete('p');
      params.delete('q');
      params.delete('h');

      const rest = params.toString();
      const nextSearch = (q ? decodeURIComponent(q) : '') || (rest ? `?${rest}` : '');
      const nextHash = h ? decodeURIComponent(h) : '';
      const nextPath = decodeURIComponent(p);

      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const desired = `${nextPath}${nextSearch}${nextHash}`;
      if (current === desired) return;

      navigate({ pathname: nextPath, search: nextSearch, hash: nextHash }, { replace: true });
    } catch {
      // ignore
    }
  }, [navigate]);

  const [parsedData, setParsedData] = useState<WorkoutSet[]>([]);
  const [dataBySource, setDataBySource] = useState<Partial<Record<'hevy' | 'lyfta' | 'strong' | 'other' | 'motra', WorkoutSet[]>>>({});
  const [hasHydratedData, setHasHydratedData] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingFlow | null>(() => {
    return getSetupComplete() ? null : { intent: 'initial', step: 'platform' };
  });
  const [dataSource, setDataSource] = useState(() => getDataSourceChoice());
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [showBmcModal, setShowBmcModal] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);

  // Stable refs declared up-front so data callbacks below keep a fixed identity
  // (inline closures here previously recreated every auth handler per render).
  const lastAutoFilteredMaxTs = useRef<number>(0);
  const isCombiningRef = useRef(false);
  const platformQueryConsumedRef = useRef(false);
  const addToastRef = useRef<((content: React.ReactNode, duration?: number) => string) | null>(null);
  // Live mirror of dataBySource so mergeIntoCombinedData reads fresh state
  // without depending on it (keeps the callback — and everything downstream
  // of it — referentially stable across data loads). Same pattern as
  // analyzingRef in useDashboardWarmup.
  const dataBySourceRef = useRef(dataBySource);
  dataBySourceRef.current = dataBySource;

  const {
    mode,
    setMode,
    font,
    setFont,
    weightUnit,
    setWeightUnit,
    bodyMapGender,
    setBodyMapGender,
    exerciseTrendMode,
    setExerciseTrendMode,
    secondarySetMultiplier,
    setSecondarySetMultiplier,
    showTransparency,
    setShowTransparency,
    darkBgChoice,
    setDarkBgChoice,
    lightBgChoice,
    setLightBgChoice,
  } = useAppPreferences();

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (mode === 'light' && showTransparency) {
      root.dataset.showBg = 'true';
    } else {
      delete root.dataset.showBg;
    }
  }, [mode, showTransparency]);

  const mergeDatasets = useCallback(
    (datasets: Partial<Record<'hevy' | 'lyfta' | 'strong' | 'other' | 'motra', WorkoutSet[]>>): WorkoutSet[] => {
      const activeSourceCount = Object.values(datasets).filter((sets) => (sets?.length ?? 0) > 0).length;
      const useSourceLabels = activeSourceCount > 1;
      const normalizedBySource = new Map<'hevy' | 'lyfta' | 'strong' | 'other' | 'motra', Map<string, string>>();

      const sources = Object.entries(datasets) as Array<['hevy' | 'lyfta' | 'strong' | 'other' | 'motra', WorkoutSet[] | undefined]>;
      const allCanonicalNames = Array.from(
        new Set(
          sources.flatMap(([_, sets]) => (sets ?? []).map((s) => s.exercise_title || '').filter(Boolean))
        )
      );
      const matcher = createFingerprintMatcher(allCanonicalNames);

      for (const [source, sets] of sources) {
        const m = new Map<string, string>();
        for (const set of sets ?? []) {
          const raw = set.exercise_title || '';
          if (!raw) continue;
          const resolved = matcher.match(raw);
          m.set(raw, resolved.name || raw);
        }
        normalizedBySource.set(source, m);
      }

      const canonicalSources = new Map<string, Set<string>>();
      for (const [source, sets] of sources) {
        const normMap = normalizedBySource.get(source);
        for (const set of sets ?? []) {
          const raw = set.exercise_title || '';
          const canonical = normMap?.get(raw) || raw;
          if (!canonical) continue;
          if (!canonicalSources.has(canonical)) canonicalSources.set(canonical, new Set());
          canonicalSources.get(canonical)!.add(source);
        }
      }

      const merged: WorkoutSet[] = [];
      for (const [source, sets] of sources) {
        const normMap = normalizedBySource.get(source);
        for (const set of sets ?? []) {
          const raw = set.exercise_title || '';
          const canonical = normMap?.get(raw) || raw;
          const contributingSources = canonicalSources.get(canonical) ?? new Set([source]);
          const label = !useSourceLabels
            ? ''
            : contributingSources.size > 1
              ? '@merged'
              : source === 'hevy'
                ? '@hevy'
                : source === 'lyfta'
                  ? '@lyfta'
                  : source === 'strong'
                    ? '@strong'
                    : source === 'motra'
                      ? '@motra'
                      : '@other';
          const exerciseTitle = label ? `${canonical || raw} ${label}` : (canonical || raw);
          merged.push({ ...set, exercise_title: exerciseTitle.trim(), source });
        }
      }

      merged.sort((a, b) => {
        const ta = a.parsedDate?.getTime() ?? 0;
        const tb = b.parsedDate?.getTime() ?? 0;
        if (tb !== ta) return tb - ta;
        const exA = a.exercise_index ?? 0;
        const exB = b.exercise_index ?? 0;
        if (exA !== exB) return exA - exB;
        return (a.set_index || 0) - (b.set_index || 0);
      });

      return merged;
    },
    []
  );

  const mergeIntoCombinedData = useCallback(
    (source: 'hevy' | 'lyfta' | 'strong' | 'other' | 'motra', incoming: WorkoutSet[], replaceMode = true) => {
      const DEMO_MODE_KEY = 'hevy_analytics_demo_mode';
      const isDemoMode = (() => {
        try {
          return localStorage.getItem(DEMO_MODE_KEY) === '1';
        } catch {
          return false;
        }
      })();
      if (isDemoMode && source !== 'other') {
        try {
          localStorage.removeItem(DEMO_MODE_KEY);
        } catch {}
      }

      // Compute outside the updater (updaters must be pure; nesting
      // setParsedData inside setDataBySource caused double renders and
      // StrictMode double-invoke of the expensive merge). Reads the live
      // ref mirror instead of state, so this callback never goes stale and
      // never invalidates downstream handler memos on data loads.
      const prev = dataBySourceRef.current;
      const existing = replaceMode ? [] : (prev[source] ?? []);
      const nextSourceData = [...existing, ...incoming];

      const byKey = new Map<string, WorkoutSet>();
      for (const set of nextSourceData) {
        const key = [
          set.start_time,
          set.end_time,
          set.exercise_title,
          set.set_index,
          set.weight_kg,
          set.reps,
          set.rpe,
        ].join('|');
        if (!byKey.has(key)) byKey.set(key, set);
      }

      const deduped = Array.from(byKey.values());
      const next: Partial<Record<'hevy' | 'lyfta' | 'strong' | 'other' | 'motra', WorkoutSet[]>> =
        replaceMode ? { [source]: deduped } : { ...prev, [source]: deduped };
      if (isDemoMode && source !== 'other') {
        delete (next as any).other;
      }
      const combined = mergeDatasets(next);
      dataBySourceRef.current = next;
      setDataBySource(next);
      setParsedData(combined);
      if (combined.length > 0) setHasHydratedData(true);
    },
    [mergeDatasets]
  );

  const {
    activeTab,
    isTabPending,
    pendingTab,
    highlightedExercise,
    initialMuscleForAnalysis,
    initialWeeklySetsWindow,
    targetHistoryDate,
    mainRef,
    handleExerciseClick,
    handleMuscleClick,
    handleDayClick,
    handleTargetDateConsumed,
    handleSelectTab,
    clearHighlightedExercise,
    clearInitialMuscleForAnalysis,
  } = useAppNavigation();

  const {
    selectedMonth,
    selectedDay,
    selectedRange,
    selectedWeeks,
    calendarOpen,
    filteredData,
    hasActiveCalendarFilter,
    calendarSummaryText,
    minDate,
    maxDate,
    availableDatesSet,
    filterCacheKey,
    setSelectedMonth,
    setSelectedDay,
    setSelectedRange,
    setSelectedWeeks,
    setCalendarOpen,
    toggleCalendarOpen,
    clearAllFilters,
  } = useAppCalendarFilters({
    parsedData,
    effectiveNow: useMemo(() => {
      // Always use actual current date for calendar
      const dataBasedNow = getEffectiveNowFromWorkoutData(parsedData, new Date(0));
      return dataBasedNow.getTime() > 0 ? dataBasedNow : new Date();
    }, [parsedData]),
  });

  // Stable data-ingest callbacks so useAppAuth/useStartupAutoLoad handler memos
  // don't invalidate on every App render (was inline closures → full cascade).
  const handleAuthData = useCallback(
    (data: WorkoutSet[]) => {
      const inferredSource = data[0]?.source;
      if (inferredSource === 'hevy' || inferredSource === 'lyfta' || inferredSource === 'strong' || inferredSource === 'other' || inferredSource === 'motra') {
        const shouldMerge = isCombiningRef.current;
        isCombiningRef.current = false;
        clearAllFilters();
        lastAutoFilteredMaxTs.current = 0;
        mergeIntoCombinedData(inferredSource, data, !shouldMerge);
        return;
      }
      setParsedData(data);
      if (data.length > 0) setHasHydratedData(true);
    },
    [clearAllFilters, mergeIntoCombinedData]
  );

  const handleStartupData = useCallback(
    (data: WorkoutSet[]) => {
      const inferredSource = data[0]?.source;
      if (inferredSource === 'hevy' || inferredSource === 'lyfta' || inferredSource === 'strong' || inferredSource === 'other' || inferredSource === 'motra') {
        mergeIntoCombinedData(inferredSource, data, false);
        return;
      }
      setParsedData(data);
      if (data.length > 0) setHasHydratedData(true);
    },
    [mergeIntoCombinedData]
  );

  const {
    hevyLoginError,
    lyfatLoginError,
    csvImportError,
    loadingKind,
    isAnalyzing,
    isCompleting,
    setLoadingKind,
    setIsAnalyzing,
    startProgress,
    finishProgress,
    handleHevySyncSaved,
    handleHevyApiKeyLogin,
    handleHevyLogin,
    handleLyfatSyncSaved,
    handleLyfatLogin,
    processFile,
    clearHevyLoginError,
    clearLyfatLoginError,
    clearCsvImportError,
  } = useAppAuth({
    weightUnit,
    setParsedData: handleAuthData,
    setDataSource,
    setOnboarding,
    setSelectedMonth,
    setSelectedDay,
  });

  usePlatformDeepLink({ location, navigate, setOnboarding, platformQueryConsumedRef });
  useAppSideEffects({ onboardingIntent: onboarding?.intent ?? null, dataSource, location });
  usePrefetchHeavyViews();

  useStartupAutoLoad({
    parsedData,
    setOnboarding,
    setDataSource,
    setParsedData: handleStartupData,
    setHevyLoginError: clearHevyLoginError,
    setLyfatLoginError: clearLyfatLoginError,
    setCsvImportError: clearCsvImportError,
    setIsAnalyzing,
    isAnalyzing,
    setLoadingKind,
    startProgress,
    finishProgress,
  });

  const { filteredEffectiveNow, calendarEffectiveNow, dataAgeInfo, dailySummaries, exerciseStats } = useAppDerivedData({
    parsedData,
    filteredData,
    filterCacheKey,
  });

  // Background-only precompute of the dashboard's expensive derivations so
  // first paint mounts onto warm cache. Deliberately NOT used to hold the
  // boot overlay open: the hold (isWarming in the overlay condition) wedged
  // Hevy/Lyfta credential login on an infinite loading screen — finishProgress
  // flips isAnalyzing false ~250ms after data arrival while warmup is still
  // running, stranding the hold with no successor to release it. Overlay
  // keeps its pre-audit behavior (isAnalyzing / cold-start only); warmup
  // still fills the shared cache in the background.
  useDashboardWarmup({
    filteredData,
    filterCacheKey,
    effectiveNow: filteredEffectiveNow,
    weightUnit,
    secondarySetMultiplier,
  });

  // Track last auto-filtered max timestamp to prevent re-triggering (refs declared at top).
  useEffect(() => {
    if (onboarding === null) {
      isCombiningRef.current = false;
    } else if (onboarding.step === 'add_source_platform') {
      isCombiningRef.current = true;
    } else if (onboarding.intent !== 'update') {
      isCombiningRef.current = false;
    }
  }, [onboarding]);
  
  // Auto-apply filter once per unique data load when stale
  useEffect(() => {
    if (!dataAgeInfo?.isStale) return;
    if (hasActiveCalendarFilter) return; // Don't override user filter
    if (parsedData.length === 0) return; // Wait for data
    
    // Find actual min/max dates from data
    let minTs = Number.POSITIVE_INFINITY;
    let maxTs = 0;
    for (const s of parsedData) {
      if (!s.parsedDate) continue;
      const ts = s.parsedDate.getTime();
      if (ts < minTs) minTs = ts;
      if (ts > maxTs) maxTs = ts;
    }
    
    // Only auto-filter if we haven't filtered this exact max timestamp before
    // This handles: new uploads (different timestamp), clears (ref survives), reloads
    if (!Number.isFinite(minTs) || maxTs <= 0 || lastAutoFilteredMaxTs.current === maxTs) return;
    
    lastAutoFilteredMaxTs.current = maxTs;
    setSelectedRange({ 
      start: new Date(minTs), 
      end: new Date(maxTs) 
    });
  }, [dataAgeInfo?.isStale, hasActiveCalendarFilter, parsedData]);

  const filterControls = useMemo(
    () => (
      <AppFilterControls
        hasActiveCalendarFilter={hasActiveCalendarFilter}
        calendarSummaryText={calendarSummaryText}
        setCalendarOpen={setCalendarOpen}
        clearAllFilters={clearAllFilters}
        toggleCalendarOpen={toggleCalendarOpen}
      />
    ),
    [hasActiveCalendarFilter, calendarSummaryText, setCalendarOpen, clearAllFilters, toggleCalendarOpen]
  );

  const desktopFilterControls = useMemo(
    () => <div className="hidden sm:block">{filterControls}</div>,
    [filterControls]
  );

  const clearCacheAndRestart = useCallback(() => {
    clearCacheAndRestartNow();
  }, []);

  const forceRefreshAndRelogin = useCallback(() => {
    forceRefreshNow();
  }, []);

  const handleHistoryDayTitleClick = useCallback(
    (date: Date) => {
      setSelectedDay(date);
      setSelectedRange(null);
      setSelectedWeeks([]);
      setSelectedMonth('all');
      handleSelectTab(Tab.MUSCLE_ANALYSIS);
    },
    [setSelectedDay, setSelectedRange, setSelectedWeeks, setSelectedMonth, handleSelectTab]
  );

  const handleOpenUpdateFlow = useUpdateFlowHandler({
    dataSource,
    setOnboarding,
    clearCsvImportError,
    clearHevyLoginError,
    clearLyfatLoginError,
  });

  const calendarHandlers = useCalendarSelectionHandlers({
    setSelectedDay,
    setSelectedRange,
    setSelectedWeeks,
    setCalendarOpen,
  });

  const showColdStartOverlay = onboarding?.intent !== 'initial' && parsedData.length === 0 && !hasHydratedData;

  const dataAgeShownRef = useRef(false);
  const prevHasFilterRef = useRef(false);

  useEffect(() => {
    if (showColdStartOverlay || parsedData.length === 0 || onboarding?.intent === 'initial') {
      dataAgeShownRef.current = false;
      return;
    }

    if (dataAgeShownRef.current) return;

    let latestMs = 0;
    for (const s of parsedData) {
      if (s.parsedDate) {
        const ts = s.parsedDate.getTime();
        if (ts > latestMs) latestMs = ts;
      }
    }

    if (latestMs > 0) {
      const msAgo = Date.now() - latestMs;
      const relativeTime = formatRelativeTime(msAgo);
      const latestDay = new Date(latestMs).toDateString();

      // Tracked so cleanup can cancel the whole chain (outer timer + inner
      // idle callback), not just the outer timer.
      let idleHandle: number | null = null;
      let idleFallbackTimer: number | null = null;

      const timer = setTimeout(() => {
        const scheduleIdle = (fn: () => void): void => {
          const w = window as any;
          if (typeof w.requestIdleCallback === 'function') {
            idleHandle = w.requestIdleCallback(fn, { timeout: 2000 });
          } else {
            idleFallbackTimer = window.setTimeout(fn, 50);
          }
        };
        scheduleIdle(() => {
          let prCount = 0;
          try {
            const prInsights = computationCache.getOrCompute(
              flexCacheKeys.prInsights(filterCacheKey),
              parsedData,
              () => calculatePRInsights(parsedData, new Date()),
              { ttl: 10 * 60 * 1000 }
            );
            prCount = prInsights.recentPRs.filter((pr: any) => {
              const prDate = pr.date;
              if (!prDate) return false;
              return prDate.toDateString() === latestDay;
            }).length;
          } catch {}
          if (prCount > 0) {
            addToastRef.current?.(
              <div className="flex flex-col gap-1">
                <span>
                  <span style={{ color: 'var(--text-secondary)' }}>Last workout was </span>
                  <strong>{relativeTime}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 text-yellow-400 font-semibold">
                  <Trophy className="w-4 h-4" />
                  with {prCount} new PR{prCount === 1 ? '' : 's'}
                </span>
              </div>
            );
          } else {
            addToastRef.current?.(
              <span>
                <span style={{ color: 'var(--text-secondary)' }}>Last session was </span>
                <strong>{relativeTime}</strong>
              </span>
            );
          }
        });
       }, 800);
       dataAgeShownRef.current = true;
       return () => {
         clearTimeout(timer);
         if (idleHandle != null) {
           try {
             (window as any).cancelIdleCallback?.(idleHandle);
           } catch {}
           idleHandle = null;
         }
         if (idleFallbackTimer != null) {
           clearTimeout(idleFallbackTimer);
           idleFallbackTimer = null;
         }
       };
    }
  }, [parsedData, showColdStartOverlay, onboarding?.intent, filterCacheKey]);

  useEffect(() => {
    if (onboarding?.intent === 'initial') return;
    if (!prevHasFilterRef.current && hasActiveCalendarFilter) {
      addToastRef.current?.('Calendar filter applied', 1500);
    } else if (prevHasFilterRef.current && !hasActiveCalendarFilter) {
      addToastRef.current?.('Calendar filter removed', 1500);
    }
    prevHasFilterRef.current = hasActiveCalendarFilter;
  }, [hasActiveCalendarFilter, onboarding?.intent]);

  useEffect(() => {
    if (parsedData.length === 0) return;
    if (onboarding !== null) return;
    try {
      if (localStorage.getItem('hevy_analytics_demo_mode') === '1') return;
    } catch {}

    try {
      const last = localStorage.getItem('bmc_last_session_ts');
      if (last) {
        const elapsed = Date.now() - parseInt(last, 10);
        if (elapsed < 30 * 60 * 1000) return;
      }
      const count = parseInt(localStorage.getItem('bmc_session_count') || '0', 10);
      localStorage.setItem('bmc_session_count', String(count + 1));
      localStorage.setItem('bmc_last_session_ts', String(Date.now()));
    } catch {}
  }, [parsedData.length, onboarding]);

  useEffect(() => {
    const APP_TABS: Tab[] = [Tab.DASHBOARD, Tab.EXERCISES, Tab.HISTORY, Tab.MUSCLE_ANALYSIS, Tab.FLEX];

    const inAppTab = APP_TABS.includes(activeTab);
    const isDemoMode = (() => {
      try { return localStorage.getItem('hevy_analytics_demo_mode') === '1'; } catch { return false; }
    })();

    if (!inAppTab || isDemoMode || onboarding) {
      try { localStorage.removeItem('bmc_session_start'); } catch {}
      return;
    }

    try {
      const sessionCount = parseInt(localStorage.getItem('bmc_session_count') || '0', 10);
      if (sessionCount < 3) return;
      if (sessionCount % 3 !== 0) return;

      const supporterTs = localStorage.getItem('bmc_supporter_cooldown');
      if (supporterTs) {
        const elapsed = Date.now() - parseInt(supporterTs, 10);
        if (elapsed < 60 * 24 * 60 * 60 * 1000) return;
      }
    } catch {}

    try {
      localStorage.setItem('bmc_session_start', String(Date.now()));
    } catch {}

    const interval = setInterval(() => {
      try {
        const sessionStart = localStorage.getItem('bmc_session_start');
        if (!sessionStart) return;
        const elapsed = Date.now() - parseInt(sessionStart, 10);
        if (elapsed >= 120 * 1000) {
          clearInterval(interval);
          setShowBmcModal(true);
        }
      } catch {}
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTab, onboarding]);

  return (
    <ToastProvider>
      <ToastNotifier addToastRef={addToastRef} />
      <div
        className="relative flex flex-col min-h-[100svh] h-[100dvh] overscroll-none bg-transparent text-[color:var(--app-fg)] font-sans"
      >
        {/* Full-page Background Image (dark mode only, user preference) */}
        {mode !== 'light' && showTransparency && (
          <>
            <img
              src={resolveDarkBgByMode(mode, darkBgChoice)}
              alt=""
              aria-hidden="true"
              onLoad={() => setBgLoaded(true)}
              decoding="async"
              fetchPriority="low"
              className={`fixed inset-0 w-full h-full object-cover z-[-1] pointer-events-none transition-opacity duration-500 ${bgLoaded ? 'opacity-50' : 'opacity-0'}`}
            />
            <div aria-hidden="true" className="fixed inset-0 z-[-1] pointer-events-none bg-black/50" />
          </>
        )}
        {/* Light mode background */}
        {mode === 'light' && showTransparency && (
          <img
            src={resolveLightBg(lightBgChoice)}
            alt=""
            aria-hidden="true"
            onLoad={() => setBgLoaded(true)}
            decoding="async"
            fetchPriority="low"
            className={`fixed inset-0 w-full h-full object-cover z-[-1] pointer-events-none transition-opacity duration-500 ${bgLoaded ? 'opacity-50' : 'opacity-0'}`}
          />
        )}
        {onboarding?.step !== 'platform' && (
        <AppShell
        onboardingIntent={onboarding?.intent ?? null}
        onSetOnboarding={setOnboarding}
        activeTab={activeTab}
        isTabPending={isTabPending}
        pendingTab={pendingTab}
        onSelectTab={handleSelectTab}
        onOpenUpdateFlow={handleOpenUpdateFlow}
        onOpenPreferences={() => setPreferencesModalOpen(true)}
        calendarOpen={calendarOpen}
        onToggleCalendarOpen={toggleCalendarOpen}
        onCloseCalendar={() => setCalendarOpen(false)}
        hasActiveCalendarFilter={hasActiveCalendarFilter}
        onClearCalendarFilter={clearAllFilters}
        calendarEffectiveNow={calendarEffectiveNow}
        selectedDay={selectedDay}
        selectedRange={selectedRange}
        selectedWeeks={selectedWeeks}
        minDate={minDate}
        maxDate={maxDate}
        availableDatesSet={availableDatesSet}
        onSelectWeeks={calendarHandlers.onSelectWeeks}
        onSelectDay={calendarHandlers.onSelectDay}
        onSelectWeek={calendarHandlers.onSelectWeek}
        onSelectMonth={calendarHandlers.onSelectMonth}
        onSelectYear={calendarHandlers.onSelectYear}
        onClearCalendar={clearAllFilters}
        onApplyCalendar={calendarHandlers.onApplyCalendar}
        mainRef={mainRef}
        hasActiveFilters={hasActiveCalendarFilter}
        dailySummaries={dailySummaries}
        exerciseStats={exerciseStats}
        parsedData={parsedData}
        filteredData={filteredData}
        filterCacheKey={filterCacheKey}
        filtersSlot={desktopFilterControls}
        highlightedExercise={highlightedExercise}
        onHighlightApplied={clearHighlightedExercise}
        onDayClick={handleDayClick}
        onMuscleClick={handleMuscleClick}
        onExerciseClick={handleExerciseClick}
        onHistoryDayTitleClick={handleHistoryDayTitleClick}
        targetHistoryDate={targetHistoryDate}
        onTargetHistoryDateConsumed={handleTargetDateConsumed}
        initialMuscleForAnalysis={initialMuscleForAnalysis}
        initialWeeklySetsWindow={initialWeeklySetsWindow}
        onInitialMuscleConsumed={clearInitialMuscleForAnalysis}
        bodyMapGender={bodyMapGender}
        weightUnit={weightUnit}
        exerciseTrendMode={exerciseTrendMode}
        secondarySetMultiplier={secondarySetMultiplier}
        now={filteredEffectiveNow}
      />
        )}

      <UserPreferencesModal
        isOpen={preferencesModalOpen}
        onClose={() => setPreferencesModalOpen(false)}
        weightUnit={weightUnit}
        onWeightUnitChange={setWeightUnit}
        bodyMapGender={bodyMapGender}
        onBodyMapGenderChange={setBodyMapGender}
        themeMode={mode}
        onThemeModeChange={setMode}
        exerciseTrendMode={exerciseTrendMode}
        onExerciseTrendModeChange={setExerciseTrendMode}
        secondarySetMultiplier={secondarySetMultiplier}
        onSecondarySetMultiplierChange={setSecondarySetMultiplier}
        font={font}
        onFontChange={setFont}
        showTransparency={showTransparency}
        onShowTransparencyChange={setShowTransparency}
        darkBgChoice={darkBgChoice}
        onDarkBgChoiceChange={setDarkBgChoice}
        lightBgChoice={lightBgChoice}
        onLightBgChoiceChange={setLightBgChoice}
      />

      <BuyMeACoffeeModal
        isOpen={showBmcModal}
        onClose={(supporter) => {
          setShowBmcModal(false);
          if (supporter) {
            try { localStorage.setItem('bmc_supporter_cooldown', String(Date.now())); } catch {}
          }
          try { localStorage.removeItem('bmc_session_start'); } catch {}
        }}
      />

      <AppOnboardingLayer
        onboarding={onboarding}
        dataSource={dataSource}
        hasDashboardData={parsedData.length > 0}
        bodyMapGender={bodyMapGender}
        weightUnit={weightUnit}
        isAnalyzing={isAnalyzing}
        csvImportError={csvImportError}
        hevyLoginError={hevyLoginError}
        lyfatLoginError={lyfatLoginError}
        onSetOnboarding={(next) => setOnboarding(next)}
        onSetBodyMapGender={setBodyMapGender}
        onSetWeightUnit={setWeightUnit}
        onSetCsvImportError={clearCsvImportError}
        onSetHevyLoginError={clearHevyLoginError}
        onSetLyfatLoginError={clearLyfatLoginError}
        onClearCacheAndRestart={clearCacheAndRestart}
        onForceRefreshAndRelogin={forceRefreshAndRelogin}
        onProcessFile={processFile}
        onHevyLogin={handleHevyLogin}
        onHevyApiKeyLogin={handleHevyApiKeyLogin}
        onHevySyncSaved={handleHevySyncSaved}
        onLyfatLogin={handleLyfatLogin}
        onLyfatSyncSaved={handleLyfatSyncSaved}
      />

      <AnimatePresence>
        {(isAnalyzing || showColdStartOverlay) && (
          <AppLoadingOverlay open={isAnalyzing || showColdStartOverlay} isCompleting={isCompleting} />
        )}
      </AnimatePresence>
    </div>
    </ToastProvider>
  );
};

export default App;
