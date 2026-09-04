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
import { storage } from '../modules/Storage';
import { AppleAuthCompletedEvent, waitForAppleAuthCompleteAsync } from '../utils/appleAuthEvents';
import { parseCliJsonResult } from '../utils/helpers';
import { WindowsNavigator } from '../windows';

export type ResignCliResult = {
  resignedIpaPath: string;
  bundleId: string;
  profileExpiresAt: string;
  strippedEntitlements?: string[];
};

export type ResignProgressListener = (step: string, detail?: string) => void;

/** Run the `resign-ipa` CLI command and parse its JSON result. */
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

function confirmAsync(title: string, message: string, confirmLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'default', onPress: () => resolve(true) },
    ]);
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

// One combined modal (macOS alerts are modal and don't stack): expiry line,
// first-time trust instructions, and stripped-entitlement warnings.
function showResignSuccessAlert(opts: {
  appleId: string;
  deviceUdid: string;
  profileExpiresAt: string;
  strippedEntitlements?: string[];
}) {
  const expires = new Date(opts.profileExpiresAt);
  const days = Math.max(0, Math.round((expires.getTime() - Date.now()) / DAY_MS));
  const lines = [
    `This build stops opening after ${expires.toLocaleDateString()} (${days} ${
      days === 1 ? 'day' : 'days'
    }). Re-sign it in Orbit to renew it.`,
  ];
  if (!hasShownTrustInstructions(opts.appleId, opts.deviceUdid)) {
    lines.push(
      'First app from this Apple ID? iOS shows “Untrusted Developer” when you open it. To trust it:\n' +
        '1. Open Settings → General → VPN & Device Management.\n' +
        '2. Under “Developer App”, tap your Apple ID.\n' +
        '3. Tap Trust, then confirm.\n' +
        'Your iPhone needs an internet connection to verify the developer.'
    );
    markTrustInstructionsShown(opts.appleId, opts.deviceUdid);
  }
  if (opts.strippedEntitlements && opts.strippedEntitlements.length > 0) {
    lines.push(
      'Some capabilities won’t work — free Apple IDs can’t carry these entitlements:\n' +
        opts.strippedEntitlements.map((e) => `  • ${e}`).join('\n')
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
  onProgress?: (step: string) => void;
}): Promise<void> {
  const { localFilePath, deviceId, deviceName, launchURL, onProgress } = opts;

  let appleId = loadAppleId();
  let stripExtensions = false;
  let authPrompts = 0;
  let stripRetried = false;
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
      showResignSuccessAlert({
        appleId,
        deviceUdid: deviceId,
        profileExpiresAt: resignResult.profileExpiresAt,
        strippedEntitlements: resignResult.strippedEntitlements,
      });
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
      throw error;
    }
  }
  // Never fall off the loop silently.
  throw new InternalError(
    'APPLE_RESIGN_FAILED',
    'Re-signing did not complete after several attempts.'
  );
}
