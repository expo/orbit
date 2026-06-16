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

import { getConnectedDevicesAsync } from '../AppleDevice';
import { createUsbmuxdNotRunningError } from '../usbmuxd';

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

  it('swallows transient custom-tooling errors when native discovery succeeded', async () => {
    mockConnectUsbmuxdSocketAsync.mockRejectedValueOnce(new Error('transient blip'));

    await expect(getConnectedDevicesAsync()).resolves.toEqual([]);
  });
});
