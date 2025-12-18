import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, HelpCircle, LogIn, RefreshCw, Trash2, Upload } from 'lucide-react';
import { UNIFORM_HEADER_BUTTON_CLASS, UNIFORM_HEADER_ICON_BUTTON_CLASS } from '../utils/ui/uiConstants';

type Intent = 'initial' | 'update';

interface HevyLoginModalProps {
  intent: Intent;
  errorMessage?: string | null;
  isLoading?: boolean;
  onLogin: (emailOrUsername: string, password: string) => void;
  loginLabel?: string;
  hasSavedSession?: boolean;
  onSyncSaved?: () => void;
  onClearCache?: () => void;
  onImportCsv?: () => void;
  onBack?: () => void;
  onClose?: () => void;
}

export const HevyLoginModal: React.FC<HevyLoginModalProps> = ({
  intent,
  errorMessage,
  isLoading = false,
  onLogin,
  loginLabel = 'Login with Hevy',
  hasSavedSession = false,
  onSyncSaved,
  onClearCache,
  onImportCsv,
  onBack,
  onClose,
}) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginHelp, setShowLoginHelp] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full px-2 sm:px-3 pt-10 pb-6 sm:pt-12 sm:pb-6">
        <div className="max-w-xl mx-auto">
          <div className="relative bg-black/60 border border-slate-700/50 rounded-2xl p-5 sm:p-6 slide-in-from-top-2 overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full blur-3xl bg-emerald-500/10" />
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
                  <span>Login with Hevy</span>
                </h2>
                <p className="mt-1 text-sm text-slate-300">Login with Hevy directly to auto-sync your workouts.</p>
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
                ) : (
                  <div className="relative w-10 h-10 rounded-2xl bg-black/20 border border-slate-700/50 flex items-center justify-center">
                    <img src="/hevy.png" alt="Hevy" className="w-8 h-8 object-contain" loading="lazy" decoding="async" />
                  </div>
                )}
              </div>
            </div>

            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                onLogin(emailOrUsername.trim(), password);
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
                <label className="block text-xs font-semibold text-slate-200">Hevy username or email</label>
                <input
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  disabled={isLoading}
                  className="mt-1 w-full h-10 rounded-md bg-black/50 border border-slate-700/60 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500/60"
                  placeholder="Use your Hevy username or email"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="mt-1 w-full h-10 rounded-md bg-black/50 border border-slate-700/60 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500/60"
                  placeholder="Password"
                  autoComplete="current-password"
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
                <span className="truncate">{isLoading ? 'Logging in…' : loginLabel}</span>
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
                    <span className="whitespace-nowrap">How to login</span>
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
              You’re logging in via Hevy. Hevy receives your credentials — LiftShift does not store them.
            </div>

            {showLoginHelp ? (
              <div className="mt-4 space-y-3">
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
  );
};
