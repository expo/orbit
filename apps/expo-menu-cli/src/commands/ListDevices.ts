import { Emulator, Simulator } from "eas-shared";
import { Platform } from "../utils";
import { getRunningEmulatorsAsync } from "eas-shared/build/run/android/adb";

type Device<P> = P extends Platform.Ios
  ? Simulator.IosSimulator
  : P extends Platform.Android
  ? Emulator.AndroidEmulator
  : Simulator.IosSimulator | Emulator.AndroidEmulator;

export async function listDevicesAsync<P extends Platform>({
  platform,
  oneDevice,
}: {
  platform: P;
  oneDevice?: boolean;
}): Promise<Device<P>[]> {
  let availableAndroidEmulators: Emulator.AndroidEmulator[] | undefined;
  let availableIosSimulators: Simulator.IosSimulator[] | undefined;

  if (platform === "ios" || platform === "all") {
    availableIosSimulators =
      await Simulator.getAvaliableIosSimulatorsListAsync();
  }

  if (platform === Platform.Android || platform === "all") {
    const runningEmulators = await getRunningEmulatorsAsync();

    availableAndroidEmulators = (
      await Emulator.getAvaliableAndroidEmulatorsAsync()
    )?.map((emulator) => {
      const runningEmulator = runningEmulators.find(
        (r) => r.name === emulator.name
      );
      return {
        ...emulator,
        state: runningEmulator ? "Booted" : "Shutdown",
        pid: runningEmulator?.pid,
      };
    });
  }

  if (oneDevice) {
    const firstAndroidDevice = availableAndroidEmulators?.[0];
    if (platform === Platform.Android) {
      return firstAndroidDevice ? [firstAndroidDevice as Device<P>] : [];
    }

    const firstIOSDevice =
      availableIosSimulators?.find(({ state }) => state === "Booted") ||
      availableIosSimulators?.sort(
        (a, b) => (b?.lastBootedAt || 0) - (a.lastBootedAt || 0)
      )?.[0];

    return firstIOSDevice ? [firstIOSDevice as Device<P>] : [];
  }

  let result = new Array<Device<P>>();
  if (
    (platform === "all" || platform === Platform.Ios) &&
    availableIosSimulators
  ) {
    result = result.concat(availableIosSimulators as Device<P>[]);
  }

  if (
    (platform === "all" || platform === Platform.Android) &&
    availableAndroidEmulators
  ) {
    result = result.concat(availableAndroidEmulators as Device<P>[]);
  }

  return result;
}
