import { loadAppleId } from './appleAccountAsync';
import { installAndLaunchAppAsync } from './installAndLaunchAppAsync';
import { ResignProgressListener, runResignCliAsync } from './resignAndRetryAsync';
import {
  ResignedAppRecord,
  buildResignedAppId,
  updateResignedApp,
  upsertResignedApp,
} from '../modules/ResignedApps';

export type RenewResult = {
  record: ResignedAppRecord;
  /** Set when Apple refused the old identifier and the app was signed under a new one. */
  previousBundleId?: string;
};

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
): Promise<RenewResult> {
  const attemptedAt = new Date().toISOString();
  updateResignedApp(record.id, { lastAttemptAt: attemptedAt });
  // Renew with the Apple ID that is signed in now: after an account switch the
  // record's original Apple ID has no session anymore, and the app follows the
  // user's current team (which also means a new identifier below).
  const appleId = loadAppleId() ?? record.appleId;
  const result = await runResignCliAsync({
    ipaPath: record.originalIpaPath,
    udid: record.deviceUdid,
    deviceName: record.deviceName,
    appleId,
    stripExtensions: record.stripExtensions,
    onProgress: opts.onProgress,
  });
  // A different team (or Apple refusing the old identifier) yields a new bundle
  // id. The record (and its managed dir) is keyed by it, so rebuild instead of
  // patching; upsertResignedApp drops the old record for the same app + device.
  const identifierChanged = result.bundleId !== record.assignedBundleId;
  const renewed: ResignedAppRecord = {
    ...record,
    id: buildResignedAppId(result.bundleId, record.deviceUdid),
    assignedBundleId: result.bundleId,
    appleId,
    originalIpaPath: result.originalIpaPath ?? record.originalIpaPath,
    recordDirName: result.recordDirName ?? record.recordDirName,
    resignedIpaPath: result.resignedIpaPath,
    iconPath: result.iconPath ?? record.iconPath,
    profileExpiresAt: result.profileExpiresAt,
    lastAttemptAt: attemptedAt,
    lastRenewedAt: new Date().toISOString(),
    pendingInstall: !opts.deviceConnected,
    lastError: undefined,
  };
  upsertResignedApp(renewed);
  if (opts.deviceConnected) {
    await installAndLaunchAppAsync({
      appPath: result.resignedIpaPath,
      deviceId: record.deviceUdid,
      launchURL: record.launchURL,
    });
  }
  return {
    record: renewed,
    previousBundleId: identifierChanged ? record.assignedBundleId : undefined,
  };
}
