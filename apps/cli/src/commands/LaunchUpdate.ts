import { Emulator, Simulator, ManifestUtils, Manifest } from 'eas-shared';

import { graphqlSdk } from '../api/GraphqlClient';
import { AppPlatform, DistributionType } from '../graphql/generated/graphql';
import { downloadBuildAsync } from './DownloadBuild';

type launchUpdateAsyncOptions = {
  platform: 'android' | 'ios';
  deviceId: string;
};

export async function launchUpdateAsync(
  updateURL: string,
  { platform, deviceId }: launchUpdateAsyncOptions
) {
  const { manifest } = await ManifestUtils.getManifestAsync(updateURL);
  const appId = manifest.extra?.eas?.projectId;
  if (!appId) {
    throw new Error("Couldn't find EAS projectId in manifest");
  }

  /**
   * Fetch EAS to check if the app uses expo-dev-client
   * or if we should launch the update using Expo Go
   */
  const { app } = await graphqlSdk.getAppHasDevClientBuilds({ appId });
  const hasDevClientBuilds = Boolean(app.byId.hasDevClientBuilds.edges.length);
  const isRuntimeCompatibleWithExpoGo = manifest.runtimeVersion.startsWith('exposdk:');

  if (!hasDevClientBuilds && isRuntimeCompatibleWithExpoGo) {
    const sdkVersion = manifest.runtimeVersion.match(/exposdk:(\d+\.\d+\.\d+)/)?.[1] || '';
    const launchOnExpoGo =
      platform === 'android' ? launchUpdateOnExpoGoAndroidAsync : launchUpdateOnExpoGoIosAsync;
    return await launchOnExpoGo({
      sdkVersion,
      url: getExpoGoUpdateDeeplink(updateURL, manifest),
      deviceId,
    });
  }

  if (platform === 'android') {
    await launchUpdateOnAndroidAsync(updateURL, manifest, deviceId);
  } else {
    await launchUpdateOnIOSAsync(updateURL, manifest, deviceId);
  }
}

type LaunchUpdateOnExpoGoOptions = {
  deviceId: string;
  url: string;
  sdkVersion: string;
};

async function launchUpdateOnExpoGoAndroidAsync({
  sdkVersion,
  deviceId,
  url,
}: LaunchUpdateOnExpoGoOptions) {
  const device = await Emulator.getRunningDeviceAsync(deviceId);

  await Emulator.ensureExpoClientInstalledAsync(device.pid, sdkVersion);
  await Emulator.openURLAsync({ url, pid: device.pid });
}

async function launchUpdateOnExpoGoIosAsync({
  sdkVersion,
  deviceId,
  url,
}: LaunchUpdateOnExpoGoOptions) {
  const isSimulator = await Simulator.isSimulatorAsync(deviceId);
  if (!isSimulator) {
    throw new Error('Launching updates on iOS physical devices is not supported yet');
  }

  await Simulator.ensureExpoClientInstalledAsync(deviceId, sdkVersion);
  await Simulator.openURLAsync({
    url,
    udid: deviceId,
  });
}

async function launchUpdateOnAndroidAsync(updateURL: string, manifest: Manifest, deviceId: string) {
  const device = await Emulator.getRunningDeviceAsync(deviceId);

  await downloadAndInstallLatestDevBuildAsync({
    deviceId,
    manifest,
    platform: AppPlatform.Android,
    distribution: DistributionType.Internal,
  });
  await Emulator.openURLAsync({ url: getUpdateDeeplink(updateURL, manifest), pid: device.pid });
}

async function launchUpdateOnIOSAsync(updateURL: string, manifest: Manifest, deviceId: string) {
  const isSimulator = await Simulator.isSimulatorAsync(deviceId);
  if (!isSimulator) {
    throw new Error('Launching updates on iOS physical is not supported yet');
  }

  await downloadAndInstallLatestDevBuildAsync({
    deviceId,
    manifest,
    platform: AppPlatform.Ios,
    distribution: DistributionType.Simulator,
  });

  await Simulator.openURLAsync({
    url: getUpdateDeeplink(updateURL, manifest),
    udid: deviceId,
  });
}

function getExpoGoUpdateDeeplink(updateURL: string, manifest: Manifest) {
  if (updateURL.startsWith('https://u.expo.dev')) {
    return `exp://u.expo.dev/update/${manifest.id}`;
  }
  return updateURL.replace('https://', 'exp://');
}

function getUpdateDeeplink(updateURL: string, manifest: Manifest) {
  const updateIdURL = updateURL.startsWith('https://u.expo.dev')
    ? `https://u.expo.dev/update/${manifest.id}`
    : updateURL;

  const scheme = Array.isArray(manifest?.extra?.expoClient?.scheme)
    ? manifest?.extra?.expoClient?.scheme[0]
    : manifest?.extra?.expoClient?.scheme;
  scheme;
  const slug = manifest?.extra?.expoClient?.slug;

  if (!scheme && !slug) {
    throw new Error('Unable to resolve schema from manifest');
  }

  return `${scheme || `exp+${slug}`}://expo-development-client/?url=${updateIdURL}`;
}

async function downloadAndInstallLatestDevBuildAsync({
  deviceId,
  manifest,
  platform,
  distribution,
}: {
  deviceId: string;
  manifest: Manifest;
  platform: AppPlatform;
  distribution: DistributionType;
}) {
  const buildArtifactsURL = await getBuildArtifactsURLForUpdateAsync({
    manifest,
    platform,
    distribution,
  });
  const buildLocalPath = await downloadBuildAsync(buildArtifactsURL);

  if (platform === AppPlatform.Ios) {
    await Simulator.installAppAsync(deviceId, buildLocalPath);
  } else {
    const device = await Emulator.getRunningDeviceAsync(deviceId);
    await Emulator.installAppAsync(device, buildLocalPath);
  }
}

async function getBuildArtifactsURLForUpdateAsync({
  manifest,
  platform,
  distribution,
}: {
  manifest: Manifest;
  platform: AppPlatform;
  distribution: DistributionType;
}): Promise<string> {
  const { app } = await graphqlSdk.getAppBuildForUpdate({
    // TODO(gabrieldonadel): Add runtimeVersion filter
    appId: manifest.extra?.eas?.projectId ?? '',
    platform,
    distribution,
  });

  const build = app?.byId?.buildsPaginated?.edges?.[0]?.node;
  if (
    build.__typename === 'Build' &&
    build.expirationDate &&
    new Date(build.expirationDate) > new Date() &&
    build.artifacts?.buildUrl
  ) {
    return build.artifacts.buildUrl;
  }

  throw new Error(
    `No Development Builds available for ${manifest.extra?.expoClient?.name}. Please generate a new build`
  );
}
