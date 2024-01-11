import type { ExpoConfig } from '@expo/config';
import getenv from 'getenv';
import path from 'path';
import semver from 'semver';

import ApiV2Client from './api/APIV2';
import * as FsCache from './tools/FsCache';
import { InternalError } from 'common-types';

export type SDKVersion = {
  androidExpoViewUrl?: string;
  expoReactNativeTag: string;
  expokitNpmPackage?: string;
  facebookReactNativeVersion: string;
  facebookReactVersion?: string;
  iosExpoViewUrl?: string;
  iosVersion?: string;
  isDeprecated?: boolean;
  packagesToInstallWhenEjecting?: { [name: string]: string };
  releaseNoteUrl?: string;
  iosClientUrl?: string;
  iosClientVersion?: string;
  androidClientUrl?: string;
  androidClientVersion?: string;
  relatedPackages?: { [name: string]: string };
  beta?: boolean;
};

export type SDKVersions = { [version: string]: SDKVersion };
type TurtleSDKVersionsOld = { android: string; ios: string };

type Versions = {
  androidUrl: string;
  androidVersion: string;
  androidClientVersion: string;
  iosUrl: string;
  iosVersion: string;
  sdkVersions: SDKVersions;
  turtleSdkVersions: TurtleSDKVersionsOld;
};

export async function versionsAsync(options?: { skipCache?: boolean }): Promise<Versions> {
  const api = new ApiV2Client();
  const versionCache = new FsCache.Cacher(
    () => api.getAsync('versions/latest'),
    'versions.json',
    0,
    path.join(__dirname, '../caches/versions.json')
  );

  // Clear cache when opting in to beta because things can change quickly in beta
  if (getenv.boolish('EXPO_BETA', false) || options?.skipCache) {
    versionCache.clearAsync();
  }

  return await versionCache.getAsync();
}

export async function sdkVersionsAsync(): Promise<SDKVersions> {
  const { sdkVersions } = await versionsAsync();
  return sdkVersions;
}

export function lteSdkVersion(
  expJson: Pick<ExpoConfig, 'sdkVersion'>,
  sdkVersion: string
): boolean {
  if (!expJson.sdkVersion) {
    return false;
  }

  if (expJson.sdkVersion === 'UNVERSIONED') {
    return false;
  }

  try {
    return semver.lte(expJson.sdkVersion, sdkVersion);
  } catch {
    throw new InternalError(
      'INVALID_VERSION',
      `${expJson.sdkVersion} is not a valid version. Must be in the form of x.y.z`
    );
  }
}
