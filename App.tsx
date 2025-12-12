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
import { saveCSVData, getCSVData, clearCSVData, saveWeightUnit, getWeightUnit, WeightUnit } from './utils/localStorage';
import { LayoutDashboard, Dumbbell, History, Upload, Filter, Loader2, CheckCircle2, X, Trash2, Menu, Calendar, Activity } from 'lucide-react';
import { format, isSameDay, isWithinInterval } from 'date-fns';
import { CalendarSelector } from './components/CalendarSelector';
import { trackPageView } from './utils/ga';
import BackgroundTexture from './components/BackgroundTexture';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [highlightedExercise, setHighlightedExercise] = useState<string | null>(null);
  const [initialMuscleForAnalysis, setInitialMuscleForAnalysis] = useState<{ muscleId: string; viewMode: 'muscle' | 'group' } | null>(null);
  
  // Gender state with sessionStorage persistence
  const [bodyMapGender, setBodyMapGender] = useState<BodyMapGender>(() => {
    const stored = sessionStorage.getItem('bodyMapGender');
    return (stored === 'male' || stored === 'female') ? stored : 'male';
  });
  
  // Persist gender to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('bodyMapGender', bodyMapGender);
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

  const filterControls = (
    <div className={`relative flex flex-col sm:flex-row sm:flex-nowrap gap-2 sm:gap-3 p-2 rounded-xl shadow-sm items-start sm:items-center transition-all duration-300 ${
      (selectedDay || selectedWeeks.length > 0 || selectedRange)
        ? 'bg-blue-950/40 border-2 border-blue-500/50 ring-2 ring-blue-500/20'
        : 'bg-black/70 border border-slate-700/50'
    }`}>
       <div className="flex items-center px-2">
          <Filter className={`w-4 h-4 mr-2 transition-colors ${(selectedDay || selectedWeeks.length > 0 || selectedRange) ? 'text-blue-400' : 'text-slate-500'}`} />
          <span className={`text-xs font-bold uppercase tracking-wide transition-colors ${(selectedDay || selectedWeeks.length > 0 || selectedRange) ? 'text-blue-400' : 'text-slate-500'}`}>
            {(selectedDay || selectedWeeks.length > 0 || selectedRange) ? 'Filter Active' : 'Filters'}
          </span>
       </div>
       
       {/* Specific Day Active Chip */}
       {selectedDay && (
         <button 
           onClick={() => setSelectedDay(null)}
           className="flex items-center gap-2 bg-blue-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
         >
           <span className="whitespace-nowrap">{format(selectedDay, 'MMM d, yyyy')}</span>
           <X className="w-3 h-3" />
         </button>
       )}

       {/* Selected Weeks Chip */}
       {selectedWeeks.length > 0 && (
         <button 
           onClick={() => setSelectedWeeks([])}
           className="flex items-center gap-2 bg-emerald-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
           title={selectedWeeks.length === 1 ? `${format(selectedWeeks[0].start, 'MMM d')} – ${format(selectedWeeks[0].end, 'MMM d, yyyy')}` : ''}
         >
           <span className="whitespace-nowrap">{selectedWeeks.length === 1 ? `Week: ${format(selectedWeeks[0].start, 'MMM d')} – ${format(selectedWeeks[0].end, 'MMM d, yyyy')}` : `Weeks selected (${selectedWeeks.length})`}</span>
           <X className="w-3 h-3" />
         </button>
       )}

       {/* Selected Range Chip (Month/Year/Custom) */}
       {selectedRange && (
         <button 
           onClick={() => setSelectedRange(null)}
           className="flex items-center gap-2 bg-purple-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
         >
           <span className="whitespace-nowrap">Range: {format(selectedRange.start, 'MMM d, yyyy')} – {format(selectedRange.end, 'MMM d, yyyy')}</span>
           <X className="w-3 h-3" />
         </button>
       )}

       {/* Calendar selector (master) */}
       <div className="relative">
         <button
           onClick={() => setCalendarOpen(!calendarOpen)}
           className="flex items-center gap-2 px-2 py-2 rounded-lg bg-black/70 border border-slate-700/50 text-xs sm:text-sm hover:bg-black/60"
         >
           <Calendar className="w-4 h-4 text-slate-400" /> Calendar
         </button>
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
       </div>
    </div>
  );

  // Handler for heatmap click
  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
    setSelectedRange(null);
    setActiveTab(Tab.HISTORY);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleModalFileSelect = (file: File, gender: BodyMapGender, unit: WeightUnit) => {
    setBodyMapGender(gender);
    setWeightUnit(unit);
    processFile(file);
    setShowCSVModal(false);
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
        <CSVImportModal onFileSelect={handleModalFileSelect} isLoading={isAnalyzing} />
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
            <div className="flex items-center gap-3 sm:gap-4">
              <img src="/HevyAnalytics.png" alt="HevyAnalytics Logo" className="w-7 h-7 sm:w-8 sm:h-8" decoding="async" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-white inline-flex items-start whitespace-nowrap">
                  <span>HevyAnalytics</span>
                  <sup className="ml-1 inline-block rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold leading-none tracking-wide text-amber-200 align-super -translate-y-0.5 -translate-x-2">
                    BETA
                  </sup>
                </span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <button 
                onClick={() => {
                  setActiveTab(Tab.DASHBOARD);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === Tab.DASHBOARD ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-black/60 hover:text-white'}`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab(Tab.MUSCLE_ANALYSIS);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === Tab.MUSCLE_ANALYSIS ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-black/60 hover:text-white'}`}
              >
                <Activity className="w-5 h-5" />
                <span className="font-medium">Muscle Analysis</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab(Tab.EXERCISES);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === Tab.EXERCISES ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-black/60 hover:text-white'}`}
              >
                <Dumbbell className="w-5 h-5" />
                <span className="font-medium">Exercises</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab(Tab.HISTORY);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === Tab.HISTORY ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-black/60 hover:text-white'}`}
              >
                <History className="w-5 h-5" />
                <span className="font-medium">History</span>
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-black/60 transition-colors text-slate-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Action Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <label className="cursor-pointer group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-600 hover:border-slate-400 hover:bg-black/60 transition-all">
                <Upload className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                onClick={handleClearCSV}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-600 hover:border-red-500 hover:bg-red-950/30 transition-all group"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-400" />

              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <nav className="md:hidden flex flex-col gap-2 border-t border-slate-800 pt-4 mt-2">
              <button 
                onClick={() => {
                  setActiveTab(Tab.DASHBOARD);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 w-full text-left ${activeTab === Tab.DASHBOARD ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-black/60 hover:text-white'}`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab(Tab.MUSCLE_ANALYSIS);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 w-full text-left ${activeTab === Tab.MUSCLE_ANALYSIS ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-black/60 hover:text-white'}`}
              >
                <Activity className="w-5 h-5" />
                <span className="font-medium">Muscle Analysis</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab(Tab.EXERCISES);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 w-full text-left ${activeTab === Tab.EXERCISES ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-black/60 hover:text-white'}`}
              >
                <Dumbbell className="w-5 h-5" />
                <span className="font-medium">Exercises</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab(Tab.HISTORY);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 w-full text-left ${activeTab === Tab.HISTORY ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-black/60 hover:text-white'}`}
              >
                <History className="w-5 h-5" />
                <span className="font-medium">History</span>
              </button>

              {/* Mobile Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800 mt-2">
                <label className="cursor-pointer group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-600 hover:border-slate-400 hover:bg-black/60 transition-all">
                  <Upload className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                  <span className="text-xs text-slate-400 group-hover:text-white">Import</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  onClick={handleClearCSV}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-600 hover:border-red-500 hover:bg-red-950/30 transition-all group"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-400" />
                  <span className="text-xs text-slate-400 group-hover:text-red-400">Remove</span>
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-black/70 p-3 sm:p-4 md:p-6 lg:p-8">

        <Suspense fallback={<div className="text-slate-400 p-4">Loading...</div>}>
          {activeTab === Tab.DASHBOARD && (
            <Dashboard 
              dailyData={dailySummaries} 
              exerciseStats={exerciseStats} 
              fullData={filteredData} 
              filtersSlot={filterControls}
              onDayClick={handleDayClick}
              onMuscleClick={handleMuscleClick}
              bodyMapGender={bodyMapGender}
              weightUnit={weightUnit}
            />
          )}
          {activeTab === Tab.EXERCISES && <ExerciseView stats={exerciseStats} filtersSlot={filterControls} highlightedExercise={highlightedExercise} weightUnit={weightUnit} bodyMapGender={bodyMapGender} />}
          {activeTab === Tab.HISTORY && <HistoryView data={filteredData} filtersSlot={filterControls} weightUnit={weightUnit} bodyMapGender={bodyMapGender} />}
          {activeTab === Tab.MUSCLE_ANALYSIS && (
            <MuscleAnalysis
              data={filteredData}
              filtersSlot={filterControls}
              onExerciseClick={handleExerciseClick}
              initialMuscle={initialMuscleForAnalysis}
              onInitialMuscleConsumed={() => setInitialMuscleForAnalysis(null)}
              bodyMapGender={bodyMapGender}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
};

export default App;
