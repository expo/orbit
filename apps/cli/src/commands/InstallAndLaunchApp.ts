import {
  Emulator,
  Simulator,
  extractAppFromLocalArchiveAsync,
  AppleDevice,
  detectIOSAppType,
} from 'eas-shared';
import { Platform } from 'common-types/build/cli-commands';

import { getPlatformFromURI } from '../utils';

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
  const appType = await detectIOSAppType(appPath);

  if (await Simulator.isSimulatorAsync(deviceId)) {
    if (appType === 'device') {
      throw new Error(
        "iOS device builds can't be installed on simulators. Either use a physical device or generate a new simulator build."
      );
    }

    const bundleIdentifier = await Simulator.getAppBundleIdentifierAsync(appPath);
    await Simulator.installAppAsync(deviceId, appPath);
    await Simulator.launchAppAsync(deviceId, bundleIdentifier);
    return;
  }

  if (appType === 'simulator') {
    throw new Error(
      "iOS simulator builds can't be installed on real devices. Either use a simulator or generate an internal distribution build."
    );
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

  const { packageName, activityName } = await Emulator.getAptParametersAsync(appPath);
  try {
    await Emulator.installAppAsync(device, appPath);
  } catch (error) {
    if (error instanceof Error && error.message.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE')) {
      await Emulator.uninstallAppAsync(device, packageName);
      await Emulator.installAppAsync(device, appPath);
    } else {
      throw error;
    }
  }

  await Emulator.startAppAsync(device, packageName, activityName);
}
