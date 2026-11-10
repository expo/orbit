import MenuBarModule from '../modules/MenuBarModule';
import { DevicePlatform } from '../utils/device';
import { RemoteSimulatorStartOptions } from '../utils/remoteSimulator';

type BootDeviceAsyncOptions = {
  platform: DevicePlatform;
  id: string;
  audio?: boolean;
  /** Expo Simulators only: the project the session runs under, and a build to start it with. */
  remote?: RemoteSimulatorStartOptions & {
    appId: string;
    openUrl?: string;
  };
};

export const bootDeviceAsync = async (
  { platform, id, audio, remote }: BootDeviceAsyncOptions,
  onOutput: (output: string) => void = console.log
) => {
  /**
   * Maps a DevicePlatform to the CLI boot-device platform parameter.
   * The CLI only supports 'ios' and 'android' for now — tvOS and watchOS simulators boot via the 'ios' path.
   */
  const bootPlatform = platform === 'android' ? 'android' : 'ios';

  const args = ['-p', bootPlatform, '--id', id];
  if (!audio) {
    args.push('--no-audio');
  }
  if (remote) {
    args.push('--app-id', remote.appId);
    if (remote.archiveUrl) {
      args.push('--archive-url', remote.archiveUrl);
    }
    if (remote.openUrl) {
      args.push('--open-url', remote.openUrl);
    }
    const options: [string, string | undefined][] = [
      ['--name', remote.name],
      ['--device-identifier', remote.deviceIdentifier],
      ['--build-id', remote.buildId],
      ['--sdk-version', remote.sdkVersion],
      ['--launch-args', remote.launchArgs?.length ? JSON.stringify(remote.launchArgs) : undefined],
      ['--tags', remote.tags?.length ? JSON.stringify(remote.tags) : undefined],
      ['--session-type', remote.sessionType],
    ];
    for (const [option, value] of options) {
      if (value) {
        args.push(option, value);
      }
    }
    if (remote.expoGo) {
      args.push('--expo-go');
    }
  }
  await MenuBarModule.runCli('boot-device', args, onOutput);
};
