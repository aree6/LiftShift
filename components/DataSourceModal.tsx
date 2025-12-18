import React from 'react';
import type { DataSourceChoice } from '../utils/dataSources/types';
import { UNIFORM_HEADER_BUTTON_CLASS } from '../utils/ui/uiConstants';
import { Layers3, X } from 'lucide-react';

type Intent = 'initial' | 'update';

interface DataSourceModalProps {
  intent: Intent;
  onSelect: (source: DataSourceChoice) => void;
  onClose?: () => void;
}

export const DataSourceModal: React.FC<DataSourceModalProps> = ({ intent, onSelect, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full px-2 sm:px-3 pt-10 pb-6 sm:pt-12 sm:pb-6">
        <div className="max-w-2xl mx-auto slide-in-from-top-2">
          <div className="relative bg-black/60 border border-slate-700/50 rounded-2xl p-5 sm:p-6 overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full blur-3xl bg-blue-500/10" />
              <div className="absolute -bottom-28 -left-28 w-72 h-72 rounded-full blur-3xl bg-fuchsia-500/10" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20" />
            </div>

            <div className="relative flex items-start justify-between gap-3">
              <div className="w-[72px]" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight inline-flex items-center gap-2">
                <Layers3 className="w-6 h-6 text-slate-200" />
                <span>Choose your platform</span>
              </h2>
              <div className="w-[72px] flex justify-end">
                {intent === 'update' && onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className={`${UNIFORM_HEADER_BUTTON_CLASS} gap-2`}
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Close</span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <div className="grid grid-cols-2 gap-8 sm:gap-10 place-items-center">
                <button
                  type="button"
                  onClick={() => onSelect('hevy')}
                  className="relative group flex flex-col items-center justify-center w-36 sm:w-40 h-36 sm:h-40 rounded-2xl transition-colors"
                >
                  <span className="absolute top-0.5 right-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                    BETA
                  </span>
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[30px] bg-black/20 border border-slate-700/50 flex items-center justify-center group-hover:border-slate-500/60 transition-colors">
                    <img src="/hevy.png" alt="Hevy" className="w-14 h-14 sm:w-16 sm:h-16 object-contain" loading="lazy" decoding="async" />
                  </div>
                  <div className="mt-2 text-white font-semibold">Hevy</div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelect('strong')}
                  className="relative group flex flex-col items-center justify-center w-36 sm:w-40 h-36 sm:h-40 rounded-2xl transition-colors"
                >
                  <span className="absolute top-0.5 right-0.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                    EXP
                  </span>
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[30px] bg-black/20 border border-slate-700/50 flex items-center justify-center group-hover:border-slate-500/60 transition-colors">
                    <img src="/strong.png" alt="Strong" className="w-14 h-14 sm:w-16 sm:h-16 object-contain" loading="lazy" decoding="async" />
                  </div>
                  <div className="mt-2 text-white font-semibold">Strong</div>
                </button>

                <button
                  type="button"
                  disabled
                  className="relative group flex flex-col items-center justify-center w-28 sm:w-32 h-28 sm:h-32 rounded-2xl opacity-60 cursor-not-allowed"
                >
                  <span className="absolute top-0.5 right-0.5 rounded-full border border-slate-600/30 bg-slate-600/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    SOON
                  </span>
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-black/20 border border-slate-700/50 flex items-center justify-center">
                    <img src="/fitbod.png" alt="Fitbod" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" loading="lazy" decoding="async" />
                  </div>
                  <div className="mt-2 text-white font-semibold text-sm">Fitbod</div>
                </button>

                <button
                  type="button"
                  disabled
                  className="relative group flex flex-col items-center justify-center w-28 sm:w-32 h-28 sm:h-32 rounded-2xl opacity-60 cursor-not-allowed"
                >
                  <span className="absolute top-0.5 right-0.5 rounded-full border border-slate-600/30 bg-slate-600/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    SOON
                  </span>
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-black/20 border border-slate-700/50 flex items-center justify-center">
                    <img src="/Jefit.png" alt="Jefit" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" loading="lazy" decoding="async" />
                  </div>
                  <div className="mt-2 text-white font-semibold text-sm">Jefit</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
