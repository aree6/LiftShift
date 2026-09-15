import { useMemo, useState } from 'react';
import type { DailySummary, WorkoutSet } from '../../../types';
import { isWarmupSet } from '../../../utils/analysis/classification';
import { getSessionKey } from '../../../utils/date/dateUtils';

export type ReceiptPeriod = '7d' | '30d' | 'all';

export const RECEIPT_WINDOW_DAYS: Record<'7d' | '30d', number> = { '7d': 7, '30d': 30 };
export const PERIOD_LABEL: Record<ReceiptPeriod, string> = { '7d': 'LAST 7 DAYS', '30d': 'LAST 30 DAYS', 'all': 'ALL TIME' };

const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function fmtDay(d: Date): string {
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
}

export function fmtMinutes(totalMin: number): string {
  const m = Math.round(totalMin);
  if (m < 60) return `${m}M`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}H` : `${h}H ${rest}M`;
}

/** Deterministic document number from the underlying data — same training, same number. */
export function receiptNoFor(period: ReceiptPeriod, sessions: number, sets: number, volumeKg: number): string {
  const str = `${period}|${sessions}|${sets}|${Math.round(volumeKg)}`;
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33 + str.charCodeAt(i)) >>> 0);
  return `LS-${period.toUpperCase()}-${h.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`;
}

const SOURCE_LABEL: Record<string, string> = {
  hevy: 'HEVY IMPORT',
  strong: 'STRONG IMPORT',
  lyfta: 'LYFTA IMPORT',
  motra: 'MOTRA',
  other: 'IMPORTED FILE',
};

export interface ReceiptLine {
  name: string;
  sets: number;
  reps: number;
  volumeKg: number;
  avgKg: number;
}

export interface ReceiptDayPoint {
  key: string;
  date: Date;
  dayNum: number;
  volumeKg: number;
  sets: number;
  active: boolean;
}

export interface BestLift {
  name: string;
  weightKg: number;
  reps: number;
}

export interface TrainingReceipt {
  period: ReceiptPeriod;
  lines: ReceiptLine[];
  sessions: number;
  sets: number;
  reps: number;
  volumeKg: number;
  timeMin: number;
  sourceLabel: string;
  lastDate: Date;
  start: Date;
  end: Date;
  no: string;
  prCount: number;
  bestLift: BestLift | null;
  daySeries: ReceiptDayPoint[];
  maxDayVolumeKg: number;
}

/**
 * Shared aggregation behind the receipt + manifest dashboard cards.
 * Everything returned is derived from real training data — no filler.
 */
export function useTrainingReceiptData(
  fullData: WorkoutSet[],
  dailyData: DailySummary[] | undefined,
  effectiveNow: Date,
  initialPeriod: ReceiptPeriod = '7d',
): { period: ReceiptPeriod; setPeriod: (p: ReceiptPeriod) => void; receipt: TrainingReceipt } {
  const [period, setPeriod] = useState<ReceiptPeriod>(initialPeriod);

  const receipt = useMemo<TrainingReceipt>(() => {
    const end = new Date(effectiveNow);
    end.setHours(23, 59, 59, 999);
    const endTs = end.getTime();

    let start: Date;
    if (period === 'all') {
      let minTs = Infinity;
      for (const s of fullData) {
        const t = s.parsedDate?.getTime();
        if (t && t < minTs) minTs = t;
      }
      start = Number.isFinite(minTs) ? new Date(minTs) : new Date(effectiveNow);
      start.setHours(0, 0, 0, 0);
    } else {
      const days = RECEIPT_WINDOW_DAYS[period];
      start = new Date(effectiveNow);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));
    }
    const startTs = start.getTime();

    // One point per day; weekly buckets when the span is long (all-time).
    const spanDays = Math.max(1, Math.ceil((endTs - startTs) / 86400000));
    const bucketSize = spanDays > 62 ? 7 : 1;
    const bucketCount = Math.ceil(spanDays / bucketSize);
    const bucketVol = new Array<number>(bucketCount).fill(0);
    const bucketSets = new Array<number>(bucketCount).fill(0);

    const working = fullData.filter(
      (s) => s.parsedDate && s.parsedDate.getTime() >= startTs && s.parsedDate.getTime() <= endTs && !isWarmupSet(s),
    );

    const byExercise = new Map<string, ReceiptLine>();
    let totalReps = 0;
    let totalVolumeKg = 0;
    let prCount = 0;
    let bestLift: BestLift | null = null;
    const sources = new Map<string, number>();
    let lastTs = 0;

    for (const s of working) {
      const name = s.exercise_title || 'Unknown';
      const reps = s.reps || 0;
      const vol = (s.weight_kg || 0) * reps;
      totalReps += reps;
      totalVolumeKg += vol;
      if (s.isPr) prCount += 1;
      if (s.parsedDate) {
        if (s.parsedDate.getTime() > lastTs) lastTs = s.parsedDate.getTime();
        const idx = Math.min(
          bucketCount - 1,
          Math.floor((s.parsedDate.getTime() - startTs) / (bucketSize * 86400000)),
        );
        if (idx >= 0) {
          bucketVol[idx] += vol;
          bucketSets[idx] += 1;
        }
      }
      if ((s.weight_kg || 0) > 0 && (!bestLift || (s.weight_kg || 0) > bestLift.weightKg)) {
        bestLift = { name, weightKg: s.weight_kg || 0, reps };
      }
      if (s.source) sources.set(s.source, (sources.get(s.source) ?? 0) + 1);

      const existing = byExercise.get(name);
      if (!existing) {
        byExercise.set(name, { name, sets: 1, reps, volumeKg: vol, avgKg: 0 });
      } else {
        existing.sets += 1;
        existing.reps += reps;
        existing.volumeKg += vol;
      }
    }

    const lines = Array.from(byExercise.values())
      .map((l) => ({ ...l, avgKg: l.reps > 0 ? l.volumeKg / l.reps : 0 }))
      .sort((a, b) => b.volumeKg - a.volumeKg)
      .slice(0, 5);

    const sessions = new Set(working.map((s) => getSessionKey(s)).filter(Boolean)).size;

    const timeMin = dailyData
      ? dailyData
          .filter((d) => d.timestamp >= startTs && d.timestamp <= endTs)
          .reduce((sum, d) => sum + (d.durationMinutes || 0), 0)
      : working.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60;

    const topSource = Array.from(sources.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
    const sourceLabel = topSource ? (SOURCE_LABEL[topSource] ?? 'IMPORTED FILE') : 'LIFTSHIFT APP';

    const daySeries: ReceiptDayPoint[] = [];
    let maxDayVolumeKg = 0;
    for (let b = 0; b < bucketCount; b++) {
      const date = new Date(startTs + b * bucketSize * 86400000);
      const volumeKg = bucketVol[b];
      const sets = bucketSets[b];
      if (volumeKg > maxDayVolumeKg) maxDayVolumeKg = volumeKg;
      daySeries.push({ key: `b-${b}`, date, dayNum: date.getDate(), volumeKg, sets, active: sets > 0 });
    }

    return {
      period,
      lines,
      sessions,
      sets: working.length,
      reps: totalReps,
      volumeKg: totalVolumeKg,
      timeMin,
      sourceLabel,
      lastDate: lastTs > 0 ? new Date(lastTs) : effectiveNow,
      start,
      end,
      no: receiptNoFor(period, sessions, working.length, totalVolumeKg),
      prCount,
      bestLift,
      daySeries,
      maxDayVolumeKg,
    };
  }, [fullData, dailyData, period, effectiveNow]);

  return { period, setPeriod, receipt };
}
