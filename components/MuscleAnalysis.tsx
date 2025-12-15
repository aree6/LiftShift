import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WorkoutSet } from '../types';
import { BodyMap, BodyMapGender } from './BodyMap';
import { ViewHeader } from './ViewHeader';
import {
  loadExerciseMuscleData,
  calculateMuscleVolume,
  SVG_MUSCLE_NAMES,
  CSV_TO_SVG_MUSCLE_MAP,
  ExerciseMuscleData,
  MuscleVolumeEntry,
  getExerciseMuscleVolumes,
  getVolumeColor,
} from '../utils/muscleMapping';
import { getExerciseAssets, ExerciseAsset } from '../utils/exerciseAssets';
import { format, startOfWeek, startOfMonth, subWeeks, subMonths, isWithinInterval } from 'date-fns';
import { formatDayContraction, formatWeekContraction, formatMonthYearContraction } from '../utils/dateUtils';
import { getSmartFilterMode, TimeFilterMode } from '../utils/localStorage';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Dumbbell, X, Activity, Layers, PersonStanding, BicepsFlexed } from 'lucide-react';
import { normalizeMuscleGroup, NormalizedMuscleGroup } from '../utils/muscleAnalytics';
import { LazyRender } from './LazyRender';
import { ChartSkeleton } from './ChartSkeleton';
import { Tooltip as HoverTooltip, TooltipData } from './Tooltip';
import {
  SVG_TO_MUSCLE_GROUP,
  MUSCLE_GROUP_ORDER,
  getSvgIdsForGroup,
  getGroupForSvgId,
  QuickFilterCategory,
  QUICK_FILTER_LABELS,
  QUICK_FILTER_GROUPS,
  getSvgIdsForQuickFilter,
} from '../utils/muscleMappingConstants';

interface MuscleAnalysisProps {
  data: WorkoutSet[];
  filtersSlot?: React.ReactNode;
  onExerciseClick?: (exerciseName: string) => void;
  initialMuscle?: { muscleId: string; viewMode: 'muscle' | 'group' } | null;
  onInitialMuscleConsumed?: () => void;
  bodyMapGender?: BodyMapGender;
}

type TrendPeriod = 'all' | 'weekly' | 'monthly';
type ViewMode = 'muscle' | 'group';

/** Alias to centralized constant for backward compatibility within this file */
const MUSCLE_GROUP_DISPLAY = SVG_TO_MUSCLE_GROUP;

