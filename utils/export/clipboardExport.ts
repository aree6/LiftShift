import { WorkoutSet, DailySummary, ExerciseStats } from '../../types';
import { subMonths, format } from 'date-fns';
import { getDailySummaries, getExerciseStats, getIntensityEvolution, getTopExercisesOverTime, getPrsOverTime, HeatmapEntry } from '../analysis/analytics';
import { getSessionKey } from '../date/dateUtils';
import { isWarmupSet } from '../analysis/setClassification';

export interface ExportPackage {
  meta: {
    generatedAt: string;
    months: number | 'all';
    countSets: number;
  };
  rawSets: WorkoutSet[];
  dailySummaries: DailySummary[];
  exerciseStats: ExerciseStats[];
  heatmap: HeatmapEntry[];
  intensityMonthly: ReturnType<typeof getIntensityEvolution>;
  prsOverTime: ReturnType<typeof getPrsOverTime>;
  topExercisesOverTime: ReturnType<typeof getTopExercisesOverTime>;
}

export const gatherLastNMonthsPackage = (
  fullData: WorkoutSet[],
  dailyData: DailySummary[],
  exerciseStats: ExerciseStats[],
  months: number | 'all' = 1,
  now = new Date()
): ExportPackage => {
  const filtered = months === 'all' ? fullData : fullData.filter(s => !!s.parsedDate && s.parsedDate.getTime() >= subMonths(now, months).getTime());

  const daily = getDailySummaries(filtered);
  const exercises = getExerciseStats(filtered);
  const heat: HeatmapEntry[] = daily.map(d => ({ date: new Date(d.timestamp), count: d.sets, totalVolume: d.totalVolume, title: d.workoutTitle }));
  const intensityMonthly = getIntensityEvolution(filtered, 'monthly');
  const prs = getPrsOverTime(filtered, 'daily');

  // pick top exercise names
  const topNames = exercises.slice(0, 10).map(e => e.name);
  const topOverTime = getTopExercisesOverTime(filtered, topNames, 'monthly');

  return {
    meta: { generatedAt: now.toISOString(), months, countSets: filtered.length },
    rawSets: filtered,
    dailySummaries: daily,
    exerciseStats: exercises,
    heatmap: heat,
    intensityMonthly,
    prsOverTime: prs,
    topExercisesOverTime: topOverTime,
  };
};

export const gatherPackageFromSets = (
  sets: WorkoutSet[],
  now = new Date()
): ExportPackage => {
  const daily = getDailySummaries(sets);
  const exercises = getExerciseStats(sets);
  const heat: HeatmapEntry[] = daily.map(d => ({ date: new Date(d.timestamp), count: d.sets, totalVolume: d.totalVolume, title: d.workoutTitle }));
  const intensityMonthly = getIntensityEvolution(sets, 'monthly');
  const prs = getPrsOverTime(sets, 'daily');
  const topNames = exercises.slice(0, 10).map(e => e.name);
  const topOverTime = getTopExercisesOverTime(sets, topNames, 'monthly');

  return {
    meta: { generatedAt: now.toISOString(), months: 0, countSets: sets.length },
    rawSets: sets,
    dailySummaries: daily,
    exerciseStats: exercises,
    heatmap: heat,
    intensityMonthly,
    prsOverTime: prs,
    topExercisesOverTime: topOverTime,
  };
};

const copyTextToClipboardFallback = async (text: string) => {
  if (typeof document === 'undefined') return;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
};

export const exportAndCopyPackage = async (
  fullData: WorkoutSet[],
  dailyData: DailySummary[],
  exerciseStats: ExerciseStats[],
  months: number | 'all' = 1,
  now = new Date()
): Promise<void> => {
  const pkg = gatherLastNMonthsPackage(fullData, dailyData, exerciseStats, months, now);
  const text = JSON.stringify(pkg, null, 2);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch (e) {
    // fallthrough to fallback
  }

  await copyTextToClipboardFallback(text);
};

export default exportAndCopyPackage;

