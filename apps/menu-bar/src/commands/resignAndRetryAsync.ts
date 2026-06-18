import { InternalError } from 'common-types';

import { installAndLaunchAppAsync } from './installAndLaunchAppAsync';
import { WindowsNavigator } from '../windows';
import { AppleAuthEmitter, AppleAuthCompletedEvent } from '../utils/appleAuthEvents';
import MenuBarModule from '../modules/MenuBarModule';
import { storage } from '../modules/Storage';

const LAST_APPLE_ID_KEY = 'apple-resign:last-apple-id';

function rememberAppleId(appleId: string) {
  storage.set(LAST_APPLE_ID_KEY, appleId);
}

function loadAppleId(): string | null {
  return storage.getString(LAST_APPLE_ID_KEY) ?? null;
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

async function runResignAsync(
  ipaPath: string,
  udid: string,
  deviceName: string,
  appleId: string,
  outputPath: string,
  onProgress?: (step: string) => void
): Promise<string> {
  const result = await MenuBarModule.runCli(
    'resign-ipa',
    [
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
    ],
    (output: string) => {
      // The resign-ipa command streams `step: <name>[ (detail)]` lines.
      const match = output.match(/^step:\s*([a-z-]+)/);
      if (match) {
        onProgress?.(match[1]);
      }
    }
  );
  const parsed = JSON.parse(result) as { resignedIpaPath: string };
  return parsed.resignedIpaPath;
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
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!appleId) {
      onProgress?.('waiting-for-auth');
      WindowsNavigator.open('AppleIdAuth');
      const event = await waitForAuthAsync();
      if (event.status === 'cancelled') return;
      appleId = event.appleId;
      rememberAppleId(appleId);
    }
    try {
      const resignedPath = await runResignAsync(
        localFilePath,
        deviceId,
        deviceName,
        appleId,
        outputPath,
        onProgress
      );
      await installAndLaunchAppAsync({
        appPath: resignedPath,
        deviceId,
        launchURL,
      });
      return;
    } catch (error) {
      if (
        error instanceof InternalError &&
        error.code === 'APPLE_AUTH_REQUIRED' &&
        attempt === 0
      ) {
        appleId = null; // force the auth window on the next pass
        continue;
      }
      throw error;
    }
  }
}
