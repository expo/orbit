import { AppleResignUnsupportedIpaErrorDetails, InternalError } from 'common-types';

import {
  AUTH_REASON_KEY,
  forgetAppleIdSession,
  markTrustInstructionsShown,
  resolveAppleIdAsync,
} from './appleAccountAsync';
import { installAndLaunchAppAsync } from './installAndLaunchAppAsync';
import { launchAppAsync, openDeviceManagementSettingsAsync } from './launchAppAsync';
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

const TRUST_STEPS =
  'Tap “Open Settings on iPhone” to jump to Settings → General → VPN & Device Management on the phone. Tap the developer under “Developer App”, then Trust and confirm — the iPhone needs an internet connection to verify it.';

// Each pass is one alert: a Settings jump, a launch attempt, or a cancel.
const MAX_TRUST_PROMPTS = 8;

type TrustChoice = 'settings' | 'launch' | 'cancel';

/**
 * The app installed but iOS refused to open it: its developer certificate is
 * not trusted on the device yet — the normal first run of any development-signed
 * app, free or paid team. Orbit can't trust it remotely (there is no API; Xcode can't
 * either), but it can put the phone on the right Settings screen and then
 * launch the already-installed app — no reinstall. Resolves true when the app
 * launched, false if the user cancelled.
 */
export async function handleUntrustedDeveloperAsync(opts: {
  deviceId: string;
  /** Preferred: no extraction needed. */
  bundleId?: string;
  /** Fallback when only the installed .app / .ipa is known. */
  appPath?: string;
  launchURL?: string;
}): Promise<boolean> {
  for (let prompt = 0; prompt < MAX_TRUST_PROMPTS; prompt++) {
    const choice = await new Promise<TrustChoice>((resolve) => {
      Alert.alert(
        'Trust the developer on your iPhone',
        'The app is installed, but iOS won’t open it until you trust its developer.\n\n' +
          `${TRUST_STEPS}\n\n` +
          'Then press Launch.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancel') },
          { text: 'Open Settings on iPhone', style: 'default', onPress: () => resolve('settings') },
          { text: 'Launch', style: 'default', onPress: () => resolve('launch') },
        ]
      );
    });
    if (choice === 'cancel') return false;
    if (choice === 'settings') {
      // Best effort: if the jump fails the steps above still describe the path.
      await openDeviceManagementSettingsAsync(opts.deviceId).catch(() => {});
      continue;
    }
    try {
      await launchAppAsync({
        deviceId: opts.deviceId,
        bundleId: opts.bundleId,
        appPath: opts.appPath,
        url: opts.launchURL,
      });
      return true;
    } catch (error) {
      if (!(error instanceof InternalError && error.code === 'APPLE_DEVELOPER_NOT_TRUSTED')) {
        throw error;
      }
      // Still untrusted — ask again.
    }
  }
  return false;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// One combined modal (macOS alerts are modal and don't stack): expiry line and
// stripped-entitlement warnings. Trust instructions are not repeated here: the
// app has just launched, which proves the developer is trusted — the untrusted
// case is handled (and the device marked) by handleUntrustedDeveloperAsync.
function showResignSuccessAlert(opts: {
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
  if (opts.strippedEntitlements && opts.strippedEntitlements.length > 0) {
    lines.push(
      'Some capabilities won’t work — the development profile Orbit issued can’t carry these entitlements:\n' +
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

  // Adopts a session the CLI already holds before ever showing the sign-in window.
  let appleId = await resolveAppleIdAsync();
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
      // The CLI's last step is `done`; the install is a second CLI call, so tell
      // the task row what is actually happening instead of leaving "Finishing up".
      onProgress?.('installing');
      try {
        await installAndLaunchAppAsync({
          appPath: resignResult.resignedIpaPath,
          deviceId,
          launchURL,
        });
      } catch (launchError) {
        if (
          !(
            launchError instanceof InternalError &&
            launchError.code === 'APPLE_DEVELOPER_NOT_TRUSTED'
          )
        ) {
          throw launchError;
        }
        // Installed, but iOS won't open it until the developer is trusted — the
        // expected first run of a development-signed app on a device. Walk the
        // user through it and launch, instead of relying on the success alert's
        // passive hint.
        markTrustInstructionsShown(appleId, deviceId);
        await handleUntrustedDeveloperAsync({
          deviceId,
          bundleId: resignResult.bundleId,
          launchURL,
        });
      }
      showResignSuccessAlert({
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
            'Each extension and Watch app needs its own App ID, which this account ' +
              'can’t provide right now. Orbit can install the main app without them — ' +
              'extensions and the Watch app won’t appear on your device.',
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
