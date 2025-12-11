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

/**
 * Save chart modes to local storage
 */
export const saveChartModes = (chartModes: Record<string, 'monthly' | 'daily'>): void => {
  try {
    localStorage.setItem(CHART_MODES_KEY, JSON.stringify(chartModes));
  } catch (error) {
    console.error('Failed to save chart modes to local storage:', error);
  }
};

/**
 * Retrieve chart modes from local storage
 */
export const getChartModes = (): Record<string, 'monthly' | 'daily'> | null => {
  try {
    const data = localStorage.getItem(CHART_MODES_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to retrieve chart modes from local storage:', error);
    return null;
  }
};
