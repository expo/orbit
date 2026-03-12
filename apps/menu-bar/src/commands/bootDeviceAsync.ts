import MenuBarModule from '../modules/MenuBarModule';
import { DevicePlatform } from '../utils/device';

type BootDeviceAsyncOptions = {
  platform: DevicePlatform;
  id: string;
  noAudio?: boolean;
};

export const bootDeviceAsync = async ({ platform, id, noAudio }: BootDeviceAsyncOptions) => {
  /**
   * Maps a DevicePlatform to the CLI boot-device platform parameter.
   * The CLI only supports 'ios' and 'android' for now — tvOS and watchOS simulators boot via the 'ios' path.
   */
  const bootPlatform = platform === 'android' ? 'android' : 'ios';

  const args = ['-p', bootPlatform, '--id', id];
  if (noAudio) {
    args.push('--no-audio');
  }
  await MenuBarModule.runCli('boot-device', args, console.log);
};
