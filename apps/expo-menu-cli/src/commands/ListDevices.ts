import { Emulator, Simulator } from "eas-shared";

type ListDevicesAsyncOptions = {
  platform: "android" | "ios" | "all";
  oneDevice?: boolean;
};

type ListDevicesAsyncResult = (
  | Emulator.AndroidEmulator
  | Simulator.IosSimulator
)[];

export async function listDevicesAsync({
  platform,
  oneDevice,
}: ListDevicesAsyncOptions): Promise<ListDevicesAsyncResult | undefined> {
  let availableAndroidEmulators: Emulator.AndroidEmulator[] | undefined;
  let availableIosSimulators: Simulator.IosSimulator[] | undefined;

  if (platform === "ios" || platform === "all") {
    availableIosSimulators =
      await Simulator.getAvaliableIosSimulatorsListAsync();
  }

  if (platform === "android" || platform === "all") {
    availableAndroidEmulators =
      await Emulator.getAvaliableAndroidEmulatorsAsync();
  }

  if (oneDevice) {
    const firstAndroidDevice = availableAndroidEmulators?.[0];
    if (platform === "android") {
      return firstAndroidDevice ? [firstAndroidDevice] : [];
    }

    const firstIOSDevice =
      availableIosSimulators?.find(({ state }) => state === "Booted") ||
      availableIosSimulators?.sort(
        (a, b) => (b?.lastBootedAt || 0) - (a.lastBootedAt || 0)
      )?.[0];

    return firstIOSDevice ? [firstIOSDevice] : [];
  }

  let result: ListDevicesAsyncResult = [];
  if ((platform === "all" || platform === "ios") && availableIosSimulators) {
    result = result.concat(availableIosSimulators);
  }

  if (
    (platform === "all" || platform === "android") &&
    availableAndroidEmulators
  ) {
    result = result.concat(availableAndroidEmulators);
  }

  return result;
}
