import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WorkoutSet } from '../types';
import { BodyMap } from './BodyMap';
import { ViewHeader } from './ViewHeader';
import {
  loadExerciseMuscleData,
  calculateMuscleVolume,
  SVG_MUSCLE_NAMES,
  ExerciseMuscleData,
  MuscleVolumeEntry,
} from '../utils/muscleMapping';
import { getExerciseAssets, ExerciseAsset } from '../utils/exerciseAssets';
import { format, startOfWeek, startOfMonth, subWeeks, subMonths, isWithinInterval } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Dumbbell, X, Activity } from 'lucide-react';

interface MuscleAnalysisProps {
  data: WorkoutSet[];
  filtersSlot?: React.ReactNode;
}

type TrendPeriod = 'all' | 'weekly' | 'monthly';

export const MuscleAnalysis: React.FC<MuscleAnalysisProps> = ({ data, filtersSlot }) => {
  const [exerciseMuscleData, setExerciseMuscleData] = useState<Map<string, ExerciseMuscleData>>(new Map());
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  const [muscleVolume, setMuscleVolume] = useState<Map<string, MuscleVolumeEntry>>(new Map());
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('monthly');

  // Load exercise muscle data and assets on mount
  useEffect(() => {
    loadExerciseMuscleData().then(loadedData => {
      setExerciseMuscleData(loadedData);
      setIsLoading(false);
    });
    getExerciseAssets()
      .then(m => setAssetsMap(m))
      .catch(() => setAssetsMap(new Map()));
  }, []);

  // Calculate muscle volumes whenever data or exerciseMuscleData changes
  useEffect(() => {
    if (exerciseMuscleData.size === 0 || data.length === 0) {
      setMuscleVolume(new Map());
      return;
    }
    calculateMuscleVolume(data, exerciseMuscleData).then(setMuscleVolume);
  }, [data, exerciseMuscleData]);

  // Get volumes for heatmap - stable reference
  const muscleVolumes = useMemo(() => {
    const volumes = new Map<string, number>();
    muscleVolume.forEach((entry, muscleId) => {
      volumes.set(muscleId, entry.sets);
    });
    return volumes;
  }, [muscleVolume]);

  // Max volume for scaling
  const maxVolume = useMemo(() => {
    let max = 0;
    muscleVolumes.forEach(v => { if (v > max) max = v; });
    return Math.max(max, 1);
  }, [muscleVolumes]);

  // Selected muscle data
  const selectedMuscleData = useMemo(() => {
    if (!selectedMuscle) return null;
    return muscleVolume.get(selectedMuscle) || null;
  }, [selectedMuscle, muscleVolume]);

  // Trend data based on selected period
  const trendData = useMemo(() => {
    if (!selectedMuscle || exerciseMuscleData.size === 0 || data.length === 0) return [];
    
    const CSV_TO_SVG: Record<string, string[]> = {
      'Abdominals': ['abdominals'], 'Abductors': ['glutes'], 'Adductors': ['quads'],
      'Biceps': ['biceps'], 'Calves': ['calves'], 'Chest': ['chest'],
      'Forearms': ['forearms'], 'Glutes': ['glutes'], 'Hamstrings': ['hamstrings'],
      'Lats': ['lats'], 'Lower Back': ['lowerback'], 'Neck': ['traps'],
      'Quadriceps': ['quads'], 'Shoulders': ['front-shoulders', 'rear-shoulders'],
      'Traps': ['traps', 'traps-middle'], 'Triceps': ['triceps'],
      'Upper Back': ['lats', 'traps-middle', 'rear-shoulders'], 'Obliques': ['obliques'],
    };

    // For 'all' mode, show each day's data
    if (trendPeriod === 'all') {
      const dayMap = new Map<string, { label: string; ts: number; sets: number }>();
      
      for (const set of data) {
        if (!set.parsedDate || !set.exercise_title) continue;
        const exData = exerciseMuscleData.get(set.exercise_title.toLowerCase());
        if (!exData) continue;
        
        const primaryMuscle = exData.primary_muscle;
        if (primaryMuscle === 'Cardio') continue;
        
        const dayKey = format(set.parsedDate, 'yyyy-MM-dd');
        if (!dayMap.has(dayKey)) {
          dayMap.set(dayKey, { 
            label: format(set.parsedDate, 'MMM d'), 
            ts: set.parsedDate.getTime(),
            sets: 0 
          });
        }
        
        const day = dayMap.get(dayKey)!;
        const primarySvgIds = CSV_TO_SVG[primaryMuscle] || [];
        if (primarySvgIds.includes(selectedMuscle)) {
          day.sets += 1;
        }
        
        const secondaryMuscles = exData.secondary_muscle.split(',').map(m => m.trim()).filter(m => m && m !== 'None');
        for (const secondary of secondaryMuscles) {
          const secondarySvgIds = CSV_TO_SVG[secondary] || [];
          if (secondarySvgIds.includes(selectedMuscle)) {
            day.sets += 0.5;
          }
        }
      }
      
      return Array.from(dayMap.values())
        .sort((a, b) => a.ts - b.ts)
        .map(d => ({ period: d.label, sets: Math.round(d.sets * 10) / 10 }));
    }
    
    // For weekly/monthly, aggregate by period
    const periodMap = new Map<string, { label: string; ts: number; sets: number }>();
    
    for (const set of data) {
      if (!set.parsedDate || !set.exercise_title) continue;
      const exData = exerciseMuscleData.get(set.exercise_title.toLowerCase());
      if (!exData) continue;
      
      const primaryMuscle = exData.primary_muscle;
      if (primaryMuscle === 'Cardio') continue;
      
      let periodKey: string;
      let periodLabel: string;
      let periodTs: number;
      
      if (trendPeriod === 'weekly') {
        const weekStart = startOfWeek(set.parsedDate, { weekStartsOn: 1 });
        periodKey = format(weekStart, 'yyyy-ww');
        periodLabel = format(weekStart, 'MMM d');
        periodTs = weekStart.getTime();
      } else {
        const monthStart = startOfMonth(set.parsedDate);
        periodKey = format(monthStart, 'yyyy-MM');
        periodLabel = format(monthStart, 'MMM yyyy');
        periodTs = monthStart.getTime();
      }
      
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, { label: periodLabel, ts: periodTs, sets: 0 });
      }
      
      const period = periodMap.get(periodKey)!;
      const primarySvgIds = CSV_TO_SVG[primaryMuscle] || [];
      if (primarySvgIds.includes(selectedMuscle)) {
        period.sets += 1;
      }
      
      const secondaryMuscles = exData.secondary_muscle.split(',').map(m => m.trim()).filter(m => m && m !== 'None');
      for (const secondary of secondaryMuscles) {
        const secondarySvgIds = CSV_TO_SVG[secondary] || [];
        if (secondarySvgIds.includes(selectedMuscle)) {
          period.sets += 0.5;
        }
      }
    }
    
    return Array.from(periodMap.values())
      .sort((a, b) => a.ts - b.ts)
      .map(d => ({ period: d.label, sets: Math.round(d.sets * 10) / 10 }));
  }, [selectedMuscle, data, exerciseMuscleData, trendPeriod]);

  // Contributing exercises
  const contributingExercises = useMemo(() => {
    if (!selectedMuscleData) return [];
    const exercises: Array<{ name: string; sets: number; primarySets: number; secondarySets: number }> = [];
    selectedMuscleData.exercises.forEach((exData, name) => {
      exercises.push({ name, ...exData });
    });
    return exercises.sort((a, b) => b.sets - a.sets).slice(0, 8);
  }, [selectedMuscleData]);

  // Total sets for the period
  const totalSets = useMemo(() => {
    let total = 0;
    muscleVolume.forEach(entry => { total += entry.sets; });
    return Math.round(total);
  }, [muscleVolume]);

  // Muscles worked count
  const musclesWorked = useMemo(() => {
    let count = 0;
    muscleVolume.forEach(entry => { if (entry.sets > 0) count++; });
    return count;
  }, [muscleVolume]);

  // Stable callbacks
  const handleMuscleClick = useCallback((muscleId: string) => {
    setSelectedMuscle(prev => prev === muscleId ? null : muscleId);
  }, []);

  const handleMuscleHover = useCallback((muscleId: string | null) => {
    setHoveredMuscle(muscleId);
  }, []);

  const closePanel = useCallback(() => {
    setSelectedMuscle(null);
  }, []);

  // Color legend component for right slot
  const colorLegend = (
    <div className="flex items-center gap-3 text-xs text-slate-400">
      <div className="flex items-center gap-1">
        <div className="w-3 h-2 rounded" style={{ backgroundColor: '#64748b' }}></div>
        <span>None</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-2 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
        <span>Low</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-2 rounded" style={{ backgroundColor: '#b45309' }}></div>
        <span>Med</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-2 rounded" style={{ backgroundColor: '#78350f' }}></div>
        <span>High</span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Loading muscle data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-slate-400 mb-2">No workout data for current filter</div>
        <div className="text-slate-500 text-sm">Try adjusting your date filter to see muscle analysis</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - consistent with Dashboard */}
      <ViewHeader
        stats={[
          { icon: Activity, value: totalSets, label: 'Total Sets' },
          { icon: Dumbbell, value: musclesWorked, label: 'Muscles' },
        ]}
        filtersSlot={filtersSlot}
        rightSlot={colorLegend}
      />

      {/* Main Content - Side by Side Layout */}
      <div className={`grid gap-6 transition-all duration-300 ${selectedMuscle ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Body Map Section */}
        <div className={`bg-slate-900 rounded-xl border border-slate-800 p-4 transition-all duration-300 relative ${selectedMuscle ? '' : 'max-w-4xl mx-auto w-full'}`}>
          <BodyMap
            onPartClick={handleMuscleClick}
            selectedPart={selectedMuscle}
            muscleVolumes={muscleVolumes}
            maxVolume={maxVolume}
            onPartHover={handleMuscleHover}
          />
          
          {/* Hover Tooltip */}
          {hoveredMuscle && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 shadow-xl pointer-events-none z-20">
              <div className="text-white font-medium text-sm">{SVG_MUSCLE_NAMES[hoveredMuscle]}</div>
              <div className="text-amber-500 text-xs text-center">
                {Math.round((muscleVolumes.get(hoveredMuscle) || 0) * 10) / 10} sets
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedMuscle && selectedMuscleData && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {/* Panel Header */}
            <div className="bg-slate-800/50 border-b border-slate-800 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {SVG_MUSCLE_NAMES[selectedMuscle]}
              </h2>
              <button
                onClick={closePanel}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-350px)]">
              {/* Volume Summary */}
              <div className="bg-slate-800/30 rounded-xl p-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-amber-500">
                    {Math.round(selectedMuscleData.sets * 10) / 10}
                  </div>
                  <div className="text-slate-400 text-sm mt-1">
                    sets in current filter
                  </div>
                </div>
              </div>

              {/* Trend Chart with Period Toggle */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-white">Volume Trend</h3>
                  </div>
                  {/* Period Toggle */}
                  <div className="inline-flex bg-slate-800 rounded-lg p-0.5">
                    {(['all', 'weekly', 'monthly'] as const).map(period => (
                      <button
                        key={period}
                        onClick={() => setTrendPeriod(period)}
                        className={`px-2 py-1 rounded text-[10px] font-medium transition-all capitalize ${
                          trendPeriod === period
                            ? 'bg-amber-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-36 bg-slate-800/30 rounded-lg p-2">
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="muscleColorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="period" 
                          tick={{ fill: '#64748b', fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: '#f1f5f9' }}
                          formatter={(value: number) => [`${value} sets`, '']}
                        />
                        <Area
                          type="monotone"
                          dataKey="sets"
                          stroke="#d97706"
                          strokeWidth={2}
                          fill="url(#muscleColorGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                      No data for this period
                    </div>
                  )}
                </div>
              </div>

              {/* Contributing Exercises */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Dumbbell className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-white">Top Exercises</h3>
                </div>
                <div className="space-y-2">
                  {contributingExercises.map((ex, i) => {
                    const asset = assetsMap?.get(ex.name);
                    const imgUrl = asset?.sourceType === 'video' ? asset.thumbnail : (asset?.thumbnail || asset?.source);
                    
                    return (
                      <div 
                        key={ex.name}
                        className="flex items-center gap-3 py-2 px-3 bg-slate-800/30 rounded-lg"
                      >
                        <span className="text-xs font-bold text-slate-500 w-4">
                          {i + 1}
                        </span>
                        {/* Exercise Image */}
                        {imgUrl ? (
                          <img 
                            src={imgUrl} 
                            alt="" 
                            className="w-8 h-8 rounded object-cover flex-shrink-0 border border-slate-700" 
                            loading="lazy" 
                            decoding="async"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0 border border-slate-700">
                            <Dumbbell className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{ex.name}</div>
                          <div className="text-xs text-slate-500">
                            {ex.primarySets > 0 && <span className="text-amber-500">{ex.primarySets} primary</span>}
                            {ex.primarySets > 0 && ex.secondarySets > 0 && ' · '}
                            {ex.secondarySets > 0 && <span className="text-amber-700">{ex.secondarySets} secondary</span>}
                          </div>
                        </div>
                        <div className="text-lg font-bold text-amber-500">
                          {Math.round(ex.sets * 10) / 10}
                        </div>
                      </div>
                    );
                  })}
                  {contributingExercises.length === 0 && (
                    <div className="text-center text-slate-500 py-4">
                      No exercises found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
