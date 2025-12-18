import React from 'react';

export type CardTheme = 'dark' | 'light';

interface FlexCardProps {
  children: React.ReactNode;
  theme: CardTheme;
  className?: string;
}

// Shared card wrapper for consistent styling
export const FlexCard: React.FC<FlexCardProps> = ({ children, theme, className = '' }) => {
  const isDark = theme === 'dark';
  const cardBg = isDark 
    ? 'bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628]' 
    : 'bg-gradient-to-br from-white/80 via-sky-50/70 to-fuchsia-50/60';
  const cardBorder = isDark ? 'border-slate-700/40' : 'border-slate-200/80';
  const glowClass = isDark
    ? 'shadow-2xl shadow-[0_24px_80px_-40px_rgba(59,130,246,0.45)]'
    : 'shadow-xl shadow-[0_18px_60px_-35px_rgba(59,130,246,0.35)]';
  const ringClass = isDark ? 'ring-1 ring-white/5' : 'ring-1 ring-slate-900/5';

  return (
    <div className={`relative rounded-3xl border ${cardBorder} ${cardBg} ${glowClass} ${ringClass} overflow-hidden transition-all duration-500 ${className}`}>
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute -top-20 -right-24 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-blue-500/14' : 'bg-sky-300/55'}`} />
        <div className={`absolute -bottom-24 -left-24 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-fuchsia-500/10' : 'bg-fuchsia-300/45'}`} />
        <div
          className={`absolute left-1/2 top-24 -translate-x-1/2 w-[360px] h-[260px] rounded-full blur-3xl opacity-90 ${
            isDark
              ? 'bg-gradient-to-r from-blue-500/18 via-cyan-500/10 to-violet-500/16'
              : 'bg-gradient-to-r from-blue-300/60 via-cyan-200/50 to-violet-300/55'
          }`}
        />
        <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-white/5 via-transparent to-black/20' : 'bg-gradient-to-br from-white/65 via-white/25 to-white/40'}`} />
      </div>
      {children}
    </div>
  );
};

// Branding footer component
export function FlexCardFooter({ theme }: { theme: CardTheme }) {
  const isDark = theme === 'dark';
  return (
    <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none select-none">
      <span className={`text-[11px] font-semibold tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        LiftShift.app
      </span>
    </div>
  );
}
