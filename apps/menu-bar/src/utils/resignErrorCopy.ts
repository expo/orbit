import { InternalError } from 'common-types';

export type ResignErrorCopy = { title: string; message: string };

function getErrorCode(error: unknown): string | undefined {
  if (error instanceof InternalError) return error.code;
  // CLI errors are rebuilt by convertCliErrorObjectToError, but stay defensive:
  // match InternalError structurally so a differently-bundled instance (or a
  // code outside common-types' union, like APPLE_DEV_CERT_CONFLICT) still maps.
  const maybe = error as { name?: string; code?: string } | null;
  if (maybe && maybe.name === 'InternalError' && typeof maybe.code === 'string') return maybe.code;
  return undefined;
}

function getMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Apple's dev-portal errors arrive as
//   `Dev portal <endpoint> failed (resultCode <n>): <userString>`
// Extract the userString when it reads like copy meant for humans.
function extractAppleUserString(message: string): string | null {
  const match = message.match(/\(resultCode \d+\):\s*(.+)$/);
  const candidate = match?.[1]?.trim();
  if (candidate && /^[A-Z]/.test(candidate) && candidate.length >= 20) {
    return candidate;
  }
  return null;
}

/**
 * Map raw resign/auth errors (ipa-resign via the CLI) to short, actionable
 * copy. `context` selects the right APPLE_BAD_CREDENTIALS wording: the
 * credentials form vs the 2FA code form.
 */
export function describeResignError(
  error: unknown,
  opts?: { context?: 'credentials' | 'code' }
): ResignErrorCopy {
  const code = getErrorCode(error);
  const message = getMessage(error);

  if (/-20209|account has been locked/i.test(message)) {
    return {
      title: 'Apple ID locked',
      message:
        'This Apple ID has been locked for security reasons. Unlock it at iforgot.apple.com, then try again.',
    };
  }
  if (/resultCode 4550|Program License Agreement|agree to the latest/i.test(message)) {
    return {
      title: 'Developer agreement required',
      message:
        'Apple needs this account to accept the latest Program License Agreement. Sign in at developer.apple.com/account, accept it, and try again.',
    };
  }
  if (/membership.+expired|expired.+membership/i.test(message)) {
    return {
      title: 'Membership expired',
      message:
        'The Apple Developer Program membership for this account has expired. Renew it at developer.apple.com/account, or sign in with a free Apple ID.',
    };
  }
  if (/\bHTTP (429|409)\b/.test(message)) {
    return {
      title: 'Too many attempts',
      message:
        'Apple is rate-limiting requests from this account. Wait a few minutes and try again.',
    };
  }
  if (code === 'APPLE_RESIGN_QUOTA_EXCEEDED') {
    return {
      title: 'App ID limit reached',
      message:
        'Free Apple IDs can register at most 10 App IDs per rolling 7-day window. Delete App IDs you no longer use, or wait for old ones to expire.',
    };
  }
  if (code === 'APPLE_AUTH_REQUIRED') {
    return {
      title: 'Sign in again',
      message: 'Your Apple ID session expired. Sign in again to continue.',
    };
  }
  if (code === 'APPLE_BAD_CREDENTIALS') {
    return opts?.context === 'code'
      ? { title: 'Incorrect code', message: 'Incorrect verification code. Check it and try again.' }
      : { title: 'Sign-in failed', message: 'Incorrect Apple ID or password.' };
  }
  if (code === 'APPLE_DEV_CERT_CONFLICT') {
    return { title: 'Certificate conflict', message };
  }
  if (code === 'APPLE_RESIGN_FAILED') {
    if (/^no teams visible/i.test(message)) {
      return {
        title: 'Re-signing failed',
        message:
          'Apple reports no teams for this account. Open developer.apple.com once with this Apple ID to accept the terms, then try again.',
      };
    }
    return { title: 'Re-signing failed', message: extractAppleUserString(message) ?? message };
  }
  return { title: 'Something went wrong', message };
}
