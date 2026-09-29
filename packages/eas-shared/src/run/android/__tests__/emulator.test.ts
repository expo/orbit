import { adbAsync } from '../adb';
import { openURLAsync } from '../emulator';

jest.mock('../adb', () => ({ adbAsync: jest.fn(async () => ({})) }));

describe('openURLAsync', () => {
  it('quotes the URL so the device shell keeps `&` and single quotes', async () => {
    const url = "myapp://?__expo_url=http%3A%2F%2Flocalhost%3A8081&__expo_disable_fab=1&q=it's";
    // pid without digits skips the macOS window activation
    await openURLAsync({ pid: 'device', url });

    expect(adbAsync).toHaveBeenCalledWith(
      '-s',
      'device',
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      "'myapp://?__expo_url=http%3A%2F%2Flocalhost%3A8081&__expo_disable_fab=1&q=it'\\''s'"
    );
  });
});
