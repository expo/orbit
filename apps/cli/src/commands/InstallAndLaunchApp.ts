import { Emulator, Simulator, extractAppFromLocalArchiveAsync, AppleDevice } from 'eas-shared';
import { Platform } from 'common-types/build/cli-commands';

import { getPlatformFromURI, getRunningAndroidDevice } from '../utils';

type InstallAndLaunchAppAsyncOptions = {
  appPath: string;
  deviceId: string;
};

export async function installAndLaunchAppAsync(options: InstallAndLaunchAppAsyncOptions) {
  let appPath = options.appPath;
  if (!appPath.endsWith('.app') && !appPath.endsWith('.apk')) {
    appPath = await extractAppFromLocalArchiveAsync(appPath);
  }
  const platform = getPlatformFromURI(appPath);

  return platform === Platform.Ios
    ? installAndLaunchIOSAppAsync(appPath, options.deviceId)
    : installAndLaunchAndroidAppAsync(appPath, options.deviceId);
}

async function installAndLaunchIOSAppAsync(appPath: string, deviceId: string) {
  if (
    (await Simulator.getAvailableIosSimulatorsListAsync()).find(({ udid }) => udid === deviceId)
  ) {
    const bundleIdentifier = await Simulator.getAppBundleIdentifierAsync(appPath);
    await Simulator.installAppAsync(deviceId, appPath);
    await Simulator.launchAppAsync(deviceId, bundleIdentifier);
    return;
  }

  const appId = await AppleDevice.getBundleIdentifierForBinaryAsync(appPath);
  await AppleDevice.installOnDeviceAsync({
    bundleIdentifier: appId,
    bundle: appPath,
    appDeltaDirectory: AppleDevice.getAppDeltaDirectory(appId),
    udid: deviceId,
  });
}

async function installAndLaunchAndroidAppAsync(appPath: string, deviceId: string) {
  const device = await Emulator.getRunningDeviceAsync(deviceId);

  await Emulator.installAppAsync(device, appPath);
  const { packageName, activityName } = await Emulator.getAptParametersAsync(appPath);
  await Emulator.startAppAsync(device, packageName, activityName);
}
