import React from 'react';
import BackgroundTexture from './BackgroundTexture';
import { useTheme } from './ThemeProvider';

export const ThemedBackground: React.FC = () => {
  const { mode } = useTheme();

  if (mode !== 'svg') return null;

  return <BackgroundTexture />;
};
