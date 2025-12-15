import { WorkoutSet } from '../types';
import { parse, isValid } from 'date-fns';
import Papa from 'papaparse';
import { toNumber, toInteger, toString } from './formatters';
import { DATE_FORMAT_HEVY } from './dateUtils';

const REQUIRED_HEADERS = [
  'title',
  'start_time',
  'exercise_title',
  'set_index',
  'set_type',
  'weight_kg',
  'reps',
] as const;

const normalizeHeader = (header: string): string => header.trim().replace(/^\uFEFF/, '');

const validateHevyCSV = (fields: string[] | undefined): void => {
  const normalizedFields = (fields ?? []).map(normalizeHeader);
  const missing = REQUIRED_HEADERS.filter(h => !normalizedFields.includes(h));

  if (!fields || fields.length === 0) {
    throw new Error('CSV file is empty or missing a header row. Please export your workout data from the Hevy app and try again.');
  }

  if (missing.length > 0) {
    throw new Error(
      'Invalid CSV format. HevyAnalytics only supports the workout CSV exported from the Hevy app. If you exported in another language, switch the Hevy app language to English before exporting and try again.'
    );
  }
};

const parseHevyDate = (value: string): Date | undefined => {
  if (!value) return undefined;
  try {
    const d = parse(value, DATE_FORMAT_HEVY, new Date(0));
    return isValid(d) ? d : undefined;
  } catch {
    return undefined;
  }
};

const normalizeRowKeys = (row: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[normalizeHeader(key)] = value;
  }
  return out;
};

const normalizeRow = (row: Record<string, unknown>): WorkoutSet => {
  const start_time = toString(row.start_time);
  return {
    title: toString(row.title),
    start_time,
    end_time: toString(row.end_time),
    description: toString(row.description),
    exercise_title: toString(row.exercise_title),
    superset_id: toString(row.superset_id),
    exercise_notes: toString(row.exercise_notes),
    set_index: toInteger(row.set_index),
    set_type: toString(row.set_type),
    weight_kg: toNumber(row.weight_kg),
    reps: toNumber(row.reps),
    distance_km: toNumber(row.distance_km),
    duration_seconds: toNumber(row.duration_seconds),
    rpe: row.rpe != null && row.rpe !== '' ? toNumber(row.rpe) : null,
    parsedDate: parseHevyDate(start_time),
  };
};

const sortByDateDesc = (sets: WorkoutSet[]): WorkoutSet[] => {
  return sets.sort((a, b) => {
    const timeA = a.parsedDate?.getTime() ?? 0;
    const timeB = b.parsedDate?.getTime() ?? 0;
    return timeB - timeA;
  });
};

const parseWithPapa = (csvContent: string, useWorker: boolean): Promise<WorkoutSet[]> => {
  return new Promise((resolve, reject) => {
    const config: Papa.ParseConfig<Record<string, unknown>> = {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      worker: useWorker,
      complete: (results) => {
        try {
          if (results.errors && results.errors.length > 0) {
            throw new Error(results.errors[0]?.message ?? 'Failed to parse CSV');
          }
          const rows = (results.data ?? []).map(normalizeRowKeys);
          validateHevyCSV(results.meta.fields);
          const mapped = rows.map(normalizeRow);
          const withStart = mapped.filter(s => Boolean(s.start_time)).length;
          const withValidDate = mapped.filter(s => Boolean(s.start_time) && Boolean(s.parsedDate)).length;
          if (withStart >= 5 && withValidDate / withStart < 0.5) {
            throw new Error(
              "We detected a Hevy workout CSV, but couldn't parse the workout dates. This usually happens when the Hevy export language isn't English. Please switch Hevy app language to English, export again, and re-upload."
            );
          }
          resolve(sortByDateDesc(mapped));
        } catch (err) {
          reject(err);
        }
      },
      error: (error) => reject(error),
    };

    if (!useWorker) {
      config.transformHeader = (header) => normalizeHeader(header);
    }

    Papa.parse<Record<string, unknown>>(csvContent, config);
  });
};

export const parseWorkoutCSV = (csvContent: string): WorkoutSet[] => {
  const result = Papa.parse<Record<string, unknown>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (header) => normalizeHeader(header),
  });
  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0]?.message ?? 'Failed to parse CSV');
  }
  const rows = result.data ?? [];
  validateHevyCSV(result.meta.fields);
  return sortByDateDesc(rows.map(normalizeRow));
};

export const parseWorkoutCSVAsync = (csvContent: string): Promise<WorkoutSet[]> => {
  return parseWithPapa(csvContent, true);
};
