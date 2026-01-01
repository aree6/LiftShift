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
  lookupExerciseMuscleData,
} from '../utils/muscle/muscleMapping';
import { getExerciseAssets, ExerciseAsset } from '../utils/data/exerciseAssets';
import { format, startOfWeek, startOfMonth, subWeeks, subMonths, isWithinInterval } from 'date-fns';
import { formatDayContraction, formatWeekContraction, formatMonthYearContraction } from '../utils/date/dateUtils';
import { getSmartFilterMode, TimeFilterMode } from '../utils/storage/localStorage';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Dumbbell, X, Activity, Layers, PersonStanding, BicepsFlexed } from 'lucide-react';
import { normalizeMuscleGroup, type NormalizedMuscleGroup } from '../utils/muscle/muscleNormalization';
import { LazyRender } from './LazyRender';
import { ChartSkeleton } from './ChartSkeleton';
import { Tooltip as HoverTooltip, TooltipData } from './Tooltip';
import { CHART_TOOLTIP_STYLE } from '../utils/ui/uiConstants';
import { addEmaSeries, DEFAULT_EMA_HALF_LIFE_DAYS } from '../utils/analysis/ema';
import { formatNumber } from '../utils/format/formatters';
import {
  SVG_TO_MUSCLE_GROUP,
  MUSCLE_GROUP_ORDER,
  getSvgIdsForGroup,
  getGroupForSvgId,
  QuickFilterCategory,
  QUICK_FILTER_LABELS,
  QUICK_FILTER_GROUPS,
  getSvgIdsForQuickFilter,
} from '../utils/muscle/muscleMappingConstants';

interface MuscleAnalysisProps {
  data: WorkoutSet[];
  filtersSlot?: React.ReactNode;
  onExerciseClick?: (exerciseName: string) => void;
  initialMuscle?: { muscleId: string; viewMode: 'muscle' | 'group' } | null;
  onInitialMuscleConsumed?: () => void;
  stickyHeader?: boolean;
  bodyMapGender?: BodyMapGender;
}

type TrendPeriod = 'all' | 'weekly' | 'monthly';
type ViewMode = 'muscle' | 'group';

/** Alias to centralized constant for backward compatibility within this file */
const MUSCLE_GROUP_DISPLAY = SVG_TO_MUSCLE_GROUP;

