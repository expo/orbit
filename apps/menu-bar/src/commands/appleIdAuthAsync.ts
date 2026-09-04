import MenuBarModule from '../modules/MenuBarModule';

const PASSWORD_ENV = 'EXPO_ORBIT_APPLE_PASSWORD';

export async function appleIdSignInAsync(opts: {
  appleId: string;
  password: string;
  preferSms?: boolean;
}): Promise<void> {
  const args = ['--mode', 'sign-in', '--apple-id', opts.appleId];
  if (opts.preferSms) args.push('--prefer-sms');
  await MenuBarModule.runCli('apple-id-auth', args, undefined, {
    [PASSWORD_ENV]: opts.password,
  });
}

export async function appleIdVerifyTwoFactorAsync(opts: {
  appleId: string;
  password: string;
  code: string;
  // Must match the preferSms used at sign-in — the 2FA session is channel-bound.
  preferSms?: boolean;
}): Promise<void> {
  const args = ['--mode', 'verify-2fa', '--apple-id', opts.appleId, '--code', opts.code];
  if (opts.preferSms) args.push('--prefer-sms');
  await MenuBarModule.runCli('apple-id-auth', args, undefined, {
    [PASSWORD_ENV]: opts.password,
  });
}

export async function appleIdSignOutAsync(appleId: string): Promise<void> {
  await MenuBarModule.runCli('apple-id-auth', ['--mode', 'sign-out', '--apple-id', appleId]);
}
