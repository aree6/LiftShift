import React from 'react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label?: string;
  icon?: React.ReactNode;
  title?: string;
  /** Extra classes for the button when inactive (replaces the default slate styling). */
  className?: string;
  /** Extra classes for the button when active (replaces the default blue styling). */
  activeClassName?: string;
}

interface SegmentControlProps<T extends string = string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 'paper' renders ink-on-paper styling for use inside paper-textured cards. */
  tone?: 'default' | 'paper';
}

const ACTIVE_CLASS = 'bg-blue-500/20 text-blue-400';

const INACTIVE_CLASS = 'text-slate-500 hover:text-slate-200';

const PAPER_ACTIVE_CLASS = 'bg-[#332B1C] text-[#F0E5C5]';

const PAPER_INACTIVE_CLASS = 'text-[#332B1C]/55 hover:text-[#332B1C]';

export function SegmentControl<T extends string = string>({
  options,
  value,
  onChange,
  tone = 'default',
}: SegmentControlProps<T>): React.ReactElement {
  const paper = tone === 'paper';
  return (
    <div
      className="p-0.5 rounded-xl inline-flex gap-0.5 shrink-0"
      style={{ backgroundColor: paper ? 'rgba(51,43,28,0.12)' : 'rgba(128, 128, 128, 0.08)' }}
    >
      {options.map((option) => {
        const active = value === option.value;
        const colorClass = active
          ? (option.activeClassName ?? (paper ? PAPER_ACTIVE_CLASS : ACTIVE_CLASS))
          : (option.className ?? (paper ? PAPER_INACTIVE_CLASS : INACTIVE_CLASS));
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            title={option.title}
            aria-label={option.title}
            aria-pressed={active}
            className={`h-7 flex items-center justify-center gap-1 rounded-2xl cursor-pointer transition-colors duration-200 ${colorClass} ${
              option.icon ? 'pl-2 pr-1.5 pt-0.5' : 'px-1.5 text-xs font-bold leading-none whitespace-nowrap'
            }`}
          >
            {option.icon && <span className="w-3.5 h-3.5 flex-shrink-0">{option.icon}</span>}
            {option.label && <span className="text-xs font-bold leading-none whitespace-nowrap">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentControl;
