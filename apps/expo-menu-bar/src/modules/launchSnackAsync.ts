import MenuBarModule from '../MenuBarModule';

type LaunchSnackAsyncOptions = {
  platform?: 'android' | 'ios';
  url: string;
};

export const launchSnackAsync = async ({
  url,
  platform,
}: LaunchSnackAsyncOptions) => {
  const args = [url];

  if (platform) {
    args.push('-p', platform);
  }

  await MenuBarModule.runCli('launch-snack', args, undefined);
};
