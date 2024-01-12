import { Emulator, Simulator, AppleDevice } from 'eas-shared';
import { ManifestUtils, Manifest } from 'eas-shared';

type launchUpdateAsyncOptions = {
  platform: 'android' | 'ios';
  deviceId: string;
};

export async function launchUpdateAsync(
  updateURL: string,
  { platform, deviceId }: launchUpdateAsyncOptions
) {
  const { manifest } = await ManifestUtils.getManifestAsync(updateURL);

  if (platform === 'android') {
    await launchUpdateOnAndroidAsync(updateURL, manifest, deviceId);
  } else {
    await launchUpdateOnIOSAsync(updateURL, manifest, deviceId);
  }
}

async function launchUpdateOnAndroidAsync(updateURL: string, manifest: Manifest, deviceId: string) {
  const runningEmulators = await Emulator.getRunningDevicesAsync();
  const emulator = runningEmulators.find(({ name }) => name === deviceId);
  if (!emulator?.pid) {
    throw new Error(`No running emulator with name ${deviceId}`);
  }

  const bundleId = manifest.extra?.expoClient?.android?.package;

  if (bundleId) {
    const isAppInstalled = await Emulator.checkIfAppIsInstalled({ pid: emulator.pid, bundleId });
    if (!isAppInstalled) {
      // Find latest dev build on EAS
    }
  } else {
    const version = manifest.extra?.expoClient?.sdkVersion;
    await Emulator.ensureExpoClientInstalledAsync(emulator.pid, version);
  }
  await Emulator.openURLAsync({ url: updateURL, pid: emulator.pid });
}

async function launchUpdateOnIOSAsync(updateURL: string, manifest: Manifest, deviceId: string) {
  const isSimulator = (await Simulator.getAvailableIosSimulatorsListAsync()).find(
    ({ udid }) => udid === deviceId
  );

  if (isSimulator) {
    await launchUpdateOnIOSSimulatorAsync(updateURL, manifest, deviceId);
  } else {
    await launchUpdateOnIOSDeviceAsync(updateURL, manifest, deviceId);
  }
}

async function launchUpdateOnIOSSimulatorAsync(
  updateURL: string,
  manifest: Manifest,
  deviceId: string
) {
  const bundleId = manifest.extra?.expoClient?.ios?.bundleIdentifier;
  if (bundleId) {
    const isAppInstalled = await Simulator.checkIfAppIsInstalled({ udid: deviceId, bundleId });
    if (!isAppInstalled) {
      // Find latest dev build on EAS
    }
  } else {
    const version = manifest.extra?.expoClient?.sdkVersion;
    await Simulator.ensureExpoClientInstalledAsync(deviceId, version);
  }

  const url = getUpdateDeeplink(updateURL, manifest);
  await Simulator.openURLAsync({
    url,
    udid: deviceId,
  });
}

async function launchUpdateOnIOSDeviceAsync(
  updateURL: string,
  manifest: Manifest,
  deviceId: string
) {
  const bundleId = manifest.extra?.expoClient?.ios?.bundleIdentifier;
  if (bundleId) {
    const isAppInstalled = await AppleDevice.checkIfAppIsInstalled({ udid: deviceId, bundleId });
    if (!isAppInstalled) {
      // Find latest dev build on EAS
    }

    await AppleDevice.openURLAsync({ udid: deviceId, bundleId, url: updateURL });
  } else {
    await AppleDevice.ensureExpoClientInstalledAsync(deviceId);
    await AppleDevice.openSnackURLAsync(deviceId, updateURL);
  }
}

function getUpdateDeeplink(updateURL: string, manifest: Manifest) {
  const scheme = Array.isArray(manifest?.extra?.expoClient?.scheme)
    ? manifest?.extra?.expoClient?.scheme[0]
    : manifest?.extra?.expoClient?.scheme;
  scheme;

  if (scheme) {
    return `${scheme}://expo-development-client/?url=${updateURL}`;
  }

  return updateURL.replace('https://', 'exp://');
}
