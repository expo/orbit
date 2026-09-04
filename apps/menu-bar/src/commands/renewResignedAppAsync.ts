import { installAndLaunchAppAsync } from './installAndLaunchAppAsync';
import { ResignProgressListener, runResignCliAsync } from './resignAndRetryAsync';
import { ResignedAppRecord, updateResignedApp } from '../modules/ResignedApps';

/**
 * Renew one resigned app: re-sign the preserved ORIGINAL ipa (never the
 * resigned output — its rewritten bundle id would register a second App ID and
 * burn free-account quota), then install it when the device is around.
 *
 * Throws on failure; callers own error handling (attention flag / lastError).
 */
export async function renewResignedAppAsync(
  record: ResignedAppRecord,
  opts: { deviceConnected: boolean; onProgress?: ResignProgressListener }
): Promise<void> {
  updateResignedApp(record.id, { lastAttemptAt: new Date().toISOString() });
  const result = await runResignCliAsync({
    ipaPath: record.originalIpaPath,
    udid: record.deviceUdid,
    deviceName: record.deviceName,
    appleId: record.appleId,
    stripExtensions: record.stripExtensions,
    onProgress: opts.onProgress,
  });
  updateResignedApp(record.id, {
    resignedIpaPath: result.resignedIpaPath,
    profileExpiresAt: result.profileExpiresAt,
    lastRenewedAt: new Date().toISOString(),
    pendingInstall: !opts.deviceConnected,
    lastError: undefined,
  });
  if (opts.deviceConnected) {
    await installAndLaunchAppAsync({
      appPath: result.resignedIpaPath,
      deviceId: record.deviceUdid,
      launchURL: record.launchURL,
    });
  }
}
