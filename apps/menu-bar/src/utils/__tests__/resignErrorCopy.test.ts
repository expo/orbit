import { InternalError } from 'common-types';

import { describeResignError } from '../resignErrorCopy';

describe(describeResignError, () => {
  // Apple's edge answers a bare 503 both when shedding load and when it rejects
  // the client outright (the Sep 2026 Xcode client-info block); the CLI surfaces
  // it as `GSA HTTP 503: <html>...`. Before this branch it rendered raw and
  // truncated. The copy must not claim rate limiting — only 429 means that.
  it('maps a GSA HTTP 503 to neutral copy that does not claim rate limiting', () => {
    const copy = describeResignError(
      new Error('GSA HTTP 503: <html>\r\n<head><title>503 Service Temporarily Unavailable</title>')
    );
    expect(copy.title).toBe('Apple sign-in unavailable');
    expect(copy.message).toMatch(/HTTP 503/);
    expect(copy.message).toMatch(/update Orbit/);
    expect(copy.message).not.toMatch(/rate.?limit|too many/i);
  });

  it('maps a 502 too, even wrapped as APPLE_RESIGN_FAILED', () => {
    const copy = describeResignError(
      new InternalError('APPLE_RESIGN_FAILED', 'Dev portal addAppId failed: HTTP 502 Bad Gateway')
    );
    expect(copy.title).toBe('Apple sign-in unavailable');
  });

  it('keeps 429 as the only rate-limit copy', () => {
    const copy = describeResignError(new Error('GSA HTTP 429: too many requests'));
    expect(copy.title).toBe('Too many attempts');
  });

  it('maps GSA -20101 to a wrong-credentials message, not the raw error', () => {
    const copy = describeResignError(new Error('GSA init failed: ec -20101'));
    expect(copy.title).toBe('Sign-in failed');
    expect(copy.message).toMatch(/Apple ID and password/);
  });

  it('maps a security block to an actionable message', () => {
    const copy = describeResignError(new Error('This request is forbidden for security reasons'));
    expect(copy.title).toBe('Blocked for security');
  });

  it('titles an untrusted-developer launch failure and keeps the CLI steps', () => {
    const copy = describeResignError(
      new InternalError(
        'APPLE_DEVELOPER_NOT_TRUSTED',
        'The app is installed, but iOS has not trusted its developer yet. On the iPhone, open Settings → General → VPN & Device Management, tap the developer, then Trust — and launch the app again.'
      )
    );
    expect(copy.title).toBe('Trust the developer on your iPhone');
    expect(copy.message).toMatch(/VPN & Device Management/);
  });

  it('titles a lost device connection and keeps the CLI checks', () => {
    const copy = describeResignError(
      new InternalError(
        'APPLE_DEVICE_CONNECTION_LOST',
        'Lost the connection to the device. Check the USB cable or Wi-Fi connection, make sure the iPhone is unlocked, and try again.'
      )
    );
    expect(copy.title).toBe('Lost connection to your device');
    expect(copy.message).toMatch(/USB cable or Wi-Fi/);
  });

  it('falls through to the raw message for an unknown error', () => {
    const copy = describeResignError(new Error('something unexpected'));
    expect(copy.title).toBe('Something went wrong');
    expect(copy.message).toBe('something unexpected');
  });
});
