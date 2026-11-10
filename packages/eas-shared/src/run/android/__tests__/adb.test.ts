const mockSpawnAsync = jest.fn();

jest.mock('@expo/spawn-async', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockSpawnAsync(...args),
}));

jest.mock('../sdk', () => ({
  getAndroidSdkRootAsync: async () => null,
}));

// eslint-disable-next-line import/first -- imports must follow the jest.mock calls above.
import { getRunningDevicesAsync } from '../adb';

function mockAdbDevices(lines: string[]) {
  mockSpawnAsync.mockImplementation(async (_adb: string, args: string[]) => {
    if (args[0] === 'devices') {
      return { stdout: ['List of devices attached', ...lines].join('\n') + '\n', stderr: '' };
    }
    throw new Error(`unexpected adb call: ${args.join(' ')}`);
  });
}

describe(getRunningDevicesAsync, () => {
  beforeEach(() => {
    mockSpawnAsync.mockReset();
  });

  it('reports a USB device as USB', async () => {
    mockAdbDevices([
      'FA8251A00719           device usb:336592896X product:walleye model:Pixel_2 device:walleye transport_id:4',
    ]);

    expect(await getRunningDevicesAsync()).toEqual([
      expect.objectContaining({ pid: 'FA8251A00719', model: 'Pixel_2', connectionType: 'USB' }),
    ]);
  });

  it('reports a device connected with `adb connect <ip>:<port>` as Network', async () => {
    // What `adb devices -l` lists after Wi-Fi pairing, which connects to the
    // `ipAddress:port` of the device's `_adb-tls-connect` service.
    mockAdbDevices([
      '192.168.1.42:37099     device product:sunfish model:Pixel_4a device:sunfish transport_id:7',
    ]);

    expect(await getRunningDevicesAsync()).toEqual([
      expect.objectContaining({
        pid: '192.168.1.42:37099',
        model: 'Pixel_4a',
        connectionType: 'Network',
      }),
    ]);
  });

  it('reports an IPv6 address serial as Network', async () => {
    mockAdbDevices([
      '[fe80::1c2b:3cff:fe4d:5e6f]:5555 device product:sunfish model:Pixel_4a device:sunfish transport_id:8',
    ]);

    expect(await getRunningDevicesAsync()).toEqual([
      expect.objectContaining({ connectionType: 'Network' }),
    ]);
  });

  it('reports a device auto-connected over mDNS as Network', async () => {
    mockAdbDevices([
      'adb-0A1B2C3D4E5F-QnTpKE._adb-tls-connect._tcp device product:sunfish model:Pixel_4a device:sunfish transport_id:9',
    ]);

    expect(await getRunningDevicesAsync()).toEqual([
      expect.objectContaining({ connectionType: 'Network' }),
    ]);
  });
});
