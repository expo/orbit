import MenuBarModule from '../modules/MenuBarModule';

const PASSWORD_ENV = 'EXPO_ORBIT_APPLE_PASSWORD';

export async function appleIdSignInAsync(opts: {
  appleId: string;
  password: string;
}): Promise<void> {
  await MenuBarModule.runCli(
    'apple-id-auth',
    ['--mode', 'sign-in', '--apple-id', opts.appleId],
    undefined,
    { [PASSWORD_ENV]: opts.password }
  );
}

export async function appleIdVerifyTwoFactorAsync(opts: {
  appleId: string;
  password: string;
  code: string;
}): Promise<void> {
  await MenuBarModule.runCli(
    'apple-id-auth',
    ['--mode', 'verify-2fa', '--apple-id', opts.appleId, '--code', opts.code],
    undefined,
    { [PASSWORD_ENV]: opts.password }
  );
}

export async function appleIdSignOutAsync(appleId: string): Promise<void> {
  await MenuBarModule.runCli('apple-id-auth', ['--mode', 'sign-out', '--apple-id', appleId]);
}
