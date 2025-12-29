import type { WeightUnit } from '../storage/localStorage';
import { convertVolume } from './units';

type RoundMode = 'none' | 'int';

/**
 * Volume display helpers.
 * Standardizes one rule across the app: convert kg -> unit first, then round/format for display.
 */

export const getDisplayVolume = (
  volumeKg: number,
  unit: WeightUnit,
  opts?: {
    round?: RoundMode;
  }
): number => {
  const v = convertVolume(volumeKg, unit);
  if (opts?.round === 'int') return Math.round(v);
  return v;
};

export const formatDisplayVolume = (
  volumeKg: number,
  unit: WeightUnit,
  opts?: {
    round?: RoundMode;
    maxDecimals?: number;
    minDecimals?: number;
  }
): string => {
  const round = opts?.round ?? 'int';
  const v = getDisplayVolume(volumeKg, unit, { round });

  const maxDecimals = opts?.maxDecimals ?? (round === 'int' ? 0 : 2);
  const minDecimals = opts?.minDecimals ?? 0;

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(Number.isFinite(v) ? v : 0);
};
