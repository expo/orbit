import { AppleResignUnsupportedIpaErrorDetails, InternalError } from 'common-types';

import {
  AUTH_REASON_KEY,
  forgetAppleIdSession,
  markTrustInstructionsShown,
  requestTwoFactorPrompt,
  resolveAppleIdAsync,
  twoFactorAuthMode,
  TwoFactorPrompt,
} from './appleAccountAsync';
import { freeAppSlotsAsync } from './freeAppSlotsAsync';
import { installAndLaunchAppAsync } from './installAndLaunchAppAsync';
import { launchAppAsync, openDeviceManagementSettingsAsync } from './launchAppAsync';
import { uninstallAppAsync } from './uninstallAppAsync';
import Alert from '../modules/Alert';
import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';
import MenuBarModule from '../modules/MenuBarModule';
import {
  buildResignedAppId,
  getResignedAppsDirectory,
  isActiveRecord,
  listResignedApps,
  ResignedAppRecord,
  stripOrbitSuffix,
  updateResignedApp,
  upsertResignedApp,
} from '../modules/ResignedApps';
import { getUserPreferences, storage } from '../modules/Storage';
import { WINDOW_CLOSED_EVENT } from '../modules/WindowManager/events';
import {
  APPLE_APP_IDS_DONE_EVENT,
  AppleAppIdsDoneEvent,
  AppleAppIdsEmitter,
} from '../utils/appleAppIdsEvents';
import { AppleAuthCompletedEvent, waitForAppleAuthCompleteAsync } from '../utils/appleAuthEvents';
import { parseCliJsonResult } from '../utils/helpers';
import { describeResignError } from '../utils/resignErrorCopy';
import { WindowsNavigator } from '../windows';
import { openSettingsPane } from '../windows/settingsPane';

