import { InternalError } from 'common-types';

import {
  createUsbmuxdNotRunningError,
  getUsbmuxdHelperGuidance,
  isUsbmuxdNotRunningError,
} from '../usbmuxd';

function withPlatform(platform: NodeJS.Platform, fn: () => void) {
  const original = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  try {
    fn();
  } finally {
    if (original) {
      Object.defineProperty(process, 'platform', original);
    }
  }
}

describe('getUsbmuxdHelperGuidance', () => {
  it('points Windows users to the Apple Devices app', () => {
    withPlatform('win32', () => {
      const guidance = getUsbmuxdHelperGuidance();
      expect(guidance.label).toBe('Apple Devices');
      expect(guidance.installUrl).toBeDefined();
    });
  });

  it('points Linux users to usbmuxd via the package manager', () => {
    withPlatform('linux', () => {
      const guidance = getUsbmuxdHelperGuidance();
      expect(guidance.label).toBe('usbmuxd');
      expect(guidance.installCommand).toContain('usbmuxd');
    });
  });

  it('tells macOS users no extra software is required', () => {
    withPlatform('darwin', () => {
      const guidance = getUsbmuxdHelperGuidance();
      expect(guidance.installUrl).toBeUndefined();
      expect(guidance.installCommand).toBeUndefined();
    });
  });
});

describe('isUsbmuxdNotRunningError', () => {
  it.each(['ECONNREFUSED', 'ENOENT', 'ECONNRESET', 'EPIPE'])(
    'treats %s as a not-running error',
    (code) => {
      expect(isUsbmuxdNotRunningError({ code })).toBe(true);
    }
  );

  it('ignores unrelated errors', () => {
    expect(isUsbmuxdNotRunningError({ code: 'ETIMEDOUT' })).toBe(false);
    expect(isUsbmuxdNotRunningError(new Error('boom'))).toBe(false);
    expect(isUsbmuxdNotRunningError(null)).toBe(false);
    expect(isUsbmuxdNotRunningError(undefined)).toBe(false);
  });
});

describe('createUsbmuxdNotRunningError', () => {
  it('builds an InternalError carrying install guidance in details', () => {
    withPlatform('win32', () => {
      const error = createUsbmuxdNotRunningError();
      expect(error).toBeInstanceOf(InternalError);
      expect(error.code).toBe('APPLE_DEVICE_USBMUXD_NOT_RUNNING');
      expect(error.details?.label).toBe('Apple Devices');
      expect(error.details?.installUrl).toBeDefined();
    });
  });
});
