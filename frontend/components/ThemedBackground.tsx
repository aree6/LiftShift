import React from 'react';
import { clientOnly } from 'vike-react/clientOnly';
import { useTheme } from './ThemeProvider';

const BackgroundTexture = clientOnly(() => import('./BackgroundTexture'));

export const ThemedBackground: React.FC = () => {
  const { mode } = useTheme();

  if (mode !== 'svg') return null;

  return <BackgroundTexture fallback={null} />;
};
