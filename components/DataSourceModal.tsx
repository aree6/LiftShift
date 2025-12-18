import React from 'react';
import type { DataSourceChoice } from '../utils/dataSources/types';

type Intent = 'initial' | 'update';

interface DataSourceModalProps {
  intent: Intent;
  onSelect: (source: DataSourceChoice) => void;
  onClose?: () => void;
}

export const DataSourceModal: React.FC<DataSourceModalProps> = ({ intent, onSelect, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full px-2 sm:px-3 pt-10 pb-6 sm:pt-12 sm:pb-6">
        <div className="max-w-2xl mx-auto slide-in-from-top-2">
          <div className="bg-black/60 border border-slate-700/50 rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="w-9" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Choose your platform</h2>
              <div className="w-9">
                {intent === 'update' && onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md text-xs font-semibold bg-black/60 hover:bg-black/70 border border-slate-700/50 text-slate-200"
                  >
                    Close
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
