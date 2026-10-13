import { AppleDevice } from 'eas-shared';

type UninstallAppOptions = {
  deviceId: string;
  bundleId: string;
};

/**
 * Remove an app from a physical iOS device. The menu bar uses it to free one of
 * the three app slots a free Apple ID gets per device, and to drop the copy of
 * a resigned app whose identifier changed.
 */
export async function uninstallAppAsync(options: UninstallAppOptions) {
  await AppleDevice.uninstallAppAsync({ udid: options.deviceId, bundleId: options.bundleId });
  return { ok: true };
}
