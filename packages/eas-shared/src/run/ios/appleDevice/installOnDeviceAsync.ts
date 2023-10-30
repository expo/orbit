import os from 'os';
import path from 'path';

import * as AppleDevice from './AppleDevice';
import { ensureDirectory } from '../../../utils/dir';
import { InternalError } from 'common-types';

/** Get the app_delta folder for faster subsequent rebuilds on devices. */
export function getAppDeltaDirectory(bundleId: string): string {
  // TODO: Maybe use .expo folder instead for debugging
  // TODO: Reuse existing folder from xcode?
  const deltaFolder = path.join(os.tmpdir(), 'ios', 'app-delta', bundleId);
  ensureDirectory(deltaFolder);
  return deltaFolder;
}

/**
 * Wraps the apple device method for installing and running an app,
 * adds indicator and retry loop for when the device is locked.
 */
export async function installOnDeviceAsync(props: {
  bundle: string;
  bundleIdentifier: string;
  appDeltaDirectory: string;
  udid: string;
}): Promise<void> {
  const { bundle, bundleIdentifier, appDeltaDirectory, udid } = props;

  try {
    // TODO: Connect for logs
    await AppleDevice.runOnDevice({
      udid,
      appPath: bundle,
      bundleId: bundleIdentifier,
      waitForApp: false,
      deltaPath: appDeltaDirectory,
      onProgress({ status, progress }: { status: string; isComplete: boolean; progress: number }) {
        console.log(`status: ${status} ${progress}%`);
      },
    });
  } catch (error: any) {
    if (error.code === 'APPLE_DEVICE_LOCKED') {
      // Get the app name from the binary path.
      const appName = path.basename(bundle).split('.')[0] ?? 'app';
      throw new InternalError(
        'APPLE_DEVICE_LOCKED',
        `Unable to launch ${appName} because the device is locked. Please launch the app manually.`
      );
    } else if (error.code === 'APPLE_APP_VERIFICATION_FAILED') {
      // Get the app name from the binary path.
      const appName = path.basename(bundle).split('.')[0] ?? 'app';
      throw new InternalError(
        'APPLE_APP_VERIFICATION_FAILED',
        `Failed to verify code signature of ${appName}`
      );
    }

    throw error;
  }
}