export const exportSetsAndCopy = async (sets: WorkoutSet[], now = new Date()): Promise<void> => {
  const pkg = gatherPackageFromSets(sets, now);
  const text = JSON.stringify(pkg, null, 2);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch (e) {
    // fallthrough to fallback
  }

  await copyTextToClipboardFallback(text);
};

interface ExportMeta {
  generatedAt: string;
  scope: string;
  countSets: number;
}

const AI_PROMPT = `<mention your specific request here> Here are my workout logs. Analyze them deeply, beyond surface-level stats. Identify hidden patterns, habits, and blind spots that standard analysis misses. Give clear, actionable suggestions to improve them, with a balanced and practical approach. Don't limit yourself to my ask, go beyond it, try to solve the problem, not this prompt.`;

const formatSetsAsText = (sets: WorkoutSet[], meta?: ExportMeta): string => {
  if (!sets || sets.length === 0) return '';

  // Group sets by session key
  const sessions = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    const key = getSessionKey(s) || 'unknown';
    if (!sessions.has(key)) sessions.set(key, []);
    sessions.get(key)!.push(s);
  }

  // Build text
  const parts: string[] = [];

  // Prompt first
  parts.push(AI_PROMPT);
  parts.push('');

  if (meta) {
    parts.push(`GeneratedAt: ${meta.generatedAt}`);
    parts.push(`Scope: ${meta.scope}`);
    parts.push(`CountSets: ${meta.countSets}`);
    parts.push('');
  }

  // Sort sessions by date descending
  const entries = Array.from(sessions.entries()).map(([k, sets]) => ({ key: k, sets }))
    .sort((a, b) => {
      const ad = a.sets[0]?.parsedDate?.getTime() ?? 0;
      const bd = b.sets[0]?.parsedDate?.getTime() ?? 0;
      return bd - ad;
    });

  for (const entry of entries) {
    const sessSets = entry.sets.sort((a, b) => (a.set_index || 0) - (b.set_index || 0));
    const date = sessSets[0]?.parsedDate ? format(sessSets[0].parsedDate!, 'yyyy-MM-dd') : 'unknown date';
    const title = sessSets[0]?.title || '';
    parts.push(`Date: ${date}`);
    if (title) parts.push(`Title: ${title}`);

    // Group by exercise name preserving order
    const exOrder: string[] = [];
    const exMap = new Map<string, WorkoutSet[]>();
    for (const s of sessSets) {
      const name = s.exercise_title || 'Unknown Exercise';
      if (!exMap.has(name)) { exMap.set(name, []); exOrder.push(name); }
      exMap.get(name)!.push(s);
    }

    for (const name of exOrder) {
      const exSets = exMap.get(name)!.filter(s => !isWarmupSet(s));
      if (exSets.length === 0) continue;
      const reps = exSets.map(s => (s.reps ?? 0).toString());
      parts.push(name);
      parts.push(`Sets: ${exSets.length}`);
      parts.push(`Reps: ${reps.join(',')}`);
      parts.push('');
    }

    parts.push('---');
  }

  return parts.join('\n');
};

export const exportSetsAndCopyText = async (sets: WorkoutSet[], now = new Date()): Promise<void> => {
  const meta = { generatedAt: now.toISOString(), scope: 'session/day', countSets: sets.length };
  const text = formatSetsAsText(sets, meta);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch (e) {
    // fallthrough
  }
  await copyTextToClipboardFallback(text);
};

export const exportPackageAndCopyText = async (
  fullData: WorkoutSet[],
  dailyData: DailySummary[],
  exerciseStats: ExerciseStats[],
  months: number | 'all' = 1,
  now = new Date()
): Promise<void> => {
  const pkg = gatherLastNMonthsPackage(fullData, dailyData, exerciseStats, months, now);
  const meta: ExportMeta = { generatedAt: pkg.meta.generatedAt, scope: months === 'all' ? 'all' : `${pkg.meta.months}m`, countSets: pkg.meta.countSets };
  const text = formatSetsAsText(pkg.rawSets, meta);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch (e) {
    // fallthrough
  }
  await copyTextToClipboardFallback(text);
};
