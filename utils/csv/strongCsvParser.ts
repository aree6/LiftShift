import { WorkoutSet } from '../../types';
import { addSeconds, isValid, parse, format } from 'date-fns';
import { toInteger, toString } from '../format/formatters';
import type { WeightUnit } from '../storage/localStorage';
import { DATE_FORMAT_HEVY } from '../date/dateUtils';
import type { ExerciseNameResolver } from '../exercise/exerciseNameResolver';

const LBS_TO_KG = 0.45359237;
const MILES_TO_KM = 1.609344;

export interface StrongParseResult {
  sets: WorkoutSet[];
  unmatchedExercises: string[];
  fuzzyMatches: number;
  representativeMatches: number;
}

export interface StrongParseOptions {
  unit: WeightUnit;
  resolver?: ExerciseNameResolver;
}

const normalizeStrongHeader = (header: string): string =>
  String(header ?? '')
    .trim()
    .replace(/^\uFEFF/, '')
    .toLowerCase();

const normalizeStrongRow = (row: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[normalizeStrongHeader(k)] = v;
  }
  return out;
};

const parseStrongNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const s = String(value ?? '').trim();
  if (!s) return fallback;

  const looksLikeCommaDecimal = /^-?\d+,\d+$/.test(s);
  const normalized = looksLikeCommaDecimal
    ? s.replace(',', '.')
    : s.replace(/,(?=\d{3}(?:\D|$))/g, '');

  const n = parseFloat(normalized);
  return Number.isNaN(n) ? fallback : n;
};

const parseStrongDate = (value: unknown): Date | undefined => {
  const s = String(value ?? '').trim();
  if (!s) return undefined;

  const fmts = ['yyyy-MM-dd HH:mm:ss', 'yyyy-MM-dd HH:mm', 'yyyy-MM-dd'];
  for (const f of fmts) {
    try {
      const d = parse(s, f, new Date(0));
      if (isValid(d)) return d;
    } catch {
      // ignore
    }
  }
  return undefined;
};

const parseDurationSeconds = (value: unknown): number => {
  const s = String(value ?? '').trim();
  if (!s) return 0;

  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(s)) {
    const parts = s.split(':').map(p => parseInt(p, 10));
    if (parts.some(p => Number.isNaN(p))) return 0;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  let total = 0;
  const h = s.match(/(\d+)\s*h/i);
  const m = s.match(/(\d+)\s*m/i);
  const sec = s.match(/(\d+)\s*s/i);
  if (h) total += parseInt(h[1], 10) * 3600;
  if (m) total += parseInt(m[1], 10) * 60;
  if (sec) total += parseInt(sec[1], 10);
  return Number.isFinite(total) ? total : 0;
};

const normalizeUnit = (unit: unknown): string => String(unit ?? '').trim().toLowerCase();

const weightToKg = (weight: number, preferredUnit: WeightUnit, rowUnit: string): number => {
  if (!Number.isFinite(weight) || weight <= 0) return 0;

  const u = normalizeUnit(rowUnit);
  if (u.startsWith('kg')) return weight;
  if (u.startsWith('lb') || u.startsWith('pound')) return weight * LBS_TO_KG;

  return preferredUnit === 'lbs' ? weight * LBS_TO_KG : weight;
};

const distanceToKm = (distance: number, rowUnit: string): number => {
  if (!Number.isFinite(distance) || distance <= 0) return 0;

  const u = normalizeUnit(rowUnit);
  if (u.startsWith('km')) return distance;
  if (u.startsWith('mi')) return distance * MILES_TO_KM;
  if (u.startsWith('m') || u.startsWith('meter')) return distance / 1000;

  return distance;
};

const formatHevyDate = (d: Date): string => {
  try {
    return format(d, DATE_FORMAT_HEVY);
  } catch {
    return '';
  }
};

export const isStrongCSV = (fields: string[] | undefined): boolean => {
  if (!fields || fields.length === 0) return false;
  const set = new Set(fields.map(normalizeStrongHeader));
  const required = ['date', 'workout name', 'exercise name', 'set order', 'weight'];
  return required.every(h => set.has(h));
};

export const parseStrongRows = (
  rawRows: Record<string, unknown>[],
  opts: StrongParseOptions
): StrongParseResult => {
  const unmatched = new Set<string>();
  let fuzzyMatches = 0;
  let representativeMatches = 0;

  const mapped: WorkoutSet[] = rawRows.map((r) => {
    const row = normalizeStrongRow(r);

    const startDate = parseStrongDate(row['date']);
    const start_time = toString(row['date']);

    const durationSeconds =
      parseDurationSeconds(row['workout duration']) || parseDurationSeconds(row['duration']);
    const end_time = startDate && durationSeconds > 0 ? formatHevyDate(addSeconds(startDate, durationSeconds)) : '';

    const rawExercise = toString(row['exercise name']);
    const resolution = opts.resolver ? opts.resolver.resolve(rawExercise) : null;
    const exercise_title = resolution?.name ? resolution.name : rawExercise;

    if (opts.resolver) {
      if (!resolution || resolution.method === 'none') {
        if (rawExercise) unmatched.add(rawExercise);
      } else if (resolution.method === 'fuzzy') {
        fuzzyMatches += 1;
      } else if (resolution.method === 'representative') {
        representativeMatches += 1;
      }
    }

    const weight = parseStrongNumber(row['weight']);
    const weightUnit = normalizeUnit(row['weight unit']);
    const weight_kg = weightToKg(weight, opts.unit, weightUnit);

    const distance = parseStrongNumber(row['distance']);
    const distanceUnit = normalizeUnit(row['distance unit']);
    const distance_km = distanceToKm(distance, distanceUnit);

    const seconds = parseStrongNumber(row['seconds']);
    const rpe = row['rpe'] != null && String(row['rpe']).trim() !== '' ? parseStrongNumber(row['rpe'], 0) : null;

    return {
      title: toString(row['workout name']),
      start_time,
      end_time,
      description: toString(row['workout notes']),
      exercise_title,
      superset_id: '',
      exercise_notes: toString(row['notes']),
      set_index: toInteger(row['set order']),
      set_type: 'normal',
      weight_kg,
      reps: parseStrongNumber(row['reps']),
      distance_km,
      duration_seconds: seconds,
      rpe,
      parsedDate: startDate,
    };
  });

  return {
    sets: mapped,
    unmatchedExercises: Array.from(unmatched).sort((a, b) => a.localeCompare(b)),
    fuzzyMatches,
    representativeMatches,
  };
};
