import React, { useMemo } from 'react';
import { Moon, Palette, Sparkles, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const labelForMode = (mode: string) => {
  switch (mode) {
    case 'light':
      return 'Day';
    case 'medium-dark':
      return 'Medium';
    case 'midnight-dark':
      return 'Midnight';
    case 'pure-black':
      return 'Pure Black';
    case 'svg':
      return 'Texture';
    default:
      return 'Theme';
  }
};

export const ThemeToggleButton: React.FC<{ className?: string; compact?: boolean }> = ({
  className,
  compact = false,
}) => {
  const { mode, cycleMode } = useTheme();

  const { Icon, label } = useMemo(() => {
    if (mode === 'light') return { Icon: Sun, label: 'Day' };
    if (mode === 'medium-dark') return { Icon: Moon, label: 'Medium' };
    if (mode === 'midnight-dark') return { Icon: Sparkles, label: 'Midnight' };
    if (mode === 'pure-black') return { Icon: Moon, label: 'Pure Black' };
    return { Icon: Palette, label: 'Texture' };
  }, [mode]);

  const title = `Theme: ${labelForMode(mode)} (click to cycle)`;

  return (
    <button
      type="button"
      onClick={cycleMode}
      className={
        className ??
        `inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${compact ? 'h-9 w-9' : 'h-10 w-10'} bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200`
      }
      title={title}
      aria-label={title}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};
