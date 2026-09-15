import React from 'react';
import { Reveal } from '../../ui/Reveal';
import { resolveDarkBgByMode, resolveLightBg } from '../../../src/assets/images/misc/bgConfig';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppPreferences } from '../../../hooks/app';

export type CardTheme = 'dark' | 'light';

interface FlexCardProps {
  children: React.ReactNode;
  theme: CardTheme;
  className?: string;
}

// Shared card wrapper for consistent styling
export const FlexCard: React.FC<FlexCardProps> = ({ children, theme, className = '' }) => {
  const { mode } = useTheme();
  const { darkBgChoice, lightBgChoice } = useAppPreferences();
  const isDark = theme === 'dark';
  const cardBgClass = 'bg-cover bg-center bg-no-repeat';
  const cardBgStyle = isDark
    ? { backgroundImage: `url(${resolveDarkBgByMode(mode, darkBgChoice)})` }
    : { backgroundImage: `url(${resolveLightBg(lightBgChoice)})` };
  const glassSurface = isDark ? 'bg-black/50' : '';
  const cardShadow = isDark
    ? 'shadow-[0_28px_65px_rgba(0,0,0,0.42)]'
    : 'shadow-[0_28px_60px_rgba(13,71,88,0.14)]';

  return (
    <Reveal className={`relative isolate overflow-hidden rounded-3xl h-full ${cardShadow} transition-shadow duration-500`}>
      <div className={`absolute inset-0 ${cardBgClass}`} style={cardBgStyle} />
      {isDark && <div className="absolute inset-0 bg-black/50" />}
      <div className={`relative z-10 w-full ${className}`}>
        {children}
      </div>
    </Reveal>
  );
};

// Branding footer component
export function FlexCardFooter({ theme }: { theme: CardTheme }) {
  const isDark = theme === 'dark';
  return (
    <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none select-none">
      <span className={`text-[11px] sm:text-xs font-semibold tracking-wide ${isDark ? '!text-slate-400/80' : '!text-slate-500'}`}>
        LiftShift.app
      </span>
    </div>
  );
}
