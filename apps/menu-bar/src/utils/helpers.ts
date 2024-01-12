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
  INSTALLING_SNACK,
  OPENING_SNACK_PROJECT,
  OPENING_UPDATE,
}
