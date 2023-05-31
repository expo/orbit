import { Emulator, Simulator } from "eas-shared";
import { getRunningEmulatorsAsync } from "eas-shared/build/run/android/adb";
import { getAptParametersAsync } from "eas-shared/build/run/android/aapt";

type InstallAndLaunchAppAsyncOptions = {
  platform: "android" | "ios";
  appPath: string;
  deviceId: string;
};

export async function installAndLaunchAppAsync({
  platform,
  appPath,
  deviceId,
}: InstallAndLaunchAppAsyncOptions) {
  if (platform === "ios") {
    const bundleIdentifier = await Simulator.getAppBundleIdentifierAsync(
      appPath
    );
    await Simulator.installAppAsync(deviceId, appPath);
    await Simulator.launchAppAsync(deviceId, bundleIdentifier);
    return;
  }

  const runningEmulators = await getRunningEmulatorsAsync();
  const emulator = runningEmulators.find(({ name }) => name === deviceId);
  if (!emulator) {
    throw new Error(`Emulator ${deviceId} is not running`);
  }

  await Emulator.installAppAsync(emulator, appPath);
  const { packageName, activityName } = await getAptParametersAsync(appPath);
  await Emulator.startAppAsync(emulator, packageName, activityName);
}
