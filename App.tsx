import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { parseWorkoutCSV, parseWorkoutCSVAsync } from './utils/csvParser';
import { getDailySummaries, getExerciseStats, identifyPersonalRecords } from './utils/analytics';
import { WorkoutSet } from './types';
import { DEFAULT_CSV_DATA } from './constants';
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const ExerciseView = React.lazy(() => import('./components/ExerciseView').then(m => ({ default: m.ExerciseView })));
const HistoryView = React.lazy(() => import('./components/HistoryView').then(m => ({ default: m.HistoryView })));
import { CSVImportModal } from './components/CSVImportModal';
import { saveCSVData, getCSVData, hasCSVData, clearCSVData } from './utils/localStorage';
import { LayoutDashboard, Dumbbell, History, Upload, BarChart3, Filter, Loader2, CheckCircle2, X, Trash2, Menu } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { trackPageView } from './utils/ga';

enum Tab {
  DASHBOARD = 'dashboard',
  EXERCISES = 'exercises',
  HISTORY = 'history'
}

const App: React.FC = () => {
  const [rawData, setRawData] = useState<string>(DEFAULT_CSV_DATA);
  const [parsedData, setParsedData] = useState<WorkoutSet[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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

  // Prefetch heavy views to avoid first-time lag when navigating
  useEffect(() => {
    const idle = (cb: () => void) => (('requestIdleCallback' in window) ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 300));
    idle(() => {
      import('./components/ExerciseView');
      import('./components/HistoryView');
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
      // 1. Specific Day Filter (Takes priority)
      if (selectedDay && d.parsedDate) {
        return isSameDay(d.parsedDate, selectedDay);
      }

      // 2. Month Filter
      let matchMonth = true;
      if (selectedMonth !== 'all' && d.parsedDate) {
        matchMonth = format(d.parsedDate, 'yyyy-MM') === selectedMonth;
      }

      return matchMonth;
    });
  }, [parsedData, selectedMonth, selectedDay]);

  const dailySummaries = useMemo(() => getDailySummaries(filteredData), [filteredData]);
  const exerciseStats = useMemo(() => getExerciseStats(filteredData), [filteredData]);

  // Handler for heatmap click
  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
    setActiveTab(Tab.HISTORY);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleModalFileSelect = (file: File) => {
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
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans">
      
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
      <header className="bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="px-4 sm:px-6 py-4 flex flex-col gap-4">
          {/* Top Row: Logo and Nav Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <img src="/HevyAnalytics.png" alt="HevyAnalytics Logo" className="w-7 h-7 sm:w-8 sm:h-8" decoding="async" />
              <span className="font-bold text-lg sm:text-xl tracking-tight text-white">HevyAnalytics</span>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <button 
                onClick={() => {
                  setActiveTab(Tab.DASHBOARD);
                  setSelectedDay(null);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === Tab.DASHBOARD ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab(Tab.EXERCISES);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === Tab.EXERCISES ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <Dumbbell className="w-5 h-5" />
                <span className="font-medium">Exercises</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab(Tab.HISTORY);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === Tab.HISTORY ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <History className="w-5 h-5" />
                <span className="font-medium">History</span>
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Action Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              <label className="cursor-pointer group flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-slate-600 hover:border-slate-400 hover:bg-slate-800/50 transition-all">
                <Upload className="w-4 h-4 text-slate-400 group-hover:text-white" />
                <span className="text-sm text-slate-400 group-hover:text-white">Import</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                onClick={handleClearCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-slate-600 hover:border-red-500 hover:bg-red-950/30 transition-all group"
              >
                <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
                <span className="text-sm text-slate-400 group-hover:text-red-400">Remove</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <nav className="md:hidden flex flex-col gap-2 border-t border-slate-800 pt-4 mt-2">
              <button 
                onClick={() => {
                  setActiveTab(Tab.DASHBOARD);
                  setSelectedDay(null);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 w-full text-left ${activeTab === Tab.DASHBOARD ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab(Tab.EXERCISES);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 w-full text-left ${activeTab === Tab.EXERCISES ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <Dumbbell className="w-5 h-5" />
                <span className="font-medium">Exercises</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab(Tab.HISTORY);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 w-full text-left ${activeTab === Tab.HISTORY ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <History className="w-5 h-5" />
                <span className="font-medium">History</span>
              </button>

              {/* Mobile Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800 mt-2">
                <label className="cursor-pointer group flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-slate-600 hover:border-slate-400 hover:bg-slate-800/50 transition-all">
                  <Upload className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  <span className="text-sm text-slate-400 group-hover:text-white">Import</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  onClick={handleClearCSV}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-slate-600 hover:border-red-500 hover:bg-red-950/30 transition-all group"
                >
                  <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
                  <span className="text-sm text-slate-400 group-hover:text-red-400">Remove</span>
                </button>
              </div>
            </nav>
          )}

          {/* Filter Controls Row */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {activeTab === Tab.DASHBOARD && 'Overview'}
                {activeTab === Tab.EXERCISES && 'Exercise Analytics'}
                {activeTab === Tab.HISTORY && 'Workout History'}
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                 {filteredData.length > 0 ? `Analyzing ${filteredData.length} sets based on filters.` : 'No data available for current filters.'}
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 shadow-sm items-start sm:items-center">
               <div className="flex items-center px-2">
                  <Filter className="w-4 h-4 text-slate-500 mr-2" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Filters</span>
               </div>
               
               {/* Specific Day Active Chip */}
               {selectedDay && (
                 <button 
                   onClick={() => setSelectedDay(null)}
                   className="flex items-center gap-2 bg-blue-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                 >
                   <span>{format(selectedDay, 'MMM d, yyyy')}</span>
                   <X className="w-3 h-3" />
                 </button>
               )}

               {/* Month Filter (Disabled if Day Selected to avoid confusion, or allowed but hidden) */}
               {!selectedDay && (
                 <select 
                   value={selectedMonth} 
                   onChange={(e) => setSelectedMonth(e.target.value)}
                   className="bg-slate-900 text-slate-200 text-xs sm:text-sm border border-slate-700 rounded-lg px-2 sm:px-3 py-2 focus:outline-none focus:border-blue-500 hover:border-slate-600 transition-colors cursor-pointer"
                 >
                   <option value="all">All Months</option>
                   {availableMonths.map(month => (
                     <option key={month} value={month}>
                       {format(new Date(month), 'MMMM yyyy')}
                     </option>
                   ))}
                 </select>
               )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-950 p-3 sm:p-4 md:p-6 lg:p-8">

        <Suspense fallback={<div className="text-slate-400 p-4">Loading...</div>}>
          {activeTab === Tab.DASHBOARD && (
            <Dashboard 
              dailyData={dailySummaries} 
              exerciseStats={exerciseStats} 
              fullData={filteredData} 
              onDayClick={handleDayClick}
            />
          )}
          {activeTab === Tab.EXERCISES && <ExerciseView stats={exerciseStats} />}
          {activeTab === Tab.HISTORY && <HistoryView data={filteredData} />}
        </Suspense>
      </main>
    </div>
  );
};

export default App;