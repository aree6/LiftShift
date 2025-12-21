import { WorkoutSet } from '../../types';
import { parse, isValid, format, addSeconds } from 'date-fns';
import Papa from 'papaparse';
import { toString } from '../format/formatters';
import type { WeightUnit } from '../storage/localStorage';
import type { ExerciseNameResolver } from '../exercise/exerciseNameResolver';

// ============================================================================
// CONSTANTS
// ============================================================================

const LBS_TO_KG = 0.45359237;
const MILES_TO_KM = 1.609344;
const METERS_TO_KM = 0.001;
const FEET_TO_KM = 0.0003048;
const OUTPUT_DATE_FORMAT = 'dd MMM yyyy, HH:mm';

// ============================================================================
// TYPES
// ============================================================================

type Row = Record<string, unknown>;

type SemanticField =
  | 'workoutTitle'
  | 'exercise'
  | 'startTime'
  | 'endTime'
  | 'duration'
  | 'setIndex'
  | 'setType'
  | 'weight'
  | 'weightUnit'
  | 'reps'
  | 'distance'
  | 'distanceUnit'
  | 'rpe'
  | 'rir'
  | 'notes'
  | 'workoutNotes'
  | 'supersetId'
  | 'restTime';

interface SemanticConfig {
  synonyms: readonly string[];
  priority: number;
  validate?:  (values: unknown[]) => number;
}

interface FieldMatch {
  field:  SemanticField;
  confidence: number;
  originalHeader: string;
  unitHint?: string;
}

export interface ParseOptions {
  userWeightUnit:  WeightUnit;
  userDistanceUnit?:  'km' | 'miles' | 'meters';
  resolver?: ExerciseNameResolver;
}

export interface ParseResult {
  sets:  WorkoutSet[];
  meta: {
    confidence: number;
    fieldMappings: Record<string, string>;
    unmatchedExercises?:  string[];
    fuzzyMatches?: number;
    representativeMatches?: number;
    rowCount:  number;
    warnings?: string[];
  };
}

interface TransformContext {
  fieldMappings: Map<string, FieldMatch>;
  options: ParseOptions;
  stats: {
    unmatched:  Set<string>;
    fuzzyMatches: number;
    representativeMatches:  number;
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize string for matching:  lowercase, remove all non-alphanumeric
 */
const normalize = (s: string): string =>
  String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');

/**
 * Clean header:  lowercase, normalize separators, remove BOM
 */
const normalizeHeader = (s: string): string =>
  String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

/**
 * Dice coefficient for string similarity
 */
const similarity = (a: string, b: string): number => {
  const aNorm = normalize(a);
  const bNorm = normalize(b);

  if (aNorm === bNorm) return 1;
  if (aNorm.length < 2 || bNorm.length < 2) return 0;

  // Containment check
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) {
    const ratio = Math.min(aNorm.length, bNorm.length) / Math.max(aNorm.length, bNorm.length);
    return 0.7 + ratio * 0.25;
  }

  // Bigram similarity
  const getBigrams = (s: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.slice(i, i + 2));
    }
    return bigrams;
  };

  const aBigrams = getBigrams(aNorm);
  const bBigrams = getBigrams(bNorm);

  let matches = 0;
  for (const bigram of aBigrams) {
    if (bBigrams.has(bigram)) matches++;
  }

  return (2 * matches) / (aBigrams.size + bBigrams. size);
};

/**
 * Detect sequential reset patterns in numbers (1,2,3,1,2,1,2,3...)
 */
const detectSequentialResets = (nums: number[]): boolean => {
  if (nums.length < 3) return true;
  let resets = 0;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === 1 && nums[i - 1] > 1) resets++;
  }
  return resets >= 1 || nums.every(n => n >= 1 && n <= 15);
};

/**
 * Extract unit hint from header name
 */
const extractUnitFromHeader = (header:  string): string | undefined => {
  const h = header.toLowerCase();

  // Weight units
  if (/kgs?$|_kgs?$|\(kgs?\)/i.test(h)) return 'kg';
  if (/lbs? $|_lbs?$|pounds|\(lbs?\)/i.test(h)) return 'lbs';

  // Distance units
  if (/km$|_km$|kilometers?|kilometres?|\(km\)/i.test(h)) return 'km';
  if (/mi$|_mi$|miles?|\(mi\)/i.test(h)) return 'miles';
  if (/(?:^|_)m$|meters?|metres?|\(m\)/i.test(h) && !/km|mi/i.test(h)) return 'meters';

  return undefined;
};

