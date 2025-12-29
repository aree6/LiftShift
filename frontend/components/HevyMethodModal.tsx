import React, { useState } from 'react';
import { ArrowLeft, Upload } from 'lucide-react';

type HevyMethod = 'login' | 'csv' | 'saved';

type Intent = 'initial' | 'update';

interface HevyMethodModalProps {
  intent: Intent;
  hasSavedSession?: boolean;
  onSelect: (method: HevyMethod) => void;
  onBack: () => void;
  onClose?: () => void;
  onClearCache?: () => void;
}

export const HevyMethodModal: React.FC<HevyMethodModalProps> = ({
  intent,
  hasSavedSession = false,
  onSelect,
  onBack,
  onClose,
  onClearCache,
}) => {
  const [showLoginHelp, setShowLoginHelp] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full px-2 sm:px-3 pt-10 pb-6 sm:pt-12 sm:pb-6">
        <div className="max-w-2xl mx-auto slide-in-from-top-2">
          <div className="bg-black/60 border border-slate-700/50 rounded-2xl p-5 sm:p-6">
            <div className="grid grid-cols-3 items-start gap-3">
              <div className="flex items-center justify-start">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-md text-xs font-semibold bg-black/60 hover:bg-black/70 border border-slate-700/50 text-slate-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Hevy</h2>
                <p className="mt-1 text-sm text-slate-300">Choose how you want to sync your data.</p>
              </div>

              <div className="flex items-center justify-end">
                {intent === 'update' && onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center h-9 px-3 rounded-md text-xs font-semibold bg-black/60 hover:bg-black/70 border border-slate-700/50 text-slate-200"
                  >
                    Close
                  </button>
                ) : null}
              </div>
            </div>

            {hasSavedSession ? (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onSelect('saved')}
                  className="group rounded-xl border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/20 px-4 py-4 text-left transition-colors"
                >
                  <div className="text-white font-semibold text-lg">Continue</div>
                  <div className="mt-1 text-xs text-slate-200/90">Auto-sync using your saved session.</div>
                </button>

                {onClearCache ? (
                  <button
                    type="button"
                    onClick={onClearCache}
                    className="group rounded-xl border border-slate-700/60 bg-white/5 hover:bg-white/10 px-4 py-4 text-left transition-colors"
                  >
                    <div className="text-white font-semibold text-lg">Clear cache</div>
                    <div className="mt-1 text-xs text-slate-200/90">Reset tokens + preferences and restart setup.</div>
                  </button>
                ) : null}
              </div>
            ) : (
              onClearCache ? (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={onClearCache}
                    className="w-full rounded-xl border border-slate-700/60 bg-white/5 hover:bg-white/10 px-4 py-3 text-left transition-colors"
                  >
                    <div className="text-white font-semibold">Clear cache</div>
                    <div className="mt-1 text-xs text-slate-200/90">Reset tokens + preferences and restart setup.</div>
                  </button>
                </div>
              ) : null
            )}

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onSelect('login')}
                className="group rounded-xl border border-slate-700/60 bg-white/5 hover:bg-white/10 px-4 py-4 text-left transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-9 h-9 rounded-lg bg-black/20 border border-slate-700/50 flex items-center justify-center flex-shrink-0">
                      <img src="/hevy.png" alt="Hevy" className="w-6 h-6 object-contain" loading="lazy" decoding="async" />
                    </div>
                    <div className="text-white font-semibold text-lg truncate">Login with Hevy</div>
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-200/90">Auto-sync your latest workouts (recommended).</div>
              </button>

              <button
                type="button"
                onClick={() => onSelect('csv')}
                className="group rounded-xl border border-slate-700/60 bg-white/5 hover:bg-white/10 px-4 py-4 text-left transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-9 h-9 rounded-lg bg-black/20 border border-slate-700/50 flex items-center justify-center flex-shrink-0">
                      <Upload className="w-5 h-5 text-slate-200" />
                      <span className="absolute -top-1 -right-1 rounded-full border border-rose-500/30 bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-rose-300">
                        EXP
                      </span>
                    </div>
                    <div className="text-white font-semibold text-lg">
                      Import <span className="text-slate-300 text-base">.CSV</span>
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-200/90">Manual sync. Export and upload when needed.</div>
              </button>
            </div>

            <div className="mt-5 text-[11px] text-slate-400">
              Your login is sent only to your own backend to retrieve a token. Your workouts are processed in your browser.
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowLoginHelp((v) => !v)}
                className="w-full text-center text-sm font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4"
              >
                {showLoginHelp ? 'Hide: See how to login with Hevy' : 'See how to login with Hevy'}
              </button>

              {showLoginHelp ? (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <img
                      src="/step1Login.png"
                      className="w-full h-auto rounded-lg border border-slate-700/60"
                      alt="Hevy login step 1"
                      loading="lazy"
                      decoding="async"
                    />
                    <img
                      src="/step2Login.png"
                      className="w-full h-auto rounded-lg border border-slate-700/60"
                      alt="Hevy login step 2"
                      loading="lazy"
                      decoding="async"
                    />
                    <img
                      src="/step3Login.png"
                      className="w-full h-auto rounded-lg border border-slate-700/60"
                      alt="Hevy login step 3"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  <div className="flex justify-center">
                    <img
                      src="/step5.png"
                      className="w-full max-w-xs h-auto rounded-lg border border-slate-700/60"
                      alt="Set Hevy language to English"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  <div className="text-xs text-slate-400 text-center">
                    Support is English-only right now. If you use quick login, use the same email/username here. If you don’t have a password, set one in your Hevy account first.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
