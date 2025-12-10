const STORAGE_KEY = 'hevy_analytics_csv_data';

/**
 * Save CSV data to local storage
 */
export const saveCSVData = (csvData: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, csvData);
  } catch (error) {
    console.error('Failed to save CSV data to local storage:', error);
  }
};

/**
 * Retrieve CSV data from local storage
 */
export const getCSVData = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
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
