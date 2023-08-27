import MenuBarModule from '../modules/MenuBarModule';

type BootDeviceAsyncOptions = {
  platform: 'android' | 'ios';
  id: string;
  noAudio?: boolean;
};

export const bootDeviceAsync = async ({ platform, id, noAudio }: BootDeviceAsyncOptions) => {
  const args = ['-p', platform, '--id', id];
  if (noAudio) {
    args.push('--no-audio');
  }
  await MenuBarModule.runCli('boot-device', args, console.log);
};