/**
 * Parse number with international format support (US & EU)
 */
const parseFlexibleNumber = (value: unknown, fallback = NaN): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;

  let s = String(value ?? '').trim();
  if (! s || s === 'null' || s === 'undefined' || s === '-') return fallback;

  // Remove common suffixes
  s = s.replace(/\s*(kg|kgs|lb|lbs|km|mi|m|sec|s|min|reps?)$/i, '');

  // Detect format:  EU (1. 234,56) vs US (1,234.56)
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
const parseFlexibleDate = (value: unknown): Date | undefined => {
  if (value instanceof Date && isValid(value)) return value;

  const s = String(value ?? '').trim();
  if (!s) return undefined;

  const formats = [
    // ISO
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd',
    "yyyy-MM-dd'T'HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm: ssXXX",
    // Hevy
    'dd MMM yyyy, HH:mm',
    'dd MMM yyyy HH:mm',
    // European
    'dd/MM/yyyy HH:mm: ss',
    'dd/MM/yyyy HH:mm',
    'dd/MM/yyyy',
    'dd-MM-yyyy HH:mm: ss',
    'dd-MM-yyyy',
    'dd. MM.yyyy HH:mm:ss',
    'dd. MM.yyyy',
    // US
    'MM/dd/yyyy HH:mm:ss',
    'MM/dd/yyyy HH:mm',
    'MM/dd/yyyy',
    'M/d/yyyy h:mm a',
    'M/d/yyyy h:mm: ss a',
    // Other
    'yyyy/MM/dd HH:mm:ss',
    'yyyy/MM/dd',
    'MMM dd, yyyy HH:mm',
    'MMMM dd, yyyy',
    'dd MMM yyyy',
  ];

  for (const fmt of formats) {
    try {
      const d = parse(s, fmt, new Date(0));
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
const parseDuration = (value: unknown): number => {
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
    const parts = s.split(': ').map(p => parseInt(p, 10));
    if (parts.some(p => isNaN(p))) return 0;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  // Text format:  1h 30m 45s
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
 * Normalize set type to standard values
 */
const normalizeSetType = (value: unknown): string => {
  const s = String(value ?? '').toLowerCase().replace(/[^a-z]/g, '');

  if (! s || s === 'normalset' || s === 'normal' || s === 'working' || s === 'work' || s === 'regular' || s === 'standard') return 'normal';
  if (s.includes('warm')) return 'warmup';
  if (s.includes('drop')) return 'dropset';
  if (s.includes('fail')) return 'failure';
  if (s.includes('amrap')) return 'amrap';
  if (s.includes('rest') && s.includes('pause')) return 'restpause';
  if (s.includes('myo')) return 'myoreps';
  if (s.includes('cluster')) return 'cluster';
  if (s.includes('giant')) return 'giantset';
  if (s.includes('super')) return 'superset';
  if (s.includes('backoff') || (s.includes('back') && s.includes('off'))) return 'backoff';
  if (s.includes('right') || s.includes('left')) return 'normal';

  return 'normal';
};

/**
 * Convert RIR to RPE
 */
const rirToRpe = (rir: number): number => Math.max(1, Math.min(10, 10 - rir));

// ============================================================================
// SEMANTIC DICTIONARY
// ============================================================================
// THE ONLY CONFIGURATION.  Add synonyms here to support new platforms. 

const SEMANTIC_DICTIONARY:  Record<SemanticField, SemanticConfig> = {
  workoutTitle: {
    synonyms: [
      'title', 'workout', 'workout name', 'workout title', 'routine', 'routine name',
      'session', 'session name', 'training', 'program', 'name',
      'workoutname', 'workouttitle', 'routinename', 'sessionname',
      'workout_name', 'workout_title', 'routine_name', 'session_name',
    ],
    priority:  5,
    validate:  (values) => {
      const strings = values.filter(v => typeof v === 'string' && v.length > 0);
      if (strings.length === 0) return 0;
      const uniqueRatio = new Set(strings).size / strings.length;
      return uniqueRatio < 0.3 ? 0.8 : 0.4;
    },
  },

  exercise: {
    synonyms: [
      'exercise', 'exercise name', 'exercise title', 'movement', 'lift', 'activity',
      'drill', 'move', 'action',
      'exercisename', 'exercisetitle',
      'exercise_name', 'exercise_title',
    ],
    priority:  10,
    validate:  (values) => {
      const strings = values.filter(v => typeof v === 'string' && v.length > 0);
      const fitnessTerms = /bench|squat|deadlift|press|curl|row|pull|push|raise|extension|fly|lunge|crunch|plank|cable|dumbbell|barbell|machine|lat|tricep|bicep|chest|leg|shoulder|core|glute|calf|ham|quad/i;
      const matchCount = strings.filter(s => fitnessTerms.test(String(s))).length;
      return matchCount > 0 ? 0.9 : 0.5;
    },
  },

  startTime: {
    synonyms: [
      'date', 'time', 'datetime', 'timestamp', 'when',
      'start', 'start time', 'start date', 'started', 'started at',
      'performed', 'performed at', 'logged', 'logged at', 'recorded', 'created', 'created at',
      'starttime', 'startdate', 'startedat', 'performedat', 'createdat', 'logdate',
      'start_time', 'start_date', 'started_at', 'performed_at', 'created_at', 'log_date',
      'workout date', 'workout time', 'session date', 'session time',
      'workoutdate', 'workouttime', 'sessiondate',
      'workout_date', 'workout_time', 'session_date',
    ],
    priority:  9,
    validate:  (values) => {
      const dateCount = values.filter(v => parseFlexibleDate(v) !== undefined).length;
      return values.length > 0 ?  dateCount / values.length :  0;
    },
  },

  endTime: {
    synonyms:  [
      'end', 'end time', 'end date', 'ended', 'ended at',
      'finished', 'finished at', 'completed', 'completed at', 'stop', 'stopped',
      'endtime', 'enddate', 'endedat', 'finishedat', 'completedat',
      'end_time', 'end_date', 'ended_at', 'finished_at', 'completed_at',
    ],
    priority:  3,
  },

  duration:  {
    synonyms: [
      'duration', 'length', 'elapsed', 'total time',
      'workout duration', 'session duration', 'workout length', 'workout time',
      'seconds', 'secs', 'sec', 'minutes', 'mins', 'min',
      'totaltime', 'workoutduration', 'sessionduration', 'workoutlength', 'elapsedtime',
      'durationseconds', 'durationminutes',
      'total_time', 'workout_duration', 'session_duration', 'workout_length', 'elapsed_time',
      'duration_seconds', 'duration_minutes',
    ],
    priority: 5,
    validate:  (values) => {
      const durationLike = values.filter(v => {
        const s = String(v ?? '');
        return /^\d{1,2}:\d{2}(:\d{2})?$/.test(s) ||
               /^\d+\s*(s|sec|m|min|h|hr)/i.test(s) ||
               (typeof v === 'number' && v >= 0 && v < 86400);
      });
      return values.length > 0 ? durationLike.length / values.length : 0;
    },
  },

  setIndex: {
    synonyms: [
      'set', 'set index', 'set number', 'set order', 'set num', 'set no', 'set #',
      'order', 'index', 'number', 'num', 'no', '#',
      'setindex', 'setnumber', 'setorder', 'setnum', 'setno',
      'set_index', 'set_number', 'set_order', 'set_num', 'set_no',
    ],
    priority:  6,
    validate:  (values) => {
      const nums = values.map(v => parseInt(String(v), 10)).filter(n => ! isNaN(n));
      if (nums.length === 0) return 0;
      const allSmall = nums.every(n => n >= 0 && n <= 50);
      const hasResets = detectSequentialResets(nums);
      return allSmall && hasResets ? 0.9 : allSmall ? 0.6 : 0.2;
    },
  },

  setType: {
    synonyms: [
      'set type', 'type', 'kind', 'category', 'set category', 'set kind',
      'settype', 'setkind', 'setcategory',
      'set_type', 'set_kind', 'set_category',
    ],
    priority:  5,
    validate:  (values) => {
      const setTypeTerms = /normal|warm|drop|failure|working|amrap|cluster|rest|pause|myo|regular|standard/i;
      const matches = values.filter(v => setTypeTerms.test(String(v ?? '')));
      return values.length > 0 ? matches.length / values.length :  0;
    },
  },

  weight: {
    synonyms: [
      'weight', 'load', 'resistance', 'mass',
      'weight kg', 'weight kgs', 'weight lb', 'weight lbs', 'weight pounds',
      'kg', 'kgs', 'lb', 'lbs', 'pounds', 'kilograms',
      'weight (kg)', 'weight (lbs)', 'weight (lb)',
      'weightkg', 'weightkgs', 'weightlb', 'weightlbs', 'weightpounds',
      'weight_kg', 'weight_kgs', 'weight_lb', 'weight_lbs', 'weight_pounds',
      'weight in kg', 'weight in lbs', 'weight in pounds',
      'weightinkg', 'weightinlbs', 'weightinpounds',
      'weight_in_kg', 'weight_in_lbs', 'weight_in_pounds',
    ],
    priority: 9,
    validate:  (values) => {
      const nums = values.map(v => parseFlexibleNumber(v)).filter(n => ! isNaN(n));
      if (nums.length === 0) return 0;
      const reasonable = nums.filter(n => n >= 0 && n <= 1000);
      return reasonable.length / nums.length;
    },
  },

  weightUnit:  {
    synonyms: [
      'weight unit', 'unit', 'mass unit', 'load unit',
      'weightunit', 'massunit', 'loadunit',
      'weight_unit', 'mass_unit', 'load_unit',
    ],
    priority:  7,
    validate:  (values) => {
      const unitTerms = /^(kg|kgs|kilograms? |lb|lbs|pounds?)$/i;
      const matches = values.filter(v => unitTerms.test(String(v ?? '').trim()));
      return values.length > 0 ? matches.length / values.length :  0;
    },
  },

  reps: {
    synonyms:  [
      'reps', 'repetitions', 'rep', 'repetition', 'rep count', 'reps count',
      'count', 'number of reps', 'num reps',
      'repcount', 'repscount', 'numreps', 'numberofreps',
      'rep_count', 'reps_count', 'num_reps', 'number_of_reps',
    ],
    priority: 9,
    validate:  (values) => {
      const nums = values.map(v => parseInt(String(v), 10)).filter(n => !isNaN(n));
      if (nums.length === 0) return 0;
      const reasonable = nums.filter(n => n >= 0 && n <= 200);
      return reasonable.length / nums.length > 0.8 ? 0.9 : 0.5;
    },
  },

  distance: {
    synonyms: [
      'distance', 'dist',
      'distance km', 'distance mi', 'distance m', 'distance miles', 'distance meters',
      'km', 'kilometers', 'kilometres', 'miles', 'mi', 'meters', 'metres', 'm',
      'distance (km)', 'distance (mi)', 'distance (m)',
      'distancekm', 'distancemi', 'distancem', 'distancemiles', 'distancemeters',
      'distance_km', 'distance_mi', 'distance_m', 'distance_miles', 'distance_meters',
    ],
    priority:  5,
    validate:  (values) => {
      const nums = values.map(v => parseFlexibleNumber(v)).filter(n => !isNaN(n) && n > 0);
      return nums.length > 0 ? 0.7 : 0.2;
    },
  },

  distanceUnit: {
    synonyms: [
      'distance unit', 'dist unit',
      'distanceunit', 'distunit',
      'distance_unit', 'dist_unit',
    ],
    priority:  4,
    validate:  (values) => {
      const unitTerms = /^(km|kilometers?|kilometres?|mi|miles? |m|meters? |metres? |ft|feet)$/i;
      const matches = values.filter(v => unitTerms.test(String(v ?? '').trim()));
      return values.length > 0 ? matches.length / values.length : 0;
    },
  },

  rpe: {
    synonyms: [
      'rpe', 'perceived exertion', 'rate of perceived exertion',
      'effort', 'intensity', 'difficulty', 'hardness', 'rating',
      'perceivedexertion', 'rateofperceivedexertion',
      'perceived_exertion', 'rate_of_perceived_exertion',
    ],
    priority:  4,
    validate:  (values) => {
      const nums = values.map(v => parseFlexibleNumber(v)).filter(n => !isNaN(n));
      if (nums.length === 0) return 0;
      const rpeRange = nums.filter(n => n >= 1 && n <= 10);
      return rpeRange.length / nums.length > 0.7 ? 0.9 : 0.4;
    },
  },

  rir: {
    synonyms: [
      'rir', 'reps in reserve', 'reserve', 'reps left', 'remaining reps',
      'repsinreserve', 'repsleft', 'remainingreps',
      'reps_in_reserve', 'reps_left', 'remaining_reps',
    ],
    priority:  4,
    validate:  (values) => {
      const nums = values.map(v => parseFlexibleNumber(v)).filter(n => !isNaN(n));
      if (nums.length === 0) return 0;
      const rirRange = nums.filter(n => n >= 0 && n <= 10);
      return rirRange.length / nums.length > 0.7 ? 0.85 : 0.3;
    },
  },

  notes: {
    synonyms: [
      'notes', 'note', 'comment', 'comments', 'memo', 'remark', 'remarks',
      'exercise notes', 'exercise note', 'set notes', 'set note',
      'exercisenotes', 'exercisenote', 'setnotes', 'setnote',
      'exercise_notes', 'exercise_note', 'set_notes', 'set_note',
    ],
    priority:  3,
  },

  workoutNotes: {
    synonyms: [
      'workout notes', 'workout note', 'session notes', 'session note',
      'description', 'desc', 'details', 'workout description',
      'workoutnotes', 'workoutnote', 'sessionnotes', 'sessionnote', 'workoutdescription',
      'workout_notes', 'workout_note', 'session_notes', 'session_note', 'workout_description',
    ],
    priority:  3,
  },

  supersetId: {
    synonyms: [
      'superset', 'superset id', 'superset group', 'group', 'group id',
      'circuit', 'circuit id', 'pairing', 'pair', 'linked',
      'supersetid', 'supersetgroup', 'groupid', 'circuitid',
      'superset_id', 'superset_group', 'group_id', 'circuit_id',
    ],
    priority:  3,
  },

  restTime: {
    synonyms: [
      'rest', 'rest time', 'rest period', 'recovery', 'recovery time',
      'break', 'break time', 'pause', 'pause time',
      'resttime', 'restperiod', 'recoverytime', 'breaktime', 'pausetime',
      'rest_time', 'rest_period', 'recovery_time', 'break_time', 'pause_time',
    ],
    priority:  2,
  },
};

// Fields that should only map to one column
const UNIQUE_FIELDS:  SemanticField[] = [
  'workoutTitle', 'startTime', 'endTime', 'setIndex', 'weight', 'reps',
  'rpe', 'rir', 'distance', 'weightUnit', 'distanceUnit'
];

// ============================================================================
// SEMANTIC FIELD DETECTION
// ============================================================================

/**
 * Find best semantic match for a header
 */
const findBestMatch = (
  header: string,
  sampleValues: unknown[],
  usedFields: Set<SemanticField>
): FieldMatch | null => {
  const normalizedHeader = normalize(header);
  const cleanHeader = normalizeHeader(header);
  let bestMatch: FieldMatch | null = null;
  let bestScore = 0;

  for (const [field, config] of Object.entries(SEMANTIC_DICTIONARY) as [SemanticField, SemanticConfig][]) {
    // Skip unique fields already used
    if (UNIQUE_FIELDS.includes(field) && usedFields.has(field)) continue;

    let score = 0;

    for (const synonym of config.synonyms) {
      const normalizedSynonym = normalize(synonym);
      const cleanSynonym = normalizeHeader(synonym);

      // Exact match
      if (normalizedHeader === normalizedSynonym) {
        score = 1.0;
        break;
      }

      // Clean match
      if (cleanHeader === cleanSynonym) {
        score = Math.max(score, 0.95);
        continue;
      }

      // Fuzzy match
      const sim = similarity(header, synonym);
      if (sim > 0.75) {
        score = Math.max(score, sim);
      }
    }

    // Boost with value validation
    if (score > 0 && config.validate && sampleValues.length > 0) {
      const validValues = sampleValues.filter(v => v !== null && v !== undefined && v !== '');
      if (validValues.length > 0) {
        const validationScore = config.validate(validValues);
        score = score * 0.6 + validationScore * 0.4;
      }
    }

    // Apply priority
    const finalScore = score * (config.priority / 10);

    if (finalScore > bestScore && score > 0.5) {
      bestScore = finalScore;
      bestMatch = {
        field,
        confidence: score,
        originalHeader: header,
        unitHint: (field === 'weight' || field === 'distance') ? extractUnitFromHeader(header) : undefined,
      };
    }
  }

  return bestMatch;
};

/**
 * Detect all field mappings
 */
const detectFieldMappings = (headers: string[], sampleRows: Row[]): Map<string, FieldMatch> => {
  const mappings = new Map<string, FieldMatch>();
  const usedFields = new Set<SemanticField>();

  // Score all headers
  const scores:  Array<{ header: string; match: FieldMatch | null }> = [];
  for (const header of headers) {
    const values = sampleRows.map(r => r[header]);
    scores.push({ header, match: findBestMatch(header, values, usedFields) });
  }

  // Sort by confidence and assign greedily
  scores.sort((a, b) => (b.match?.confidence ?? 0) - (a.match?.confidence ?? 0));

  for (const { header, match } of scores) {
    if (match && !usedFields.has(match.field)) {
      mappings.set(header, match);
      usedFields.add(match.field);
    }
  }

  return mappings;
};

// ============================================================================
// UNIT CONVERSION
// ============================================================================

const toKg = (weight: number, rowUnit: string | undefined, headerUnit: string | undefined, userUnit: WeightUnit): number => {
  if (!Number.isFinite(weight) || weight < 0) return 0;

  const unit = normalize(rowUnit ?? '') || normalize(headerUnit ?? '') || userUnit;

  if (unit.startsWith('kg') || unit === 'kilogram' || unit === 'kilograms') return weight;
  if (unit.startsWith('lb') || unit === 'pound' || unit === 'pounds') return weight * LBS_TO_KG;

  return userUnit === 'lbs' ? weight * LBS_TO_KG : weight;
};

const toKm = (distance: number, rowUnit: string | undefined, headerUnit: string | undefined, userUnit: 'km' | 'miles' | 'meters' = 'km'): number => {
  if (!Number.isFinite(distance) || distance < 0) return 0;

  const unit = normalize(rowUnit ?? '') || normalize(headerUnit ?? '') || userUnit;

  if (unit.startsWith('km') || unit === 'kilometer' || unit === 'kilometre') return distance;
  if (unit.startsWith('mi') || unit === 'mile') return distance * MILES_TO_KM;
  if (unit === 'm' || unit.startsWith('meter') || unit.startsWith('metre')) return distance * METERS_TO_KM;
  if (unit.startsWith('ft') || unit === 'feet' || unit === 'foot') return distance * FEET_TO_KM;

  return distance;
};

// ============================================================================
// ROW TRANSFORMATION
// ============================================================================

const getFieldValue = (row:  Row, mappings: Map<string, FieldMatch>, targetField: SemanticField): { value: unknown; unitHint?:  string; header?:  string } | undefined => {
  for (const [header, match] of mappings) {
    if (match.field === targetField) {
      return { value: row[header], unitHint: match.unitHint, header };
    }
  }
  return undefined;
};

const transformRow = (row:  Row, context: TransformContext): WorkoutSet | null => {
  const { fieldMappings, options, stats } = context;

  // Required:  exercise
  const exerciseData = getFieldValue(row, fieldMappings, 'exercise');
  if (!exerciseData?.value) return null;

  // Required:  date
  const dateData = getFieldValue(row, fieldMappings, 'startTime');
  const parsedDate = dateData ?  parseFlexibleDate(dateData.value) : undefined;
  if (! parsedDate) return null;

  // Optional fields
  const workoutTitleData = getFieldValue(row, fieldMappings, 'workoutTitle');
  const endTimeData = getFieldValue(row, fieldMappings, 'endTime');
  const durationData = getFieldValue(row, fieldMappings, 'duration');
  const setTypeData = getFieldValue(row, fieldMappings, 'setType');
  const weightData = getFieldValue(row, fieldMappings, 'weight');
  const weightUnitData = getFieldValue(row, fieldMappings, 'weightUnit');
  const repsData = getFieldValue(row, fieldMappings, 'reps');
  const distanceData = getFieldValue(row, fieldMappings, 'distance');
  const distanceUnitData = getFieldValue(row, fieldMappings, 'distanceUnit');
  const rpeData = getFieldValue(row, fieldMappings, 'rpe');
  const rirData = getFieldValue(row, fieldMappings, 'rir');
  const notesData = getFieldValue(row, fieldMappings, 'notes');
  const workoutNotesData = getFieldValue(row, fieldMappings, 'workoutNotes');
  const supersetData = getFieldValue(row, fieldMappings, 'supersetId');

  // Calculate end time
  const duration = durationData ?  parseDuration(durationData.value) : 0;
  let endDate = endTimeData ?  parseFlexibleDate(endTimeData.value) : undefined;
  if (! endDate && parsedDate && duration > 0) {
    endDate = addSeconds(parsedDate, duration);
  }

  // Calculate RPE (from RPE or RIR)
  let rpe: number | null = null;
  if (rpeData?.value !== undefined && rpeData.value !== '' && rpeData.value !== null) {
    const rpeVal = parseFlexibleNumber(rpeData.value);
    if (Number.isFinite(rpeVal) && rpeVal >= 1 && rpeVal <= 10) rpe = rpeVal;
  } else if (rirData?.value !== undefined && rirData.value !== '' && rirData.value !== null) {
    const rirVal = parseFlexibleNumber(rirData.value);
    if (Number.isFinite(rirVal) && rirVal >= 0 && rirVal <= 10) rpe = rirToRpe(rirVal);
  }

  // Resolve exercise name
  let exerciseTitle = String(exerciseData.value ?? '').trim();
  if (options.resolver && exerciseTitle) {
    const resolution = options.resolver.resolve(exerciseTitle);
    if (resolution?.name) {
      exerciseTitle = resolution.name;
      if (resolution.method === 'fuzzy') stats.fuzzyMatches++;
      else if (resolution.method === 'representative') stats.representativeMatches++;
    } else {
      stats.unmatched.add(exerciseTitle);
    }
  }

  // Unit conversions
  const rawWeight = weightData ?  parseFlexibleNumber(weightData.value, 0) : 0;
  const weightUnit = weightUnitData ? String(weightUnitData.value ?? '') : undefined;
  const weight_kg = toKg(rawWeight, weightUnit, weightData?.unitHint, options.userWeightUnit);

  const rawDistance = distanceData ? parseFlexibleNumber(distanceData.value, 0) : 0;
  const distanceUnit = distanceUnitData ? String(distanceUnitData.value ?? '') : undefined;
  const distance_km = toKm(rawDistance, distanceUnit, distanceData?.unitHint, options.userDistanceUnit);

  return {
    title: String(workoutTitleData?.value ?? 'Workout').trim(),
    start_time: format(parsedDate, OUTPUT_DATE_FORMAT),
    end_time: endDate ? format(endDate, OUTPUT_DATE_FORMAT) : '',
    description: String(workoutNotesData?.value ?? '').trim(),
    exercise_title: exerciseTitle,
    superset_id: String(supersetData?.value ?? '').trim(),
    exercise_notes: String(notesData?.value ?? '').trim(),
    set_index: 0, // Calculated in post-processing
    set_type: normalizeSetType(setTypeData?.value),
    weight_kg,
    reps: repsData ? Math.max(0, parseFlexibleNumber(repsData.value, 0)) : 0,
    distance_km,
    duration_seconds: duration,
    rpe,
    parsedDate,
  };
};

// ============================================================================
// POST-PROCESSING
// ============================================================================

const calculateSetIndices = (sets: WorkoutSet[]): void => {
  const sessionKey = (s: WorkoutSet) => `${s.title}|${s.start_time}`;
  const sessions = new Map<string, WorkoutSet[]>();

  for (const set of sets) {
    const key = sessionKey(set);
    if (!sessions.has(key)) sessions.set(key, []);
    sessions.get(key)!.push(set);
  }

  for (const [, sessionSets] of sessions) {
    const exerciseCounters = new Map<string, number>();
    for (const set of sessionSets) {
      const count = (exerciseCounters.get(set.exercise_title) || 0) + 1;
      exerciseCounters.set(set.exercise_title, count);
      set.set_index = count;
    }
  }
};

const inferWorkoutTitles = (sets: WorkoutSet[]): void => {
  const needsTitle = sets.filter(s => !s.title || s.title === 'Workout');
  if (needsTitle.length === 0) return;

  const dateKey = (s: WorkoutSet) => s.parsedDate?.toDateString() ?? s.start_time;
  const byDate = new Map<string, WorkoutSet[]>();

  for (const set of needsTitle) {
    const key = dateKey(set);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(set);
  }

  for (const [, dateSets] of byDate) {
    const exercises = new Set(dateSets.map(s => s. exercise_title));
    const title = exercises.size <= 3
      ? Array.from(exercises).slice(0, 3).join(' + ')
      : `Workout (${exercises.size} exercises)`;

    for (const set of dateSets) {
      set. title = title;
    }
  }
};

// ============================================================================
// MAIN PARSER
// ============================================================================

const guessDelimiter = (content: string): string => {
  const firstLine = content.split(/\r?\n/)[0] ?? '';
  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
};

/**
 * Universal Workout CSV Parser
 * 
 * Platform-agnostic parser using semantic field detection. 
 * To support new platforms, add synonyms to SEMANTIC_DICTIONARY. 
 */
export const parseWorkoutCSV = (csvContent: string, options: ParseOptions): ParseResult => {
  const delimiter = guessDelimiter(csvContent);

  const parsed = Papa.parse<Row>(csvContent, {
    header:  true,
    skipEmptyLines: true,
    dynamicTyping: true,
    delimiter,
    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ''),
  });

  if (parsed.errors?.length > 0) {
    const fatal = parsed.errors.find(e => e.type === 'Quotes' || e.type === 'Delimiter');
    if (fatal) throw new Error(`CSV parsing error: ${fatal.message}`);
  }

  const rawRows = parsed.data ?? [];
  const headers = parsed.meta.fields ?? [];

  if (headers.length === 0 || rawRows.length === 0) {
    throw new Error('CSV file is empty or has no valid data rows.');
  }

  // Detect fields from sample
  const sampleSize = Math.min(50, rawRows.length);
  const sampleRows = rawRows.slice(0, sampleSize);
  const fieldMappings = detectFieldMappings(headers, sampleRows);

  // Verify requirements
  const detectedFields = new Set(Array.from(fieldMappings.values()).map(m => m.field));

  if (! detectedFields.has('exercise')) {
    throw new Error(
      'Could not detect an exercise column. Please ensure your CSV has a column for exercises ' +
      '(e.g., "Exercise", "Exercise Name", "Movement", "Lift", etc. )'
    );
  }

  if (!detectedFields.has('startTime')) {
    throw new Error(
      'Could not detect a date/time column. Please ensure your CSV has a column for dates ' +
      '(e.g., "Date", "Time", "Start Time", "Timestamp", etc.)'
    );
  }

  // Transform rows
  const stats = { unmatched: new Set<string>(), fuzzyMatches: 0, representativeMatches: 0 };
  const context:  TransformContext = { fieldMappings, options, stats };

  const sets = rawRows
    .map(row => transformRow(row, context))
    .filter((s): s is WorkoutSet => s !== null);

  // Post-process
  calculateSetIndices(sets);
  inferWorkoutTitles(sets);

  // Sort by date desc, then set index
  sets.sort((a, b) => {
    const timeA = a.parsedDate?.getTime() ?? 0;
    const timeB = b.parsedDate?.getTime() ?? 0;
    if (timeB !== timeA) return timeB - timeA;
    return a.set_index - b.set_index;
  });

  // Calculate confidence
  const mappingConfidences = Array.from(fieldMappings.values()).map(m => m.confidence);
  const avgConfidence = mappingConfidences.length > 0
    ? mappingConfidences.reduce((a, b) => a + b, 0) / mappingConfidences.length
    : 0;

  const fieldMappingsSummary:  Record<string, string> = {};
  for (const [header, match] of fieldMappings) {
    fieldMappingsSummary[header] = match.field;
  }

  const warnings:  string[] = [];
  if (avgConfidence < 0.6) {
    warnings.push('Some columns may not have been detected correctly. Please verify your data after import.');
  }

  return {
    sets,
    meta: {
      confidence: avgConfidence,
      fieldMappings: fieldMappingsSummary,
      unmatchedExercises: Array.from(stats. unmatched).sort(),
      fuzzyMatches: stats.fuzzyMatches,
      representativeMatches: stats.representativeMatches,
      rowCount: rawRows.length,
      warnings:  warnings.length > 0 ? warnings :  undefined,
    },
  };
};

/**
 * Async wrapper for UI
 */
export const parseWorkoutCSVAsync = async (csvContent: string, options: ParseOptions): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(parseWorkoutCSV(csvContent, options));
      } catch (e) {
        reject(e);
      }
    }, 0);
  });
};

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Legacy result type alias for backward compatibility
 */
export type ParseWorkoutCsvResult = ParseResult;

/**
 * Legacy options interface for backward compatibility
 */
export interface LegacyParseOptions {
  unit: WeightUnit;
}

/**
 * Legacy async parser for backward compatibility with existing code
 * @deprecated Use parseWorkoutCSVAsync with ParseOptions instead
 */
export const parseWorkoutCSVAsyncWithUnit = async (
  csvContent: string,
  options: LegacyParseOptions
): Promise<ParseResult> => {
  return parseWorkoutCSVAsync(csvContent, {
    userWeightUnit: options.unit,
  });
};