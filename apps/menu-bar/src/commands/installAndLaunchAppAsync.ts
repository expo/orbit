import MenuBarModule from '../modules/MenuBarModule';

type InstallAndLaunchAppAsyncOptions = {
  appPath: string;
  deviceId?: string;
  launchURL?: string;
};

export const installAndLaunchAppAsync = async ({
  appPath,
  deviceId,
  launchURL,
}: InstallAndLaunchAppAsyncOptions) => {
  const args = ['--app-path', appPath];
  if (deviceId) {
    args.push('--device-id', deviceId);
  }
  if (launchURL) {
    args.push('--launch-url', launchURL);
  }
  await MenuBarModule.runCli('install-and-launch', args, undefined);
};