export const MuscleAnalysis: React.FC<MuscleAnalysisProps> = ({ data, filtersSlot, onExerciseClick, initialMuscle, onInitialMuscleConsumed, stickyHeader = false, bodyMapGender = 'male' }) => {
  const [exerciseMuscleData, setExerciseMuscleData] = useState<Map<string, ExerciseMuscleData>>(new Map());
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  const [muscleVolume, setMuscleVolume] = useState<Map<string, MuscleVolumeEntry>>(new Map());
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);
  const [trendPeriodOverride, setTrendPeriodOverride] = useState<TrendPeriod | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('group');
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

    if (exerciseMuscleData.size === 0 || data.length === 0) return groupVolumes;

    const add = (group: NormalizedMuscleGroup, inc: number) => {
      if (!MUSCLE_GROUP_ORDER.includes(group)) return;
      groupVolumes.set(group, (groupVolumes.get(group) ?? 0) + inc);
    };

    for (const set of data) {
      if (!set.exercise_title) continue;
      const exData = lookupExerciseMuscleData(set.exercise_title, exerciseMuscleData);
      if (!exData) continue;

      const primaryGroup = normalizeMuscleGroup(exData.primary_muscle);
      if (primaryGroup === 'Cardio') continue;

      if (primaryGroup === 'Full Body') {
        for (const g of MUSCLE_GROUP_ORDER) add(g, 1.0);
        continue;
      }

      add(primaryGroup, 1.0);

      const secRaw = String(exData.secondary_muscle ?? '').trim();
      if (secRaw && !/none/i.test(secRaw)) {
        for (const s2 of secRaw.split(',')) {
          const m = normalizeMuscleGroup(s2);
          if (m === 'Cardio' || m === 'Full Body') continue;
          add(m, 0.5);
        }
      }
    }

    return groupVolumes;
  }, [data, exerciseMuscleData]);

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
    const exerciseMap = new Map<string, { sets: number; primarySets: number; secondarySets: number }>();

    if (exerciseMuscleData.size === 0 || data.length === 0) {
      return { sets, exercises: exerciseMap };
    }

    for (const setRow of data) {
      if (!setRow.exercise_title) continue;
      const exData = lookupExerciseMuscleData(setRow.exercise_title, exerciseMuscleData);
      if (!exData) continue;

      const primaryGroup = normalizeMuscleGroup(exData.primary_muscle);
      if (primaryGroup === 'Cardio') continue;

      const entry = exerciseMap.get(setRow.exercise_title) || { sets: 0, primarySets: 0, secondarySets: 0 };

      if (primaryGroup === 'Full Body') {
        entry.sets += 1;
        entry.primarySets += 1;
        exerciseMap.set(setRow.exercise_title, entry);
        continue;
      }

      if (primaryGroup === group) {
        entry.sets += 1;
        entry.primarySets += 1;
      }

      const secRaw = String(exData.secondary_muscle ?? '').trim();
      if (secRaw && !/none/i.test(secRaw)) {
        for (const s2 of secRaw.split(',')) {
          const m = normalizeMuscleGroup(s2);
          if (m === 'Cardio' || m === 'Full Body') continue;
          if (m === group) {
            entry.sets += 0.5;
            entry.secondarySets += 0.5;
          }
        }
      }

      if (entry.sets > 0) {
        exerciseMap.set(setRow.exercise_title, entry);
      }
    }

    return { sets, exercises: exerciseMap };
  }, [viewMode, selectedMuscle, muscleGroupVolumes, exerciseMuscleData, data]);

  // Selected muscle data
  const selectedMuscleData = useMemo(() => {
    if (!selectedMuscle) return null;
    return muscleVolume.get(selectedMuscle) || null;
  }, [selectedMuscle, muscleVolume]);

  // Quick filter data - aggregates exercises from all muscles in the quick filter category
  const quickFilterData = useMemo(() => {
    if (!activeQuickFilter) return null;

    const filterGroups = new Set<NormalizedMuscleGroup>();
    for (const svgId of getSvgIdsForQuickFilter(activeQuickFilter)) {
      const group = getGroupForSvgId(svgId);
      if (MUSCLE_GROUP_ORDER.includes(group)) filterGroups.add(group);
    }

    let totalSets = 0;
    const exerciseMap = new Map<string, { sets: number; primarySets: number; secondarySets: number }>();

    if (exerciseMuscleData.size === 0 || data.length === 0 || filterGroups.size === 0) {
      return { sets: totalSets, exercises: exerciseMap };
    }

    for (const setRow of data) {
      if (!setRow.exercise_title) continue;
      const exData = lookupExerciseMuscleData(setRow.exercise_title, exerciseMuscleData);
      if (!exData) continue;

      const primaryGroup = normalizeMuscleGroup(exData.primary_muscle);
      if (primaryGroup === 'Cardio') continue;

      let inc = 0;
      let pInc = 0;
      let sInc = 0;

      if (primaryGroup === 'Full Body') {
        for (const g of filterGroups) {
          inc += 1;
          pInc += 1;
        }
      } else {
        if (filterGroups.has(primaryGroup)) {
          inc += 1;
          pInc += 1;
        }

        const secRaw = String(exData.secondary_muscle ?? '').trim();
        if (secRaw && !/none/i.test(secRaw)) {
          for (const s2 of secRaw.split(',')) {
            const m = normalizeMuscleGroup(s2);
            if (m === 'Cardio' || m === 'Full Body') continue;
            if (filterGroups.has(m)) {
              inc += 0.5;
              sInc += 0.5;
            }
          }
        }
      }

      if (inc <= 0) continue;

      totalSets += inc;
      const entry = exerciseMap.get(setRow.exercise_title) || { sets: 0, primarySets: 0, secondarySets: 0 };
      entry.sets += inc;
      entry.primarySets += pInc;
      entry.secondarySets += sInc;
      exerciseMap.set(setRow.exercise_title, entry);
    }

    return { sets: totalSets, exercises: exerciseMap };
  }, [activeQuickFilter, exerciseMuscleData, data]);

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
        const exData = lookupExerciseMuscleData(set.exercise_title, exerciseMuscleData);
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
        .map(d => ({ period: d.label, timestamp: d.ts, sets: Math.round(d.sets * 10) / 10 }));
    }
    
    // For weekly/monthly, aggregate by period
    const periodMap = new Map<string, { label: string; ts: number; sets: number }>();
    
    for (const set of data) {
      if (!set.parsedDate || !set.exercise_title) continue;
      const exData = lookupExerciseMuscleData(set.exercise_title, exerciseMuscleData);
      if (!exData) continue;
      
      const primaryMuscle = exData.primary_muscle;
      if (primaryMuscle === 'Cardio') continue;
      
      let periodKey: string;
      let periodLabel: string;
      let periodTs: number;
      
      if (trendPeriod === 'weekly') {
        const weekStart = startOfWeek(set.parsedDate, { weekStartsOn: 1 });
        periodKey = `wk-${format(weekStart, 'yyyy-MM-dd')}`;
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
      .map(p => ({ period: p.label, timestamp: p.ts, sets: Math.round(p.sets * 10) / 10 }));
  }, [exerciseMuscleData, data, selectedMuscle, viewMode, activeQuickFilter, trendPeriod, matchesTarget]);

  const trendDataWithEma = useMemo(() => {
    return addEmaSeries(trendData as any[], 'sets', 'emaSets', {
      halfLifeDays: DEFAULT_EMA_HALF_LIFE_DAYS,
      timestampKey: 'timestamp',
    });
  }, [trendData]);

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
    return data.length;
  }, [data]);

  // Muscles worked count
  const musclesWorked = useMemo(() => {
    if (viewMode === 'muscle') {
      let count = 0;
      muscleVolume.forEach(entry => { if (entry.sets > 0) count++; });
      return count;
    }

    let count = 0;
    for (const g of MUSCLE_GROUP_ORDER) {
      if ((muscleGroupVolumes.get(g) ?? 0) > 0) count += 1;
    }
    return count;
  }, [viewMode, muscleVolume, muscleGroupVolumes]);

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
      <div className="hidden sm:contents">
        <ViewHeader
          leftStats={[{ icon: Activity, value: totalSets, label: 'Total Sets' }]}
          rightStats={[{ icon: Dumbbell, value: musclesWorked, label: 'Muscles' }]}
          filtersSlot={filtersSlot}
          sticky={stickyHeader}
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
                <svg className="w-3.5 h-3.5" viewBox="0 0 487.172 487.172" fill="currentColor">
                  <path d="M80.147,315.971c-2.072,4.694-4.343,10.061-6.252,14.598c-12.218,29.043-24.851,59.074-72.827,113.241 c-1.556,1.757-1.394,4.443,0.364,6c0.809,0.716,1.814,1.068,2.816,1.068c1.174,0,2.343-0.484,3.183-1.432 c13.106-14.798,23.608-27.821,32.229-39.548c27.358,9.402,35.802,32.988,37.275,37.863c-11.64,8.574-24.554,18.999-39.209,31.98 c-1.757,1.557-1.92,4.242-0.363,5.999c0.84,0.948,2.009,1.433,3.183,1.433c1.002,0,2.008-0.353,2.816-1.068 c54.167-47.977,84.198-60.61,113.242-72.828c4.536-1.908,9.902-4.18,14.597-6.252c49.33-21.776,96.602-42.642,137.241-75.945 c45.114-36.972,78.352-85.822,104.602-153.736c21.52-55.68,38.239-95.378,73.17-138.174c1.484-1.818,1.214-4.496-0.604-5.98 c-1.819-1.484-4.496-1.214-5.98,0.605c-10.308,12.628-19.048,24.967-26.8,37.485c-25.962-9.067-34.761-30.935-36.751-37.047 c12.455-7.724,24.734-16.43,37.301-26.687c1.818-1.484,2.09-4.162,0.605-5.98c-1.484-1.818-4.162-2.089-5.98-0.605 c-42.797,34.931-82.494,51.65-138.174,73.17c-67.914,26.249-116.765,59.487-153.736,104.602 C122.79,219.369,101.924,266.64,80.147,315.971z"/>
                  <path d="M298.64,104.485c-59.109,27.002-102.147,60.839-135.44,106.488c-1.383,1.896-0.967,4.555,0.93,5.938 c0.756,0.551,1.632,0.817,2.501,0.817c1.312,0,2.605-0.605,3.437-1.746c32.398-44.423,74.376-77.395,132.105-103.766 c2.135-0.975,3.075-3.497,2.1-5.632C303.297,104.45,300.775,103.51,298.64,104.485z"/>
                  <path d="M322.067,259.048c-1.898-1.384-4.556-0.967-5.939,0.929c-32.398,44.423-74.375,77.395-132.104,103.766 c-2.135,0.975-3.075,3.496-2.1,5.632c0.714,1.563,2.256,2.485,3.868,2.485c0.591,0,1.19-0.124,1.764-0.385 c59.109-27.001,102.146-60.839,135.439-106.488C324.38,263.089,323.964,260.43,322.067,259.048z"/>
                </svg>
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
                <svg className="w-3.5 h-3.5" viewBox="0 0 187.064 187.064" fill="currentColor">
                  <path d="M107.911,47.483c0,0.792-0.676,1.425-1.51,1.425c-0.841,0-1.514-0.64-1.514-1.425c0-0.8,0.673-1.443,1.514-1.443 C107.229,46.04,107.911,46.683,107.911,47.483z M80.666,46.04c-0.85,0-1.51,0.648-1.51,1.443c0,0.792,0.661,1.425,1.51,1.425 c0.828,0,1.51-0.64,1.51-1.425C82.176,46.683,81.487,46.04,80.666,46.04z M83.677,63.476v11.359c0,0.554,0.444,1.004,1.004,1.004 c0.548,0,0.999-0.45,0.999-1.004V63.476c0-4.323,3.504-7.839,7.837-7.839s7.843,3.516,7.843,7.839v11.789 c0,0.558,0.45,1.005,1.005,1.005c0.554,0,1.005-0.447,1.005-1.005V63.476c0-5.431-4.421-9.846-9.853-9.846 C88.091,53.63,83.677,58.045,83.677,63.476z"/>
                  <path d="M150.444,41.51c0.036,0.304-0.079,0.608-0.299,0.828c-0.311,0.298-7.685,7.331-18.389,8.263c-2.74,0.234-5.262,0.354-7.532,0.354 c-3.587,0-6.583-0.311-9.073-0.911c-0.036,0.088-0.073,0.167-0.128,0.25c0.384,1.215,0.591,2.476,0.591,3.767 c0,3.479-1.431,6.759-3.994,9.109c0.742,1.985,1.139,4.177,1.139,6.394c0,3.888-1.194,7.605-3.289,10.312 c1.656,2.536,16.039,25.955,3.502,47.396c1.899,2.344,5.419,10.625-1.79,37.436l1.534,1.383c0.194,0.188,0.329,0.444,0.335,0.725 l0.098,4.664l9.755,8.981c0.207,0.194,0.328,0.463,0.328,0.743v4.859c0,0.56-0.438,1.004-0.998,1.004h-13.104 c-0.219,0-0.414-0.066-0.603-0.201l-7.995-6.021c-0.243-0.177-0.387-0.457-0.393-0.762l-0.582-12.744 c-0.018-0.408,0.213-0.792,0.593-0.956l1.048-0.476c0-0.023-0.013-0.061-0.013-0.097c0.454-4.908-1.267-11.174-2.094-12.769 c-6.835-13.11-2.122-23.986-1.373-25.539c-0.012-0.018-0.037-0.029-0.042-0.055c-0.144-0.56-2.762-10.278-4.092-17.572 c-1.328,7.288-3.946,17.013-4.089,17.572c-0.024,0.08-0.076,0.129-0.113,0.207c0.911,1.967,5.225,12.611-1.428,25.38 c-0.84,1.596-2.558,7.861-2.095,12.763c0,0.049-0.012,0.073-0.012,0.109l1.035,0.463c0.387,0.165,0.618,0.549,0.597,0.957 l-0.573,12.744c-0.012,0.299-0.155,0.584-0.393,0.761l-8.001,6.022c-0.18,0.146-0.387,0.213-0.603,0.213H64.803 c-0.548,0-0.999-0.45-0.999-1.004v-4.859c0-0.28,0.125-0.549,0.332-0.743l9.764-8.976l0.113-4.67 c0.006-0.274,0.131-0.536,0.334-0.725l1.535-1.383c-7.307-27.176-3.583-35.316-1.708-37.539 c-11.822-20.344,0.536-42.43,3.224-46.768c-2.369-2.731-3.735-6.64-3.735-10.835c0-2.217,0.387-4.415,1.142-6.394 c-2.539-2.345-3.992-5.63-3.992-9.109c0-1.297,0.195-2.558,0.594-3.767c-0.024-0.03-0.045-0.067-0.058-0.101 c-2.375,0.512-5.188,0.768-8.503,0.768c-2.277,0-4.795-0.119-7.539-0.354c-10.702-0.925-18.076-7.964-18.389-8.263 c-0.216-0.219-0.335-0.518-0.298-0.828c1.078-10.022,12.458-22.685,12.93-23.215c1.729-1.355,5.782-0.697,6.978-0.463 c0.162,0.033,0.338,0.113,0.463,0.226c2.643,2.289,2.305,5.145,2.292,5.264c-0.03,0.229-0.137,0.448-0.311,0.603l-2.262,2.113 c-0.183,0.177-0.427,0.268-0.682,0.268h-3.791c-2.025,3.538-2.856,6.168-3.154,8.007c1.857-1.428,4.271-2.231,6.802-2.231 c3.306,0,6.323,1.346,8.238,3.559c1.27-3.495,4.631-5.979,8.516-5.979c2.208,0,4.336,0.813,5.992,2.208 c0.018-0.006,0.018-0.024,0.033-0.037c1.09-1.142,2.332-2.131,3.696-2.938c0.947-0.554,1.945-1.02,3.005-1.388v-3.124 c-2.095-2.408-3.422-6.89-3.422-11.594C81.944,5.736,87.007,0,93.218,0c6.214,0,11.277,5.736,11.277,12.793 c0,4.628-1.363,9.21-3.422,11.594v3.124c1.047,0.365,2.059,0.828,2.999,1.388c1.354,0.792,2.597,1.784,3.711,2.938 c0.122,0.125,0.177,0.274,0.226,0.429c1.699-1.644,4.025-2.6,6.418-2.6c3.897,0,7.258,2.484,8.531,5.979 c1.93-2.213,4.926-3.559,8.227-3.559c2.539,0,4.944,0.804,6.808,2.231c-0.299-1.839-1.133-4.476-3.154-8.007h-3.8 c-0.244,0-0.499-0.091-0.676-0.268l-2.266-2.113c-0.158-0.162-0.28-0.375-0.311-0.609c-0.012-0.122-0.341-2.975,2.29-5.264 c0.128-0.113,0.286-0.186,0.45-0.225c1.413-0.311,6.126-1.221,7.733,0.024c0.061,0.045,0.122,0.101,0.164,0.158 C138.868,18.562,149.372,31.511,150.444,41.51z"/>
                </svg>
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
            <div className="flex items-center gap-3 text-xs text-slate-400 bg-slate-950/75 rounded-lg px-3 py-1.5 border border-slate-700/50">
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 rounded border border-slate-700/50" style={{ backgroundColor: 'rgb(var(--tint-rgb) / 0.06)' }}></div>
                <span>None</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 rounded" style={{ backgroundColor: 'hsl(var(--heatmap-hue), 75%, 75%)' }}></div>
                <span>Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 rounded" style={{ backgroundColor: 'hsl(var(--heatmap-hue), 75%, 50%)' }}></div>
                <span>Med</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 rounded" style={{ backgroundColor: 'hsl(var(--heatmap-hue), 75%, 25%)' }}></div>
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
                      <AreaChart data={trendDataWithEma}>
                        <defs>
                          <linearGradient id="muscleColorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--heatmap-hue), 75%, 50%)" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="hsl(var(--heatmap-hue), 75%, 50%)" stopOpacity={0}/>
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
                          contentStyle={CHART_TOOLTIP_STYLE}
                          labelStyle={{ color: 'var(--text-primary)' }}
                          formatter={(value: number, name: string) => {
                            const v = formatNumber(Number(value), { maxDecimals: 1 });
                            return [`${v} sets`, ''];
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="sets"
                          stroke="hsl(var(--heatmap-hue), 75%, 50%)"
                          strokeWidth={2}
                          fill="url(#muscleColorGradient)"
                        />

                        <Area
                          type="monotone"
                          dataKey="emaSets"
                          name="EMA"
                          stroke="hsl(var(--heatmap-hue), 75%, 50%)"
                          strokeOpacity={0.95}
                          strokeWidth={2}
                          strokeDasharray="6 4"
                          fillOpacity={0}
                          fill="transparent"
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
             
              <div className="overflow-y-auto max-h-[calc(100vh-400px)] px-4 pb-4 mt-2">
                <div className="space-y-2">
                  {contributingExercises.map((ex, i) => {
                    const asset = assetsMap?.get(ex.name);
                    const imgUrl = asset?.sourceType === 'video' ? asset.thumbnail : (asset?.thumbnail || asset?.source);
                    const exData = lookupExerciseMuscleData(ex.name, exerciseMuscleData);
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
                        className="group relative w-full text-left rounded-lg border border-slate-700/50 bg-black/50 p-2 shadow-sm transition-all hover:border-slate-600/60 hover:bg-black/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500/30"
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
                                <div className="text-sm font-semibold text-white truncate">{ex.name}</div>
                              </div>
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                <span className="text-slate-400">
                                  <span className="text-rose-400 font-semibold">{pct}%</span> of sets
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

                          <div className="hidden sm:flex w-[5.25rem] justify-end">
                            <div className="h-full w-[5.25rem] rounded-md p-1">
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
