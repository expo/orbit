import {
  configureRetryPolicy,
  getSignedInAppleIdAsync,
  signInAsync,
  signOutAsync,
  submitTwoFactorCodeAsync,
} from 'ipa-resign';

const PASSWORD_ENV = 'EXPO_ORBIT_APPLE_PASSWORD';

// ipa-resign already retries Apple's edge 503s with backoff (~15-30s). That wait
// is silent otherwise, so stream each retry as a `retry: <json>` line the menu
// bar parses (see src/utils/appleRetry.ts) to show a live "retrying" notice.
function streamRetriesToStdout() {
  configureRetryPolicy({
    onRetry: ({ attempt, maxAttempts, delayMs, status }) => {
      console.log(`retry: ${JSON.stringify({ attempt, maxAttempts, delayMs, status })}`);
    },
  });
}

type AppleIdAuthOptions = {
  mode: 'sign-in' | 'verify-2fa' | 'sign-out' | 'status';
  /** Required for every mode except `status`. */
  appleId?: string;
  code?: string;
  preferSms?: boolean;
};

export async function appleIdAuthAsync(options: AppleIdAuthOptions) {
  if (options.mode === 'status') {
    // Who holds a persisted session — lets the menu bar adopt an existing login
    // instead of prompting (fresh install, other app flavour, CLI sign-in).
    return { appleId: await getSignedInAppleIdAsync() };
  }

  const appleId = options.appleId;
  if (!appleId) {
    throw new Error(`--apple-id is required for --mode ${options.mode}`);
  }

  if (options.mode === 'sign-out') {
    await signOutAsync(appleId);
    return { ok: true };
  }

  streamRetriesToStdout();

  const password = process.env[PASSWORD_ENV];
  if (!password) {
    throw new Error(
      `Password missing — set ${PASSWORD_ENV} env var when invoking the CLI (the menu-bar pipes it through spawnCliAsync.envVars).`
    );
  }

  if (options.mode === 'verify-2fa') {
    if (!options.code) {
      throw new Error('--code is required for verify-2fa');
    }
    await submitTwoFactorCodeAsync({
      appleId,
      password,
      code: options.code,
      preferSms: options.preferSms,
    });
    return { ok: true };
  }

  await signInAsync({ appleId, password, preferSms: options.preferSms });
  return { ok: true };
}
