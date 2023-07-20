import {
  AppleConnectedDevice,
  AppleDevice,
  Emulator,
  Simulator,
} from "eas-shared";
import { Platform } from "../utils";

type Device<P> = P extends Platform.Ios
  ? Simulator.IosSimulator
  : P extends Platform.Android
  ? Emulator.AndroidDevice
  : Simulator.IosSimulator | Emulator.AndroidDevice;

export async function listDevicesAsync<P extends Platform>({
  platform,
}: {
  platform: P;
}): Promise<Device<P>[]> {
  let availableAndroidDevices: Emulator.AndroidDevice[] = [];
  let availableIosDevices: Array<
    Simulator.IosSimulator | AppleConnectedDevice
  > = [];

  if (platform === "ios" || platform === "all") {
    availableIosDevices = availableIosDevices.concat(
      await Simulator.getAvaliableIosSimulatorsListAsync()
    );

    availableIosDevices = availableIosDevices.concat(
      await AppleDevice.getConnectedDevicesAsync()
    );
  }

  if (platform === Platform.Android || platform === "all") {
    const runningDevices = await Emulator.getRunningDevicesAsync();

    availableAndroidDevices = (
      await Emulator.getAvailableAndroidEmulatorsAsync()
    )?.map((emulator) => {
      const runningEmulator = runningDevices.find(
        (r) => r.type === "emulator" && r.name === emulator.name
      );
      return {
        ...emulator,
        state: runningEmulator ? "Booted" : "Shutdown",
        pid: runningEmulator?.pid,
      };
    });
    availableAndroidDevices = availableAndroidDevices.concat(
      runningDevices.filter((r) => r.type === "device")
    );
  }

  let result = new Array<Device<P>>();
  if (
    (platform === "all" || platform === Platform.Ios) &&
    availableIosDevices?.length
  ) {
    result = result.concat(availableIosDevices as Device<P>[]);
  }

  if (
    (platform === "all" || platform === Platform.Android) &&
    availableAndroidDevices.length
  ) {
    result = result.concat(availableAndroidDevices as Device<P>[]);
  }

  return result;
}
