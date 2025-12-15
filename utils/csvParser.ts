import { WorkoutSet } from '../types';
import { parse, isValid } from 'date-fns';
import Papa from 'papaparse';
import { toNumber, toInteger, toString } from './formatters';
import { DATE_FORMAT_HEVY } from './dateUtils';

const parseHevyDate = (value: string): Date | undefined => {
  if (!value) return undefined;
  try {
    const d = parse(value, DATE_FORMAT_HEVY, new Date(0));
    return isValid(d) ? d : undefined;
  } catch {
    return undefined;
  }
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
    Papa.parse<Record<string, unknown>>(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      worker: useWorker,
      complete: (results) => {
        try {
          const rows = results.data ?? [];
          const mapped = rows.map(normalizeRow);
          resolve(sortByDateDesc(mapped));
        } catch (err) {
          reject(err);
        }
      },
      error: (error) => reject(error),
    });
  });
};

export const parseWorkoutCSV = (csvContent: string): WorkoutSet[] => {
  const result = Papa.parse<Record<string, unknown>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  const rows = result.data ?? [];
  return sortByDateDesc(rows.map(normalizeRow));
};

export const parseWorkoutCSVAsync = (csvContent: string): Promise<WorkoutSet[]> => {
  return parseWithPapa(csvContent, true);
};
