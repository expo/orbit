import { InternalError } from 'common-types';

import { CurrentUserDataFragment } from '../generated/graphql';

export function capitalize(word: string) {
  return `${word.toUpperCase()[0]}${word.substring(1)}`;
}

export function getCurrentUserDisplayName(personalAccount: CurrentUserDataFragment) {
  if (personalAccount.firstName && personalAccount.lastName) {
    return `${personalAccount.firstName} ${personalAccount.lastName}`;
  } else if (personalAccount.firstName) {
    return personalAccount.firstName;
  } else {
    return personalAccount.username;
  }
}

export function convertCliErrorObjectToError(errorObject: any) {
  let error: Error | InternalError;

  if (errorObject?.name === 'InternalError') {
    error = new InternalError(errorObject.code, errorObject.message, errorObject.details);
  } else {
    error = new Error(errorObject.message);
  }

  error.stack = errorObject.stack;
  return error;
}

// Turn the message of a rejected `runCli` call back into the CLI's error. The
// native module does not hand over the CLI's JSON verbatim: expo-modules-core 58
// reports a rejected Exception as its debug description, e.g.
// `CLIOutputError: {"name":"InternalError",...} (at MenuBarModule.swift:144)`.
// Extract the JSON object instead of parsing the whole message, and fall back to
// a plain Error when there is none, so the error code (which drives flows like
// the resign offer) is never lost to a JSON parse error.
export function convertCliErrorMessageToError(message: string): Error {
  const start = message.indexOf('{');
  const end = message.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return convertCliErrorObjectToError(JSON.parse(message.slice(start, end + 1)));
    } catch {
      // Braces but not JSON: fall through to the plain message.
    }
  }
  return new Error(message);
}

export enum MenuBarStatus {
  LISTENING,
  BOOTING_DEVICE,
  DOWNLOADING,
  INSTALLING_APP,
  INSTALLING_EXPO_GO,
  OPENING_PROJECT_IN_EXPO_GO,
  OPENING_UPDATE,
  WARNING,
  RESIGNING_APP,
}

// Maps a resign progress step (emitted by the `resign-ipa` CLI command) to a
// user-facing message shown on the resign task in the popover.
export function describeResignStep(step: string): string {
  switch (step) {
    case 'waiting-for-auth':
      return 'Waiting for Apple ID sign-in…';
    case 'waiting-for-cleanup':
      return 'Waiting for App ID cleanup…';
    case 'inspecting':
      return 'Inspecting app…';
    case 'authenticating':
      return 'Signing in to Apple…';
    case 'registering-device':
      return 'Registering device…';
    case 'minting-certificate':
      return 'Creating signing certificate…';
    case 'creating-app-id':
      return 'Registering App ID…';
    case 'downloading-profile':
      return 'Downloading provisioning profile…';
    case 'codesigning':
      return 'Code signing…';
    case 'repacking':
      return 'Repacking app…';
    case 'done':
      return 'Finishing up…';
    // Orbit-side: the resigned IPA is being installed and launched on the device.
    case 'installing':
      return 'Installing on your device…';
    default:
      return 'Re-signing app…';
  }
}

// Parse a CLI command's JSON result. When the CLI process dies before printing
// its `---- return output ----` JSON (e.g. a crash while loading a native
// module), the raw output reaches JSON.parse and the user used to see
// "JSON Parse error: Unexpected character: U". Turn that into a real message.
export function parseCliJsonResult<T>(result: string, command: string): T {
  try {
    return JSON.parse(result) as T;
  } catch {
    throw new InternalError(
      'APPLE_RESIGN_FAILED',
      `Orbit's CLI returned an unexpected response for ${command}. Open the Debug Menu logs for details.`
    );
  }
}

// Progress percentage for each resign step, so the task row can show a
// determinate bar. Orbit-side waiting steps return undefined (indeterminate).
export function resignStepProgress(step: string): number | undefined {
  switch (step) {
    case 'inspecting':
      return 5;
    case 'authenticating':
      return 15;
    case 'registering-device':
      return 30;
    case 'minting-certificate':
      return 40;
    case 'creating-app-id':
      return 55;
    case 'downloading-profile':
      return 65;
    case 'codesigning':
      return 75;
    case 'repacking':
      return 94;
    // The CLI's `done` is not the end of the user's wait: the install that
    // follows (Orbit-side `installing`) is what completes the task.
    case 'done':
      return 96;
    case 'installing':
      return 98;
    default:
      return undefined;
  }
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Human label for a provisioning-profile expiry. `critical` marks records the
// UI should paint red (< 48 h left, matching the renewal-due window).
export function formatProfileExpiry(
  profileExpiresAt: string,
  now: number = Date.now()
): { label: string; critical: boolean } {
  const expiresAt = Date.parse(profileExpiresAt);
  if (Number.isNaN(expiresAt)) return { label: 'Unknown expiry', critical: true };
  const remaining = expiresAt - now;
  if (remaining <= 0) return { label: 'Expired', critical: true };
  const days = Math.floor(remaining / DAY_MS);
  const hours = Math.max(1, Math.floor(remaining / HOUR_MS));
  return {
    label:
      days > 0
        ? `Expires in ${days} day${days === 1 ? '' : 's'}`
        : `Expires in ${hours} hour${hours === 1 ? '' : 's'}`,
    critical: remaining < 48 * HOUR_MS,
  };
}

/**
 * A renewal is in flight when the engine stamped `lastAttemptAt` after the last
 * outcome (`lastRenewedAt` or `lastError.at`). Capped at 10 minutes so a run
 * that died mid-way can't leave a row stuck on "Renewing…".
 */
export function isRenewing(
  record: { lastAttemptAt?: string; lastRenewedAt: string; lastError?: { at: string } },
  now: number = Date.now()
): boolean {
  const attempt = Date.parse(record.lastAttemptAt ?? '');
  if (Number.isNaN(attempt) || now - attempt > 10 * 60 * 1000) return false;
  const outcome = Math.max(
    Date.parse(record.lastRenewedAt) || 0,
    Date.parse(record.lastError?.at ?? '') || 0
  );
  return attempt > outcome;
}

export function extractDownloadProgress(string: string): number | undefined {
  const regex = /(\d+(?:\.\d+)?) MB \/ (\d+(?:\.\d+)?) MB/;
  const matches = string.match(regex);

  if (matches && matches.length === 3) {
    const currentSize = parseFloat(matches[1]);
    const totalSize = parseFloat(matches[2]);
    const progress = (currentSize / totalSize) * 100;
    return progress;
  }

  // CLI output arrives in arbitrary chunks, so a line may be partial. No match means "unknown", not 0.
  return undefined;
}

export type Task = {
  id: string;
  status: MenuBarStatus;
  progress: number;
  message?: string;
};
