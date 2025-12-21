import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, HelpCircle, Key, RefreshCw, Trash2, Upload } from 'lucide-react';
import { UNIFORM_HEADER_BUTTON_CLASS, UNIFORM_HEADER_ICON_BUTTON_CLASS } from '../utils/ui/uiConstants';

type Intent = 'initial' | 'update';

interface LyfataLoginModalProps {
  intent: Intent;
  errorMessage?: string | null;
  isLoading?: boolean;
  onLogin: (apiKey: string) => void;
  loginLabel?: string;
  hasSavedSession?: boolean;
  onSyncSaved?: () => void;
  onClearCache?: () => void;
  onImportCsv?: () => void;
  onBack?: () => void;
  onClose?: () => void;
}

export const LyfataLoginModal: React.FC<LyfataLoginModalProps> = ({
  intent,
  errorMessage,
  isLoading = false,
  onLogin,
  loginLabel = 'Continue with Lyfta',
  hasSavedSession = false,
  onSyncSaved,
  onClearCache,
  onImportCsv,
  onBack,
  onClose,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showLoginHelp, setShowLoginHelp] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full px-2 sm:px-3 py-8 flex items-center justify-center">
        <div className="max-w-xl mx-auto">
          <div className="relative bg-black/60 border border-slate-700/50 rounded-2xl p-5 sm:p-6 slide-in-from-top-2 overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full blur-3xl bg-purple-500/10" />
              <div className="absolute -bottom-28 -left-28 w-72 h-72 rounded-full blur-3xl bg-blue-500/10" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20" />
            </div>

            <div className="relative flex items-start justify-between gap-3">
              <div className="w-[72px]">
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className={UNIFORM_HEADER_ICON_BUTTON_CLASS}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : null}
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-white inline-flex items-center justify-center gap-2">
                  <Key className="w-5 h-5 text-slate-200" />
                  <span>Login with Lyfta</span>
                </h2>
                <p className="mt-1 text-sm text-slate-300">Enter your Lyfta API key to auto-sync your workouts.</p>
              </div>

              <div className="w-[72px] flex justify-end">
                {intent === 'update' && onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className={UNIFORM_HEADER_BUTTON_CLASS}
                  >
                    Close
                  </button>
                ) : null}
              </div>
            </div>

            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                onLogin(apiKey.trim());
              }}
            >
              {hasSavedSession && onSyncSaved ? (
                <button
                  type="button"
                  onClick={onSyncSaved}
                  disabled={isLoading}
                  className={`${UNIFORM_HEADER_BUTTON_CLASS} w-full h-10 text-sm font-semibold disabled:opacity-60 gap-2`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{isLoading ? 'Syncing…' : 'Sync your data'}</span>
                </button>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-slate-200">Lyfta API Key</label>
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isLoading}
                  className="mt-1 w-full h-10 rounded-md bg-black/50 border border-slate-700/60 px-3 text-sm text-slate-100 outline-none focus:border-purple-500/60"
                  placeholder="Enter your Lyfta API key"
                  autoComplete="off"
                  required
                />
              </div>

              {errorMessage ? (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className={`${UNIFORM_HEADER_BUTTON_CLASS} w-full h-10 text-sm font-semibold disabled:opacity-60 gap-2 justify-center`}
              >
                <span className="truncate">{isLoading ? 'Validating…' : loginLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div className="flex">
                    {onClearCache ? (
                      <button
                        type="button"
                        onClick={onClearCache}
                        disabled={isLoading}
                        className={`${UNIFORM_HEADER_BUTTON_CLASS} h-10 px-2.5 w-full text-[12px] font-semibold disabled:opacity-60 gap-2 justify-center`}
                        title="Clear cache"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Clear cache</span>
                        <span className="sm:hidden">Clear</span>
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLoginHelp((v) => !v)}
                    className={`${UNIFORM_HEADER_BUTTON_CLASS} h-10 px-2 w-full text-[11px] font-semibold gap-1.5 justify-center`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span className="whitespace-nowrap">How to get key</span>
                  </button>

                  {onImportCsv ? (
                    <button
                      type="button"
                      onClick={onImportCsv}
                      disabled={isLoading}
                      className={`${UNIFORM_HEADER_BUTTON_CLASS} h-10 px-2.5 w-full text-[12px] font-semibold disabled:opacity-60 gap-2 justify-center`}
                      title="Import .csv instead"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="flex flex-col items-center leading-[1.05]">
                        <span>Import</span>
                        <span className="text-slate-300 text-[10px]">.csv</span>
                      </span>
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            </form>

            <div className="mt-4 text-[11px] text-slate-400">
              Your API key is sent only to the backend for syncing. It is stored locally and never shared.
            </div>

            {showLoginHelp ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-2"
              >
                <p className="text-xs text-purple-100 font-semibold">How to get your Lyfta API key:</p>
                <ol className="text-xs text-purple-100/80 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://www.lyfta.app/" target="_blank" rel="noopener noreferrer" className="font-semibold text-purple-300 hover:text-purple-200 underline">Website</a></li>
                  <li>Sign in to your Lyfta account</li>
                  <li>Community → API access → Generate API Key </li>
                  <li>Copy your API key and paste it above</li>
                </ol>
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
