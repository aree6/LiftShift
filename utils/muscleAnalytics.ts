import { WorkoutSet } from '../types';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
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
  period: 'weekly' | 'monthly' | 'daily' = 'weekly'
): { data: Array<Record<string, any>>; keys: string[] } => {
  const lowerMap = new Map<string, ExerciseAsset>();
  assetsMap.forEach((v, k) => lowerMap.set(k.toLowerCase(), v));

  const grouped: Record<string, { timestamp: number; dateFormatted: string; volumes: Record<string, number> } > = {};

  const getKey = (d: Date) => {
    if (period === 'monthly') {
      const start = startOfMonth(d);
      return { key: format(start, 'yyyy-MM'), ts: start.getTime(), label: format(start, 'MMM yyyy') };
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

    const vol = (set.weight_kg || 0) * (set.reps || 0);
    if (!isFinite(vol) || vol <= 0) continue;

    const primary = normalizeMuscleGroup(asset.primary_muscle);
    const secondaryRaw = asset.secondary_muscle as string | undefined;
    const secondaryList = (secondaryRaw && secondaryRaw.toLowerCase() !== 'none')
      ? secondaryRaw.split(',').map(s => normalizeMuscleGroup(s))
      : [];

    const { key, ts, label } = getKey(set.parsedDate);
    if (!grouped[key]) grouped[key] = { timestamp: ts, dateFormatted: label, volumes: {} };
    const g = grouped[key].volumes;

    g[primary] = (g[primary] || 0) + vol * 1.0;
    for (const s of secondaryList) {
      g[s] = (g[s] || 0) + vol * 0.5;
    }
  }

  const entries = Object.values(grouped).sort((a,b) => a.timestamp - b.timestamp);
  const keysSet = new Set<string>();
  entries.forEach(e => Object.keys(e.volumes).forEach(k => keysSet.add(k)));
  const keys = Array.from(keysSet);

  const series = entries.map(e => ({
    timestamp: e.timestamp,
    dateFormatted: e.dateFormatted,
    ...keys.reduce((acc, k) => { acc[k] = Math.round((e.volumes[k] || 0)); return acc; }, {} as Record<string, number>)
  }));

  return { data: series, keys };
};