export const MuscleAnalysis: React.FC<MuscleAnalysisProps> = ({ data, filtersSlot, onExerciseClick, initialMuscle, onInitialMuscleConsumed, bodyMapGender = 'male' }) => {
  const [exerciseMuscleData, setExerciseMuscleData] = useState<Map<string, ExerciseMuscleData>>(new Map());
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  const [muscleVolume, setMuscleVolume] = useState<Map<string, MuscleVolumeEntry>>(new Map());
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);
  const [trendPeriodOverride, setTrendPeriodOverride] = useState<TrendPeriod | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('muscle');
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterCategory | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<TooltipData | null>(null);

  // Calculate date range span for smart filter
  const spanDays = useMemo(() => {
    const dates: number[] = [];
    for (const s of data) {
      if (s.parsedDate) dates.push(s.parsedDate.getTime());
    }
    if (dates.length === 0) return 0;
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    return Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1);
  }, [data]);

  // Smart mode based on date range span
  const smartMode = useMemo(() => getSmartFilterMode(spanDays), [spanDays]);

  // Reset override when smart mode changes (new filter applied)
  useEffect(() => {
    setTrendPeriodOverride(null);
  }, [smartMode]);

  // Effective trend period: override if set, otherwise smart mode
  const trendPeriod = trendPeriodOverride ?? smartMode;
  const setTrendPeriod = setTrendPeriodOverride;

  const getChipTextColor = useCallback((sets: number, maxSets: number): string => {
    const ratio = sets / Math.max(maxSets, 1);
    return ratio >= 0.55 ? '#ffffff' : '#0f172a';
  }, []);

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

  // Apply initial muscle selection from dashboard navigation
  useEffect(() => {
    if (initialMuscle && !isLoading) {
      setViewMode(initialMuscle.viewMode);
      if (initialMuscle.viewMode === 'group') {
        // For group mode, get the group name from the muscle ID
        const group = MUSCLE_GROUP_DISPLAY[initialMuscle.muscleId];
        if (group && group !== 'Other') {
          setSelectedMuscle(group);
        }
      } else {
        setSelectedMuscle(initialMuscle.muscleId);
      }
      onInitialMuscleConsumed?.();
    }
  }, [initialMuscle, isLoading, onInitialMuscleConsumed]);

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

  // Aggregated muscle group volumes
  const muscleGroupVolumes = useMemo(() => {
    const groupVolumes = new Map<NormalizedMuscleGroup, number>();
    MUSCLE_GROUP_ORDER.forEach(g => groupVolumes.set(g, 0));
    
    muscleVolume.forEach((entry, svgId) => {
      const group = MUSCLE_GROUP_DISPLAY[svgId];
      if (group && group !== 'Other') {
        const current = groupVolumes.get(group) || 0;
        groupVolumes.set(group, current + entry.sets);
      }
    });
    
    return groupVolumes;
  }, [muscleVolume]);

  // Max group volume for scaling
  const maxGroupVolume = useMemo(() => {
    let max = 0;
    muscleGroupVolumes.forEach(v => { if (v > max) max = v; });
    return Math.max(max, 1);
  }, [muscleGroupVolumes]);

  // Body map volumes for group view - each muscle gets its group's total volume
  const groupedBodyMapVolumes = useMemo(() => {
    const volumes = new Map<string, number>();
    Object.entries(MUSCLE_GROUP_DISPLAY).forEach(([svgId, group]) => {
      if (group !== 'Other') {
        volumes.set(svgId, muscleGroupVolumes.get(group) || 0);
      }
    });
    return volumes;
  }, [muscleGroupVolumes]);

  // Selected group data (when in group view mode)
  const selectedGroupData = useMemo(() => {
    if (viewMode !== 'group' || !selectedMuscle) return null;
    const group = selectedMuscle as NormalizedMuscleGroup;
    if (!MUSCLE_GROUP_ORDER.includes(group)) return null;
    
    const sets = muscleGroupVolumes.get(group) || 0;
    // Aggregate exercises from all muscles in this group
    const exerciseMap = new Map<string, { sets: number; primarySets: number; secondarySets: number }>();
    
    muscleVolume.forEach((entry, svgId) => {
      if (MUSCLE_GROUP_DISPLAY[svgId] === group) {
        entry.exercises.forEach((exData, exName) => {
          const existing = exerciseMap.get(exName) || { sets: 0, primarySets: 0, secondarySets: 0 };
          existing.sets += exData.sets;
          existing.primarySets += exData.primarySets;
          existing.secondarySets += exData.secondarySets;
          exerciseMap.set(exName, existing);
        });
      }
    });
    
    return { sets, exercises: exerciseMap };
  }, [viewMode, selectedMuscle, muscleGroupVolumes, muscleVolume]);

  // Selected muscle data
  const selectedMuscleData = useMemo(() => {
    if (!selectedMuscle) return null;
    return muscleVolume.get(selectedMuscle) || null;
  }, [selectedMuscle, muscleVolume]);

  // Quick filter data - aggregates exercises from all muscles in the quick filter category
  const quickFilterData = useMemo(() => {
    if (!activeQuickFilter) return null;
    
    const filterSvgIds = new Set(getSvgIdsForQuickFilter(activeQuickFilter));
    let totalSets = 0;
    const exerciseMap = new Map<string, { sets: number; primarySets: number; secondarySets: number }>();
    
    muscleVolume.forEach((entry, svgId) => {
      if (filterSvgIds.has(svgId)) {
        totalSets += entry.sets;
        entry.exercises.forEach((exData, exName) => {
          const existing = exerciseMap.get(exName) || { sets: 0, primarySets: 0, secondarySets: 0 };
          existing.sets += exData.sets;
          existing.primarySets += exData.primarySets;
          existing.secondarySets += exData.secondarySets;
          exerciseMap.set(exName, existing);
        });
      }
    });
    
    return { sets: totalSets, exercises: exerciseMap };
  }, [activeQuickFilter, muscleVolume]);

  // Helper to check if SVG IDs match the target (handles both muscle and group mode)
  const matchesTarget = useCallback((svgIds: string[], target: string | null, isGroupMode: boolean): boolean => {
    if (!target) return true;
    if (isGroupMode) {
      // In group mode, check if any SVG ID belongs to the target group
      return svgIds.some(svgId => MUSCLE_GROUP_DISPLAY[svgId] === target);
    }
    // In muscle mode, check if target SVG ID is in the list
    return svgIds.includes(target);
  }, []);

  // Trend data based on selected period (for specific muscle OR all muscles)
  const trendData = useMemo(() => {
    if (exerciseMuscleData.size === 0 || data.length === 0) return [];
    
    const targetMuscle = selectedMuscle;
    const isGroupMode = viewMode === 'group';
    const quickFilterSvgIds = activeQuickFilter ? new Set(getSvgIdsForQuickFilter(activeQuickFilter)) : null;
    const matchesQuickFilter = (svgIds: string[]) => {
      if (!quickFilterSvgIds) return true;
      return svgIds.some(id => quickFilterSvgIds.has(id));
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
            label: formatDayContraction(set.parsedDate), 
            ts: set.parsedDate.getTime(),
            sets: 0 
          });
        }
        
        const day = dayMap.get(dayKey)!;
        const primarySvgIds = CSV_TO_SVG_MUSCLE_MAP[primaryMuscle] || [];
        
        // If no muscle selected, count all sets; otherwise filter by selected muscle/group
        if (quickFilterSvgIds) {
          if (matchesQuickFilter(primarySvgIds)) day.sets += 1;
        } else if (!targetMuscle) {
          day.sets += 1;
        } else if (matchesTarget(primarySvgIds, targetMuscle, isGroupMode)) {
          day.sets += 1;
        }
        
        const secondaryMuscles = exData.secondary_muscle.split(',').map(m => m.trim()).filter(m => m && m !== 'None');
        for (const secondary of secondaryMuscles) {
          const secondarySvgIds = CSV_TO_SVG_MUSCLE_MAP[secondary] || [];
          if (quickFilterSvgIds) {
            if (matchesQuickFilter(secondarySvgIds)) day.sets += 0.5;
          } else if (!targetMuscle) {
            day.sets += 0.5;
          } else if (matchesTarget(secondarySvgIds, targetMuscle, isGroupMode)) {
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
        periodLabel = formatWeekContraction(weekStart);
        periodTs = weekStart.getTime();
      } else {
        const monthStart = startOfMonth(set.parsedDate);
        periodKey = format(monthStart, 'yyyy-MM');
        periodLabel = formatMonthYearContraction(monthStart);
        periodTs = monthStart.getTime();
      }
      
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, { label: periodLabel, ts: periodTs, sets: 0 });
      }
      
      const period = periodMap.get(periodKey)!;
      const primarySvgIds = CSV_TO_SVG_MUSCLE_MAP[primaryMuscle] || [];
      
      // If no muscle selected, count all sets; otherwise filter by selected muscle/group
      if (quickFilterSvgIds) {
        if (matchesQuickFilter(primarySvgIds)) period.sets += 1;
      } else if (!targetMuscle) {
        period.sets += 1;
      } else if (matchesTarget(primarySvgIds, targetMuscle, isGroupMode)) {
        period.sets += 1;
      }
      
      const secondaryMuscles = exData.secondary_muscle.split(',').map(m => m.trim()).filter(m => m && m !== 'None');
      for (const secondary of secondaryMuscles) {
        const secondarySvgIds = CSV_TO_SVG_MUSCLE_MAP[secondary] || [];
        if (quickFilterSvgIds) {
          if (matchesQuickFilter(secondarySvgIds)) period.sets += 0.5;
        } else if (!targetMuscle) {
          period.sets += 0.5;
        } else if (matchesTarget(secondarySvgIds, targetMuscle, isGroupMode)) {
          period.sets += 0.5;
        }
      }
    }
    
    return Array.from(periodMap.values())
      .sort((a, b) => a.ts - b.ts)
      .map(d => ({ period: d.label, sets: Math.round(d.sets * 10) / 10 }));
  }, [selectedMuscle, data, exerciseMuscleData, trendPeriod, viewMode, matchesTarget, activeQuickFilter]);

  // Volume delta calculation - compare current vs previous period
  const volumeDelta = useMemo(() => {
    if (trendData.length < 2) return null;
    
    const current = Number((trendData[trendData.length - 1]?.sets || 0).toFixed(1));
    const previous = Number((trendData[trendData.length - 2]?.sets || 0).toFixed(1));
    
    if (previous === 0) return null;
    
    const delta = Number((current - previous).toFixed(1));
    const deltaPercent = Math.round((delta / previous) * 100);
    
    return {
      current,
      previous,
      delta,
      deltaPercent,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'same' as 'up' | 'down' | 'same',
    };
  }, [trendData]);

  // Contributing exercises (works for muscle, group, and quick filter views)
  const contributingExercises = useMemo(() => {
    // Quick filter takes precedence
    if (quickFilterData) {
      const exercises: Array<{ name: string; sets: number; primarySets: number; secondarySets: number }> = [];
      quickFilterData.exercises.forEach((exData, name) => {
        exercises.push({ name, ...exData });
      });
      return exercises.sort((a, b) => b.sets - a.sets).slice(0, 8);
    }
    if (viewMode === 'group' && selectedGroupData) {
      const exercises: Array<{ name: string; sets: number; primarySets: number; secondarySets: number }> = [];
      selectedGroupData.exercises.forEach((exData, name) => {
        exercises.push({ name, ...exData });
      });
      return exercises.sort((a, b) => b.sets - a.sets).slice(0, 8);
    }
    if (!selectedMuscleData) return [];
    const exercises: Array<{ name: string; sets: number; primarySets: number; secondarySets: number }> = [];
    selectedMuscleData.exercises.forEach((exData, name) => {
      exercises.push({ name, ...exData });
    });
    return exercises.sort((a, b) => b.sets - a.sets).slice(0, 8);
  }, [selectedMuscleData, selectedGroupData, viewMode, quickFilterData]);

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
    // Clear quick filter when clicking a specific muscle
    setActiveQuickFilter(null);
    if (viewMode === 'group') {
      // In group view, clicking a muscle selects its group
      const group = MUSCLE_GROUP_DISPLAY[muscleId] || muscleId;
      if (group === 'Other') return;
      setSelectedMuscle(prev => prev === group ? null : group);
    } else {
      setSelectedMuscle(prev => prev === muscleId ? null : muscleId);
    }
  }, [viewMode]);

  const handleMuscleHover = useCallback((muscleId: string | null, e?: MouseEvent) => {
    setHoveredMuscle(muscleId);
    if (!muscleId || !e) {
      setHoverTooltip(null);
      return;
    }

    const target = e.target as Element | null;
    const groupEl = target?.closest?.('g[id]') as Element | null;
    const rect = groupEl?.getBoundingClientRect?.() as DOMRect | undefined;
    if (!rect) {
      setHoverTooltip(null);
      return;
    }

    // Compute tooltip content inline (avoid relying on hoveredTooltipMeta which is async)
    if (viewMode === 'group') {
      const groupName = MUSCLE_GROUP_DISPLAY[muscleId];
      if (!groupName || groupName === 'Other') {
        setHoverTooltip(null);
        return;
      }
      const sets = muscleGroupVolumes.get(groupName as any) || 0;
      setHoverTooltip({
        rect,
        title: groupName,
        body: `${Math.round(sets * 10) / 10} sets`,
        status: sets > 0 ? 'success' : 'default',
      });
      return;
    }

    const sets = muscleVolumes.get(muscleId) || 0;
    setHoverTooltip({
      rect,
      title: SVG_MUSCLE_NAMES[muscleId] ?? muscleId,
      body: `${Math.round(sets * 10) / 10} sets`,
      status: sets > 0 ? 'success' : 'default',
    });
  }, [muscleGroupVolumes, muscleVolumes, viewMode]);

  const selectedBodyMapIds = useMemo(() => {
    // Quick filter takes precedence for highlighting (works in both view modes)
    if (activeQuickFilter) {
      return [...getSvgIdsForQuickFilter(activeQuickFilter)];
    }
    if (!selectedMuscle) return undefined;
    if (viewMode === 'muscle') return undefined;

    const group = selectedMuscle as NormalizedMuscleGroup;
    if (!MUSCLE_GROUP_ORDER.includes(group)) return undefined;

    return [...getSvgIdsForGroup(group)];
  }, [selectedMuscle, viewMode, activeQuickFilter]);

  const hoveredBodyMapIds = useMemo(() => {
    if (!hoveredMuscle) return undefined;
    if (viewMode === 'muscle') return undefined;

    const group = getGroupForSvgId(hoveredMuscle);
    if (group === 'Other') return undefined;

    return [...getSvgIdsForGroup(group)];
  }, [hoveredMuscle, viewMode]);

  const hoveredTooltipMeta = useMemo(() => {
    if (!hoveredMuscle) return null;

    if (viewMode === 'group') {
      const groupName = MUSCLE_GROUP_DISPLAY[hoveredMuscle];
      const sets = muscleGroupVolumes.get(groupName as any) || 0;
      const accent = getVolumeColor(sets, maxGroupVolume);
      return {
        name: groupName,
        sets,
        accent,
      };
    }

    const sets = muscleVolumes.get(hoveredMuscle) || 0;
    const accent = getVolumeColor(sets, maxVolume);
    return {
      name: SVG_MUSCLE_NAMES[hoveredMuscle],
      sets,
      accent,
    };
  }, [hoveredMuscle, viewMode, muscleGroupVolumes, muscleVolumes, maxGroupVolume, maxVolume]);

  const closePanel = useCallback(() => {
    setSelectedMuscle(null);
  }, []);

  // Clear selection when switching view modes
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setSelectedMuscle(null);
    setActiveQuickFilter(null);
    setViewMode(mode);
  }, []);

  // Handle quick filter click - auto-select muscles in category
  const handleQuickFilterClick = useCallback((category: QuickFilterCategory) => {
    if (activeQuickFilter === category) {
      setActiveQuickFilter(null);
    } else {
      // Switch to muscle view when selecting a quick filter (quick filters work on individual muscles)
      if (viewMode === 'group') {
        setViewMode('muscle');
      }
      setActiveQuickFilter(category);
      setSelectedMuscle(null);
    }
  }, [activeQuickFilter, viewMode]);

  // SVG IDs to highlight based on active quick filter
  const quickFilterHighlightIds = useMemo(() => {
    if (!activeQuickFilter) return undefined;
    return [...getSvgIdsForQuickFilter(activeQuickFilter)];
  }, [activeQuickFilter]);

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
    <div className="space-y-2">
      {/* Header - consistent with Dashboard */}
      <div className="hidden sm:block">
        <ViewHeader
          leftStats={[{ icon: Activity, value: totalSets, label: 'Total Sets' }]}
          rightStats={[{ icon: Dumbbell, value: musclesWorked, label: 'Muscles' }]}
          filtersSlot={filtersSlot}
          rightSlot={null}
        />
      </div>

      {/* Main Content - Always Side by Side Layout */}
      <div className="grid gap-2 grid-cols-1 lg:grid-cols-2">
        {/* Left: Body Map */}
        <div className="bg-black/70 rounded-xl border border-slate-700/50 p-4 relative">
          {/* Top Bar: Quick Filters (left) + View Mode Toggle (right) */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
            {/* Quick Filters - Left side */}
            <div className="flex items-center gap-1 bg-black/70 rounded-lg p-1 shadow-lg border border-slate-700/50">
              {QUICK_FILTER_GROUPS.map((group, gi) => (
                <div key={group.label} className="flex items-center">
                  {gi > 0 && <div className="w-px h-4 bg-slate-700/50 mx-0.5" />}
                  {group.filters.map(filter => (
                    <button
                      key={filter}
                      onClick={() => handleQuickFilterClick(filter)}
                      title={QUICK_FILTER_LABELS[filter]}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                        activeQuickFilter === filter
                          ? 'bg-red-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* View Mode Toggle - Right side */}
            <div className="inline-flex bg-black/70 rounded-lg p-0.5 shadow-lg border border-slate-700/50">
              <button
                onClick={() => handleViewModeChange('muscle')}
                title="Muscle"
                aria-label="Muscle"
                className={`w-8 h-7 flex items-center justify-center rounded text-xs font-medium transition-all ${
                  viewMode === 'muscle'
                    ? 'bg-red-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BicepsFlexed className="w-3.5 h-3.5" />
                <span className="sr-only">Muscle</span>
              </button>
              <button
                onClick={() => handleViewModeChange('group')}
                title="Group"
                aria-label="Group"
                className={`w-8 h-7 flex items-center justify-center rounded text-xs font-medium transition-all ${
                  viewMode === 'group'
                    ? 'bg-red-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PersonStanding className="w-3.5 h-3.5 scale-[1.3]" />
                <span className="sr-only">Group</span>
              </button>
            </div>
          </div>

          <div className="transform scale-[0.8] origin-middle mt-8">
            <BodyMap
              onPartClick={handleMuscleClick}
              selectedPart={selectedMuscle}
              selectedMuscleIdsOverride={selectedBodyMapIds}
              hoveredMuscleIdsOverride={hoveredBodyMapIds}
              muscleVolumes={viewMode === 'group' ? groupedBodyMapVolumes : muscleVolumes}
              maxVolume={viewMode === 'group' ? maxGroupVolume : maxVolume}
              onPartHover={handleMuscleHover}
              gender={bodyMapGender}
              viewMode={viewMode}
            />
          </div>
          
          {/* Color Legend - Bottom of body map */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-3 text-xs text-slate-400 bg-black/70 rounded-lg px-3 py-1.5 border border-slate-700/50">
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 rounded border border-slate-600" style={{ backgroundColor: 'hsla(0, 0%, 100%, 0.1)' }}></div>
                <span>None</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 rounded" style={{ backgroundColor: 'hsl(5, 75%, 75%)' }}></div>
                <span>Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 rounded" style={{ backgroundColor: 'hsl(5, 75%, 50%)' }}></div>
                <span>Med</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 rounded" style={{ backgroundColor: 'hsl(5, 75%, 25%)' }}></div>
                <span>High</span>
              </div>
            </div>
          </div>

          {/* Hover Tooltip */}
          {hoverTooltip && <HoverTooltip data={hoverTooltip} />}
        </div>

        {/* Right: Detail Panel - Always visible */}
        <div className="bg-black/70 rounded-xl border border-slate-700/50 overflow-hidden">
          {/* Panel Header */}
          <div className="bg-black/70 border-b border-slate-700/50 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h2 className="text-lg font-bold text-white truncate">
                {activeQuickFilter
                  ? QUICK_FILTER_LABELS[activeQuickFilter]
                  : selectedMuscle 
                    ? (viewMode === 'group' ? selectedMuscle : SVG_MUSCLE_NAMES[selectedMuscle]) 
                    : (viewMode === 'group' ? 'All Groups' : 'All Muscles')}
              </h2>
              <span
                className="text-red-400 text-sm font-semibold whitespace-nowrap"
                title={activeQuickFilter || selectedMuscle ? 'sets in current filter' : 'total sets across all muscles'}
              >
                {activeQuickFilter
                  ? (quickFilterData ? Math.round(quickFilterData.sets * 10) / 10 : 0)
                  : selectedMuscle
                    ? (viewMode === 'group' && selectedGroupData
                        ? Math.round(selectedGroupData.sets * 10) / 10
                        : selectedMuscleData
                          ? Math.round(selectedMuscleData.sets * 10) / 10
                          : 0)
                    : totalSets}{' '}
                <span className="text-slate-400 text-xs font-normal">sets</span>
              </span>
              {/* Volume Delta Badge */}
              {volumeDelta && volumeDelta.direction !== 'same' && (
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  volumeDelta.direction === 'up' 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {volumeDelta.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {volumeDelta.direction === 'up' ? '+' : ''}{volumeDelta.deltaPercent}% vs prev {trendPeriod === 'weekly' ? 'wk' : trendPeriod === 'monthly' ? 'mo' : 'day'}
                </span>
              )}
            </div>
            {(selectedMuscle || activeQuickFilter) && (
              <button
                onClick={() => { setSelectedMuscle(null); setActiveQuickFilter(null); }}
                className="p-1.5 hover:bg-black/60 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>

          {/* Fixed content area */}
          <div className="p-3 space-y-3">
            {/* Trend Chart with Period Toggle */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-white">Total sets</h3>
                </div>
                {/* Period Toggle */}
                <div className="inline-flex bg-black/70 rounded-lg p-0.5 border border-slate-700/50">
                  {(['all', 'weekly', 'monthly'] as const).map(period => (
                    <button
                      key={period}
                      onClick={() => setTrendPeriod(period)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-all capitalize ${
                        trendPeriod === period
                          ? 'bg-red-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {period === 'all' ? 'all' : period === 'weekly' ? 'wk' : 'mo'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-32 bg-black/50 rounded-lg p-2 border border-slate-700/50">
                {trendData.length > 0 ? (
                  <LazyRender className="w-full h-full" placeholder={<ChartSkeleton className="h-full" />}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="muscleColorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(5, 75%, 50%)" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="hsl(5, 75%, 50%)" stopOpacity={0}/>
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
                        <RechartsTooltip
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
                          stroke="hsl(5, 75%, 50%)"
                          strokeWidth={2}
                          fill="url(#muscleColorGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </LazyRender>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                    No muscle data for this period yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Exercises Section */}
          {(quickFilterData || (selectedMuscle && (viewMode === 'group' ? selectedGroupData : selectedMuscleData))) && (
            <div className="border-t border-slate-800">
              <div className="flex items-center gap-2 px-4 py-3 bg-black/70 border-b border-slate-700/50">
                <Dumbbell className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-white">Top Exercises</h3>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-520px)] px-4 pb-4 mt-2">
                <div className="space-y-2">
                  {contributingExercises.map((ex, i) => {
                    const asset = assetsMap?.get(ex.name);
                    const imgUrl = asset?.sourceType === 'video' ? asset.thumbnail : (asset?.thumbnail || asset?.source);
                    const exData = exerciseMuscleData.get(ex.name.toLowerCase());
                    const { volumes: exVolumes, maxVolume: exMaxVol } = getExerciseMuscleVolumes(exData);
                    const totalSetsForCalc = quickFilterData
                      ? (quickFilterData.sets || 1)
                      : viewMode === 'group' 
                        ? (selectedGroupData?.sets || 1) 
                        : (selectedMuscleData?.sets || 1);
                    const pct = totalSetsForCalc > 0 ? Math.round((ex.sets / totalSetsForCalc) * 100) : 0;

                    const isPrimary = ex.primarySets > 0;
                    const isSecondary = ex.secondarySets > 0;
                    const chipBg = getVolumeColor(ex.sets, totalSetsForCalc);
                    const chipFg = getChipTextColor(ex.sets, totalSetsForCalc);
                    const setsRounded = Math.round(ex.sets * 10) / 10;
                    const primaryRounded = Math.round(ex.primarySets * 10) / 10;
                    const secondaryRounded = Math.round(ex.secondarySets * 10) / 10;
                    const isTopThree = i < 3;
                    const ribbonText = i === 0 ? 'Top' : i === 1 ? '2nd' : '3rd';
                    const ribbonGradient = i === 0
                      ? 'from-amber-500 via-yellow-400 to-amber-500'
                      : i === 1
                        ? 'from-slate-300 via-slate-100 to-slate-300'
                        : 'from-amber-800 via-orange-600 to-amber-800';
                    
                    return (
                      <button
                        key={ex.name}
                        onClick={() => onExerciseClick?.(ex.name)}
                        type="button"
                        className="group relative w-full text-left rounded-lg border border-slate-700/50 bg-gradient-to-b from-black/60 to-black/40 p-2 shadow-sm transition-all hover:border-slate-600/60 hover:from-black/70 hover:to-black/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        title={ex.name}
                      >
                        {isTopThree ? (
                          <div className="pointer-events-none absolute left-0 top-0 w-12 h-12 overflow-hidden">
                            <div
                              className={`absolute -left-6 top-2.5 w-24 h-4.5 -rotate-45 bg-gradient-to-r ${ribbonGradient} shadow-[0_6px_16px_rgba(0,0,0,0.35)] flex items-center justify-center`}
                            >
                              <span className="text-[8px] font-extrabold tracking-wider uppercase text-black/80">
                                {ribbonText}
                              </span>
                            </div>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_5.25rem] items-stretch gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                            {!isTopThree && (
                              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-black/60 text-[11px] font-bold border border-slate-700/50 text-slate-300">
                                {i + 1}
                              </div>
                            )}
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt=""
                                className="h-10 w-10 rounded-md object-cover flex-shrink-0 border border-slate-700/70"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-black/50 flex items-center justify-center text-slate-500 flex-shrink-0 border border-slate-700/70">
                                <Dumbbell className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">
                                {ex.name}
                              </div>
                            </div>
                          </div>

                            <div className="mt-1.5 border-t border-slate-800/70" />

                            <div className="mt-1.5">
                              <div className="h-1 w-full rounded-full bg-slate-800/60 overflow-hidden border border-slate-700/30">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, backgroundColor: chipBg }}
                                />
                              </div>

                              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                  <span className="text-slate-400">
                                    <span className="text-red-300 font-semibold">{pct}%</span> of sets
                                  </span>
                                  {isPrimary && (
                                    <span
                                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-slate-200 border border-slate-700/50"
                                      title={`${primaryRounded} primary sets`}
                                    >
                                      Primary
                                    </span>
                                  )}
                                  {isSecondary && (
                                    <span
                                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-slate-200 border border-slate-700/50"
                                      title={`${secondaryRounded} secondary sets`}
                                    >
                                      Secondary
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] font-semibold text-slate-200">
                                  {setsRounded}{' '}
                                  <span className="text-slate-400 font-medium">sets</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="hidden sm:flex w-[5.25rem] justify-end">
                            <div className="h-full w-[5.25rem] rounded-md border border-slate-700/50 bg-black/30 p-1">
                              <div className="h-full w-full flex items-center justify-center">
                                <BodyMap
                                  onPartClick={() => {}}
                                  selectedPart={null}
                                  muscleVolumes={exVolumes}
                                  maxVolume={exMaxVol}
                                  compact
                                  compactFill
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
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
          )}

          {/* Hint when no muscle selected */}
          {!selectedMuscle && (
            <div className="p-4 pt-0">
              <p className="text-xs text-slate-500 text-center py-2">
                Click on a {viewMode === 'group' ? 'muscle group' : 'muscle'} to see its exercises
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
