import type { DataSourceChoice } from '../dataSources/types';

const DATA_SOURCE_KEY = 'hevy_analytics_data_source';
const HEVY_AUTH_TOKEN_KEY = 'hevy_auth_token';
const LYFTA_API_KEY_KEY = 'lyfta_api_key';
const LAST_CSV_PLATFORM_KEY = 'hevy_analytics_last_csv_platform';
const SETUP_COMPLETE_KEY = 'hevy_analytics_setup_complete';

export const saveDataSourceChoice = (choice: DataSourceChoice): void => {
  try {
    localStorage.setItem(DATA_SOURCE_KEY, choice);
  } catch {
  }
};

export const getDataSourceChoice = (): DataSourceChoice | null => {
  try {
    const v = localStorage.getItem(DATA_SOURCE_KEY);
    return v === 'strong' || v === 'hevy' || v === 'lyfta' ? v : null;
  } catch {
    return null;
  }
};

export const clearDataSourceChoice = (): void => {
  try {
    localStorage.removeItem(DATA_SOURCE_KEY);
  } catch {
  }
};

export const saveHevyAuthToken = (token: string): void => {
  try {
    localStorage.setItem(HEVY_AUTH_TOKEN_KEY, token);
  } catch {
  }
};

export const getHevyAuthToken = (): string | null => {
  try {
    return localStorage.getItem(HEVY_AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const clearHevyAuthToken = (): void => {
  try {
    localStorage.removeItem(HEVY_AUTH_TOKEN_KEY);
  } catch {
  }
};

export const saveLastCsvPlatform = (platform: DataSourceChoice): void => {
  try {
    localStorage.setItem(LAST_CSV_PLATFORM_KEY, platform);
  } catch {
  }
};

export const getLastCsvPlatform = (): DataSourceChoice | null => {
  try {
    const v = localStorage.getItem(LAST_CSV_PLATFORM_KEY);
    return v === 'strong' || v === 'hevy' || v === 'lyfta' ? v : null;
  } catch {
    return null;
  }
};

export const clearLastCsvPlatform = (): void => {
  try {
    localStorage.removeItem(LAST_CSV_PLATFORM_KEY);
  } catch {
  }
};

export const saveSetupComplete = (value: boolean): void => {
  try {
    localStorage.setItem(SETUP_COMPLETE_KEY, value ? '1' : '0');
  } catch {
  }
};

export const saveLyfataApiKey = (apiKey: string): void => {
  try {
    localStorage.setItem(LYFTA_API_KEY_KEY, apiKey);
  } catch {
  }
};

export const getLyfataApiKey = (): string | null => {
  try {
    return localStorage.getItem(LYFTA_API_KEY_KEY);
  } catch {
    return null;
  }
};

export const clearLyfataApiKey = (): void => {
  try {
    localStorage.removeItem(LYFTA_API_KEY_KEY);
  } catch {
  }
};

export const getSetupComplete = (): boolean => {
  try {
    return localStorage.getItem(SETUP_COMPLETE_KEY) === '1';
  } catch {
    return false;
  }
};

export const clearSetupComplete = (): void => {
  try {
    localStorage.removeItem(SETUP_COMPLETE_KEY);
  } catch {
  }
};
