import React from 'react';

export const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, className, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        className ??
        `inline-flex items-center gap-2 rounded-md border px-2 py-1 bg-black/50 transition-colors ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-slate-800'
            : 'border-slate-700/50 hover:border-slate-600/70'
        }`
      }
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">{label}</span>
      <span
        className={`relative inline-flex h-4 w-8 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
};
