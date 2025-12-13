import React, { useState, useEffect, useMemo, Suspense, useRef, useCallback } from 'react';
import { parseWorkoutCSV, parseWorkoutCSVAsync } from './utils/csvParser';
import { getDailySummaries, getExerciseStats, identifyPersonalRecords } from './utils/analytics';
import { computationCache, getFilteredCacheKey } from './utils/computationCache';
import { getExerciseAssets } from './utils/exerciseAssets';
import { WorkoutSet } from './types';
import { DEFAULT_CSV_DATA } from './constants';
import { BodyMapGender } from './components/BodyMap';
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const ExerciseView = React.lazy(() => import('./components/ExerciseView').then(m => ({ default: m.ExerciseView })));
const HistoryView = React.lazy(() => import('./components/HistoryView').then(m => ({ default: m.HistoryView })));
const MuscleAnalysis = React.lazy(() => import('./components/MuscleAnalysis').then(m => ({ default: m.MuscleAnalysis })));
import { CSVImportModal } from './components/CSVImportModal';
import { saveCSVData, getCSVData, clearCSVData, saveWeightUnit, getWeightUnit, WeightUnit, getBodyMapGender, saveBodyMapGender } from './utils/localStorage';
import { LayoutDashboard, Dumbbell, History, Loader2, CheckCircle2, X, Calendar, BicepsFlexed, Pencil, RefreshCw } from 'lucide-react';
import { format, isSameDay, isWithinInterval } from 'date-fns';
import { CalendarSelector } from './components/CalendarSelector';
import { trackPageView } from './utils/ga';
import BackgroundTexture from './components/BackgroundTexture';
import { SupportLinks } from './components/SupportLinks';

enum Tab {
  DASHBOARD = 'dashboard',
  EXERCISES = 'exercises',
  HISTORY = 'history',
  MUSCLE_ANALYSIS = 'muscle-analysis'
}

