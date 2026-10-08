const mockSpawnAsync = jest.fn();

jest.mock('@expo/spawn-async', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockSpawnAsync(...args),
}));

// The connection-retry backoff must not make the suite wait for real.
const mockSleepAsync = jest.fn(async () => {});
jest.mock('../../../utils/promise', () => ({
  sleepAsync: (ms: number) => mockSleepAsync(ms),
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

// devicectl's control channel to the phone dropping for a moment, e.g. right
// after an install. Verbatim shape.
const CONNECTION_DROPPED = [
  'ERROR: A connection to this device could not be established. (com.apple.dt.CoreDeviceError error 4000 (0xFA0))',
  '       DeviceIdentifier = EF25FB93-4FD2-5DE6-9DE9-5363A4944C70',
  '----------------------------------------',
  'Internal logic error: Connection was invalidated (com.apple.CoreDevice.ControlChannelConnectionError error 1 (0x01))',
  '----------------------------------------',
  'Transport error (com.apple.CoreDevice.ControlChannelConnectionError error 0 (0x00))',
  '----------------------------------------',
  'The operation couldn’t be completed. (Network.NWError error 54 - Connection reset by peer)',
  '       NSDescription = Connection reset by peer',
].join('\n');

const LAUNCH = ['devicectl', 'device', 'process', 'launch', '--device', 'udid', 'com.example.app'];

describe('xcrunAsync devicectl connection retry', () => {
  beforeEach(() => mockSleepAsync.mockClear());

  it('retries a dropped device connection and succeeds once it is back', async () => {
    mockSpawnAsync
      .mockRejectedValueOnce(devicectlFailure(CONNECTION_DROPPED))
      .mockRejectedValueOnce(devicectlFailure(CONNECTION_DROPPED))
      .mockResolvedValueOnce({ stdout: 'launched', stderr: '', status: 0 });

    await expect(xcrunAsync(LAUNCH)).resolves.toMatchObject({ stdout: 'launched' });
    expect(mockSpawnAsync).toHaveBeenCalledTimes(3);
    // Backoff grows between attempts.
    expect(mockSleepAsync.mock.calls.map(([ms]) => ms)).toEqual([1500, 3000]);
  });

  it('gives up after three attempts with a readable error', async () => {
    mockSpawnAsync.mockRejectedValue(devicectlFailure(CONNECTION_DROPPED));

    await expect(xcrunAsync(LAUNCH)).rejects.toMatchObject({
      name: 'InternalError',
      code: 'APPLE_DEVICE_CONNECTION_LOST',
      message: expect.stringContaining('Lost the connection to the device'),
    });
    expect(mockSpawnAsync).toHaveBeenCalledTimes(3);
  });

  it('does not retry commands other than devicectl', async () => {
    mockSpawnAsync.mockRejectedValueOnce(devicectlFailure(CONNECTION_DROPPED));

    await expect(xcrunAsync(['simctl', 'list'])).rejects.toMatchObject({
      code: 'APPLE_DEVICE_CONNECTION_LOST',
    });
    expect(mockSpawnAsync).toHaveBeenCalledTimes(1);
    expect(mockSleepAsync).not.toHaveBeenCalled();
  });
});
