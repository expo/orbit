import picomatch from 'picomatch';

import { getUserPreferences } from '../modules/Storage';

type ValidationResult =
  | {
      isValid: true;
    }
  | {
      isValid: false;
      reason: string;
    };

export function validateDeeplinkURL(url: string): ValidationResult {
  const trustedSources = getUserPreferences().trustedSources;

  if (!trustedSources) {
    return { isValid: true };
  }

  const isTrusted = trustedSources.some((source) => picomatch(source)(url));

  if (!isTrusted) {
    return { isValid: false, reason: 'Untrusted source' };
  }

  return { isValid: true };
}
