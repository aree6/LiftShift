import React, { useState } from 'react';
import { ArrowLeft, Key, Upload } from 'lucide-react';

type LyftaMethod = 'login' | 'csv' | 'saved';

type Intent = 'initial' | 'update';

interface LyftaMethodModalProps {
  intent: Intent;
  hasSavedSession?: boolean;
  onSelect: (method: LyftaMethod) => void;
  onBack: () => void;
  onClose?: () => void;
  onClearCache?: () => void;
}

export const LyftaMethodModal: React.FC<LyftaMethodModalProps> = ({
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
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Lyfta</h2>
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
                  <div className="mt-1 text-xs text-slate-200/90">Auto-sync using your saved API key.</div>
                </button>

                {onClearCache ? (
                  <button
                    type="button"
                    onClick={onClearCache}
                    className="group rounded-xl border border-slate-700/60 bg-white/5 hover:bg-white/10 px-4 py-4 text-left transition-colors"
                  >
                    <div className="text-white font-semibold text-lg">Clear cache</div>
                    <div className="mt-1 text-xs text-slate-200/90">Reset API key + preferences and restart setup.</div>
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
                    <div className="mt-1 text-xs text-slate-200/90">Reset API key + preferences and restart setup.</div>
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
                      <Key className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-white font-semibold text-lg truncate">Use API Key</div>
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
              Your API key is sent only to your own backend to fetch workouts. Your data is processed in your browser.
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowLoginHelp((v) => !v)}
                className="w-full text-center text-sm font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4"
              >
                {showLoginHelp ? 'Hide: How to get your API key' : 'How to get your Lyfta API key'}
              </button>

              {showLoginHelp ? (
                <div className="mt-3 space-y-3">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <ol className="text-sm text-blue-100/90 space-y-2 list-decimal list-inside">
                      <li>Go to <a href="https://my.lyfta.app/community/api" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">my.lyfta.app/community/api</a></li>
                      <li>Sign in to your Lyfta account if needed</li>
                      <li>Your API key will be displayed on the page</li>
                      <li>Copy the API key and paste it when prompted</li>
                    </ol>
                  </div>

                  <div className="text-xs text-slate-400 text-center">
                    Your API key allows read-only access to your workout data. Keep it private and don't share it publicly.
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
