import LZString from 'lz-string';
const STORAGE_KEY = 'hevy_analytics_csv_data';

/**
 * Save CSV data to local storage
 */
export const saveCSVData = (csvData: string): void => {
  try {
    const compressed = LZString.compressToUTF16(csvData);
    localStorage.setItem(STORAGE_KEY, compressed);
  } catch (error) {
    console.error('Failed to save CSV data to local storage:', error);
  }
};

/**
 * Retrieve CSV data from local storage
 */
export const getCSVData = (): string | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data === null) return null;
    const decompressed = LZString.decompressFromUTF16(data);
    return decompressed !== null ? decompressed : data;
  } catch (error) {
    console.error('Failed to retrieve CSV data from local storage:', error);
    return null;
  }
};

/**
 * Check if CSV data exists in local storage
 */
export const hasCSVData = (): boolean => {
  return getCSVData() !== null;
};

/**
 * Clear CSV data from local storage
 */
export const clearCSVData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear CSV data from local storage:', error);
  }
};

// Chart Modes Storage
const CHART_MODES_KEY = 'hevy_analytics_chart_modes';

export type TimeFilterMode = 'all' | 'weekly' | 'monthly';

const normalizeStoredMode = (value: unknown): TimeFilterMode | null => {
  if (value === 'all' || value === 'weekly' || value === 'monthly') return value;
  // Backward compatibility
  if (value === 'daily') return 'all';
  return null;
};

/**
 * Save chart modes to local storage
 */
export const saveChartModes = (chartModes: Record<string, TimeFilterMode>): void => {
  try {
    localStorage.setItem(CHART_MODES_KEY, JSON.stringify(chartModes));
  } catch (error) {
    console.error('Failed to save chart modes to local storage:', error);
  }
};

/**
 * Retrieve chart modes from local storage
 */
export const getChartModes = (): Record<string, TimeFilterMode> | null => {
  try {
    const data = localStorage.getItem(CHART_MODES_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const normalized: Record<string, TimeFilterMode> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const mode = normalizeStoredMode(v);
      if (mode) normalized[k] = mode;
    }
    return normalized;
  } catch (error) {
    console.error('Failed to retrieve chart modes from local storage:', error);
    return null;
  }
};

// Weight Unit Preference Storage
export type WeightUnit = 'kg' | 'lbs';
const WEIGHT_UNIT_KEY = 'hevy_analytics_weight_unit';

const BODY_MAP_GENDER_KEY = 'hevy_analytics_body_map_gender';
export type StoredBodyMapGender = 'male' | 'female';

/**
 * Save weight unit preference to local storage
 */
export const saveWeightUnit = (unit: WeightUnit): void => {
  try {
    localStorage.setItem(WEIGHT_UNIT_KEY, unit);
  } catch (error) {
    console.error('Failed to save weight unit to local storage:', error);
  }
};

/**
 * Retrieve weight unit preference from local storage
 */
export const getWeightUnit = (): WeightUnit => {
  try {
    const unit = localStorage.getItem(WEIGHT_UNIT_KEY);
    return (unit === 'kg' || unit === 'lbs') ? unit : 'kg';
  } catch (error) {
    console.error('Failed to retrieve weight unit from local storage:', error);
    return 'kg';
  }
};

export const saveBodyMapGender = (gender: StoredBodyMapGender): void => {
  try {
    localStorage.setItem(BODY_MAP_GENDER_KEY, gender);
  } catch (error) {
    console.error('Failed to save body map gender to local storage:', error);
  }
};

export const getBodyMapGender = (): StoredBodyMapGender => {
  try {
    const gender = localStorage.getItem(BODY_MAP_GENDER_KEY);
    return (gender === 'male' || gender === 'female') ? gender : 'male';
  } catch (error) {
    console.error('Failed to retrieve body map gender from local storage:', error);
    return 'male';
  }
};
