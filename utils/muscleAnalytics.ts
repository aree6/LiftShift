import { WorkoutSet } from '../types';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import type { ExerciseAsset } from './exerciseAssets';

export const normalizeMuscleGroup = (m?: string): string => {
  if (!m) return 'Other';
  const t = String(m).trim().toLowerCase();
  if (t === 'none' || t === '') return 'Other';
  if (t.includes('chest') || t.includes('pec')) return 'Chest';
  if (t.includes('lat') || t.includes('upper back') || t === 'back' || t.includes('lower back')) return 'Back';
  if (t.includes('shoulder') || t.includes('delto')) return 'Shoulders';
  if (t.includes('bicep') || t.includes('tricep') || t.includes('forearm') || t === 'arms') return 'Arms';
  if (
    t.includes('quad') || t.includes('hamstring') || t.includes('glute') || t.includes('calv') ||
    t.includes('thigh') || t.includes('hip') || t.includes('adductor') || t.includes('abductor')
  ) return 'Legs';
  if (t.includes('abdom') || t.includes('core') || t.includes('waist')) return 'Core';
  if (t.includes('cardio')) return 'Cardio';
  if (t.includes('full body') || t.includes('full-body')) return 'Full Body';
  return 'Other';
};

export const getMuscleVolumeTimeSeries = (
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  period: 'weekly' | 'monthly' | 'daily' | 'yearly' = 'weekly'
): { data: Array<Record<string, any>>; keys: string[] } => {
  const lowerMap = new Map<string, ExerciseAsset>();
  assetsMap.forEach((v, k) => lowerMap.set(k.toLowerCase(), v));

  const grouped: Record<string, { timestamp: number; dateFormatted: string; volumes: Record<string, number> } > = {};

  const getKey = (d: Date) => {
    if (period === 'monthly') {
      const start = startOfMonth(d);
      return { key: format(start, 'yyyy-MM'), ts: start.getTime(), label: format(start, 'MMM yyyy') };
    }
    if (period === 'yearly') {
      const start = startOfYear(d);
      return { key: format(start, 'yyyy'), ts: start.getTime(), label: format(start, 'yyyy') };
    }
    if (period === 'daily') {
      const start = startOfDay(d);
      return { key: format(start, 'yyyy-MM-dd'), ts: start.getTime(), label: format(start, 'MMM d') };
    }
    const start = startOfWeek(d, { weekStartsOn: 1 });
    return { key: format(start, 'yyyy-ww'), ts: start.getTime(), label: `Wk of ${format(start, 'MMM d')}` };
  };

  for (const set of data) {
    if (!set.parsedDate) continue;
    const name = set.exercise_title || '';
    const asset = assetsMap.get(name) || lowerMap.get(name.toLowerCase());
    if (!asset) continue;
    
    // Treat cardio as ignored (hypertrophy focus)
    const primary = normalizeMuscleGroup(asset.primary_muscle);
    if (primary === 'Cardio') continue;

    const secondaryRaw = asset.secondary_muscle as string | undefined;
    const secondaryList = (secondaryRaw && secondaryRaw.toLowerCase() !== 'none')
      ? secondaryRaw.split(',').map(s => normalizeMuscleGroup(s)).filter(s => s !== 'Cardio')
      : [];

    const { key, ts, label } = getKey(set.parsedDate);
    if (!grouped[key]) grouped[key] = { timestamp: ts, dateFormatted: label, volumes: {} };
    const g = grouped[key].volumes;

    // Count sets (not weight*reps). Primary = 1 set, each secondary = 0.5 set
    // Full Body: include 1 set to every muscle group
    if (primary === 'Full Body') {
      const groups = ['Chest','Back','Legs','Shoulders','Arms','Core'];
      for (const grp of groups) {
        g[grp] = (g[grp] || 0) + 1.0;
      }
      continue;
    }

    g[primary] = (g[primary] || 0) + 1.0;
    for (const s of secondaryList) {
      g[s] = (g[s] || 0) + 0.5;
    }
  }

  const entries = Object.values(grouped).sort((a,b) => a.timestamp - b.timestamp);
  const keysSet = new Set<string>();
  entries.forEach(e => Object.keys(e.volumes).forEach(k => keysSet.add(k)));
  const keys = Array.from(keysSet);

  const series = entries.map(e => ({
    timestamp: e.timestamp,
    dateFormatted: e.dateFormatted,
    ...keys.reduce((acc, k) => { const v = (e.volumes[k] || 0); acc[k] = Number(v.toFixed(1)); return acc; }, {} as Record<string, number>)
  }));

  return { data: series, keys };
};

