import { isValid, parse } from 'date-fns';

/**
 * Parse number with international format support (US & EU)
 */
export const parseFlexibleNumber = (value: unknown, fallback = NaN): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;

  let s = String(value ?? '').trim();
  if (!s || s === 'null' || s === 'undefined' || s === '-') return fallback;

  // Remove common suffixes
  s = s.replace(/\s*(kg|kgs|lb|lbs|km|mi|m|sec|s|min|reps?)$/i, '');

  // Detect format: EU (1.234,56) vs US (1,234.56)
  const hasCommaDecimal = /^\d{1,3}(\.\d{3})*,\d+$/.test(s);
  const hasDotDecimal = /^\d{1,3}(,\d{3})*\.\d+$/.test(s);

  if (hasCommaDecimal) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasDotDecimal) {
    s = s.replace(/,/g, '');
  } else if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Parse date with comprehensive format support
 */
export const parseFlexibleDate = (value: unknown): Date | undefined => {
  if (value instanceof Date && isValid(value)) return value;

  const s = String(value ?? '').trim();
  if (!s) return undefined;

  const normalizeTwoDigitYearIfNeeded = (d: Date): Date => {
    if (!isValid(d)) return d;
    const y = d.getFullYear();
    // date-fns parses 2-digit years using the reference date's century.
    // When we parse with an epoch reference, years like "23" can become 1923.
    // If bumping the century lands in our plausible data range, do it.
    if (y > 0 && y < 1971) {
      const bumped = y + 100;
      if (bumped > 1970 && bumped < 2100) {
        const copy = new Date(d.getTime());
        copy.setFullYear(bumped);
        return copy;
      }
    }
    return d;
  };

  const formats = [
    // ISO
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd',
    "yyyy-MM-dd'T'HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm:ssXXX",
    "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
    // Hevy
    'dd MMM yyyy, HH:mm',
    'dd MMM yyyy HH:mm',
    // European
    'dd/MM/yyyy HH:mm:ss',
    'dd/MM/yyyy HH:mm',
    'dd/MM/yyyy',
    'dd/MM/yy HH:mm:ss',
    'dd/MM/yy HH:mm',
    'dd/MM/yy',
    'dd-MM-yyyy HH:mm:ss',
    'dd-MM-yy HH:mm:ss',
    'dd-MM-yy',
    'dd-MM-yyyy',
    'dd. MM.yyyy HH:mm:ss',
    'dd. MM.yyyy',
    // US
    'MM/dd/yyyy HH:mm:ss',
    'MM/dd/yyyy HH:mm',
    'MM/dd/yyyy',
    'MM/dd/yy HH:mm:ss',
    'MM/dd/yy HH:mm',
    'MM/dd/yy',
    'M/d/yyyy h:mm a',
    'M/d/yyyy h:mm:ss a',
    'M/d/yy h:mm a',
    'M/d/yy h:mm:ss a',
    // Other
    'yyyy/MM/dd HH:mm:ss',
    'yyyy/MM/dd',
    'MMM dd, yyyy HH:mm',
    'MMMM dd, yyyy',
    'dd MMM yyyy',
  ];

  for (const fmt of formats) {
    try {
      const d = normalizeTwoDigitYearIfNeeded(parse(s, fmt, new Date(0)));
      if (isValid(d) && d.getFullYear() > 1970 && d.getFullYear() < 2100) {
        return d;
      }
    } catch {
      // Continue
    }
  }

  // Native fallback
  try {
    const d = new Date(s);
    if (isValid(d) && d.getFullYear() > 1970 && d.getFullYear() < 2100) {
      return d;
    }
  } catch {
    // Ignore
  }

  return undefined;
};

/**
 * Parse duration to seconds
 */
export const parseDuration = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }

  const s = String(value ?? '').trim();
  if (!s) return 0;

  // Pure number
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    return Math.round(parseFloat(s));
  }

  // HH:MM:SS or MM:SS
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const parts = s.split(':').map((p) => parseInt(p, 10));
    if (parts.some((p) => isNaN(p))) return 0;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  // Text format: 1h 30m 45s
  let total = 0;
  const hours = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour)/i);
  const mins = s.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute)/i);
  const secs = s.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second)/i);

  if (hours) total += parseFloat(hours[1]) * 3600;
  if (mins) total += parseFloat(mins[1]) * 60;
  if (secs) total += parseFloat(secs[1]);

  return Math.round(total);
};

/**
 * Normalize set type to standard values.
 * These values match the SetTypeId in setClassification.ts
 */
export const normalizeSetType = (value: unknown): string => {
  const s = String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!s || s === 'normalset' || s === 'normal' || s === 'working' || s === 'work' || s === 'regular' || s === 'standard') return 'normal';

  // Warmup variations, including a Yes/No or true/false warm-up column (Anneal, Fitbod).
  if (s.includes('warm') || s === 'w' || s === 'warmupset' || s === 'yes' || s === 'true' || s === '1') return 'warmup';
  if (s === 'no' || s === 'false' || s === '0') return 'normal';

  // Unilateral (left/right)
  if (s === 'left' || s === 'leftset' || s === 'l' || (s.includes('left') && s.includes('set'))) return 'left';
  if (s === 'right' || s === 'rightset' || s === 'r' || (s.includes('right') && s.includes('set'))) return 'right';

  // Drop sets
  if (s.includes('drop') || s === 'd' || s === 'dropset') return 'dropset';

  // Failure
  if (s.includes('fail') || s === 'x' || s === 'failure') return 'failure';

  // AMRAP
  if (s.includes('amrap') || s === 'a') return 'amrap';

  // Rest-pause
  if ((s.includes('rest') && s.includes('pause')) || s === 'rp' || s === 'restpause') return 'restpause';

  // Myo reps
  if (s.includes('myo') || s === 'm' || s === 'myoreps' || s === 'myorepsset') return 'myoreps';

  // Cluster
  if (s.includes('cluster') || s === 'c') return 'cluster';

  // Giant set
  if (s.includes('giant') || s === 'g' || s === 'giantset') return 'giantset';

  // Superset
  if (s.includes('super') || s === 's' || s === 'superset') return 'superset';

  // Back-off set
  if (s.includes('backoff') || (s.includes('back') && s.includes('off')) || s === 'b' || s === 'backoffset') return 'backoff';

  // Top set
  if (s.includes('top') || s === 't' || s === 'topset') return 'topset';

  // Feeder set
  if (s.includes('feeder') || s === 'f' || s === 'feederset') return 'feederset';

  // Negative / eccentric reps
  if (s.includes('negative') || s.includes('eccentric') || s === 'n' || s === 'negativereps') return 'negative';

  // Partial reps
  if (s.includes('partial') || s === 'p' || s === 'partialreps' || s === 'partialrepsset') return 'partial';

  return 'normal';
};

/**
 * Convert RIR to RPE
 */
export const rirToRpe = (rir: number): number => Math.max(1, Math.min(10, 10 - rir));
