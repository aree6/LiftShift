import React from 'react';
import { AnalysisStatus } from '../types';
import { TOOLTIP_THEMES, TOOLTIP_CONFIG, calculateCenteredTooltipPosition } from '../utils/ui/uiConstants';

export interface TooltipData {
  rect: DOMRect;
  title: string;
  body: string;
  footer?: string;
  status: AnalysisStatus | 'default';
  metrics?: Array<{ label: string; value: string }>;
}

interface TooltipProps {
  data: TooltipData;
}

export const Tooltip: React.FC<TooltipProps> = ({ data }) => {
  const { rect, title, body, footer, status, metrics } = data;
  const theme = TOOLTIP_THEMES[status];
  const positionStyle = calculateCenteredTooltipPosition(rect, TOOLTIP_CONFIG.WIDTH);

  return (
    <div
      className="fixed z-[9999] pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95"
      style={positionStyle}
    >
      <div
        className={`border rounded-xl p-3 ${theme} inline-block w-fit`}
        style={{ maxWidth: TOOLTIP_CONFIG.WIDTH, backgroundColor: 'rgb(var(--mw-tooltip-rgb) / var(--mw-tooltip-alpha))' }}
      >
        <div className="flex items-center gap-2 mb-1 pb-1 border-b border-white/10">
          <span className="font-bold uppercase text-[10px] tracking-wider">{title}</span>
        </div>
        <div className="text-xs leading-relaxed opacity-90 whitespace-pre-line break-words">{body}</div>
        {metrics && metrics.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/10 flex gap-4 text-xs font-mono opacity-80">
            {metrics.map((m, i) => (
              <div key={i}>
                <span>{m.label}:</span>
                <span className="font-bold ml-1">{m.value}</span>
              </div>
            ))}
          </div>
        )}
        {footer && (
          <div className="mt-2 text-[10px] font-bold text-blue-400 break-words">{footer}</div>
        )}
      </div>
    </div>
  );
};

export const useTooltip = () => {
  const [tooltip, setTooltip] = React.useState<TooltipData | null>(null);

  const showTooltip = React.useCallback(
    (e: React.MouseEvent, data: Omit<TooltipData, 'rect'>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({ ...data, rect });
    },
    []
  );

  const hideTooltip = React.useCallback(() => {
    setTooltip(null);
  }, []);

  return { tooltip, showTooltip, hideTooltip };
};
