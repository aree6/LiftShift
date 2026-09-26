import { WorkoutSet } from '../../types';
import {
  getHevyAuthToken,
  getHevyRefreshToken,
  saveHevyAuthToken,
  saveHevyAuthExpiresAt,
  getHevyAuthExpiresAt,
  saveHevyRefreshToken,
  clearHevyRefreshToken,
  clearHevyAuthToken,
  saveLastLoginMethod,
  addCombinedDataSource,
  saveSetupComplete,
} from '../../utils/storage/dataSourceStorage';
import {
  getHevyProApiKey,
  saveHevyProApiKey,
  getHevyPassword,
  getHevyUsernameOrEmail,
  saveHevyPassword,
  saveHevyUsernameOrEmail,
} from '../../utils/storage/hevyCredentialsStorage';
import {
  hevyBackendGetAccount,
  hevyBackendGetSets,
  hevyBackendGetSetsWithProApiKey,
  hevyBackendLogin,
  hevyBackendRefresh,
  hevyBackendValidateProApiKey,
  isLoginInFlight,
} from '../../utils/api/hevyBackend';
import { identifyPersonalRecords } from '../../utils/analysis/core';
import { hydrateBackendWorkoutSetsWithSource } from '../../app/auth/hydrateBackendWorkoutSets';
import { reportHistoryTruncation } from '../../app/state/historyTruncation';
import { getHevyErrorMessage } from '../../app/ui';
import { trackEvent, identifyUser } from '../../utils/integrations/analytics';
import type { AppAuthHandlersDeps } from './appAuthTypes';

// B2: one pending credential login per account per tab. The submit button is
// already disabled while loading and handleHevyLogin checks isAnalyzing, but
// both need a re-render — this closes the synchronous double-submit gap with
// zero UI change (cross-tab/reload is covered by the localStorage marker in
// hevyBackend.ts).
const pendingCredentialLogins = new Set<string>();

const normalizeAccount = (value: string): string => value.trim().toLowerCase();

