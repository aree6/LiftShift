export const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const parsed = parseFloat(String(value ?? ''));
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const toInteger = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  const parsed = parseInt(String(value ?? ''), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const toString = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

export const roundTo = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value >= 0 ? '+' : ''}${roundTo(value, decimals)}%`;
};

export const formatNumber = (value: number, opts?: { maxDecimals?: number; minDecimals?: number }): string => {
  const maxDecimals = opts?.maxDecimals ?? 2;
  const minDecimals = opts?.minDecimals ?? 0;
  const n = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(n);
};

export const formatSignedNumber = (value: number, opts?: { maxDecimals?: number; minDecimals?: number }): string => {
  const maxDecimals = opts?.maxDecimals ?? 2;
  const minDecimals = opts?.minDecimals ?? 0;
  const n = Number.isFinite(value) ? value : 0;
  const sign = n > 0 ? '+' : '';
  return `${sign}${formatNumber(n, { maxDecimals, minDecimals })}`;
};
