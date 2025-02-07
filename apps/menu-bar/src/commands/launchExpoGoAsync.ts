import MenuBarModule from '../modules/MenuBarModule';

type LaunchExpoGoAsyncOptions = {
  platform: 'android' | 'ios';
  deviceId: string;
  url: string;
};

export const launchExpoGoAsync = async ({ url, platform, deviceId }: LaunchExpoGoAsyncOptions) => {
  await MenuBarModule.runCli(
    'launch-expo-go',
    [url, '-p', platform, '--device-id', deviceId],
    console.log
  );
};
