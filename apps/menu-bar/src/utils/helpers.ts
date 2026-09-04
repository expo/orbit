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
    case 'done':
      return 100;
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
  const hours = Math.floor((remaining % DAY_MS) / HOUR_MS);
  return {
    label: days > 0 ? `Expires in ${days}d ${hours}h` : `Expires in ${hours}h`,
    critical: remaining < 48 * HOUR_MS,
  };
}

export function extractDownloadProgress(string: string) {
  const regex = /(\d+(?:\.\d+)?) MB \/ (\d+(?:\.\d+)?) MB/;
  const matches = string.match(regex);

  if (matches && matches.length === 3) {
    const currentSize = parseFloat(matches[1]);
    const totalSize = parseFloat(matches[2]);
    const progress = (currentSize / totalSize) * 100;
    return progress;
  }

  return 0;
}

export type Task = {
  id: string;
  status: MenuBarStatus;
  progress: number;
  message?: string;
};
