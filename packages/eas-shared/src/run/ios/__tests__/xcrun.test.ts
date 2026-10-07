const mockSpawnAsync = jest.fn();

jest.mock('@expo/spawn-async', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockSpawnAsync(...args),
}));

// eslint-disable-next-line import/first -- imports must follow the jest.mock calls above.
import { xcrunAsync } from '../xcrun';

/** What @expo/spawn-async rejects with when devicectl exits non-zero. */
function devicectlFailure(stderr: string) {
  const error: any = new Error('xcrun devicectl ... exited with non-zero code: 1');
  error.stdout = '';
  error.stderr = stderr;
  error.output = ['', stderr];
  return error;
}

// `devicectl device process launch` on an app whose developer the user has not
// trusted yet (Settings → General → VPN & Device Management). Verbatim shape.
const LAUNCH_DENIED_UNTRUSTED = [
  'ERROR: The application failed to launch. (com.apple.dt.CoreDeviceError error 10002 (0x2712))',
  '       BundleIdentifier = com.example.app.orbit07bcf83b',
  '----------------------------------------',
  'The request to open "com.example.app.orbit07bcf83b" failed. (FBSOpenApplicationServiceErrorDomain error 1 (0x01))',
  '       BSErrorCodeDescription = RequestDenied',
  '       NSLocalizedFailureReason = The request was denied by service delegate (SBMainWorkspace) for reason: Security ("Unable to launch com.example.app.orbit07bcf83b because it has an invalid code signature, inadequate entitlements or its profile has not been explicitly trusted by the user").',
  '----------------------------------------',
  'The operation couldn’t be completed. Unable to launch com.example.app.orbit07bcf83b because it has an invalid code signature, inadequate entitlements or its profile has not been explicitly trusted by the user. (FBSOpenApplicationErrorDomain error 3 (0x03))',
  '       BSErrorCodeDescription = Security',
].join('\n');

// `devicectl device install app` on an IPA not provisioned for the device.
const INSTALL_INTEGRITY_FAILED = [
  'ERROR: Failed to install the app on the device. (com.apple.dt.CoreDeviceError error 3002 (0xBBA))',
  'Unable to Install “entangle” (IXUserPresentableErrorDomain error 14 (0x0E))',
  '       NSLocalizedFailureReason = This app cannot be installed because its integrity could not be verified.',
  '       LegacyErrorString = ApplicationVerificationFailed',
].join('\n');

beforeEach(() => mockSpawnAsync.mockReset());

describe('xcrunAsync devicectl error mapping', () => {
  it('maps a launch refused for an untrusted developer profile', async () => {
    mockSpawnAsync.mockRejectedValueOnce(devicectlFailure(LAUNCH_DENIED_UNTRUSTED));
    await expect(
      xcrunAsync([
        'devicectl',
        'device',
        'process',
        'launch',
        '--device',
        'udid',
        'com.example.app',
      ])
    ).rejects.toMatchObject({
      name: 'InternalError',
      code: 'APPLE_DEVELOPER_NOT_TRUSTED',
      message: expect.stringContaining('VPN & Device Management'),
    });
  });

  it('keeps mapping an install integrity failure to the resign offer', async () => {
    mockSpawnAsync.mockRejectedValueOnce(devicectlFailure(INSTALL_INTEGRITY_FAILED));
    await expect(
      xcrunAsync(['devicectl', 'device', 'install', 'app', '--device', 'udid', 'x.ipa'])
    ).rejects.toMatchObject({ name: 'InternalError', code: 'APPLE_APP_VERIFICATION_FAILED' });
  });

  it('still surfaces an unrecognised failure with its stderr', async () => {
    mockSpawnAsync.mockRejectedValueOnce(devicectlFailure('ERROR: something new (error 42)'));
    await expect(xcrunAsync(['devicectl', 'list', 'devices'])).rejects.toThrow(
      /Some other error occurred while running xcrun command[\s\S]*something new/
    );
  });
});
