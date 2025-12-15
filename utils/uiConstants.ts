import React from 'react';
import type { AnalysisStatus } from '../types';

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
  backgroundColor: '#0f172a',
  borderColor: '#334155',
  color: '#f8fafc',
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

/** Tooltip theme classes by status - transparent (no blur, no black block) */
export const TOOLTIP_THEMES: Readonly<Record<AnalysisStatus | 'default', string>> = {
  success: 'border-emerald-500/35 bg-emerald-950/85 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.14)]',
  warning: 'border-orange-500/35 bg-orange-950/85 text-orange-100 shadow-[0_0_18px_rgba(249,115,22,0.14)]',
  danger: 'border-rose-500/35 bg-rose-950/85 text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.14)]',
  info: 'border-blue-500/35 bg-slate-900/85 text-slate-200 shadow-[0_0_18px_rgba(59,130,246,0.14)]',
  default: 'border-slate-700/35 bg-slate-950/85 text-slate-300 shadow-xl',
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
