import MenuBarModule from '../modules/MenuBarModule';
import { AppleRetryInfo, parseRetryLine } from '../utils/appleRetry';
import { parseCliJsonResult } from '../utils/helpers';

const PASSWORD_ENV = 'EXPO_ORBIT_APPLE_PASSWORD';

// The CLI streams `retry: <json>` lines while ipa-resign backs off a throttled
// Apple call. Forward the parsed events; ignore every other output line.
function makeRetryCallback(onRetry?: (info: AppleRetryInfo) => void) {
  if (!onRetry) return undefined;
  return (output: string) => {
    const info = parseRetryLine(output);
    if (info) onRetry(info);
  };
}

export async function appleIdSignInAsync(opts: {
  appleId: string;
  password: string;
  preferSms?: boolean;
  onRetry?: (info: AppleRetryInfo) => void;
}): Promise<void> {
  const args = ['--mode', 'sign-in', '--apple-id', opts.appleId];
  if (opts.preferSms) args.push('--prefer-sms');
  await MenuBarModule.runCli('apple-id-auth', args, makeRetryCallback(opts.onRetry), {
    [PASSWORD_ENV]: opts.password,
  });
}

export async function appleIdVerifyTwoFactorAsync(opts: {
  appleId: string;
  password: string;
  code: string;
  // Must match the preferSms used at sign-in — the 2FA session is channel-bound.
  preferSms?: boolean;
  onRetry?: (info: AppleRetryInfo) => void;
}): Promise<void> {
  const args = ['--mode', 'verify-2fa', '--apple-id', opts.appleId, '--code', opts.code];
  if (opts.preferSms) args.push('--prefer-sms');
  await MenuBarModule.runCli('apple-id-auth', args, makeRetryCallback(opts.onRetry), {
    [PASSWORD_ENV]: opts.password,
  });
}

export async function appleIdSignOutAsync(appleId: string): Promise<void> {
  await MenuBarModule.runCli('apple-id-auth', ['--mode', 'sign-out', '--apple-id', appleId]);
}

/** The Apple ID the CLI holds a persisted session for, or null when signed out. */
export async function appleIdStatusAsync(): Promise<string | null> {
  const result = await MenuBarModule.runCli('apple-id-auth', ['--mode', 'status']);
  return parseCliJsonResult<{ appleId: string | null }>(result, 'apple-id-auth').appleId ?? null;
}