export type ResignCliResult = {
  resignedIpaPath: string;
  originalIpaPath?: string;
  iconPath?: string;
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
export function ensureAppleAuthAsync(
  reason?: 'session-expired',
  twoFactor?: TwoFactorPrompt
): Promise<AppleAuthCompletedEvent> {
  if (reason) {
    storage.set(AUTH_REASON_KEY, reason);
  }
  // The saved password signed in but Apple wants a code: open on the code step.
  if (twoFactor) {
    requestTwoFactorPrompt(twoFactor);
  }
  WindowsNavigator.open('AppleIdAuth');
  return waitForAppleAuthCompleteAsync();
}

/**
 * Resolve true as soon as the App IDs section deletes one (the resign can be
 * retried right away), false when the user closes Settings without doing so.
 * The close comes from the native window manager: on Electron a closing
 * renderer runs no React cleanup, so Settings itself could never report it.
 */
function waitForAppIdCleanupAsync(): Promise<boolean> {
  return new Promise((resolve) => {
    let done: { remove(): void } | undefined;
    let closed: { remove(): void } | undefined;
    const finish = (deleted: boolean) => {
      done?.remove();
      closed?.remove();
      resolve(deleted);
    };
    done = AppleAppIdsEmitter.addListener(APPLE_APP_IDS_DONE_EVENT, (_: AppleAppIdsDoneEvent) =>
      finish(true)
    );
    closed = DeviceEventEmitter.addListener(WINDOW_CLOSED_EVENT, (window: string) => {
      if (window === 'Settings') finish(false);
    });
  });
}

export function confirmAsync(
  title: string,
  message: string,
  confirmLabel: string
): Promise<boolean> {
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

/**
 * iOS allows three apps signed with a free Apple ID per device. When an install
 * hits that limit, offer to free a slot the way AltStore does: deactivate one of
 * the apps — Orbit removes it from the device but keeps its record and IPA, so
 * "Install" in Settings brings it back later. On the usbmux path iOS names the
 * bundle ids holding the slots, so apps Orbit did not install can be removed
 * too. Resolves true when a slot was freed.
 */
export async function handleFreeAppLimitAsync(opts: {
  deviceId: string;
  deviceName: string;
  appName: string;
  /** The app being installed; never offered. */
  excludeBundleId?: string;
  /** Apps iOS reported as holding the slots, when the wording listed them. */
  occupyingApps?: { bundleId: string; name?: string }[];
}): Promise<boolean> {
  const records = listResignedApps().filter(
    (record) =>
      record.deviceUdid === opts.deviceId &&
      isActiveRecord(record) &&
      record.assignedBundleId !== opts.excludeBundleId &&
      record.originalBundleId !== opts.excludeBundleId
  );
  const listed = (opts.occupyingApps ?? []).filter((app) => app.bundleId !== opts.excludeBundleId);
  const choices: { label: string; bundleId: string; record?: ResignedAppRecord }[] =
    listed.length > 0
      ? listed.map((app) => {
          const record = records.find((r) => r.assignedBundleId === app.bundleId);
          return record
            ? { label: `Deactivate ${record.appName}`, bundleId: app.bundleId, record }
            : { label: `Remove ${app.name ?? app.bundleId}`, bundleId: app.bundleId };
        })
      : records.map((record) => ({
          label: `Deactivate ${record.appName}`,
          bundleId: record.assignedBundleId,
          record,
        }));

  const title = 'Free Apple ID app limit reached';
  const intro = `Apple allows three apps signed with a free Apple ID on a device, and ${opts.deviceName} already has three. `;
  if (choices.length === 0) {
    Alert.alert(
      title,
      intro + `Delete one of them on the iPhone, then install ${opts.appName} again.`
    );
    return false;
  }
  const choice = await new Promise<(typeof choices)[number] | null>((resolve) => {
    Alert.alert(
      title,
      intro +
        `Free a slot for ${opts.appName}. Deactivated apps stay in Settings → Resigned apps, where “Install” puts them back.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        ...choices.slice(0, 3).map((item) => ({
          text: item.label,
          style: 'destructive' as const,
          onPress: () => resolve(item),
        })),
      ]
    );
  });
  if (!choice) return false;
  await uninstallAppAsync({ deviceId: opts.deviceId, bundleId: choice.bundleId });
  if (choice.record) {
    updateResignedApp(choice.record.id, {
      active: false,
      pendingInstall: false,
      lastError: undefined,
    });
  }
  return true;
}

const FREE_SLOT_CHECK_TIMEOUT_MS = 15_000;

/**
 * Check the three-app limit before any work: ask the device which apps hold
 * the free-Apple-ID slots and, when it is full and `originalBundleId` is not
 * already one of them (an update needs no new slot), run the chooser now rather
 * than after a resign and a failed upload. Resolves true when the install can
 * go ahead. A device that cannot be asked (devicectl-only setups) is assumed to
 * have room; the install error path still covers it.
 */
export async function ensureFreeAppSlotAsync(opts: {
  deviceId: string;
  deviceName: string;
  appName: string;
  /** The build's own bundle id, to recognise an update of an app already in a slot. */
  originalBundleId?: string;
}): Promise<boolean> {
  // Bounded: a device that never answers must not stall the resign — the
  // install error path still handles a full device.
  const slots = await Promise.race([
    freeAppSlotsAsync(opts.deviceId).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), FREE_SLOT_CHECK_TIMEOUT_MS)),
  ]);
  if (!slots || slots.apps.length < slots.limit) return true;
  const installed = listResignedApps().find(
    (record) =>
      record.deviceUdid === opts.deviceId &&
      isActiveRecord(record) &&
      (record.originalBundleId === opts.originalBundleId ||
        record.assignedBundleId === opts.originalBundleId)
  );
  if (installed && slots.apps.some((app) => app.bundleId === installed.assignedBundleId)) {
    return true;
  }
  if (opts.originalBundleId && slots.apps.some((app) => app.bundleId === opts.originalBundleId)) {
    return true;
  }
  return handleFreeAppLimitAsync({
    deviceId: opts.deviceId,
    deviceName: opts.deviceName,
    appName: opts.appName,
    excludeBundleId: installed?.assignedBundleId ?? opts.originalBundleId,
    occupyingApps: slots.apps,
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
    iconPath: result.iconPath,
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

// One combined modal (macOS alerts are modal and don't stack): expiry line and
// stripped-entitlement warnings. Trust instructions are not repeated here: the
// app has just launched, which proves the developer is trusted — the untrusted
// case is handled (and the device marked) by handleUntrustedDeveloperAsync.
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
  if (strippedEntitlements && strippedEntitlements.length > 0) {
    lines.push(
      'Some capabilities won’t work — the development profile Orbit issued can’t carry these entitlements:\n' +
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
  /** The build's bundle id (from detect-apple-app-type), for the free-slot pre-check. */
  bundleId?: string;
  onProgress?: (step: string) => void;
}): Promise<void> {
  const { localFilePath, deviceId, deviceName, launchURL, sourceUri, bundleId, onProgress } = opts;

  // Adopts a session the CLI already holds before ever showing the sign-in window.
  let appleId = await resolveAppleIdAsync();
  let stripExtensions = false;
  let authPrompts = 0;
  let stripRetried = false;
  let quotaHandled = false;
  // Set when the CLI rejected a stored session, so the reopened auth window
  // explains why it is asking again.
  let authReason: 'session-expired' | undefined;
  let twoFactor: TwoFactorPrompt | undefined;

  // A full device is handled before the resign, not after a failed upload.
  if (
    !(await ensureFreeAppSlotAsync({
      deviceId,
      deviceName,
      appName: appNameFromIpaPath(localFilePath, bundleId ?? 'this app'),
      originalBundleId: bundleId,
    }))
  ) {
    return;
  }

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    if (!appleId) {
      if (authPrompts >= MAX_AUTH_PROMPTS) break;
      authPrompts++;
      onProgress?.('waiting-for-auth');
      const event = await ensureAppleAuthAsync(authReason, twoFactor);
      authReason = undefined;
      twoFactor = undefined;
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
      // Record the app before installing: the install's launch step can fail
      // (locked device) with the app already on the phone, and an app on the
      // phone without a record is never renewed. `pendingInstall` flips once the
      // install goes through; until then the reconnect path retries it.
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
        upsertResignedApp({ ...record, pendingInstall: true });
      }
      // The CLI's last step is `done`; the install is a second CLI call, so tell
      // the task row what is actually happening instead of leaving "Finishing up".
      onProgress?.('installing');
      try {
        for (let installAttempt = 0; ; installAttempt++) {
          try {
            await installAndLaunchAppAsync({
              appPath: resignResult.resignedIpaPath,
              deviceId,
              launchURL,
            });
            break;
          } catch (launchError) {
            const launchCode = launchError instanceof InternalError ? launchError.code : undefined;
            if (launchCode === 'APPLE_FREE_APP_LIMIT_REACHED' && installAttempt === 0) {
              // Three free-Apple-ID apps are already on the device. Offer to remove
              // one Orbit installed, then install once more.
              const freed = await handleFreeAppLimitAsync({
                deviceId,
                deviceName,
                appName: appNameFromIpaPath(localFilePath, stripOrbitSuffix(resignResult.bundleId)),
                excludeBundleId: resignResult.bundleId,
                occupyingApps: (
                  (launchError as InternalError).details as
                    | { apps?: { bundleId: string; name?: string }[] }
                    | undefined
                )?.apps,
              });
              if (freed) continue;
              throw launchError;
            }
            if (launchCode !== 'APPLE_DEVELOPER_NOT_TRUSTED') {
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
            break;
          }
        }
      } catch (installError) {
        if (record) {
          updateResignedApp(record.id, {
            lastError: {
              code: installError instanceof InternalError ? installError.code : 'UNKNOWN',
              message: describeResignError(installError).message,
              at: new Date().toISOString(),
            },
          });
        }
        throw installError;
      }
      if (record) {
        updateResignedApp(record.id, { pendingInstall: false });
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
      if (code === 'APPLE_TWO_FACTOR_REQUIRED' && authPrompts < MAX_AUTH_PROMPTS && appleId) {
        // The saved password signed in again but Apple wants a code. Still
        // signed in — only the code step is missing.
        twoFactor = { appleId, authMode: twoFactorAuthMode(error) };
        appleId = null; // force the auth window on the next pass
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
      if (code === 'APPLE_RESIGN_QUOTA_EXCEEDED' && !quotaHandled) {
        quotaHandled = true;
        const proceed = await confirmAsync(
          'Apple App ID limit reached',
          describeResignError(error).message +
            '\n\nOrbit can show your registered App IDs in Settings so you can delete stale ones; it retries as soon as you delete one.',
          'Manage App IDs'
        );
        if (!proceed) throw error;
        onProgress?.('waiting-for-cleanup');
        openSettingsPane('apple');
        if (await waitForAppIdCleanupAsync()) continue;
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
