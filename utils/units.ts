import { WeightUnit } from './localStorage';

const KG_TO_LBS = 2.20462;

/**
 * Convert weight from kg to the specified unit
 */
export const convertWeight = (weightKg: number, unit: WeightUnit | string): number => {
  if (unit === 'lbs') {
    return Number((weightKg * KG_TO_LBS).toFixed(1));
  }
  return weightKg;
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
 * Convert volume (weight * reps) from kg to the specified unit
 */
export const convertVolume = (volumeKg: number, unit: WeightUnit | string): number => {
  if (unit === 'lbs') {
    return Number((volumeKg * KG_TO_LBS).toFixed(0));
  }
  return volumeKg;
};
