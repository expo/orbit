import type { ExpoUpdatesManifest } from '@expo/config';
import { Emulator, Simulator, AppleDevice } from 'eas-shared';
import assert from 'node:assert';

type ExpoGoPlatform = 'android' | 'ios';

type LaunchExpoGoAsyncOptions = {
  platform: ExpoGoPlatform;
  deviceId: string;
  /** The Expo SDK version to use when preparing Expo Go, fetches the SDK version from dev server by default. */
  sdkVersion?: string;
};

export async function launchExpoGoAsync(
  devServerUrl: string,
  { deviceId, platform, sdkVersion: defaultSdkVersion }: LaunchExpoGoAsyncOptions
) {
  const sdkVersion = defaultSdkVersion ?? await getSDKVersionFromDevServerUrl(devServerUrl, platform);

  switch (platform) {
    case 'android':
      return launchExpoGoOnAndroidAsync(devServerUrl, deviceId, sdkVersion);
    case 'ios':
      return launchExpoGoOnIosAsync(devServerUrl, deviceId, sdkVersion);
    default:
      throw new Error(`Unsupported Expo Go platform: ${platform}`);
  }
}

async function launchExpoGoOnAndroidAsync(
  devServerUrl: string,
  deviceId: string,
  sdkVersion: string
) {
  const device = await Emulator.getRunningDeviceAsync(deviceId);

  await Emulator.ensureExpoClientInstalledAsync(device.pid, sdkVersion);
  await Emulator.openURLAsync({ url: devServerUrl, pid: device.pid });
}

async function launchExpoGoOnIosAsync(devServerUrl: string, deviceId: string, sdkVersion: string) {
  if (await Simulator.isSimulatorAsync(deviceId)) {
    await Simulator.ensureExpoClientInstalledAsync(deviceId, sdkVersion);
    await Simulator.openURLAsync({ url: devServerUrl, udid: deviceId });
    return;
  }

  await AppleDevice.ensureExpoClientInstalledAsync(deviceId);
  await AppleDevice.openSnackURLAsync(deviceId, devServerUrl);
}

/** Get SDK version from the dev server URL */
async function getSDKVersionFromDevServerUrl(devServerUrl: string, platform: ExpoGoPlatform) {
  const response = await fetch(devServerUrl, {
    method: 'GET',
    headers: {
      'Expo-Platform': platform,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Could not fetch Expo SDK version from the dev server, received status: ${response.status}`
    );
  }

  const manifest: ExpoUpdatesManifest = await response.json();
  const sdkVersion = manifest.extra.expoClient?.sdkVersion;
  assert(
    sdkVersion,
    'Expo dev server replied with an unknown format, missing "extra.expoClient.sdkVersion"'
  );

  return sdkVersion;
}
