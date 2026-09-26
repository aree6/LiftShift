import { WorkoutSet } from '../../types';
import {
  hevyBackendGetAccount,
  hevyBackendGetSets,
  hevyBackendGetSetsWithProApiKey,
  hevyBackendLogin,
  hevyBackendRefresh,
  isLoginInFlight,
} from '../../utils/api/hevyBackend';
import { identifyPersonalRecords } from '../../utils/analysis/core';
import {
  clearHevyRefreshToken,
  getHevyRefreshToken,
  saveHevyAuthToken,
  saveHevyAuthExpiresAt,
  saveHevyRefreshToken,
  saveLastLoginMethod,
  saveSetupComplete,
} from '../../utils/storage/dataSourceStorage';
import {
  getHevyPassword,
  getHevyUsernameOrEmail,
  saveHevyPassword,
  saveHevyUsernameOrEmail,
} from '../../utils/storage/hevyCredentialsStorage';
import { hydrateBackendWorkoutSetsWithSource } from '../auth/hydrateBackendWorkoutSets';
import { reportHistoryTruncation } from '../state/historyTruncation';
import { getHevyErrorMessage } from '../ui/appErrorMessages';
import { trackEvent } from '../../utils/integrations/analytics';
import type { StartupAutoLoadParams } from './startupAutoLoadTypes';


interface TokenTrackConfig {
  successMethod: string;
  errorMethod: string;
}

interface StartupLoadBehavior {
  resetOnError?: boolean;
}

export const loadHevyFromProKey = (
  deps: StartupAutoLoadParams,
  apiKey: string,
  behavior: StartupLoadBehavior = {}
): void => {
  const shouldResetOnError = behavior.resetOnError !== false;
  deps.setLoadingKind('hevy');
  deps.setIsAnalyzing(true);
  const startedAt = deps.startProgress();

  hevyBackendGetSetsWithProApiKey<WorkoutSet>(apiKey)
    .then((resp) => {
      reportHistoryTruncation(resp.meta);
      const sets = resp.sets ?? [];

      // Instant processing
      const hydrated = hydrateBackendWorkoutSetsWithSource(sets, 'hevy');
      if (hydrated.length === 0 || hydrated.every((s) => !s.parsedDate)) {
        if (shouldResetOnError) {
          saveSetupComplete(false);
          deps.setHevyLoginError('Hevy data could not be parsed. Please try syncing again.');
          deps.setOnboarding({ intent: 'initial', step: 'platform' });
        }
        return;
      }

      const enriched = identifyPersonalRecords(hydrated);
      deps.setParsedData(enriched);
      deps.setHevyLoginError(null);
      deps.setCsvImportError(null);
    })
    .catch((err) => {
      if (shouldResetOnError) {
        saveSetupComplete(false);
        deps.setHevyLoginError(getHevyErrorMessage(err));
        deps.setOnboarding({ intent: 'initial', step: 'platform' });
      }
    })
    .finally(() => {
      deps.finishProgress(startedAt);
    });
};

