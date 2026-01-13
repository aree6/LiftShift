import type { DataSourceChoice } from '../dataSources/types';

const DATA_SOURCE_KEY = 'hevy_analytics_data_source';
const HEVY_AUTH_TOKEN_KEY = 'hevy_auth_token';
const HEVY_PRO_API_KEY_KEY = 'hevy_pro_api_key';
const LYFTA_API_KEY_KEY = 'lyfta_api_key';
const LAST_CSV_PLATFORM_KEY = 'hevy_analytics_last_csv_platform';
const LAST_LOGIN_METHOD_KEY = 'hevy_analytics_last_login_method_v1';
const SETUP_COMPLETE_KEY = 'hevy_analytics_setup_complete';

export type LoginMethod = 'csv' | 'credentials' | 'apiKey';

type LastLoginRecord = {
  method: LoginMethod;
  accountKey?: string;
};

type LastLoginMap = Partial<Record<DataSourceChoice, LastLoginRecord>>;

export const saveDataSourceChoice = (choice: DataSourceChoice): void => {
  try {
    localStorage.setItem(DATA_SOURCE_KEY, choice);
  } catch {
  }
};

export const getDataSourceChoice = (): DataSourceChoice | null => {
  try {
    const v = localStorage.getItem(DATA_SOURCE_KEY);
    return v === 'strong' || v === 'hevy' || v === 'lyfta' || v === 'other' ? v : null;
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

export const saveHevyProApiKey = (apiKey: string): void => {
  try {
    localStorage.setItem(HEVY_PRO_API_KEY_KEY, apiKey);
  } catch {
  }
};

export const getHevyProApiKey = (): string | null => {
  try {
    return localStorage.getItem(HEVY_PRO_API_KEY_KEY);
  } catch {
    return null;
  }
};

export const clearHevyProApiKey = (): void => {
  try {
    localStorage.removeItem(HEVY_PRO_API_KEY_KEY);
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
    return v === 'strong' || v === 'hevy' || v === 'lyfta' || v === 'other' ? v : null;
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

const readLastLoginMap = (): LastLoginMap => {
  try {
    const raw = localStorage.getItem(LAST_LOGIN_METHOD_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as LastLoginMap;
  } catch {
    return {};
  }
};

const writeLastLoginMap = (map: LastLoginMap): void => {
  try {
    localStorage.setItem(LAST_LOGIN_METHOD_KEY, JSON.stringify(map));
  } catch {
  }
};

export const saveLastLoginMethod = (platform: DataSourceChoice, method: LoginMethod, accountKey?: string): void => {
  const map = readLastLoginMap();
  map[platform] = {
    method,
    accountKey: accountKey?.trim() ? accountKey.trim() : undefined,
  };
  writeLastLoginMap(map);
};

export const getLastLoginMethod = (platform: DataSourceChoice, accountKey?: string): LoginMethod | null => {
  const map = readLastLoginMap();
  const record = map[platform];
  if (!record) return null;

  // If we have an accountKey, prefer an exact match when the stored record includes one.
  if (accountKey?.trim() && record.accountKey && record.accountKey !== accountKey.trim()) return null;

  return record.method === 'csv' || record.method === 'credentials' || record.method === 'apiKey'
    ? record.method
    : null;
};

export const clearLastLoginMethod = (): void => {
  try {
    localStorage.removeItem(LAST_LOGIN_METHOD_KEY);
  } catch {
  }
};

export const saveSetupComplete = (value: boolean): void => {
  try {
    localStorage.setItem(SETUP_COMPLETE_KEY, value ? '1' : '0');
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
