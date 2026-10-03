const mockConnectUsbmuxdSocketAsync = jest.fn();

jest.mock('../usbmuxd', () => {
  const actual = jest.requireActual('../usbmuxd');
  return {
    __esModule: true,
    ...actual,
    connectUsbmuxdSocketAsync: (...args: unknown[]) => mockConnectUsbmuxdSocketAsync(...args),
  };
});

// Avoid loading the real devicectl module (it touches the filesystem at import
// time) and make native discovery resolve to no devices, like on Linux/Windows.
jest.mock('../../devicectl', () => ({
  __esModule: true,
  getConnectedAppleDevicesAsync: jest.fn(() => Promise.resolve([])),
}));

// eslint-disable-next-line import/first -- imports must follow the jest.mock calls above.
import { getConnectedAppleDevicesAsync } from '../../devicectl';
// eslint-disable-next-line import/first
import { getConnectedDevicesAsync } from '../AppleDevice';
// eslint-disable-next-line import/first
import { createUsbmuxdNotRunningError } from '../usbmuxd';

const mockGetConnectedAppleDevicesAsync = getConnectedAppleDevicesAsync as jest.Mock;

function mockDevicectlDevice({
  udid,
  name,
  platform = 'iOS',
  reality,
  transportType = 'wired',
}: {
  udid: string;
  name: string;
  platform?: string;
  reality?: string;
  transportType?: string;
}) {
  return {
    hardwareProperties: { udid, platform, productType: 'iPhone16,1', ...(reality && { reality }) },
    deviceProperties: { name, osVersionNumber: '26.0', developerModeStatus: 'enabled' },
    connectionProperties: { pairingState: 'paired', tunnelState: 'disconnected', transportType },
  };
}

describe('getConnectedDevicesAsync', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('surfaces APPLE_DEVICE_USBMUXD_NOT_RUNNING even when native discovery returns no devices', async () => {
    // Regression: the wrapped InternalError used to be swallowed because the
    // native (devicectl) path fulfilled with [] on Linux/Windows.
    mockConnectUsbmuxdSocketAsync.mockRejectedValueOnce(createUsbmuxdNotRunningError());

    await expect(getConnectedDevicesAsync()).rejects.toMatchObject({
      code: 'APPLE_DEVICE_USBMUXD_NOT_RUNNING',
    });
  });

  it('ignores simulators that Xcode 26 devicectl lists as paired devices', async () => {
    mockGetConnectedAppleDevicesAsync.mockResolvedValueOnce([
      // devicectl JSON v4: simulators are flagged with `reality: 'simulated'`.
      mockDevicectlDevice({
        udid: 'SIM-WATCH',
        name: 'Apple Watch Series 11 (42mm)',
        platform: 'watchOS',
        reality: 'simulated',
        transportType: 'sameMachine',
      }),
      mockDevicectlDevice({ udid: 'REAL', name: 'iPhone', reality: 'physical' }),
      // devicectl JSON v2/v3: no `reality` field, must still be listed.
      mockDevicectlDevice({ udid: 'LEGACY', name: 'Old iPhone' }),
    ]);
    mockConnectUsbmuxdSocketAsync.mockRejectedValueOnce(new Error('transient blip'));

    const devices = await getConnectedDevicesAsync();

    expect(devices.map((device) => device.udid)).toEqual(['REAL', 'LEGACY']);
  });

  it('swallows transient custom-tooling errors when native discovery succeeded', async () => {
    mockConnectUsbmuxdSocketAsync.mockRejectedValueOnce(new Error('transient blip'));

    await expect(getConnectedDevicesAsync()).resolves.toEqual([]);
  });
});
