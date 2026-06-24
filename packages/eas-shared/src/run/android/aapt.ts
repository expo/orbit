import spawnAsync, { SpawnResult } from '@expo/spawn-async';
import glob from 'fast-glob';
import path from 'path';

import { readApkManifestParametersAsync } from './apkManifest';
import { getAndroidSdkRootAsync } from './sdk';
import Log from '../../log';

// Failures here (e.g. no SDK build-tools installed) are expected and handled by
// the JS manifest fallback in getAptParametersAsync, so just let them propagate.
async function aaptAsync(...options: string[]): Promise<SpawnResult> {
  return spawnAsync(await getAaptExecutableAsync(), options);
}

async function getAaptExecutableAsync(): Promise<string> {
  const sdkRoot = await getAndroidSdkRootAsync();
  if (!sdkRoot) {
    Log.debug('Failed to resolve the Android SDK path, falling back to global aapt executable');
    return 'aapt';
  }
  const aaptPaths = await glob(
    path.posix.join('build-tools/**', process.platform === 'win32' ? 'aapt.exe' : 'aapt'),
    { cwd: sdkRoot, absolute: true }
  );

  if (aaptPaths.length === 0) {
    throw new Error('Failed to resolve the Android aapt path');
  }
  const sorted = aaptPaths.sort();
  return sorted[sorted.length - 1];
}

export type AptParameters = { packageName: string; activityName?: string };

/**
 * Read the package name and launchable activity from an APK.
 *
 * Prefer `aapt` when the SDK build-tools are available, and fall back to reading APK manifest
 * directly in JS.
 */
export async function getAptParametersAsync(appPath: string): Promise<AptParameters> {
  try {
    return await readAptParametersWithAaptAsync(appPath);
  } catch (error) {
    Log.debug(
      `Failed to read package info with aapt, falling back to the APK manifest: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return await readApkManifestParametersAsync(appPath);
  }
}

async function readAptParametersWithAaptAsync(appPath: string): Promise<AptParameters> {
  const { stdout } = await aaptAsync('dump', 'badging', appPath);

  const packageNameMatch = stdout.match(/package: name='([^']+)'/);
  if (!packageNameMatch) {
    throw new Error(`Could not read package name from ${appPath}`);
  }

  // get activity name
  const activityNameMatch = stdout.match(/launchable-activity: name='([^']+)'/);

  return {
    packageName: packageNameMatch[1],
    activityName: activityNameMatch?.[1],
  };
}
