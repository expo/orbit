import { AppleResignUnsupportedIpaErrorDetails, InternalError } from 'common-types';

import { appleIdSignOutAsync } from './appleIdAuthAsync';
import { installAndLaunchAppAsync } from './installAndLaunchAppAsync';
import { WindowsNavigator } from '../windows';
import { AppleAuthEmitter, AppleAuthCompletedEvent } from '../utils/appleAuthEvents';
import Alert from '../modules/Alert';
import MenuBarModule from '../modules/MenuBarModule';
import { storage } from '../modules/Storage';

const LAST_APPLE_ID_KEY = 'apple-resign:last-apple-id';

function rememberAppleId(appleId: string) {
  storage.set(LAST_APPLE_ID_KEY, appleId);
}

function loadAppleId(): string | null {
  return storage.getString(LAST_APPLE_ID_KEY) ?? null;
}

/**
 * Clear the saved Apple ID login: revoke the persisted GSA session (keychain)
 * and forget the remembered Apple ID, so the next resign starts a fresh sign-in.
 * Returns the Apple ID that was signed out, or null if none was stored.
 */
export async function clearAppleIdLoginAsync(): Promise<string | null> {
  const appleId = loadAppleId();
  if (appleId) {
    await appleIdSignOutAsync(appleId);
  }
  storage.delete(LAST_APPLE_ID_KEY);
  return appleId;
}

function waitForAuthAsync(): Promise<AppleAuthCompletedEvent> {
  return new Promise((resolve) => {
    const sub = AppleAuthEmitter.addListener(
      'apple-id-auth:complete',
      (event: AppleAuthCompletedEvent) => {
        sub.remove();
        resolve(event);
      }
    );
  });
}

type ResignCliResult = {
  resignedIpaPath: string;
  strippedEntitlements?: string[];
};

async function runResignAsync(
  ipaPath: string,
  udid: string,
  deviceName: string,
  appleId: string,
  outputPath: string,
  stripExtensions: boolean,
  onProgress?: (step: string) => void
): Promise<ResignCliResult> {
  const args = [
    '--ipa',
    ipaPath,
    '--udid',
    udid,
    '--device-name',
    deviceName,
    '--apple-id',
    appleId,
    '--output',
    outputPath,
  ];
  if (stripExtensions) args.push('--strip-extensions');
  const result = await MenuBarModule.runCli('resign-ipa', args, (output: string) => {
    // The resign-ipa command streams `step: <name>[ (detail)]` lines.
    const match = output.match(/^step:\s*([a-z-]+)/);
    if (match) {
      onProgress?.(match[1]);
    }
  });
  return JSON.parse(result) as ResignCliResult;
}

function confirmAsync(title: string, message: string, confirmLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'default', onPress: () => resolve(true) },
    ]);
  });
}

export async function resignAndRetryAsync(opts: {
  localFilePath: string;
  deviceId: string;
  deviceName: string;
  launchURL?: string;
  onProgress?: (step: string) => void;
}): Promise<void> {
  const { localFilePath, deviceId, deviceName, launchURL, onProgress } = opts;
  const outputPath = localFilePath.replace(/\.ipa$/, '-resigned.ipa');

  // Try sign-in iteratively: first attempt with whatever is in Keychain;
  // on APPLE_AUTH_REQUIRED, open the auth window, then retry.
  let appleId = loadAppleId();
  let stripExtensions = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!appleId) {
      onProgress?.('waiting-for-auth');
      WindowsNavigator.open('AppleIdAuth');
      const event = await waitForAuthAsync();
      if (event.status === 'cancelled') return;
      appleId = event.appleId;
      rememberAppleId(appleId);
    }
    try {
      const resignResult = await runResignAsync(
        localFilePath,
        deviceId,
        deviceName,
        appleId,
        outputPath,
        stripExtensions,
        onProgress
      );
      await installAndLaunchAppAsync({
        appPath: resignResult.resignedIpaPath,
        deviceId,
        launchURL,
      });
      if (resignResult.strippedEntitlements && resignResult.strippedEntitlements.length > 0) {
        Alert.alert(
          'Some capabilities won’t work',
          'Free Apple IDs can’t carry these entitlements, so the app installed but ' +
            'features depending on them are inert:\n\n' +
            resignResult.strippedEntitlements.map((e) => `  • ${e}`).join('\n')
        );
      }
      return;
    } catch (error) {
      if (error instanceof InternalError && error.code === 'APPLE_AUTH_REQUIRED' && attempt === 0) {
        appleId = null; // force the auth window on the next pass
        continue;
      }
      if (
        error instanceof InternalError &&
        error.code === 'APPLE_RESIGN_UNSUPPORTED_IPA' &&
        !stripExtensions
      ) {
        const details = error.details as AppleResignUnsupportedIpaErrorDetails | undefined;
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
          stripExtensions = true;
          continue;
        }
      }
      throw error;
    }
  }
}
