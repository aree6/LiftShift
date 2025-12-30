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

// EMA (Exponential Moving Average) preference
// Default is enabled because it helps users see the underlying trend signal through noisy sessions.
const EMA_ENABLED_KEY = 'hevy_analytics_ema_enabled';

export const saveEmaEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(EMA_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.error('Failed to save EMA enabled flag to local storage:', error);
  }
};

export const getEmaEnabled = (): boolean => {
  try {
    const v = localStorage.getItem(EMA_ENABLED_KEY);
    if (v === null) return true;
    return v === 'true';
  } catch (error) {
    console.error('Failed to retrieve EMA enabled flag from local storage:', error);
    return true;
  }
};

export const clearEmaEnabled = (): void => {
  try {
    localStorage.removeItem(EMA_ENABLED_KEY);
  } catch (error) {
    console.error('Failed to clear EMA enabled flag from local storage:', error);
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

export type ThemeMode = 'light' | 'medium-dark' | 'midnight-dark' | 'pure-black' | 'svg';

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
    return mode === 'light' || mode === 'medium-dark' || mode === 'midnight-dark' || mode === 'pure-black' || mode === 'svg'
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

// Timezone Preference Storage
const TIMEZONE_KEY = 'hevy_analytics_timezone';

/**
 * Get the browser's detected timezone
 */
const getDetectedTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

/**
 * Save timezone preference to local storage
 */
export const saveTimezone = (timezone: string): void => {
  try {
    localStorage.setItem(TIMEZONE_KEY, timezone);
  } catch (error) {
    console.error('Failed to save timezone to local storage:', error);
  }
};

/**
 * Retrieve timezone preference from local storage
 */
export const getTimezone = (): string => {
  try {
    const timezone = localStorage.getItem(TIMEZONE_KEY);
    return timezone ?? getDetectedTimezone();
  } catch (error) {
    console.error('Failed to retrieve timezone from local storage:', error);
    return getDetectedTimezone();
  }
};

export const clearTimezone = (): void => {
  try {
    localStorage.removeItem(TIMEZONE_KEY);
  } catch (error) {
    console.error('Failed to clear timezone from local storage:', error);
  }
};

// Language/Locale Preference Storage
export type Language = 'en-GB' | 'en-US';
const LANGUAGE_KEY = 'hevy_analytics_language';

/**
 * Save language preference to local storage
 */
export const saveLanguage = (language: Language): void => {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Failed to save language to local storage:', error);
  }
};

/**
 * Retrieve language preference from local storage
 */
export const getLanguage = (): Language => {
  try {
    const language = localStorage.getItem(LANGUAGE_KEY);
    return (language === 'en-GB' || language === 'en-US') ? language : 'en-GB';
  } catch (error) {
    console.error('Failed to retrieve language from local storage:', error);
    return 'en-GB';
  }
};

export const clearLanguage = (): void => {
  try {
    localStorage.removeItem(LANGUAGE_KEY);
  } catch (error) {
    console.error('Failed to clear language from local storage:', error);
  }
};
