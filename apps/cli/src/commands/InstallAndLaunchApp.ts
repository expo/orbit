import {
  Emulator,
  Simulator,
  extractAppFromLocalArchiveAsync,
  AppleDevice,
  detectAppleAppType,
} from 'eas-shared';
import { Platform } from 'common-types/build/cli-commands';

import { getPlatformFromURI } from '../utils';

type InstallAndLaunchAppAsyncOptions = {
  appPath: string;
  deviceId?: string;
  launchUrl?: string;
};

export async function installAndLaunchAppAsync(options: InstallAndLaunchAppAsyncOptions) {
  let appPath = options.appPath;
  if (!appPath.endsWith('.app') && !appPath.endsWith('.apk')) {
    appPath = await extractAppFromLocalArchiveAsync(appPath);
  }

  if (!options.deviceId) {
    return installAndLaunchMacOSAppAsync(appPath, options.launchUrl);
  }

  const platform = getPlatformFromURI(appPath);

  return platform === Platform.Ios
    ? installAndLaunchIOSAppAsync(appPath, options.deviceId, options.launchUrl)
    : installAndLaunchAndroidAppAsync(appPath, options.deviceId, options.launchUrl);
}

async function installAndLaunchIOSAppAsync(appPath: string, deviceId: string, launchURL?: string) {
  const appInfo = await detectAppleAppType(appPath);

  if (await Simulator.isSimulatorAsync(deviceId)) {
    if (appInfo.deviceType === 'device') {
      throw new Error(
        "Apps built to target physical devices can't be installed on simulators. Either use a physical device or generate a new simulator build."
      );
    }

    const bundleIdentifier = await Simulator.getAppBundleIdentifierAsync(appPath);
    await Simulator.installAppAsync(deviceId, appPath);

    if (launchURL) {
      try {
        await Simulator.openURLAsync({ udid: deviceId, url: launchURL });
        return;
      } catch {
        // Fall back to normal launch
      }
    }
    await Simulator.launchAppAsync(deviceId, bundleIdentifier);
    return;
  }

  if (appInfo.deviceType === 'simulator') {
    throw new Error(
      "Simulator builds can't be installed on physical devices. Either use a simulator or generate an internal distribution build."
    );
  }
  const appId = await AppleDevice.getBundleIdentifierForBinaryAsync(appPath);
  await AppleDevice.installOnDeviceAsync({
    bundleIdentifier: appId,
    bundle: appPath,
    appDeltaDirectory: AppleDevice.getAppDeltaDirectory(appId),
    udid: deviceId,
  });

  if (launchURL) {
    try {
      await AppleDevice.openURLAsync({ udid: deviceId, url: launchURL, bundleId: appId });
      return;
    } catch {
      // Fall back — device install doesn't have a separate launch step
    }
  }
}

async function installAndLaunchMacOSAppAsync(appPath: string, launchURL?: string) {
  const destination = await AppleDevice.installOnMacOSAsync(appPath);

  if (launchURL) {
    try {
      await AppleDevice.launchOnMacOSAsync(destination, launchURL);
      return;
    } catch {
      // Fall back to normal launch
    }
  }
  await AppleDevice.launchOnMacOSAsync(destination);
}

async function installAndLaunchAndroidAppAsync(
  appPath: string,
  deviceId: string,
  launchURL?: string
) {
  const device = await Emulator.getRunningDeviceAsync(deviceId);

  const { packageName, activityName } = await Emulator.getAptParametersAsync(appPath);
  try {
    await Emulator.installAppAsync(device, appPath);
  } catch (error) {
    if (error instanceof Error && error.message.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE')) {
      await Emulator.uninstallAppAsync(device, packageName);
      await Emulator.installAppAsync(device, appPath);
    } else if (error instanceof Error && error.message.includes('device unauthorized')) {
      throw new Error(
        'This device has not authorized USB debugging for this computer. ' +
          'Please check for an authorization dialog on your device and tap "Allow", ' +
          "then try again. If no dialog appears, try running 'adb kill-server' and reconnecting the device."
      );
    } else {
      throw error;
    }
  }

  if (launchURL) {
    try {
      await Emulator.openURLAsync({ pid: device.pid, url: launchURL });
      return;
    } catch {
      // Fall back to normal launch
    }
  }
  await Emulator.startAppAsync(device, packageName, activityName);
}
