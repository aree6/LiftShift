/**
 * Centralized delta percentage formatting utilities
 * Provides consistent formatting across the application with enhanced UX for large percentages
 */

export interface DeltaFormatOptions {
  /** Show plus sign for positive values */
  showPlus?: boolean;
  /** Show percentage symbol */
  showPercent?: boolean;
  /** Use compact format (e.g., 2x instead of 200%) */
  compact?: boolean;
  /** Minimum value to use compact format */
  compactThreshold?: number;
  /** Number of decimal places for regular percentages */
  decimals?: number;
}

/**
 * Formats a delta percentage with enhanced UX for large values
 * 
 * Examples:
 * - 50% → "50%" or "+50%"
 * - 100% → "100%" (below compact threshold) 
 * - 125% → "125%" (below compact threshold)
 * - 150% → "2.5x" (150% increase = 2.5x total performance)
 * - 175% → "2.8x" (175% increase = 2.8x total performance)
 * - 200% → "3x" (200% increase = 3x total performance)
 * - 250% → "3.5x" (250% increase = 3.5x total performance)
 * 
 * Note: Units are always displayed (%) or (x) for better data interpretation
 * The "x" format represents total performance (baseline + increase)
 * 
 * @param deltaPercent - The delta percentage value (can be negative)
 * @param options - Formatting options
 * @returns Formatted string
 */
export const formatDeltaPercentage = (
  deltaPercent: number,
  options: DeltaFormatOptions = {}
): string => {
  const {
    showPlus = false,
    showPercent = true,
    compact = false,
    compactThreshold = 150,
    decimals = 0
  } = options;

  // Handle edge cases
  if (!Number.isFinite(deltaPercent)) {
    return showPlus ? '+0%' : '0%';
  }

  const isPositive = deltaPercent > 0;
  const sign = isPositive && showPlus ? '+' : '';
  
  // Regular percentage formatting
  const formattedPercent = decimals > 0 
    ? deltaPercent.toFixed(decimals) 
    : Math.round(deltaPercent).toString();
  
  // Always show a unit - either % for regular format or x for compact
  if (compact && Math.abs(deltaPercent) >= compactThreshold) {
    // Convert percentage increase to multiple of baseline
    // 100% increase = 2x total (1x baseline + 1x increase)
    // 200% increase = 3x total (1x baseline + 2x increase)
    const multiplier = 1 + (Math.abs(deltaPercent) / 100);
    const formattedMultiplier = decimals > 0 
      ? multiplier.toFixed(decimals) 
      : multiplier === Math.floor(multiplier) 
        ? multiplier.toString() 
        : multiplier.toFixed(1);
    
    return `${sign}${formattedMultiplier}x`;
  }
  
  return `${sign}${formattedPercent}%`;
};

/**
 * Formats a delta with both absolute value and percentage
 * 
 * @param delta - Absolute delta value
 * @param previous - Previous value for percentage calculation
 * @param options - Formatting options
 * @returns Object with formatted values
 */
export const formatDelta = (
  delta: number,
  previous: number,
  options: DeltaFormatOptions & { 
    /** Format absolute value with specified decimals */
    absoluteDecimals?: number;
    /** Show absolute value */
    showAbsolute?: boolean;
  } = {}
): {
  formattedDelta: string;
  formattedPercent: string;
  rawPercent: number;
} => {
  const { absoluteDecimals = 1, showAbsolute = true, ...percentOptions } = options;
  
  // Calculate percentage
  const deltaPercent = previous !== 0 ? (delta / previous) * 100 : (delta > 0 ? 100 : 0);
  
  // Format absolute value
  const formattedDelta = showAbsolute 
    ? `${deltaPercent > 0 ? '+' : ''}${delta.toFixed(absoluteDecimals)}`
    : '';
  
  // Format percentage
  const formattedPercent = formatDeltaPercentage(deltaPercent, percentOptions);
  
  return {
    formattedDelta,
    formattedPercent,
    rawPercent: deltaPercent
  };
};

/**
 * Preset configurations for common use cases
 */
export const DELTA_FORMAT_PRESETS = {
  // Compact format for badges and small spaces
  COMPACT: {
    showPlus: false,
    showPercent: true, // This is now ignored - units are always shown
    compact: true,
    compactThreshold: 150,
    decimals: 1
  } as DeltaFormatOptions,
  
  // Standard format with plus sign
  STANDARD_WITH_PLUS: {
    showPlus: true,
    showPercent: true,
    compact: false,
    decimals: 0
  } as DeltaFormatOptions,
  
  // Standard format without plus sign
  STANDARD: {
    showPlus: false,
    showPercent: true,
    compact: false,
    decimals: 0
  } as DeltaFormatOptions,
  
  // Detailed format for tooltips
  DETAILED: {
    showPlus: true,
    showPercent: true,
    compact: true,
    compactThreshold: 150,
    decimals: 1
  } as DeltaFormatOptions
} as const;

/**
 * Helper function to get the best format preset based on context
 */
export const getDeltaFormatPreset = (
  context: 'badge' | 'tooltip' | 'chart' | 'table' = 'badge'
): DeltaFormatOptions => {
  switch (context) {
    case 'badge':
      return DELTA_FORMAT_PRESETS.COMPACT;
    case 'tooltip':
      return DELTA_FORMAT_PRESETS.DETAILED;
    case 'chart':
      return DELTA_FORMAT_PRESETS.STANDARD_WITH_PLUS;
    case 'table':
      return DELTA_FORMAT_PRESETS.STANDARD;
    default:
      return DELTA_FORMAT_PRESETS.STANDARD;
  }
};
