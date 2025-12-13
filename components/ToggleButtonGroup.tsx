import React from 'react';

export interface ToggleOption<T extends string = string> {
  value: T;
  label: string;
}

interface ToggleButtonGroupProps<T extends string = string> {
  options: readonly ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Color theme for active button */
  activeColor?: 'blue' | 'purple' | 'emerald' | 'amber' | 'cyan' | 'red';
  /** Size variant */
  size?: 'sm' | 'md';
}

const COLOR_CLASSES: Record<string, string> = {
  blue: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30',
  purple: 'bg-purple-600 text-white shadow-lg shadow-purple-600/30',
  emerald: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30',
  amber: 'bg-amber-600 text-white shadow-lg shadow-amber-600/30',
  cyan: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30',
  red: 'bg-red-600 text-white shadow-lg shadow-red-600/30',
};

const INACTIVE_CLASS = 'text-slate-500 hover:text-slate-300 hover:bg-slate-800';

export function ToggleButtonGroup<T extends string = string>({
  options,
  value,
  onChange,
  activeColor = 'blue',
  size = 'sm',
}: ToggleButtonGroupProps<T>): React.ReactElement {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-3 py-1.5 text-xs';
  const activeClass = COLOR_CLASSES[activeColor] ?? COLOR_CLASSES.blue;

  return (
    <div className="bg-slate-950 p-0.5 rounded-lg flex gap-1 border border-slate-800 transition-all duration-200 hover:border-slate-700">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`${sizeClasses} font-bold uppercase rounded transition-all duration-200 ${
            value === option.value ? activeClass : INACTIVE_CLASS
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default ToggleButtonGroup;
