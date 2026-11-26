import { AppleDevice, Emulator, Simulator } from 'eas-shared';
import { DevicesPerPlatform } from 'common-types/build/cli-commands/listDevices';
import { InternalError, Platform, Devices } from 'common-types';

export async function listDevicesAsync<P extends Platform>({
  platform,
}: {
  platform: P;
}): Promise<DevicesPerPlatform> {
  let result: DevicesPerPlatform = {
    android: { devices: [], error: undefined },
    ios: { devices: [], error: undefined },
    tvos: { devices: [], error: undefined },
    watchos: { devices: [], error: undefined },
  };

  const listIos = platform === Platform.Ios || platform === Platform.All;
  const listAndroid = platform === Platform.Android || platform === Platform.All;
  const tasks: Promise<void>[] = [];

  // List devices for each platform in parallel to improve performance.
  if (listIos) {
    tasks.push(
      (async () => {
        try {
          const connectedDevices = await AppleDevice.getConnectedDevicesAsync();
          for (const connectedDevice of connectedDevices) {
            // A device that is also listed over Wi-Fi shows as the USB or devicectl entry.
            const index = result.ios.devices.findIndex(({ udid }) => udid === connectedDevice.udid);
            if (index === -1) {
              result.ios.devices.push(connectedDevice);
            } else {
              result.ios.devices[index] = { ...connectedDevice, pairedOverWifi: true };
            }
          }
        } catch (error) {
          console.warn('Unable to get connected Apple devices', error);
          if (error instanceof Error) {
            const code = error instanceof InternalError ? error.code : 'UNKNOWN_ERROR';
            // Only show the error on Windows when an iPhone is plugged in.
            const suppress =
              process.platform === 'win32' &&
              code === 'APPLE_DEVICE_USBMUXD_NOT_RUNNING' &&
              !(await AppleDevice.isAppleUsbDeviceConnectedAsync());
            if (!suppress) {
              result.ios.error = {
                code,
                message: error.message,
                // Surface install guidance so the menu bar can offer an assist action.
                helper:
                  code === 'APPLE_DEVICE_USBMUXD_NOT_RUNNING'
                    ? (() => {
                        const { description: _description, ...helper } =
                          AppleDevice.getUsbmuxdHelperGuidance();
                        return helper;
                      })()
                    : undefined,
              };
            }
          }
        }
      })()
    );

    // iPhones paired over Wi-Fi (iOS 27 Remote Device Pairing) on every platform, listed on
    // their own so a missing usbmux service doesn't hide them.
    result.ios.canPairOverWifi = true;
    tasks.push(
      (async () => {
        try {
          const wirelessDevices = await AppleDevice.getConnectedWirelessDevicesAsync();
          for (const device of wirelessDevices) {
            const listed = result.ios.devices.find(({ udid }) => udid === device.udid);
            if (listed) {
              (listed as Devices.AppleConnectedDevice).pairedOverWifi = true;
            } else {
              result.ios.devices.push(device);
            }
          }
        } catch (error) {
          console.warn('Unable to get Apple devices paired over Wi-Fi', error);
        }
      })()
    );

    // Simulators are only supported on macOS
    if (process.platform === 'darwin') {
      tasks.push(
        (async () => {
          try {
            const simulators = await Simulator.getAvailableAppleSimulatorsListAsync();
            for (const simulator of simulators) {
              if (simulator.osType === 'watchOS') {
                result.watchos.devices.push(simulator);
              } else if (simulator.osType === 'tvOS') {
                result.tvos.devices.push(simulator);
              } else {
                result.ios.devices.push(simulator);
              }
            }
          } catch (error) {
            console.warn('Unable to get Apple simulators', error);
            if (error instanceof Error) {
              const errorInfo = {
                code: error instanceof InternalError ? error.code : 'UNKNOWN_ERROR',
                message: error.message,
              };
              result.ios.error = result.ios.error ?? errorInfo;
              result.tvos.error = errorInfo;
              result.watchos.error = errorInfo;
            }
          }
        })()
      );
    }
  }

  if (listAndroid) {
    tasks.push(
      (async () => {
        try {
          const runningDevices = await Emulator.getRunningDevicesAsync();

          result.android.devices = result.android.devices.concat(
            runningDevices.filter((r) => r.deviceType === 'device')
          );

          const androidEmulators = (
            (await Emulator.getAvailableAndroidEmulatorsAsync()) || []
          )?.map((emulator) => {
            const runningEmulator = runningDevices.find(
              (r) => r.deviceType === 'emulator' && r.name === emulator.name
            );
            return {
              ...emulator,
              state: runningEmulator ? 'Booted' : 'Shutdown',
              pid: runningEmulator?.pid,
            } as Devices.AndroidEmulator;
          });

          result.android.devices = result.android.devices.concat(androidEmulators);
        } catch (error) {
          console.warn('Unable to get Android devices', error);
          if (error instanceof Error) {
            result.android.error = {
              code: error instanceof InternalError ? error.code : 'UNKNOWN_ERROR',
              message: error.message,
            };
          }
        }
      })()
    );
  }

  await Promise.all(tasks);

  return result;
}
