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

  it('ignores Xcode 27.2 unavailable simulators with no platform', async () => {
    mockGetConnectedAppleDevicesAsync.mockResolvedValueOnce([
      // devicectl JSON v5: unavailable simulators have no `platform` or
      // `osVersionNumber`. One entry omits `reality` entirely to prove the
      // `platform` / `transportType` guards hold even if Apple drops the flag.
      {
        hardwareProperties: { udid: 'SIM-NO-PLATFORM', productType: 'iPad14,9' },
        deviceProperties: { name: 'iPad Air 11-inch (M2)' },
        connectionProperties: {
          pairingState: 'paired',
          tunnelState: 'disconnected',
          transportType: 'sameMachine',
          reality: 'simulated',
        },
      } as any,
      // Same shape but with `reality` at the top level of hardwareProperties.
      {
        hardwareProperties: {
          udid: 'SIM-NO-PLATFORM-2',
          productType: 'iPhone15,5',
          reality: 'simulated',
        },
        deviceProperties: { name: 'iPhone 15 Plus' },
        connectionProperties: {
          pairingState: 'paired',
          tunnelState: 'disconnected',
          transportType: 'sameMachine',
        },
      } as any,
      mockDevicectlDevice({ udid: 'REAL', name: 'iPhone', reality: 'physical' }),
    ]);
    mockConnectUsbmuxdSocketAsync.mockRejectedValueOnce(new Error('transient blip'));

    const devices = await getConnectedDevicesAsync();

    expect(devices.map((device) => device.udid)).toEqual(['REAL']);
    for (const device of devices) {
      expect(device.osType).toBeDefined();
    }
  });

  it('swallows transient custom-tooling errors when native discovery succeeded', async () => {
    mockConnectUsbmuxdSocketAsync.mockRejectedValueOnce(new Error('transient blip'));

    await expect(getConnectedDevicesAsync()).resolves.toEqual([]);
  });
});
