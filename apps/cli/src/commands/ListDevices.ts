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
  };

  if (platform === Platform.Ios || platform === Platform.All) {
    try {
      const connectedDevices = await AppleDevice.getConnectedDevicesAsync();
      for (const connectedDevice of connectedDevices) {
        if (!result.ios.devices.some(({ udid }) => udid === connectedDevice.udid)) {
          result.ios.devices.push(connectedDevice);
        }
      }

      result.ios.devices = result.ios.devices.concat(
        await Simulator.getAvailableIosSimulatorsListAsync()
      );
    } catch (error) {
      console.warn('Unable to get iOS devices', error);
      if (error instanceof Error) {
        result.ios.error = {
          code: error instanceof InternalError ? error.code : 'UNKNOWN_ERROR',
          message: error.message,
        };
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
