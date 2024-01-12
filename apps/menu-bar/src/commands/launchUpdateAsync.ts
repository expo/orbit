import MenuBarModule from '../modules/MenuBarModule';

type LaunchUpdateAsyncOptions = {
  platform: 'android' | 'ios';
  deviceId: string;
  url: string;
};

export const launchUpdateAsync = async ({ url, platform, deviceId }: LaunchUpdateAsyncOptions) => {
  await MenuBarModule.runCli(
    'launch-update',
    [url, '-p', platform, '--device-id', deviceId],
    console.log
  );
};