const App: React.FC = () => {
  const [rawData, setRawData] = useState<string>(DEFAULT_CSV_DATA);
  const [parsedData, setParsedData] = useState<WorkoutSet[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [highlightedExercise, setHighlightedExercise] = useState<string | null>(null);
  const [initialMuscleForAnalysis, setInitialMuscleForAnalysis] = useState<{ muscleId: string; viewMode: 'muscle' | 'group' } | null>(null);
  
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
    setActiveTab(Tab.EXERCISES);
  };

  // Handler for navigating to MuscleAnalysis from Dashboard heatmap
  const handleMuscleClick = (muscleId: string, viewMode: 'muscle' | 'group') => {
    setInitialMuscleForAnalysis({ muscleId, viewMode });
    setActiveTab(Tab.MUSCLE_ANALYSIS);
  };
  
  // Loading State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0); // 0: Parse, 1: Analyze, 2: Visualize
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<number | null>(null);

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
        parseWorkoutCSVAsync(storedCSV)
          .then(result => {
            setLoadingStep(2);
            return identifyPersonalRecords(result);
          })
          .then(enriched => setParsedData(enriched))
          .catch(() => {
            // Fallback to sync parser if worker parsing fails
            const fallback = identifyPersonalRecords(parseWorkoutCSV(storedCSV));
            setParsedData(fallback);
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
      // Preload exercise assets (cached globally)
      getExerciseAssets().catch(() => {});
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
      if (selectedWeeks.length > 0) return selectedWeeks.some(r => isWithinInterval(d.parsedDate as Date, r));
      if (selectedRange) return isWithinInterval(d.parsedDate as Date, selectedRange);
      if (selectedMonth !== 'all') return format(d.parsedDate, 'yyyy-MM') === selectedMonth;
      return true;
    });
  }, [parsedData, selectedMonth, selectedDay, selectedRange, selectedWeeks]);

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
    const today = new Date();
    const minDate = isFinite(minTs) ? new Date(minTs) : null;
    const maxInData = maxTs > 0 ? new Date(maxTs) : null;
    const maxDate = maxInData ? (maxInData > today ? today : maxInData) : today;
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

  const filterControls = (
    <div
      className={`relative flex items-center gap-2 rounded-lg px-3 py-2 h-10 shadow-sm transition-all duration-300 ${
        hasActiveCalendarFilter
          ? 'bg-blue-950/40 border-2 border-blue-500/50 ring-2 ring-blue-500/20'
          : 'bg-black/70 border border-slate-700/50'
      }`}
    >
      <div className="flex-1 min-w-0 overflow-x-auto">
        <div className="flex items-center gap-2 flex-nowrap min-w-max">
          {selectedDay ? (
            <button
              onClick={() => setSelectedDay(null)}
              className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
              title={format(selectedDay, 'MMM d, yyyy')}
            >
              <span>{format(selectedDay, 'MMM d, yyyy')}</span>
              <X className="w-3 h-3" />
            </button>
          ) : null}

          {selectedRange ? (
            <button
              onClick={() => setSelectedRange(null)}
              className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors whitespace-nowrap"
              title={`Range: ${format(selectedRange.start, 'MMM d, yyyy')} – ${format(selectedRange.end, 'MMM d, yyyy')}`}
            >
              <span>
                Range: {format(selectedRange.start, 'MMM d, yyyy')} – {format(selectedRange.end, 'MMM d, yyyy')}
              </span>
              <X className="w-3 h-3" />
            </button>
          ) : null}

          {selectedWeeks.length > 0 ? (
            <button
              onClick={() => setSelectedWeeks([])}
              className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap"
              title={
                selectedWeeks.length === 1
                  ? `${format(selectedWeeks[0].start, 'MMM d')} – ${format(selectedWeeks[0].end, 'MMM d, yyyy')}`
                  : ''
              }
            >
              <span>
                {selectedWeeks.length === 1
                  ? `Week: ${format(selectedWeeks[0].start, 'MMM d')} – ${format(selectedWeeks[0].end, 'MMM d, yyyy')}`
                  : `Weeks: ${selectedWeeks.length}`}
              </span>
              <X className="w-3 h-3" />
            </button>
          ) : null}

          {!hasActiveCalendarFilter ? (
            <span className="text-xs text-slate-500 whitespace-nowrap">No filter</span>
          ) : null}
        </div>
      </div>

      <button
        onClick={() => setCalendarOpen(!calendarOpen)}
        className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-black/50 hover:bg-black/60 text-xs font-semibold text-slate-200 whitespace-nowrap"
      >
        <Calendar className="w-4 h-4 text-slate-400" />
        <span>Calendar</span>
      </button>
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
    setActiveTab(Tab.HISTORY);
  };

  const handleModalFileSelect = (file: File, gender: BodyMapGender, unit: WeightUnit) => {
    setBodyMapGender(gender);
    setWeightUnit(unit);
    processFile(file);
    setShowCSVModal(false);
  };

  const handleOpenUpdateFlow = () => {
    // Re-open onboarding with persisted preferences preselected
    setShowCSVModal(true);
  };

  const handleClearCSV = () => {
    if (confirm('Are you sure you want to remove the CSV data? This will reset to the default data.')) {
      clearCSVData();
      // Reset to default data
      const result = parseWorkoutCSV(DEFAULT_CSV_DATA);
      const enriched = identifyPersonalRecords(result);
      setParsedData(enriched);
      setRawData(DEFAULT_CSV_DATA);
      setSelectedMonth('all');
      setSelectedDay(null);
      setShowCSVModal(true);
    }
  };

  const processFile = (file: File) => {
    // Start Loading Sequence
    setIsAnalyzing(true);
    setLoadingStep(0);
    const startedAt = startProgress();

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        saveCSVData(text);
        setRawData(text);
        setLoadingStep(1);
        parseWorkoutCSVAsync(text)
          .then(result => {
            setLoadingStep(2);
            const enriched = identifyPersonalRecords(result);
            setParsedData(enriched);
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
      <BackgroundTexture />
      
      {/* CSV Import Modal */}
      {showCSVModal && (
        <CSVImportModal
          onFileSelect={handleModalFileSelect}
          isLoading={isAnalyzing}
          initialGender={bodyMapGender}
          initialUnit={weightUnit}
          onGenderChange={(g) => setBodyMapGender(g)}
          onUnitChange={(u) => setWeightUnit(u)}
          onClose={() => setShowCSVModal(false)}
          onClearData={() => {
            handleClearCSV();
          }}
        />
      )}
      
      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
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
        <div className="px-4 sm:px-6 py-4 flex flex-col gap-4">
          {/* Top Row: Logo and Nav Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <img src="/HevyAnalytics.png" alt="HevyAnalytics Logo" className="w-7 h-7 sm:w-8 sm:h-8" decoding="async" />
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-white inline-flex items-start whitespace-nowrap">
                  <span>HevyAnalytics</span>
                  <sup className="ml-1 inline-block rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold leading-none tracking-wide text-amber-200 align-super -translate-y-0.5 -translate-x-2">
                    BETA
                  </sup>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 min-w-0">
              {/* Desktop: right-aligned support buttons, Update pinned as rightmost */}
              <div className="hidden md:block">
                <SupportLinks
                  variant="primary"
                  layout="header"
                  primaryRightSlot={(
                    <button
                      type="button"
                      onClick={handleOpenUpdateFlow}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 py-1.5 bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200 gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Update CSV</span>
                    </button>
                  )}
                />
              </div>

              {/* Mobile: keep Update action */}
              <div className="md:hidden">
                <button
                  type="button"
                  onClick={handleOpenUpdateFlow}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-xs font-semibold bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Update CSV</span>
                  <span className="sm:hidden">Update</span>
                </button>
              </div>
            </div>
          </div>

          {/* Second Row: Navigation */}
          <nav className="grid grid-cols-5 gap-1 pt-1 sm:grid sm:grid-cols-4 sm:gap-2">
            <button 
              onClick={() => setActiveTab(Tab.DASHBOARD)}
              className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${activeTab === Tab.DASHBOARD ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-black/60 hover:text-white'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveTab(Tab.MUSCLE_ANALYSIS)}
              className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${activeTab === Tab.MUSCLE_ANALYSIS ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-black/60 hover:text-white'}`}
            >
              <BicepsFlexed className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Muscle</span>
            </button>
            <button 
              onClick={() => setActiveTab(Tab.EXERCISES)}
              className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${activeTab === Tab.EXERCISES ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-black/60 hover:text-white'}`}
            >
              <Dumbbell className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Exercises</span>
            </button>
            <button 
              onClick={() => setActiveTab(Tab.HISTORY)}
              className={`w-full flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${activeTab === Tab.HISTORY ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-black/60 hover:text-white'}`}
            >
              <History className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">History</span>
            </button>

            {/* Mobile-only Calendar entry (5th item) */}
            <button
              onClick={() => setCalendarOpen((v) => !v)}
              className={`sm:hidden w-full h-full relative flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-all duration-200 ${
                (selectedDay || selectedWeeks.length > 0 || selectedRange)
                  ? 'bg-blue-950/40 ring-2 ring-blue-500/20 border border-blue-500/50 text-white'
                  : 'bg-black/30 hover:bg-black/60 text-slate-200'
              }`}
              title="Calendar"
              aria-label="Calendar"
            >
              {calendarOpen ? <Pencil className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
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
            minDate={minDate}
            maxDate={maxDate}
            availableDates={availableDatesSet}
            multipleWeeks={true}
            onSelectWeeks={(ranges) => { setSelectedWeeks(ranges); setSelectedDay(null); setSelectedRange(null); setCalendarOpen(false); }}
            onSelectDay={(d) => { setSelectedDay(d); setSelectedWeeks([]); setSelectedRange(null); setCalendarOpen(false); }}
            onSelectWeek={(r) => { setSelectedWeeks([r]); setSelectedDay(null); setSelectedRange(null); setCalendarOpen(false); }}
            onSelectMonth={(r) => { setSelectedRange(r); setSelectedDay(null); setSelectedWeeks([]); setCalendarOpen(false); }}
            onSelectYear={(r) => { setSelectedRange(r); setSelectedDay(null); setSelectedWeeks([]); setCalendarOpen(false); }}
            onClear={() => { setSelectedRange(null); setSelectedDay(null); setSelectedWeeks([]); setCalendarOpen(false); }}
          />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-black/70 p-3 sm:p-4 md:p-6 lg:p-8">

        <Suspense fallback={<div className="text-slate-400 p-4">Loading...</div>}>
          {activeTab === Tab.DASHBOARD && (
            <Dashboard 
              dailyData={dailySummaries} 
              exerciseStats={exerciseStats} 
              fullData={filteredData} 
              filtersSlot={desktopFilterControls}
              onDayClick={handleDayClick}
              onMuscleClick={handleMuscleClick}
              bodyMapGender={bodyMapGender}
              weightUnit={weightUnit}
            />
          )}
          {activeTab === Tab.EXERCISES && <ExerciseView stats={exerciseStats} filtersSlot={desktopFilterControls} highlightedExercise={highlightedExercise} weightUnit={weightUnit} bodyMapGender={bodyMapGender} />}
          {activeTab === Tab.HISTORY && (
            <HistoryView
              data={filteredData}
              filtersSlot={desktopFilterControls}
              weightUnit={weightUnit}
              bodyMapGender={bodyMapGender}
              onExerciseClick={handleExerciseClick}
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
