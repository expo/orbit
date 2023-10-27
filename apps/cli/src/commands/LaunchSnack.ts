import { Emulator, Simulator, AppleDevice } from 'eas-shared';

type launchSnackAsyncOptions = {
  platform: 'android' | 'ios';
  deviceId: string;
};

export async function launchSnackAsync(
  snackURL: string,
  { platform, deviceId }: launchSnackAsyncOptions
) {
  // Attempts to extract sdk version from url. Match "sdk.", followed by one or more digits and dots, before a hyphen
  // e.g. exp://exp.host/@snack/sdk.48.0.0-ChmcDz6VUr
  const regex = /sdk\.([\d.]+)(?=-)/;
  const match = snackURL.match(regex);
  const version = match ? match[1] : undefined;

  if (platform === 'android') {
    await launchSnackOnAndroidAsync(snackURL, deviceId, version);
  } else {
    await launchSnackOnIOSAsync(snackURL, deviceId, version);
  }
}

async function launchSnackOnAndroidAsync(snackURL: string, deviceId: string, version?: string) {
  const runningEmulators = await Emulator.getRunningDevicesAsync();
  const emulator = runningEmulators.find(({ name }) => name === deviceId);
  if (!emulator?.pid) {
    throw new Error(`No running emulator with name ${deviceId}`);
  }

  await Emulator.ensureExpoClientInstalledAsync(emulator.pid, version);
  await Emulator.openURLAsync({ url: snackURL, pid: emulator.pid });
}

async function launchSnackOnIOSAsync(snackURL: string, deviceId: string, version?: string) {
  if (
    (await Simulator.getAvailableIosSimulatorsListAsync()).find(({ udid }) => udid === deviceId)
  ) {
    await Simulator.ensureExpoClientInstalledAsync(deviceId, version);
    await Simulator.openURLAsync({
      url: snackURL,
      udid: deviceId,
    });
    return;
  }

  await AppleDevice.ensureExpoClientInstalledAsync(deviceId);
  await AppleDevice.openSnackURLAsync(deviceId, snackURL);
}
