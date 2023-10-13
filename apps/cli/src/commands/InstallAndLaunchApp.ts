import {
  Emulator,
  Simulator,
  extractAppFromLocalArchiveAsync,
} from "eas-shared";
import { Platform } from "common-types/build/cli-commands";

import { getPlatformFromURI } from "../utils";

type InstallAndLaunchAppAsyncOptions = {
  appPath: string;
  deviceId: string;
};

export async function installAndLaunchAppAsync(
  options: InstallAndLaunchAppAsyncOptions
) {
  let appPath = options.appPath;
  if (!appPath.endsWith(".app") && !appPath.endsWith(".apk")) {
    appPath = await extractAppFromLocalArchiveAsync(appPath);
  }
  const platform = getPlatformFromURI(appPath);

  return platform === Platform.Ios
    ? installAndLaunchIOSAppAsync(appPath, options.deviceId)
    : installAndLaunchAndroidAppAsync(appPath, options.deviceId);
}

async function installAndLaunchIOSAppAsync(appPath: string, deviceId: string) {
  const bundleIdentifier = await Simulator.getAppBundleIdentifierAsync(appPath);
  await Simulator.installAppAsync(deviceId, appPath);
  await Simulator.launchAppAsync(deviceId, bundleIdentifier);
}

async function installAndLaunchAndroidAppAsync(
  appPath: string,
  deviceId: string
) {
  const runningDevices = await Emulator.getRunningDevicesAsync();
  const device = runningDevices.find(({ name }) => name === deviceId);
  if (!device) {
    throw new Error(`Device or Emulator ${deviceId} is not running`);
  }

  await Emulator.installAppAsync(device, appPath);
  const { packageName, activityName } =
    await Emulator.getAptParametersAsync(appPath);
  await Emulator.startAppAsync(device, packageName, activityName);
}
