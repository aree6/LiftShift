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

export type TimeFilterMode = 'all' | 'weekly' | 'monthly';

/**
 * Determine the appropriate filter mode based on date range span (in days).
 * Rules based on how many aggregated data points would be meaningful:
 * - Less than 5 weeks (35 days) → 'all' (weekly view would have <5 points)
 * - 5 weeks to 5 months (35-150 days) → 'weekly' 
 * - More than 5 months (150+ days) → 'monthly'
 */
export const getSmartFilterMode = (spanDays: number): TimeFilterMode => {
  if (spanDays < 35) return 'all';      // <5 weeks → show all
  if (spanDays < 150) return 'weekly';  // 5 weeks to ~5 months → weekly
  return 'monthly';                      // 5+ months → monthly
};

// Weight Unit Preference Storage
export type WeightUnit = 'kg' | 'lbs';
const WEIGHT_UNIT_KEY = 'hevy_analytics_weight_unit';

const BODY_MAP_GENDER_KEY = 'hevy_analytics_body_map_gender';
export type StoredBodyMapGender = 'male' | 'female';

const PREFERENCES_CONFIRMED_KEY = 'hevy_analytics_preferences_confirmed';

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

export const clearWeightUnit = (): void => {
  try {
    localStorage.removeItem(WEIGHT_UNIT_KEY);
  } catch (error) {
    console.error('Failed to clear weight unit from local storage:', error);
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

export const clearBodyMapGender = (): void => {
  try {
    localStorage.removeItem(BODY_MAP_GENDER_KEY);
  } catch (error) {
    console.error('Failed to clear body map gender from local storage:', error);
  }
};

export const savePreferencesConfirmed = (confirmed: boolean): void => {
  try {
    localStorage.setItem(PREFERENCES_CONFIRMED_KEY, confirmed ? 'true' : 'false');
  } catch (error) {
    console.error('Failed to save preferences confirmed flag to local storage:', error);
  }
};

export const getPreferencesConfirmed = (): boolean => {
  try {
    return localStorage.getItem(PREFERENCES_CONFIRMED_KEY) === 'true';
  } catch (error) {
    console.error('Failed to retrieve preferences confirmed flag from local storage:', error);
    return false;
  }
};

export const clearPreferencesConfirmed = (): void => {
  try {
    localStorage.removeItem(PREFERENCES_CONFIRMED_KEY);
  } catch (error) {
    console.error('Failed to clear preferences confirmed flag from local storage:', error);
  }
};

export type ThemeMode = 'light' | 'medium-dark' | 'midnight-dark' | 'svg';

const THEME_MODE_KEY = 'hevy_analytics_theme_mode';

export const saveThemeMode = (mode: ThemeMode): void => {
  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
  } catch (error) {
    console.error('Failed to save theme mode to local storage:', error);
  }
};

export const getThemeMode = (): ThemeMode => {
  try {
    const mode = localStorage.getItem(THEME_MODE_KEY);
    return mode === 'light' || mode === 'medium-dark' || mode === 'midnight-dark' || mode === 'svg'
      ? mode
      : 'midnight-dark';
  } catch (error) {
    console.error('Failed to retrieve theme mode from local storage:', error);
    return 'midnight-dark';
  }
};

export const clearThemeMode = (): void => {
  try {
    localStorage.removeItem(THEME_MODE_KEY);
  } catch (error) {
    console.error('Failed to clear theme mode from local storage:', error);
  }
};
