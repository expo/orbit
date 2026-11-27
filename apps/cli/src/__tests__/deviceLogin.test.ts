import { getDevLauncherVersionAsync } from 'eas-shared';

import { isSupportedVersion, withDeviceLoginParamsAsync } from '../deviceLogin';

jest.mock('eas-shared', () => ({ getDevLauncherVersionAsync: jest.fn() }));
jest.mock('../storage', () => ({ getSessionSecret: jest.fn(() => 'session') }));

const URL = 'myapp://expo-development-client/?url=https%3A%2F%2Fu.expo.dev%2Fupdate%2F1';

const respond = (data: object) =>
  ({ ok: true, status: 200, json: async () => ({ data }) }) as Response;

describe(withDeviceLoginParamsAsync, () => {
  beforeEach(() => {
    jest.mocked(getDevLauncherVersionAsync).mockResolvedValue('58.1.0');
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(respond({ device_code: 'code', user_code: 'USER' }))
      .mockResolvedValueOnce(respond({ device_verification_id: 'verification' }))
      .mockResolvedValueOnce(respond({ match_value: '42' }));
  });

  it('adds the device params after it approves the code with the Orbit session', async () => {
    const result = await withDeviceLoginParamsAsync(URL, '/app.apk');

    expect(result).toBe(
      `${URL}&__expo_device_code=code&__expo_device_match=42&__expo_device_client=expo-go`
    );
    expect(jest.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      'https://api.expo.dev/v2/auth/device_authorization',
      'https://api.expo.dev/v2/auth/device-verifications/lookup',
      'https://api.expo.dev/v2/auth/device-verifications/decide',
    ]);
    expect(jest.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({
      'expo-session': 'session',
    });
  });

  it('returns the URL unchanged for an older launcher', async () => {
    jest.mocked(getDevLauncherVersionAsync).mockResolvedValue('58.0.21');

    expect(await withDeviceLoginParamsAsync(URL, '/app.apk')).toBe(URL);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns the URL unchanged when a request fails', async () => {
    jest.mocked(fetch).mockReset().mockRejectedValue(new Error('offline'));

    expect(await withDeviceLoginParamsAsync(URL, '/app.apk')).toBe(URL);
  });
});

describe(isSupportedVersion, () => {
  it('compares the version with the first supported one', () => {
    expect(isSupportedVersion('58.1.0')).toBe(true);
    expect(isSupportedVersion('58.1.1')).toBe(true);
    expect(isSupportedVersion('59.0.0')).toBe(true);
    expect(isSupportedVersion('58.0.21')).toBe(false);
    expect(isSupportedVersion('6.0.21')).toBe(false);
    expect(isSupportedVersion(null)).toBe(false);
  });
});
