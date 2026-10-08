import { resignStepProgress } from '../helpers';
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

  it('returns undefined (indeterminate) for the orbit-side waiting step', () => {
    expect(resignStepProgress('waiting-for-auth')).toBeUndefined();
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
