import React from 'react';
import type { AnalysisStatus } from '../../types';

/**
 * Shared UI constants for consistent styling across components.
 */

/** Decorative font style for headings and emphasis */
export const FANCY_FONT: Readonly<React.CSSProperties> = {
  fontFamily: '"Libre Baskerville", "Poppins", sans-serif',
  fontWeight: 600,
  fontStyle: 'italic',
};

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
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 py-1.5 bg-transparent border border-[color:rgb(var(--uniform-btn-border-rgb)/0.8)] text-slate-200 hover:border-[color:rgb(var(--uniform-btn-border-hover-rgb)/1)] hover:text-white hover:bg-white/5 transition-all duration-200';

export const UNIFORM_FOOTER_BUTTON_CLASS =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-transparent border border-[color:rgb(var(--uniform-btn-border-rgb)/0.8)] text-slate-200 hover:border-[color:rgb(var(--uniform-btn-border-hover-rgb)/1)] hover:text-white hover:bg-white/5 transition-all duration-200 flex-1 sm:flex-none min-w-[140px] sm:min-w-0';

export const UNIFORM_HEADER_ICON_BUTTON_CLASS =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-9 h-9 bg-transparent border border-[color:rgb(var(--uniform-btn-border-rgb)/0.8)] text-slate-200 hover:border-[color:rgb(var(--uniform-btn-border-hover-rgb)/1)] hover:text-white hover:bg-white/5 transition-all duration-200';

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
