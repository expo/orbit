import {
  AppPlatform,
  Emulator,
  Simulator,
  extractAppFromLocalArchiveAsync,
} from "eas-shared";
import { Platform, getPlatformFromURI } from "../utils";

type InstallAndLaunchAppAsyncOptions = {
  appPath: string;
  deviceId: string;
};

export async function installAndLaunchAppAsync(
  options: InstallAndLaunchAppAsyncOptions
) {
  const platform = getPlatformFromURI(options.appPath);

  return platform === Platform.Ios
    ? installAndLaunchIOSAppAsync(options)
    : installAndLaunchAndroidAppAsync(options);
}

async function installAndLaunchIOSAppAsync(
  options: InstallAndLaunchAppAsyncOptions
) {
  let appPath = options.appPath;
  if (appPath.endsWith(".tar.gz")) {
    appPath = await extractAppFromLocalArchiveAsync(appPath, AppPlatform.Ios);
  }

  const bundleIdentifier = await Simulator.getAppBundleIdentifierAsync(appPath);
  await Simulator.installAppAsync(options.deviceId, appPath);
  await Simulator.launchAppAsync(options.deviceId, bundleIdentifier);
}

async function installAndLaunchAndroidAppAsync({
  appPath,
  deviceId,
}: InstallAndLaunchAppAsyncOptions) {
  const runningEmulators = await Emulator.getRunningDevicesAsync();
  const emulator = runningEmulators.find(({ name }) => name === deviceId);
  if (!emulator) {
    throw new Error(`Emulator ${deviceId} is not running`);
  }

  await Emulator.installAppAsync(emulator, appPath);
  const { packageName, activityName } = await Emulator.getAptParametersAsync(
    appPath
  );
  await Emulator.startAppAsync(emulator, packageName, activityName);
}
