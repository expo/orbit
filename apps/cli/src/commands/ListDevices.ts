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

  if (platform === Platform.Ios || platform === Platform.All) {
    try {
      const connectedDevices = await AppleDevice.getConnectedDevicesAsync();
      for (const connectedDevice of connectedDevices) {
        if (!result.ios.devices.some(({ udid }) => udid === connectedDevice.udid)) {
          result.ios.devices.push(connectedDevice);
        }
      }

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
      console.warn('Unable to get Apple devices', error);
      if (error instanceof Error) {
        const errorInfo = {
          code: error instanceof InternalError ? error.code : 'UNKNOWN_ERROR',
          message: error.message,
        };
        result.ios.error = errorInfo;
        result.tvos.error = errorInfo;
        result.watchos.error = errorInfo;
      }
    }
  }

  if (platform === Platform.Android || platform === Platform.All) {
    try {
      const runningDevices = await Emulator.getRunningDevicesAsync();

      result.android.devices = result.android.devices.concat(
        runningDevices.filter((r) => r.deviceType === 'device')
      );

      const androidEmulators = ((await Emulator.getAvailableAndroidEmulatorsAsync()) || [])?.map(
        (emulator) => {
          const runningEmulator = runningDevices.find(
            (r) => r.deviceType === 'emulator' && r.name === emulator.name
          );
          return {
            ...emulator,
            state: runningEmulator ? 'Booted' : 'Shutdown',
            pid: runningEmulator?.pid,
          } as Devices.AndroidEmulator;
        }
      );

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
  }

  return result;
}
