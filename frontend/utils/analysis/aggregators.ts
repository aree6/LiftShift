import { getDateKey, TimePeriod, sortByTimestamp } from '../date/dateUtils';
import { roundTo } from '../format/formatters';

export interface AggregatedBucket<T> {
  key: string;
  timestamp: number;
  label: string;
  items: T[];
}

export const groupByPeriod = <T extends { parsedDate?: Date }>(
  items: T[],
  period: TimePeriod
): AggregatedBucket<T>[] => {
  const buckets = new Map<string, AggregatedBucket<T>>();

  for (const item of items) {
    if (!item.parsedDate) continue;
    
    const { key, timestamp, label } = getDateKey(item.parsedDate, period);
    
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, timestamp, label, items: [] };
      buckets.set(key, bucket);
    }
    bucket.items.push(item);
  }

  return sortByTimestamp(Array.from(buckets.values()));
};

export const aggregateByKey = <T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K,
  initialValue: () => Record<string, number>,
  aggregateFn: (acc: Record<string, number>, item: T) => void
): Map<K, Record<string, number>> => {
  const result = new Map<K, Record<string, number>>();

  for (const item of items) {
    const key = keyFn(item);
    let acc = result.get(key);
    if (!acc) {
      acc = initialValue();
      result.set(key, acc);
    }
    aggregateFn(acc, item);
  }

  return result;
};

export interface TimeSeriesEntry {
  timestamp: number;
  dateFormatted: string;
  [key: string]: number | string;
}

export const buildTimeSeries = <T extends { parsedDate?: Date }>(
  items: T[],
  period: TimePeriod,
  extractValues: (item: T) => Record<string, number>
): { data: TimeSeriesEntry[]; keys: string[] } => {
  const buckets = new Map<string, { 
    timestamp: number; 
    label: string; 
    values: Record<string, number> 
  }>();
  const allKeys = new Set<string>();

  for (const item of items) {
    if (!item.parsedDate) continue;

    const { key, timestamp, label } = getDateKey(item.parsedDate, period);
    
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { timestamp, label, values: {} };
      buckets.set(key, bucket);
    }

    const extracted = extractValues(item);
    for (const [k, v] of Object.entries(extracted)) {
      bucket.values[k] = (bucket.values[k] || 0) + v;
      allKeys.add(k);
    }
  }

  const keys = Array.from(allKeys);
  const entries = Array.from(buckets.values());
  const sorted = sortByTimestamp(entries);

  const data: TimeSeriesEntry[] = sorted.map(entry => {
    const row: TimeSeriesEntry = {
      timestamp: entry.timestamp,
      dateFormatted: entry.label,
    };
    for (const k of keys) {
      row[k] = roundTo(entry.values[k] || 0, 1);
    }
    return row;
  });

  return { data, keys };
};

export const computeTotals = <T extends Record<string, number | string>>(
  data: T[],
  keys: string[]
): Record<string, number> => {
  const totals: Record<string, number> = {};
  for (const row of data) {
    for (const k of keys) {
      const val = row[k];
      if (typeof val === 'number') {
        totals[k] = (totals[k] || 0) + val;
      }
    }
  }
  return totals;
};

export const sortKeysByTotal = (
  totals: Record<string, number>,
  keys: string[],
  limit?: number
): string[] => {
  const sorted = [...keys].sort((a, b) => (totals[b] || 0) - (totals[a] || 0));
  return limit ? sorted.slice(0, limit) : sorted;
};
