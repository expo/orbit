import { Emulator, Simulator } from "eas-shared";
import { getRunningDevicesAsync } from "eas-shared/build/run/android/adb";

type BootDeviceAsyncOptions = {
  platform: "android" | "ios";
  id: string;
};

export async function bootDeviceAsync({
  platform,
  id,
}: BootDeviceAsyncOptions) {
  if (platform === "ios") {
    try {
      await Simulator.ensureSimulatorBootedAsync({
        udid: id,
      } as Simulator.IosSimulator);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Unable to boot device in current state: Booted")
      ) {
        return;
      }

      throw error;
    }

    return await Simulator.ensureSimulatorAppOpenedAsync(id);
  }

  const runningEmulators = await getRunningDevicesAsync();
  if (runningEmulators.some(({ name }) => name === id)) {
    return;
  }

  await Emulator.bootEmulatorAsync({
    name: id,
  } as Emulator.AndroidDevice);
}
