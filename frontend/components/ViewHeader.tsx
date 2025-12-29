import React, { useState } from 'react';
import { Eye, ChevronDown, LucideIcon } from 'lucide-react';

export interface StatItem {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
}

export interface ViewHeaderProps {
  stats?: StatItem[];
  leftStats?: StatItem[];
  rightStats?: StatItem[];
  filtersSlot?: React.ReactNode;
  sticky?: boolean;
  configureOptions?: { key: string; label: string; visible: boolean }[];
  onConfigureToggle?: (key: string) => void;
  rightSlot?: React.ReactNode;
}

export const ViewHeader: React.FC<ViewHeaderProps> = ({
  stats = [],
  leftStats,
  rightStats,
  filtersSlot,
  sticky = false,
  configureOptions,
  onConfigureToggle,
  rightSlot,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const leftItems = leftStats ?? stats;

  return (
    <div className={`${sticky ? 'sticky top-0 z-30' : ''} bg-black/70 p-2 sm:p-3 rounded-xl`}>
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr),auto,minmax(0,1fr)] items-center gap-2">
        {/* Left: Stats */}
        <div className="hidden sm:flex items-center gap-2 justify-start min-w-0">
          {leftItems.map((stat, i) => (
            <div key={i} className="flex items-center gap-2 px-3 h-10 bg-black/70 border border-slate-700/50 rounded-lg">
              <stat.icon className="w-4 h-4 text-slate-400" />
              <div className="text-xs">
                <div className="text-white font-bold leading-4">{stat.value}</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Center: Filters */}
        <div className="flex justify-center min-w-0">
          <div className="w-full flex justify-center min-w-0">
            {filtersSlot}
          </div>
        </div>

        {/* Right: Configure or Custom Slot */}
        <div className="hidden sm:flex justify-end min-w-0">
          <div className="flex items-center gap-2 justify-end min-w-0">
            {(rightStats || []).map((stat, i) => (
              <div key={i} className="flex items-center gap-2 px-3 h-10 bg-black/70 border border-slate-700/50 rounded-lg">
                <stat.icon className="w-4 h-4 text-slate-400" />
                <div className="text-xs">
                  <div className="text-white font-bold leading-4">{stat.value}</div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            ))}

            {rightSlot ? (
              rightSlot
            ) : configureOptions && onConfigureToggle ? (
              <div className="relative w-full sm:w-auto">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)} 
                  className="inline-flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 py-1.5 bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                  <Eye className="w-4 h-4" /> Configure View <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-black/90 border border-slate-700/50 rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] uppercase font-bold text-slate-500 px-3 py-1">Visible Charts</p>
                    {configureOptions.map((option) => (
                      <button 
                        key={option.key} 
                        onClick={() => onConfigureToggle(option.key)} 
                        className="w-full flex justify-between px-3 py-2 text-xs sm:text-sm text-slate-300 hover:bg-black/60 rounded-lg transition-colors"
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
    </div>
  );
};

export default ViewHeader;
