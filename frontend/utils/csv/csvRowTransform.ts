import { addSeconds, format } from 'date-fns';
import type { WorkoutSet } from '../../types';
import type { FieldMatch, Row, SemanticField, TransformContext } from './csvParserTypes';
import {
  normalize,
  normalizeSetType,
  OUTPUT_DATE_FORMAT,
  parseDuration,
  parseFlexibleDate,
  parseFlexibleNumber,
  rirToRpe,
} from './csvParserUtils';

// ============================================================================
// UNIT CONVERSION
// ============================================================================

const LBS_TO_KG = 0.45359237;
const MILES_TO_KM = 1.609344;
const METERS_TO_KM = 0.001;
const FEET_TO_KM = 0.0003048;

export const toKg = (weight: number, rowUnit: string | undefined, headerUnit: string | undefined, userUnit: 'kg' | 'lbs'): number => {
  if (!Number.isFinite(weight) || weight < 0) return 0;

  // A weight column that names its unit (weight_kg, Weight_LBS) outranks a separate unit column:
  // Anneal writes Weight_LBS beside Unit_Entered (the unit the lifter typed), and reading the
  // pounds as that unit scaled every kg user's loads by 2.2.
  const unit = normalize(headerUnit ?? '') || normalize(rowUnit ?? '') || userUnit;

  if (unit.startsWith('kg') || unit === 'kilogram' || unit === 'kilograms') return weight;
  if (unit.startsWith('lb') || unit === 'pound' || unit === 'pounds') return weight * LBS_TO_KG;

  return userUnit === 'lbs' ? weight * LBS_TO_KG : weight;
};

const toKm = (
  distance: number,
  rowUnit: string | undefined,
  headerUnit: string | undefined,
  userUnit: 'km' | 'miles' | 'meters' = 'km'
): number => {
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

const getFieldValue = (
  row: Row,
  mappings: Map<string, FieldMatch>,
  targetField: SemanticField
): { value: unknown; unitHint?: string; header?: string } | undefined => {
  for (const [header, match] of mappings) {
    if (match.field === targetField) {
      return { value: row[header], unitHint: match.unitHint, header };
    }
  }
  return undefined;
};

export const transformRow = (row: Row, context: TransformContext): WorkoutSet | null => {
  const { fieldMappings, options, stats } = context;

  // Required: exercise
  const exerciseData = getFieldValue(row, fieldMappings, 'exercise');
  if (!exerciseData?.value) return null;

  // Required: date
  const dateData = getFieldValue(row, fieldMappings, 'startTime');
  const parsedDate = dateData ? parseFlexibleDate(dateData.value) : undefined;
  if (!parsedDate) return null;

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
  const duration = durationData ? parseDuration(durationData.value) : 0;
  let endDate = endTimeData ? parseFlexibleDate(endTimeData.value) : undefined;
  if (!endDate && parsedDate && duration > 0) {
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
  const rawWeight = weightData ? parseFlexibleNumber(weightData.value, 0) : 0;
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

export const calculateSetIndices = (sets: WorkoutSet[]): void => {
  const sessionKey = (s: WorkoutSet) => `${s.title}|${s.start_time}`;
  const sessions = new Map<string, WorkoutSet[]>();

  for (const set of sets) {
    const key = sessionKey(set);
    if (!sessions.has(key)) sessions.set(key, []);
    sessions.get(key)!.push(set);
  }

  for (const [, sessionSets] of sessions) {
    const exerciseCounters = new Map<string, number>();
    const exerciseIndexMap = new Map<string, number>();
    let nextExerciseIndex = 0;
    
    for (const set of sessionSets) {
      const exerciseName = set.exercise_title;
      
      if (!exerciseIndexMap.has(exerciseName)) {
        exerciseIndexMap.set(exerciseName, nextExerciseIndex);
        nextExerciseIndex++;
      }
      set.exercise_index = exerciseIndexMap.get(exerciseName);
      
      const count = (exerciseCounters.get(exerciseName) || 0) + 1;
      exerciseCounters.set(exerciseName, count);
      set.set_index = count;
    }
  }
};

export const inferWorkoutTitles = (sets: WorkoutSet[]): void => {
  const needsTitle = sets.filter((s) => !s.title || s.title === 'Workout');
  if (needsTitle.length === 0) return;

  const dateKey = (s: WorkoutSet) => s.parsedDate?.toDateString() ?? s.start_time;
  const byDate = new Map<string, WorkoutSet[]>();

  for (const set of needsTitle) {
    const key = dateKey(set);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(set);
  }

  for (const [, dateSets] of byDate) {
    const exercises = new Set(dateSets.map((s) => s.exercise_title));
    const title =
      exercises.size <= 3
        ? Array.from(exercises).slice(0, 3).join(' + ')
        : `Workout (${exercises.size} exercises)`;

    for (const set of dateSets) {
      set.title = title;
    }
  }
};
