import { AppleDevice, Emulator, Simulator } from "eas-shared";
import { DevicesPerPlatform } from "common-types/build/cli-commands/listDevices";
import { Platform } from "common-types/build/cli-commands";
import { InternalError } from "common-types";

export async function listDevicesAsync<P extends Platform>({
  platform,
}: {
  platform: P;
}): Promise<DevicesPerPlatform> {
  let result: DevicesPerPlatform = {
    android: { devices: [], error: undefined },
    ios: { devices: [], error: undefined },
  };

  if (platform === "ios" || platform === "all") {
    try {
      result.ios.devices = result.ios.devices.concat(
        await Simulator.getAvailableIosSimulatorsListAsync()
      );

      const connectedDevices = await AppleDevice.getConnectedDevicesAsync();
      const uniqueConnectedDevices = connectedDevices.filter(
        (element, index) => {
          return (
            connectedDevices.findIndex(({ udid }) => udid === element.udid) !==
            index
          );
        }
      );

      result.ios.devices = result.ios.devices.concat(uniqueConnectedDevices);
    } catch (error) {
      console.warn("Unable to get iOS devices", error);
      if (error instanceof Error) {
        result.ios.error = {
          code: error instanceof InternalError ? error.code : "UNKNOWN_ERROR",
          message: error.message,
        };
      }
    }
  }

  if (platform === Platform.Android || platform === "all") {
    try {
      const runningDevices = await Emulator.getRunningDevicesAsync();

      result.android.devices = (
        await Emulator.getAvailableAndroidEmulatorsAsync()
      )?.map((emulator) => {
        const runningEmulator = runningDevices.find(
          (r) => r.deviceType === "emulator" && r.name === emulator.name
        );
        return {
          ...emulator,
          state: runningEmulator ? "Booted" : "Shutdown",
          pid: runningEmulator?.pid,
        };
      });
      result.android.devices = result.android.devices.concat(
        runningDevices.filter((r) => r.deviceType === "device")
      );
    } catch (error) {
      console.warn("Unable to get Android devices", error);
      if (error instanceof Error) {
        result.android.error = {
          code: error instanceof InternalError ? error.code : "UNKNOWN_ERROR",
          message: error.message,
        };
      }
    }
  }

  return result;
}
