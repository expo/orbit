import { AppleResignUnsupportedIpaErrorDetails, InternalError } from 'common-types';

import {
  AUTH_REASON_KEY,
  forgetAppleIdSession,
  hasShownTrustInstructions,
  loadAppleId,
  markTrustInstructionsShown,
} from './appleAccountAsync';
import { installAndLaunchAppAsync } from './installAndLaunchAppAsync';
import Alert from '../modules/Alert';
import MenuBarModule from '../modules/MenuBarModule';
import {
  ResignedAppRecord,
  buildResignedAppId,
  getResignedAppsDirectory,
  stripOrbitSuffix,
  upsertResignedApp,
} from '../modules/ResignedApps';
import { getUserPreferences, storage } from '../modules/Storage';
import {
  APPLE_APP_IDS_DONE_EVENT,
  AppleAppIdsDoneEvent,
  AppleAppIdsEmitter,
} from '../utils/appleAppIdsEvents';
import { AppleAuthCompletedEvent, waitForAppleAuthCompleteAsync } from '../utils/appleAuthEvents';
import { parseCliJsonResult } from '../utils/helpers';
import { describeResignError } from '../utils/resignErrorCopy';
import { WindowsNavigator } from '../windows';

export type ResignCliResult = {
  resignedIpaPath: string;
  originalIpaPath?: string;
  recordDirName?: string;
  bundleId: string;
  profileExpiresAt: string;
  strippedEntitlements?: string[];
};

export type ResignProgressListener = (step: string, detail?: string) => void;

/**
 * Run the `resign-ipa` CLI command. Shared by the interactive resign flow and
 * the automatic 7-day renewal engine.
 */
export async function runResignCliAsync(opts: {
  ipaPath: string;
  udid: string;
  deviceName: string;
  appleId: string;
  stripExtensions: boolean;
  onProgress?: ResignProgressListener;
}): Promise<ResignCliResult> {
  const args = [
    '--ipa',
    opts.ipaPath,
    '--udid',
    opts.udid,
    '--device-name',
    opts.deviceName,
    '--apple-id',
    opts.appleId,
    '--managed-dir',
    getResignedAppsDirectory(),
  ];
  if (opts.stripExtensions) args.push('--strip-extensions');
  const result = await MenuBarModule.runCli('resign-ipa', args, (output: string) => {
    // The resign-ipa command streams `step: <name>[ (detail)]` lines.
    const match = output.match(/^step:\s*([a-z-]+)(?:\s*\((.+)\))?/);
    if (match) {
      opts.onProgress?.(match[1], match[2]);
    }
  });
  return parseCliJsonResult<ResignCliResult>(result, 'resign-ipa');
}

/**
 * Open the Apple ID auth window and wait for it to finish. `reason` selects a
 * contextual banner in the window (e.g. after a session expiry).
 */
export function ensureAppleAuthAsync(reason?: 'session-expired'): Promise<AppleAuthCompletedEvent> {
  if (reason) {
    storage.set(AUTH_REASON_KEY, reason);
  }
  WindowsNavigator.open('AppleIdAuth');
  return waitForAppleAuthCompleteAsync();
}

function waitForAppIdCleanupAsync(): Promise<AppleAppIdsDoneEvent> {
  return new Promise((resolve) => {
    const sub = AppleAppIdsEmitter.addListener(
      APPLE_APP_IDS_DONE_EVENT,
      (event: AppleAppIdsDoneEvent) => {
        sub.remove();
        resolve(event);
      }
    );
  });
}

function confirmAsync(title: string, message: string, confirmLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'default', onPress: () => resolve(true) },
    ]);
  });
}

function appNameFromIpaPath(ipaPath: string, fallback: string): string {
  const base = ipaPath
    .split(/[\\/]/)
    .pop()
    ?.replace(/\.ipa$/i, '');
  // Downloaded builds have hash names like `application-4f9a…`; show the
  // bundle id instead of the hash.
  if (!base || /^application-[0-9a-f]+$/i.test(base)) return fallback;
  return base;
}

