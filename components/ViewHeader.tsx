import React, { useState } from 'react';
import { Clock, Dumbbell, Eye, ChevronDown, LucideIcon } from 'lucide-react';

export interface StatItem {
  icon: LucideIcon;
  value: number | string;
  label: string;
}

export interface ViewHeaderProps {
  stats?: StatItem[];
  filtersSlot?: React.ReactNode;
  configureOptions?: { key: string; label: string; visible: boolean }[];
  onConfigureToggle?: (key: string) => void;
  rightSlot?: React.ReactNode;
}

export const ViewHeader: React.FC<ViewHeaderProps> = ({
  stats = [],
  filtersSlot,
  configureOptions,
  onConfigureToggle,
  rightSlot,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="bg-slate-900/50 p-3 sm:p-4 rounded-xl border border-slate-800">
      <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
        {/* Left: Stats */}
        <div className="hidden sm:flex items-center gap-2 justify-start">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg">
              <stat.icon className="w-4 h-4 text-slate-400" />
              <div className="text-xs">
                <div className="text-white font-bold leading-4">{stat.value}</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Center: Filters */}
        <div className="flex justify-center">
          <div className="w-full sm:w-auto flex justify-center">
            {filtersSlot}
          </div>
        </div>

        {/* Right: Configure or Custom Slot */}
        <div className="flex justify-end">
          {rightSlot ? (
            rightSlot
          ) : configureOptions && onConfigureToggle ? (
            <div className="relative w-full sm:w-auto">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs sm:text-sm font-medium border border-slate-700 text-slate-200 transition-colors w-full sm:w-auto justify-center sm:justify-start"
              >
                <Eye className="w-4 h-4" /> Configure View <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] uppercase font-bold text-slate-500 px-3 py-1">Visible Charts</p>
                  {configureOptions.map((option) => (
                    <button 
                      key={option.key} 
                      onClick={() => onConfigureToggle(option.key)} 
                      className="w-full flex justify-between px-3 py-2 text-xs sm:text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <span>{option.label}</span>
                      <div className={`w-3 h-3 rounded-full border ${option.visible ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-slate-600'}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ViewHeader;
