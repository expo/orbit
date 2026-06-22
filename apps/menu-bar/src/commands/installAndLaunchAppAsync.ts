import MenuBarModule from '../modules/MenuBarModule';

type InstallAndLaunchAppAsyncOptions = {
  appPath: string;
  deviceId?: string;
  launchURL?: string;
  forceSimulator?: boolean;
};

export const installAndLaunchAppAsync = async ({
  appPath,
  deviceId,
  launchURL,
  forceSimulator,
}: InstallAndLaunchAppAsyncOptions) => {
  const args = ['--app-path', appPath];
  if (deviceId) {
    args.push('--device-id', deviceId);
  }
  if (launchURL) {
    args.push('--launch-url', launchURL);
  }
  if (forceSimulator) {
    args.push('--force-simulator');
  }
  await MenuBarModule.runCli('install-and-launch', args, undefined);
};