export const loadHevyFromToken = (
  deps: StartupAutoLoadParams,
  token: string,
  trackConfig?: TokenTrackConfig,
  behavior: StartupLoadBehavior = {}
): void => {
  const shouldResetOnError = behavior.resetOnError !== false;
  const savedRefreshToken = getHevyRefreshToken();
  deps.setLoadingKind('hevy');
  deps.setIsAnalyzing(true);
  const startedAt = deps.startProgress();

  const fetchSetsWithToken = (accessToken: string) =>
    hevyBackendGetAccount(accessToken)
      .then(({ username }) => hevyBackendGetSets<WorkoutSet>(accessToken, username));

  const applySetsResponse = (resp: { sets?: WorkoutSet[]; meta?: { workouts?: number; truncated?: boolean } }): void => {
    if (trackConfig) {
      trackEvent('hevy_sync_success', { method: trackConfig.successMethod, workouts: resp.meta?.workouts });
    }
    reportHistoryTruncation(resp.meta);
    const sets = resp.sets ?? [];

    const hydrated = hydrateBackendWorkoutSetsWithSource(sets, 'hevy');
    if (hydrated.length === 0 || hydrated.every((s) => !s.parsedDate)) {
      if (shouldResetOnError) {
        saveSetupComplete(false);
        deps.setHevyLoginError('Hevy data could not be parsed. Please try syncing again.');
        deps.setOnboarding({ intent: 'initial', step: 'platform' });
      }
      return;
    }

    const enriched = identifyPersonalRecords(hydrated);
    deps.setParsedData(enriched);
    deps.setHevyLoginError(null);
    deps.setCsvImportError(null);
  };

  const attemptCredentialFallback = () => {
    const username = getHevyUsernameOrEmail();
    const password = getHevyPassword();
    if (!username || !password) return Promise.reject(new Error('Missing saved credentials'));
    return loadHevyFromCredentials(deps, username, password, { resetOnError: shouldResetOnError }).then((success) => {
      if (!success) throw new Error('Credential login failed');
    });
  };

  const attemptRefreshFallback = () => {
    const username = getHevyUsernameOrEmail();
    if (!savedRefreshToken) return Promise.reject(new Error('Missing saved refresh token'));
    return hevyBackendRefresh(token, savedRefreshToken, username)
      .then((r) => {
        if (!r.auth_token) throw new Error('Missing auth token');
        saveHevyAuthToken(r.auth_token);
        saveHevyAuthExpiresAt(r.expires_at ?? null);
        if (r.refresh_token) saveHevyRefreshToken(r.refresh_token);
        return fetchSetsWithToken(r.auth_token);
      });
  };

  const initialPromise = fetchSetsWithToken(token);

  initialPromise
    .then((resp) => {
      applySetsResponse(resp);
    })
    .catch((err) => {
      if (trackConfig) {
        trackEvent('hevy_sync_error', { method: trackConfig.errorMethod });
      }
      const status = (err as any)?.statusCode;
      // B3: retry ONLY on 401 — see appAuthHevy.ts. Status-less network
      // failures must not trigger refresh→credential fallback.
      if (status !== 401) {
        if (shouldResetOnError) {
          saveSetupComplete(false);
          deps.setHevyLoginError(getHevyErrorMessage(err));
          deps.setOnboarding({ intent: 'initial', step: 'platform' });
        }
        return undefined;
      }
      return attemptRefreshFallback()
        .catch(() => attemptCredentialFallback())
        .catch(() => {
          if (shouldResetOnError) {
            saveSetupComplete(false);
            deps.setHevyLoginError(getHevyErrorMessage(err));
            deps.setOnboarding({ intent: 'initial', step: 'platform' });
          }
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

export const loadHevyFromCredentials = async (
  deps: StartupAutoLoadParams,
  username: string,
  password: string,
  behavior: StartupLoadBehavior = {}
): Promise<boolean> => {
  const shouldResetOnError = behavior.resetOnError !== false;
  // Validate password before attempting login
  if (!password || password.trim().length === 0) {
    return false;
  }

  // B2: a /login for this account is already running in another tab, or this
  // is a reload during a slow login — firing a second /login only burns the
  // 5/min login bucket (backend/src/index.ts createRouteLimiter). Return
  // false so the caller follows its existing failure path, request-free.
  if (isLoginInFlight(username)) {
    return false;
  }

  deps.setLoadingKind('hevy');
  deps.setIsAnalyzing(true);
  const startedAt = deps.startProgress();

  try {
    const loginResp = await hevyBackendLogin(username, password);

    if (!loginResp.auth_token) {
      throw new Error('Missing auth token');
    }

    saveHevyAuthToken(loginResp.auth_token);
    saveHevyAuthExpiresAt(loginResp.expires_at ?? null);
    if (loginResp.refresh_token) saveHevyRefreshToken(loginResp.refresh_token);
    else clearHevyRefreshToken();
    saveHevyUsernameOrEmail(username);
    saveHevyPassword(password);
    saveLastLoginMethod('hevy', 'credentials', username);

    const { username: accountUsername } = await hevyBackendGetAccount(loginResp.auth_token);
    const resp = await hevyBackendGetSets<WorkoutSet>(loginResp.auth_token, accountUsername);

    trackEvent('hevy_sync_success', { method: 'auto_credentials_reload', workouts: resp.meta?.workouts });
    reportHistoryTruncation(resp.meta);

    const sets = resp.sets ?? [];
    const hydrated = hydrateBackendWorkoutSetsWithSource(sets, 'hevy');

    if (hydrated.length === 0 || hydrated.every((s) => !s.parsedDate)) {
      if (shouldResetOnError) {
        saveSetupComplete(false);
        deps.setHevyLoginError('Hevy data could not be parsed. Please try syncing again.');
        deps.setOnboarding({ intent: 'initial', step: 'platform' });
      }
      deps.finishProgress(startedAt);
      return false;
    }

    const enriched = identifyPersonalRecords(hydrated);
    deps.setParsedData(enriched);
    deps.setHevyLoginError(null);
    deps.setCsvImportError(null);
    deps.finishProgress(startedAt);
    return true;
  } catch (err) {
    trackEvent('hevy_sync_error', { method: 'auto_credentials_reload' });
    if (shouldResetOnError) {
      saveSetupComplete(false);
      deps.setHevyLoginError(getHevyErrorMessage(err));
      deps.setOnboarding({ intent: 'initial', step: 'platform' });
    }
    deps.finishProgress(startedAt);
    return false;
  }
};
