import {
  Emulator,
  Simulator,
  extractAppFromLocalArchiveAsync,
  AppleDevice,
  detectAppleAppType,
} from 'eas-shared';
import { Platform } from 'common-types/build/cli-commands';
import { InternalError } from 'common-types';

import { getPlatformFromURI } from '../utils';

type InstallAndLaunchAppAsyncOptions = {
  appPath: string;
  deviceId?: string;
  launchUrl?: string;
  forceSimulator?: boolean;
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
    ? installAndLaunchIOSAppAsync(
        appPath,
        options.deviceId,
        options.launchUrl,
        options.forceSimulator
      )
    : installAndLaunchAndroidAppAsync(appPath, options.deviceId, options.launchUrl);
}

async function installAndLaunchIOSAppAsync(
  appPath: string,
  deviceId: string,
  launchURL?: string,
  forceSimulator?: boolean
) {
  const appInfo = await detectAppleAppType(appPath);

  // Simulators only exist on macOS, and `isSimulatorAsync` shells out to `simctl`
  // (macOS only). On Windows/Linux a device id always refers to a physical device.
  const isSimulator = process.platform === 'darwin' && (await Simulator.isSimulatorAsync(deviceId));

  if (isSimulator) {
    let simulatorAppPath = appPath;
    if (appInfo.deviceType === 'device') {
      if (!forceSimulator) {
        throw new InternalError(
          'DEVICE_BUILD_ON_SIMULATOR',
          "Apps built to target physical devices can't be installed on simulators. Either use a physical device or generate a new simulator build."
        );
      }
      // Experimental: re-tag and re-sign the device build so it can run on the
      // simulator. The conversion works on a copy, leaving the original intact.
      simulatorAppPath = await Simulator.convertDeviceAppToSimulatorAsync(appPath);
    }

    const bundleIdentifier = await Simulator.getAppBundleIdentifierAsync(simulatorAppPath);
    await Simulator.installAppAsync(deviceId, simulatorAppPath);

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
