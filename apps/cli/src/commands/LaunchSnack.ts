import { Emulator, Simulator, AppleDevice } from 'eas-shared';
import { parseRuntimeUrl } from 'snack-content';

type launchSnackAsyncOptions = {
  platform: 'android' | 'ios';
  deviceId: string;
};

export async function launchSnackAsync(
  snackURL: string,
  { platform, deviceId }: launchSnackAsyncOptions
) {
  const version = await getSDKVersionForSnackUrl(snackURL);

  if (platform === 'android') {
    await launchSnackOnAndroidAsync(snackURL, deviceId, version);
  } else {
    await launchSnackOnIOSAsync(snackURL, deviceId, version);
  }
}

async function launchSnackOnAndroidAsync(snackURL: string, deviceId: string, version?: string) {
  const device = await Emulator.getRunningDeviceAsync(deviceId);

  await Emulator.ensureExpoClientInstalledAsync(device.pid, version);
  await Emulator.openURLAsync({ url: snackURL, pid: device.pid });
}

async function launchSnackOnIOSAsync(snackURL: string, deviceId: string, version?: string) {
  if (await Simulator.isSimulatorAsync(deviceId)) {
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

/** Get SDK version from an EAS Update, or classic updates Snack URL */
function getSDKVersionForSnackUrl(snackURL: string) {
  const snack = parseRuntimeUrl(snackURL);
  if (snack?.sdkVersion) {
    return `${snack.sdkVersion}.0.0`;
  }

  return getSDKVersionForLegacySnackUrl(snackURL);
}

/** Get SDK version from a classic updates Snack url */
async function getSDKVersionForLegacySnackUrl(snackURL: string): Promise<string | undefined> {
  // Attempts to extract sdk version from url. Match "sdk.", followed by one or more digits and dots, before a hyphen
  // e.g. exp://exp.host/@snack/sdk.48.0.0-ChmcDz6VUr
  const versionRegex = /sdk\.([\d.]+)(?=-)/;
  const match = snackURL.match(versionRegex);
  if (match?.[1]) {
    return match[1];
  }

  // For snacks saved to accounts the ID can be `@snack/<hashId>` or `@<username>/<hashId>`.
  const snackIdentifierRegex = /(@[^\/]+\/[^\/+]+)/;
  const snackIdentifier = snackURL.match(snackIdentifierRegex)?.[0];
  if (!snackIdentifier) {
    return;
  }

  const snackId = snackIdentifier.startsWith('@snack/')
    ? snackIdentifier.substring('@snack/'.length)
    : snackIdentifier;

  // Get the SDK version for a specific snack from the Snack API.
  try {
    const response = await fetch(`https://exp.host/--/api/v2/snack/${snackId}`, {
      method: 'GET',
      headers: {
        'Snack-Api-Version': '3.0.0',
      },
    });
    const { sdkVersion }: { sdkVersion: string } = await response.json();

    return sdkVersion;
  } catch (err) {
    console.error(`Failed fetch snack with identifier: ${snackId}`, err);
    throw err;
  }
}
