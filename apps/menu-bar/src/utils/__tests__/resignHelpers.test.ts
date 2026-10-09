import { formatProfileExpiry, isRenewing, resignStepProgress } from '../helpers';
import { describeResignError } from '../resignErrorCopy';

const RESIGN_STEPS = [
  'inspecting',
  'authenticating',
  'registering-device',
  'minting-certificate',
  'creating-app-id',
  'downloading-profile',
  'codesigning',
  'repacking',
  'done',
  // Orbit-side: the install that follows the CLI's `done`.
  'installing',
];

describe(resignStepProgress, () => {
  it('is strictly increasing across the resign steps, install included', () => {
    const values = RESIGN_STEPS.map((step) => resignStepProgress(step)!);
    expect(values).not.toContain(undefined);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
    // The task row is removed once the install succeeds, so the bar never needs
    // to read 100 while work is still happening.
    expect(values[values.length - 1]).toBeLessThanOrEqual(100);
    expect(resignStepProgress('done')).toBeLessThan(resignStepProgress('installing')!);
  });

  it('returns undefined (indeterminate) for orbit-side waiting steps', () => {
    expect(resignStepProgress('waiting-for-auth')).toBeUndefined();
    expect(resignStepProgress('waiting-for-cleanup')).toBeUndefined();
  });
});

describe(formatProfileExpiry, () => {
  const now = Date.parse('2026-08-25T12:00:00Z');

  it('marks expired profiles as critical', () => {
    expect(formatProfileExpiry('2026-08-25T11:00:00Z', now)).toEqual({
      label: 'Expired',
      critical: true,
    });
  });

  it('marks profiles inside the 48h renewal window as critical', () => {
    const result = formatProfileExpiry('2026-08-26T12:00:00Z', now);
    expect(result).toEqual({ label: 'Expires in 1 day', critical: true });
  });

  it('counts whole days for healthy profiles and hours under a day', () => {
    expect(formatProfileExpiry('2026-09-01T15:30:00Z', now)).toEqual({
      label: 'Expires in 7 days',
      critical: false,
    });
    expect(formatProfileExpiry('2026-08-25T15:30:00Z', now).label).toBe('Expires in 3 hours');
    expect(formatProfileExpiry('2026-08-25T12:20:00Z', now).label).toBe('Expires in 1 hour');
  });
});

describe(isRenewing, () => {
  const now = Date.parse('2026-08-25T12:00:00Z');
  const base = { lastRenewedAt: '2026-08-20T12:00:00Z' };

  it('is false until the engine stamps an attempt', () => {
    expect(isRenewing(base, now)).toBe(false);
  });

  it('is true while an attempt is newer than the last outcome', () => {
    expect(isRenewing({ ...base, lastAttemptAt: '2026-08-25T11:59:00Z' }, now)).toBe(true);
    expect(
      isRenewing(
        {
          ...base,
          lastAttemptAt: '2026-08-25T11:59:00Z',
          lastError: { at: '2026-08-25T11:59:30Z' },
        },
        now
      )
    ).toBe(false);
    expect(
      isRenewing(
        { lastRenewedAt: '2026-08-25T11:59:30Z', lastAttemptAt: '2026-08-25T11:59:00Z' },
        now
      )
    ).toBe(false);
  });

  it('gives up on attempts older than 10 minutes', () => {
    expect(isRenewing({ ...base, lastAttemptAt: '2026-08-25T11:40:00Z' }, now)).toBe(false);
  });
});

// Structural InternalError stand-in: the mapper matches on name/code, so it
// must work without importing the real class.
function internalError(code: string, message: string) {
  const error = new Error(message) as Error & { code: string };
  error.name = 'InternalError';
  error.code = code;
  return error;
}

describe(describeResignError, () => {
  it('maps a locked Apple ID from the raw GSA message', () => {
    const copy = describeResignError(
      internalError('APPLE_RESIGN_FAILED', 'GSA complete failed (-20209): Account has been locked')
    );
    expect(copy.title).toBe('Apple ID locked');
  });

  it('maps an unaccepted Program License Agreement', () => {
    const copy = describeResignError(
      internalError(
        'APPLE_RESIGN_FAILED',
        'Dev portal listTeams failed (resultCode 4550): You must agree to the latest Program License Agreement'
      )
    );
    expect(copy.title).toBe('Developer agreement required');
  });

  it('maps rate limits from v1 endpoint errors', () => {
    const copy = describeResignError(
      internalError('APPLE_RESIGN_FAILED', 'v1 certificates HTTP 429: rate limited')
    );
    expect(copy.title).toBe('Too many attempts');
  });

  it('maps the App ID quota error by code', () => {
    const copy = describeResignError(
      internalError('APPLE_RESIGN_QUOTA_EXCEEDED', 'resultCode 7460')
    );
    expect(copy.title).toBe('App ID limit reached');
  });

  it('explains an identifier Apple refuses to register, naming it', () => {
    const copy = describeResignError(
      internalError(
        'APPLE_RESIGN_FAILED',
        "Dev portal ios/addAppId.action failed (resultCode 1): An App ID with Identifier 'com.x.app.orbit07bcf83b' is not available. Please enter a different string."
      )
    );
    expect(copy.title).toBe('App ID not available');
    expect(copy.message).toContain('com.x.app.orbit07bcf83b');
    expect(copy.message).toContain('different Apple ID');
  });

  it('maps an expired session by code', () => {
    const copy = describeResignError(internalError('APPLE_AUTH_REQUIRED', 'session expired'));
    expect(copy.message).toBe('Your Apple ID session expired. Sign in again to continue.');
  });

  it('distinguishes bad credentials by context', () => {
    const error = internalError('APPLE_BAD_CREDENTIALS', 'bad');
    expect(describeResignError(error, { context: 'credentials' }).message).toBe(
      'Incorrect Apple ID or password.'
    );
    expect(describeResignError(error, { context: 'code' }).title).toBe('Incorrect code');
  });

  it('extracts Apple userStrings from portal failures', () => {
    const copy = describeResignError(
      internalError(
        'APPLE_RESIGN_FAILED',
        'Dev portal addAppId failed (resultCode 9401): Your development team does not support this feature.'
      )
    );
    expect(copy.message).toBe('Your development team does not support this feature.');
  });

  it('passes unknown errors through', () => {
    const copy = describeResignError(new Error('boom'));
    expect(copy).toEqual({ title: 'Something went wrong', message: 'boom' });
  });
});
