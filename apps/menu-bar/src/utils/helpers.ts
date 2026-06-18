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
