import React from 'react';
import type { AnalysisStatus } from '../../types';

/**
 * Shared UI constants for consistent styling across components.
 */

/** Decorative font style for headings and emphasis */
export const FANCY_FONT: Readonly<React.CSSProperties> = {
  fontFamily: '"Libre Baskerville", Georgia, "Times New Roman", serif',
  fontWeight: 600,
  fontStyle: 'italic',
  letterSpacing: '0.02em',
  
};

/** Semi-decorative font style for exercise names, muscle names, and entity labels */
export const SEMI_FANCY_FONT: Readonly<React.CSSProperties> = {
  fontFamily: '"Lora", Georgia, "Times New Roman", serif',
  fontWeight: 500,
  fontStyle: 'italic',
};

/** Decorative font style for numbers (non-italic) */
export const FANCY_FONT_NUMBERS: Readonly<React.CSSProperties> = {
  fontFamily: '"Libre Baskerville", Georgia, "Times New Roman", serif',
  fontWeight: 600,
  fontStyle: 'normal',
};

/** Radar chart axis tick fill – theme-aware via CSS variable (--text-muted) */
export const RADAR_TICK_FILL = 'var(--text-muted)';

/** Standard Recharts tooltip styling */
export const CHART_TOOLTIP_STYLE: Readonly<React.CSSProperties> = {
  backgroundColor: 'rgb(var(--panel-rgb) / 0.88)',
  borderColor: 'rgb(var(--border-rgb) / 0.5)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  borderRadius: '8px',
};

/** Color palette for pie/bar charts */
export const CHART_COLORS: readonly string[] = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ef4444',
] as const;

/** Tooltip theme classes by status */
export const TOOLTIP_THEMES: Readonly<Record<AnalysisStatus | 'default', string>> = {
  success: 'bg-black/90 text-white border-emerald-400/40 shadow-xl',
  warning: 'bg-black/90 text-white border-orange-400/40 shadow-xl',
  danger: 'bg-black/90 text-white border-rose-400/40 shadow-xl',
  info: 'bg-black/90 text-white border-blue-400/40 shadow-xl',
  default: 'bg-black/90 text-white border-slate-700/50 shadow-xl',
};

/** Animation keyframes as CSS string for inline style injection */
export const ANIMATION_KEYFRAMES = `
  @keyframes medalShimmer {
    0% { transform: translateX(-140%) skewX(-12deg); opacity: 0; }
    15% { opacity: 0.9; }
    45% { opacity: 0.5; }
    70% { opacity: 0.85; }
    100% { transform: translateX(140%) skewX(-12deg); opacity: 0; }
  }

  @keyframes textShimmer {
    0% { background-position: -200% 50%; }
    100% { background-position: 200% 50%; }
  }

  @keyframes prRowShimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @keyframes meteorRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  :root {
    --meteor-border-bg: rgb(var(--panel-rgb));
    --meteor-dot: 255 255 255;
    --meteor-dim: 255 255 255;
    --meteor-core: 99 102 241;
  }

  html[data-theme='light'] {
    --meteor-border-bg: rgb(var(--panel-rgb));
    --meteor-dot: 245 158 11;
    --meteor-dim: 245 158 11;
    --meteor-core: 217 119 6;
  }

  .meteor-border-track {
    position: absolute;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    border-radius: 6px;
    border: 1px solid rgb(var(--border-rgb) / 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    pointer-events: none;
  }

  .meteor-premium {
    position: absolute;
    width: 200px;
    height: 400%;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      transparent 150deg,
      rgba(var(--meteor-core) / 0.05) 165deg,
      rgba(var(--meteor-core) / 0.15) 175deg,
      rgba(var(--meteor-core) / 0.30) 182deg,
      rgba(var(--meteor-core) / 0.50) 186deg,
      rgba(var(--meteor-core) / 0.70) 189deg,
      rgba(var(--meteor-core) / 0.90) 191deg,
      rgba(var(--meteor-core) / 1) 192deg,
      rgba(var(--meteor-core) / 0.90) 193deg,
      rgba(var(--meteor-core) / 0.50) 195deg,
      rgba(var(--meteor-core) / 0.20) 198deg,
      rgba(var(--meteor-core) / 0.10) 202deg,
      transparent 210deg,
      transparent 360deg
    );
    animation: meteorRotate 4s linear infinite;
    filter: blur(0.5px);
  }

  .meteor-premium::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      transparent 185deg,
      rgba(var(--meteor-core) / 0.40) 190deg,
      rgba(var(--meteor-core) / 0.60) 192deg,
      rgba(var(--meteor-core) / 0.40) 194deg,
      transparent 199deg,
      transparent 360deg
    );
    filter: blur(6px);
  }

  .meteor-border-mask {
    position: absolute;
    width: calc(100% - 2px);
    height: calc(100% - 2px);
    background: var(--meteor-border-bg);
    border-radius: 5px;
    z-index: 1;
  }
`;