export const runHevySyncSaved = (deps: AppAuthHandlersDeps): void => {
  const savedProKey = getHevyProApiKey();
  if (savedProKey) {
    deps.setHevyLoginError(null);
    deps.setLoadingKind('hevy');
    deps.setIsAnalyzing(true);
    const startedAt = deps.startProgress();

    hevyBackendGetSetsWithProApiKey<WorkoutSet>(savedProKey)
    .then((resp) => {
      reportHistoryTruncation(resp.meta);
      const sets = resp.sets ?? [];
      const hydrated = hydrateBackendWorkoutSetsWithSource(sets, 'hevy');
      const enriched = identifyPersonalRecords(hydrated);

      trackEvent('hevy_sync_success', { method: 'credentials', workouts: resp.meta?.workouts });

      deps.setParsedData(enriched);
        saveLastLoginMethod('hevy', 'apiKey', getHevyUsernameOrEmail() ?? undefined);
        deps.setDataSource('hevy');
        addCombinedDataSource('hevy');
        saveSetupComplete(true);
        deps.setOnboarding(null);

        if (resp.username) {
          identifyUser(resp.username, { login_method: 'apiKey', platform: 'hevy', username: resp.username });
        }
      })
      .catch((err) => {
        deps.setHevyLoginError(getHevyErrorMessage(err));
      })
      .finally(() => {
        deps.finishProgress(startedAt);
      });
    return;
  }

  const token = getHevyAuthToken();
  if (!token) return;

  if (deps.isAnalyzing) return;

  deps.setHevyLoginError(null);
  deps.setLoadingKind('hevy');
  deps.setIsAnalyzing(true);
  const startedAt = deps.startProgress();

  const savedUsername = getHevyUsernameOrEmail();
  const savedPassword = getHevyPassword();
  const savedRefreshToken = getHevyRefreshToken();

  // Get username then sets - username is cached so subsequent calls are fast
  const fetchSetsWithToken = (accessToken: string) =>
    hevyBackendGetAccount(accessToken)
      .then(({ username, email }) => hevyBackendGetSets<WorkoutSet>(accessToken, username).then(resp => ({ ...resp, username, email })));

  const isTokenExpired = (): boolean => {
    const expiresAt = getHevyAuthExpiresAt();
    if (!expiresAt) return false; // Assume valid if no expiry set
    const expires = Date.parse(expiresAt);
    if (!Number.isFinite(expires)) return false;
    return expires <= Date.now() + 60_000; // Within 60s of expiry
  };

  const applySetsResponse = (resp: { sets?: WorkoutSet[]; meta?: { workouts?: number; truncated?: boolean }; username?: string; email?: string }, accessToken?: string): void => {
    reportHistoryTruncation(resp.meta);
    const sets = resp.sets ?? [];
    const hydrated = hydrateBackendWorkoutSetsWithSource(sets, 'hevy');
    const enriched = identifyPersonalRecords(hydrated);

    deps.setParsedData(enriched);
    saveLastLoginMethod('hevy', 'credentials', getHevyUsernameOrEmail() ?? undefined);
    deps.setDataSource('hevy');
    addCombinedDataSource('hevy');
    saveSetupComplete(true);
    deps.setOnboarding(null);

    if (resp.username) {
      identifyUser(resp.username, { login_method: 'credentials', platform: 'hevy', username: resp.username, email: resp.email });
    }

    // Fetch account info in background AFTER main data loads (for email list logging)
    // Use cached token from earlier if available, otherwise use provided token
    const token = accessToken || getHevyAuthToken();
    if (token) {
      hevyBackendGetAccount(token).catch(() => {
        // Silent fail - not critical
      });
    }
  };

  const attemptCredentialFallback = () => {
    if (!savedUsername || !savedPassword) return Promise.reject(new Error('Missing saved credentials'));
    // B2: a /login for this account is already running (other tab, or a
    // reload during a slow login) — the login bucket is 5/min per route, so a
    // duplicate only risks a self-inflicted 429. The outer catch surfaces the
    // original error, so no new copy appears.
    if (isLoginInFlight(savedUsername)) return Promise.reject(new Error('Login already in progress'));
    return hevyBackendLogin(savedUsername, savedPassword)
      .then((r) => {
        if (!r.auth_token) throw new Error('Missing auth token');
        saveHevyAuthToken(r.auth_token);
        saveHevyAuthExpiresAt(r.expires_at ?? null);
        if (r.refresh_token) saveHevyRefreshToken(r.refresh_token);
        else clearHevyRefreshToken();
        return fetchSetsWithToken(r.auth_token);
      });
  };

  const attemptRefreshFallback = () => {
    if (!savedRefreshToken) return Promise.reject(new Error('Missing saved refresh token'));
    return hevyBackendRefresh(token, savedRefreshToken, savedUsername)
      .then((r) => {
        if (!r.auth_token) throw new Error('Missing auth token');
        saveHevyAuthToken(r.auth_token);
        saveHevyAuthExpiresAt(r.expires_at ?? null);
        if (r.refresh_token) saveHevyRefreshToken(r.refresh_token);
        return fetchSetsWithToken(r.auth_token);
      });
  };

  const initialPromise = isTokenExpired() && savedRefreshToken
    ? attemptRefreshFallback()
    : fetchSetsWithToken(token);

  initialPromise
    .then((resp) => {
      applySetsResponse(resp);
    })
    .catch((err) => {
      const status = (err as any)?.statusCode;
      // B3: retry ONLY on 401. Status-less network failures (TypeError from
      // fetch, unstamped throws) must surface as errors, not fall through to
      // refresh→credential retry and burn the shared bucket.
      if (status !== 401) {
        deps.setHevyLoginError(getHevyErrorMessage(err));
        return undefined;
      }
      return attemptRefreshFallback()
        .catch(() => attemptCredentialFallback())
        .catch(() => {
          clearHevyAuthToken();
          deps.setHevyLoginError(getHevyErrorMessage(err));
          return undefined;
        });
    })
    .then((resp) => {
      if (!resp) return;
      applySetsResponse(resp);
    })
    .finally(() => {
      deps.finishProgress(startedAt);
    });
};

