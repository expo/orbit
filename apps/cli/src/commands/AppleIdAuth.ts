import { signInAsync, signOutAsync, submitTwoFactorCodeAsync } from 'ipa-resign';

const PASSWORD_ENV = 'EXPO_ORBIT_APPLE_PASSWORD';

type AppleIdAuthOptions = {
  mode: 'sign-in' | 'verify-2fa' | 'sign-out';
  appleId: string;
  code?: string;
};

export async function appleIdAuthAsync(options: AppleIdAuthOptions) {
  if (options.mode === 'sign-out') {
    await signOutAsync(options.appleId);
    return { ok: true };
  }

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
      appleId: options.appleId,
      password,
      code: options.code,
    });
    return { ok: true };
  }

  await signInAsync({ appleId: options.appleId, password });
  return { ok: true };
}