/** Tooltip positioning constants */
export const TOOLTIP_CONFIG = {
  WIDTH: 280,
  GAP: 12,
  FLIP_THRESHOLD: 200,
} as const;

/** Calculate smart tooltip position based on trigger element */
export const calculateTooltipPosition = (
  rect: DOMRect,
  width: number = TOOLTIP_CONFIG.WIDTH
): React.CSSProperties => {
  const left = Math.min(
    window.innerWidth - width - 20,
    Math.max(20, rect.left + rect.width / 2 - width / 2)
  );

  const shouldFlip = rect.top < TOOLTIP_CONFIG.FLIP_THRESHOLD;

  const style: React.CSSProperties = {
    left: `${left}px`,
  };

  if (shouldFlip) {
    style.top = `${rect.bottom + TOOLTIP_CONFIG.GAP}px`;
  } else {
    style.bottom = `${window.innerHeight - rect.top + TOOLTIP_CONFIG.GAP}px`;
  }

  return style;
};

export const UNIFORM_HEADER_BUTTON_CLASS =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 py-1.5 bg-transparent border border-emerald-500/40 text-slate-200 hover:border-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer';

export const UNIFORM_FOOTER_BUTTON_CLASS =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-transparent border border-emerald-500/40 text-slate-200 hover:border-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200 flex-1 sm:flex-none min-w-[140px] sm:min-w-0 cursor-pointer';

export const UNIFORM_HEADER_ICON_BUTTON_CLASS =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-9 h-9 bg-transparent border border-emerald-500/40 text-slate-200 hover:border-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer';

export const calculateCenteredTooltipPosition = (
  rect: DOMRect,
  maxWidth: number = TOOLTIP_CONFIG.WIDTH
): React.CSSProperties => {
  const center = rect.left + rect.width / 2;
  const minCenter = 20 + maxWidth / 2;
  const maxCenter = window.innerWidth - 20 - maxWidth / 2;
  const clampedCenter = Math.min(maxCenter, Math.max(minCenter, center));

  const shouldFlip = rect.top < TOOLTIP_CONFIG.FLIP_THRESHOLD;

  const style: React.CSSProperties = {
    left: `${clampedCenter}px`,
    transform: 'translateX(-50%)',
  };

  if (shouldFlip) {
    style.top = `${rect.bottom + TOOLTIP_CONFIG.GAP}px`;
  } else {
    style.bottom = `${window.innerHeight - rect.top + TOOLTIP_CONFIG.GAP}px`;
  }

  return style;
};

export const calculateMouseTooltipPosition = (
  clientX: number,
  clientY: number,
  maxWidth: number = TOOLTIP_CONFIG.WIDTH
): React.CSSProperties => {
  const gap = 8;
  const tooltipHeight = 100; // approximate, will adjust
  
  // Position above the mouse
  let left = clientX;
  let top = clientY - tooltipHeight - gap;
  
  // Keep tooltip within viewport horizontally
  const minLeft = 10;
  const maxLeft = window.innerWidth - maxWidth - 10;
  left = Math.min(maxLeft, Math.max(minLeft, left - maxWidth / 2));
  
  // If too close to top, show below instead
  if (top < 10) {
    top = clientY + gap;
  }

  return {
    left: `${left}px`,
    top: `${top}px`,
  };
};
