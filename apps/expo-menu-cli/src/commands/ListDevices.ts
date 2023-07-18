import { Emulator, Simulator } from "eas-shared";
import { Platform } from "../utils";

type Device<P> = P extends Platform.Ios
  ? Simulator.IosSimulator
  : P extends Platform.Android
  ? Emulator.AndroidDevice
  : Simulator.IosSimulator | Emulator.AndroidDevice;

export async function listDevicesAsync<P extends Platform>({
  platform,
  oneDevice,
}: {
  platform: P;
  oneDevice?: boolean;
}): Promise<Device<P>[]> {
  let availableAndroidDevices: Emulator.AndroidDevice[] | undefined;
  let availableIosDevices: Simulator.IosSimulator[] | undefined;

  if (platform === "ios" || platform === "all") {
    availableIosDevices = await Simulator.getAvaliableIosSimulatorsListAsync();
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

  if (oneDevice) {
    const firstAndroidDevice = availableAndroidDevices?.[0];
    if (platform === Platform.Android) {
      return firstAndroidDevice ? [firstAndroidDevice as Device<P>] : [];
    }

    const firstIOSDevice =
      availableIosDevices?.find(({ state }) => state === "Booted") ||
      availableIosDevices?.sort(
        (a, b) => (b?.lastBootedAt || 0) - (a.lastBootedAt || 0)
      )?.[0];

    return firstIOSDevice ? [firstIOSDevice as Device<P>] : [];
  }

  let result = new Array<Device<P>>();
  if (
    (platform === "all" || platform === Platform.Ios) &&
    availableIosDevices
  ) {
    result = result.concat(availableIosDevices as Device<P>[]);
  }

  if (
    (platform === "all" || platform === Platform.Android) &&
    availableAndroidDevices
  ) {
    result = result.concat(availableAndroidDevices as Device<P>[]);
  }

  return result;
}
