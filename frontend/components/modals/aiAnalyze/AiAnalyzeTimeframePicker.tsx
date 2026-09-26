import React from 'react';
import type { TimeframeMonths } from './aiAnalyzeConfig';

interface AiAnalyzeTimeframePickerProps {
  months: TimeframeMonths;
  setMonths: (value: TimeframeMonths) => void;
}

export const AiAnalyzeTimeframePicker: React.FC<AiAnalyzeTimeframePickerProps> = ({
  months,
  setMonths,
}) => (
    <div className="space-y-2">
      <div className="space-y-1">
      <div className="text-xs font-medium text-slate-200">Analysis Context</div>
      <div className="text-[11px] sm:text-xs text-slate-500">Choose the workout range to export</div>
      </div>
    <div className="flex flex-wrap gap-2">
      {([
        { label: 'Last session', value: 'last_session' as const },
        { label: '1 mo', value: 1 as const },
        { label: '3 mo', value: 3 as const },
        { label: '6 mo', value: 6 as const },
        { label: 'All', value: 'all' as const },
      ] as const).map((opt) => {
        const selected = months === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => setMonths(opt.value)}
            data-track={`export-timeframe:${String(opt.value)}`}
            className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
              selected
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900/20 border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-900/40'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);