export const runHevyApiKeyLogin = (deps: AppAuthHandlersDeps, apiKey: string): void => {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    deps.setHevyLoginError('Missing API key.');
    return;
  }

  trackEvent('hevy_sync_start', { method: 'pro_api_key' });

  deps.setHevyLoginError(null);
  deps.setLoadingKind('hevy');
  deps.setIsAnalyzing(true);
  const startedAt = deps.startProgress();

  hevyBackendValidateProApiKey(trimmed)
    .then((valid) => {
      if (!valid) throw new Error('Invalid API key. Please check your Hevy Pro API key and try again.');
      saveHevyProApiKey(trimmed);
      saveLastLoginMethod('hevy', 'apiKey', getHevyUsernameOrEmail() ?? undefined);

      return hevyBackendGetSetsWithProApiKey<WorkoutSet>(trimmed);
    })
    .then((resp) => {
      reportHistoryTruncation(resp.meta);
      const sets = resp.sets ?? [];
      const hydrated = hydrateBackendWorkoutSetsWithSource(sets, 'hevy');
      const enriched = identifyPersonalRecords(hydrated);

      deps.setParsedData(enriched);
      deps.setDataSource('hevy');
      addCombinedDataSource('hevy');
      saveSetupComplete(true);
      deps.setOnboarding(null);

      if (resp.username) {
        identifyUser(resp.username, { login_method: 'apiKey', platform: 'hevy', username: resp.username });
      }
    })
    .catch((err) => {
      trackEvent('hevy_sync_error', { method: 'pro_api_key' });
      deps.setHevyLoginError(getHevyErrorMessage(err));
    })
    .finally(() => {
      deps.finishProgress(startedAt);
    });
};

export const runHevyLogin = (deps: AppAuthHandlersDeps, emailOrUsername: string, password: string): void => {
  // B2: ignore duplicate submits for an account with a login already pending.
  const accountKey = normalizeAccount(emailOrUsername);
  if (pendingCredentialLogins.has(accountKey)) return;
  pendingCredentialLogins.add(accountKey);

  trackEvent('hevy_sync_start', { method: 'credentials' });
  deps.setHevyLoginError(null);
  deps.setLoadingKind('hevy');
  deps.setIsAnalyzing(true);
  const startedAt = deps.startProgress();
  const trimmed = emailOrUsername.trim();
  const savedUsername = getHevyUsernameOrEmail()?.trim().toLowerCase();
  const canReuseRefreshForThisAccount = Boolean(
    savedUsername &&
    savedUsername === trimmed.toLowerCase() &&
    getHevyRefreshToken()
  );

  const authPromise = canReuseRefreshForThisAccount
    ? hevyBackendRefresh(getHevyAuthToken(), getHevyRefreshToken() as string, trimmed)
        .catch(() => hevyBackendLogin(emailOrUsername, password))
    : hevyBackendLogin(emailOrUsername, password);

  authPromise
    .then((r) => {
      if (!r.auth_token) throw new Error('Missing auth token');
      saveHevyAuthToken(r.auth_token);
      saveHevyAuthExpiresAt(r.expires_at ?? null);
      if (r.refresh_token) saveHevyRefreshToken(r.refresh_token);
      else clearHevyRefreshToken();
      saveHevyUsernameOrEmail(trimmed);
      saveLastLoginMethod('hevy', 'credentials', trimmed);
      saveHevyPassword(password);
      return hevyBackendGetAccount(r.auth_token).then(({ username, email }) => ({ token: r.auth_token, username, email }));
    })
    .then(({ token, username, email }) => {
      identifyUser(username, { login_method: 'credentials', platform: 'hevy', username, email });
      return hevyBackendGetSets<WorkoutSet>(token, username);
    })
    .then((resp) => {
      reportHistoryTruncation(resp.meta);
      const sets = resp.sets ?? [];
      const hydrated = hydrateBackendWorkoutSetsWithSource(sets, 'hevy');
      const enriched = identifyPersonalRecords(hydrated);

      deps.setParsedData(enriched);
      deps.setDataSource('hevy');
      addCombinedDataSource('hevy');
      saveSetupComplete(true);
      deps.setOnboarding(null);
      const totalMs = Date.now() - startedAt;
      console.log(`[Frontend] ✅ Hevy login flow complete (${(totalMs / 1000).toFixed(1)}s)`);
    })
    .catch((err) => {
      trackEvent('hevy_sync_error', { method: 'credentials' });
      deps.setHevyLoginError(getHevyErrorMessage(err));
    })
    .finally(() => {
      pendingCredentialLogins.delete(accountKey);
      deps.finishProgress(startedAt);
    });
};
