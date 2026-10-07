import spawnAsync, { SpawnOptions, SpawnResult } from '@expo/spawn-async';
import chalk from 'chalk';
import { InternalError } from 'common-types';

import Log from '../../log';
import { sleepAsync } from '../../utils/promise';

// devicectl's control channel to the device drops now and then — right after an
// install, or when a Wi-Fi-paired device blinks — and the command fails before
// it starts (CoreDeviceError 4000, "Connection reset by peer"). It almost always
// reconnects within a couple of seconds, so retry those before giving up.
const DEVICECTL_CONNECTION_ATTEMPTS = 3;
const DEVICECTL_CONNECTION_RETRY_DELAY_MS = 1500;

export async function xcrunAsync(args: string[], options?: SpawnOptions): Promise<SpawnResult> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await spawnAsync('xcrun', args, options);
    } catch (e) {
      if (
        args[0] === 'devicectl' &&
        isDeviceConnectionError(e) &&
        attempt < DEVICECTL_CONNECTION_ATTEMPTS
      ) {
        console.log(
          `devicectl lost the connection to the device, retrying (${attempt}/${
            DEVICECTL_CONNECTION_ATTEMPTS - 1
          })...`
        );
        await sleepAsync(DEVICECTL_CONNECTION_RETRY_DELAY_MS * attempt);
        continue;
      }
      throwXcrunError(e);
    }
  }
}

function isDeviceConnectionError(e: any): boolean {
  const stderr: string = e?.stderr ?? '';
  return (
    /CoreDeviceError error 4000\b/.test(stderr) ||
    stderr.includes('ControlChannelConnectionError') ||
    stderr.includes('Connection reset by peer') ||
    /connection to this device could not be established/i.test(stderr)
  );
}

function throwXcrunError(e: any): never {
  if (isLicenseOutOfDate(e.stdout) || isLicenseOutOfDate(e.stderr)) {
    throw new InternalError(
      'XCODE_LICENSE_NOT_ACCEPTED',
      'Xcode license is not accepted. Please run `sudo xcodebuild -license`.'
    );
  } else if (e.stderr?.includes('not a developer tool or in PATH')) {
    throw new InternalError(
      'XCODE_COMMAND_LINE_TOOLS_NOT_INSTALLED',
      `You may need to run ${chalk.bold(
        'sudo xcode-select -s /Applications/Xcode.app'
      )} and try again.`,
      {
        command: 'sudo xcode-select -s /Applications/Xcode.app',
      }
    );
  } else if (
    // Pre-iOS17 simctl wording.
    e.stderr?.match(/the device was not, or could not be, unlocked/) ||
    // iOS 17+ devicectl wording. The inner CoreDeviceError 10003 is "device
    // locked", which cascades into "DDI could not be mounted" (12040) and
    // surfaces as a `xcrun devicectl device install` non-zero exit.
    e.stderr?.includes('The device is currently locked') ||
    e.stderr?.match(/CoreDeviceError error 10003/)
  ) {
    throw new InternalError('APPLE_DEVICE_LOCKED', 'Device is currently locked.');
  } else if (
    // devicectl code-signature / provisioning rejection. The usbmux install
    // path maps the same failure (LockdownProtocol's `ApplicationVerificationFailed`)
    // — mirror it here so the devicectl fallback also triggers the resign offer.
    // Covers ad-hoc/internal builds not provisioned for this device AND IPAs
    // carrying a Beta (TestFlight/App Store) profile that can't be sideloaded
    // ("Attempted to install a Beta profile without the proper entitlement").
    e.stderr?.includes('ApplicationVerificationFailed') ||
    e.stderr?.includes('its integrity could not be verified') ||
    e.stderr?.includes('Attempted to install a Beta profile')
  ) {
    throw new InternalError(
      'APPLE_APP_VERIFICATION_FAILED',
      'The app is not signed for this device.',
      { stderr: e.stderr }
    );
  } else if (
    // `devicectl device process launch` refused by SpringBoard: the install
    // succeeded, but the app's developer certificate is not trusted on the
    // device yet (FBSOpenApplication "Security" / RequestDenied). This is the
    // normal first run of an app signed with a free Apple ID — the user has to
    // trust the profile in Settings; nothing on the Mac can do it for them.
    e.stderr?.includes('has not been explicitly trusted by the user') ||
    e.stderr?.match(/FBSOpenApplicationErrorDomain error 3\b/)
  ) {
    throw new InternalError(
      'APPLE_DEVELOPER_NOT_TRUSTED',
      'The app is installed, but iOS has not trusted its developer yet. On the iPhone, open Settings → General → VPN & Device Management, tap the developer, then Trust — and launch the app again.',
      { stderr: e.stderr }
    );
  } else if (isDeviceConnectionError(e)) {
    // Still failing after the retries in xcrunAsync: the device really is
    // unreachable, not just blinking.
    throw new InternalError(
      'APPLE_DEVICE_CONNECTION_LOST',
      'Lost the connection to the device. Check the USB cable or Wi-Fi connection, make sure the iPhone is unlocked, and try again.',
      { stderr: e.stderr }
    );
  } else if (e.stderr?.match(/Unable to lookup in current state: Shutdown/)) {
    throw new InternalError(
      'SIMULATOR_NOT_READY',
      'The simulator is not booted. Orbit will attempt to boot it automatically.',
      { stderr: e.stderr }
    );
  }

  if (Array.isArray(e.output)) {
    e.message += '\n' + e.output.join('\n').trim();
  } else if (e.stderr) {
    e.message += '\n' + e.stderr;
  }

  throw new Error(
    `Some other error occurred while running xcrun command.
  ${e.message}`
  );
}

function isLicenseOutOfDate(text: string): boolean {
  if (!text) {
    return false;
  }

  const lower = text.toLowerCase();
  return lower.includes('xcode') && lower.includes('license');
}

export async function isXcrunInstalledAsync(): Promise<boolean> {
  try {
    await spawnAsync('xcrun', ['--version']);
    return true;
  } catch {
    return false;
  }
}

export async function installXcrunAsync(): Promise<void> {
  await spawnAsync('xcode-select', ['--install']);

  await waitForXcrunInstallToFinishAsync(60 * 1000, 1000);
}

async function waitForXcrunInstallToFinishAsync(
  maxWaitTimeMs: number,
  intervalMs: number
): Promise<void> {
  Log.newLine();
  Log.log('Waiting for Xcode Command Line Tools install to finish...');

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitTimeMs) {
    if (await isXcrunInstalledAsync()) {
      return;
    }
    await sleepAsync(Math.min(intervalMs, Math.max(maxWaitTimeMs - (Date.now() - startTime), 0)));
  }
  throw new Error('Timed out waiting for Xcode Command Line Tools install to finish');
}
