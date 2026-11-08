import type { SemanticConfig, SemanticField } from './csvParserTypes';
import { detectSequentialResets, parseFlexibleDate, parseFlexibleNumber } from './csvParserUtils';

// ============================================================================
// SEMANTIC DICTIONARY
// ============================================================================
// THE ONLY CONFIGURATION. Add synonyms here to support new platforms.

export const SEMANTIC_DICTIONARY: Record<SemanticField, SemanticConfig> = {
  workoutTitle: {
    synonyms: [
      'title', 'workout', 'workout name', 'workout title', 'routine', 'routine name',
      'session', 'session name', 'training', 'program', 'name',
      'workoutname', 'workouttitle', 'routinename', 'sessionname',
      'workout_name', 'workout_title', 'routine_name', 'session_name',
    ],
    priority: 5,
    validate: (values) => {
      const strings = values.filter((v) => typeof v === 'string' && v.length > 0);
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
    priority: 10,
    validate: (values) => {
      const strings = values.filter((v) => typeof v === 'string' && v.length > 0);
      const fitnessTerms = /bench|squat|deadlift|press|curl|row|pull|push|raise|extension|fly|lunge|crunch|plank|cable|dumbbell|barbell|machine|lat|tricep|bicep|chest|leg|shoulder|core|glute|calf|ham|quad/i;
      const matchCount = strings.filter((s) => fitnessTerms.test(String(s))).length;
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
    priority: 9,
    validate: (values) => {
      const dateCount = values.filter((v) => parseFlexibleDate(v) !== undefined).length;
      return values.length > 0 ? dateCount / values.length : 0;
    },
  },

  endTime: {
    synonyms: [
      'end', 'end time', 'end date', 'ended', 'ended at',
      'finished', 'finished at', 'completed', 'completed at', 'stop', 'stopped',
      'endtime', 'enddate', 'endedat', 'finishedat', 'completedat',
      'end_time', 'end_date', 'ended_at', 'finished_at', 'completed_at',
    ],
    priority: 3,
  },

  duration: {
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
    validate: (values) => {
      const durationLike = values.filter((v) => {
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
    priority: 6,
    validate: (values) => {
      const nums = values.map((v) => parseInt(String(v), 10)).filter((n) => !isNaN(n));
      if (nums.length === 0) return 0;
      const allSmall = nums.every((n) => n >= 0 && n <= 50);
      const hasResets = detectSequentialResets(nums);
      return allSmall && hasResets ? 0.9 : allSmall ? 0.6 : 0.2;
    },
  },

  setType: {
    synonyms: [
      'set type', 'type', 'kind', 'category', 'set category', 'set kind',
      'warmup', 'is warmup', 'warm up', 'iswarmup', 'is_warmup',
      'settype', 'setkind', 'setcategory',
      'set_type', 'set_kind', 'set_category',
    ],
    priority: 5,
    validate: (values) => {
      const setTypeTerms = /normal|warm|drop|failure|working|amrap|cluster|rest|pause|myo|regular|standard/i;
      const matches = values.filter((v) => setTypeTerms.test(String(v ?? '')));
      return values.length > 0 ? matches.length / values.length : 0;
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
    validate: (values) => {
      const nums = values.map((v) => parseFlexibleNumber(v)).filter((n) => !isNaN(n));
      if (nums.length === 0) return 0;
      const reasonable = nums.filter((n) => n >= 0 && n <= 1000);
      return reasonable.length / nums.length;
    },
  },

  weightUnit: {
    synonyms: [
      'weight unit', 'unit', 'mass unit', 'load unit',
      'weightunit', 'massunit', 'loadunit',
      'weight_unit', 'mass_unit', 'load_unit',
    ],
    priority: 7,
    validate: (values) => {
      const unitTerms = /^(kg|kgs|kilograms? |lb|lbs|pounds?)$/i;
      const matches = values.filter((v) => unitTerms.test(String(v ?? '').trim()));
      return values.length > 0 ? matches.length / values.length : 0;
    },
  },

  reps: {
    synonyms: [
      'reps', 'repetitions', 'rep', 'repetition', 'rep count', 'reps count',
      'count', 'number of reps', 'num reps',
      'repcount', 'repscount', 'numreps', 'numberofreps',
      'rep_count', 'reps_count', 'num_reps', 'number_of_reps',
    ],
    priority: 9,
    validate: (values) => {
      const nums = values.map((v) => parseInt(String(v), 10)).filter((n) => !isNaN(n));
      if (nums.length === 0) return 0;
      const reasonable = nums.filter((n) => n >= 0 && n <= 200);
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
    priority: 5,
    validate: (values) => {
      const nums = values.map((v) => parseFlexibleNumber(v)).filter((n) => !isNaN(n) && n > 0);
      return nums.length > 0 ? 0.7 : 0.2;
    },
  },

  distanceUnit: {
    synonyms: [
      'distance unit', 'dist unit',
      'distanceunit', 'distunit',
      'distance_unit', 'dist_unit',
    ],
    priority: 4,
    validate: (values) => {
      const unitTerms = /^(km|kilometers?|kilometres?|mi|miles? |m|meters? |metres? |ft|feet)$/i;
      const matches = values.filter((v) => unitTerms.test(String(v ?? '').trim()));
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
    priority: 4,
    validate: (values) => {
      const nums = values.map((v) => parseFlexibleNumber(v)).filter((n) => !isNaN(n));
      if (nums.length === 0) return 0;
      const rpeRange = nums.filter((n) => n >= 1 && n <= 10);
      return rpeRange.length / nums.length > 0.7 ? 0.9 : 0.4;
    },
  },

  rir: {
    synonyms: [
      'rir', 'reps in reserve', 'reserve', 'reps left', 'remaining reps',
      'repsinreserve', 'repsleft', 'remainingreps',
      'reps_in_reserve', 'reps_left', 'remaining_reps',
    ],
    priority: 4,
    validate: (values) => {
      const nums = values.map((v) => parseFlexibleNumber(v)).filter((n) => !isNaN(n));
      if (nums.length === 0) return 0;
      const rirRange = nums.filter((n) => n >= 0 && n <= 10);
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
    priority: 3,
  },

  workoutNotes: {
    synonyms: [
      'workout notes', 'workout note', 'session notes', 'session note',
      'description', 'desc', 'details', 'workout description',
      'workoutnotes', 'workoutnote', 'sessionnotes', 'sessionnote', 'workoutdescription',
      'workout_notes', 'workout_note', 'session_notes', 'session_note', 'workout_description',
    ],
    priority: 3,
  },

  supersetId: {
    synonyms: [
      'superset', 'superset id', 'superset group', 'group', 'group id',
      'circuit', 'circuit id', 'pairing', 'pair', 'linked',
      'supersetid', 'supersetgroup', 'groupid', 'circuitid',
      'superset_id', 'superset_group', 'group_id', 'circuit_id',
    ],
    priority: 3,
  },

  restTime: {
    synonyms: [
      'rest', 'rest time', 'rest period', 'recovery', 'recovery time',
      'break', 'break time', 'pause', 'pause time',
      'resttime', 'restperiod', 'recoverytime', 'breaktime', 'pausetime',
      'rest_time', 'rest_period', 'recovery_time', 'break_time', 'pause_time',
    ],
    priority: 2,
  },
};

// Fields that should only map to one column
export const UNIQUE_FIELDS: SemanticField[] = [
  'workoutTitle',
  'startTime',
  'endTime',
  'setIndex',
  'weight',
  'reps',
  'rpe',
  'rir',
  'distance',
  'weightUnit',
  'distanceUnit',
];
