import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

type Intent = 'initial' | 'update';

interface HevyLoginModalProps {
  intent: Intent;
  errorMessage?: string | null;
  isLoading?: boolean;
  onLogin: (emailOrUsername: string, password: string) => void;
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
  onClearCache,
  onImportCsv,
  onBack,
  onClose,
}) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginHelp, setShowLoginHelp] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full px-2 sm:px-3 pt-10 pb-6 sm:pt-12 sm:pb-6">
        <div className="max-w-xl mx-auto">
          <div className="bg-black/60 border border-slate-700/50 rounded-2xl p-5 sm:p-6 slide-in-from-top-2">
            <div className="flex items-start justify-between gap-3">
              <div className="w-[72px]">
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md text-xs font-semibold bg-black/60 hover:bg-black/70 border border-slate-700/50 text-slate-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : null}
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Login with Hevy</h2>
                <p className="mt-1 text-sm text-slate-300">Login with Hevy directly to auto-sync your workouts.</p>
              </div>

              <div className="w-[72px] flex justify-end">
                {intent === 'update' && onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center h-9 px-3 rounded-md text-xs font-semibold bg-black/60 hover:bg-black/70 border border-slate-700/50 text-slate-200"
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
                className="w-full h-10 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                {isLoading ? 'Logging in…' : 'Login with Hevy'}
              </button>

              {onImportCsv ? (
                <button
                  type="button"
                  onClick={onImportCsv}
                  disabled={isLoading}
                  className="w-full h-10 rounded-md bg-black/40 hover:bg-black/50 border border-rose-500/20 text-slate-200 text-sm font-semibold disabled:opacity-60"
                >
                  Import <span className="text-slate-300">.CSV</span> instead
                </button>
              ) : null}

              {onClearCache ? (
                <button
                  type="button"
                  onClick={onClearCache}
                  disabled={isLoading}
                  className="w-full h-10 rounded-md bg-black/60 hover:bg-black/70 border border-slate-700/50 text-slate-200 text-sm font-semibold disabled:opacity-60"
                >
                  Clear cache
                </button>
              ) : null}
            </form>

            <div className="mt-4 text-[11px] text-slate-400">
              You’re logging in via Hevy. Hevy receives your credentials — LiftShift does not store them.
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
