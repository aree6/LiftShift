import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, HelpCircle, Key, LogIn, RefreshCw, Trash2, Upload } from 'lucide-react';
import { UNIFORM_HEADER_BUTTON_CLASS, UNIFORM_HEADER_ICON_BUTTON_CLASS } from '../utils/ui/uiConstants';
import { OnboardingModalShell } from './OnboardingModalShell';
import {
  getHevyPassword,
  getHevyUsernameOrEmail,
  saveHevyUsernameOrEmail,
} from '../utils/storage/hevyCredentialsStorage';
import { getHevyProApiKey } from '../utils/storage/dataSourceStorage';

type Intent = 'initial' | 'update';

interface HevyLoginModalProps {
  intent: Intent;
  initialMode?: 'credentials' | 'apiKey';
  errorMessage?: string | null;
  isLoading?: boolean;
  onLogin: (emailOrUsername: string, password: string) => void;
  onLoginWithApiKey: (apiKey: string) => void;
  loginLabel?: string;
  apiKeyLoginLabel?: string;
  hasSavedSession?: boolean;
  onSyncSaved?: () => void;
  onClearCache?: () => void;
  onImportCsv?: () => void;
  onBack?: () => void;
  onClose?: () => void;
}

export const HevyLoginModal: React.FC<HevyLoginModalProps> = ({
  intent,
  initialMode = 'credentials',
  errorMessage,
  isLoading = false,
  onLogin,
  onLoginWithApiKey,
  loginLabel = 'Login with Hevy',
  apiKeyLoginLabel = 'Continue with API key',
  hasSavedSession = false,
  onSyncSaved,
  onClearCache,
  onImportCsv,
  onBack,
  onClose,
}) => {
  const [loginMode, setLoginMode] = useState<'credentials' | 'apiKey'>(initialMode);
  const [emailOrUsername, setEmailOrUsername] = useState(() => getHevyUsernameOrEmail() || '');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState(() => getHevyProApiKey() || '');
  const [showLoginHelp, setShowLoginHelp] = useState(false);
  const passwordTouchedRef = useRef(false);

  // When in API key mode, back should return to credentials view, not unit/gender screen
  const handleBack = () => {
    if (loginMode === 'apiKey') {
      setLoginMode('credentials');
    } else if (onBack) {
      onBack();
    }
  };

  useEffect(() => {
    let cancelled = false;
    getHevyPassword()
      .then((p) => {
        if (cancelled) return;
        if (passwordTouchedRef.current) return;
        if (p) setPassword(p);
      })
      .catch(() => {
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <OnboardingModalShell
      header={
        <div className="flex items-start justify-between gap-3">
          <div className="w-[72px]">
            {(onBack || loginMode === 'apiKey') ? (
              <button
                type="button"
                onClick={handleBack}
                className={UNIFORM_HEADER_ICON_BUTTON_CLASS}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : null}
          </div>

              <div className="text-center mt-12">
                <h2 className="text-2xl font-bold text-white inline-flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5 text-slate-200" />
              <span>{loginMode === 'apiKey' ? 'Login with API key' : 'Login with Hevy'}</span>
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {loginMode === 'apiKey' ? 'Enter your Hevy Pro API key to sync your workouts.' : 'Login with Hevy directly to auto-sync your workouts.'}
            </p>
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
      }
    >
      <form
        className="pt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (loginMode === 'apiKey') {
            onLoginWithApiKey(apiKey.trim());
            return;
          }
          const trimmed = emailOrUsername.trim();
          saveHevyUsernameOrEmail(trimmed);
          onLogin(trimmed, password);
        }}
      >
              {hasSavedSession && onSyncSaved && loginMode === 'credentials' ? (
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

              {loginMode === 'apiKey' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-200">Hevy Pro API key</label>
                  <input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={isLoading}
                    className="mt-1 w-full h-10 rounded-md bg-black/50 border border-slate-700/60 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500/60"
                    placeholder="Enter your Hevy API key"
                    autoComplete="off"
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-200">Hevy username or email</label>
                    <input
                      name="username"
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
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        passwordTouchedRef.current = true;
                        setPassword(e.target.value);
                      }}
                      disabled={isLoading}
                      className="mt-1 w-full h-10 rounded-md bg-black/50 border border-slate-700/60 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500/60"
                      placeholder="Password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </>
              )}

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
                <span className="truncate">
                  {isLoading ? (loginMode === 'apiKey' ? 'Logging in…' : 'Logging in…') : 'Login'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 ">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center mt-10">
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

                  <button
                    type="button"
                    onClick={() => setLoginMode((m) => (m === 'apiKey' ? 'credentials' : 'apiKey'))}
                    disabled={isLoading}
                    className={`${UNIFORM_HEADER_BUTTON_CLASS} h-10 px-2.5 w-full text-[12px] font-semibold disabled:opacity-60 gap-2 justify-center ${
                      loginMode === 'apiKey' ? 'border-emerald-500/60' : ''
                    }`}
                    title={loginMode === 'apiKey' ? 'Use email + password instead' : 'Use API key instead'}
                  >
                    {loginMode === 'apiKey' ? <LogIn className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                    <span className="whitespace-nowrap">{loginMode === 'apiKey' ? 'Login' : 'API key'}</span>
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

      {showLoginHelp ? (
        <div className="mt-4 space-y-3">
          {loginMode === 'credentials' ? (
            <>
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
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-2"
            >
              <p className="text-xs text-emerald-100 font-semibold">API key login</p>
              <div className="text-xs text-emerald-100/80 space-y-2">
                <div>
                  Enter your Hevy <span className="font-semibold">Pro API key</span> to sync without entering your password.
                </div>
                <div>
                  You can get it from https://hevy.com/settings?developer (Pro only).
                </div>
              </div>
            </motion.div>
          )}
        </div>
      ) : null}
    </OnboardingModalShell>
  );
};
