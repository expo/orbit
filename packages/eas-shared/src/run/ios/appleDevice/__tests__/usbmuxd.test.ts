import { InternalError } from 'common-types';
import fs from 'fs';

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
  it('installs Apple Mobile Device Support on Windows via winget, with a manual fallback URL', () => {
    withPlatform('win32', () => {
      const guidance = getUsbmuxdHelperGuidance();
      expect(guidance.label).toBe('Apple Mobile Device Support');
      expect(guidance.installCommand).toContain('Apple.AppleMobileDeviceSupport');
      expect(guidance.installUrl).toBeDefined();
    });
  });

  it('points Linux users to usbmuxd via the package manager when not installed', () => {
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    withPlatform('linux', () => {
      const guidance = getUsbmuxdHelperGuidance();
      expect(guidance.label).toBe('usbmuxd');
      expect(guidance.installCommand).toContain('usbmuxd');
      expect(guidance.startCommand).toBeUndefined();
    });
    existsSpy.mockRestore();
  });

  it('tells Linux users to start usbmuxd when it is already installed', () => {
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    withPlatform('linux', () => {
      const guidance = getUsbmuxdHelperGuidance();
      expect(guidance.label).toBe('usbmuxd');
      expect(guidance.installCommand).toBeUndefined();
      expect(guidance.startCommand).toContain('usbmuxd');
      expect(guidance.description).toMatch(/not running/i);
    });
    existsSpy.mockRestore();
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
      expect(error.details?.label).toBe('Apple Mobile Device Support');
      expect(error.details?.installUrl).toBeDefined();
    });
  });
});
