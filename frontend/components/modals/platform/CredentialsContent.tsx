import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import { UNIFORM_HEADER_BUTTON_CLASS } from '../../../utils/ui/uiConstants';
import {
  getHevyPassword,
  getHevyUsernameOrEmail,
  saveHevyUsernameOrEmail,
} from '../../../utils/storage/hevyCredentialsStorage';
import {
  getHevyAuthToken,
  getHevyAuthExpiresAt,
  getHevyRefreshToken,
} from '../../../utils/storage/dataSourceStorage';
import { hevyBackendWarmupSession } from '../../../utils/api/hevyBackend';

interface CredentialsContentProps {
  onLogin: (emailOrUsername: string, password: string) => void;
  errorMessage?: string | null;
  isLoading?: boolean;
}

export function CredentialsContent({
  onLogin,
  errorMessage,
  isLoading = false,
}: CredentialsContentProps): React.ReactElement {
  const { mode } = useTheme();
  const isLight = mode === 'light';

  const [emailOrUsername, setEmailOrUsername] = useState(
    () => getHevyUsernameOrEmail() || '',
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [touchedUser, setTouchedUser] = useState(false);
  const [touchedPass, setTouchedPass] = useState(false);

  const passwordTouchedRef = useRef(false);
  const warmupTriggeredRef = useRef(false);
  const passwordHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const inputBg = isLight
    ? 'bg-slate-300 border-slate-300 focus:border-emerald-500/60'
    : 'bg-slate-950 border-slate-800 focus:border-emerald-500/60';
  const inputText = isLight ? 'text-slate-800' : 'text-slate-200';
  const placeholderColor = isLight ? 'placeholder:text-slate-400' : 'placeholder:text-slate-500';
  const labelText = isLight ? 'text-slate-700' : 'text-slate-200';
  const errorBorder = 'border-rose-500/60';

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds > 0]);

  useEffect(() => {
    if (!errorMessage || isLoading) return;

    const msg = errorMessage.toLowerCase();
    const isRateLimited =
      msg.includes('rate') || msg.includes('429') || msg.includes('too many');
    const isAuthError =
      msg.includes('invalid') ||
      msg.includes('wrong') ||
      msg.includes('password');

    if (isRateLimited) {
      setCooldownSeconds(120);
      setFailedAttempts(0);
    } else if (isAuthError) {
      setFailedAttempts((prev) => {
        const newCount = prev + 1;
        if (newCount >= 3) {
          setCooldownSeconds(120);
          return 0;
        }
        return newCount;
      });
    }
  }, [errorMessage, isLoading]);

  useEffect(() => {
    const stored = getHevyPassword();
    if (passwordTouchedRef.current) return;
    if (stored) setPassword(stored);
  }, []);

  useEffect(() => {
    return () => {
      if (passwordHideTimerRef.current)
        clearTimeout(passwordHideTimerRef.current);
    };
  }, []);

  const isCooldownActive = cooldownSeconds > 0;

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
    if (passwordHideTimerRef.current)
      clearTimeout(passwordHideTimerRef.current);
    if (!showPassword) {
      passwordHideTimerRef.current = setTimeout(() => {
        setShowPassword(false);
      }, 5000);
    }
  };

  const hasValidToken = () => {
    const authToken = getHevyAuthToken();
    const refreshToken = getHevyRefreshToken();
    const expiresAt = getHevyAuthExpiresAt();
    if (!authToken || !refreshToken) return false;
    if (!expiresAt) return true;
    const expires = Date.parse(expiresAt);
    if (!Number.isFinite(expires)) return true;
    return expires > Date.now() + 60_000;
  };

  const maybeWarmup = () => {
    if (warmupTriggeredRef.current) return;
    if (hasValidToken()) return;
    // NOTE: intentionally warms even when a refresh token is saved for this
    // account. The saved token may be dead (server-side rotation), in which
    // case login falls through to a cold captcha browser and times out.
    // The warmup endpoint is rate-limit-exempt and cheap.
    warmupTriggeredRef.current = true;
    void hevyBackendWarmupSession(emailOrUsername.trim() || ' warmup');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password) {
      setTouchedUser(true);
      setTouchedPass(true);
      return;
    }
    const trimmed = emailOrUsername.trim();
    saveHevyUsernameOrEmail(trimmed);
    onLogin(trimmed, password);
  };

  const isDisabled = isLoading || isCooldownActive;

  const buttonLabel = isLoading
    ? 'Continue…'
    : isCooldownActive
      ? cooldownSeconds > 0
        ? `Wait ${cooldownSeconds}s`
        : 'Continue'
      : 'Continue';

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div>
        <label className={`block text-xs font-semibold ${labelText}`}>
          Hevy username or email
        </label>
        <input
          name="username"
          value={emailOrUsername}
          onFocus={() => maybeWarmup()}
          onChange={(e) => {
            setEmailOrUsername(e.target.value);
            if (touchedUser && e.target.value.trim()) setTouchedUser(false);
          }}
          disabled={isLoading}
          className={`mt-1 w-full h-10 rounded-md border px-3 text-sm ${inputBg} ${inputText} ${placeholderColor} focus:placeholder:text-transparent outline-none ${
            touchedUser && !emailOrUsername.trim() ? errorBorder : ''
          }`}
          placeholder="Use your Hevy username or email"
          autoComplete="username"
        />
        {touchedUser && !emailOrUsername.trim() && (
          <p className="mt-1 text-xs text-rose-400">
            Enter your Hevy username or email.
          </p>
        )}
      </div>

      <div>
        <label className={`block text-xs font-semibold ${labelText}`}>
          Password
        </label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onFocus={() => maybeWarmup()}
            onChange={(e) => {
              passwordTouchedRef.current = true;
              setPassword(e.target.value);
              if (touchedPass && e.target.value) setTouchedPass(false);
            }}
          disabled={isLoading}
          className={`mt-1 w-full h-10 rounded-md border px-3 pr-10 text-sm ${inputBg} ${inputText} ${placeholderColor} focus:placeholder:text-transparent outline-none ${
            touchedPass && !password ? errorBorder : ''
          }`}
          placeholder="Password"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className={`absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer ${
              isLight
                ? 'text-slate-500 hover:text-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {touchedPass && !password && (
          <p className="mt-1 text-xs text-rose-400">
            Enter your Hevy password.
          </p>
        )}
      </div>

      {isCooldownActive ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 text-center">
          {cooldownSeconds > 0
            ? `Too many login attempts. Please wait ${cooldownSeconds}s before trying again.`
            : 'Retry now!'}
        </div>
      ) : errorMessage ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isDisabled}
        className={`${UNIFORM_HEADER_BUTTON_CLASS} w-full h-10 text-sm font-semibold disabled:opacity-60 gap-1.5 justify-center`}
      >
        <span>{buttonLabel}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}

export default CredentialsContent;
