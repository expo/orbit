import MenuBarModule from '../MenuBarModule';

type BootDeviceAsyncOptions = {
  platform: 'android' | 'ios';
  id: string;
};

export const bootDeviceAsync = async ({
  platform,
  id,
}: BootDeviceAsyncOptions) => {
  await MenuBarModule.runCli(
    'boot-device',
    ['-p', platform, '--id', id],
    console.log,
  );
};
