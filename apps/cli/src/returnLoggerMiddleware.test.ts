import { InternalError } from 'common-types';

import { returnLoggerMiddleware, resolveOutputMode, setJsonOutput } from './utils';

const RETURN_OUTPUT_MARKER = '---- return output ----';
const THROWN_ERROR_MARKER = '---- thrown error ----';

describe('returnLoggerMiddleware', () => {
  let stdout: string[];
  let stderr: string[];
  let consoleLog: jest.SpyInstance;
  let consoleError: jest.SpyInstance;
  let stdoutWrite: jest.SpyInstance;
  let stderrWrite: jest.SpyInstance;

  beforeEach(() => {
    stdout = [];
    stderr = [];

    // Both channels are written to two ways: `console.*` (the human and menu bar paths) and
    // `process.*.write` (the JSON path, which needs exact control over the bytes).
    consoleLog = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      stdout.push(args.join(' '));
    });
    consoleError = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
      stderr.push(args.join(' '));
    });
    stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(((chunk: any) => {
      stdout.push(String(chunk).replace(/\n$/, ''));
      return true;
    }) as any);
    stderrWrite = jest.spyOn(process.stderr, 'write').mockImplementation(((chunk: any) => {
      stderr.push(String(chunk).replace(/\n$/, ''));
      return true;
    }) as any);

    delete process.env.EXPO_MENU_BAR;
    delete process.env.EXPO_ORBIT_JSON;
    delete process.env.EXPO_DEBUG;
    setJsonOutput(false);
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
    process.exitCode = undefined;
  });

  describe('output mode resolution', () => {
    it('defaults to human', () => {
      expect(resolveOutputMode()).toBe('human');
    });

    it('uses json for the --json flag and for EXPO_ORBIT_JSON', () => {
      setJsonOutput(true);
      expect(resolveOutputMode()).toBe('json');

      setJsonOutput(false);
      process.env.EXPO_ORBIT_JSON = '1';
      expect(resolveOutputMode()).toBe('json');
    });

    it('lets EXPO_MENU_BAR win, since the app inherits the user environment', () => {
      process.env.EXPO_MENU_BAR = 'true';
      process.env.EXPO_ORBIT_JSON = '1';
      setJsonOutput(true);

      expect(resolveOutputMode()).toBe('menu-bar');
    });
  });

  describe('menu bar mode', () => {
    beforeEach(() => {
      process.env.EXPO_MENU_BAR = 'true';
    });

    it('frames an object result with the marker the app parses', async () => {
      const devices = { android: { devices: [{ name: 'rn36' }] } };
      await returnLoggerMiddleware(async () => devices)();

      expect(stdout).toEqual([RETURN_OUTPUT_MARKER, JSON.stringify(devices)]);
    });

    it('prints a string result verbatim', async () => {
      await returnLoggerMiddleware(async () => '/tmp/app.apk')();

      expect(stdout).toEqual([RETURN_OUTPUT_MARKER, '/tmp/app.apk']);
    });

    it('keeps the legacy error shape, without a code for plain errors', async () => {
      await returnLoggerMiddleware(async () => {
        throw new Error('adb not found');
      })();

      expect(stdout[0]).toBe(THROWN_ERROR_MARKER);
      const payload = JSON.parse(stdout[1]);
      expect(payload).toMatchObject({ name: 'Error', message: 'adb not found' });
      expect(payload).not.toHaveProperty('code');
    });

    it('includes code and details for an InternalError', async () => {
      await returnLoggerMiddleware(async () => {
        throw new InternalError('TOOL_CHECK_FAILED', 'adb is missing', { command: 'brew install' });
      })();

      expect(JSON.parse(stdout[1])).toMatchObject({
        name: 'InternalError',
        code: 'TOOL_CHECK_FAILED',
        message: 'adb is missing',
        details: { command: 'brew install' },
      });
    });

    it('still sets a failing exit code', async () => {
      await returnLoggerMiddleware(async () => {
        throw new Error('boom');
      })();

      expect(process.exitCode).toBe(1);
    });
  });

  describe('json mode', () => {
    beforeEach(() => {
      setJsonOutput(true);
    });

    it('writes one unframed JSON value to stdout', async () => {
      const devices = { android: { devices: [{ name: 'rn36' }] } };
      await returnLoggerMiddleware(async () => devices)();

      expect(stdout).toEqual([JSON.stringify(devices)]);
      expect(stderr).toEqual([]);
      expect(process.exitCode).toBeUndefined();
    });

    it('emits valid JSON for a string result', async () => {
      await returnLoggerMiddleware(async () => '/tmp/app.apk')();

      expect(stdout).toEqual(['"/tmp/app.apk"']);
      expect(JSON.parse(stdout[0])).toBe('/tmp/app.apk');
    });

    it('emits null for a command that returns nothing', async () => {
      await returnLoggerMiddleware(async () => undefined)();

      expect(stdout).toEqual(['null']);
      expect(JSON.parse(stdout[0])).toBeNull();
    });

    it('moves progress logging to stderr so stdout stays parseable', async () => {
      await returnLoggerMiddleware(async () => {
        // eslint-disable-next-line no-console
        console.log('Installing your app...');
        // eslint-disable-next-line no-console
        console.log('Successfully installed your app!');
        return { installed: true };
      })();

      expect(stdout).toEqual([JSON.stringify({ installed: true })]);
      expect(stderr).toEqual(['Installing your app...', 'Successfully installed your app!']);
      expect(JSON.parse(stdout.join(''))).toEqual({ installed: true });
    });

    it('restores console.log once the command is done', async () => {
      const original = console.log;
      await returnLoggerMiddleware(async () => ({}))();

      expect(console.log).toBe(original);
    });

    it('reports an InternalError on stderr, with code, and exits non-zero', async () => {
      await returnLoggerMiddleware(async () => {
        throw new InternalError('APPLE_DEVICE_USBMUXD_NOT_RUNNING', 'usbmuxd is not running');
      })();

      expect(stdout).toEqual([]);
      expect(JSON.parse(stderr[0])).toMatchObject({
        name: 'InternalError',
        code: 'APPLE_DEVICE_USBMUXD_NOT_RUNNING',
        message: 'usbmuxd is not running',
      });
      expect(process.exitCode).toBe(1);
    });

    it('always populates code, so callers can branch on it unconditionally', async () => {
      await returnLoggerMiddleware(async () => {
        throw new Error('adb not found');
      })();

      expect(JSON.parse(stderr[0])).toMatchObject({
        name: 'Error',
        code: 'UNKNOWN_ERROR',
        message: 'adb not found',
      });
    });

    it('handles a non-Error throw', async () => {
      await returnLoggerMiddleware(async () => {
        throw 'just a string';
      })();

      expect(JSON.parse(stderr[0])).toMatchObject({
        name: 'Error',
        code: 'UNKNOWN_ERROR',
        message: 'just a string',
      });
      expect(process.exitCode).toBe(1);
    });

    it('restores console.log after a failure too', async () => {
      const original = console.log;
      await returnLoggerMiddleware(async () => {
        throw new Error('boom');
      })();

      expect(console.log).toBe(original);
    });
  });

  describe('human mode', () => {
    it('inspects the result on stdout', async () => {
      await returnLoggerMiddleware(async () => ({ name: 'rn36' }))();

      expect(stdout).toHaveLength(1);
      expect(stdout[0]).toContain('rn36');
      expect(process.exitCode).toBeUndefined();
    });

    it('prints a readable error to stderr and exits non-zero', async () => {
      await returnLoggerMiddleware(async () => {
        throw new InternalError('TOOL_CHECK_FAILED', 'adb is missing');
      })();

      expect(stdout).toEqual([]);
      expect(stderr).toEqual(['Error [TOOL_CHECK_FAILED]: adb is missing']);
      expect(process.exitCode).toBe(1);
    });

    it('omits the code for errors that do not carry a meaningful one', async () => {
      await returnLoggerMiddleware(async () => {
        throw new Error('adb not found');
      })();

      expect(stderr).toEqual(['Error: adb not found']);
    });

    it('adds the stack only under EXPO_DEBUG', async () => {
      process.env.EXPO_DEBUG = '1';
      await returnLoggerMiddleware(async () => {
        throw new Error('adb not found');
      })();

      expect(stderr).toHaveLength(2);
      expect(stderr[1]).toContain('Error: adb not found');
    });
  });
});
