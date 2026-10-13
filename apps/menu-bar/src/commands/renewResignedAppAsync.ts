import { loadAppleId } from './appleAccountAsync';
import { installAndLaunchAppAsync } from './installAndLaunchAppAsync';
import { ResignProgressListener, runResignCliAsync } from './resignAndRetryAsync';
import { uninstallAppAsync } from './uninstallAppAsync';
import Alert from '../modules/Alert';
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
  /** With `previousBundleId`: the user chose to replace the copy signed under it. */
  previousCopyRemoved?: boolean;
};

// A new identifier is a new data container on iOS: replacing the old copy
// resets the app's data on the device, so only the user can decide that.
function confirmReplaceAsync(opts: {
  appName: string;
  deviceName: string;
  previousBundleId: string;
  bundleId: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      `${opts.appName} was signed with a new identifier`,
      `‘${opts.previousBundleId}’ can’t be used with the signed-in Apple ID, so Orbit signed it as ‘${opts.bundleId}’.\n\n` +
        `Replace the copy on ${opts.deviceName}? Its data on the device is reset. ` +
        'Keeping both leaves the old copy, with its data, until its profile expires.',
      [
        { text: 'Keep both', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Replace', style: 'destructive', onPress: () => resolve(true) },
      ]
    );
  });
}

/**
 * Renew one resigned app: re-sign the preserved ORIGINAL ipa (never the
 * resigned output — its rewritten bundle id would register a second App ID and
 * burn free-account quota), then install it when the device is around.
 *
 * Throws on failure; callers own error handling (attention flag / lastError).
 */
export async function renewResignedAppAsync(
  record: ResignedAppRecord,
  opts: {
    deviceConnected: boolean;
    /** The user asked for this renewal, so Orbit may ask them things. */
    interactive?: boolean;
    onProgress?: ResignProgressListener;
  }
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
    // The device still runs the previous profile until the install below goes
    // through; cleared then, so a failed install is retried on reconnect.
    pendingInstall: true,
    active: true,
    lastError: undefined,
  };
  upsertResignedApp(renewed);
  let previousCopyRemoved = false;
  if (opts.deviceConnected) {
    if (identifierChanged && opts.interactive) {
      // Automatic renewals never remove the old copy: that resets the app's
      // data, which is the user's call. They get the new copy next to it and
      // a note about the old one (see useResignedAppRenewals).
      previousCopyRemoved = await confirmReplaceAsync({
        appName: record.appName,
        deviceName: record.deviceName,
        previousBundleId: record.assignedBundleId,
        bundleId: result.bundleId,
      });
      if (previousCopyRemoved) {
        // Best effort — the user can still delete it from the Home Screen.
        await uninstallAppAsync({
          deviceId: record.deviceUdid,
          bundleId: record.assignedBundleId,
        }).catch(() => {});
      }
    }
    await installAndLaunchAppAsync({
      appPath: result.resignedIpaPath,
      deviceId: record.deviceUdid,
      launchURL: record.launchURL,
    });
    updateResignedApp(renewed.id, { pendingInstall: false });
  }
  return {
    record: opts.deviceConnected ? { ...renewed, pendingInstall: false } : renewed,
    previousBundleId: identifierChanged ? record.assignedBundleId : undefined,
    previousCopyRemoved,
  };
}
