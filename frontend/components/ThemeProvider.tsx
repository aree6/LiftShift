import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { getThemeMode, saveThemeMode, ThemeMode } from '../utils/storage/localStorage';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_CYCLE_ORDER: ThemeMode[] = ['light', 'medium-dark', 'midnight-dark', 'pure-black', 'svg'];

const getNextMode = (current: ThemeMode): ThemeMode => {
  const idx = THEME_CYCLE_ORDER.indexOf(current);
  if (idx < 0) return THEME_CYCLE_ORDER[0];
  return THEME_CYCLE_ORDER[(idx + 1) % THEME_CYCLE_ORDER.length];
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'midnight-dark';
    return getThemeMode();
  });

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
  }, []);

  const cycleMode = useCallback(() => {
    setModeState((prev) => getNextMode(prev));
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.style.colorScheme = mode === 'light' ? 'light' : 'dark';
  }, [mode]);

  useEffect(() => {
    saveThemeMode(mode);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(() => ({ mode, setMode, cycleMode }), [mode, setMode, cycleMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