// Detailed muscle composition (latest period). Uses raw muscle names from the CSV.
export const getDetailedMuscleCompositionLatest = (
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  period: 'weekly' | 'monthly' | 'yearly' = 'weekly'
): { data: Array<{ subject: string; value: number }>; label: string } => {
  const lowerMap = new Map<string, ExerciseAsset>();
  assetsMap.forEach((v, k) => lowerMap.set(k.toLowerCase(), v));

  const buckets: Record<string, { label: string; counts: Record<string, number> }> = {};

  const getKey = (d: Date) => {
    if (period === 'monthly') {
      const start = startOfMonth(d);
      return { key: format(start, 'yyyy-MM'), label: format(start, 'MMM yyyy') };
    }
    if (period === 'yearly') {
      const start = startOfYear(d);
      return { key: format(start, 'yyyy'), label: format(start, 'yyyy') };
    }
    const start = startOfWeek(d, { weekStartsOn: 1 });
    return { key: format(start, 'yyyy-ww'), label: `Wk of ${format(start, 'MMM d')}` };
  };

  for (const set of data) {
    if (!set.parsedDate) continue;
    const name = set.exercise_title || '';
    const asset = assetsMap.get(name) || lowerMap.get(name.toLowerCase());
    if (!asset) continue;

    const primaryRaw = String(asset.primary_muscle || '').trim();
    if (!primaryRaw || /cardio/i.test(primaryRaw)) continue; // ignore cardio

    const { key, label } = getKey(set.parsedDate);
    if (!buckets[key]) buckets[key] = { label, counts: {} };
    const counts = buckets[key].counts;

    // Skip Full Body for detailed muscles (group-level only as per guidance)
    if (/full\s*body/i.test(primaryRaw)) {
      continue;
    }

    // Primary muscle = +1 set
    counts[primaryRaw] = (counts[primaryRaw] || 0) + 1.0;

    const secondaryRaw = String(asset.secondary_muscle || '').trim();
    if (secondaryRaw && !/none/i.test(secondaryRaw)) {
      secondaryRaw.split(',').forEach(s => {
        const m = s.trim();
        if (!m || /cardio/i.test(m) || /full\s*body/i.test(m)) return;
        counts[m] = (counts[m] || 0) + 0.5; // secondary = 0.5 set
      });
    }
  }

  const keys = Object.keys(buckets).sort();
  if (!keys.length) return { data: [], label: '' };
  const latest = buckets[keys[keys.length - 1]];
  const arr = Object.entries(latest.counts)
    .map(([subject, value]) => ({ subject, value: Number(value.toFixed(1)) }))
    .sort((a,b) => b.value - a.value);
  return { data: arr, label: latest.label };
};

// Time series for individual muscles (raw names), same set-counting rules
export const getMuscleVolumeTimeSeriesDetailed = (
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  period: 'weekly' | 'monthly' | 'daily' | 'yearly' = 'weekly'
) => {
  const lowerMap = new Map<string, ExerciseAsset>();
  assetsMap.forEach((v, k) => lowerMap.set(k.toLowerCase(), v));

  const grouped: Record<string, { timestamp: number; dateFormatted: string; volumes: Record<string, number> } > = {};

  const getKey = (d: Date) => {
    if (period === 'monthly') {
      const start = startOfMonth(d);
      return { key: format(start, 'yyyy-MM'), ts: start.getTime(), label: format(start, 'MMM yyyy') };
    }
    if (period === 'yearly') {
      const start = startOfYear(d);
      return { key: format(start, 'yyyy'), ts: start.getTime(), label: format(start, 'yyyy') };
    }
    if (period === 'daily') {
      const start = startOfDay(d);
      return { key: format(start, 'yyyy-MM-dd'), ts: start.getTime(), label: format(start, 'MMM d') };
    }
    const start = startOfWeek(d, { weekStartsOn: 1 });
    return { key: format(start, 'yyyy-ww'), ts: start.getTime(), label: `Wk of ${format(start, 'MMM d')}` };
  };

  for (const set of data) {
    if (!set.parsedDate) continue;
    const name = set.exercise_title || '';
    const asset = assetsMap.get(name) || lowerMap.get(name.toLowerCase());
    if (!asset) continue;

    const p = String(asset.primary_muscle || '').trim();
    if (!p || /cardio/i.test(p) || /full\s*body/i.test(p)) continue; // ignore cardio and skip full body in detailed

    const { key, ts, label } = getKey(set.parsedDate);
    if (!grouped[key]) grouped[key] = { timestamp: ts, dateFormatted: label, volumes: {} };
    const g = grouped[key].volumes;

    g[p] = (g[p] || 0) + 1.0;

    const sRaw = String(asset.secondary_muscle || '').trim();
    if (sRaw && !/none/i.test(sRaw)) {
      sRaw.split(',').forEach(s => {
        const m = s.trim();
        if (!m || /cardio/i.test(m) || /full\s*body/i.test(m)) return;
        g[m] = (g[m] || 0) + 0.5;
      });
    }
  }

  const entries = Object.values(grouped).sort((a,b) => a.timestamp - b.timestamp);
  const keysSet = new Set<string>();
  entries.forEach(e => Object.keys(e.volumes).forEach(k => keysSet.add(k)));
  const keys = Array.from(keysSet);

  const series = entries.map(e => ({
    timestamp: e.timestamp,
    dateFormatted: e.dateFormatted,
    ...keys.reduce((acc, k) => { const v = (e.volumes[k] || 0); acc[k] = Number(v.toFixed(1)); return acc; }, {} as Record<string, number>)
  }));

  return { data: series, keys };
};
