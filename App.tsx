import React, { useState, useEffect, useMemo, Suspense, useRef, useCallback } from 'react';
import {
  parseWorkoutCSV,
  parseWorkoutCSVAsyncWithUnit,
  parseWorkoutCSVWithUnit,
  ParseWorkoutCsvResult,
} from './utils/csv/csvParser';
import { getDailySummaries, getExerciseStats, identifyPersonalRecords } from './utils/analysis/analytics';
import { computationCache, getFilteredCacheKey } from './utils/storage/computationCache';
import { WorkoutSet } from './types';
import { DEFAULT_CSV_DATA } from './constants';
import { BodyMapGender } from './components/BodyMap';
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const ExerciseView = React.lazy(() => import('./components/ExerciseView').then(m => ({ default: m.ExerciseView })));
const HistoryView = React.lazy(() => import('./components/HistoryView').then(m => ({ default: m.HistoryView })));
const MuscleAnalysis = React.lazy(() => import('./components/MuscleAnalysis').then(m => ({ default: m.MuscleAnalysis })));
const FlexView = React.lazy(() => import('./components/FlexView').then(m => ({ default: m.FlexView })));
import { CSVImportModal } from './components/CSVImportModal';
import { saveCSVData, getCSVData, clearCSVData, saveWeightUnit, getWeightUnit, WeightUnit, getBodyMapGender, saveBodyMapGender } from './utils/storage/localStorage';
import { LayoutDashboard, Dumbbell, History, CheckCircle2, X, Calendar, BicepsFlexed, Pencil, RefreshCw, Sparkles } from 'lucide-react';
import { format, isSameDay, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { CalendarSelector } from './components/CalendarSelector';
import { formatDayYearContraction, formatHumanReadableDate } from './utils/date/dateUtils';
import { trackPageView } from './utils/integrations/ga';
import { initAdSense } from './utils/integrations/adsense';
import { SupportLinks } from './components/SupportLinks';
import { ThemedBackground } from './components/ThemedBackground';
import { ThemeToggleButton } from './components/ThemeToggleButton';
import { CsvLoadingAnimation } from './components/CsvLoadingAnimation';

enum Tab {
  DASHBOARD = 'dashboard',
  EXERCISES = 'exercises',
  HISTORY = 'history',
  MUSCLE_ANALYSIS = 'muscle-analysis',
  FLEX = 'flex'
}

const ADSENSE_CLIENT = 'ca-pub-1028241234302201';

const App: React.FC = () => {
  const [rawData, setRawData] = useState<string>(DEFAULT_CSV_DATA);
  const [parsedData, setParsedData] = useState<WorkoutSet[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvImportError, setCsvImportError] = useState<string | null>(null);
  const [highlightedExercise, setHighlightedExercise] = useState<string | null>(null);
  const [initialMuscleForAnalysis, setInitialMuscleForAnalysis] = useState<{ muscleId: string; viewMode: 'muscle' | 'group' } | null>(null);

  // Loading State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0); // 0: Parse, 1: Analyze, 2: Visualize
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
    if (showCSVModal) return;
    if (isAnalyzing) return;
    if (parsedData.length === 0) return;
    initAdSense(ADSENSE_CLIENT);
  }, [showCSVModal, isAnalyzing, parsedData.length]);

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
  const handleMuscleClick = (muscleId: string, viewMode: 'muscle' | 'group') => {
    setInitialMuscleForAnalysis({ muscleId, viewMode });
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

  // Initial Load: Check local storage, otherwise show modal
  useEffect(() => {
    const storedCSV = getCSVData();
    if (storedCSV) {
      setRawData(storedCSV);
      setIsAnalyzing(true);
      setLoadingStep(0);
      const startedAt = startProgress();
      // Defer heavy parsing to next tick and run in worker to avoid blocking LCP
      setTimeout(() => {
        setLoadingStep(1);
        parseWorkoutCSVAsyncWithUnit(storedCSV, { unit: getWeightUnit() })
          .then((result: ParseWorkoutCsvResult) => {
            setLoadingStep(2);
            return identifyPersonalRecords(result.sets);
          })
          .then(enriched => setParsedData(enriched))
          .catch((err) => {
            // Fallback to sync parser if worker parsing fails
            try {
              const fallbackParsed = parseWorkoutCSVWithUnit(storedCSV, { unit: getWeightUnit(), includeAssetsForStrong: false });
              const fallback = identifyPersonalRecords(fallbackParsed.sets);
              setParsedData(fallback);
            } catch (syncErr) {
              clearCSVData();
              setCsvImportError(getErrorMessage(syncErr ?? err));
              setShowCSVModal(true);
              const result = parseWorkoutCSV(DEFAULT_CSV_DATA);
              const enriched = identifyPersonalRecords(result);
              setParsedData(enriched);
              setRawData(DEFAULT_CSV_DATA);
            }
          })
          .finally(() => {
            finishProgress(startedAt);
          });
      }, 0);
    } else {
      setShowCSVModal(true);
      const result = parseWorkoutCSV(DEFAULT_CSV_DATA);
      const enriched = identifyPersonalRecords(result);
      setParsedData(enriched);
    }
  }, []);

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
    setSelectedDay(date);
    setSelectedRange(null);
    navigateToTab(Tab.HISTORY, 'deep');
  };

  const handleHistoryDayTitleClick = (date: Date) => {
    setSelectedDay(date);
    setSelectedRange(null);
    setSelectedWeeks([]);
    setSelectedMonth('all');
    navigateToTab(Tab.MUSCLE_ANALYSIS, 'deep');
  };

  const handleModalFileSelect = (file: File, gender: BodyMapGender, unit: WeightUnit) => {
    setBodyMapGender(gender);
    setWeightUnit(unit);
    setCsvImportError(null);
    processFile(file, unit);
  };

  const handleOpenUpdateFlow = () => {
    // Re-open onboarding with persisted preferences preselected
    setCsvImportError(null);
    setShowCSVModal(true);
  };

  const processFile = (file: File, unitOverride?: WeightUnit) => {
    // Start Loading Sequence
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
            setRawData(text);
            setShowCSVModal(false);
          })
          .catch((err) => {
            setCsvImportError(getErrorMessage(err));
            setShowCSVModal(true);
          })
          .finally(() => {
            // Reset filters on new upload
            setSelectedMonth('all');
            setSelectedDay(null);
            finishProgress(startedAt);
          });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-screen bg-transparent text-slate-200 font-sans">
      <ThemedBackground />
      
      {/* CSV Import Modal */}
      {showCSVModal && (
        <CSVImportModal
          onFileSelect={handleModalFileSelect}
          isLoading={isAnalyzing}
          initialGender={bodyMapGender}
          initialUnit={weightUnit}
          onGenderChange={(g) => setBodyMapGender(g)}
          onUnitChange={(u) => setWeightUnit(u)}
          errorMessage={csvImportError}
          onClose={() => {
            setShowCSVModal(false);
            setCsvImportError(null);
          }}
        />
      )}
      
      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col items-center">
            <CsvLoadingAnimation className="mb-6" size={160} />
            <h2 className="text-2xl font-bold text-white mb-2">Analyzing Workout Data</h2>
            <p className="text-slate-400 mb-8 text-center">Please wait while we process your sets, calculate volume, and identify personal records.</p>
            
            <div className="w-full space-y-4">
               <div className="flex items-center space-x-3 text-sm">
                  {loadingStep >= 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-700"></div>}
                  <span className={loadingStep >= 0 ? "text-slate-200" : "text-slate-600"}>Parsing CSV structure...</span>
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

      {/* Top Header Navigation */}
      <header className="bg-black/70 border-b border-slate-700/50 flex-shrink-0">
        <div className="px-2 sm:px-3 py-3 flex flex-col gap-3">
          {/* Top Row: Logo and Nav Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <img src="/HevyAnalytics.png" alt="HevyAnalytics Logo" className="w-7 h-7 sm:w-8 sm:h-8" decoding="async" />
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="font-bold text-lg sm:text-xl tracking-tight inline-flex items-start whitespace-nowrap"
                  style={{ color: 'var(--app-fg)' }}
                >
                  <span>HevyAnalytics</span>
                  <sup className="ml-1 inline-block rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold leading-none tracking-wide text-amber-400 align-super -translate-y-0.5 -translate-x-2">
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
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 py-1.5 bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200 gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Update CSV</span>
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
                    <span className="hidden sm:inline">Update CSV</span>
                    <span className="sm:hidden">Update</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Second Row: Navigation */}
          <nav className="grid grid-cols-6 gap-1 pt-1 sm:grid sm:grid-cols-5 sm:gap-2">
            <button 
              onClick={() => {
                setHighlightedExercise(null);
                setInitialMuscleForAnalysis(null);
                navigateToTab(Tab.DASHBOARD, 'top');
              }}
              className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border transition-all duration-200 ${activeTab === Tab.DASHBOARD ? 'bg-white/10 border-slate-600/70 text-white ring-2 ring-white/25 shadow-sm' : 'bg-transparent border-black/70 text-slate-400 hover:border-white hover:text-white hover:bg-white/5'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Dashboard</span>
            </button>
            <button 
              onClick={() => {
                setHighlightedExercise(null);
                setInitialMuscleForAnalysis(null);
                navigateToTab(Tab.MUSCLE_ANALYSIS, 'top');
              }}
              className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border transition-all duration-200 ${activeTab === Tab.MUSCLE_ANALYSIS ? 'bg-white/10 border-slate-600/70 text-white ring-2 ring-white/25 shadow-sm' : 'bg-transparent border-black/70 text-slate-400 hover:border-white hover:text-white hover:bg-white/5'}`}
            >
              <BicepsFlexed className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Muscle</span>
            </button>
            <button 
              onClick={() => {
                setHighlightedExercise(null);
                setInitialMuscleForAnalysis(null);
                navigateToTab(Tab.EXERCISES, 'top');
              }}
              className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border transition-all duration-200 ${activeTab === Tab.EXERCISES ? 'bg-white/10 border-slate-600/70 text-white ring-2 ring-white/25 shadow-sm' : 'bg-transparent border-black/70 text-slate-400 hover:border-white hover:text-white hover:bg-white/5'}`}
            >
              <Dumbbell className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Exercises</span>
            </button>
            <button 
              onClick={() => {
                setHighlightedExercise(null);
                setInitialMuscleForAnalysis(null);
                navigateToTab(Tab.HISTORY, 'top');
              }}
              className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border transition-all duration-200 ${activeTab === Tab.HISTORY ? 'bg-white/10 border-slate-600/70 text-white ring-2 ring-white/25 shadow-sm' : 'bg-transparent border-black/70 text-slate-400 hover:border-white hover:text-white hover:bg-white/5'}`}
            >
              <History className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">History</span>
            </button>
            <button 
              onClick={() => {
                setHighlightedExercise(null);
                setInitialMuscleForAnalysis(null);
                navigateToTab(Tab.FLEX, 'top');
              }}
              className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-lg whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border transition-all duration-200 ${activeTab === Tab.FLEX ? 'bg-white/10 border-slate-600/70 text-white ring-2 ring-white/25 shadow-sm' : 'bg-transparent border-black/70 text-slate-400 hover:border-white hover:text-white hover:bg-white/5'}`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Flex</span>
            </button>

            {/* Mobile-only Calendar entry (6th item) */}
            <button
              onClick={() => setCalendarOpen((v) => !v)}
              className={`sm:hidden w-full h-full relative flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-all duration-200 ${
                (selectedDay || selectedWeeks.length > 0 || selectedRange)
                  ? 'bg-white/10 ring-2 ring-white/25 border border-slate-700/50 text-white shadow-sm'
                  : 'bg-black/30 hover:bg-black/60 text-slate-200'
              }`}
              title="Calendar"
              aria-label="Calendar"
            >
              {calendarOpen ? <Pencil className="w-5 h-5" /> : ((selectedDay || selectedWeeks.length > 0 || selectedRange) ? <Pencil className="w-5 h-5" /> : <Calendar className="w-5 h-5" />)}
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
              // Single consecutive range
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

      {/* Main Content Area */}
      <main ref={mainRef} className="flex-1 overflow-x-hidden overflow-y-auto bg-black/70 p-1 sm:p-2 md:p-3 lg:p-4">

        <Suspense fallback={<div className="text-slate-400 p-4">Loading...</div>}>
          {activeTab === Tab.DASHBOARD && (
            <Dashboard 
              dailyData={dailySummaries} 
              exerciseStats={exerciseStats} 
              fullData={filteredData} 
              filtersSlot={desktopFilterControls}
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
            />
          )}
          {activeTab === Tab.HISTORY && (
            <HistoryView
              data={filteredData}
              filtersSlot={desktopFilterControls}
              weightUnit={weightUnit}
              bodyMapGender={bodyMapGender}
              onExerciseClick={handleExerciseClick}
              onDayTitleClick={handleHistoryDayTitleClick}
            />
          )}
          {activeTab === Tab.MUSCLE_ANALYSIS && (
            <MuscleAnalysis
              data={filteredData}
              filtersSlot={desktopFilterControls}
              onExerciseClick={handleExerciseClick}
              initialMuscle={initialMuscleForAnalysis}
              onInitialMuscleConsumed={() => setInitialMuscleForAnalysis(null)}
              bodyMapGender={bodyMapGender}
            />
          )}
          {activeTab === Tab.FLEX && (
            <FlexView
              data={filteredData}
              filtersSlot={desktopFilterControls}
              weightUnit={weightUnit}
              dailySummaries={dailySummaries}
              exerciseStats={exerciseStats}
            />
          )}
        </Suspense>

        {/* Desktop: secondary links at bottom */}
        <div className="hidden sm:block">
          <SupportLinks variant="secondary" layout="footer" />
        </div>

        {/* Mobile: keep all support links at bottom */}
        <div className="sm:hidden">
          <SupportLinks variant="all" layout="footer" />
        </div>
      </main>
    </div>
  );
};

export default App;
