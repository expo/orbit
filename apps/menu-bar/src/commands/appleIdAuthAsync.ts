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

// The password rides in an env var, never in argv. Omitted when the user chose
// "Keep me signed in" earlier: the CLI then uses the saved one.
function passwordEnv(password?: string): Record<string, string> | undefined {
  return password ? { [PASSWORD_ENV]: password } : undefined;
}

export async function appleIdSignInAsync(opts: {
  appleId: string;
  password?: string;
  preferSms?: boolean;
  rememberPassword?: boolean;
  onRetry?: (info: AppleRetryInfo) => void;
}): Promise<void> {
  const args = ['--mode', 'sign-in', '--apple-id', opts.appleId];
  if (opts.preferSms) args.push('--prefer-sms');
  if (opts.rememberPassword) args.push('--remember-password');
  await MenuBarModule.runCli(
    'apple-id-auth',
    args,
    makeRetryCallback(opts.onRetry),
    passwordEnv(opts.password)
  );
}

export async function appleIdVerifyTwoFactorAsync(opts: {
  appleId: string;
  password?: string;
  code: string;
  // Must match the preferSms used at sign-in — the 2FA session is channel-bound.
  preferSms?: boolean;
  rememberPassword?: boolean;
  onRetry?: (info: AppleRetryInfo) => void;
}): Promise<void> {
  const args = ['--mode', 'verify-2fa', '--apple-id', opts.appleId, '--code', opts.code];
  if (opts.preferSms) args.push('--prefer-sms');
  if (opts.rememberPassword) args.push('--remember-password');
  await MenuBarModule.runCli(
    'apple-id-auth',
    args,
    makeRetryCallback(opts.onRetry),
    passwordEnv(opts.password)
  );
}

export async function appleIdSignOutAsync(appleId: string): Promise<void> {
  await MenuBarModule.runCli('apple-id-auth', ['--mode', 'sign-out', '--apple-id', appleId]);
}

export type AppleIdStatus = {
  /** The Apple ID the CLI holds a persisted session for, or null when signed out. */
  appleId: string | null;
  /** Whether a password is saved for it ("Keep me signed in"). */
  passwordSaved: boolean;
};

export async function appleIdStatusAsync(): Promise<AppleIdStatus> {
  const result = await MenuBarModule.runCli('apple-id-auth', ['--mode', 'status']);
  const status = parseCliJsonResult<Partial<AppleIdStatus>>(result, 'apple-id-auth');
  return { appleId: status.appleId ?? null, passwordSaved: status.passwordSaved ?? false };
}
