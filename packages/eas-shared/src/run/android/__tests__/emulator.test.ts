const mockSpawnAsync = jest.fn();

jest.mock('@expo/spawn-async', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockSpawnAsync(...args),
}));

jest.mock('../sdk', () => ({
  getAndroidSdkRootAsync: async () => null,
}));

jest.mock('../../../utils/promise', () => ({
  sleepAsync: async () => {},
}));

// eslint-disable-next-line import/first -- imports must follow the jest.mock calls above.
import { stopEmulatorAsync } from '../emulator';

const devices = (lines: string[]) => ({
  stdout: ['List of devices attached', ...lines].join('\n') + '\n',
  stderr: '',
});

describe(stopEmulatorAsync, () => {
  beforeEach(() => {
    mockSpawnAsync.mockReset();
  });

  it('waits until adb does not list the emulator', async () => {
    const calls: string[] = [];
    // After `emu kill`, adb lists the emulator as offline two times, then not at all.
    let listsAfterKill = 0;
    mockSpawnAsync.mockImplementation(async (_adb: string, args: string[]) => {
      const call = args.join(' ');
      calls.push(call);
      if (call === 'devices -l') {
        return devices(['emulator-5554          device product:sdk model:sdk transport_id:1']);
      }
      if (call === '-s emulator-5554 emu avd name') {
        return { stdout: 'Pixel_9\nOK\n', stderr: '' };
      }
      if (call === '-s emulator-5554 emu kill') {
        return { stdout: 'OK: killing emulator, bye bye\n', stderr: '' };
      }
      if (call === 'devices') {
        listsAfterKill += 1;
        return devices(listsAfterKill <= 2 ? ['emulator-5554\toffline'] : []);
      }
      throw new Error(`unexpected adb call: ${call}`);
    });

    await stopEmulatorAsync('Pixel_9');

    expect(calls).toEqual([
      'devices -l',
      '-s emulator-5554 emu avd name',
      '-s emulator-5554 emu kill',
      'devices',
      'devices',
      'devices',
    ]);
  });

  it('throws when adb still lists the emulator after the timeout', async () => {
    mockSpawnAsync.mockImplementation(async (_adb: string, args: string[]) => {
      const call = args.join(' ');
      if (call === 'devices -l') {
        return devices(['emulator-5554          device product:sdk model:sdk transport_id:1']);
      }
      if (call === '-s emulator-5554 emu avd name') {
        return { stdout: 'Pixel_9\nOK\n', stderr: '' };
      }
      if (call === '-s emulator-5554 emu kill') {
        return { stdout: '', stderr: '' };
      }
      return devices(['emulator-5554\toffline']);
    });
    // Each read of the clock is 10 seconds after the one before, so the timeout comes soon.
    let now = 0;
    const dateNow = jest.spyOn(Date, 'now').mockImplementation(() => (now += 10000));

    await expect(stopEmulatorAsync('Pixel_9')).rejects.toThrow(
      'The emulator Pixel_9 did not stop in 30 seconds.'
    );
    dateNow.mockRestore();
  });

  it('does nothing when the emulator does not run', async () => {
    mockSpawnAsync.mockImplementation(async (_adb: string, args: string[]) => {
      if (args.join(' ') === 'devices -l') {
        return devices([]);
      }
      throw new Error(`unexpected adb call: ${args.join(' ')}`);
    });

    await stopEmulatorAsync('Pixel_9');

    expect(mockSpawnAsync).toHaveBeenCalledTimes(1);
  });
});
