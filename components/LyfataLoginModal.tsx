import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, HelpCircle, LogIn, RefreshCw, Trash2, Upload } from 'lucide-react';
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
                  <LogIn className="w-5 h-5 text-slate-200" />
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
                <label htmlFor="api-key" className="block text-sm font-semibold text-white mb-2">
                  API Key
                </label>
                <input
                  id="api-key"
                  type="password"
                  placeholder="Enter your Lyfta API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-black/40 border border-slate-600/50 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Your API key is sent only to your own backend. Never shared.
                </p>
              </div>

              {errorMessage ? (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-md"
                >
                  <p className="text-sm text-rose-300 font-medium">{errorMessage}</p>
                </motion.div>
              ) : null}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !apiKey.trim()}
                  className={`${UNIFORM_HEADER_BUTTON_CLASS} flex-1 h-10 text-sm font-semibold disabled:opacity-60 gap-2`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validating…</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>{loginLabel}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2 pt-2">
                {onImportCsv ? (
                  <button
                    type="button"
                    onClick={onImportCsv}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import CSV instead</span>
                  </button>
                ) : null}
                {onClearCache ? (
                  <button
                    type="button"
                    onClick={onClearCache}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-black/40 hover:bg-black/60 border border-slate-700/50 text-slate-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear cache</span>
                  </button>
                ) : null}
              </div>

              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowLoginHelp((v) => !v)}
                  className="w-full text-center text-sm font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4 flex items-center justify-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  {showLoginHelp ? 'Hide: How to get your API key' : 'Show: How to get your API key'}
                </button>

                {showLoginHelp ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3 space-y-2"
                  >
                    <p className="text-xs text-blue-100 font-semibold">How to get your Lyfta API key:</p>
                    <ol className="text-xs text-blue-100/80 space-y-1 list-decimal list-inside">
                      <li>Go to <span className="font-semibold">my.lyfta.app</span></li>
                      <li>Sign in to your Lyfta account</li>
                      <li>Navigate to Settings or Account</li>
                      <li>Find the API key section</li>
                      <li>Copy your API key and paste it above</li>
                    </ol>
                  </motion.div>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
