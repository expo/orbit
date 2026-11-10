import MenuBarModule from '../modules/MenuBarModule';
import { DevicePlatform } from '../utils/device';

/** Stops a local simulator or emulator. tvOS and watchOS simulators stop through the iOS path. */
export const stopDeviceAsync = async ({
  platform,
  id,
}: {
  platform: DevicePlatform;
  id: string;
}) => {
  await MenuBarModule.runCli(
    'stop-device',
    ['-p', platform === 'android' ? 'android' : 'ios', '--id', id],
    undefined
  );
};
