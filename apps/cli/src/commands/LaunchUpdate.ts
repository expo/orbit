import { Emulator, Simulator, ManifestUtils, Manifest } from 'eas-shared';

import { graphqlSdk } from '../api/GraphqlClient';
import { AppPlatform, DistributionType } from '../graphql/generated/graphql';
import { downloadBuildAsync } from './DownloadBuild';
import { InternalError } from 'common-types';
import { ClientError } from 'graphql-request';

type launchUpdateAsyncOptions = {
  platform: 'android' | 'ios';
  deviceId: string;
  skipInstall: boolean;
};

export async function launchUpdateAsync(
  updateURL: string,
  { platform, deviceId, skipInstall }: launchUpdateAsyncOptions
) {
  const { manifest } = await ManifestUtils.getManifestAsync(updateURL);
  const appId = manifest.extra?.eas?.projectId;
  if (!appId) {
    throw new Error("Couldn't find EAS projectId in manifest");
  }
  let appIdentifier: string | undefined;

  if (skipInstall) {
    if (platform === 'android') {
      const device = await Emulator.getRunningDeviceAsync(deviceId);
      await Emulator.openURLAsync({ url: getUpdateDeeplink(updateURL, manifest), pid: device.pid });
    } else {
      await Simulator.openURLAsync({
        url: getUpdateDeeplink(updateURL, manifest),
        udid: deviceId,
      });
    }
    return;
  }

  try {
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

    if (
      app.byId.hasDevClientBuilds.edges[0]?.node.__typename === 'Build' &&
      app.byId.hasDevClientBuilds.edges[0]?.node?.appIdentifier
    ) {
      appIdentifier = app.byId.hasDevClientBuilds.edges[0]?.node?.appIdentifier;
    }
  } catch (error) {
    if (error instanceof ClientError) {
      if (error.message.includes('Entity not authorized')) {
        throw new InternalError(
          'UNAUTHORIZED_ACCOUNT',
          `Make sure the logged in account has access to project ${appId}`
        );
      }
    }
    throw error;
  }

  if (platform === 'android') {
    await launchUpdateOnAndroidAsync(updateURL, manifest, deviceId, appIdentifier);
  } else {
    await launchUpdateOnIOSAsync(updateURL, manifest, deviceId, appIdentifier);
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

async function launchUpdateOnAndroidAsync(
  updateURL: string,
  manifest: Manifest,
  deviceId: string,
  appIdentifier?: string
) {
  const device = await Emulator.getRunningDeviceAsync(deviceId);

  await downloadAndInstallLatestDevBuildAsync({
    deviceId,
    manifest,
    platform: AppPlatform.Android,
    distribution: DistributionType.Internal,
    appIdentifier,
  });
  await Emulator.openURLAsync({ url: getUpdateDeeplink(updateURL, manifest), pid: device.pid });
}

async function launchUpdateOnIOSAsync(
  updateURL: string,
  manifest: Manifest,
  deviceId: string,
  appIdentifier?: string
) {
  const isSimulator = await Simulator.isSimulatorAsync(deviceId);
  if (!isSimulator) {
    throw new Error('Launching updates on iOS physical is not supported yet');
  }

  await downloadAndInstallLatestDevBuildAsync({
    deviceId,
    manifest,
    platform: AppPlatform.Ios,
    distribution: DistributionType.Simulator,
    appIdentifier,
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
  appIdentifier,
}: {
  deviceId: string;
  manifest: Manifest;
  platform: AppPlatform;
  distribution: DistributionType;
  appIdentifier?: string;
}) {
  const build = await getBuildArtifactsForUpdateAsync({
    manifest,
    platform,
    distribution,
  });

  if (build && build.url && !build.expired) {
    const buildLocalPath = await downloadBuildAsync(build.url);

    if (platform === AppPlatform.Ios) {
      await Simulator.installAppAsync(deviceId, buildLocalPath);
    } else {
      const device = await Emulator.getRunningDeviceAsync(deviceId);
      await Emulator.installAppAsync(device, buildLocalPath);
    }
    return;
  }

  // EAS Build not available, check if the app is installed locally
  const bundleId = build?.appIdentifier ?? appIdentifier;
  if (!bundleId) {
    throw new NoDevBuildsError(manifest.extra?.expoClient?.name, manifest.runtimeVersion);
  }

  if (platform === AppPlatform.Ios) {
    const isInstalled = await Simulator.checkIfAppIsInstalled({
      udid: deviceId,
      bundleId,
    });

    // check if app is compatible with the current runtime
    if (isInstalled) {
      const supportsUpdate = await Simulator.checkIfAppSupportsLaunchingUpdate({
        udid: deviceId,
        bundleIdentifier: bundleId,
        runtimeVersion: manifest.runtimeVersion,
      });

      if (supportsUpdate) {
        // App is already installed and compatible with the update runtime
        return;
      }
    }

    throw new NoDevBuildsError(manifest.extra?.expoClient?.name, manifest.runtimeVersion);
  } else {
    const device = await Emulator.getRunningDeviceAsync(deviceId);
    const isInstalled = await Emulator.checkIfAppIsInstalled({
      pid: device.pid,
      bundleId,
    });

    if (isInstalled) {
      const supportsUpdate = await Emulator.checkIfAppSupportsLaunchingUpdate({
        pid: device.pid,
        bundleId,
        runtimeVersion: manifest.runtimeVersion,
      });

      if (supportsUpdate) {
        // App is already installed and compatible with the update runtime
        return;
      }
    }

    throw new NoDevBuildsError(manifest.extra?.expoClient?.name, manifest.runtimeVersion);
  }
}

async function getBuildArtifactsForUpdateAsync({
  manifest,
  platform,
  distribution,
}: {
  manifest: Manifest;
  platform: AppPlatform;
  distribution: DistributionType;
}) {
  const { app } = await graphqlSdk.getAppBuildForUpdate({
    runtimeVersion: manifest.runtimeVersion,
    appId: manifest.extra?.eas?.projectId ?? '',
    platform,
    distribution,
  });

  const build = app?.byId?.buildsPaginated?.edges?.[0]?.node;
  if (build?.__typename === 'Build' && build.artifacts?.buildUrl) {
    return {
      url: build.artifacts.buildUrl,
      appIdentifier: build.appIdentifier,
      expired: Date.now() > Date.parse(build.expirationDate),
    };
  }

  return null;
}

class NoDevBuildsError extends InternalError {
  constructor(projectName?: string, runtimeVersion?: string) {
    super(
      'NO_DEVELOPMENT_BUILDS_AVAILABLE',
      `No Development Builds available for ${
        projectName ?? 'your project '
      } (Runtime version ${runtimeVersion}) on EAS.`
    );
  }
}
