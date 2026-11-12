import os from 'os';

const mockSpawnAsync = jest.fn();

jest.mock('@expo/spawn-async', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockSpawnAsync(...args),
}));

jest.mock('../sdk', () => ({
  getAndroidSdkRootAsync: async () => null,
}));

// eslint-disable-next-line import/first -- imports must follow the jest.mock calls above.
import { stopEmulatorAsync } from '../emulator';

const SERIAL = 'emulator-5554';
// What `adb devices` prints for an emulator that stops: the serial, spaces, the state.
const OFFLINE = `${SERIAL}          offline`;

const output = (lines: string[], eol: string) => ({
  stdout: ['List of devices attached', ...lines, ''].join(eol),
  stderr: '',
});

/**
 * adb with one emulator that runs. `poll` gives the result of each `adb devices` call after
 * the kill. Returns the number of those calls.
 */
function mockAdb(poll: (count: number) => { stdout: string; stderr: string }) {
  const polls = { count: 0 };
  mockSpawnAsync.mockImplementation(async (_adb: string, args: string[]) => {
    const call = args.join(' ');
    if (call === 'devices -l') {
      // The lookup of the running devices splits on the line ending of the host.
      return output([`${SERIAL}          device product:sdk model:sdk transport_id:1`], os.EOL);
    }
    if (call === `-s ${SERIAL} emu avd name`) {
      return { stdout: 'Pixel_9\nOK\n', stderr: '' };
    }
    if (call === `-s ${SERIAL} emu kill`) {
      return { stdout: 'OK: killing emulator, bye bye\n', stderr: '' };
    }
    if (call === 'devices') {
      polls.count += 1;
      return poll(polls.count);
    }
    throw new Error(`unexpected adb call: ${call}`);
  });
  return polls;
}

describe(stopEmulatorAsync, () => {
  beforeEach(() => {
    mockSpawnAsync.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ['LF', '\n'],
    ['CRLF', '\r\n'],
  ])('reads the list each 500 ms until adb does not list the emulator (%s)', async (_, eol) => {
    // adb lists the emulator as offline two times, then not at all.
    const polls = mockAdb((count) => output(count <= 2 ? [OFFLINE] : [], eol));
    let isDone = false;
    const stop = stopEmulatorAsync('Pixel_9').then(() => {
      isDone = true;
    });

    await jest.advanceTimersByTimeAsync(0);
    expect(polls.count).toBe(1);
    await jest.advanceTimersByTimeAsync(499);
    expect(polls.count).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(polls.count).toBe(2);
    expect(isDone).toBe(false);
    await jest.advanceTimersByTimeAsync(500);
    await stop;
    expect(polls.count).toBe(3);
  });

  it('does not stop on the serial of another emulator', async () => {
    const polls = mockAdb((count) =>
      output(count === 1 ? [OFFLINE] : ['emulator-55540          device'], '\n')
    );
    const stop = stopEmulatorAsync('Pixel_9');

    await jest.advanceTimersByTimeAsync(500);
    await stop;
    expect(polls.count).toBe(2);
  });

  it('goes on when a read of the list fails', async () => {
    const polls = mockAdb((count) => {
      if (count === 1) {
        throw new Error('connection reset');
      }
      return output([], '\n');
    });
    const stop = stopEmulatorAsync('Pixel_9');

    await jest.advanceTimersByTimeAsync(500);
    await stop;
    expect(polls.count).toBe(2);
  });

  it('throws when adb still lists the emulator after 60 seconds', async () => {
    const polls = mockAdb(() => output([OFFLINE], '\n'));
    let error: Error | undefined;
    stopEmulatorAsync('Pixel_9').catch((reason) => {
      error = reason;
    });

    await jest.advanceTimersByTimeAsync(59999);
    expect(error).toBeUndefined();
    await jest.advanceTimersByTimeAsync(1);
    expect(error?.message).toBe('The emulator Pixel_9 did not stop in 60 seconds.');
    // One read at the start, then one each 500 ms. The last one is at the deadline.
    expect(polls.count).toBe(121);
  });

  it('gives each read the time that is left as its timeout', async () => {
    mockAdb(() => output([OFFLINE], '\n'));
    stopEmulatorAsync('Pixel_9').catch(() => {});

    await jest.advanceTimersByTimeAsync(1000);
    const timeouts = mockSpawnAsync.mock.calls
      .filter(([, args]) => args.join(' ') === 'devices')
      .map(([, , options]) => options.timeout);
    expect(timeouts).toEqual([60000, 59500, 59000]);
    await jest.advanceTimersByTimeAsync(60000);
  });

  it('puts the last adb error in the timeout error', async () => {
    mockAdb(() => {
      throw new Error('cannot connect to daemon');
    });
    let error: Error | undefined;
    stopEmulatorAsync('Pixel_9').catch((reason) => {
      error = reason;
    });

    await jest.advanceTimersByTimeAsync(60000);
    expect(error?.message).toBe(
      'The emulator Pixel_9 did not stop in 60 seconds. The last adb error: cannot connect to daemon'
    );
  });

  it('does nothing when the emulator does not run', async () => {
    mockSpawnAsync.mockImplementation(async (_adb: string, args: string[]) => {
      if (args.join(' ') === 'devices -l') {
        return output([], os.EOL);
      }
      throw new Error(`unexpected adb call: ${args.join(' ')}`);
    });

    await stopEmulatorAsync('Pixel_9');

    expect(mockSpawnAsync).toHaveBeenCalledTimes(1);
  });
});
