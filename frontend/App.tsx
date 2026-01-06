import React, { useState, useEffect, useMemo, Suspense, useRef, useCallback } from 'react';
import {
  parseWorkoutCSVAsyncWithUnit,
  ParseWorkoutCsvResult,
} from './utils/csv/csvParser';
import { getDailySummaries, getExerciseStats, identifyPersonalRecords } from './utils/analysis/analytics';
import { computationCache, getFilteredCacheKey } from './utils/storage/computationCache';
import { WorkoutSet } from './types';
import { BodyMapGender } from './components/BodyMap';
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const ExerciseView = React.lazy(() => import('./components/ExerciseView').then(m => ({ default: m.ExerciseView })));
const HistoryView = React.lazy(() => import('./components/HistoryView').then(m => ({ default: m.HistoryView })));
const MuscleAnalysis = React.lazy(() => import('./components/MuscleAnalysis').then(m => ({ default: m.MuscleAnalysis })));
const FlexView = React.lazy(() => import('./components/FlexView').then(m => ({ default: m.FlexView })));
import { CSVImportModal } from './components/CSVImportModal';
import {
  saveCSVData,
  getCSVData,
  clearCSVData,
  saveWeightUnit,
  getWeightUnit,
  clearWeightUnit,
  WeightUnit,
  getBodyMapGender,
  saveBodyMapGender,
  clearBodyMapGender,
  clearPreferencesConfirmed,
  getPreferencesConfirmed,
  savePreferencesConfirmed,
  clearThemeMode,
} from './utils/storage/localStorage';
import { LayoutDashboard, Dumbbell, History, CheckCircle2, X, Calendar, BicepsFlexed, Pencil, RefreshCw, Sparkles } from 'lucide-react';
import { format, isSameDay, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { CalendarSelector } from './components/CalendarSelector';
import { formatDayYearContraction, formatHumanReadableDate } from './utils/date/dateUtils';
import { trackPageView } from './utils/integrations/ga';
import { SupportLinks } from './components/SupportLinks';
import { ThemedBackground } from './components/ThemedBackground';
import { ThemeToggleButton } from './components/ThemeToggleButton';
import { CsvLoadingAnimation } from './components/CsvLoadingAnimation';
import { DataSourceModal } from './components/DataSourceModal';
import { LandingPage } from './components/LandingPage';
import { HevyLoginModal } from './components/HevyLoginModal';
import { LyfataLoginModal } from './components/LyfataLoginModal';
import type { DataSourceChoice } from './utils/dataSources/types';
import {
  getDataSourceChoice,
  saveDataSourceChoice,
  clearDataSourceChoice,
  getHevyAuthToken,
  saveHevyAuthToken,
  clearHevyAuthToken,
  getHevyProApiKey,
  saveHevyProApiKey,
  clearHevyProApiKey,
  getLyfataApiKey,
  saveLyfataApiKey,
  clearLyfataApiKey,
  getLastCsvPlatform,
  saveLastCsvPlatform,
  clearLastCsvPlatform,
  getSetupComplete,
  saveSetupComplete,
  clearSetupComplete,
} from './utils/storage/dataSourceStorage';
import { clearHevyCredentials, saveHevyPassword, saveHevyUsernameOrEmail } from './utils/storage/hevyCredentialsStorage';
import { hevyBackendGetAccount, hevyBackendGetSets, hevyBackendGetSetsWithProApiKey, hevyBackendLogin, hevyBackendValidateProApiKey } from './utils/api/hevyBackend';
import { lyfatBackendGetSets } from './utils/api/lyfataBackend';
import { parseHevyDateString } from './utils/date/parseHevyDateString';
import { useTheme } from './components/ThemeProvider';

enum Tab {
  DASHBOARD = 'dashboard',
  EXERCISES = 'exercises',
  HISTORY = 'history',
  MUSCLE_ANALYSIS = 'muscle-analysis',
  FLEX = 'flex'
}

type OnboardingIntent = 'initial' | 'update';
type OnboardingStep = 'platform' | 'strong_csv' | 'lyfta_csv' | 'other_csv' | 'lyfta_prefs' | 'lyfta_login' | 'hevy_prefs' | 'hevy_login' | 'hevy_csv';

type OnboardingFlow = {
  intent: OnboardingIntent;
  step: OnboardingStep;
  platform?: DataSourceChoice;
  backStep?: OnboardingStep;
};


const App: React.FC = () => {
  const { mode } = useTheme();
  const [parsedData, setParsedData] = useState<WorkoutSet[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [onboarding, setOnboarding] = useState<OnboardingFlow | null>(() => {
    return getSetupComplete() ? null : { intent: 'initial', step: 'platform' };
  });
  const [dataSource, setDataSource] = useState<DataSourceChoice | null>(() => getDataSourceChoice());
  const [hevyLoginError, setHevyLoginError] = useState<string | null>(null);
  const [lyfatLoginError, setLyfatLoginError] = useState<string | null>(null);
  const [csvImportError, setCsvImportError] = useState<string | null>(null);
  const [highlightedExercise, setHighlightedExercise] = useState<string | null>(null);
  const [initialMuscleForAnalysis, setInitialMuscleForAnalysis] = useState<{ muscleId: string; viewMode: 'muscle' | 'group' } | null>(null);
  const [initialWeeklySetsWindow, setInitialWeeklySetsWindow] = useState<'all' | '7d' | '30d' | '365d' | null>(null);
  const [loadingKind, setLoadingKind] = useState<'hevy' | 'lyfta' | 'csv' | null>(null);

  // Loading State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0); // 0: Load, 1: Analyze, 2: Visualize
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<number | null>(null);

  const mainRef = useRef<HTMLElement | null>(null);
  const activeTabRef = useRef<Tab>(activeTab);
  const tabScrollPositionsRef = useRef<Record<string, number>>({});
  const pendingNavRef = useRef<{ tab: Tab; kind: 'top' | 'deep' } | null>(null);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);


  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const onScroll = () => {
      tabScrollPositionsRef.current[activeTabRef.current] = el.scrollTop;
    };

    el.addEventListener('scroll', onScroll, { passive: true } as any);
    return () => el.removeEventListener('scroll', onScroll as any);
  }, []);

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error && err.message) return err.message;
    return 'Failed to import CSV. Please export your workout data from the Hevy app and try again.';
  };

  const getHevyErrorMessage = (err: unknown): string => {
    if (err instanceof Error && err.message) {
      const msg = err.message;
      // "Load failed" is a Safari-specific error, often caused by content blockers, VPNs, or network issues
      if (msg.toLowerCase().includes('load failed') || msg.toLowerCase().includes('failed to fetch')) {
        return `Network error: ${msg}. This is often caused by content blockers, VPNs,  or network issues. Try disabling ad blockers or switching browsers.`;
      }
      return msg;
    }
    return 'Failed to fetch Hevy data. Please try again.';
  };

  const getLyfatErrorMessage = (err: unknown): string => {
    if (err instanceof Error && err.message) {
      const msg = err.message;
      if (msg.toLowerCase().includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid')) {
        return 'Invalid API key. Please check your Lyfta API key and try again.';
      }
      if (msg.toLowerCase().includes('load failed') || msg.toLowerCase().includes('failed to fetch')) {
        return `Network error: ${msg}. This is often caused by content blockers, VPNs, or network issues. Try disabling ad blockers or switching browsers.`;
      }
      return msg;
    }
    return 'Failed to fetch Lyfta data. Please try again.';
  };

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const pending = pendingNavRef.current;
    if (!pending || pending.tab !== activeTab) return;

    if (pending.kind === 'top') {
      const targetTop = tabScrollPositionsRef.current[activeTab] ?? 0;
      requestAnimationFrame(() => {
        if (!mainRef.current) return;
        mainRef.current.scrollTop = targetTop;
      });
    } else {
      tabScrollPositionsRef.current[activeTab] = 0;
      requestAnimationFrame(() => {
        if (!mainRef.current) return;
        mainRef.current.scrollTop = 0;
      });
    }

    pendingNavRef.current = null;
  }, [activeTab]);

  const navigateToTab = useCallback((tab: Tab, kind: 'top' | 'deep') => {
    const el = mainRef.current;
    if (el) {
      tabScrollPositionsRef.current[activeTabRef.current] = el.scrollTop;
    }
    pendingNavRef.current = { tab, kind };
    setActiveTab(tab);
  }, []);

  const clearCacheAndRestart = useCallback(() => {
    clearCSVData();
    clearHevyAuthToken();
    clearHevyProApiKey();
    clearHevyCredentials();
    clearLyfataApiKey();
    clearDataSourceChoice();
    clearLastCsvPlatform();
    clearSetupComplete();
    clearWeightUnit();
    clearBodyMapGender();
    clearPreferencesConfirmed();
    clearThemeMode();
    computationCache.clear();
    window.location.reload();
  }, []);

  // Gender state with localStorage persistence
  const [bodyMapGender, setBodyMapGender] = useState<BodyMapGender>(() => getBodyMapGender());

  // Persist gender to localStorage when it changes
  useEffect(() => {
    saveBodyMapGender(bodyMapGender);
  }, [bodyMapGender]);

  // Weight unit state with localStorage persistence
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(() => getWeightUnit());

  // Persist weight unit to localStorage when it changes
  useEffect(() => {
    saveWeightUnit(weightUnit);
  }, [weightUnit]);

  // Handler for navigating to ExerciseView from MuscleAnalysis
  const handleExerciseClick = (exerciseName: string) => {
    setHighlightedExercise(exerciseName);
    navigateToTab(Tab.EXERCISES, 'deep');
  };

  // Handler for navigating to MuscleAnalysis from Dashboard heatmap
  const handleMuscleClick = (muscleId: string, viewMode: 'muscle' | 'group', weeklySetsWindow: 'all' | '7d' | '30d' | '365d') => {
    setInitialMuscleForAnalysis({ muscleId, viewMode });
    setInitialWeeklySetsWindow(weeklySetsWindow);
    navigateToTab(Tab.MUSCLE_ANALYSIS, 'deep');
  };

  const startProgress = () => {
    setProgress(0);
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    const start = Date.now();
    const t = window.setInterval(() => {
      setProgress(prev => Math.min(90, Math.round(prev + Math.max(1, (90 - prev) * 0.05))));
    }, 100);
    progressTimerRef.current = t;
    return start;
  };

  const finishProgress = (startedAt: number) => {
    const MIN_MS = 1200;
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, MIN_MS - elapsed);
    window.setTimeout(() => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setProgress(100);
      setTimeout(() => {
        setIsAnalyzing(false);
        setLoadingKind(null);
        setProgress(0);
      }, 200);
    }, remaining);
  };

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState<Array<{ start: Date; end: Date }>>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [targetHistoryDate, setTargetHistoryDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!getSetupComplete()) return;

    // Backwards compatibility: older setups predate the preferences-confirmed flag.
    // Keep existing users unblocked, but require explicit confirmation for new setups.
    if (!getPreferencesConfirmed()) {
      savePreferencesConfirmed(true);
    }

    const storedChoice = getDataSourceChoice();
    if (!storedChoice) {
      saveSetupComplete(false);
      setOnboarding({ intent: 'initial', step: 'platform' });
      return;
    }

    setDataSource(storedChoice);

    if (storedChoice === 'strong') {
      const storedCSV = getCSVData();
      const lastPlatform = getLastCsvPlatform();
      if (!storedCSV || lastPlatform !== 'strong') {
        saveSetupComplete(false);
        setOnboarding({ intent: 'initial', step: 'platform' });
        return;
      }

      setLoadingKind('csv');
      setIsAnalyzing(true);
      setLoadingStep(0);
      const startedAt = startProgress();
      setTimeout(() => {
        setLoadingStep(1);
        parseWorkoutCSVAsyncWithUnit(storedCSV, { unit: getWeightUnit() })
          .then((result: ParseWorkoutCsvResult) => {
            setLoadingStep(2);
            const enriched = identifyPersonalRecords(result.sets);
            setParsedData(enriched);
            setHevyLoginError(null);
            setCsvImportError(null);
          })
          .catch((err) => {
            clearCSVData();
            saveSetupComplete(false);
            setCsvImportError(getErrorMessage(err));
            setOnboarding({ intent: 'initial', step: 'platform' });
          })
          .finally(() => {
            finishProgress(startedAt);
          });
      }, 0);
      return;
    }

    if (storedChoice === 'lyfta') {
      const storedCSV = getCSVData();
      const lastPlatform = getLastCsvPlatform();
      if (!storedCSV || lastPlatform !== 'lyfta') {
        saveSetupComplete(false);
        setOnboarding({ intent: 'initial', step: 'platform' });
        return;
      }

      setLoadingKind('csv');
      setIsAnalyzing(true);
      setLoadingStep(0);
      const startedAt = startProgress();
      setTimeout(() => {
        setLoadingStep(1);
        parseWorkoutCSVAsyncWithUnit(storedCSV, { unit: getWeightUnit() })
          .then((result: ParseWorkoutCsvResult) => {
            setLoadingStep(2);
            const enriched = identifyPersonalRecords(result.sets);
            setParsedData(enriched);
            setHevyLoginError(null);
            setCsvImportError(null);
          })
          .catch((err) => {
            clearCSVData();
            saveSetupComplete(false);
            setCsvImportError(getErrorMessage(err));
            setOnboarding({ intent: 'initial', step: 'platform' });
          })
          .finally(() => {
            finishProgress(startedAt);
          });
      }, 0);
      return;
    }

    const storedCSV = getCSVData();
    const lastPlatform = getLastCsvPlatform();
    if (storedCSV && lastPlatform === 'hevy') {
      setLoadingKind('csv');
      setIsAnalyzing(true);
      setLoadingStep(0);
      const startedAt = startProgress();
      setTimeout(() => {
        setLoadingStep(1);
        parseWorkoutCSVAsyncWithUnit(storedCSV, { unit: getWeightUnit() })
          .then((result: ParseWorkoutCsvResult) => {
            setLoadingStep(2);
            const enriched = identifyPersonalRecords(result.sets);
            setParsedData(enriched);
            setHevyLoginError(null);
            setCsvImportError(null);
          })
          .catch((err) => {
            clearCSVData();
            saveSetupComplete(false);
            setCsvImportError(getErrorMessage(err));
            setOnboarding({ intent: 'initial', step: 'platform' });
          })
          .finally(() => {
            finishProgress(startedAt);
          });
      }, 0);
      return;
    }

    // Check for Lyfta API key
    const lyfatApiKey = getLyfataApiKey();
    if (lyfatApiKey) {
      setLoadingKind('lyfta');
      setIsAnalyzing(true);
      setLoadingStep(0);
      const startedAt = startProgress();
      Promise.resolve()
        .then(() => {
          setLoadingStep(1);
          return lyfatBackendGetSets<WorkoutSet>(lyfatApiKey);
        })
        .then((resp) => {
          setLoadingStep(2);
          const hydrated = (resp.sets ?? []).map((s) => ({
            ...s,
            parsedDate: parseHevyDateString(String(s.start_time ?? '')),
          }));
          const enriched = identifyPersonalRecords(hydrated);
          setParsedData(enriched);
          setLyfatLoginError(null);
          setCsvImportError(null);
        })
        .catch((err) => {
          clearLyfataApiKey();
          saveSetupComplete(false);
          setLyfatLoginError(getHevyErrorMessage(err));
          setOnboarding({ intent: 'initial', step: 'platform' });
        })
        .finally(() => {
          finishProgress(startedAt);
        });
      return;
    }

    // Check for Hevy Pro API key
    const hevyProApiKey = getHevyProApiKey();
    if (storedChoice === 'hevy' && hevyProApiKey) {
      setLoadingKind('hevy');
      setIsAnalyzing(true);
      setLoadingStep(0);
      const startedAt = startProgress();
      Promise.resolve()
        .then(() => {
          setLoadingStep(1);
          return hevyBackendGetSetsWithProApiKey<WorkoutSet>(hevyProApiKey);
        })
        .then((resp) => {
          setLoadingStep(2);
          const hydrated = (resp.sets ?? []).map((s) => ({
            ...s,
            parsedDate: parseHevyDateString(String(s.start_time ?? '')),
          }));
          const enriched = identifyPersonalRecords(hydrated);
          setParsedData(enriched);
          setHevyLoginError(null);
          setCsvImportError(null);
        })
        .catch((err) => {
          clearHevyProApiKey();
          saveSetupComplete(false);
          setHevyLoginError(getHevyErrorMessage(err));
          setOnboarding({ intent: 'initial', step: 'platform' });
        })
        .finally(() => {
          finishProgress(startedAt);
        });
      return;
    }

    const token = getHevyAuthToken();
    if (!token) {
      saveSetupComplete(false);
      setOnboarding({ intent: 'initial', step: 'platform' });
      return;
    }

    setLoadingKind('hevy');
    setIsAnalyzing(true);
    setLoadingStep(0);
    const startedAt = startProgress();
    Promise.resolve()
      .then(() => hevyBackendGetAccount(token))
      .then(({ username }) => {
        setLoadingStep(1);
        return hevyBackendGetSets<WorkoutSet>(token, username);
      })
      .then((resp) => {
        setLoadingStep(2);
        const hydrated = (resp.sets ?? []).map((s) => ({
          ...s,
          parsedDate: parseHevyDateString(String(s.start_time ?? '')),
        }));
        const enriched = identifyPersonalRecords(hydrated);
        setParsedData(enriched);
        setHevyLoginError(null);
        setCsvImportError(null);
      })
      .catch((err) => {
        clearHevyAuthToken();
        saveSetupComplete(false);
        setHevyLoginError(getHevyErrorMessage(err));
        setOnboarding({ intent: 'initial', step: 'platform' });
      })
      .finally(() => {
        finishProgress(startedAt);
      });
  }, []);

  useEffect(() => {
    if (!dataSource) return;
    saveDataSourceChoice(dataSource);
  }, [dataSource]);

  // Prefetch heavy views and preload exercise assets to avoid first-time lag
  useEffect(() => {
    const idle = (cb: () => void) => (('requestIdleCallback' in window) ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 300));
    idle(() => {
      // Preload components
      import('./components/ExerciseView');
      import('./components/HistoryView');
      import('./components/MuscleAnalysis');
      import('./components/FlexView');
    });
  }, []);

  // Track "page" views when switching tabs (simple SPA routing)
  useEffect(() => {
    trackPageView(`/${activeTab}`);
  }, [activeTab]);

  // Derive unique months for filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    parsedData.forEach(d => {
      if (d.parsedDate) {
        months.add(format(d.parsedDate, 'yyyy-MM'));
      }
    });
    return Array.from(months).sort().reverse(); // Descending order
  }, [parsedData]);

  // Apply filters
  const filteredData = useMemo(() => {
    return parsedData.filter(d => {
      if (!d.parsedDate) return false;
      if (selectedDay) return isSameDay(d.parsedDate, selectedDay);
      if (selectedWeeks.length > 0) {
        return selectedWeeks.some(r => isWithinInterval(d.parsedDate as Date, {
          start: startOfDay(r.start),
          end: endOfDay(r.end),
        }));
      }
      if (selectedRange) {
        return isWithinInterval(d.parsedDate as Date, {
          start: startOfDay(selectedRange.start),
          end: endOfDay(selectedRange.end),
        });
      }
      if (selectedMonth !== 'all') return format(d.parsedDate, 'yyyy-MM') === selectedMonth;
      return true;
    });
  }, [parsedData, selectedMonth, selectedDay, selectedRange, selectedWeeks]);

  const effectiveNow = useMemo(() => {
    let maxTs = -Infinity;
    for (const s of parsedData) {
      const ts = s.parsedDate?.getTime?.() ?? NaN;
      if (Number.isFinite(ts) && ts > maxTs) maxTs = ts;
    }
    return Number.isFinite(maxTs) ? new Date(maxTs) : new Date(0);
  }, [parsedData]);

  // Calendar boundaries and available dates (for blur/disable)
  const { minDate, maxDate, availableDatesSet } = useMemo(() => {
    let minTs = Number.POSITIVE_INFINITY;
    let maxTs = 0;
    const set = new Set<string>();
    parsedData.forEach(d => {
      if (!d.parsedDate) return;
      const ts = d.parsedDate.getTime();
      if (ts < minTs) minTs = ts;
      if (ts > maxTs) maxTs = ts;
      set.add(format(d.parsedDate, 'yyyy-MM-dd'));
    });
    const today = new Date(0);
    const minDate = isFinite(minTs) ? startOfDay(new Date(minTs)) : null;
    const maxInData = maxTs > 0 ? endOfDay(new Date(maxTs)) : null;
    const maxDate = maxInData ?? endOfDay(today);
    return { minDate, maxDate, availableDatesSet: set };
  }, [parsedData]);

  // Cache key for filter-dependent computations
  const filterCacheKey = useMemo(() => getFilteredCacheKey('filter', {
    month: selectedMonth,
    day: selectedDay,
    range: selectedRange,
    weeks: selectedWeeks,
  }), [selectedMonth, selectedDay, selectedRange, selectedWeeks]);

  // Use computation cache for expensive analytics - persists across tab switches
  const dailySummaries = useMemo(() => {
    const cacheKey = `dailySummaries:${filterCacheKey}`;
    return computationCache.getOrCompute(
      cacheKey,
      filteredData,
      () => getDailySummaries(filteredData),
      { ttl: 10 * 60 * 1000 } // 10 minute TTL
    );
  }, [filteredData, filterCacheKey]);

  const exerciseStats = useMemo(() => {
    const cacheKey = `exerciseStats:${filterCacheKey}`;
    return computationCache.getOrCompute(
      cacheKey,
      filteredData,
      () => getExerciseStats(filteredData),
      { ttl: 10 * 60 * 1000 }
    );
  }, [filteredData, filterCacheKey]);

  const hasActiveCalendarFilter = !!selectedDay || selectedWeeks.length > 0 || !!selectedRange;

  const calendarSummaryText = useMemo(() => {
    if (selectedDay) return formatHumanReadableDate(selectedDay, { now: effectiveNow });
    if (selectedRange) return `${formatDayYearContraction(selectedRange.start)} – ${formatDayYearContraction(selectedRange.end)}`;
    if (selectedWeeks.length === 1) return `${formatDayYearContraction(selectedWeeks[0].start)} – ${formatDayYearContraction(selectedWeeks[0].end)}`;
    if (selectedWeeks.length > 1) return `Weeks: ${selectedWeeks.length}`;
    return 'No filter';
  }, [effectiveNow, selectedDay, selectedRange, selectedWeeks]);

  const filterControls = (
    <div
      className={`relative flex items-center gap-2 rounded-lg px-3 py-2 h-10 shadow-sm transition-all duration-300 ${
        hasActiveCalendarFilter
          ? 'bg-black/70 border border-slate-600/60 ring-2 ring-white/10'
          : 'bg-black/70 border border-slate-700/50'
      }`}
    >
      <div className="flex-1 min-w-0 overflow-x-auto">
        <div className="flex items-center gap-2 flex-nowrap min-w-max">
          {hasActiveCalendarFilter ? (
            <button
              type="button"
              onClick={() => setCalendarOpen(true)}
              className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md bg-black/50 hover:bg-white/5 border border-slate-700/50 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap"
              title={calendarSummaryText}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300/80" />
              <span className="max-w-[220px] truncate">{calendarSummaryText}</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 whitespace-nowrap">No filter</span>
          )}
        </div>
      </div>

      {hasActiveCalendarFilter ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-black/50 hover:bg-white/5 border border-slate-700/50 text-slate-200 transition-colors"
            title="Edit filter"
            aria-label="Edit filter"
          >
            <Pencil className="w-4 h-4 text-slate-300" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRange(null);
              setSelectedDay(null);
              setSelectedWeeks([]);
            }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-black/50 hover:bg-white/5 border border-slate-700/50 text-slate-200 transition-colors"
            title="Clear filter"
            aria-label="Clear filter"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCalendarOpen(!calendarOpen)}
          className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-black/50 hover:bg-white/5 border border-slate-700/50 text-xs font-semibold text-slate-200 whitespace-nowrap transition-colors"
        >
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Calendar</span>
        </button>
      )}
    </div>
  );

  const desktopFilterControls = (
    <div className="hidden sm:block">
      {filterControls}
    </div>
  );

  // Handler for heatmap click
  const handleDayClick = (date: Date) => {
    setTargetHistoryDate(date);
    navigateToTab(Tab.HISTORY, 'deep');
  };

  const handleTargetDateConsumed = () => {
    setTargetHistoryDate(null);
  };

  const handleHistoryDayTitleClick = (date: Date) => {
    setSelectedDay(date);
    setSelectedRange(null);
    setSelectedWeeks([]);
    setSelectedMonth('all');
    navigateToTab(Tab.MUSCLE_ANALYSIS, 'deep');
  };

  const handleOpenUpdateFlow = () => {
    setCsvImportError(null);
    setHevyLoginError(null);
    setLyfatLoginError(null);
    if (dataSource === 'strong') {
      setOnboarding({ intent: 'update', step: 'strong_csv', platform: 'strong' });
      return;
    }
    if (dataSource === 'lyfta') {
      if (!getPreferencesConfirmed()) {
        setOnboarding({ intent: 'update', step: 'lyfta_prefs', platform: 'lyfta' });
        return;
      }
      setOnboarding({ intent: 'update', step: 'lyfta_login', platform: 'lyfta' });
      return;
    }
    if (dataSource === 'hevy') {
      if (!getPreferencesConfirmed()) {
        setOnboarding({ intent: 'update', step: 'hevy_prefs', platform: 'hevy' });
        return;
      }
      setOnboarding({ intent: 'update', step: 'hevy_login', platform: 'hevy' });
      return;
    }
    setOnboarding({ intent: 'update', step: 'platform' });
  };

  const handleHevySyncSaved = () => {
    const savedProKey = getHevyProApiKey();
    if (savedProKey) {
      setHevyLoginError(null);
      setLoadingKind('hevy');
      setIsAnalyzing(true);
      setLoadingStep(0);
      const startedAt = startProgress();

      Promise.resolve()
        .then(() => {
          setLoadingStep(1);
          return hevyBackendGetSetsWithProApiKey<WorkoutSet>(savedProKey);
        })
        .then((resp) => {
          setLoadingStep(2);
          const hydrated = (resp.sets ?? []).map((s) => ({
            ...s,
            parsedDate: parseHevyDateString(String(s.start_time ?? '')),
          }));
          const enriched = identifyPersonalRecords(hydrated);
          setParsedData(enriched);
          setDataSource('hevy');
          saveSetupComplete(true);
          setOnboarding(null);
        })
        .catch((err) => {
          clearHevyProApiKey();
          setHevyLoginError(getHevyErrorMessage(err));
        })
        .finally(() => {
          finishProgress(startedAt);
        });
      return;
    }

    const token = getHevyAuthToken();
    if (!token) return;

    setHevyLoginError(null);
    setLoadingKind('hevy');
    setIsAnalyzing(true);
    setLoadingStep(0);
    const startedAt = startProgress();

    hevyBackendGetAccount(token)
      .then(({ username }) => {
        setLoadingStep(1);
        return hevyBackendGetSets<WorkoutSet>(token, username);
      })
      .then((resp) => {
        setLoadingStep(2);
        const hydrated = (resp.sets ?? []).map((s) => ({
          ...s,
          parsedDate: parseHevyDateString(String(s.start_time ?? '')),
        }));
        const enriched = identifyPersonalRecords(hydrated);
        setParsedData(enriched);
        setDataSource('hevy');
        saveSetupComplete(true);
        setOnboarding(null);
      })
      .catch((err) => {
        clearHevyAuthToken();
        setHevyLoginError(getHevyErrorMessage(err));
      })
      .finally(() => {
        finishProgress(startedAt);
      });
  };

  const handleHevyApiKeyLogin = (apiKey: string) => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setHevyLoginError('Missing API key.');
      return;
    }

    setHevyLoginError(null);
    setLoadingKind('hevy');
    setIsAnalyzing(true);
    setLoadingStep(0);
    const startedAt = startProgress();

    Promise.resolve()
      .then(() => hevyBackendValidateProApiKey(trimmed))
      .then((valid) => {
        if (!valid) throw new Error('Invalid API key. Please check your Hevy Pro API key and try again.');
        saveHevyProApiKey(trimmed);
        setLoadingStep(1);
        return hevyBackendGetSetsWithProApiKey<WorkoutSet>(trimmed);
      })
      .then((resp) => {
        setLoadingStep(2);
        const hydrated = (resp.sets ?? []).map((s) => ({
          ...s,
          parsedDate: parseHevyDateString(String(s.start_time ?? '')),
        }));
        const enriched = identifyPersonalRecords(hydrated);
        setParsedData(enriched);
        setDataSource('hevy');
        saveSetupComplete(true);
        setOnboarding(null);
      })
      .catch((err) => {
        clearHevyProApiKey();
        setHevyLoginError(getHevyErrorMessage(err));
      })
      .finally(() => {
        finishProgress(startedAt);
      });
  };

  const handleHevyLogin = (emailOrUsername: string, password: string) => {
    setHevyLoginError(null);
    setLoadingKind('hevy');
    setIsAnalyzing(true);
    setLoadingStep(0);
    const startedAt = startProgress();

    hevyBackendLogin(emailOrUsername, password)
      .then((r) => {
        if (!r.auth_token) throw new Error('Missing auth token');
        saveHevyAuthToken(r.auth_token);
        const trimmed = emailOrUsername.trim();
        saveHevyUsernameOrEmail(trimmed);
        return Promise.all([
          saveHevyPassword(password).catch(() => {
          }),
          hevyBackendGetAccount(r.auth_token),
        ]).then(([, { username }]) => ({ token: r.auth_token, username }));
      })
      .then(({ token, username }) => {
        setLoadingStep(1);
        return hevyBackendGetSets<WorkoutSet>(token, username);
      })
      .then((resp) => {
        setLoadingStep(2);
        const hydrated = (resp.sets ?? []).map((s) => ({
          ...s,
          parsedDate: parseHevyDateString(String(s.start_time ?? '')),
        }));
        const enriched = identifyPersonalRecords(hydrated);
        setParsedData(enriched);
        setDataSource('hevy');
        saveSetupComplete(true);
        setOnboarding(null);
      })
      .catch((err) => {
        setHevyLoginError(getHevyErrorMessage(err));
      })
      .finally(() => {
        finishProgress(startedAt);
      });
  };

  const handleLyfatSyncSaved = () => {
    const apiKey = getLyfataApiKey();
    if (!apiKey) return;

    setLyfatLoginError(null);
    setLoadingKind('lyfta');
    setIsAnalyzing(true);
    setLoadingStep(0);
    const startedAt = startProgress();

    lyfatBackendGetSets<WorkoutSet>(apiKey)
      .then((resp) => {
        setLoadingStep(2);
        const hydrated = (resp.sets ?? []).map((s) => ({
          ...s,
          parsedDate: parseHevyDateString(String(s.start_time ?? '')),
        }));
        const enriched = identifyPersonalRecords(hydrated);
        setParsedData(enriched);
        setDataSource('lyfta');
        saveSetupComplete(true);
        setOnboarding(null);
      })
      .catch((err) => {
        clearLyfataApiKey();
        setLyfatLoginError(getLyfatErrorMessage(err));
      })
      .finally(() => {
        finishProgress(startedAt);
      });
  };

  const handleLyfatLogin = (apiKey: string) => {
    setLyfatLoginError(null);
    setLoadingKind('lyfta');
    setIsAnalyzing(true);
    setLoadingStep(0);
    const startedAt = startProgress();

    lyfatBackendGetSets<WorkoutSet>(apiKey)
      .then((resp) => {
        setLoadingStep(2);
        saveLyfataApiKey(apiKey);
        const hydrated = (resp.sets ?? []).map((s) => ({
          ...s,
          parsedDate: parseHevyDateString(String(s.start_time ?? '')),
        }));
        const enriched = identifyPersonalRecords(hydrated);
        setParsedData(enriched);
        setDataSource('lyfta');
        saveSetupComplete(true);
        setOnboarding(null);
      })
      .catch((err) => {
        setLyfatLoginError(getLyfatErrorMessage(err));
      })
      .finally(() => {
        finishProgress(startedAt);
      });
  };

  const processFile = (file: File, platform: DataSourceChoice, unitOverride?: WeightUnit) => {
    setLoadingKind('csv');
    setIsAnalyzing(true);
    setLoadingStep(0);
    const startedAt = startProgress();

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setCsvImportError(null);
        setLoadingStep(1);
        const unit = unitOverride ?? weightUnit;
        parseWorkoutCSVAsyncWithUnit(text, { unit })
          .then((result: ParseWorkoutCsvResult) => {
            setLoadingStep(2);
            const enriched = identifyPersonalRecords(result.sets);
            setParsedData(enriched);
            saveCSVData(text);
            saveLastCsvPlatform(platform);
            setDataSource(platform);
            saveSetupComplete(true);
            setOnboarding(null);
          })
          .catch((err) => {
            setCsvImportError(getErrorMessage(err));
          })
          .finally(() => {
            setSelectedMonth('all');
            setSelectedDay(null);
            finishProgress(startedAt);
          });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="flex flex-col h-screen bg-transparent text-[color:var(--app-fg)] font-sans"
      style={{ background: mode === 'svg' ? 'transparent' : 'var(--app-bg)' }}
    >
      <ThemedBackground />

      {onboarding?.intent === 'initial' ? null : (
        <>
          {/* Top Header Navigation */}
          <header className="bg-black/70 border-b border-slate-700/50 flex-shrink-0">
            <div className="px-2 sm:px-3 py-1.5 flex flex-col gap-2">
              {/* Top Row: Logo and Nav Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <img src="/UI/logo.svg" alt="LiftShift Logo" className="w-6 h-6 sm:w-7 sm:h-7" decoding="async" />
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="font-bold text-base sm:text-lg tracking-tight inline-flex items-start whitespace-nowrap"
                      style={{ color: 'var(--app-fg)' }}
                    >
                      <span>LiftShift</span>
                      <sup className="ml-1 inline-block rounded-full border border-amber-500/30 bg-amber-500/15 px-1 py-0.5 text-[8px] sm:text-[9px] font-semibold leading-none tracking-wide text-amber-400 align-super -translate-y-0.5 -translate-x-2">
                        BETA
                      </sup>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2  min-w-0">
                  {/* Desktop: right-aligned support buttons, Update pinned as rightmost */}
                  <div className="hidden md:block">
                    <SupportLinks
                      variant="primary"
                      layout="header"
                      primaryRightSlot={(
                        <div className="flex items-center gap-2">
                          <ThemeToggleButton />
                          <button
                            type="button"
                            onClick={handleOpenUpdateFlow}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-2.5 py-1 bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200 gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span>Update Data</span>
                          </button>
                        </div>
                      )}
                    />
                  </div>

                  {/* Mobile: keep Update action */}
                  <div className="md:hidden">
                    <div className="flex items-center gap-2">
                      <ThemeToggleButton compact={true} />
                      <button
                        type="button"
                        onClick={handleOpenUpdateFlow}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 py-1.5 bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200 gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">Update Data</span>
                        <span className="sm:hidden">Update</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Second Row: Navigation */}
              <nav className="grid grid-cols-6 gap-1 pt-0.5 sm:grid sm:grid-cols-5 sm:gap-2">
                <button 
                  onClick={() => {
                    setHighlightedExercise(null);
                    setInitialMuscleForAnalysis(null);
                    navigateToTab(Tab.DASHBOARD, 'top');
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border transition-all duration-200 ${activeTab === Tab.DASHBOARD ? 'bg-white/10 border-slate-600/70 text-white ring-2 ring-white/25 shadow-sm' : 'bg-transparent border-black/70 text-slate-400 hover:border-white hover:text-white hover:bg-white/5'}`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Dashboard</span>
                </button>
                <button 
                  onClick={() => {
                    setHighlightedExercise(null);
                    setInitialMuscleForAnalysis(null);
                    navigateToTab(Tab.MUSCLE_ANALYSIS, 'top');
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border transition-all duration-200 ${activeTab === Tab.MUSCLE_ANALYSIS ? 'bg-white/10 border-slate-600/70 text-white ring-2 ring-white/25 shadow-sm' : 'bg-transparent border-black/70 text-slate-400 hover:border-white hover:text-white hover:bg-white/5'}`}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 195.989 195.989"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    paintOrder="stroke fill"
                  >
                    <path d="M195.935,84.745c-2.07-15.789-20.983-37.722-20.983-37.722c-4.933-12.69-17.677-8.47-17.677-8.47l-8.507,2.295 c-8.421,2.533-8.025,13.555-4.372,15.789c1.602,0.978,6.297,1.233,7.685,0c0.414-0.374,0.098-2.165,0.098-2.165 c8.933,0.487,9.584-4.688,9.584-4.688l3.039-0.606c3.044-1.665,3.72,5.395,3.72,5.395c-2.07,20.009,6.595,27.334,6.595,27.334 c-1.254,3.973-5.62,3.206-5.62,3.206c-13.853-7.197-24.131,6.403-24.131,6.403c-7.831-6.671-23.991,5.148-23.991,5.148 c-9.055,1.79-9.591-9.106-9.591-9.106s-0.42-6.941-0.713-7.578c-0.426-1.084,1.925-0.536,1.925-0.536 c7.965-14.495,0-12.559,0-12.559c1.93-25.008-19.991-19.759-19.991-19.759C76.143,51.748,82.32,68.544,82.32,68.544 c-3.702-0.904-1.927,4.616-1.927,4.616c0.956,8.473,3.985,6.552,3.985,6.552c0.393,2.968,2.058,7.054,2.058,7.054l0.256,6.808 c-1.903,11.298-13.829,1.927-13.829,1.927c-6.996-9.864-24.536-4.348-24.536-4.348c-9.061-13.479-23.333-5.785-23.333-5.785 c1.516-3.349-0.256-20.009-0.256-20.009c1.772-2.058,5.331-13.712,5.331-13.712c1.522,2.058,8.388,2.42,8.388,2.42 c0.524,3.093,2.731,4.351,2.731,4.351c4.665,1.934,2.731-13.335,2.731-13.335c1.221-4.847-6.573-6.013-6.573-6.013 c-13.594-3.739-16.742,4.847-16.742,4.847l-3.547,7.712c-5.063,5.52-14.565,24.368-14.565,24.368 C-2.977,90.999,2.26,93.705,2.26,93.705l9.864,7.667c16.736,16.203,26.85,13.877,26.85,13.877 c13.46-0.256,12.352,8.458,12.352,8.458c0.536,13.342,9.852,27.182,9.852,27.182c0.685,2.326,1.172,4.786,1.656,7.222h63.811 c1.182-2.636,2.412-5.097,3.508-6.625c5.225-7.38,12.361-16.952,14.991-23.297c5.151-12.477,7.594-12.185,7.594-12.185 c18.383,0,28.527-13.329,28.527-13.329c3.014-3.86,7.593-8.616,10.948-10.522C196.726,89.571,195.935,84.745,195.935,84.745z"/>
                  </svg>
                  <span className="hidden sm:inline font-medium">Muscle</span>
                </button>
                <button 
                  onClick={() => {
                    setHighlightedExercise(null);
                    setInitialMuscleForAnalysis(null);
                    navigateToTab(Tab.EXERCISES, 'top');
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border transition-all duration-200 ${activeTab === Tab.EXERCISES ? 'bg-white/10 border-slate-600/70 text-white ring-2 ring-white/25 shadow-sm' : 'bg-transparent border-black/70 text-slate-400 hover:border-white hover:text-white hover:bg-white/5'}`}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3.43125 14.704L14.2387 16.055C14.8568 16.1322 15.3208 16.6578 15.3208 17.2805C15.3208 18.0233 14.6694 18.5985 13.9325 18.5063L3.12502 17.1554C2.50697 17.0782 2.04297 16.5526 2.04297 15.9299C2.04297 15.187 2.69401 14.6119 3.43125 14.704Z" />
                    <path d="M3.70312 17.2275V21.9992" />
                    <path d="M13.6602 18.4727V21.9995" />
                    <path d="M2.15625 12.7135C2.15625 11.5676 3.08519 10.6387 4.23105 10.6387C5.3769 10.6387 6.30584 11.5676 6.30584 12.7135C6.30584 13.8593 5.3769 14.7883 4.23105 14.7883C3.08519 14.7883 2.15625 13.8593 2.15625 12.7135Z" />
                    <path d="M11.5858 9.25226V13.2867V12.3792L18.1186 13.1958C19.3644 13.3514 20.2995 14.4108 20.2995 15.6662V20.7556C20.2995 21.4431 19.7422 22.0004 19.0547 22.0004C18.3673 22.0004 17.8099 21.4431 17.8099 20.7556V16.5024L7.64535 15.2317C6.81475 15.1278 6.19141 14.422 6.19141 13.5848C6.19141 12.5865 7.0662 11.8141 8.05707 11.938L9.09618 12.0677V9.25195" />
                    <path d="M6.60547 5.73445C6.60547 3.6721 8.27757 2 10.3399 2C12.4023 2 14.0744 3.6721 14.0744 5.73445C14.0744 7.7968 12.4023 9.46889 10.3399 9.46889C8.27757 9.46889 6.60547 7.7968 6.60547 5.73445Z" />
                    <path d="M9.09766 5.73407C9.09766 5.04662 9.65502 4.48926 10.3425 4.48926C11.0299 4.48926 11.5873 5.04662 11.5873 5.73407C11.5873 6.42152 11.0299 6.97889 10.3425 6.97889C9.65502 6.97889 9.09766 6.42152 9.09766 5.73407Z" />
                    <path d="M2 22H22.0001" />
                  </svg>
                  <span className="hidden sm:inline font-medium">Exercises</span>
                </button>
                <button 
                  onClick={() => {
                    setHighlightedExercise(null);
                    setInitialMuscleForAnalysis(null);
                    navigateToTab(Tab.HISTORY, 'top');
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border transition-all duration-200 ${activeTab === Tab.HISTORY ? 'bg-white/10 border-slate-600/70 text-white ring-2 ring-white/25 shadow-sm' : 'bg-transparent border-black/70 text-slate-400 hover:border-white hover:text-white hover:bg-white/5'}`}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 503.379 503.379"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    paintOrder="stroke fill"
                  >
                    <path d="M458.091,128.116v326.842c0,26.698-21.723,48.421-48.422,48.421h-220.92c-26.699,0-48.421-21.723-48.421-48.421V242.439
		c6.907,1.149,13.953,1.894,21.184,1.894c5.128,0,10.161-0.381,15.132-0.969v211.594c0,6.673,5.429,12.104,12.105,12.104h220.92
		c6.674,0,12.105-5.432,12.105-12.104V128.116c0-6.676-5.432-12.105-12.105-12.105H289.835c0-12.625-1.897-24.793-5.297-36.315
		h125.131C436.368,79.695,458.091,101.417,458.091,128.116z M159.49,228.401c-62.973,0-114.202-51.229-114.202-114.199
		C45.289,51.229,96.517,0,159.49,0c62.971,0,114.202,51.229,114.202,114.202C273.692,177.172,222.461,228.401,159.49,228.401z
		 M159.49,204.19c49.618,0,89.989-40.364,89.989-89.988c0-49.627-40.365-89.991-89.989-89.991
		c-49.626,0-89.991,40.364-89.991,89.991C69.499,163.826,109.87,204.19,159.49,204.19z M227.981,126.308
		c6.682,0,12.105-5.423,12.105-12.105s-5.423-12.105-12.105-12.105h-56.386v-47.52c0-6.682-5.423-12.105-12.105-12.105
		s-12.105,5.423-12.105,12.105v59.625c0,6.682,5.423,12.105,12.105,12.105H227.981z M367.697,224.456h-131.14
		c-6.682,0-12.105,5.423-12.105,12.105c0,6.683,5.423,12.105,12.105,12.105h131.14c6.685,0,12.105-5.423,12.105-12.105
		C379.803,229.879,374.382,224.456,367.697,224.456z M367.91,297.885h-131.14c-6.682,0-12.105,5.42-12.105,12.105
		s5.423,12.105,12.105,12.105h131.14c6.685,0,12.104-5.42,12.104-12.105S374.601,297.885,367.91,297.885z M367.91,374.353h-131.14
		c-6.682,0-12.105,5.426-12.105,12.105c0,6.685,5.423,12.104,12.105,12.104h131.14c6.685,0,12.104-5.42,12.104-12.104
		C380.015,379.778,374.601,374.353,367.91,374.353z"/>
                  </svg>
                  <span className="hidden sm:inline font-medium">History</span>
                </button>
                <button 
                  onClick={() => {
                    setHighlightedExercise(null);
                    setInitialMuscleForAnalysis(null);
                    navigateToTab(Tab.FLEX, 'top');
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border transition-all duration-200 ${activeTab === Tab.FLEX ? 'bg-white/10 border-slate-600/70 text-white ring-2 ring-white/25 shadow-sm' : 'bg-transparent border-black/70 text-slate-400 hover:border-white hover:text-white hover:bg-white/5'}`}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 512.001 512.001"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    paintOrder="stroke fill"
                  >
                    <path d="M426.667,0H85.334C73.552,0,64,9.552,64,21.334v469.333C64,502.449,73.552,512,85.334,512h341.333 c11.782,0,21.333-9.551,21.333-21.333V21.334C448,9.552,438.449,0,426.667,0z M182.326,469.334l223.007-207.078v69.398 l-157.349,137.68H182.326z M405.334,96.987L106.667,358.32v-50.35L392.378,42.667h12.956V96.987z M329.674,42.667L106.667,249.745 v-69.398l157.349-137.68H329.674z M199.223,42.667l-92.556,80.986V42.667H199.223z M106.667,415.014l298.667-261.333v50.35 L119.623,469.334h-12.956V415.014z M312.778,469.334l92.556-80.986v80.986H312.778z"/>
                  </svg>
                  <span className="hidden sm:inline font-medium text-xs">Flex</span>
                </button>

                <button
                  onClick={() => setCalendarOpen((v) => !v)}
                  className={`sm:hidden w-full h-full relative flex flex-col items-center justify-center px-2 py-1.5 rounded-lg transition-all duration-200 ${
                    (selectedDay || selectedWeeks.length > 0 || selectedRange)
                      ? 'bg-white/10 ring-2 ring-white/25 border border-slate-700/50 text-white shadow-sm'
                      : 'bg-black/30 hover:bg-black/60 text-slate-200'
                  }`}
                  title="Calendar"
                  aria-label="Calendar"
                >
                  {calendarOpen ? <Pencil className="w-4 h-4" /> : ((selectedDay || selectedWeeks.length > 0 || selectedRange) ? <Pencil className="w-4 h-4" /> : <Calendar className="w-4 h-4" />)}
                  <span className="text-[10px] font-semibold leading-none mt-1">Calendar</span>

                  {(selectedDay || selectedWeeks.length > 0 || selectedRange) && !calendarOpen ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedRange(null);
                        setSelectedDay(null);
                        setSelectedWeeks([]);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 border border-slate-700/50 grid place-items-center hover:bg-black/70"
                      aria-label="Clear calendar filter"
                      title="Clear"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : null}
                </button>
              </nav>
            </div>
          </header>

          {calendarOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => setCalendarOpen(false)} />
              <CalendarSelector
                mode="both"
                initialMonth={selectedDay ?? selectedRange?.start ?? selectedWeeks[0]?.start ?? effectiveNow ?? null}
                initialRange={
                  selectedRange
                    ? { start: selectedRange.start, end: selectedRange.end }
                    : selectedWeeks.length === 1
                    ? { start: startOfDay(selectedWeeks[0].start), end: endOfDay(selectedWeeks[0].end) }
                    : null
                }
                minDate={minDate}
                maxDate={maxDate}
                availableDates={availableDatesSet}
                multipleWeeks={true}
                onSelectWeeks={(ranges) => { setSelectedWeeks(ranges); setSelectedDay(null); setSelectedRange(null); setCalendarOpen(false); }}
                onSelectDay={(d) => { setSelectedDay(d); setSelectedWeeks([]); setSelectedRange(null); setCalendarOpen(false); }}
                onSelectWeek={(r) => { setSelectedWeeks([r]); setSelectedDay(null); setSelectedRange(null); setCalendarOpen(false); }}
                onSelectMonth={(r) => { setSelectedRange(r); setSelectedDay(null); setSelectedWeeks([]); setCalendarOpen(false); }}
                onSelectYear={(r) => { setSelectedRange(r); setSelectedDay(null); setSelectedWeeks([]); setCalendarOpen(false); }}
                onClear={() => { setSelectedRange(null); setSelectedDay(null); setSelectedWeeks([]); }}
                onClose={() => setCalendarOpen(false)}
                onApply={({ range }) => {
                  if (range) {
                    setSelectedRange(range);
                    setSelectedDay(null);
                    setSelectedWeeks([]);
                  }
                  setCalendarOpen(false);
                }}
              />
            </div>
          )}

          <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-black/70 p-1 sm:p-2 md:p-3 lg:p-4">

            <Suspense fallback={<div className="text-slate-400 p-4">Loading...</div>}>
              {activeTab === Tab.DASHBOARD && (
                <Dashboard 
                  dailyData={dailySummaries} 
                  exerciseStats={exerciseStats} 
                  fullData={filteredData} 
                  filtersSlot={desktopFilterControls}
                  stickyHeader={hasActiveCalendarFilter}
                  onDayClick={handleDayClick}
                  onMuscleClick={handleMuscleClick}
                  onExerciseClick={handleExerciseClick}
                  bodyMapGender={bodyMapGender}
                  weightUnit={weightUnit}
                />
              )}
              {activeTab === Tab.EXERCISES && (
                <ExerciseView
                  stats={exerciseStats}
                  filtersSlot={desktopFilterControls}
                  highlightedExercise={highlightedExercise}
                  onHighlightApplied={() => setHighlightedExercise(null)}
                  weightUnit={weightUnit}
                  bodyMapGender={bodyMapGender}
                  stickyHeader={hasActiveCalendarFilter}
                />
              )}
              {activeTab === Tab.HISTORY && (
                <HistoryView
                  data={filteredData}
                  filtersSlot={desktopFilterControls}
                  weightUnit={weightUnit}
                  bodyMapGender={bodyMapGender}
                  stickyHeader={hasActiveCalendarFilter}
                  onExerciseClick={handleExerciseClick}
                  onDayTitleClick={handleHistoryDayTitleClick}
                  targetDate={targetHistoryDate}
                  onTargetDateConsumed={handleTargetDateConsumed}
                />
              )}
              {activeTab === Tab.MUSCLE_ANALYSIS && (
                <MuscleAnalysis
                  data={filteredData}
                  filtersSlot={desktopFilterControls}
                  onExerciseClick={handleExerciseClick}
                  initialMuscle={initialMuscleForAnalysis}
                  initialWeeklySetsWindow={initialWeeklySetsWindow}
                  onInitialMuscleConsumed={() => {
                    setInitialMuscleForAnalysis(null);
                    setInitialWeeklySetsWindow(null);
                  }}
                  bodyMapGender={bodyMapGender}
                  stickyHeader={hasActiveCalendarFilter}
                />
              )}
              {activeTab === Tab.FLEX && (
                <FlexView
                  data={filteredData}
                  filtersSlot={desktopFilterControls}
                  weightUnit={weightUnit}
                  dailySummaries={dailySummaries}
                  exerciseStats={exerciseStats}
                  stickyHeader={hasActiveCalendarFilter}
                  bodyMapGender={bodyMapGender}
                />
              )}
            </Suspense>

            <div className="hidden sm:block">
              <SupportLinks variant="secondary" layout="footer" />
            </div>

            <div className="sm:hidden pb-10">
              <SupportLinks variant="all" layout="footer" />
            </div>
          </main>
        </>
      )}

      {/* Landing page for initial visitors - shows real content for SEO/AdSense */}
      {onboarding?.intent === 'initial' && onboarding?.step === 'platform' ? (
        <LandingPage
          onSelectPlatform={(source) => {
            setCsvImportError(null);
            setHevyLoginError(null);
            setLyfatLoginError(null);
            if (source === 'strong') {
              setOnboarding({ intent: onboarding.intent, step: 'strong_csv', platform: 'strong' });
              return;
            }
            if (source === 'lyfta') {
              setOnboarding({ intent: onboarding.intent, step: 'lyfta_prefs', platform: 'lyfta' });
              return;
            }
            if (source === 'other') {
              setOnboarding({ intent: onboarding.intent, step: 'other_csv', platform: 'other' });
              return;
            }
            setOnboarding({ intent: onboarding.intent, step: 'hevy_prefs', platform: 'hevy' });
          }}
        />
      ) : null}

      {/* Modal for update flow only */}
      {onboarding?.intent === 'update' && onboarding?.step === 'platform' ? (
        // If user's saved data source is 'other', skip the choose-platform modal
        // and open the CSV import modal directly so they return to their CSV upload
        // screen (no platform-specific copy).
        dataSource === 'other' ? (
          <CSVImportModal
            intent={onboarding.intent}
            platform="other"
            onClearCache={clearCacheAndRestart}
            onFileSelect={(file, gender, unit) => {
              setBodyMapGender(gender);
              setWeightUnit(unit);
              savePreferencesConfirmed(true);
              setCsvImportError(null);
              processFile(file, 'other', unit);
            }}
            isLoading={isAnalyzing}
            initialGender={bodyMapGender}
            initialUnit={weightUnit}
            onGenderChange={(g) => setBodyMapGender(g)}
            onUnitChange={(u) => setWeightUnit(u)}
            errorMessage={csvImportError}
            onBack={() => setOnboarding(null)}
            onClose={() => setOnboarding(null)}
          />
        ) : (
          <DataSourceModal
            intent={onboarding.intent}
            onSelect={(source) => {
              setCsvImportError(null);
              setHevyLoginError(null);
              setLyfatLoginError(null);
              if (source === 'strong') {
                setOnboarding({ intent: onboarding.intent, step: 'strong_csv', platform: 'strong' });
                return;
              }
              if (source === 'lyfta') {
                setOnboarding({ intent: onboarding.intent, step: 'lyfta_prefs', platform: 'lyfta' });
                return;
              }
              if (source === 'other') {
                setOnboarding({ intent: onboarding.intent, step: 'other_csv', platform: 'other' });
                return;
              }
              setOnboarding({ intent: onboarding.intent, step: 'hevy_prefs', platform: 'hevy' });
            }}
            onClose={() => setOnboarding(null)}
          />
        )
      ) : null}

      {onboarding?.step === 'hevy_prefs' ? (
        <CSVImportModal
          intent={onboarding.intent}
          platform="hevy"
          variant="preferences"
          continueLabel="Continue"
          isLoading={isAnalyzing}
          initialGender={getPreferencesConfirmed() ? bodyMapGender : undefined}
          initialUnit={getPreferencesConfirmed() ? weightUnit : undefined}
          onGenderChange={(g) => setBodyMapGender(g)}
          onUnitChange={(u) => setWeightUnit(u)}
          onContinue={(gender, unit) => {
            setBodyMapGender(gender);
            setWeightUnit(unit);
            savePreferencesConfirmed(true);
            setOnboarding({ intent: onboarding.intent, step: 'hevy_login', platform: 'hevy' });
          }}
          onBack={
            onboarding.intent === 'initial'
              ? () => setOnboarding({ intent: onboarding.intent, step: 'platform' })
              : () => setOnboarding({ intent: onboarding.intent, step: 'platform' })
          }
          onClose={
            onboarding.intent === 'update'
              ? () => setOnboarding(null)
              : undefined
          }
        />
      ) : null}

      {onboarding?.step === 'lyfta_prefs' ? (
        <CSVImportModal
          intent={onboarding.intent}
          platform="lyfta"
          variant="preferences"
          continueLabel="Continue"
          isLoading={isAnalyzing}
          initialGender={getPreferencesConfirmed() ? bodyMapGender : undefined}
          initialUnit={getPreferencesConfirmed() ? weightUnit : undefined}
          onGenderChange={(g) => setBodyMapGender(g)}
          onUnitChange={(u) => setWeightUnit(u)}
          onContinue={(gender, unit) => {
            setBodyMapGender(gender);
            setWeightUnit(unit);
            savePreferencesConfirmed(true);
            setOnboarding({ intent: onboarding.intent, step: 'lyfta_login', platform: 'lyfta' });
          }}
          onBack={
            onboarding.intent === 'initial'
              ? () => setOnboarding({ intent: onboarding.intent, step: 'platform' })
              : () => setOnboarding({ intent: onboarding.intent, step: 'platform' })
          }
          onClose={
            onboarding.intent === 'update'
              ? () => setOnboarding(null)
              : undefined
          }
        />
      ) : null}

      {onboarding?.step === 'hevy_login' ? (
        <HevyLoginModal
          intent={onboarding.intent}
          initialMode={getHevyProApiKey() ? 'apiKey' : 'credentials'}
          errorMessage={hevyLoginError}
          isLoading={isAnalyzing}
          onLogin={handleHevyLogin}
          onLoginWithApiKey={handleHevyApiKeyLogin}
          loginLabel={onboarding.intent === 'initial' ? 'Continue' : 'Login with Hevy'}
          apiKeyLoginLabel={onboarding.intent === 'initial' ? 'Continue' : 'Continue with API key'}
          hasSavedSession={Boolean(getHevyAuthToken() || getHevyProApiKey()) && getPreferencesConfirmed()}
          onSyncSaved={handleHevySyncSaved}
          onClearCache={clearCacheAndRestart}
          onImportCsv={() => setOnboarding({ intent: onboarding.intent, step: 'hevy_csv', platform: 'hevy', backStep: 'hevy_login' })}
          onBack={
            onboarding.intent === 'initial'
              ? () => setOnboarding({ intent: onboarding.intent, step: 'hevy_prefs', platform: 'hevy' })
              : () => setOnboarding({ intent: 'initial', step: 'platform' })
          }
          onClose={
            onboarding.intent === 'update'
              ? () => setOnboarding(null)
              : undefined
          }
        />
      ) : null}

      {onboarding?.step === 'lyfta_login' ? (
        <LyfataLoginModal
          intent={onboarding.intent}
          errorMessage={lyfatLoginError}
          isLoading={isAnalyzing}
          onLogin={handleLyfatLogin}
          loginLabel={onboarding.intent === 'initial' ? 'Continue' : 'Login with Lyfta'}
          hasSavedSession={Boolean(getLyfataApiKey()) && getPreferencesConfirmed()}
          onSyncSaved={handleLyfatSyncSaved}
          onClearCache={clearCacheAndRestart}
          onImportCsv={() => setOnboarding({ intent: onboarding.intent, step: 'lyfta_csv', platform: 'lyfta', backStep: 'lyfta_login' })}
          onBack={
            onboarding.intent === 'initial'
              ? () => setOnboarding({ intent: onboarding.intent, step: 'lyfta_prefs', platform: 'lyfta' })
              : () => setOnboarding({ intent: 'initial', step: 'platform' })
          }
          onClose={
            onboarding.intent === 'update'
              ? () => setOnboarding(null)
              : undefined
          }
        />
      ) : null}

      {onboarding?.step === 'strong_csv' ? (
        <CSVImportModal
          intent={onboarding.intent}
          platform="strong"
          onClearCache={clearCacheAndRestart}
          onFileSelect={(file, gender, unit) => {
            setBodyMapGender(gender);
            setWeightUnit(unit);
            savePreferencesConfirmed(true);
            setCsvImportError(null);
            processFile(file, 'strong', unit);
          }}
          isLoading={isAnalyzing}
          initialGender={bodyMapGender}
          initialUnit={weightUnit}
          onGenderChange={(g) => setBodyMapGender(g)}
          onUnitChange={(u) => setWeightUnit(u)}
          errorMessage={csvImportError}
          onBack={
            onboarding.intent === 'initial'
              ? () => setOnboarding({ intent: onboarding.intent, step: 'platform' })
              : () => setOnboarding({ intent: 'initial', step: 'platform' })
          }
          onClose={
            onboarding.intent === 'update'
              ? () => setOnboarding(null)
              : undefined
          }
        />
      ) : null}

      {onboarding?.step === 'other_csv' ? (
        <CSVImportModal
          intent={onboarding.intent}
          platform="other"
          onClearCache={clearCacheAndRestart}
          onFileSelect={(file, gender, unit) => {
            setBodyMapGender(gender);
            setWeightUnit(unit);
            savePreferencesConfirmed(true);
            setCsvImportError(null);
            processFile(file, 'other', unit);
          }}
          isLoading={isAnalyzing}
          initialGender={bodyMapGender}
          initialUnit={weightUnit}
          onGenderChange={(g) => setBodyMapGender(g)}
          onUnitChange={(u) => setWeightUnit(u)}
          errorMessage={csvImportError}
          onBack={
            onboarding.intent === 'initial'
              ? () => setOnboarding({ intent: onboarding.intent, step: 'platform' })
              : () => setOnboarding(null)
          }
          onClose={
            onboarding.intent === 'update'
              ? () => setOnboarding(null)
              : undefined
          }
        />
      ) : null}

      {onboarding?.step === 'lyfta_csv' ? (
        <CSVImportModal
          intent={onboarding.intent}
          platform="lyfta"
          hideBodyTypeAndUnit
          onClearCache={clearCacheAndRestart}
          onFileSelect={(file, gender, unit) => {
            setBodyMapGender(gender);
            setWeightUnit(unit);
            savePreferencesConfirmed(true);
            setCsvImportError(null);
            processFile(file, 'lyfta', unit);
          }}
          isLoading={isAnalyzing}
          initialGender={bodyMapGender}
          initialUnit={weightUnit}
          onGenderChange={(g) => setBodyMapGender(g)}
          onUnitChange={(u) => setWeightUnit(u)}
          errorMessage={csvImportError}
          onBack={() => {
            if (onboarding.intent === 'initial') {
              const backStep = onboarding.backStep ?? 'lyfta_prefs';
              setOnboarding({ intent: onboarding.intent, step: backStep, platform: 'lyfta' });
              return;
            }
            setOnboarding({ intent: 'initial', step: 'platform' });
          }}
          onClose={
            onboarding.intent === 'update'
              ? () => setOnboarding(null)
              : undefined
          }
        />
      ) : null}

      {onboarding?.step === 'hevy_csv' ? (
        <CSVImportModal
          intent={onboarding.intent}
          platform="hevy"
          hideBodyTypeAndUnit
          onFileSelect={(file, gender, unit) => {
            setBodyMapGender(gender);
            setWeightUnit(unit);
            savePreferencesConfirmed(true);
            setCsvImportError(null);
            processFile(file, 'hevy', unit);
          }}
          isLoading={isAnalyzing}
          initialGender={bodyMapGender}
          initialUnit={weightUnit}
          onGenderChange={(g) => setBodyMapGender(g)}
          onUnitChange={(u) => setWeightUnit(u)}
          errorMessage={csvImportError}
          onBack={() => {
            if (onboarding.intent === 'initial') {
              const backStep = onboarding.backStep ?? 'hevy_login';
              setOnboarding({ intent: onboarding.intent, step: backStep, platform: 'hevy' });
              return;
            }
            setOnboarding({ intent: 'initial', step: 'platform' });
          }}
          onClose={
            onboarding.intent === 'update'
              ? () => setOnboarding(null)
              : undefined
          }
        />
      ) : null}
      
      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col items-center">
            <CsvLoadingAnimation className="mb-6" size={160} />
            <h2 className="text-2xl font-bold text-white mb-2">
              {loadingKind === 'hevy' ? 'Crunching your numbers' : 'Analyzing Workout Data'}
            </h2>
            <p className="text-slate-400 mb-6 text-center">
              {loadingKind === 'hevy'
                ? 'Syncing your workouts from Hevy and preparing your dashboard.'
                : 'Please wait while we process your sets, calculate volume, and identify personal records.'}
            </p>
            
            <div className="w-full space-y-4">
               <div className="flex items-center space-x-3 text-sm">
                  {loadingStep >= 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-700"></div>}
                  <span className={loadingStep >= 0 ? "text-slate-200" : "text-slate-600"}>Loading workout data...</span>
               </div>
               <div className="flex items-center space-x-3 text-sm">
                  {loadingStep >= 1 ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-700"></div>}
                  <span className={loadingStep >= 1 ? "text-slate-200" : "text-slate-600"}>Calculating Personal Records (PRs)...</span>
               </div>
               <div className="flex items-center space-x-3 text-sm">
                  {loadingStep >= 2 ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-700"></div>}
                  <span className={loadingStep >= 2 ? "text-slate-200" : "text-slate-600"}>Generating visualizations...</span>
               </div>

               {/* Progress bar */}
               <div className="mt-4">
                 <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                   <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${progress}%` }} />
                 </div>
                 <div className="text-right text-[10px] text-slate-500 mt-1">{progress}%</div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
