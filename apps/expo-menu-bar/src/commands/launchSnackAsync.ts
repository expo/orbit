import MenuBarModule from '../modules/MenuBarModule';

type LaunchSnackAsyncOptions = {
  platform: 'android' | 'ios';
  deviceId: string;
  url: string;
};

export const launchSnackAsync = async ({
  url,
  platform,
  deviceId,
}: LaunchSnackAsyncOptions) => {
  await MenuBarModule.runCli(
    'launch-snack',
    [url, '-p', platform, '--device-id', deviceId],
    console.log,
  );
};
