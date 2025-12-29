import { WeightUnit } from '../storage/localStorage';

const KG_TO_LBS = 2.20462;

/**
 * Convert weight from kg to the specified unit
 */
export const convertWeight = (weightKg: number, unit: WeightUnit | string): number => {
  if (unit === 'lbs') {
    return Number((weightKg * KG_TO_LBS).toFixed(1));
  }
  return Number(weightKg.toFixed(2));
};

/**
 * Format weight with unit label
 */
export const formatWeight = (weightKg: number, unit: WeightUnit | string): string => {
  const converted = convertWeight(weightKg, unit);
  return `${converted} ${unit}`;
};

/**
 * Get just the unit label
 */
export const getUnitLabel = (unit: WeightUnit | string): string => {
  return unit as string;
};

/**
 * Standard progression step in kg, matching typical plate jumps.
 * - kg: +2.5kg
 * - lbs: +5lbs (converted to kg)
 */
export const getStandardWeightIncrementKg = (unit: WeightUnit | string): number => {
  if (unit === 'lbs') {
    return 5 / KG_TO_LBS;
  }
  return 2.5;
};

/**
 * Convert volume (weight * reps) from kg to the specified unit
 */
export const convertVolume = (volumeKg: number, unit: WeightUnit | string): number => {
  if (unit === 'lbs') {
    return Number((volumeKg * KG_TO_LBS).toFixed(0));
  }
  return Number(volumeKg.toFixed(2));
};