function buildRecord(opts: {
  result: ResignCliResult;
  ipaPath: string;
  deviceUdid: string;
  deviceName: string;
  appleId: string;
  stripExtensions: boolean;
  launchURL?: string;
  sourceUri?: string;
}): ResignedAppRecord | null {
  const { result } = opts;
  if (!result.originalIpaPath || !result.recordDirName) return null;
  const nowIso = new Date().toISOString();
  const originalBundleId = stripOrbitSuffix(result.bundleId);
  return {
    id: buildResignedAppId(result.bundleId, opts.deviceUdid),
    appName: appNameFromIpaPath(opts.ipaPath, originalBundleId),
    originalBundleId,
    assignedBundleId: result.bundleId,
    appleId: opts.appleId,
    originalIpaPath: result.originalIpaPath,
    resignedIpaPath: result.resignedIpaPath,
    recordDirName: result.recordDirName,
    sourceUri: opts.sourceUri,
    profileExpiresAt: result.profileExpiresAt,
    lastRenewedAt: nowIso,
    deviceUdid: opts.deviceUdid,
    deviceName: opts.deviceName,
    deviceLastSeenAt: nowIso,
    launchURL: opts.launchURL,
    stripExtensions: opts.stripExtensions,
    autoRenew: true,
    pendingInstall: false,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// One combined modal (macOS alerts are modal and don't stack): expiry line,
// first-time trust instructions, and stripped-entitlement warnings.
function showResignSuccessAlert(record: ResignedAppRecord, strippedEntitlements?: string[]) {
  const expires = new Date(record.profileExpiresAt);
  const days = Math.max(0, Math.round((expires.getTime() - Date.now()) / DAY_MS));
  const autoRenew = getUserPreferences().autoRenewResignedApps;
  const lines = [
    `This build stops opening after ${expires.toLocaleDateString()} (${days} ${
      days === 1 ? 'day' : 'days'
    }). ${
      autoRenew
        ? 'Orbit will renew it automatically while it keeps running.'
        : 'Renew it from Settings → Resigned apps.'
    }`,
  ];
  if (!hasShownTrustInstructions(record.appleId, record.deviceUdid)) {
    lines.push(
      'First app from this Apple ID? iOS shows “Untrusted Developer” when you open it. To trust it:\n' +
        '1. Open Settings → General → VPN & Device Management.\n' +
        '2. Under “Developer App”, tap your Apple ID.\n' +
        '3. Tap Trust, then confirm.\n' +
        'Your iPhone needs an internet connection to verify the developer.'
    );
    markTrustInstructionsShown(record.appleId, record.deviceUdid);
  }
  if (strippedEntitlements && strippedEntitlements.length > 0) {
    lines.push(
      'Some capabilities won’t work — free Apple IDs can’t carry these entitlements:\n' +
        strippedEntitlements.map((e) => `  • ${e}`).join('\n')
    );
  }
  Alert.alert('App installed', lines.join('\n\n'));
}

const MAX_AUTH_PROMPTS = 2;
const MAX_ITERATIONS = 6;

export async function resignAndRetryAsync(opts: {
  localFilePath: string;
  deviceId: string;
  deviceName: string;
  launchURL?: string;
  sourceUri?: string;
  onProgress?: (step: string) => void;
}): Promise<void> {
  const { localFilePath, deviceId, deviceName, launchURL, sourceUri, onProgress } = opts;

  let appleId = loadAppleId();
  let stripExtensions = false;
  let authPrompts = 0;
  let stripRetried = false;
  let quotaHandled = false;
  // Set when the CLI rejected a stored session, so the reopened auth window
  // explains why it is asking again.
  let authReason: 'session-expired' | undefined;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    if (!appleId) {
      if (authPrompts >= MAX_AUTH_PROMPTS) break;
      authPrompts++;
      onProgress?.('waiting-for-auth');
      const event = await ensureAppleAuthAsync(authReason);
      authReason = undefined;
      if (event.status === 'cancelled') return;
      appleId = event.appleId;
    }
    try {
      const resignResult = await runResignCliAsync({
        ipaPath: localFilePath,
        udid: deviceId,
        deviceName,
        appleId,
        stripExtensions,
        onProgress,
      });
      await installAndLaunchAppAsync({
        appPath: resignResult.resignedIpaPath,
        deviceId,
        launchURL,
      });
      const record = buildRecord({
        result: resignResult,
        ipaPath: localFilePath,
        deviceUdid: deviceId,
        deviceName,
        appleId,
        stripExtensions,
        launchURL,
        sourceUri,
      });
      if (record) {
        upsertResignedApp(record);
        showResignSuccessAlert(record, resignResult.strippedEntitlements);
      }
      return;
    } catch (error) {
      const code = error instanceof InternalError ? error.code : undefined;
      if (code === 'APPLE_AUTH_REQUIRED' && authPrompts < MAX_AUTH_PROMPTS) {
        forgetAppleIdSession(); // expired session is a logout — reflect it everywhere
        appleId = null; // force the auth window on the next pass
        authReason = 'session-expired';
        continue;
      }
      if (code === 'APPLE_RESIGN_UNSUPPORTED_IPA' && !stripRetried) {
        const details = (error as InternalError).details as
          | AppleResignUnsupportedIpaErrorDetails
          | undefined;
        if (details?.reason === 'extensions' || details?.reason === 'watchapp') {
          const proceed = await confirmAsync(
            details.reason === 'extensions'
              ? 'This app has extensions (PlugIns)'
              : 'This app has a Watch app',
            'Free Apple IDs can’t sign extensions or Watch apps yet. Orbit can ' +
              'install the main app without them — extensions and the Watch app ' +
              'won’t appear on your device.',
            'Install without them'
          );
          if (!proceed) return;
          stripRetried = true;
          stripExtensions = true;
          continue;
        }
      }
      if (code === 'APPLE_RESIGN_QUOTA_EXCEEDED' && !quotaHandled) {
        quotaHandled = true;
        const proceed = await confirmAsync(
          'Apple App ID limit reached',
          describeResignError(error).message +
            '\n\nOrbit can show your registered App IDs so you can delete stale ones and retry.',
          'Manage App IDs'
        );
        if (!proceed) throw error;
        onProgress?.('waiting-for-cleanup');
        WindowsNavigator.open('AppleAppIds');
        const done = await waitForAppIdCleanupAsync();
        if (done.deletedCount > 0) continue;
        throw error;
      }
      throw error;
    }
  }
  // Never fall off the loop silently.
  throw new InternalError(
    'APPLE_RESIGN_FAILED',
    'Re-signing did not complete after several attempts.'
  );
}
